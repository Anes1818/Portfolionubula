import test from "node:test";
import assert from "node:assert/strict";
import { fixture, origin } from "./fixtures.mjs";

const settings = {
  SQUARE_ENVIRONMENT: "sandbox",
  SQUARE_SANDBOX_CONNECT_ENABLED: "true",
  SQUARE_SANDBOX_APPLICATION_ID: "sandbox-fixture-id",
  SQUARE_SANDBOX_APPLICATION_SECRET: "fixture-app-secret",
  SQUARE_TOKEN_ENCRYPTION_KEY: "A".repeat(43),
};
async function setup(options = {}) {
  const f = fixture({
    env: { ...settings, ...options },
    verifyIdentity: async (token) => ({
      uid: "uid-" + token,
      email: token + "@example.test",
      authTime: Date.now() / 1000,
    }),
  });
  const { shop } = await f.create();
  const object = f.env.SHOPS.objects.get(shop.id);
  object.state.storage.sql.exec(
    "UPDATE shop SET data=? WHERE singleton=1",
    JSON.stringify({
      ...shop,
      subscription: {
        status: "active",
        paidUntil: Date.now() + 86400000,
        testEnvironment: false,
      },
    }),
  );
  return { ...f, shop, object };
}
async function parsed(response, status = 200) {
  assert.equal(response.status, status, await response.clone().text());
  return response.json();
}
function fakeSquare() {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).origin, "https://connect.squareupsandbox.com");
    const body = options.body ? JSON.parse(options.body) : null;
    calls.push({ url, body });
    if (url.endsWith("/oauth2/token"))
      return Response.json({
        access_token: "fixture-seller-token",
        refresh_token: "fixture-refresh-token",
        merchant_id: "merchant-route-fixture",
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      });
    if (url.endsWith("/v2/locations"))
      return Response.json({
        locations: [
          {
            id: "location-fixture",
            merchant_id: "merchant-route-fixture",
            name: "Shop",
            status: "ACTIVE",
            country: "US",
            currency: "USD",
            capabilities: ["CREDIT_CARD_PROCESSING"],
          },
        ],
      });
    if (url.endsWith("/oauth2/revoke")) return Response.json({ success: true });
    throw Error("Unexpected outbound route in local QA");
  };
  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}
