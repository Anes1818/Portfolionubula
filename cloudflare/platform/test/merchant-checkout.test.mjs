import test from "node:test";
import assert from "node:assert/strict";

const parse = async (r, status = 200) => {
  assert.equal(r.status, status, await r.clone().text());
  return r.json();
};
import { setup, token, settings } from "./checkout-fixture.mjs";
import { readFile } from "node:fs/promises";
import { priceDesign } from "../../../platform/shared/policy.mjs";

test("authoritative quote adds tax/delivery, checks secret and refuses browser amounts", async () => {
  const f = await setup();
  try {
    const publicProfile = await parse(
      await f.call(`/api/public/shops/${f.shop.slug}`, { token: null }),
    );
    assert.equal(publicProfile.shop.features.checkoutEnabled, true);
    await parse(
      await f.call(`/api/shops/${f.shop.id}/commerce`, { token: "other" }),
      404,
    );
    await parse(
      await f.call(`/api/shops/${f.shop.id}/commerce`, {
        method: "PUT",
        body: { ...settings, version: 1, taxBps: null },
      }),
      400,
    );
    await parse(
      await f.call(`/api/shops/${f.shop.id}/commerce`, {
        method: "PUT",
        body: { ...settings, version: 0 },
      }),
      409,
    );
    await parse(
      await f.call(`/api/shops/${f.shop.id}/checkout/quote`, {
        method: "POST",
        token: null,
        body: { requestId: f.requestId },
      }),
      403,
    );
    await parse(
      await f.call(`/api/shops/${f.shop.id}/checkout/quote`, {
        method: "POST",
        token: null,
        headers: { "X-Order-Token": token },
        body: { requestId: f.requestId, totalCents: 1 },
      }),
      400,
    );
    await parse(
      await f.call(`/api/shops/${f.shop.id}/checkout/quote`, {
        method: "POST",
        token: null,
        headers: { "X-Order-Token": "C".repeat(43) },
        body: { requestId: f.requestId },
      }),
      403,
    );
    const { order } = await parse(
      await f.checkout("quote", { requestId: f.requestId }),
    );
    assert.equal(order.totalCents, 1697);
    assert.equal(order.pricing.taxCents, 195);
    assert.equal(order.paidCents, 0);
    assert.equal(order.snapshot.product.priceCents, 1001);
    assert.equal(order.accessHash, undefined);
    const retry = await parse(
      await f.checkout("quote", { requestId: f.requestId }),
    );
    assert.equal(retry.order.id, order.id);
    const history = await parse(
      await f.checkout("status", { orderId: order.id }),
    );
    assert.equal(history.order.status, "quoted");
    const requests = await parse(
      await f.call(`/api/shops/${f.shop.id}/requests`),
    );
    assert.equal(requests.requests[0].accessHash, undefined);
  } finally {
    f.restore();
  }
});

