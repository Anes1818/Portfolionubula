/* Actual workerd + SQLite Durable Objects, with all Square calls intercepted. */
const {
    Miniflare,
    Response: MFResponse,
    convertV4MiniflareOptions,
  } = require("node:module").createRequire(
    require("node:path").resolve(
      __dirname,
      "../../cloudflare/rays-payments/package.json",
    ),
  )("miniflare"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
(async () => {
  const { fixture, policy } = await import(
      "../../cloudflare/rays-payments/test/fixtures.mjs"
    ),
    f = await fixture(Date.now()),
    base = path.resolve(__dirname, "../../.private/qa/raysbouquetz"),
    persist = fs.mkdtempSync(path.join(base, "durable-")),
    bindings = { ...f.env, ALLOWED_SHOPS: "raysbouquetz,other-shop" };
  delete bindings.COMMERCE;
  const options = {
    name: "payment-test",
    modules: true,
    scriptPath: path.join(base, "worker-bundle/worker.js"),
    compatibilityDate: "2026-10-01",
    compatibilityFlags: ["nodejs_compat"],
    durableObjects: {
      COMMERCE: { className: "CommerceObject", useSQLite: true },
    },
    durableObjectsPersist: persist,
    bindings,
    outboundService: async (request) => {
      const r = await f.square.fetchImpl(request.url, {
        method: request.method,
        headers: Object.fromEntries(request.headers),
        body: ["POST", "PUT"].includes(request.method)
          ? await request.text()
          : undefined,
      });
      return new MFResponse(await r.text(), {
        status: r.status,
        headers: r.headers,
      });
    },
  };
  const runtimeOptions = convertV4MiniflareOptions
    ? await convertV4MiniflareOptions(options)
    : options;
  if (convertV4MiniflareOptions)
    runtimeOptions.resourcePersistencePath = persist;
  let mf = new Miniflare(runtimeOptions);
  try {
    await mf.ready;
    let ns = await mf.getDurableObjectNamespace("COMMERCE"),
      stub = ns.get(ns.idFromName("sandbox:shop:raysbouquetz"));
    async function internal(action, body = {}, extra = {}) {
      const response = await stub.fetch("https://internal/shop", {
          method: "POST",
          body: JSON.stringify({
            shop: "raysbouquetz",
            action,
            body,
            actor: {
              uid: "platform-owner",
              email: "owner@example.test",
              authTime: Date.now() / 1000,
            },
            ...extra,
          }),
        }),
        data = await response.json();
      assert.equal(response.status, 200, JSON.stringify(data));
      return data;
    }
    await internal("settings", {
      version: 1,
      policy: policy(f.clock.now),
      checkoutEnabled: true,
      cashPaymentsApproved: true,
    });
    const start = await internal("oauth"),
      state = new URL(start.url).searchParams.get("state").split(".")[1];
    await internal("callback", {
      state,
      nonce: start.browserNonce,
      code: "local-code",
    });
    const req = { ...f.request, policyVersion: 2 },
      request = (route, body, key) =>
        mf.dispatchFetch(
          "https://test-worker.example/v1/shops/raysbouquetz/" + route,
          {
            method: body ? "POST" : "GET",
            headers: {
              Origin: "https://nebulastudio.site",
              "CF-Connecting-IP": "127.0.0.1",
              ...(body ? { "Content-Type": "application/json" } : {}),
              ...(key ? { "X-Order-Key": key } : {}),
            },
            ...(body ? { body: JSON.stringify(body) } : {}),
          },
        );
    let response = await request("quotes", req),
      q = await response.json();
    assert.equal(response.status, 200, JSON.stringify(q));
    assert.equal(q.totalCents, 800);
    const results = await Promise.all([
      request(
        "orders/" + q.id + "/checkout",
        { revision: 1, choice: "deposit" },
        req.requestKey,
      ),
      request(
        "orders/" + q.id + "/checkout",
        { revision: 1, choice: "deposit" },
        req.requestKey,
      ),
    ]);
    for (const r of results) assert.equal(r.status, 200, await r.text());
    assert.equal(
      f.square.keys.size,
      1,
      "Concurrent clicks create one Square checkout",
    );
    f.square.pay([...f.square.orders.keys()][0]);
    response = await request("orders/" + q.id, undefined, req.requestKey);
    q = await response.json();
    assert.equal(q.paidCents, 400);
    await mf.dispose();
    mf = new Miniflare(runtimeOptions);
    await mf.ready;
    response = await request("orders/" + q.id, undefined, req.requestKey);
    const restored = await response.json();
    assert.equal(response.status, 200, JSON.stringify(restored));
    assert.equal(
      restored.paidCents,
      400,
      "Payment ledger survives a real runtime restart",
    );
    assert.equal(restored.balanceCents, 400);
    response = await mf.dispatchFetch(
      "https://test-worker.example/v1/shops/other-shop/orders/" + q.id,
      { headers: { "X-Order-Key": req.requestKey } },
    );
    assert.equal(response.status, 404, "Another shop cannot read the order");
    console.log(
      "PASS real workerd/SQLite storage, OAuth connection flow, public quote/checkout/status APIs, concurrent idempotency, payment verification, restart persistence and shop isolation. Square calls were local mocks.",
    );
  } finally {
    await mf.dispose();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
