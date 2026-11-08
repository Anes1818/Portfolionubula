import test from "node:test";
import assert from "node:assert/strict";
import { createSquareConnectionService } from "../square-connection.mjs";
import { HttpError, encrypt, decrypt } from "../../rays-payments/security.mjs";

const NOW = Date.parse("2026-10-28T15:00:00Z");
const SHOP = "sh_" + "a".repeat(32),
  OTHER_SHOP = "sh_" + "b".repeat(32);
const OWNER = "owner-fixture",
  KEY = "A".repeat(43);
const defaults = {
  environment: "sandbox",
  enabled: true,
  shopId: SHOP,
  applicationId: "sandbox-app-fixture",
  applicationSecret: "fixture-secret-not-real",
  encryptionKey: KEY,
  callbackUrl: "https://app.nebulastudio.site/api/square/callback",
};
const response = (body, status = 200) => Response.json(body, { status });

function fixture({
  config = {},
  registryMap = new Map(),
  respond,
  repository: providedRepository,
} = {}) {
  let time = NOW;
  const context = {
    shopId: config.shopId || SHOP,
    ownerUid: OWNER,
    country: "CA",
    currency: "CAD",
    subscription: { status: "active", paidUntil: NOW + 365 * 86400000 },
  };
  const map = new Map();
  let queue = Promise.resolve();
  const repository = providedRepository || {
    get: async (key) => structuredClone(map.get(key)),
    put: async (key, value) => map.set(key, structuredClone(value)),
    delete: async (key) => map.delete(key),
    withLock(callback) {
      const run = queue.then(callback);
      queue = run.catch(() => {});
      return run;
    },
  };
  const claims = [];
  const registry = {
    claim: async (value) => {
      const key = value.environment + ":" + value.merchantId,
        old = registryMap.get(key);
      if (
        old &&
        (old.shopId !== value.shopId || old.ownerUid !== value.ownerUid)
      )
        throw new HttpError(
          409,
          "Square merchant is already connected to another shop.",
        );
      registryMap.set(key, structuredClone(value));
      claims.push(value);
    },
  };
  const calls = [];
  const providerTokens = () => ({
    access_token: "fixture-access-token",
    refresh_token: "fixture-refresh-token",
    merchant_id: "merchant-fixture",
    expires_at: new Date(time + 30 * 86400000).toISOString(),
  });
  const providerLocations = () => ({
    locations: [
      {
        id: "location-fixture",
        name: "Toronto",
        country: context.country,
        currency: context.currency,
        merchant_id: "merchant-fixture",
        status: "ACTIVE",
        capabilities: ["CREDIT_CARD_PROCESSING"],
      },
    ],
  });
  const fetchImpl = async (url, options) => {
    const call = {
      url,
      options,
      body: options.body ? JSON.parse(options.body) : null,
    };
    calls.push(call);
    const body = url.endsWith("/oauth2/token")
      ? providerTokens()
      : url.endsWith("/v2/locations")
        ? providerLocations()
        : url.endsWith("/oauth2/revoke")
          ? { success: true }
          : null;
    assert.ok(body, "Only approved fake provider routes may be requested");
    return respond ? respond(call, body) : response(body);
  };
  const service = createSquareConnectionService(
    { ...defaults, ...config },
    {
      repository,
      registry,
      getContext: async () => structuredClone(context),
      fetchImpl,
      now: () => time,
      timeoutMs: 30,
    },
  );
  const actor = (overrides = {}) => ({
    uid: OWNER,
    authTime: time / 1000,
    ...overrides,
  });
  const connection = () =>
    [...map.entries()].find(([key]) => key.endsWith(":connection"))?.[1];
  async function begin() {
    const start = await service.start(actor());
    return {
      start,
      state: new URL(start.authorizationUrl).searchParams.get("state"),
      cookieHeader: start.setCookie.split(";")[0],
    };
  }
  const finish = async (details) =>
    service.callback({ ...details, code: "fixture-code" });
  const connect = async () => finish(await begin());
  return {
    service,
    context,
    calls,
    map,
    registryMap,
    claims,
    repository,
    actor,
    connection,
    begin,
    finish,
    connect,
    advance: (ms) => {
      time += ms;
    },
    time: () => time,
  };
}

