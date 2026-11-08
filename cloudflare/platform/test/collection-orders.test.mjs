import test from "node:test";
import assert from "node:assert/strict";
import { setup, settings } from "./checkout-fixture.mjs";
import { design, png } from "./fixtures.mjs";

const parse = async (response, status = 200) => {
  assert.equal(response.status, status, await response.clone().text());
  return response.json();
};
test("as-listed checkout uses the published recipe and freezes the uploaded photo; delivery notes and fees are merchant-owned", async () => {
  const f = await setup();
  try {
    const imageId = "img_" + "a".repeat(64);
    const shop = JSON.parse(f.sql.exec("SELECT data FROM shop")[0].data);
    const card = {
      id: "photo-bouquet",
      title: "Photo bouquet",
      available: true,
      cover: imageId,
      design,
    };
    shop.draft.collection = [card];
    shop.published.draft.collection = [structuredClone(card)];
    f.sql.exec("UPDATE shop SET data=?", JSON.stringify(shop));
    f.sql.exec(
      "INSERT INTO media(id,kind,mime,body,byte_length,updated_at) VALUES(?,?,?,?,?,?)",
      imageId,
      "cover",
      "image/png",
      png,
      png.length,
      Date.now(),
    );
    const note =
      "Delivery in Toronto and North York only. Please include your unit number.";
    await parse(
      await f.call(`/api/shops/${f.shop.id}/commerce`, {
        method: "PUT",
        body: { ...settings, version: 1, deliveryNote: note },
      }),
    );
    const profile = await parse(
      await f.call(`/api/public/shops/${f.shop.slug}`, { token: null }),
    );
    assert.equal(profile.shop.checkoutSettings.deliveryNote, note);
    assert.equal(profile.shop.checkoutSettings.deliveryCents, 501);
    const body = {
      ...f.requestBody,
      requestKey: crypto.randomUUID(),
      kind: "design",
      productId: undefined,
      cardId: card.id,
      asListed: true,
    };
    await parse(
      await f.call(`/api/shops/${f.shop.id}/requests`, {
        method: "POST",
        token: null,
        body: { ...body, design },
      }),
      400,
    );
    const { request } = await parse(
      await f.call(`/api/shops/${f.shop.id}/requests`, {
        method: "POST",
        token: null,
        body,
      }),
      201,
    );
    const { order } = await parse(
      await f.checkout("quote", { requestId: request.id }),
    );
    assert.equal(order.totalCents, 1697);
    assert.equal(order.deliveryNote, note);
    assert.equal(
      order.snapshot.preview,
      "data:image/png;base64," + Buffer.from(png).toString("base64"),
    );
    const saved = (
      await parse(
        await f.call(`/api/shops/${f.shop.id}/requests/${request.id}`),
      )
    ).request;
    assert.equal(saved.asListed, true);
    assert.equal(saved.summary, card.title);
    assert.equal(saved.design.items.length, design.items.length);
    const missingAddress = await parse(
      await f.call(`/api/shops/${f.shop.id}/requests`, {
        method: "POST",
        token: null,
        body: {
          ...body,
          requestKey: crypto.randomUUID(),
          customer: { ...body.customer, address: undefined },
        },
      }),
      201,
    );
    await parse(
      await f.checkout("quote", { requestId: missingAddress.request.id }),
      409,
    );
    await parse(
      await f.call(`/api/shops/${f.shop.id}/commerce`, {
        method: "PUT",
        body: {
          ...settings,
          version: 2,
          deliveryEnabled: false,
          deliveryNote: "New delivery area",
        },
      }),
    );
    const old = await parse(await f.checkout("status", { orderId: order.id }));
    assert.equal(old.order.deliveryNote, note);
    assert.equal(old.order.snapshot.preview, order.snapshot.preview);
    await parse(
      await f.call(`/api/shops/${f.shop.id}/requests`, {
        method: "POST",
        token: null,
        body: { ...body, requestKey: crypto.randomUUID() },
      }),
      409,
    );
    await parse(
      await f.call(`/api/shops/${f.shop.id}/commerce`, {
        method: "PUT",
        body: { ...settings, version: 3, deliveryNote: "A".repeat(601) },
      }),
      400,
    );
  } finally {
    f.restore();
  }
});