test("Square API uses durable SQLite ownership, header-only cookie, private callback and redacted status", async () => {
  const f = await setup(),
    network = fakeSquare();
  try {
    for (const token of [null, "other"])
      assert.equal(
        (await f.call("/api/shops/" + f.shop.id + "/square/status", { token }))
          .status,
        404,
      );
    const response = await f.call(
      "/api/shops/" + f.shop.id + "/square/connect",
      { method: "POST", body: {} },
    );
    const started = await parsed(response),
      cookie = response.headers.get("Set-Cookie").split(";")[0];
    assert.equal(
      new URL(started.authorizationUrl).searchParams.get("session"),
      "true",
    );
    assert.ok(!JSON.stringify(started).includes(cookie));
    assert.ok(!JSON.stringify(started).includes("fixture-app-secret"));
    const state = new URL(started.authorizationUrl).searchParams.get("state");
    const path =
      "/api/square/callback?" +
      new URLSearchParams({
        state,
        code: "fixture-code",
        response_type: "code",
      });
    const result = await f.call(path, {
      token: null,
      from: null,
      headers: { Cookie: cookie },
    });
    assert.equal(result.status, 303);
    assert.match(result.headers.get("Location"), /square=sandbox_connected$/);
    assert.match(result.headers.get("Set-Cookie"), /Max-Age=0/);
    assert.equal(result.headers.get("Referrer-Policy"), "no-referrer");
    const status = await parsed(
      await f.call("/api/shops/" + f.shop.id + "/square/status"),
    );
    assert.equal(status.connected, true);
    assert.equal(status.checkoutEnabled, false);
    assert.equal(status.locationId, "location-fixture");
    const all = JSON.stringify(status);
    for (const text of [
      "fixture-seller-token",
      "fixture-refresh-token",
      "encryptedTokens",
      "fixture-app-secret",
    ])
      assert.ok(!all.includes(text));
    const stored = JSON.stringify([
      ...f.object.state.storage.sql.exec("SELECT data FROM square_state"),
    ]);
    assert.ok(!stored.includes("fixture-seller-token"));
    assert.ok(!stored.includes("fixture-refresh-token"));
    assert.ok((await f.object.state.storage.getAlarm()) > Date.now());
    const replay = await f.call(path, {
      token: null,
      from: null,
      headers: { Cookie: cookie },
    });
    assert.match(replay.headers.get("Location"), /connection_failed$/);
    assert.equal(
      network.calls.filter((row) => row.url.endsWith("/oauth2/token")).length,
      1,
    );
    const snapshot = f.object.instance.shop();
    f.object.state.storage.sql.exec(
      "UPDATE shop SET data=? WHERE singleton=1",
      JSON.stringify({ ...snapshot, subscription: { status: "expired" } }),
    );
    const disconnected = await parsed(
      await f.call("/api/shops/" + f.shop.id + "/square/disconnect", {
        method: "POST",
        body: {},
      }),
    );
    assert.equal(disconnected.status, "revoked");
    const rows = [
      ...f.object.state.storage.sql.exec("SELECT data FROM square_state"),
    ];
    assert.ok(
      rows.some((row) => JSON.parse(row.data).encryptedTokens === null),
    );
  } finally {
    network.restore();
  }
});
test("Square callbacks clear cookies on failure, trust no redirect and cannot cross merchant claims", async () => {
  const f = await setup(),
    network = fakeSquare();
  try {
    const start = await f.call("/api/shops/" + f.shop.id + "/square/connect", {
        method: "POST",
        body: {},
      }),
      data = await parsed(start),
      state = new URL(data.authorizationUrl).searchParams.get("state");
    const denied = await f.call(
      "/api/square/callback?" +
        new URLSearchParams({ state, code: "fixture-code" }),
      { token: null, from: null },
    );
    assert.equal(denied.status, 303);
    assert.match(denied.headers.get("Location"), /connection_failed$/);
    assert.match(denied.headers.get("Set-Cookie"), /Max-Age=0/);
    assert.equal(network.calls.length, 0);
    const originalCookie = start.headers.get("Set-Cookie").split(";")[0];
    await f.call(
      "/api/square/callback?" +
        new URLSearchParams({ state, code: "fixture-code" }),
      { token: null, from: null, headers: { Cookie: originalCookie } },
    );
    const other = (await f.create("Second shop", "second-shop", "other")).shop,
      object = f.env.SHOPS.objects.get(other.id);
    object.state.storage.sql.exec(
      "UPDATE shop SET data=? WHERE singleton=1",
      JSON.stringify({
        ...other,
        subscription: {
          status: "active",
          paidUntil: Date.now() + 86400000,
          testEnvironment: false,
        },
      }),
    );
    const second = await f.call("/api/shops/" + other.id + "/square/connect", {
        method: "POST",
        body: {},
        token: "other",
      }),
      secondData = await parsed(second);
    const rejected = await f.call(
      "/api/square/callback?" +
        new URLSearchParams({
          state: new URL(secondData.authorizationUrl).searchParams.get("state"),
          code: "other-code",
        }),
      {
        token: null,
        from: null,
        headers: { Cookie: second.headers.get("Set-Cookie").split(";")[0] },
      },
    );
    assert.match(rejected.headers.get("Location"), /connection_failed$/);
    assert.equal(
      (
        await parsed(
          await f.call("/api/shops/" + other.id + "/square/status", {
            token: "other",
          }),
        )
      ).connected,
      false,
    );
    const registry = f.env.REGISTRY.objects.values().next().value.state
      .storage.sql;
    assert.equal(
      [...registry.exec("SELECT * FROM square_merchants")].length,
      1,
    );
    assert.equal(
      (
        await f.call("/api/shops/" + f.shop.id + "/square/connect", {
          method: "POST",
          body: { actor: { uid: "forged" } },
        })
      ).status,
      400,
    );
  } finally {
    network.restore();
  }
});
test("Square stays closed with absent configuration and never exposes server configuration", async () => {
  const f = await setup({ SQUARE_SANDBOX_CONNECT_ENABLED: "false" }),
    network = fakeSquare();
  try {
    const config = await parsed(await f.call("/api/config", { token: null }));
    assert.equal(config.squareConnectionEnabled, false);
    assert.equal(config.SQUARE_TOKEN_ENCRYPTION_KEY, undefined);
    assert.equal(
      (
        await f.call("/api/shops/" + f.shop.id + "/square/connect", {
          method: "POST",
          body: {},
        })
      ).status,
      503,
    );
    const callback = await f.call("/api/square/callback?state=invalid", {
      token: null,
      from: null,
    });
    assert.equal(callback.status, 303);
    assert.match(callback.headers.get("Location"), /connection_failed$/);
    assert.equal(network.calls.length, 0);
  } finally {
    network.restore();
  }
});
