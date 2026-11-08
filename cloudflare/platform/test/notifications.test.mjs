import test from "node:test";
import assert from "node:assert/strict";
import { setup } from "./checkout-fixture.mjs";
import { png } from "./fixtures.mjs";
import { deliverNotifications } from "../notifications.mjs";

const parse = async (r, code = 200) => {
  assert.equal(r.status, code, await r.clone().text());
  return r.json();
};
const notices = (f) => [...f.sql.exec("SELECT * FROM merchant_notifications")];
async function pay(f, choice = "full") {
  let { order } = await parse(
    await f.checkout("quote", { requestId: f.requestId }),
  );
  ({ order } = await parse(
    await f.checkout("pay", {
      orderId: order.id,
      revision: order.revision,
      choice,
    }),
  ));
  const p = f.complete(f.network.links.size, order.request.dueCents);
  const event = {
    event_id: "event-" + p,
    merchant_id: "merchant-fixture",
    type: "payment.updated",
    data: { object: { payment: { id: p } } },
  };
  await parse(await f.webhook(event));
  return {
    event,
    order: (await parse(await f.checkout("status", { orderId: order.id })))
      .order,
  };
}
const configure = (f) =>
  Object.assign(f.env, {
    ENVIRONMENT: "test",
    MERCHANT_EMAIL_ENABLED: "true",
    RESEND_API_KEY: "fixture-only",
    RESEND_FROM: "orders@notify.example.test",
    NOTIFICATIONS_TEST_RECIPIENT: "test-inbox@example.test",
  });

test("Sandbox connection email test is owner-only, destination-fixed and idempotent without creating an order or payment", async () => {
  const f = await setup();
  try {
    configure(f);
    f.env.SANDBOX_TEST_ACCESS = "true";
    f.env.RESEND_REPLY_TO = "reply@example.test";
    const path = `/api/shops/${f.shop.id}/notifications`;
    const input = { method: "POST", body: { action: "test" } };
    await parse(await f.call(path, { ...input, token: null }), 401);
    await parse(await f.call(path, { ...input, token: "other" }), 404);
    await parse(await f.call(path, input), 409);
    await parse(await f.call(path, { method: "PUT", body: { enabled: true } }));
    await parse(
      await f.call(path, {
        ...input,
        body: { action: "test", to: "unapproved@example.test" },
      }),
      400,
    );
    const first = await parse(await f.call(path, input));
    const retry = await parse(await f.call(path, input));
    assert.equal(first.id, retry.id);
    assert.equal(notices(f).length, 1);
    const requests = [];
    await deliverNotifications(f.object.instance, {
      fetchImpl: async (_, options) => {
        requests.push(JSON.parse(options.body));
        return Response.json({ id: "test-message" });
      },
    });
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].to, ["test-inbox@example.test"]);
    assert.equal(requests[0].reply_to, "reply@example.test");
    assert.match(requests[0].subject, /^\[TEST\]/);
    assert.match(
      requests[0].text,
      /No order was created and no payment was taken/,
    );
    assert.equal(
      f.sql.exec(
        "SELECT COUNT(*) n FROM checkout_state WHERE key LIKE 'order:%'",
      )[0].n,
      0,
    );
    assert.equal(
      (
        await parse(
          await f.call(`/api/shops/${f.shop.id}/requests/${f.requestId}`),
        )
      ).request.paymentStatus,
      "unpaid",
    );
    assert.equal(
      (await parse(await f.call(path))).notifications[0].kind,
      "connection_test",
    );
    await deliverNotifications(f.object.instance, {
      fetchImpl: async () => {
        throw Error("Duplicate send");
      },
    });
    f.env.ENVIRONMENT = "production";
    await parse(await f.call(path, input), 404);
  } finally {
    f.restore();
  }
});

