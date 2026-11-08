import test from "node:test";
import assert from "node:assert/strict";
import { fixture, catalog } from "./fixtures.mjs";
import { hydrateDraft, initialDraft } from "../validation.mjs";
import {
  checkFulfillment,
  normalizeFulfillmentRules,
  localDateTime,
} from "../../../platform/public/fulfillment-rules.mjs";
import { setup, settings } from "./checkout-fixture.mjs";
const parse = async (r, status = 200) => {
  assert.equal(r.status, status, await r.clone().text());
  return r.json();
};

test("new shop leads with the builder; a florist can explicitly choose a fixed-product-only shop", async () => {
  const f = fixture({ env: { PUBLISHING_ENABLED: "true" } }),
    { shop } = await f.create();
  assert.equal(shop.draft.home.sections.includes("builder"), true);
  assert.deepEqual(
    shop.draft.disabledFlowers,
    catalog.flowers.map((x) => x.id),
  );
  assert.deepEqual(shop.draft.flowerPrices, {});
  const saved = await parse(
    await f.call(`/api/shops/${shop.id}/draft`, {
      method: "PUT",
      body: {
        version: 1,
        draft: {
          ...shop.draft,
          home: {
            ...shop.draft.home,
            sections: shop.draft.home.sections.filter((x) => x !== "builder"),
          },
          country: "CA",
          timeZone: "America/Toronto",
          products: [
            {
              id: "first",
              title: "First bouquet",
              description: "",
              category: "",
              cover: null,
              available: true,
              priceCents: 3500,
            },
          ],
        },
      },
    }),
  );
  const report = await parse(await f.call(`/api/shops/${shop.id}/readiness`));
  assert.equal(report.contentReady, true);
  assert.equal(report.canPublish, false, "Content does not bypass activation");
  const sql = f.env.SHOPS.objects.get(shop.id).state.storage.sql;
  sql.exec(
    "UPDATE shop SET data=?",
    JSON.stringify({
      ...saved.shop,
      subscription: {
        status: "active",
        paidUntil: Date.now() + 86400000,
        testEnvironment: false,
      },
    }),
  );
  const pub = await parse(
    await f.call(`/api/shops/${shop.id}/publish`, {
      method: "POST",
      body: { version: saved.shop.version },
    }),
  );
  assert.equal(pub.shop.published.draft.products[0].priceCents, 3500);
  assert.equal(pub.shop.published.draft.timeZone, "America/Toronto");
  const legacy = initialDraft({
    name: "Legacy",
    currency: "USD",
    preset: "fresh",
  });
  assert.deepEqual(hydrateDraft(legacy).disabledFlowers, []);
  assert.equal(hydrateDraft(legacy).home.sections.includes("builder"), true);
  await parse(
    await f.call(`/api/shops/${shop.id}/draft`, {
      method: "PUT",
      body: {
        version: saved.shop.version,
        draft: { ...saved.shop.draft, timeZone: "Not/AZone" },
      },
    }),
    400,
  );
});

