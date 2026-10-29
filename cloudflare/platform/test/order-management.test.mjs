import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./fixtures.mjs";
import { ShopStore } from "../stores.mjs";

const product = {
  id: "ready",
  title: "Ready bouquet",
  description: "As pictured",
  priceCents: 3995,
  available: true,
  cover: null,
  category: "Gifts",
};

async function prepared(options = {}) {
  const f = fixture({ env: { PUBLISHING_ENABLED: "true" }, ...options });
  const { shop } = await f.create();
  const sql = f.env.SHOPS.objects.get(shop.id).state.storage.sql;
  const draft = { ...shop.draft, products: [product] };
  sql.exec(
    "UPDATE shop SET data=? WHERE singleton=1",
    JSON.stringify({
      ...shop,
      draft,
      published: { version: 1, draft },
      subscription: {
        status: "active",
        paidUntil: Date.now() + 86400000,
        testEnvironment: false,
      },
    }),
  );
  const path = `/api/shops/${shop.id}/requests`;
  const payload = {
    requestKey: crypto.randomUUID(),
    kind: "product",
    productId: "ready",
    customer: {
      name: "Customer",
      phone: "5551234567",
      note: "A birthday gift",
      date: null,
    },
    fulfillment: "pickup",
  };
  const response = await f.call(path, {
    method: "POST",
    token: null,
    body: payload,
  });
  assert.equal(response.status, 201, await response.clone().text());
  const receipt = (await response.json()).request;
  return { ...f, shop, sql, path, payload, receipt };
}

async function body(response, status = 200) {
  assert.equal(response.status, status, await response.clone().text());
  return response.json();
}

test("owner manages unpaid request lifecycle with optimistic versions and immutable order evidence", async () => {
  const f = await prepared();
  let { request } = await body(await f.call(f.path + "/" + f.receipt.id));
  assert.equal(request.version, 1);
  assert.equal(request.paymentStatus, "unpaid");
  assert.equal(request.merchantNote, "");
  const frozen = structuredClone({
    product: request.product,
    customer: request.customer,
    totalCents: request.totalCents,
    currency: request.currency,
    createdAt: request.createdAt,
  });
  const update = (patch) =>
    f.call(f.path + "/" + request.id, { method: "PATCH", body: patch });
  ({ request } = await body(
    await update({
      version: 1,
      status: "accepted",
      merchantNote: "  Wrap in ivory.\nPickup agreed.  ",
    }),
  ));
  assert.equal(request.status, "accepted");
  assert.equal(request.version, 2);
  assert.equal(request.merchantNote, "Wrap in ivory.\nPickup agreed.");
  assert.equal(request.paymentStatus, "unpaid");
  await body(await update({ version: 1, status: "cancelled" }), 409);
  await body(await update({ version: 2, status: "requested" }), 409);
  await body(await update({ version: 2, status: "paid" }), 400);
  for (const mutation of [
    { totalCents: 1 },
    { customer: { name: "Changed" } },
    { paymentStatus: "paid" },
    { product: { priceCents: 1 } },
  ])
    await body(await update({ version: 2, ...mutation }), 400);
  ({ request } = await body(await update({ version: 2, status: "fulfilled" })));
  assert.equal(request.version, 3);
  assert.equal(request.status, "fulfilled");
  assert.equal(request.paymentStatus, "unpaid");
  await body(await update({ version: 3, status: "accepted" }), 409);
  await body(await update({ version: 3, status: "cancelled" }), 409);
  ({ request } = await body(
    await update({ version: 3, merchantNote: "Collected by customer." }),
  ));
  assert.equal(request.version, 4);
  assert.equal(request.status, "fulfilled");
  assert.deepEqual(
    {
      product: request.product,
      customer: request.customer,
      totalCents: request.totalCents,
      currency: request.currency,
      createdAt: request.createdAt,
    },
    frozen,
  );
  const list = await body(await f.call(f.path));
  assert.deepEqual(list.counts, {
    all: 1,
    requested: 0,
    accepted: 0,
    fulfilled: 1,
    cancelled: 0,
  });
});

test("cancelled requests remain terminal; private notes, revision types and write traffic are bounded", async () => {
  const f = await prepared();
  const path = f.path + "/" + f.receipt.id;
  const patch = (update) => f.call(path, { method: "PATCH", body: update });
  for (const update of [
    { version: 0, status: "accepted" },
    { version: 1.5, status: "accepted" },
    { version: "1", status: "accepted" },
    { version: 1 },
    { version: 1, merchantNote: "x".repeat(1001) },
    { version: 1, merchantNote: "bad\u0000note" },
    { version: 1, status: null },
  ])
    await body(await patch(update), 400);
  let { request } = await body(
    await patch({
      version: 1,
      status: "cancelled",
      merchantNote: "Customer changed plans.",
    }),
  );
  assert.equal(request.version, 2);
  await body(await patch({ version: 2, status: "accepted" }), 409);
  ({ request } = await body(await patch({ version: 2, merchantNote: "" })));
  assert.equal(request.merchantNote, "");
  assert.equal(request.status, "cancelled");
  f.sql.exec(
    "INSERT INTO rate_limits(bucket,window,count) VALUES(?,?,?) ON CONFLICT(bucket) DO UPDATE SET count=excluded.count",
    "request_updates",
    Math.floor(Date.now() / 60000),
    60,
  );
  await body(await patch({ version: 3, merchantNote: "Later" }), 429);
  assert.equal((await body(await f.call(path))).request.version, 3);
});

