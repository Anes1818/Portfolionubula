import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { verifyFirebase } from "../../rays-payments/security.mjs";
import {
  initialDraft,
  validateDraft,
  DRAFT_LIMIT,
  hydrateDraft,
} from "../validation.mjs";
import { fixture, origin, catalog, png, design } from "./fixtures.mjs";

test("verified Firebase signatures, project and verified email are required before tenant allocation", async () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const jwk = publicKey.export({ format: "jwk" });
  jwk.kid = "test-platform";
  jwk.alg = "RS256";
  const project = "platform-test-signatures",
    now = Math.floor(Date.now() / 1000);
  const token = (overrides = {}) => {
    const header = Buffer.from(
        JSON.stringify({ alg: "RS256", kid: jwk.kid }),
      ).toString("base64url"),
      payload = Buffer.from(
        JSON.stringify({
          aud: project,
          iss: "https://securetoken.google.com/" + project,
          sub: "verified-owner",
          email: "owner@example.test",
          email_verified: true,
          iat: now,
          exp: now + 3600,
          auth_time: now,
          ...overrides,
        }),
      ).toString("base64url");
    return (
      header +
      "." +
      payload +
      "." +
      sign(
        "RSA-SHA256",
        Buffer.from(header + "." + payload),
        privateKey,
      ).toString("base64url")
    );
  };
  const f = fixture({
    env: { FIREBASE_PROJECT_ID: project },
    verifyIdentity: (value, expectedProject) =>
      verifyFirebase(value, expectedProject, async () =>
        Response.json({ keys: [jwk] }),
      ),
  });
  const valid = token(),
    signatureTampered =
      valid.slice(0, valid.lastIndexOf(".") + 1) +
      Buffer.alloc(256).toString("base64url");
  for (const bad of [
    null,
    "forged",
    signatureTampered,
    token({ email_verified: false }),
    token({ aud: "other-project" }),
    token({ exp: now - 1 }),
    token({ sub: "" }),
  ]) {
    assert.equal((await f.call("/api/session", { token: bad })).status, 401);
    assert.equal(f.env.REGISTRY.objects.size, 0);
  }
  const good = await f.call("/api/session", { token: token() });
  assert.equal(good.status, 200);
  assert.deepEqual(await good.json(), {
    user: { uid: "verified-owner", email: "owner@example.test" },
    shop: null,
    isAdmin: false,
  });
});

test("private beta invitations use verified identity; health/config disclose no allowlist or active providers", async () => {
  const f = fixture();
  for (const route of ["/api/session", "/api/shops/sh_" + "a".repeat(32)]) {
    const response = await f.call(route, { token: "uninvited" });
    assert.equal(response.status, 403);
    assert.match((await response.json()).error, /Private beta/);
  }
  assert.equal(
    (await f.create("Blocked", "blocked-flowers", "uninvited")).response.status,
    403,
  );
  assert.equal(f.env.REGISTRY.objects.size, 0);
  assert.equal(f.env.SHOPS.objects.size, 0);
  for (const path of ["/api/health", "/api/config"]) {
    const response = await f.call(path, { token: null });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.signupMode, "private-beta");
    assert.equal(body.billingEnabled, false);
    assert.equal(body.checkoutEnabled, false);
    assert.equal(body.publishingEnabled, false);
    assert.ok(!JSON.stringify(body).includes("owner@example.test"));
  }
  assert.deepEqual(
    await (await f.call("/api/catalog", { token: null })).json(),
    catalog,
  );
});

test("SQLite registry atomically enforces one shop per owner and unique slug across racing creates", async () => {
  const f = fixture();
  const races = await Promise.all([
    f.create("One", "one-flowers"),
    f.create("Two", "two-flowers"),
  ]);
  assert.deepEqual(
    races.map((result) => result.response.status).sort(),
    [201, 409],
  );
  const shop = races.find((result) => result.response.status === 201).shop;
  assert.equal(shop.ownerUid, "uid-owner");
  assert.equal(shop.version, 1);
  assert.deepEqual(shop.subscription, { status: "inactive" });
  assert.deepEqual(shop.square, { status: "not_connected" });
  assert.equal(shop.published, null);
  assert.equal(
    (await f.create("Other", shop.slug, "other")).response.status,
    409,
  );
  const own = await (await f.call("/api/session")).json();
  assert.equal(own.shop.id, shop.id);
  assert.equal(f.env.SHOPS.objects.size, 1);
  const registry = f.env.REGISTRY.objects.values().next().value.state
    .storage.sql;
  assert.equal(
    [...registry.exec("SELECT COUNT(*) count FROM registry")][0].count,
    1,
  );
});

test("owner drafts persist while anonymous and other-owner previews and media stay private", async () => {
  const f = fixture(),
    { shop } = await f.create();
  assert.equal((await f.call("/api/shops/" + shop.id)).status, 200);
  assert.equal((await f.call("/api/shops/resolve/" + shop.slug)).status, 200);
  for (const token of [null, "other"]) {
    assert.equal(
      (await f.call("/api/shops/" + shop.id, { token })).status,
      404,
    );
    assert.equal(
      (await f.call("/api/shops/resolve/" + shop.slug, { token })).status,
      404,
    );
    assert.equal(
      (await f.call(`/api/shops/${shop.id}/media/slot-1`, { token })).status,
      404,
    );
  }
  const other = await f.create("Other Shop", "other-flowers", "other");
  assert.equal(other.response.status, 201);
  assert.notEqual(other.shop.id, shop.id);
  assert.equal(f.env.SHOPS.objects.size, 2);
  assert.equal(
    (
      await f.call(`/api/shops/${shop.id}/draft`, {
        method: "PUT",
        token: "other",
        body: { version: 1, draft: shop.draft },
      })
    ).status,
    404,
  );
});

