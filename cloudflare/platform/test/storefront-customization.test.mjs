import test from "node:test";
import assert from "node:assert/strict";
import {
  initialDraft,
  hydrateDraft,
  hydrateShop,
  validateDraft,
  storefrontHomeDefaults,
} from "../validation.mjs";
import { fixture, catalog } from "./fixtures.mjs";

const fresh = () =>
  initialDraft({ name: "The Flower Room", currency: "CAD", preset: "fresh" });
const withHome = (fields) => {
  const draft = fresh();
  return { ...draft, home: { ...draft.home, ...fields } };
};
const badRequest = (fn) => assert.throws(fn, (error) => error.status === 400);
const parse = async (response, status = 200) => {
  assert.equal(response.status, status, await response.clone().text());
  return response.json();
};

test("browser and server share identical storefront presentation defaults", async () => {
  const client = await import("../../../platform/public/storefront-options.js");
  assert.deepEqual(client.storefrontHomeDefaults, storefrontHomeDefaults);
});

test("new presentation defaults hydrate legacy drafts and snapshots without mutating their saved content", () => {
  const legacy = fresh();
  for (const key of Object.keys(storefrontHomeDefaults))
    delete legacy.home[key];
  legacy.home.headline = "An existing welcome";
  legacy.home.about = "The florist's existing story.";
  legacy.home.sections = ["contact", "products"];
  const before = JSON.stringify(legacy);
  const hydrated = hydrateDraft(legacy);
  assert.equal(hydrated.home.headline, legacy.home.headline);
  assert.equal(hydrated.home.about, legacy.home.about);
  assert.deepEqual(hydrated.home.sections, ["contact", "products"]);
  for (const [key, value] of Object.entries(storefrontHomeDefaults))
    assert.equal(hydrated.home[key], value, key);
  assert.equal(JSON.stringify(legacy), before);
  assert.equal(validateDraft(legacy, catalog).home.heroLayout, "split");
  assert.equal(Object.isFrozen(storefrontHomeDefaults), true);

  const shop = {
    draft: legacy,
    published: {
      version: 1,
      draft: { ...legacy, home: { ...legacy.home, headline: "Live welcome" } },
    },
    previousPublished: {
      version: 0,
      draft: {
        ...legacy,
        home: { ...legacy.home, headline: "Previous welcome" },
      },
    },
  };
  const original = JSON.stringify(shop);
  const result = hydrateShop(shop);
  result.draft.home.navCustom = "Private bouquets";
  assert.equal(result.published.draft.home.navCustom, "Bouquets");
  assert.equal(result.previousPublished.draft.home.navCustom, "Bouquets");
  assert.equal(result.published.draft.home.headline, "Live welcome");
  assert.equal(JSON.stringify(shop), original);
});

test("presentation text has explicit bounds, plain-text types and normalized multiline content", () => {
  const limits = {
    announcementText: 160,
    heroEyebrow: 80,
    heroButtonLabel: 60,
    builderButtonLabel: 60,
    heroNote: 160,
    heroStamp: 60,
    ribbonText: 200,
    customTitle: 120,
    customDescription: 300,
    productsTitle: 120,
    productsDescription: 300,
    builderTitle: 120,
    builderDescription: 400,
    aboutTitle: 120,
    contactTitle: 120,
    contactDetails: 1200,
    footerText: 160,
    navCustom: 40,
    navProducts: 40,
    navAbout: 40,
    navContact: 40,
  };
  for (const [key, max] of Object.entries(limits)) {
    assert.equal(
      validateDraft(withHome({ [key]: "x".repeat(max) }), catalog).home[key]
        .length,
      max,
      key,
    );
    badRequest(() =>
      validateDraft(withHome({ [key]: "x".repeat(max + 1) }), catalog),
    );
    for (const invalid of [null, 5, [], {}])
      badRequest(() => validateDraft(withHome({ [key]: invalid }), catalog));
    badRequest(() =>
      validateDraft(withHome({ [key]: "bad\u0000text" }), catalog),
    );
  }
  assert.equal(
    validateDraft(
      withHome({
        contactDetails: "  Tuesday–Saturday\r\nPickup by appointment.  ",
      }),
      catalog,
    ).home.contactDetails,
    "Tuesday–Saturday\nPickup by appointment.",
  );
  badRequest(() =>
    validateDraft(withHome({ heroEyebrow: "not\na single line" }), catalog),
  );
  // This API accepts text, not a rich-HTML template. Rendering must escape it.
  const literal = '<img src=x onerror="alert(1)">';
  assert.equal(
    validateDraft(withHome({ footerText: literal }), catalog).home.footerText,
    literal,
  );
});