test("immutable raster order preview rejects executable/remote/oversize data; Square gets a private merchant path without customer token", async () => {
  const f = await setup();
  try {
    const path = `/api/shops/${f.shop.id}/requests`;
    for (const preview of [
      "https://evil.test/x.png",
      "data:image/svg+xml;base64,PHN2Zz4=",
      "A".repeat(110001),
    ])
      await parse(
        await f.call(path, {
          method: "POST",
          token: null,
          body: { ...f.requestBody, requestKey: crypto.randomUUID(), preview },
        }),
        preview.length > 110000 ? 413 : 400,
      );
    const preview =
      "data:image/png;base64," + Buffer.from(png).toString("base64");
    const { request } = await parse(
      await f.call(path, {
        method: "POST",
        token: null,
        body: {
          ...f.requestBody,
          requestKey: crypto.randomUUID(),
          preview,
          customer: { ...f.requestBody.customer, phone: "+15551230000" },
        },
      }),
      201,
    );
    let { order } = await parse(
      await f.checkout("quote", { requestId: request.id }),
    );
    assert.equal(order.snapshot.preview, preview);
    const row = f.sql.exec("SELECT data FROM shop")[0],
      shop = JSON.parse(row.data);
    shop.published.draft.products[0].title = "New product title";
    f.sql.exec("UPDATE shop SET data=?", JSON.stringify(shop));
    ({ order } = await parse(
      await f.checkout("pay", {
        orderId: order.id,
        revision: order.revision,
        choice: "full",
      }),
    ));
    assert.equal(order.snapshot.product.title, "A satin gift");
    assert.equal(order.snapshot.preview, preview);
    const body = f.network.calls.find(
      (c) => c.path === "/v2/online-checkout/payment-links",
    ).body;
    assert.match(body.quick_pay.name, /Full payment/);
    assert.equal(body.pre_populated_data?.buyer_phone_number, undefined);
    assert.ok(
      body.payment_note.includes("/dashboard/orders?request=" + request.id),
    );
    assert.ok(!body.payment_note.includes(f.requestBody.accessToken));
    const details = await parse(await f.call(path + "/" + request.id));
    assert.equal(details.request.preview, preview);
    await parse(await f.call(path + "/" + request.id, { token: "other" }), 404);
    assert.equal(
      (await parse(await f.call(path))).requests[0].preview,
      undefined,
    );
  } finally {
    f.restore();
  }
});

test("verified payments persist one unread event; opt-in uses authenticated email and sends only to Sandbox override", async () => {
  const f = await setup();
  try {
    configure(f);
    const path = `/api/shops/${f.shop.id}/notifications`;
    await parse(await f.call(path, { token: null }), 401);
    await parse(await f.call(path, { token: "other" }), 404);
    await parse(
      await f.call(path, {
        method: "PUT",
        body: { enabled: true, actorEmail: "attacker@example.test" },
      }),
      400,
    );
    const prefs = await parse(
      await f.call(path, { method: "PUT", body: { enabled: true } }),
    );
    assert.equal(prefs.settings.email, "owner@example.test");
    assert.equal(notices(f).length, 0);
    const preview =
      "data:image/png;base64," + Buffer.from(png).toString("base64");
    const originalRequest = JSON.parse(
      f.sql.exec(
        "SELECT data FROM customer_requests WHERE id=?",
        f.requestId,
      )[0].data,
    );
    f.sql.exec(
      "UPDATE customer_requests SET data=? WHERE id=?",
      JSON.stringify({ ...originalRequest, preview }),
      f.requestId,
    );
    const { event, order } = await pay(f, "deposit");
    await parse(await f.webhook(event));
    assert.equal(notices(f).length, 1);
    const detailsPath = `/api/shops/${f.shop.id}/requests/${f.requestId}`;
    const requestVersion = (await parse(await f.call(detailsPath))).request
      .version;
    await parse(await f.checkout("status", { orderId: order.id }));
    assert.equal(
      (await parse(await f.call(detailsPath))).request.version,
      requestVersion,
      "Unchanged payment verification must not invalidate merchant edits",
    );
    assert.equal(order.status, "deposit_paid");
    const calls = [];
    await deliverNotifications(f.object.instance, {
      fetchImpl: async (url, opts) => {
        calls.push({ url, opts });
        return Response.json({ id: "email-fixture" });
      },
    });
    assert.equal(calls.length, 1);
    const body = JSON.parse(calls[0].opts.body);
    assert.deepEqual(body.to, ["test-inbox@example.test"]);
    assert.match(body.subject, /^\[TEST\] Deposit received · NB-/);
    assert.match(body.html, /View bouquet/);
    assert.equal(body.attachments[0].content_id, "bouquet");
    assert.equal(body.attachments[0].content, preview.split(",")[1]);
    assert.match(body.html, /src="cid:bouquet"/);
    assert.ok(!calls[0].opts.body.includes(f.requestBody.accessToken));
    await deliverNotifications(f.object.instance, {
      fetchImpl: async () => {
        throw Error("must not send twice");
      },
    });
    const data = await parse(await f.call(path));
    assert.equal(data.unread, 1);
    assert.equal(data.notifications[0].emailStatus, "accepted");
    assert.equal(data.notifications[0].payload, undefined);
    assert.equal(data.notifications[0].recipient, undefined);
    await parse(
      await f.call(path, {
        method: "PATCH",
        body: { id: data.notifications[0].id },
      }),
    );
    assert.equal((await parse(await f.call(path))).unread, 0);
    const next = await parse(
      await f.checkout("pay", {
        orderId: order.id,
        revision: order.revision,
        choice: "full",
      }),
    );
    const p = f.complete(2, next.order.request.dueCents);
    await parse(
      await f.webhook({
        ...event,
        event_id: "balance-event",
        data: { object: { payment: { id: p } } },
      }),
    );
    assert.equal(notices(f).length, 2);
    assert.equal((await parse(await f.call(path))).unread, 1);
  } finally {
    f.restore();
  }
});