test("draft saves use optimistic versions and never accept ownership or entitlement fields", async () => {
  const f = fixture(),
    { shop } = await f.create();
  for (const input of [
    {
      name: "Spoof",
      slug: "spoof-shop",
      currency: "USD",
      preset: "fresh",
      ownerUid: "uid-other",
    },
    {
      name: "Spoof",
      slug: "spoof-shop",
      currency: "USD",
      preset: "fresh",
      subscription: { status: "active" },
    },
  ])
    assert.equal(
      (
        await f.call("/api/shops", {
          method: "POST",
          token: "other",
          body: input,
        })
      ).status,
      400,
    );
  for (const field of [
    "ownerUid",
    "subscription",
    "square",
    "published",
    "version",
  ]) {
    const response = await f.call(`/api/shops/${shop.id}/draft`, {
      method: "PUT",
      body: {
        version: shop.version,
        draft: { ...shop.draft, [field]: "spoof" },
      },
    });
    assert.equal(response.status, 400, field);
  }
  const draft = {
    ...shop.draft,
    city: "Lagos",
    flowerPrices: { rose_red: 725 },
    extrasCents: { card: null },
    collection: [
      {
        id: "card-1",
        title: "Classic",
        recipeId: "fresh-classic",
        design: null,
        cover: null,
      },
    ],
  };
  const save = await f.call(`/api/shops/${shop.id}/draft`, {
    method: "PUT",
    body: { version: 1, draft },
  });
  assert.equal(save.status, 200);
  const updated = (await save.json()).shop;
  assert.equal(updated.version, 2);
  assert.equal(updated.draft.city, "Lagos");
  assert.equal(updated.draft.flowerPrices.rose_red, 725);
  const stale = await f.call(`/api/shops/${shop.id}/draft`, {
    method: "PUT",
    body: { version: 1, draft: { ...draft, city: "Stale" } },
  });
  assert.equal(stale.status, 409);
  assert.equal(
    (await (await f.call(`/api/shops/${shop.id}`)).json()).shop.draft.city,
    "Lagos",
  );
  assert.equal(
    (await (await f.call(`/api/shops/${shop.id}`)).json()).shop.subscription
      .status,
    "inactive",
  );
});

test("draft pricing, catalog IDs, themes, image references and recursive designs are bounded", async () => {
  const f = fixture(),
    { shop } = await f.create();
  const badDrafts = [
    { ...shop.draft, flowerPrices: { rose_red: 1.5 } },
    { ...shop.draft, flowerPrices: { rose_red: -1 } },
    { ...shop.draft, flowerPrices: { invented_flower: 500 } },
    { ...shop.draft, extrasCents: { card: 1000001 } },
    {
      ...shop.draft,
      theme: { primary: "url(javascript:alert(1))", background: "#ffffff" },
    },
    { ...shop.draft, disabledFlowers: ["rose_red", "rose_red"] },
    { ...shop.draft, logoMediaId: "slot-2" },
    { ...shop.draft, logoMediaId: "slot-1" },
    {
      ...shop.draft,
      collection: [
        {
          id: "x",
          title: "X",
          recipeId: "unknown-recipe",
          design: null,
          cover: null,
        },
      ],
    },
    {
      ...shop.draft,
      collection: [
        {
          id: "x",
          title: "X",
          recipeId: null,
          design: { items: Array(301).fill(1) },
          cover: null,
        },
      ],
    },
    {
      ...shop.draft,
      collection: Array.from({ length: 7 }, (_, i) => ({
        id: "card-" + i,
        title: "X",
        recipeId: "fresh-classic",
        design: null,
        cover: null,
      })),
    },
  ];
  for (const draft of badDrafts)
    assert.equal(
      (
        await f.call(`/api/shops/${shop.id}/draft`, {
          method: "PUT",
          body: { version: 1, draft },
        })
      ).status,
      400,
    );
  assert.equal(
    (
      await f.call(`/api/shops/${shop.id}/draft`, {
        method: "PUT",
        body: {
          version: 1,
          draft: { ...shop.draft, tagline: "x".repeat(200 * 1024) },
        },
      })
    ).status,
    413,
  );
});

test("the shipped flower catalog and its first four recipes form a valid complete priced draft", async () => {
  const actual = JSON.parse(
    await readFile(
      new URL("../../../platform/public/catalog.json", import.meta.url),
      "utf8",
    ),
  );
  const draft = initialDraft({
    name: "Catalog compatibility",
    currency: "CAD",
    preset: "fresh",
  });
  draft.flowerPrices = Object.fromEntries(
    actual.flowers
      .filter((item) => !item.preset || item.preset === "fresh")
      .map((item) => [item.id, item.priceCents]),
  );
  draft.extrasCents = Object.fromEntries(
    actual.extras
      .filter((item) => !item.preset || item.preset === "fresh")
      .map((item) => [item.id, item.priceCents]),
  );
  draft.collection = actual.recipes
    .filter((item) => item.preset === "fresh")
    .slice(0, 4)
    .map((item, i) => ({
      id: "card-" + (i + 1),
      title: item.name,
      recipeId: item.id,
      design: null,
      cover: null,
    }));
  assert.equal(validateDraft(draft, actual).collection.length, 4);
  for (const flower of actual.flowers.filter(
    (item) => !item.preset || item.preset === "fresh",
  ))
    assert.equal(
      validateDraft(draft, actual).flowerPrices[flower.id],
      flower.priceCents,
    );
});