test("USD, CAD, GBP, EUR, and AUD deposits, balance, duplicate webhook and refund reconciliation use seller connection", async () => {
  for (const currency of ["USD", "CAD", "GBP", "EUR", "AUD"]) {
    const f = await setup(currency);
    try {
      let { order } = await parse(
        await f.checkout("quote", { requestId: f.requestId }),
      );
      const id = order.id;
      ({ order } = await parse(
        await f.checkout("pay", {
          orderId: id,
          revision: 1,
          choice: "deposit",
        }),
      ));
      assert.equal(order.request.dueCents, 849);
      assert.equal(order.paidCents, 0);
      const retry = await parse(
        await f.checkout("pay", {
          orderId: id,
          revision: 1,
          choice: "deposit",
        }),
      );
      assert.equal(retry.order.request.url, order.request.url);
      assert.equal(f.network.links.size, 1);
      await parse(
        await f.checkout("pay", { orderId: id, revision: 1, choice: "full" }),
        409,
      );
      const payment = f.complete(1, 849);
      const event = {
        event_id: "event-1",
        merchant_id: "merchant-fixture",
        type: "payment.updated",
        data: { object: { payment: { id: payment } } },
      };
      await parse(await f.webhook(event, false), 403);
      await parse(await f.webhook(event));
      await parse(await f.webhook(event));
      ({ order } = await parse(await f.checkout("status", { orderId: id })));
      assert.equal(order.paidCents, 849);
      assert.equal(order.status, "deposit_paid");
      assert.equal(order.balanceCents, 848);
      ({ order } = await parse(
        await f.checkout("pay", { orderId: id, revision: 1, choice: "full" }),
      ));
      assert.equal(order.request.dueCents, 848);
      f.complete(2, 848);
      ({ order } = await parse(await f.checkout("status", { orderId: id })));
      assert.equal(order.paidCents, 1697);
      assert.equal(order.status, "paid");
      f.network.payments.get("payment-1").refunded_money.amount = 100;
      f.network.refunds.set("refund-1", {
        id: "refund-1",
        payment_id: "payment-1",
        status: "COMPLETED",
        amount_money: { amount: 100, currency },
      });
      await parse(
        await f.webhook({
          event_id: "refund-event",
          merchant_id: "merchant-fixture",
          type: "refund.updated",
          data: { object: { refund: { id: "refund-1" } } },
        }),
      );
      ({ order } = await parse(await f.checkout("status", { orderId: id })));
      assert.equal(order.refundedCents, 100);
      assert.equal(order.status, "review_required");
      await parse(
        await f.checkout("pay", { orderId: id, revision: 1, choice: "full" }),
        409,
      );
      const owner = await parse(
        await f.call(`/api/shops/${f.shop.id}/requests`),
      );
      assert.equal(owner.requests[0].checkout.paidCents, 1597);
      assert.ok(!JSON.stringify(order).includes("fixture-access"));
    } finally {
      f.restore();
    }
  }
});

test("lost Square creation response retries same persisted key, cancellation checks provider and stale policy blocks pay", async () => {
  const f = await setup();
  try {
    const { order } = await parse(
      await f.checkout("quote", { requestId: f.requestId }),
    );
    f.network.failCreate = true;
    await parse(
      await f.checkout("pay", {
        orderId: order.id,
        revision: 1,
        choice: "full",
      }),
      503,
    );
    const retry = await parse(
      await f.checkout("pay", {
        orderId: order.id,
        revision: 1,
        choice: "full",
      }),
    );
    assert.equal(f.network.links.size, 1);
    assert.equal(retry.order.request.dueCents, 1697);
    await parse(
      await f.call(`/api/shops/${f.shop.id}/square/disconnect`, {
        method: "POST",
        body: {},
      }),
      409,
    );
    const cancelled = await parse(
      await f.checkout("cancel", { orderId: order.id }),
    );
    assert.equal(cancelled.order.status, "cancelled");
    assert.equal(cancelled.order.request, null);
    await parse(
      await f.checkout("pay", {
        orderId: order.id,
        revision: 1,
        choice: "full",
      }),
      409,
    );
    const nextBody = { ...f.requestBody, requestKey: crypto.randomUUID() };
    const next = await parse(
      await f.call(`/api/shops/${f.shop.id}/requests`, {
        method: "POST",
        token: null,
        body: nextBody,
      }),
      201,
    );
    const quoted = await parse(
      await f.checkout("quote", { requestId: next.request.id }),
    );
    await parse(
      await f.call(`/api/shops/${f.shop.id}/commerce`, {
        method: "PUT",
        body: { ...settings, version: 1, taxBps: 0 },
      }),
    );
    await parse(
      await f.checkout("pay", {
        orderId: quoted.order.id,
        revision: 1,
        choice: "full",
      }),
      409,
    );
  } finally {
    f.restore();
  }
});

