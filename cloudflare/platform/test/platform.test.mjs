import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { verifyFirebase } from "../../rays-payments/security.mjs";
import { initialDraft, validateDraft } from "../validation.mjs";
import { fixture, origin, catalog, png } from "./fixtures.mjs";

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
      collection: Array.from({ length: 5 }, (_, i) => ({
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
          draft: { ...shop.draft, tagline: "x".repeat(85 * 1024) },
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
    actual.flowers.map((item) => [item.id, item.priceCents]),
  );
  draft.extrasCents = Object.fromEntries(
    actual.extras.map((item) => [item.id, item.priceCents]),
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
  for (const flower of actual.flowers)
    assert.equal(
      validateDraft(draft, actual).flowerPrices[flower.id],
      flower.priceCents,
    );
});

test("five fixed media slots accept bounded raster bytes, isolate ownership and reject SVG or spoofed image MIME", async () => {
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
    assert.equal(media.id, "slot-" + slot);
    const image = await f.call(media.url);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get("content-type"), "image/png");
    assert.deepEqual(new Uint8Array(await image.arrayBuffer()), png);
    for (const token of [null, "other"])
      assert.equal((await f.call(media.url, { token })).status, 404);
  }
  for (const [slot, kind] of [
    [6, "cover"],
    [1, "cover"],
    [2, "logo"],
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
    logoMediaId: "slot-1",
    collection: [
      {
        id: "card-1",
        title: "Classic",
        recipeId: "fresh-classic",
        design: null,
        cover: "slot-2",
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
    5,
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
  for (const operation of ["publish", "billing/checkout", "square/connect"]) {
    const response = await f.call(`/api/shops/${shop.id}/${operation}`, {
      method: "POST",
      body: {
        subscription: { status: "active" },
        square: { status: "connected" },
      },
    });
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /setup|pending|unavailable/);
  }
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

test("public snapshot gate requires every server entitlement and excludes owner UID and private edits", async () => {
  const f = fixture(),
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
      subscription: { status: "active" },
      square: { status: "not_connected" },
    },
    {
      published: null,
      subscription: { status: "active" },
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
      subscription: { status: "active" },
      square: { status: "connected" },
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
    "/login",
    "/dashboard",
    "/dashboard/shop",
    "/dashboard/prices",
    "/dashboard/collection",
    "/dashboard/billing",
    "/dashboard/payments",
    "/s/test-flowers",
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