test("hero destinations/layouts and presentation toggles accept only their declared values", () => {
  for (const target of [
    "auto",
    "custom",
    "products",
    "builder",
    "about",
    "contact",
  ])
    assert.equal(
      validateDraft(withHome({ heroButtonTarget: target }), catalog).home
        .heroButtonTarget,
      target,
    );
  for (const layout of ["split", "image-first", "centered"])
    assert.equal(
      validateDraft(withHome({ heroLayout: layout }), catalog).home.heroLayout,
      layout,
    );
  for (const key of ["announcementEnabled", "ribbonEnabled", "motionEnabled"]) {
    for (const enabled of [true, false])
      assert.equal(
        validateDraft(withHome({ [key]: enabled }), catalog).home[key],
        enabled,
      );
    for (const invalid of ["true", "false", null, 0, 1, [], {}])
      badRequest(() => validateDraft(withHome({ [key]: invalid }), catalog));
  }
  for (const target of [
    "https://example.test",
    "javascript:alert(1)",
    "hidden",
    null,
    [],
  ])
    badRequest(() =>
      validateDraft(withHome({ heroButtonTarget: target }), catalog),
    );
  for (const layout of ["fullscreen", "", null, {}, 1])
    badRequest(() => validateDraft(withHome({ heroLayout: layout }), catalog));
  for (const key of [
    "customHtml",
    "heroButtonUrl",
    "scripts",
    "navigationLinks",
  ])
    badRequest(() => validateDraft(withHome({ [key]: "unexpected" }), catalog));
});

test("legacy SQLite records gain presentation defaults on read without a migration or rewrite", async () => {
  const f = fixture();
  const { shop } = await f.create();
  for (const key of Object.keys(storefrontHomeDefaults))
    delete shop.draft.home[key];
  const raw = JSON.stringify(shop);
  const sql = f.env.SHOPS.objects.get(shop.id).state.storage.sql;
  sql.exec("UPDATE shop SET data=? WHERE singleton=1", raw);
  const read = await parse(await f.call(`/api/shops/${shop.id}`));
  assert.equal(read.shop.draft.home.motionEnabled, true);
  assert.equal(read.shop.draft.home.heroButtonTarget, "auto");
  assert.equal(read.shop.version, shop.version);
  assert.equal(
    [...sql.exec("SELECT data FROM shop WHERE singleton=1")][0].data,
    raw,
  );
});

test("custom storefront copy persists for the owner while published copy remains unchanged until republished", async () => {
  const f = fixture({ env: { PUBLISHING_ENABLED: "true" } });
  const { shop } = await f.create();
  const draft = {
    ...shop.draft,
    products: [
      {
        id: "gift-1",
        title: "Rose gift",
        description: "",
        priceCents: 3500,
        cover: null,
        available: true,
        category: "",
      },
    ],
    home: {
      ...shop.draft.home,
      sections: ["products", "contact"],
      announcementText: "Weekend collections now open",
      heroEyebrow: "HANDMADE IN OUR NEIGHBOURHOOD",
      heroButtonLabel: "Choose your gift",
      heroButtonTarget: "products",
      heroLayout: "image-first",
      productsTitle: "This week's favourites",
      contactDetails: "Open Tuesday–Saturday\nPickup by appointment",
      footerText: "With love from our flower room",
      motionEnabled: false,
    },
  };
  let current = (
    await parse(
      await f.call(`/api/shops/${shop.id}/draft`, {
        method: "PUT",
        body: { version: shop.version, draft },
      }),
    )
  ).shop;
  assert.equal(current.draft.home.heroButtonLabel, "Choose your gift");
  const sql = f.env.SHOPS.objects.get(shop.id).state.storage.sql;
  sql.exec(
    "UPDATE shop SET data=? WHERE singleton=1",
    JSON.stringify({
      ...current,
      subscription: {
        status: "active",
        paidUntil: Date.now() + 86400000,
        testEnvironment: false,
      },
    }),
  );
  current = (
    await parse(
      await f.call(`/api/shops/${shop.id}/publish`, {
        method: "POST",
        body: { version: current.version },
      }),
    )
  ).shop;
  const firstVersion = current.published.version;
  current = (
    await parse(
      await f.call(`/api/shops/${shop.id}/draft`, {
        method: "PUT",
        body: {
          version: current.version,
          draft: {
            ...current.draft,
            home: {
              ...current.draft.home,
              announcementText: "Next week's private offer",
              heroLayout: "centered",
              navProducts: "Gifts",
            },
          },
        },
      }),
    )
  ).shop;
  assert.equal(
    current.draft.home.announcementText,
    "Next week's private offer",
  );
  let live = (
    await parse(await f.call(`/api/public/shops/${shop.slug}`, { token: null }))
  ).shop;
  assert.equal(
    live.draft.home.announcementText,
    "Weekend collections now open",
  );
  assert.equal(live.draft.home.heroLayout, "image-first");
  assert.equal(live.draft.home.productsTitle, "This week's favourites");
  assert.equal(
    live.draft.home.contactDetails,
    "Open Tuesday–Saturday\nPickup by appointment",
  );
  assert.equal(live.draft.home.motionEnabled, false);
  await parse(
    await f.call(`/api/shops/${shop.id}/draft`, {
      method: "PUT",
      token: "other",
      body: { version: current.version, draft: current.draft },
    }),
    404,
  );
  current = (
    await parse(
      await f.call(`/api/shops/${shop.id}/publish`, {
        method: "POST",
        body: { version: current.version },
      }),
    )
  ).shop;
  live = (
    await parse(await f.call(`/api/public/shops/${shop.slug}`, { token: null }))
  ).shop;
  assert.equal(live.draft.home.heroLayout, "centered");
  assert.equal(live.draft.home.navProducts, "Gifts");
  assert.equal(current.previousPublished.version, firstVersion);
  assert.equal(current.previousPublished.draft.home.heroLayout, "image-first");
});
