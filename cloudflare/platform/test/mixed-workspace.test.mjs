import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  initialDraft,
  validateDraft,
  validatePublication,
} from "../validation.mjs";
import {
  validateDesign,
  normalizePolicy,
} from "../../../platform/shared/policy.mjs";
import { publicationReport } from "../publish-readiness.mjs";
import { fixture } from "./fixtures.mjs";
const catalog = JSON.parse(
  readFileSync(
    new URL("../../../platform/public/catalog.json", import.meta.url),
  ),
);
const mixedDraft = () => ({
  ...initialDraft({
    name: "Both kinds of beautiful",
    currency: "CAD",
    preset: "mixed",
  }),
  phone: "+14165550123",
  requestChannel: "both",
  flowerPrices: Object.fromEntries(catalog.flowers.map((row) => [row.id, 100])),
  extrasCents: Object.fromEntries(catalog.extras.map((row) => [row.id, 50])),
});
const parse = async (response, status = 200) => {
  assert.equal(response.status, status, await response.clone().text());
  return response.json();
};
test("mixed shops validate, price and publish both collections with matching original engines", () => {
  const draft = mixedDraft();
  for (const preset of ["fresh", "satin"]) {
    const recipes = catalog.recipes.filter((row) => row.preset === preset);
    assert.ok(recipes.length);
    for (const recipe of recipes) {
      const mixed = validateDesign(recipe.design, draft, catalog);
      const single = validateDesign(
        recipe.design,
        {
          ...draft,
          preset,
          enabledModes:
            preset === "satin" ? ["dome", "heart"] : draft.enabledModes,
        },
        catalog,
      );
      assert.equal(mixed.ok, true, JSON.stringify(mixed.issues));
      assert.equal(mixed.pricing.totalCents, single.pricing.totalCents);
      assert.equal(mixed.design.flowerType, preset);
    }
    const recipe = recipes[0];
    draft.collection.push({
      id: preset,
      title: recipe.name,
      recipeId: recipe.id,
      design: null,
      cover: null,
      available: true,
      category: preset,
    });
  }
  assert.equal(
    normalizePolicy(draft, catalog).policy.flowerPrices.satin_rose_pink,
    100,
  );
  assert.equal(validatePublication(draft, catalog).collection.length, 2);
  const report = publicationReport(
    {
      id: "test",
      draft,
      subscription: { status: "active", paidUntil: Date.now() + 86400000 },
    },
    catalog,
    { PUBLISHING_ENABLED: "true" },
  );
  assert.equal(report.contentReady, true, JSON.stringify(report.checks));
  const wrong = structuredClone(
    catalog.recipes.find((row) => row.preset === "fresh").design,
  );
  wrong.items[0].id = catalog.flowers.find((row) => row.preset === "satin").id;
  wrong.flowerType = "fresh";
  assert.equal(
    validateDesign(wrong, draft, catalog).ok,
    false,
    "Runtime selection cannot bypass per-bouquet compatibility",
  );
  assert.throws(() =>
    validateDraft({ ...draft, requestChannel: "javascript:bad" }, catalog),
  );
});
test("published shops can add the other collection without replacing the published snapshot; message channels are server-owned", async () => {
  const f = fixture({
    env: {
      PUBLISHING_ENABLED: "true",
      ASSETS: {
        fetch: async (request) =>
          new URL(request.url).pathname === "/catalog.json"
            ? Response.json(catalog)
            : new Response("Not found", { status: 404 }),
      },
    },
  });
  const { shop } = await f.create();
  const object = f.env.SHOPS.objects.get(shop.id),
    sql = object.state.storage.sql;
  const old = JSON.parse(sql.exec("SELECT data FROM shop")[0].data);
  old.subscription = {
    status: "active",
    paidUntil: Date.now() + 86400000,
    testEnvironment: false,
  };
  old.published = { version: 1, draft: structuredClone(old.draft) };
  sql.exec("UPDATE shop SET data=?", JSON.stringify(old));
  const draft = mixedDraft();
  draft.products = [
    {
      id: "gift",
      title: "A flower gift",
      description: "",
      priceCents: 1500,
      cover: null,
      available: true,
      category: "",
    },
  ];
  const saved = await parse(
    await f.call(`/api/shops/${shop.id}/draft`, {
      method: "PUT",
      body: { version: shop.version, draft },
    }),
  );
  assert.equal(saved.shop.draft.preset, "mixed");
  assert.equal(
    saved.shop.published.draft.preset,
    "fresh",
    "Published customer version stays intact until explicit publication",
  );
  await parse(
    await f.call(`/api/shops/${shop.id}/publish`, {
      method: "POST",
      body: { version: saved.shop.version },
    }),
  );
  for (const channel of ["both", "sms", "whatsapp"]) {
    const current = JSON.parse(sql.exec("SELECT data FROM shop")[0].data);
    current.published.draft.requestChannel = channel;
    sql.exec("UPDATE shop SET data=?", JSON.stringify(current));
    const publicResult = await parse(
      await f.call(`/api/public/shops/${current.slug}`, { token: null }),
    );
    assert.equal(
      publicResult.shop.features.checkoutEnabled,
      false,
      "Messaging works with online checkout off",
    );
    assert.equal(publicResult.shop.features.requestsEnabled, true);
    assert.equal(publicResult.shop.draft.requestChannel, channel);
    const request = {
      requestKey: crypto.randomUUID(),
      accessToken: "Z".repeat(43),
      kind: "product",
      productId: "gift",
      publishedVersion: current.published.version,
      fulfillment: "pickup",
      customer: {
        name: "QA customer",
        phone: "+442071234567",
        note: "A gift",
        date: null,
      },
    };
    const data = await parse(
      await f.call(`/api/shops/${shop.id}/requests`, {
        method: "POST",
        token: null,
        body: request,
      }),
      201,
    );
    assert.equal(!!data.whatsappUrl, channel !== "sms");
    assert.equal(!!data.smsUrl, channel !== "whatsapp");
    const link = data.smsUrl || data.whatsappUrl;
    assert.ok(decodeURIComponent(link).includes("florist sign-in"));
    assert.ok(!link.includes(request.accessToken));
    const again = await parse(
      await f.call(`/api/shops/${shop.id}/requests`, {
        method: "POST",
        token: null,
        body: request,
      }),
      201,
    );
    assert.equal(again.request.id, data.request.id);
  }
});