test("eighteen upload slots create immutable hashed raster media, isolate ownership and reject SVG or spoofed MIME", async () => {
  const f = fixture(),
    { shop } = await f.create();
  const upload = (
    slot,
    kind,
    body = png,
    mime = "image/png",
    token = "owner",
  ) =>
    f.call(`/api/shops/${shop.id}/media?slot=${slot}&kind=${kind}`, {
      method: "POST",
      token,
      body,
      headers: { "Content-Type": mime },
    });
  for (let slot = 1; slot <= 5; slot++) {
    const response = await upload(slot, slot === 1 ? "logo" : "cover");
    assert.equal(response.status, 201);
    const { media } = await response.json();
    assert.match(media.id, /^img_[a-f0-9]{64}$/);
    const image = await f.call(media.url);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get("content-type"), "image/png");
    assert.deepEqual(new Uint8Array(await image.arrayBuffer()), png);
    for (const token of [null, "other"])
      assert.equal((await f.call(media.url, { token })).status, 404);
  }
  for (const [slot, kind] of [
    [19, "cover"],
    [0, "cover"],
    [2, "unknown"],
    ["../x", "cover"],
  ])
    assert.equal((await upload(slot, kind)).status, 400);
  assert.equal(
    (
      await upload(
        2,
        "cover",
        new TextEncoder().encode("<svg></svg>"),
        "image/svg+xml",
      )
    ).status,
    415,
  );
  assert.equal(
    (await upload(2, "cover", new TextEncoder().encode("<svg></svg>"))).status,
    400,
  );
  assert.equal((await upload(2, "cover", png, "image/jpeg")).status, 400);
  assert.equal(
    (await upload(1, "logo", new Uint8Array(80 * 1024 + 1))).status,
    413,
  );
  assert.equal(
    (await upload(2, "cover", new Uint8Array(150 * 1024 + 1))).status,
    413,
  );
  const hugePixels = png.slice();
  new DataView(hugePixels.buffer).setUint32(16, 99999);
  assert.equal((await upload(2, "cover", hugePixels)).status, 400);
  const draft = {
    ...shop.draft,
    logoMediaId: (await (await upload(1, "logo")).json()).media.id,
    collection: [
      {
        id: "card-1",
        title: "Classic",
        recipeId: "fresh-classic",
        design: null,
        cover: (await (await upload(2, "cover")).json()).media.id,
      },
    ],
  };
  assert.equal(
    (
      await f.call(`/api/shops/${shop.id}/draft`, {
        method: "PUT",
        body: { version: 1, draft },
      })
    ).status,
    200,
  );
  const state = f.env.SHOPS.objects.get(shop.id).state;
  assert.equal(
    [...state.storage.sql.exec("SELECT COUNT(*) count FROM media")][0].count,
    1,
  );
});

test("publishing, billing, Square and order routes fail closed even with activation vars set", async () => {
  const f = fixture({
      env: {
        BILLING_ENABLED: "true",
        CHECKOUT_ENABLED: "true",
        PUBLISHING_ENABLED: "true",
      },
    }),
    { shop } = await f.create();
  for (const operation of ["publish", "square/connect"]) {
    const response = await f.call(`/api/shops/${shop.id}/${operation}`, {
      method: "POST",
      body: {
        subscription: { status: "active" },
        square: { status: "connected" },
      },
    });
    assert.equal(response.status, 409);
    assert.match(
      (await response.json()).error,
      /setup|pending|unavailable|subscription/,
    );
  }
  const billing = await f.call(`/api/shops/${shop.id}/billing/checkout`, {
    method: "POST",
    body: { planId: "shop" },
  });
  assert.ok([409, 503].includes(billing.status));
  for (const path of [
    "/api/orders",
    "/api/checkout",
    `/api/shops/${shop.id}/orders`,
    `/api/shops/${shop.id}/checkout`,
  ])
    assert.equal(
      (await f.call(path, { method: "POST", body: {} })).status,
      404,
    );
  const current = (await (await f.call(`/api/shops/${shop.id}`)).json()).shop;
  assert.equal(current.version, 1);
  assert.equal(current.published, null);
  assert.equal(current.subscription.status, "inactive");
  assert.equal(
    (await f.call(`/api/shops/${shop.id}`, { token: null })).status,
    404,
  );
});

test("public snapshot gate requires paid expiry and publishing flag, permits disconnected Square and excludes private edits", async () => {
  const f = fixture({ env: { PUBLISHING_ENABLED: "true" } }),
    { shop } = await f.create();
  const sql = f.env.SHOPS.objects.get(shop.id).state.storage.sql;
  // Only a test inserts entitlement states directly; no API route can do so.
  const published = {
    version: 1,
    draft: { ...shop.draft, city: "Published city" },
  };
  for (const fields of [
    {
      published,
      subscription: { status: "inactive" },
      square: { status: "connected" },
    },
    {
      published,
      subscription: {
        status: "active",
        paidUntil: Date.now() - 1,
        testEnvironment: false,
      },
      square: { status: "not_connected" },
    },
    {
      published: null,
      subscription: {
        status: "active",
        paidUntil: Date.now() + 3600000,
        testEnvironment: false,
      },
      square: { status: "connected" },
    },
  ]) {
    sql.exec(
      "UPDATE shop SET data=? WHERE singleton=1",
      JSON.stringify({ ...shop, ...fields }),
    );
    assert.equal(
      (await f.call(`/api/shops/${shop.id}`, { token: null })).status,
      404,
    );
  }
  sql.exec(
    "UPDATE shop SET data=? WHERE singleton=1",
    JSON.stringify({
      ...shop,
      draft: { ...shop.draft, city: "Private new edit" },
      published,
      subscription: {
        status: "active",
        paidUntil: Date.now() + 3600000,
        testEnvironment: false,
      },
      square: { status: "not_connected" },
    }),
  );
  const response = await f.call(`/api/shops/${shop.id}`, { token: null });
  assert.equal(response.status, 200);
  const result = (await response.json()).shop;
  assert.equal(result.draft.city, "Published city");
  assert.equal(result.ownerUid, undefined);
  assert.equal(result.subscription, undefined);
  assert.ok(!JSON.stringify(result).includes("Private new edit"));
});