test("history and details remain owner-accessible after subscription expiry; admins can only inspect", async () => {
  const f = await prepared({
    verifyAdmin: async (user) => user.uid === "uid-other",
  });
  const raw = JSON.parse([...f.sql.exec("SELECT data FROM shop")][0].data);
  f.sql.exec(
    "UPDATE shop SET data=? WHERE singleton=1",
    JSON.stringify({
      ...raw,
      subscription: {
        status: "expired",
        paidUntil: Date.now() - 1000,
        testEnvironment: false,
      },
    }),
  );
  const path = f.path + "/" + f.receipt.id;
  assert.equal((await body(await f.call(f.path))).requests.length, 1);
  assert.equal((await body(await f.call(path))).request.id, f.receipt.id);
  await body(
    await f.call(path, {
      method: "PATCH",
      body: { version: 1, status: "accepted" },
    }),
  );
  for (const route of [f.path, path]) {
    await body(await f.call(route, { token: null }), 404);
    await body(await f.call(route, { token: "other" }));
  }
  await body(
    await f.call(path, {
      token: "other",
      method: "PATCH",
      body: { version: 2, status: "fulfilled" },
    }),
    404,
  );
  const admin = `/api/admin/shops/${f.shop.id}/requests`;
  assert.equal(
    (await body(await f.call(admin, { token: "other" }))).counts.accepted,
    1,
  );
  assert.equal(
    (await body(await f.call(admin + "/" + f.receipt.id, { token: "other" })))
      .request.status,
    "accepted",
  );
  await body(
    await f.call(admin + "/" + f.receipt.id, {
      token: "other",
      method: "PATCH",
      body: { version: 2, status: "fulfilled" },
    }),
    404,
  );
  await body(await f.call(admin), 403);
  await body(await f.call(path, { token: "uninvited" }), 403);
  await body(
    await f.call(path, {
      method: "PATCH",
      from: "https://evil.example",
      body: { version: 2, status: "fulfilled" },
    }),
    403,
  );
});

test("request pages sort newest first with stable tie-breaking, status counts and bounded opaque cursors", async () => {
  const f = await prepared();
  f.sql.exec("DELETE FROM customer_requests");
  const seed = (n, createdAt, status = "requested") => {
    const id = "rq_" + n.toString(16).padStart(32, "0");
    const record = {
      id,
      status,
      kind: "product",
      product,
      totalCents: 3995,
      currency: "USD",
      customer: { name: "Customer", phone: "5551234567" },
      createdAt,
      fulfillment: "pickup",
    };
    f.sql.exec(
      "INSERT INTO customer_requests(id,request_key,fingerprint,created_at,data) VALUES(?,?,?,?,?)",
      id,
      crypto.randomUUID(),
      "a".repeat(64),
      createdAt,
      JSON.stringify(record),
    );
    return id;
  };
  const ids = [
    seed(1, 1000),
    seed(2, 2000),
    seed(3, 2000, "accepted"),
    seed(4, 3000, "cancelled"),
  ];
  // Simulate upgrading an existing request ledger: the first object startup
  // initializes its fixed-size counts from historical rows exactly once.
  f.sql.exec("DROP TABLE request_status_counts");
  const object = f.env.SHOPS.objects.get(f.shop.id);
  object.instance = new ShopStore(object.state, f.env);
  const first = await body(await f.call(f.path + "?limit=2"));
  assert.deepEqual(
    first.requests.map((r) => r.id),
    [ids[3], ids[2]],
  );
  assert.deepEqual(first.counts, {
    all: 4,
    requested: 2,
    accepted: 1,
    fulfilled: 0,
    cancelled: 1,
  });
  assert.ok(first.nextCursor);
  seed(5, 4000); // An incoming request cannot reshuffle older pages.
  f.sql.exec(
    "UPDATE request_status_counts SET count=count+1 WHERE status='requested'",
  );
  const second = await body(
    await f.call(f.path + "?limit=2&cursor=" + first.nextCursor),
  );
  assert.deepEqual(
    second.requests.map((r) => r.id),
    [ids[1], ids[0]],
  );
  assert.equal(second.nextCursor, null);
  const filtered = await body(
    await f.call(f.path + "?status=requested&limit=1"),
  );
  assert.equal(filtered.requests[0].createdAt, 4000);
  assert.ok(filtered.nextCursor);
  await body(
    await f.call(f.path + "?status=accepted&cursor=" + filtered.nextCursor),
    400,
  );
  for (const query of [
    "limit=1.5",
    "limit=NaN",
    "limit=0",
    "limit=51",
    "limit=Infinity",
    "status=paid",
    "cursor=rq_not_opaque",
    "cursor=" + "a".repeat(201),
    "status=requested&status=accepted",
    "unknown=yes",
  ])
    await body(await f.call(f.path + "?" + query), 400);
  await body(await f.call(f.path + "/rq_" + "a".repeat(32)), 404);
});