test("mismatched payment is held for review; expired merchant can read saved receipt but cannot charge", async () => {
  const f = await setup();
  try {
    const { order } = await parse(
      await f.checkout("quote", { requestId: f.requestId }),
    );
    await parse(
      await f.checkout("pay", {
        orderId: order.id,
        revision: 1,
        choice: "full",
      }),
    );
    f.complete(1, 1);
    const result = await parse(
      await f.checkout("status", { orderId: order.id }),
    );
    assert.equal(result.order.status, "review_required");
    assert.equal(result.order.paidCents, 0);
    const shop = f.object.instance.shop();
    f.sql.exec(
      "UPDATE shop SET data=? WHERE singleton=1",
      JSON.stringify({
        ...shop,
        subscription: { ...shop.subscription, paidUntil: Date.now() - 1 },
      }),
    );
    await parse(await f.checkout("status", { orderId: order.id }));
    await parse(
      await f.checkout("pay", {
        orderId: order.id,
        revision: 1,
        choice: "full",
      }),
      409,
    );
    await parse(
      await f.call(`/api/shops/${f.shop.id}/checkout/merchant`, {
        token: "other",
      }),
      404,
    );
  } finally {
    f.restore();
  }
});

test("real Dome and Heart designs preserve browser/server prices and complete design snapshots", async () => {
  const catalog = JSON.parse(
    await readFile(
      new URL("../../../platform/public/catalog.json", import.meta.url),
      "utf8",
    ),
  );
  for (const mode of ["dome", "heart"]) {
    const f = await setup();
    try {
      f.env.ASSETS = { fetch: async () => Response.json(catalog) };
      const preset = mode === "heart" ? "satin" : "fresh";
      const recipe = catalog.recipes.find(
        (r) => r.preset === preset && r.mode === mode,
      );
      assert.ok(recipe);
      const current = f.object.instance.shop();
      const draft = {
        ...current.draft,
        preset,
        disabledFlowers: [],
        disabledExtras: [],
        home: {...current.draft.home,sections:["builder","contact"]},
        enabledModes:
          preset === "satin" ? ["dome", "heart"] : ["classic", "dome", "heart"],
        flowerPrices: Object.fromEntries(
          catalog.flowers
            .filter((x) => x.preset === preset)
            .map((x) => [x.id, 317]),
        ),
        extrasCents: Object.fromEntries(
          catalog.extras
            .filter((x) => !x.preset || x.preset === preset)
            .map((x) => [x.id, 29]),
        ),
      };
      f.sql.exec(
        "UPDATE shop SET data=? WHERE singleton=1",
        JSON.stringify({ ...current, draft, published: { version: 2, draft } }),
      );
      const r = await parse(
        await f.call(`/api/shops/${f.shop.id}/requests`, {
          method: "POST",
          token: null,
          body: {
            ...f.requestBody,
            requestKey: crypto.randomUUID(),
            kind: "design",
            productId: undefined,
            design: recipe.design,
            publishedVersion: 2,
          },
        }),
        201,
      );
      const { order } = await parse(
        await f.checkout("quote", { requestId: r.request.id }),
      );
      const browserPrice = priceDesign(recipe.design, draft, catalog);
      assert.equal(browserPrice.ok, true);
      assert.equal(order.pricing.subtotalCents, browserPrice.totalCents);
      assert.equal(order.snapshot.design.mode, recipe.design.mode);
      assert.equal(
        order.snapshot.design.items.length,
        recipe.design.items.length,
      );
    } finally {
      f.restore();
    }
  }
});

test("cash-marked products cannot enter Square and missing webhook setup cannot charge", async () => {
  const f = await setup();
  try {
    await parse(
      await f.call(`/api/shops/${f.shop.id}/commerce`, {
        method: "PUT",
        body: { ...settings, version: 1, cashProductIds: ["gift"] },
      }),
    );
    await parse(await f.checkout("quote", { requestId: f.requestId }), 409);
    await parse(
      await f.call(`/api/shops/${f.shop.id}/commerce`, {
        method: "PUT",
        body: { ...settings, version: 2 },
      }),
    );
    delete f.env.SQUARE_SANDBOX_WEBHOOK_SIGNATURE_KEY;
    await parse(await f.checkout("quote", { requestId: f.requestId }), 409);
    assert.equal(f.network.links.size, 0);
  } finally {
    f.restore();
  }
});