test("mutation origins are restricted and localhost is enabled only in explicit local environment", async () => {
  const f = fixture();
  for (const from of [
    "https://evil.example",
    "http://localhost:4192",
    "https://nebulastudio.site.evil.example",
    null,
  ])
    assert.equal(
      (
        await f.call("/api/shops", {
          method: "POST",
          from,
          body: { name: "X", slug: "xxx", currency: "USD", preset: "fresh" },
        })
      ).status,
      403,
    );
  assert.equal(f.env.REGISTRY.objects.size, 0);
  assert.equal(
    (await f.call("/api/session", { from: "https://nebulastudio.site" }))
      .status,
    200,
  );
  const preflight = await f.call("/api/session", {
    method: "OPTIONS",
    token: null,
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), origin);
  const local = fixture({ env: { ENVIRONMENT: "local" } });
  assert.equal(
    (await local.call("/api/session", { from: "http://localhost:4192" }))
      .status,
    200,
  );
});

test("draft/media mutations have owner-local rate caps and SPA routes serve the application", async () => {
  const f = fixture(),
    { shop } = await f.create();
  const sql = f.env.SHOPS.objects.get(shop.id).state.storage.sql;
  sql.exec(
    "INSERT INTO rate_limits (bucket, window, count) VALUES (?, ?, ?)",
    "draft",
    Math.floor(Date.now() / 60000),
    60,
  );
  assert.equal(
    (
      await f.call(`/api/shops/${shop.id}/draft`, {
        method: "PUT",
        body: { version: 1, draft: shop.draft },
      })
    ).status,
    429,
  );
  sql.exec(
    "INSERT INTO rate_limits (bucket, window, count) VALUES (?, ?, ?)",
    "media",
    Math.floor(Date.now() / 60000),
    10,
  );
  assert.equal(
    (
      await f.call(`/api/shops/${shop.id}/media?slot=1&kind=logo`, {
        method: "POST",
        body: png,
        headers: { "Content-Type": "image/png" },
      })
    ).status,
    429,
  );
  for (const path of [
    "/",
    "/demo",
    "/demo/",
    "/login",
    "/dashboard",
    "/dashboard/shop",
    "/dashboard/prices",
    "/dashboard/collection",
    "/dashboard/products",
    "/dashboard/editor",
    "/dashboard/billing",
    "/dashboard/payments",
    "/s/test-flowers",
    "/admin",
    "/admin/login",
    "/admin/login/",
    "/admin/shops/sh_" + "a".repeat(32) + "/preview",
    "/admin/shops/sh_" + "a".repeat(32) + "/orders/",
  ]) {
    const response = await f.call(path, { token: null });
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Private beta/);
  }
  assert.match(
    await (await f.call("/studio/app.js", { token: null })).text(),
    /studio/,
  );
  assert.equal(
    (await f.call("/studio/missing.js", { token: null })).status,
    404,
  );
});

test("operator console bookmarks redirect locally while unknown admin pages stay absent", async () => {
  const f = fixture();
  for (const method of ["GET", "HEAD"]) {
    const response = await f.call("/admin.html?source=bookmark", {
      method,
      token: null,
    });
    assert.equal(response.status, 302);
    assert.equal(
      response.headers.get("Location"),
      origin + "/admin?source=bookmark",
    );
  }
  for (const path of [
    "/admin/unknown",
    "/admin/shops/not-a-shop/preview",
    "/admin/shops/sh_" + "a".repeat(32) + "/edit",
  ])
    assert.equal((await f.call(path, { token: null })).status, 404);
  assert.equal(
    (await f.call("/admin.html", { method: "POST", body: {}, token: null }))
      .status,
    404,
  );
  assert.equal(f.env.REGISTRY.objects.size, 0);
  assert.equal(f.env.SHOPS.objects.size, 0);
});

test("florist credentials cannot list platform clients or grant access through operator APIs", async () => {
  const f = fixture({
    env: {
      MANUAL_ACTIVATION_ENABLED: "true",
      ENVIRONMENT: "test",
      SANDBOX_TEST_ACCESS: "true",
    },
  });
  const { shop } = await f.create();
  for (const token of ["owner", "other"]) {
    assert.equal((await f.call("/api/admin/users", { token })).status, 403);
    assert.equal(
      (
        await f.call(`/api/admin/shops/${shop.id}/activation`, {
          token,
          method: "POST",
          body: {
            action: "test",
            operationId: crypto.randomUUID(),
            revision: 0,
          },
          headers: { "X-Platform-Admin": "verified" },
        })
      ).status,
      403,
    );
  }
  const current = await (await f.call(`/api/shops/${shop.id}`)).json();
  assert.deepEqual(current.shop.subscription, { status: "inactive" });
  assert.equal(current.shop.published, null);
});

const fixedProduct = (id = "product-1", priceCents = 2900) => ({
  id,
  title: "Ready bouquet",
  description: "Prepared bouquet",
  priceCents,
  cover: null,
  available: true,
  category: "Gifts",
});
function seedPaid(f, shop, overrides = {}) {
  const paid = {
    ...shop,
    subscription: {
      status: "active",
      paidUntil: Date.now() + 86400000,
      testEnvironment: false,
    },
    ...overrides,
  };
  f.env.SHOPS.objects
    .get(shop.id)
    .state.storage.sql.exec(
      "UPDATE shop SET data=? WHERE singleton=1",
      JSON.stringify(paid),
    );
  return paid;
}

test("v1 SQLite records hydrate without mutating saved data and preset switches stay coherent", async () => {
  const f = fixture();
  const { shop } = await f.create("Satin Shop", "satinshopnow");
  const legacy = { ...shop, draft: { ...shop.draft, preset: "satin" } };
  for (const key of [
    "schemaVersion",
    "products",
    "disabledExtras",
    "enabledModes",
    "home",
  ])
    delete legacy.draft[key];
  const sql = f.env.SHOPS.objects.get(shop.id).state.storage.sql;
  const raw = JSON.stringify(legacy);
  sql.exec("UPDATE shop SET data=? WHERE singleton=1", raw);
  const current = (await (await f.call(`/api/shops/${shop.id}`)).json()).shop;
  assert.equal(current.slug, "satinshopnow");
  assert.equal(current.draft.schemaVersion, 2);
  assert.deepEqual(current.draft.enabledModes, ["dome", "heart"]);
  assert.deepEqual(current.draft.products, []);
  assert.equal([...sql.exec("SELECT data FROM shop")][0].data, raw);
  const switched = {
    ...hydrateDraft(legacy.draft),
    preset: "fresh",
    enabledModes: ["dome"],
  };
  assert.equal(
    (
      await f.call(`/api/shops/${shop.id}/draft`, {
        method: "PUT",
        body: { version: 1, draft: switched },
      })
    ).status,
    200,
  );
  const otherPreset = {
    ...switched,
    preset: "satin",
    flowerPrices: { rose_red: 400 },
  };
  // The fixture's untagged legacy flower remains compatible; an explicitly tagged
  // catalog item must be rejected when switching to the other preset.
  assert.throws(
    () =>
      validateDraft(otherPreset, {
        ...catalog,
        flowers: [{ ...catalog.flowers[0], preset: "fresh" }],
      }),
    /unknown/,
  );
});