test("Square sandbox foundation fails closed on disabled, missing, unknown or production configuration", async () => {
  for (const config of [
    { enabled: false },
    { applicationSecret: undefined },
    { encryptionKey: "short" },
    { callbackUrl: "https://evil.test/path?redirect=1" },
    { environment: "production" },
  ]) {
    const f = fixture({ config });
    assert.equal((await f.service.status(f.actor())).available, false);
    await assert.rejects(f.service.start(f.actor()), (e) => e.status === 503);
    assert.equal(f.calls.length, 0);
    assert.equal(f.map.size, 0);
  }
  assert.throws(
    () => fixture({ config: { environment: "private-beta" } }),
    /explicit Square environment/,
  );
  assert.throws(
    () => fixture({ config: { unexpected: "client-value" } }),
    /Invalid Square server configuration/,
  );
});

test("explicit approved production configuration uses isolated cookies, tokens and provider host", async () => {
  const f = fixture({
    config: { environment: "production", liveApproved: true },
  });
  const begin = await f.begin();
  assert.equal(
    new URL(begin.start.authorizationUrl).origin,
    "https://connect.squareup.com",
  );
  assert.equal(
    new URL(begin.start.authorizationUrl).searchParams.get("session"),
    "false",
  );
  assert.match(begin.cookieHeader, /^__Host-nebula-square-production=/);
  await f.finish(begin);
  assert.ok(
    f.calls.every((call) =>
      call.url.startsWith("https://connect.squareup.com/"),
    ),
  );
  assert.ok(
    [...f.map.keys()].every((key) => key.startsWith("square:production:")),
  );
  assert.equal((await f.service.serverCredentials()).environment, "production");
});

test("owner identity, recent sign-in, paid plan and supported market gate OAuth before storage or provider access", async () => {
  const f = fixture();
  await assert.rejects(
    f.service.start(f.actor({ uid: "other" })),
    (e) => e.status === 404,
  );
  await assert.rejects(
    f.service.start(f.actor({ authTime: NOW / 1000 - 601 })),
    (e) => e.status === 401,
  );
  await assert.rejects(
    f.service.start(f.actor({ authTime: NOW / 1000 + 60 })),
    (e) => e.status === 401,
  );
  f.context.subscription.status = "inactive";
  await assert.rejects(f.service.start(f.actor()), (e) => e.status === 409);
  f.context.subscription.status = "active";
  f.context.subscription.paidUntil = NOW;
  await assert.rejects(f.service.start(f.actor()), (e) => e.status === 409);
  f.context.subscription.paidUntil = NOW + 86400000;
  f.context.country = "DZ";
  await assert.rejects(f.service.start(f.actor()), (e) => e.status === 409);
  assert.equal(f.map.size, 0);
  assert.equal(f.calls.length, 0);
});

test("OAuth uses the exact sandbox origin, fixed scopes, secure browser cookie and hashed single current state", async () => {
  const f = fixture(),
    first = await f.begin(),
    url = new URL(first.start.authorizationUrl);
  assert.equal(url.origin, "https://app.squareupsandbox.com");
  assert.equal(url.pathname, "/oauth2/authorize");
  assert.equal(url.searchParams.get("redirect_uri"), defaults.callbackUrl);
  assert.equal(url.searchParams.get("client_id"), defaults.applicationId);
  assert.equal(url.searchParams.get("session"), "true");
  assert.equal(
    url.searchParams.get("scope"),
    "MERCHANT_PROFILE_READ ORDERS_READ ORDERS_WRITE PAYMENTS_READ PAYMENTS_WRITE",
  );
  assert.match(
    first.start.setCookie,
    /HttpOnly; Secure; SameSite=Lax; Path=\/; Max-Age=600/,
  );
  const stored = JSON.stringify([...f.map.values()]);
  assert.ok(!stored.includes(first.state));
  assert.ok(!stored.includes(first.cookieHeader));
  assert.ok(!stored.includes(defaults.applicationSecret));
  await f.begin();
  assert.equal(f.map.size, 1);
  await assert.rejects(f.finish(first), (e) => e.status === 403);
  assert.equal(f.calls.length, 0);
});

