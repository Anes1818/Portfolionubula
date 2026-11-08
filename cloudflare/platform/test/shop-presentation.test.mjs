import test from "node:test";
import assert from "node:assert/strict";
import {
  applyPresentation,
  presentation,
  fulfillmentSummary,
} from "../../../platform/public/shop-presentation.mjs";
import { setup, settings } from "./checkout-fixture.mjs";

test("page style changes preserve products and recipes, and delivery summary escapes merchant text", () => {
  const original = {
    home: {
      sections: ["products", "contact"],
      headline: "My shop",
      heroMediaId: "photo",
    },
    products: [{ id: "gift", priceCents: 100 }],
    collection: [{ id: "bouquet", design: {} }],
  };
  const next = applyPresentation(original, "builder");
  assert.equal(presentation(next.home), "builder");
  assert.deepEqual(next.products, original.products);
  assert.deepEqual(next.collection, original.collection);
  assert.deepEqual(original.home.sections, ["products", "contact"]);
  assert.equal(next.home.heroMediaId, "photo");
  assert.equal(next.home.heroButtonTarget, "builder");
  assert.ok(applyPresentation(next, "shop").home.sections.includes("products"));
  const html = fulfillmentSummary(
    {
      pickupEnabled: true,
      deliveryEnabled: true,
      deliveryNote: "Only <Town>",
      fulfillmentRules: {
        enforceDeliveryZones: true,
        deliveryZones: [{ name: "<North>", feeCents: 875 }],
      },
    },
    "CAD",
  );
  assert.ok(html.includes("&lt;Town&gt;"));
  assert.ok(html.includes("&lt;North&gt;"));
  assert.ok(html.includes("8.75"));
  assert.ok(
    !fulfillmentSummary(
      { pickupEnabled: true, deliveryEnabled: false, deliveryNote: "Secret" },
      "CAD",
    ).includes("Secret"),
  );
});

test("full-only preference is public, frozen on quote, and prevents a forged deposit request", async () => {
  const f = await setup("CAD");
  try {
    let r = await f.call(`/api/shops/${f.shop.id}/commerce`, {
      method: "PUT",
      body: { ...settings, version: 1, paymentOptions: "full" },
    });
    assert.equal(r.status, 200, await r.clone().text());
    const publicData = await (
      await f.call(`/api/public/shops/${f.shop.slug}`, { token: null })
    ).json();
    assert.equal(publicData.shop.checkoutSettings.paymentOptions, "full");
    const q = await f.checkout("quote", { requestId: f.requestId });
    assert.equal(q.status, 200, await q.clone().text());
    const { order } = await q.json();
    assert.equal(order.paymentOptions, "full");
    r = await f.checkout("pay", {
      orderId: order.id,
      revision: order.revision,
      choice: "deposit",
    });
    assert.equal(r.status, 409);
    assert.match((await r.json()).error, /full payment only/);
    r = await f.checkout("pay", {
      orderId: order.id,
      revision: order.revision,
      choice: "full",
    });
    assert.equal(r.status, 200, await r.clone().text());
    const paidRequest = (await r.json()).order.request;
    assert.equal(paidRequest.dueCents, order.totalCents);
    r = await f.call(`/api/shops/${f.shop.id}/commerce`, {
      method: "PUT",
      body: { ...settings, version: 2, paymentOptions: "anything" },
    });
    assert.equal(r.status, 400);
  } finally {
    f.restore();
  }
});

test("the payment-choice guard retains the merchant cancellation guard", async () => {
  const f = await setup("CAD");
  try {
    const q = await f.checkout("quote", { requestId: f.requestId });
    assert.equal(q.status, 200);
    const { order } = await q.json();
    const request = JSON.parse(
      f.sql.exec(
        "SELECT data FROM customer_requests WHERE id=?",
        f.requestId,
      )[0].data,
    );
    // Fulfillment can be cancelled independently from the frozen quote.
    request.status = "cancelled";
    f.sql.exec(
      "UPDATE customer_requests SET data=? WHERE id=?",
      JSON.stringify(request),
      f.requestId,
    );
    const response = await f.checkout("pay", {
      orderId: order.id,
      revision: order.revision,
      choice: "full",
    });
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /cancelled by the florist/);
    assert.equal(f.network.links.size, 0);
  } finally {
    f.restore();
  }
});