test("merchant notes preserve receipt authorisation and cancelling unpaid fulfillment retires its checkout", async () => {
  const f = await setup();
  try {
    let { requests } = await parse(
      await f.call(`/api/shops/${f.shop.id}/requests`),
    );
    await parse(
      await f.call(`/api/shops/${f.shop.id}/requests/${f.requestId}`, {
        method: "PATCH",
        body: {
          version: requests[0].version,
          merchantNote: "Prepared by florist",
        },
      }),
    );
    const { order } = await parse(
      await f.checkout("quote", { requestId: f.requestId }),
    );
    await parse(
      await f.checkout("pay", {
        orderId: order.id,
        revision: 1,
        choice: "full",
      }),
    );
    ({ requests } = await parse(
      await f.call(`/api/shops/${f.shop.id}/requests`),
    ));
    const cancelled = await parse(
      await f.call(`/api/shops/${f.shop.id}/requests/${f.requestId}`, {
        method: "PATCH",
        body: { version: requests[0].version, status: "cancelled" },
      }),
    );
    assert.equal(cancelled.request.status, "cancelled");
    assert.equal(cancelled.request.accessHash, undefined);
    const receipt = await parse(
      await f.checkout("status", { orderId: order.id }),
    );
    assert.equal(receipt.order.status, "cancelled");
    assert.equal(receipt.order.request, null);
    await parse(
      await f.checkout("pay", {
        orderId: order.id,
        revision: 1,
        choice: "full",
      }),
      409,
    );
    assert.ok(f.network.calls.some((c) => c.method === "DELETE"));
  } finally {
    f.restore();
  }
});

test("failed payment is never counted, unknown merchant events do not change orders, full refund preserves history", async () => {
  const f = await setup();
  try {
    const { order } = await parse(
      await f.checkout("quote", { requestId: f.requestId }),
    );
    await parse(
      await f.checkout("pay", {
        orderId: order.id,
        revision: 1,
        choice: "full",
      }),
    );
    f.complete(1, 1697, "FAILED");
    let read = await parse(await f.checkout("status", { orderId: order.id }));
    assert.equal(read.order.paidCents, 0);
    await parse(
      await f.webhook({
        event_id: "foreign-event",
        merchant_id: "other-merchant",
        type: "payment.updated",
        data: { id: "payment-1" },
      }),
    );
    read = await parse(await f.checkout("status", { orderId: order.id }));
    assert.equal(read.order.paidCents, 0);
    f.complete(1, 1697);
    await parse(await f.checkout("status", { orderId: order.id }));
    f.network.payments.get("payment-1").refunded_money.amount = 1697;
    f.network.refunds.set("refund-all", {
      id: "refund-all",
      payment_id: "payment-1",
      status: "COMPLETED",
      amount_money: { amount: 1697, currency: "USD" },
    });
    const event = {
      event_id: "refund-all-event",
      merchant_id: "merchant-fixture",
      type: "refund.updated",
      data: { object: { refund: { id: "refund-all" } } },
    };
    await parse(await f.webhook(event));
    await parse(await f.webhook(event));
    read = await parse(await f.checkout("status", { orderId: order.id }));
    assert.equal(read.order.status, "refunded");
    assert.equal(read.order.paidCents, 0);
    assert.equal(read.order.refundedCents, 1697);
    assert.equal(read.order.totalCents, 1697);
    assert.equal(read.order.snapshot.product.title, "A satin gift");
  } finally {
    f.restore();
  }
});