test("callback rejects wrong state/browser/expiry and consumes denied authorization without exchanging a token", async () => {
  const f = fixture(),
    details = await f.begin();
  await assert.rejects(
    f.service.callback({ ...details, state: "wrong", code: "fixture-code" }),
    (e) => e.status === 403,
  );
  await assert.rejects(
    f.service.callback({ ...details, cookieHeader: "", code: "fixture-code" }),
    (e) => e.status === 403,
  );
  await assert.rejects(
    f.service.callback({
      ...details,
      cookieHeader: details.cookieHeader.slice(0, -1) + "x",
      code: "fixture-code",
    }),
    (e) => e.status === 403,
  );
  await assert.rejects(
    f.service.callback({ ...details, error: "access_denied" }),
    (e) => e.status === 400,
  );
  await assert.rejects(f.finish(details), (e) => e.status === 403);
  assert.equal(f.calls.length, 0);
  const expired = await f.begin();
  f.advance(600001);
  await assert.rejects(f.finish(expired), (e) => e.status === 403);
  assert.equal(f.calls.length, 0);
});

test("successful CAD, USD, GBP, EUR, and AUD callbacks encrypt tenant-bound tokens and return no server credentials", async () => {
  for (const [country, currency] of [
    ["CA", "CAD"],
    ["US", "USD"],
    ["GB", "GBP"],
    ["IE", "EUR"],
    ["AU", "AUD"],
  ]) {
    const f = fixture({
      respond: (call, body) =>
        response(
          call.url.endsWith("/v2/locations")
            ? {
                locations: body.locations.map((row) => ({
                  ...row,
                  country,
                  currency,
                })),
              }
            : body,
        ),
    });
    f.context.country = country;
    f.context.currency = currency;
    const result = await f.connect(),
      record = f.connection();
    assert.equal(result.connected, true);
    assert.equal(result.checkoutEnabled, false);
    assert.equal(result.locationId, "location-fixture");
    assert.match(result.clearCookie, /Max-Age=0/);
    const serialized = JSON.stringify(result);
    for (const field of [
      "access-token",
      "refresh-token",
      defaults.applicationSecret,
      "encryptedTokens",
    ])
      assert.ok(!serialized.includes(field));
    assert.equal(record.environment, "sandbox");
    assert.equal(record.ownerUid, OWNER);
    assert.ok(record.encryptedTokens.iv);
    assert.ok(!JSON.stringify(record).includes("fixture-access-token"));
    const tokens = await decrypt(
      record.encryptedTokens,
      KEY,
      "nebula-square-v1:sandbox:" + SHOP,
    );
    assert.equal(tokens.access_token, "fixture-access-token");
    await assert.rejects(
      decrypt(
        record.encryptedTokens,
        KEY,
        "nebula-square-v1:sandbox:" + OTHER_SHOP,
      ),
    );
    await assert.rejects(
      decrypt(
        record.encryptedTokens,
        KEY,
        "nebula-square-v1:production:" + SHOP,
      ),
    );
    assert.equal(f.claims.length, 1);
    assert.equal(f.calls[0].body.client_secret, defaults.applicationSecret);
    assert.equal(f.calls[0].options.redirect, "manual");
    await assert.rejects(f.service.start(f.actor()), (e) => e.status === 409);
  }
});

test("callback replay/concurrent attempts exchange the code only once and bind the current owner/market", async () => {
  const f = fixture(),
    details = await f.begin();
  const outcomes = await Promise.allSettled([
    f.finish(details),
    f.finish(details),
  ]);
  assert.equal(outcomes.filter((row) => row.status === "fulfilled").length, 1);
  assert.equal(
    f.calls.filter((row) => row.url.endsWith("/oauth2/token")).length,
    1,
  );
  const changed = fixture(),
    pending = await changed.begin();
  changed.context.currency = "USD";
  changed.context.country = "US";
  await assert.rejects(changed.finish(pending), (e) => e.status === 409);
  assert.equal(changed.calls.length, 0);
  const expiredPlan = fixture(),
    attempt = await expiredPlan.begin();
  expiredPlan.context.subscription.paidUntil = NOW;
  await assert.rejects(expiredPlan.finish(attempt), (e) => e.status === 409);
  assert.equal(expiredPlan.calls.length, 0);
});