test("v2 distinguishes six recipes from ten fixed products and enforces cents, availability and aggregate budget", async () => {
  const draft = initialDraft({ name: "V2", currency: "USD", preset: "fresh" });
  draft.collection = Array.from({ length: 6 }, (_, i) => ({
    id: "recipe-" + i,
    title: "Custom " + i,
    recipeId: "fresh-classic",
    design: null,
    cover: null,
  }));
  draft.products = Array.from({ length: 10 }, (_, i) =>
    fixedProduct("product-" + i),
  );
  const valid = validateDraft(draft, catalog);
  assert.equal(valid.collection.length, 6);
  assert.equal(valid.products.length, 10);
  assert.equal(valid.collection[0].available, true);
  assert.equal(valid.products[0].recipeId, undefined);
  for (const bad of [
    { ...draft, products: [...draft.products, fixedProduct("eleven")] },
    { ...draft, products: [fixedProduct("x", 2.5)] },
    { ...draft, products: [{ ...fixedProduct(), available: "yes" }] },
    { ...draft, products: [{ ...fixedProduct(), priceCents: -1 }] },
    { ...draft, products: [fixedProduct(), fixedProduct()] },
    { ...draft, disabledExtras: ["invented"] },
    { ...draft, home: { ...draft.home, sections: ["products", "products"] } },
    { ...draft, enabledModes: ["invented"] },
  ])
    assert.throws(() => validateDraft(bad, catalog));
  assert.equal(DRAFT_LIMIT, 192 * 1024);
  assert.throws(
    () =>
      validateDraft(
        { ...draft, home: { ...draft.home, about: "x".repeat(DRAFT_LIMIT) } },
        catalog,
      ),
    (error) => error.status === 413,
  );
});

test("admin accounts include verified users without shops and page indexed summaries without shop fanout", async () => {
  const f = fixture({ verifyAdmin: async (user) => user.uid === "uid-owner" });
  assert.equal((await (await f.call("/api/session")).json()).isAdmin, true);
  await f.call("/api/session", { token: "other" });
  assert.equal(
    (await f.call("/api/admin/users", { token: "other" })).status,
    403,
  );
  assert.equal((await f.call("/api/admin/users", { token: null })).status, 401);
  let list = await (await f.call("/api/admin/users?limit=1")).json();
  assert.equal(list.users.length, 1);
  assert.equal(list.users[0].status, "no_shop");
  assert.ok(list.nextCursor);
  assert.equal(f.env.SHOPS.objects.size, 0);
  const second = await (
    await f.call("/api/admin/users?limit=1&cursor=" + list.nextCursor)
  ).json();
  assert.equal(second.users.length, 1);
  assert.notEqual(second.users[0].uid, list.users[0].uid);
  const { shop } = await f.create("Other Flowers", "other-flowers", "other");
  list = await (
    await f.call("/api/admin/users?q=other-flowers&status=draft")
  ).json();
  assert.equal(list.users[0].shopId, shop.id);
  assert.equal(list.users[0].email, "other@example.test");
  const detail = await f.call(`/api/admin/shops/${shop.id}`);
  assert.equal(detail.status, 200);
  assert.equal((await detail.json()).shop.ownerUid, "uid-other");
  assert.equal(
    (await f.call(`/api/admin/shops/${shop.id}`, { token: "other" })).status,
    403,
  );
  assert.equal(
    (await f.call(`/api/admin/shops/${shop.id}`, { method: "PUT", body: {} }))
      .status,
    404,
  );
  const registry = f.env.REGISTRY.objects.values().next().value.instance;
  await registry.fetch(
    new Request("https://internal/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: {
          uid: shop.ownerUid,
          shopId: shop.id,
          slug: shop.slug,
          name: "Newer",
          preset: "fresh",
          status: "draft",
          subscriptionStatus: "inactive",
          publishedVersion: 0,
          version: 5,
          revision: 5,
        },
      }),
    }),
  );
  await registry.fetch(
    new Request("https://internal/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: {
          uid: shop.ownerUid,
          shopId: shop.id,
          slug: shop.slug,
          name: "Stale",
          preset: "fresh",
          status: "draft",
          subscriptionStatus: "inactive",
          publishedVersion: 0,
          version: 2,
          revision: 2,
        },
      }),
    }),
  );
  assert.equal(
    (await (await f.call("/api/admin/users?q=Newer")).json()).users[0].version,
    5,
  );
});