test("legacy request records hydrate without rewriting, and public retries never expose private merchant notes", async () => {
  const f = await prepared();
  const row = [...f.sql.exec("SELECT data FROM customer_requests")][0];
  const legacy = JSON.parse(row.data);
  for (const key of ["version", "merchantNote", "paymentStatus", "updatedAt"])
    delete legacy[key];
  const before = JSON.stringify(legacy);
  f.sql.exec(
    "UPDATE customer_requests SET data=? WHERE id=?",
    before,
    legacy.id,
  );
  const loaded = (await body(await f.call(f.path + "/" + legacy.id))).request;
  assert.equal(loaded.version, 1);
  assert.equal(loaded.paymentStatus, "unpaid");
  assert.equal(loaded.updatedAt, legacy.createdAt);
  assert.equal(
    [...f.sql.exec("SELECT data FROM customer_requests")][0].data,
    before,
  );
  await body(
    await f.call(f.path + "/" + legacy.id, {
      method: "PATCH",
      body: {
        version: 1,
        status: "accepted",
        merchantNote: "PRIVATE: internal fulfillment discussion",
      },
    }),
  );
  const retried = await body(
    await f.call(f.path, { method: "POST", token: null, body: f.payload }),
    201,
  );
  assert.equal(retried.request.id, legacy.id);
  assert.equal(retried.request.status, "accepted");
  assert.equal(retried.request.merchantNote, undefined);
  assert.equal(retried.request.customer, undefined);
  assert.doesNotMatch(JSON.stringify(retried), /PRIVATE/);
});

test("concurrent owner updates keep one winning revision without changing the shop draft", async () => {
  const f = await prepared();
  const path = f.path + "/" + f.receipt.id;
  const results = await Promise.all([
    f.call(path, {
      method: "PATCH",
      body: { version: 1, status: "accepted", merchantNote: "First tab" },
    }),
    f.call(path, {
      method: "PATCH",
      body: { version: 1, status: "cancelled", merchantNote: "Second tab" },
    }),
  ]);
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);
  const { request } = await body(await f.call(path));
  assert.equal(request.version, 2);
  assert.ok(["accepted", "cancelled"].includes(request.status));
  assert.equal(
    (await body(await f.call(`/api/shops/${f.shop.id}`))).shop.version,
    1,
  );
});

test("publication readiness remains protected owner/admin data and never activates a shop", async () => {
  const f = fixture({ verifyAdmin: async (user) => user.uid === "uid-other" });
  const { shop } = await f.create();
  const path = `/api/shops/${shop.id}/readiness`;
  const report = await body(await f.call(path));
  assert.equal(report.draftVersion, 1);
  assert.equal(report.canPublish, false);
  assert.ok(Array.isArray(report.checks));
  assert.deepEqual(await body(await f.call(path, { token: "other" })), report);
  assert.deepEqual(
    await body(
      await f.call(`/api/admin/shops/${shop.id}/readiness`, { token: "other" }),
    ),
    report,
  );
  await body(await f.call(path, { token: null }), 404);
  await body(
    await f.call(path, { method: "PATCH", body: { canPublish: true } }),
    404,
  );
  const current = (await body(await f.call(`/api/shops/${shop.id}`))).shop;
  assert.equal(current.subscription.status, "inactive");
  assert.equal(current.published, null);
  const outsider = fixture();
  const { shop: privateShop } = await outsider.create();
  await body(
    await outsider.call(`/api/shops/${privateShop.id}/readiness`, {
      token: "other",
    }),
    404,
  );
});

test("reviewed published version prevents stale new requests while keeping lost-response retries idempotent", async () => {
  const f = await prepared();
  const raw = JSON.parse([...f.sql.exec("SELECT data FROM shop")][0].data);
  const draft = {
    ...raw.published.draft,
    products: [{ ...product, priceCents: 4995 }],
  };
  f.sql.exec(
    "UPDATE shop SET data=? WHERE singleton=1",
    JSON.stringify({
      ...raw,
      published: { ...raw.published, version: 2, draft },
    }),
  );
  const send = (patch) =>
    f.call(f.path, {
      method: "POST",
      token: null,
      body: { ...f.payload, ...patch },
    });
  await body(
    await send({ requestKey: crypto.randomUUID(), publishedVersion: 1 }),
    409,
  );
  assert.equal(
    [...f.sql.exec("SELECT COUNT(*) count FROM customer_requests")][0].count,
    1,
  );
  const retry = await body(await send({ publishedVersion: 1 }), 201);
  assert.equal(retry.request.id, f.receipt.id);
  assert.equal(retry.request.totalCents, 3995);
  const current = await body(
    await send({ requestKey: crypto.randomUUID(), publishedVersion: 2 }),
    201,
  );
  assert.equal(current.request.totalCents, 4995);
  for (const version of [0, 1.5, "2", null])
    await body(
      await send({
        requestKey: crypto.randomUUID(),
        publishedVersion: version,
      }),
      400,
    );
});