test("merchant registry collisions and foreign/inactive/non-card locations cannot establish another tenant connection", async () => {
  const registryMap = new Map(),
    a = fixture({ registryMap });
  await a.connect();
  const b = fixture({ registryMap, config: { shopId: OTHER_SHOP } });
  await assert.rejects(b.connect(), (e) => e.status === 409);
  assert.equal(b.connection(), undefined);
  assert.equal(registryMap.get("sandbox:merchant-fixture").shopId, SHOP);
  for (const override of [
    { country: "US" },
    { currency: "USD" },
    { merchant_id: "foreign" },
    { status: "INACTIVE" },
    { capabilities: [] },
  ]) {
    const f = fixture({
      respond: (call, body) =>
        response(
          call.url.endsWith("/v2/locations")
            ? {
                locations: body.locations.map((row) => ({
                  ...row,
                  ...override,
                })),
              }
            : body,
        ),
    });
    await assert.rejects(f.connect(), (e) => e.status === 409);
    assert.equal(f.connection(), undefined);
    assert.equal(f.claims.length, 0);
  }
});

test("multiple eligible locations require explicit selection and cannot choose an unrelated ID", async () => {
  const f = fixture({
    respond: (call, body) =>
      response(
        call.url.endsWith("/v2/locations")
          ? {
              locations: [
                ...body.locations,
                { ...body.locations[0], id: "location-two", name: "Second" },
              ],
            }
          : body,
      ),
  });
  assert.equal((await f.connect()).locationId, null);
  await assert.rejects(f.service.serverCredentials(), (e) => e.status === 409);
  await assert.rejects(
    f.service.chooseLocation(f.actor(), "not-offered"),
    (e) => e.status === 409,
  );
  assert.equal(
    (await f.service.chooseLocation(f.actor(), "location-two")).locationId,
    "location-two",
  );
  const credentials = await f.service.serverCredentials();
  assert.equal(credentials.accessToken, "fixture-access-token");
  assert.equal(credentials.shopId, SHOP);
  assert.equal(credentials.currency, "CAD");
});

test("maintenance refresh renews after six days and can recover an expired access token without a paid-plan gate", async () => {
  const f = fixture();
  await f.connect();
  const original = f.connection().encryptedTokens;
  f.advance(7 * 86400000);
  f.context.subscription.status = "inactive";
  const refreshed = await f.service.refreshConnection();
  assert.equal(refreshed.connected, true);
  assert.equal(
    f.calls.filter((row) => row.body?.grant_type === "refresh_token").length,
    1,
  );
  assert.notDeepEqual(f.connection().encryptedTokens, original);
  f.advance(31 * 86400000);
  assert.equal((await f.service.status(f.actor())).status, "expired");
  await f.service.refreshConnection();
  assert.equal((await f.service.status(f.actor())).status, "connected");
  await assert.rejects(
    f.service.chooseLocation(f.actor(), "location-fixture"),
    (e) => e.status === 409,
  );
});

test("auth failures mark reconnect required; public status includes no encrypted or plaintext token state", async () => {
  let unauthorized = false;
  const f = fixture({
    respond: (call, body) =>
      unauthorized && call.url.endsWith("/v2/locations")
        ? response({ errors: [{ detail: "secret provider body" }] }, 401)
        : response(body),
  });
  await f.connect();
  unauthorized = true;
  await assert.rejects(
    f.service.status(f.actor(), { verify: true }),
    (e) => e.status === 409 && !e.message.includes("secret provider body"),
  );
  const status = await f.service.status(f.actor());
  assert.equal(status.status, "reconnect_required");
  assert.equal(status.connected, false);
  assert.equal(status.encryptedTokens, undefined);
  assert.equal(status.accessToken, undefined);
});