test("publication freezes a paid snapshot while later immutable uploads and draft edits leave it unchanged", async () => {
  const f = fixture({ env: { PUBLISHING_ENABLED: "true" } });
  const { shop } = await f.create();
  const upload = async (bytes = png) =>
    (
      await (
        await f.call(`/api/shops/${shop.id}/media?slot=8&kind=cover`, {
          method: "POST",
          body: bytes,
          headers: { "Content-Type": "image/png" },
        })
      ).json()
    ).media;
  const first = await upload();
  const draft = {
    ...shop.draft,
    products: [{ ...fixedProduct(), cover: first.id }],
    home: { ...shop.draft.home, sections: ["products", "contact"] },
  };
  const saved = (
    await (
      await f.call(`/api/shops/${shop.id}/draft`, {
        method: "PUT",
        body: { version: 1, draft },
      })
    ).json()
  ).shop;
  seedPaid(f, saved);
  const publish = await f.call(`/api/shops/${shop.id}/publish`, {
    method: "POST",
    body: { version: 2 },
  });
  assert.equal(publish.status, 200, await publish.clone().text());
  const published = (await publish.json()).shop;
  assert.equal(published.published.version, 1);
  const changed = png.slice();
  changed[40] ^= 1;
  const second = await upload(changed);
  assert.notEqual(first.id, second.id);
  assert.deepEqual(
    new Uint8Array(
      await (await f.call(first.url, { token: null })).arrayBuffer(),
    ),
    png,
  );
  const next = {
    ...published.draft,
    products: [{ ...fixedProduct(), title: "Private edit", cover: second.id }],
  };
  assert.equal(
    (
      await f.call(`/api/shops/${shop.id}/draft`, {
        method: "PUT",
        body: { version: 2, draft: next },
      })
    ).status,
    200,
  );
  const live = (
    await (
      await f.call(`/api/public/shops/${shop.slug}`, { token: null })
    ).json()
  ).shop;
  assert.equal(live.draft.products[0].title, "Ready bouquet");
  assert.equal(live.draft.products[0].cover, first.id);
  assert.equal((await f.call(second.url, { token: null })).status, 404);
  assert.equal(
    (
      await f.call(`/api/shops/${shop.id}/draft`, {
        method: "PUT",
        body: {
          version: 3,
          draft: { ...next, preset: "satin", enabledModes: ["dome"], disabledFlowers:[],disabledExtras:[] },
        },
      })
    ).status,
    409,
  );
});

test("legacy image slots remain readable but cannot be overwritten, and referenced snapshots survive garbage collection", async () => {
  const f = fixture();
  const { shop } = await f.create();
  const object = f.env.SHOPS.objects.get(shop.id);
  object.state.storage.sql.exec(
    "INSERT INTO media(id,kind,mime,body,byte_length,updated_at) VALUES(?,?,?,?,?,?)",
    "slot-1",
    "logo",
    "image/png",
    png,
    png.length,
    1,
  );
  assert.equal(
    (await f.call(`/api/shops/${shop.id}/media/slot-1`)).status,
    200,
  );
  assert.equal(
    (
      await object.instance.fetch(
        new Request("https://internal/media/slot-1", {
          method: "PUT",
          headers: {
            "X-Owner-Uid": shop.ownerUid,
            "Content-Type": "image/png",
          },
          body: png,
        }),
      )
    ).status,
    409,
  );
  const saved = {
    ...shop,
    draft: { ...shop.draft, logoMediaId: "slot-1" },
    published: { version: 1, draft: { ...shop.draft, logoMediaId: "slot-1" } },
  };
  object.state.storage.sql.exec(
    "UPDATE shop SET data=? WHERE singleton=1",
    JSON.stringify(saved),
  );
  assert.equal(
    (
      await f.call(`/api/shops/${shop.id}/media?slot=2&kind=cover`, {
        method: "POST",
        body: png,
        headers: { "Content-Type": "image/png" },
      })
    ).status,
    201,
  );
  assert.equal(
    [...object.state.storage.sql.exec("SELECT id FROM media WHERE id='slot-1'")]
      .length,
    1,
  );
});

test("public product requests bind published prices, persist once, cap traffic and never imply payment", async () => {
  const f = fixture({ env: { PUBLISHING_ENABLED: "true" } });
  const { shop } = await f.create();
  const draft = {
    ...shop.draft,
    products: [fixedProduct(), { ...fixedProduct("hidden"), available: false }],
  };
  seedPaid(f, shop, { draft, published: { version: 1, draft } });
  const payload = {
    requestKey: crypto.randomUUID(),
    kind: "product",
    productId: "product-1",
    customer: {
      name: "Customer",
      phone: "123456789",
      note: "A gift",
      date: null,
    },
    fulfillment: "pickup",
  };
  const send = (body = payload) =>
    f.call(`/api/shops/${shop.id}/requests`, {
      method: "POST",
      token: null,
      body,
    });
  const first = await send();
  assert.equal(first.status, 201);
  const receipt = (await first.json()).request;
  assert.equal(receipt.status, "requested");
  assert.equal(receipt.totalCents, 2900);
  const retry = (await (await send()).json()).request;
  assert.equal(retry.id, receipt.id);
  assert.equal(
    (
      await send({
        ...payload,
        customer: { ...payload.customer, name: "Different" },
      })
    ).status,
    409,
  );
  assert.equal(
    (await send({ ...payload, requestKey: crypto.randomUUID(), totalCents: 1 }))
      .status,
    400,
  );
  assert.equal(
    (
      await send({
        ...payload,
        requestKey: crypto.randomUUID(),
        productId: "hidden",
      })
    ).status,
    409,
  );
  const list = await (await f.call(`/api/shops/${shop.id}/requests`)).json();
  assert.equal(list.requests.length, 1);
  assert.equal(list.requests[0].customer.name, "Customer");
  assert.equal(
    (await f.call(`/api/shops/${shop.id}/requests`, { token: "other" })).status,
    404,
  );
  assert.equal(
    (await f.call(`/api/shops/${shop.id}/requests`, { token: null })).status,
    404,
  );
  for (let i = 0; i < 9; i++)
    assert.equal(
      (await send({ ...payload, requestKey: crypto.randomUUID() })).status,
      201,
    );
  assert.equal(
    (await send({ ...payload, requestKey: crypto.randomUUID() })).status,
    429,
  );
  const sql = f.env.SHOPS.objects.get(shop.id).state.storage.sql;
  assert.equal(
    [...sql.exec("SELECT COUNT(*) count FROM customer_requests")][0].count,
    10,
  );
  const bucket = [
    ...sql.exec("SELECT bucket FROM rate_limits WHERE bucket LIKE 'request:%'"),
  ][0].bucket;
  assert.match(bucket, /^request:[a-f0-9]{3}$/);
});