test("Resend response loss retries exact persisted payload/idempotency key; expiry, disabled email and rate limits retain paid order", async () => {
  const f = await setup();
  try {
    configure(f);
    await parse(
      await f.call(`/api/shops/${f.shop.id}/notifications`, {
        method: "PUT",
        body: { enabled: true },
      }),
    );
    const { order } = await pay(f);
    const requests = [],
      start = Date.now();
    const lost = async (url, opts) => {
      requests.push(opts);
      throw Error("Response lost after provider acceptance");
    };
    await deliverNotifications(f.object.instance, {
      fetchImpl: lost,
      now: start,
    });
    let row = notices(f)[0];
    assert.equal(row.email_status, "retry");
    f.env.RESEND_FROM = "changed@notify.example.test";
    await deliverNotifications(f.object.instance, {
      fetchImpl: async (_, opts) => {
        requests.push(opts);
        return Response.json({ id: "same-email" });
      },
      now: row.due_at + 1,
    });
    assert.equal(requests[0].body, requests[1].body);
    assert.equal(
      requests[0].headers["Idempotency-Key"],
      requests[1].headers["Idempotency-Key"],
    );
    assert.equal(notices(f)[0].email_status, "accepted");
    assert.equal(
      (await parse(await f.checkout("status", { orderId: order.id }))).order
        .status,
      "paid",
    );
    f.sql.exec(
      "UPDATE merchant_notifications SET email_status='retry',due_at=?,created_at=?",
      start,
      start - 24 * 3600000,
    );
    await deliverNotifications(f.object.instance, {
      fetchImpl: lost,
      now: start,
    });
    assert.equal(notices(f)[0].email_status, "expired");
    assert.equal(requests.length, 2);
    f.sql.exec(
      "UPDATE merchant_notifications SET email_status='retry',due_at=?,created_at=?",
      start,
      start,
    );
    await deliverNotifications(f.object.instance, {
      fetchImpl: async () => Response.json({}, { status: 429 }),
      now: start,
    });
    assert.equal(notices(f)[0].email_status, "retry");
    f.env.MERCHANT_EMAIL_ENABLED = "false";
    await deliverNotifications(f.object.instance, {
      fetchImpl: lost,
      now: start + 3600000,
    });
    assert.equal(requests.length, 2);
    assert.equal(
      (await parse(await f.checkout("status", { orderId: order.id }))).order
        .paidCents,
      order.totalCents,
    );
  } finally {
    f.restore();
  }
});

test("failed notification transaction cannot commit payment without its unread event; a retry recovers both", async () => {
  const f = await setup();
  try {
    let { order } = await parse(
      await f.checkout("quote", { requestId: f.requestId }),
    );
    ({ order } = await parse(
      await f.checkout("pay", {
        orderId: order.id,
        revision: order.revision,
        choice: "full",
      }),
    ));
    const payment = f.complete(1, order.request.dueCents);
    f.sql.exec(
      "CREATE TRIGGER fail_notice BEFORE INSERT ON merchant_notifications BEGIN SELECT RAISE(ABORT,'test failure'); END",
    );
    const event = {
      event_id: "atomic-event",
      merchant_id: "merchant-fixture",
      type: "payment.updated",
      data: { object: { payment: { id: payment } } },
    };
    const response = await f.webhook(event);
    assert.ok(response.status >= 500);
    const saved = JSON.parse(
      f.sql.exec(
        "SELECT data FROM checkout_state WHERE key=?",
        "order:" + order.id,
      )[0].data,
    );
    assert.equal(saved.paidCents, 0);
    assert.equal(notices(f).length, 0);
    f.sql.exec("DROP TRIGGER fail_notice");
    await parse(await f.webhook(event));
    assert.equal(notices(f).length, 1);
    assert.equal(
      (await parse(await f.checkout("status", { orderId: order.id }))).order
        .status,
      "paid",
    );
  } finally {
    f.restore();
  }
});