test("refresh mismatch, malformed token, overlarge body, redirects and timeouts never expose provider secrets or activate a connection", async () => {
  for (const respond of [
    (call, body) =>
      response(
        call.url.endsWith("/oauth2/token")
          ? { ...body, refresh_token: null }
          : body,
      ),
    () =>
      new Response("x".repeat(70000), {
        headers: { "Content-Type": "application/json" },
      }),
    () =>
      new Response(null, {
        status: 302,
        headers: { Location: "https://evil.test" },
      }),
    () => {
      throw Error(defaults.applicationSecret);
    },
    () => new Promise(() => {}),
  ]) {
    const f = fixture({ respond });
    await assert.rejects(
      f.connect(),
      (e) =>
        e.status === 503 && !e.message.includes(defaults.applicationSecret),
    );
    assert.equal(f.connection(), undefined);
  }
  let mismatch = false;
  const f = fixture({
    respond: (call, body) =>
      response(
        mismatch && call.body?.grant_type === "refresh_token"
          ? { ...body, merchant_id: "other-merchant" }
          : body,
      ),
  });
  await f.connect();
  f.advance(7 * 86400000);
  mismatch = true;
  await assert.rejects(f.service.refreshConnection(), (e) => e.status === 503);
  assert.equal(f.connection().merchantId, "merchant-fixture");
});

test("transport failures identify only the fixed stage and never leak provider exceptions", async () => {
  for (const path of ["/oauth2/token", "/v2/locations"]) {
    const f = fixture({
      respond: (call, body) => {
        if (call.url.endsWith(path))
          throw Error(
            "sensitive-provider-detail:" + defaults.applicationSecret,
          );
        return response(body);
      },
    });
    await assert.rejects(f.connect(), (error) => {
      assert.equal(error.status, 503);
      assert.match(
        error.message,
        path === "/oauth2/token"
          ? /authorization code exchange/
          : /seller location verification/,
      );
      assert.ok(!error.message.includes("sensitive-provider-detail"));
      assert.ok(!error.message.includes(defaults.applicationSecret));
      return true;
    });
    assert.equal(f.connection(), undefined);
  }
  const f = fixture({ respond: () => new Promise(() => {}) });
  await assert.rejects(
    f.connect(),
    /Square timed out during authorization code exchange/,
  );
  assert.equal(f.connection(), undefined);
});

test("copied/corrupt connection rows cannot provide cross-tenant credentials", async () => {
  const a = fixture();
  await a.connect();
  const b = fixture({ config: { shopId: OTHER_SHOP } });
  b.map.set("square:sandbox:" + OTHER_SHOP + ":connection", {
    ...a.connection(),
    shopId: OTHER_SHOP,
  });
  await assert.rejects(b.service.serverCredentials(), (e) => e.status === 503);
  assert.equal(b.calls.length, 0);
  a.map.set("square:sandbox:" + SHOP + ":connection", {
    ...a.connection(),
    ownerUid: "wrong",
  });
  await assert.rejects(a.service.status(a.actor()), (e) => e.status === 503);
});

test("disconnect remains available after plan expiry; pending/failed revocation cannot look connected or lose retry tokens", async () => {
  let refuse = true;
  const f = fixture({
    respond: (call, body) =>
      call.url.endsWith("/oauth2/revoke") && refuse
        ? response({ success: false })
        : response(body),
  });
  await f.connect();
  f.context.subscription.status = "inactive";
  await assert.rejects(
    f.service.disconnect(f.actor()),
    (e) => e.status === 503,
  );
  assert.equal(
    (await f.service.status(f.actor())).status,
    "disconnect_pending",
  );
  assert.ok(f.connection().encryptedTokens);
  await assert.rejects(f.service.serverCredentials(), (e) => e.status === 409);
  refuse = false;
  const done = await f.service.disconnect(f.actor());
  assert.equal(done.status, "revoked");
  assert.equal(done.connected, false);
  assert.equal(f.connection().encryptedTokens, null);
  const revoke = f.calls.find((row) => row.url.endsWith("/oauth2/revoke"));
  assert.equal(
    revoke.options.headers.Authorization,
    "Client " + defaults.applicationSecret,
  );
  assert.equal(revoke.body.client_id, defaults.applicationId);
  assert.equal((await f.service.disconnect(f.actor())).status, "revoked");
  assert.equal((await f.service.refreshConnection()).status, "revoked");
});