test("admin search treats long wildcard text literally and rejects fractional page limits", async () => {
  const f = fixture({ verifyAdmin: async (user) => user.uid === "uid-owner" });
  await f.call("/api/session");
  await f.call("/api/session", { token: "other" });
  for (const query of ["%", "_", "%_".repeat(60), "é".repeat(120)]) {
    const response = await f.call(
      "/api/admin/users?q=" + encodeURIComponent(query),
    );
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).users, []);
  }
  assert.equal(
    (await f.call("/api/admin/users?q=" + "x".repeat(121))).status,
    400,
  );
  assert.equal(
    (await f.call("/api/admin/users?cursor=" + "x".repeat(129))).status,
    400,
  );
  assert.equal((await f.call("/api/admin/users?status=unknown")).status, 400);
  assert.equal((await f.call("/api/admin/users?limit=1.5")).status, 400);
  const bounded = await (await f.call("/api/admin/users?limit=5000")).json();
  assert.equal(bounded.users.length, 2);
  assert.equal(bounded.nextCursor, null);
});

test("media collection reads current references after a concurrent draft save", async () => {
  const f = fixture();
  const { shop } = await f.create();
  const object = f.env.SHOPS.objects.get(shop.id),
    sql = object.state.storage.sql;
  sql.exec(
    "INSERT INTO media(id,kind,mime,body,byte_length,updated_at) VALUES(?,?,?,?,?,?)",
    "slot-1",
    "logo",
    "image/png",
    png,
    png.length,
    1,
  );
  let release;
  const stream = new ReadableStream({
    start(controller) {
      release = () => {
        controller.enqueue(png);
        controller.close();
      };
    },
  });
  const digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", png))]
    .map((part) => part.toString(16).padStart(2, "0"))
    .join("");
  const pending = object.instance.fetch(
    new Request("https://internal/media/img_" + digest, {
      method: "PUT",
      headers: {
        "X-Owner-Uid": shop.ownerUid,
        "Content-Type": "image/png",
        "X-Media-Kind": "cover",
      },
      body: stream,
      duplex: "half",
    }),
  );
  // Let the upload capture its starting shop, then pause at the streamed body.
  await new Promise((resolve) => setTimeout(resolve, 0));
  try {
    const save = await f.call(`/api/shops/${shop.id}/draft`, {
      method: "PUT",
      body: { version: 1, draft: { ...shop.draft, logoMediaId: "slot-1" } },
    });
    assert.equal(save.status, 200);
  } finally {
    release();
  }
  assert.equal((await pending).status, 201);
  assert.equal(object.instance.shop().draft.logoMediaId, "slot-1");
  assert.equal(
    [...sql.exec("SELECT id FROM media WHERE id='slot-1'")].length,
    1,
  );
  assert.equal(
    (await f.call(`/api/shops/${shop.id}/media/slot-1`)).status,
    200,
  );
});