test("lost create response exposes the saved choice and retries the identical Square payload after settings edits", async () => {
  const f = await setup();
  try {
    const { order } = await parse(
      await f.checkout("quote", { requestId: f.requestId }),
    );
    f.network.failCreate = true;
    await parse(
      await f.checkout("pay", {
        orderId: order.id,
        revision: order.revision,
        choice: "deposit",
      }),
      503,
    );
    const retryView = await parse(
      await f.checkout("quote", { requestId: f.requestId }),
    );
    assert.equal(retryView.order.checkoutAttempt.status, "creating");
    assert.equal(retryView.order.checkoutAttempt.choice, "deposit");
    await parse(
      await f.checkout("pay", {
        orderId: order.id,
        revision: order.revision,
        choice: "full",
      }),
      409,
    );
    const stored = JSON.parse(f.sql.exec("SELECT data FROM shop")[0].data);
    stored.draft.name = "Changed florist display name";
    f.sql.exec("UPDATE shop SET data=?", JSON.stringify(stored));
    await parse(
      await f.checkout("pay", {
        orderId: order.id,
        revision: order.revision,
        choice: "deposit",
      }),
    );
    const creates = f.network.calls.filter(
      (c) =>
        c.path === "/v2/online-checkout/payment-links" && c.method === "POST",
    );
    assert.equal(creates.length, 2);
    assert.deepEqual(creates[0].body, creates[1].body);
    assert.equal(f.network.links.size, 1);
  } finally {
    f.restore();
  }
});

test("an explicit Square phone validation rejection retires only that legacy attempt; the saved order retries without optional phone prefill", async () => {
  const f = await setup();
  try {
    const { order } = await parse(
      await f.checkout("quote", { requestId: f.requestId }),
    );
    const key = "order:" + order.id;
    const stored = JSON.parse(
      f.sql.exec("SELECT data FROM checkout_state WHERE key=?", key)[0].data,
    );
    stored.requests.push({
      number: 1,
      choice: "deposit",
      dueCents: 849,
      paidCents: 0,
      status: "creating",
      key: "legacy-phone-attempt",
      createdAt: Date.now(),
      createMerchantId: "merchant-fixture",
      createPayload: {
        idempotency_key: "legacy-phone-attempt",
        quick_pay: {
          name: "Legacy deposit",
          price_money: { amount: 849, currency: "USD" },
          location_id: "location-fixture",
        },
        pre_populated_data: { buyer_phone_number: "+15555550123" },
      },
    });
    f.sql.exec(
      "UPDATE checkout_state SET data=? WHERE key=?",
      JSON.stringify(stored),
      key,
    );
    f.network.rejectPhone = true;
    await parse(
      await f.checkout("pay", {
        orderId: order.id,
        revision: order.revision,
        choice: "deposit",
      }),
      503,
    );
    assert.equal(
      f.network.links.size,
      0,
      "Explicit validation failure created no payable link",
    );
    const rejected = JSON.parse(
      f.sql.exec("SELECT data FROM checkout_state WHERE key=?", key)[0].data,
    );
    assert.equal(rejected.requests[0].status, "rejected");
    assert.deepEqual(
      rejected.requests[0].createPayload,
      stored.requests[0].createPayload,
    );
    const retried = await parse(
      await f.checkout("pay", {
        orderId: order.id,
        revision: order.revision,
        choice: "deposit",
      }),
    );
    assert.equal(retried.order.request.choice, "deposit");
    assert.equal(f.network.links.size, 1);
    const creates = f.network.calls.filter(
      (call) =>
        call.path === "/v2/online-checkout/payment-links" &&
        call.method === "POST",
    );
    assert.equal(
      creates[1].body.pre_populated_data?.buyer_phone_number,
      undefined,
    );
    assert.notEqual(
      creates[0].body.idempotency_key,
      creates[1].body.idempotency_key,
    );
  } finally {
    f.restore();
  }
});