test("fulfillment handles country, specific postal codes, preparation dates, closures and DST in shop time", () => {
  const now = Date.parse("2026-11-02T16:30:00Z");
  const rules = {
    enforceDeliveryZones: true,
    deliveryZones: [
      { id: "wide", name: "Central", postcodes: ["M5V*"], feeCents: 1000 },
      { id: "exact", name: "Special", postcodes: ["M5V 1E3"], feeCents: 1500 },
    ],
  };
  const base = {
    rules,
    method: "delivery",
    country: "CA",
    timeZone: "America/Toronto",
    now,
  };
  assert.equal(
    checkFulfillment({
      ...base,
      customer: { postalCode: "m5v 1e3", country: "CA" },
    }).deliveryCents,
    1500,
  );
  assert.equal(
    checkFulfillment({
      ...base,
      customer: { postalCode: "M5V2A1", country: "CA" },
    }).deliveryCents,
    1000,
  );
  assert.equal(
    checkFulfillment({
      ...base,
      customer: { postalCode: "M4B1A1", country: "CA" },
    }).ok,
    false,
  );
  assert.equal(
    checkFulfillment({
      ...base,
      customer: { postalCode: "M5V1E3", country: "US" },
    }).ok,
    false,
  );
  assert.equal(
    checkFulfillment({ ...base, method: "pickup" }).deliveryCents,
    0,
  );
  const calendar = {
    calendarEnabled: true,
    closedWeekdays: [0],
    closedDates: ["2026-11-04"],
    leadHours: 24,
    sameDayCutoff: "11:00",
  };
  assert.equal(
    checkFulfillment({
      rules: calendar,
      method: "pickup",
      timeZone: "America/Toronto",
      now,
      customer: { date: "2026-11-02" },
    }).ok,
    false,
  );
  assert.equal(
    checkFulfillment({
      rules: calendar,
      method: "pickup",
      timeZone: "America/Toronto",
      now,
      customer: { date: "2026-11-03" },
    }).ok,
    true,
  );
  assert.equal(
    checkFulfillment({
      rules: calendar,
      method: "pickup",
      timeZone: "America/Toronto",
      now,
      customer: { date: "2026-11-04" },
    }).ok,
    false,
  );
  assert.equal(
    checkFulfillment({
      rules: { ...calendar, leadHours: 0 },
      method: "pickup",
      timeZone: "America/Toronto",
      now,
      customer: { date: "2026-11-02" },
    }).ok,
    false,
  );
  assert.equal(
    localDateTime(Date.parse("2026-03-08T07:30:00Z"), "America/Toronto").time,
    "03:30",
  );
  assert.throws(() =>
    normalizeFulfillmentRules({
      deliveryZones: [
        { id: "bad", name: "Bad", postcodes: ["*"], feeCents: 0 },
      ],
    }),
  );
  assert.throws(() => normalizeFulfillmentRules([]));
});

test("server rejects outside-area requests and freezes zone fees and gift recipient in the payable order", async () => {
  const f = await setup("CAD");
  try {
    let shop = JSON.parse(f.sql.exec("SELECT data FROM shop")[0].data);
    shop.draft.country = shop.published.draft.country = "CA";
    shop.draft.timeZone = shop.published.draft.timeZone = "America/Toronto";
    f.sql.exec("UPDATE shop SET data=?", JSON.stringify(shop));
    await parse(
      await f.call(`/api/shops/${shop.id}/commerce`, {
        method: "PUT",
        body: {
          ...settings,
          version: 1,
          fulfillmentRules: {
            enforceDeliveryZones: true,
            deliveryZones: [
              {
                id: "central",
                name: "Central",
                postcodes: ["M5V*"],
                feeCents: 2000,
              },
            ],
          },
        },
      }),
    );
    const make = (customer) =>
      f.call(`/api/shops/${shop.id}/requests`, {
        method: "POST",
        token: null,
        body: {
          ...f.requestBody,
          requestKey: crypto.randomUUID(),
          customer: { ...f.requestBody.customer, ...customer },
        },
      });
    await parse(await make({ postalCode: "M4B1A1", country: "CA" }), 409);
    const { request } = await parse(
      await make({
        postalCode: "M5V1E3",
        country: "CA",
        recipient: {
          name: "Gift Recipient",
          phone: "+14165550111",
          message: "Happy birthday!",
        },
      }),
      201,
    );
    const { order } = await parse(
      await f.checkout("quote", { requestId: request.id }),
    );
    assert.equal(order.pricing.deliveryCents, 2000);
    assert.equal(order.totalCents, 3391);
    assert.equal(order.customer.recipient.name, "Gift Recipient");
    assert.equal(order.customer.recipient.message, "Happy birthday!");
  } finally {
    f.restore();
  }
});