test("billing resource registry binds existing shops once and rejects cross-owner resource claims", async () => {
  const f = fixture();
  const { shop } = await f.create();
  const other = (await f.create("Other Flowers", "other-flowers", "other"))
    .shop;
  const registry = f.env.REGISTRY.objects.values().next().value.instance;
  const call = (path, body) =>
    registry.fetch(
      new Request(
        "https://internal" + path,
        body === undefined
          ? {}
          : {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            },
      ),
    );
  const resource = {
    resourceKey: "test:subscription:123",
    shopId: shop.id,
    ownerUid: shop.ownerUid,
  };
  assert.equal((await call("/billing-resource", resource)).status, 200);
  assert.equal((await call("/billing-resource", resource)).status, 200);
  const found = await (
    await call("/billing-resource?value=test:subscription:123")
  ).json();
  assert.equal(found.entry.id, shop.id);
  assert.equal(found.entry.ownerUid, shop.ownerUid);
  assert.equal(
    (
      await call("/billing-resource", {
        ...resource,
        shopId: other.id,
        ownerUid: other.ownerUid,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await call("/billing-resource", {
        resourceKey: "test:order:456",
        shopId: shop.id,
        ownerUid: other.ownerUid,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await call("/billing-resource", {
        ...resource,
        shopId: "sh_" + "0".repeat(32),
        ownerUid: "unknown",
      })
    ).status,
    404,
  );
  assert.equal(
    (await call("/billing-resource?value=unknown:subscription:123")).status,
    400,
  );
  assert.deepEqual(
    await (await call("/billing-resource?value=test:order:999")).json(),
    { entry: null },
  );
  assert.equal(f.env.SHOPS.objects.size, 2);
  assert.equal(
    (await f.call("/api/billing-resource", { method: "POST", body: resource }))
      .status,
    404,
  );
});

test("custom requests price the published policy and reject unknown, disabled, unpriced or hidden selections", async () => {
  const requestCatalog = {
    ...catalog,
    flowers: [
      ...catalog.flowers,
      {
        id: "satin_rose_red",
        runtimeId: "rose_red",
        preset: "satin",
        priceCents: 800,
      },
    ],
  };
  const f = fixture({
    env: {
      PUBLISHING_ENABLED: "true",
      ASSETS: { fetch: async () => Response.json(requestCatalog) },
    },
  });
  const { shop } = await f.create();
  const publishedDraft = {
    ...shop.draft,
    disabledFlowers: [],
    home: {...shop.draft.home,sections:["builder","contact"]},
    flowerPrices: { rose_red: 725 },
    collection: [
      {
        id: "hidden-card",
        title: "Hidden",
        recipeId: "fresh-classic",
        design,
        cover: null,
        available: false,
        category: "",
      },
    ],
  };
  const apply = (draft = publishedDraft) =>
    seedPaid(f, shop, {
      draft: { ...draft, flowerPrices: { rose_red: 9999 } },
      published: { version: 1, draft },
    });
  apply();
  const payload = {
    requestKey: crypto.randomUUID(),
    kind: "design",
    design,
    customer: {
      name: "Customer",
      phone: "12345678",
      note: "Gift\nPlease wrap carefully",
      date: null,
    },
    fulfillment: "pickup",
  };
  const send = (body = payload) =>
    f.call(`/api/shops/${shop.id}/requests`, {
      method: "POST",
      token: null,
      body,
    });
  const response = await send();
  assert.equal(response.status, 201);
  const receipt = (await response.json()).request;
  assert.equal(receipt.totalCents, 725);
  assert.equal(receipt.status, "requested");
  assert.match(receipt.pricingNote, /Tax and delivery/);
  assert.equal((await (await send()).json()).request.id, receipt.id);
  assert.equal(
    (
      await send({
        ...payload,
        requestKey: crypto.randomUUID(),
        pricing: { totalCents: 1 },
      })
    ).status,
    400,
  );
  assert.equal(
    (await send({ ...payload, requestKey: crypto.randomUUID(), totalCents: 1 }))
      .status,
    400,
  );
  assert.equal(
    (
      await send({
        ...payload,
        requestKey: crypto.randomUUID(),
        cardId: "hidden-card",
      })
    ).status,
    409,
  );
  const unknown = structuredClone(design);
  unknown.items[0].id = "invented";
  assert.equal(
    (
      await send({
        ...payload,
        requestKey: crypto.randomUUID(),
        design: unknown,
      })
    ).status,
    400,
  );
  const foreign = structuredClone(design);
  foreign.items[0].id = "satin_rose_red";
  const foreignResponse = await send({
    ...payload,
    requestKey: crypto.randomUUID(),
    design: foreign,
  });
  assert.equal(foreignResponse.status, 400);
  assert.match((await foreignResponse.json()).error, /another preset/);
  for (const forbidden of [
    { ...publishedDraft, disabledFlowers: ["rose_red"] },
    { ...publishedDraft, flowerPrices: { rose_red: null } },
    { ...publishedDraft, enabledModes: ["dome"] },
  ]) {
    apply(forbidden);
    assert.equal(
      (await send({ ...payload, requestKey: crypto.randomUUID() })).status,
      400,
    );
  }
  const stored = (await (await f.call(`/api/shops/${shop.id}/requests`)).json())
    .requests;
  assert.equal(stored.length, 1);
  assert.equal(stored[0].pricing.totalCents, 725);
  assert.equal(stored[0].customer.note, "Gift\nPlease wrap carefully");
});

test("historical request cover survives two later publications and age-based upload collection", async () => {
  const f = fixture({ env: { PUBLISHING_ENABLED: "true" } });
  const { shop } = await f.create();
  const sql = f.env.SHOPS.objects.get(shop.id).state.storage.sql;
  const upload = async (marker) => {
    const bytes = png.slice();
    bytes[40] ^= marker;
    const response = await f.call(
      `/api/shops/${shop.id}/media?slot=8&kind=cover`,
      { method: "POST", body: bytes, headers: { "Content-Type": "image/png" } },
    );
    assert.equal(response.status, 201);
    return (await response.json()).media;
  };
  const first = await upload(0);
  const draft = {
    ...shop.draft,
    products: [{ ...fixedProduct(), cover: first.id }],
    home: { ...shop.draft.home, sections: ["products", "contact"] },
  };
  let current = (
    await (
      await f.call(`/api/shops/${shop.id}/draft`, {
        method: "PUT",
        body: { version: shop.version, draft },
      })
    ).json()
  ).shop;
  seedPaid(f, current);
  const publish = async () => {
    const response = await f.call(`/api/shops/${shop.id}/publish`, {
      method: "POST",
      body: { version: current.version },
    });
    assert.equal(response.status, 200, await response.clone().text());
    current = (await response.json()).shop;
  };
  await publish();
  const request = await f.call(`/api/shops/${shop.id}/requests`, {
    method: "POST",
    token: null,
    body: {
      requestKey: crypto.randomUUID(),
      kind: "product",
      productId: "product-1",
      customer: { name: "Customer", phone: "12345678", note: "", date: null },
      fulfillment: "pickup",
    },
  });
  assert.equal(request.status, 201);
  const later = [];
  for (const marker of [1, 2]) {
    const media = await upload(marker);
    later.push(media);
    const response = await f.call(`/api/shops/${shop.id}/draft`, {
      method: "PUT",
      body: {
        version: current.version,
        draft: {
          ...current.draft,
          products: [{ ...fixedProduct(), cover: media.id }],
        },
      },
    });
    assert.equal(response.status, 200);
    current = (await response.json()).shop;
    await publish();
  }
  assert.equal(current.published.version, 3);
  assert.equal(current.previousPublished.version, 2);
  assert.ok(
    !JSON.stringify([
      current.draft,
      current.published,
      current.previousPublished,
    ]).includes(first.id),
  );
  sql.exec(
    "INSERT INTO media(id,kind,mime,body,byte_length,updated_at) VALUES(?,?,?,?,?,?)",
    "slot-2",
    "cover",
    "image/png",
    png,
    png.length,
    1,
  );
  sql.exec("UPDATE media SET updated_at=1");
  await upload(3);
  assert.equal(
    [...sql.exec("SELECT id FROM media WHERE id=?", first.id)].length,
    1,
  );
  assert.equal(
    [...sql.exec("SELECT id FROM media WHERE id='slot-2'")].length,
    0,
  );
  for (const media of later)
    assert.equal(
      [...sql.exec("SELECT id FROM media WHERE id=?", media.id)].length,
      1,
    );
  assert.equal((await f.call(first.url)).status, 200);
  assert.equal((await f.call(first.url, { token: null })).status, 404);
  const history = (
    await (await f.call(`/api/shops/${shop.id}/requests`)).json()
  ).requests;
  assert.equal(history.length, 1);
  assert.equal(history[0].product.cover, first.id);
});
