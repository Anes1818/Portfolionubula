/* Server-only Square connection lifecycle. Checkout is a separate service.
 * Production requires explicit server launch approval and separate credentials.
 */
import {
  HttpError,
  requireValue,
  randomToken,
  hash,
  encrypt,
  decrypt,
  unb64,
} from "../rays-payments/security.mjs";

const VERSION = "2026-09-16";
const SCOPES = Object.freeze([
  "MERCHANT_PROFILE_READ",
  "ORDERS_READ",
  "ORDERS_WRITE",
  "PAYMENTS_READ",
  "PAYMENTS_WRITE",
]);
const TEN_MINUTES = 10 * 60000,
  SIX_DAYS = 6 * 86400000;
const tokenString = (value) =>
  typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
const identifier = (value) =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,191}$/.test(value);
const plain = (value) =>
  !!value && typeof value === "object" && !Array.isArray(value);
const clone = (value) => (value == null ? value : structuredClone(value));
const fail = (message, status = 503) => new HttpError(status, message);
const providerFailure = () =>
  fail(
    "Square is temporarily unavailable. No connection change was confirmed.",
  );

function safeCallback(value) {
  try {
    const url = new URL(value);
    return (
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname !== "/" &&
      (url.protocol === "https:" ||
        (url.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(url.hostname)))
    );
  } catch {
    return false;
  }
}

/**
 * Dependencies are server-only. repository.withLock must serialize every async
 * callback, including network calls, within this environment/shop partition.
 * registry.claim must atomically enforce environment/merchant -> shop ownership.
 * getContext must load current trusted identity, subscription and market data.
 */
export function createSquareConnectionService(
  config,
  {
    repository,
    registry,
    getContext,
    fetchImpl = fetch,
    now = () => Date.now(),
    timeoutMs = 8000,
  } = {},
) {
  requireValue(
    plain(config) &&
      Object.keys(config).every((key) =>
        [
          "environment",
          "enabled",
          "shopId",
          "applicationId",
          "applicationSecret",
          "encryptionKey",
          "callbackUrl",
          "liveApproved",
        ].includes(key),
      ),
    "Invalid Square server configuration.",
    503,
  );
  requireValue(
    ["sandbox", "production"].includes(config.environment),
    "An explicit Square environment is required.",
    503,
  );
  requireValue(
    /^sh_[a-f0-9]{32}$/.test(config.shopId || ""),
    "A trusted shop ID is required.",
    503,
  );
  requireValue(
    config.enabled === undefined || typeof config.enabled === "boolean",
    "Invalid Square connection flag.",
    503,
  );
  requireValue(
    repository &&
      ["get", "put", "delete", "withLock"].every(
        (key) => typeof repository[key] === "function",
      ) &&
      typeof registry?.claim === "function" &&
      typeof getContext === "function",
    "Square requires durable server persistence and merchant ownership.",
    503,
  );
  requireValue(
    Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 15000,
    "Invalid Square request timeout.",
    503,
  );
  const c = Object.freeze({ ...config });
  const prefix = `square:${c.environment}:${c.shopId}:`;
  const aad = `nebula-square-v1:${c.environment}:${c.shopId}`;
  const read = (key) => repository.get(prefix + key);
  const put = (key, value) => repository.put(prefix + key, clone(value));
  const remove = (key) => repository.delete(prefix + key);
  const locked = (operation) => repository.withLock(operation);
  const supported = c.environment === "sandbox" || c.liveApproved === true;
  const API =
    c.environment === "production"
      ? "https://connect.squareup.com"
      : "https://connect.squareupsandbox.com";
  const COOKIE = "__Host-nebula-square-" + c.environment;
  const configured = () => {
    try {
      return (
        supported &&
        identifier(c.applicationId) &&
        typeof c.applicationSecret === "string" &&
        c.applicationSecret.length >= 2 &&
        c.applicationSecret.length <= 1024 &&
        unb64(c.encryptionKey).byteLength === 32 &&
        safeCallback(c.callbackUrl)
      );
    } catch {
      return false;
    }
  };
  const assertConfigured = (enabled = true) =>
    requireValue(
      configured() && (!enabled || c.enabled === true),
      "Square sandbox connection setup is pending. No connection was created.",
      503,
    );

  async function context() {
    const ctx = await getContext();
    requireValue(
      plain(ctx) &&
        ctx.shopId === c.shopId &&
        typeof ctx.ownerUid === "string" &&
        ctx.ownerUid.length > 0 &&
        ctx.ownerUid.length <= 128,
      "Shop not found.",
      404,
    );
    requireValue(
      (ctx.country === "CA" && ctx.currency === "CAD") ||
        (ctx.country === "US" && ctx.currency === "USD"),
      "Square requires an approved Canadian CAD or US USD shop market.",
      409,
    );
    return ctx;
  }
  function owner(actor, ctx, recent = false) {
    requireValue(actor?.uid === ctx.ownerUid, "Shop not found.", 404);
    if (recent)
      requireValue(
        Number.isFinite(actor.authTime) &&
          actor.authTime <= now() / 1000 + 30 &&
          now() / 1000 - actor.authTime < 600,
        "Sign in again before changing the Square connection.",
        401,
      );
  }
  function paid(ctx) {
    requireValue(
      ctx.subscription?.status === "active" &&
        Number.isFinite(ctx.subscription.paidUntil) &&
        ctx.subscription.paidUntil > now(),
      "An active paid plan is required before connecting Square.",
      409,
    );
  }
  function checkConnection(record, ctx) {
    requireValue(
      record &&
        record.environment === c.environment &&
        record.shopId === c.shopId &&
        record.ownerUid === ctx.ownerUid &&
        record.applicationId === c.applicationId &&
        identifier(record.merchantId),
      "The Square connection needs attention.",
      503,
    );
    return record;
  }
  async function tokens(record, ctx) {
    checkConnection(record, ctx);
    try {
      const value = await decrypt(record.encryptedTokens, c.encryptionKey, aad);
      requireValue(
        validTokens(value, false) && value.merchant_id === record.merchantId,
        "Invalid encrypted connection.",
        503,
      );
      return value;
    } catch {
      throw fail("The Square connection needs attention.");
    }
  }
  function validTokens(value, future = true) {
    return (
      plain(value) &&
      typeof value.access_token === "string" &&
      value.access_token.length >= 2 &&
      value.access_token.length <= 2048 &&
      typeof value.refresh_token === "string" &&
      value.refresh_token.length >= 2 &&
      value.refresh_token.length <= 2048 &&
      identifier(value.merchant_id) &&
      typeof value.expires_at === "string" &&
      Number.isFinite(Date.parse(value.expires_at)) &&
      (!future || Date.parse(value.expires_at) > now()) &&
      Date.parse(value.expires_at) <= now() + 40 * 86400000
    );
  }
  async function api(
    path,
    { method = "GET", body, token, revoke = false } = {},
  ) {
    const controller = new AbortController();
    let timer;
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(providerFailure());
      }, timeoutMs);
    });
    const work = (async () => {
      let response;
      try {
        response = await fetchImpl(API + path, {
          method,
          redirect: "error",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "Square-Version": VERSION,
            ...(revoke
              ? { Authorization: "Client " + c.applicationSecret }
              : token
                ? { Authorization: "Bearer " + token }
                : {}),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
      } catch {
        throw providerFailure();
      }
      if (response.status === 401 || response.status === 403) {
        const error = fail(
          "Square needs reconnecting. No payment was confirmed.",
          409,
        );
        error.squareAuth = true;
        throw error;
      }
      requireValue(
        response.ok,
        "Square could not complete the connection request.",
        503,
      );
      requireValue(
        /application\/json/i.test(response.headers.get("Content-Type") || ""),
        "Square returned an invalid response.",
        503,
      );
      const reader = response.body?.getReader();
      requireValue(reader, "Square returned an invalid response.", 503);
      const parts = [];
      let length = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > 64 * 1024) {
          await reader.cancel();
          throw fail("Square returned an invalid response.");
        }
        parts.push(value);
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const part of parts) {
        bytes.set(part, offset);
        offset += part.length;
      }
      try {
        const result = JSON.parse(new TextDecoder().decode(bytes));
        requireValue(
          plain(result),
          "Square returned an invalid response.",
          503,
        );
        return result;
      } catch {
        throw fail("Square returned an invalid response.");
      }
    })();
    try {
      return await Promise.race([work, deadline]);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw providerFailure();
    } finally {
      clearTimeout(timer);
    }
  }
  async function locations(accessToken, merchantId, ctx) {
    const data = await api("/v2/locations", { token: accessToken });
    requireValue(
      Array.isArray(data.locations) && data.locations.length <= 200,
      "Square returned invalid location information.",
      503,
    );
    return data.locations
      .filter(
        (row) =>
          plain(row) &&
          identifier(row.id) &&
          row.status === "ACTIVE" &&
          row.country === ctx.country &&
          row.currency === ctx.currency &&
          row.merchant_id === merchantId &&
          Array.isArray(row.capabilities) &&
          row.capabilities.includes("CREDIT_CARD_PROCESSING"),
      )
      .map((row) => ({
        id: row.id,
        name: typeof row.name === "string" ? row.name.slice(0, 100) : row.id,
        country: row.country,
        currency: row.currency,
      }));
  }
  function publicStatus(record) {
    const available = configured() && c.enabled === true;
    let status = record?.status || "not_connected";
    if (status === "connected" && record.expiresAt <= now()) status = "expired";
    return {
      environment: c.environment,
      available,
      canManage: configured(),
      status: configured() ? status : "provider_setup_pending",
      connected: available && status === "connected",
      checkoutEnabled: false,
      locationId: record?.locationId || null,
      locations: clone(record?.locations || []),
      merchantId: record?.merchantId || null,
      connectedAt: record?.connectedAt || null,
      refreshedAt: record?.refreshedAt || null,
      verifiedAt: record?.verifiedAt || null,
      expiresAt: record?.expiresAt || null,
    };
  }
  async function refreshRecord(
    record,
    ctx,
    { force = false, verify = false } = {},
  ) {
    checkConnection(record, ctx);
    requireValue(
      record.status === "connected",
      "Square needs reconnecting.",
      409,
    );
    let value = await tokens(record, ctx);
    try {
      if (
        force ||
        record.refreshedAt < now() - SIX_DAYS ||
        record.expiresAt <= now() + 86400000
      ) {
        const next = await api("/oauth2/token", {
          method: "POST",
          body: {
            client_id: c.applicationId,
            client_secret: c.applicationSecret,
            grant_type: "refresh_token",
            refresh_token: value.refresh_token,
            redirect_uri: c.callbackUrl,
          },
        });
        requireValue(
          validTokens(next) && next.merchant_id === record.merchantId,
          "Square returned an inconsistent account connection.",
          503,
        );
        value = {
          access_token: next.access_token,
          refresh_token: next.refresh_token,
          merchant_id: next.merchant_id,
          expires_at: next.expires_at,
        };
        record = {
          ...record,
          encryptedTokens: await encrypt(value, c.encryptionKey, aad),
          expiresAt: Date.parse(value.expires_at),
          refreshedAt: now(),
        };
        await put("connection", record);
      }
      if (verify) {
        const current = await locations(
          value.access_token,
          record.merchantId,
          ctx,
        );
        requireValue(
          current.length,
          "No active Square card-processing location matches this shop market.",
          409,
        );
        requireValue(
          !record.locationId ||
            current.some((row) => row.id === record.locationId),
          "The selected Square location is unavailable.",
          409,
        );
        record = { ...record, locations: current, verifiedAt: now() };
        await put("connection", record);
      }
      return { record, value };
    } catch (error) {
      if (error.squareAuth || error.status === 409)
        await put("connection", {
          ...record,
          status: "reconnect_required",
          lastFailureAt: now(),
        });
      throw error;
    }
  }
  const clearCookie = () =>
    `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
  function cookieNonce(header, state) {
    const found = (header || "")
      .split(";")
      .map((value) => value.trim())
      .find((value) => value.startsWith(COOKIE + "="));
    const value = found?.slice(COOKIE.length + 1),
      nonce = value?.slice(state.length + 1);
    requireValue(
      value?.startsWith(state + ".") && tokenString(nonce),
      "The Square browser session is invalid. Start again.",
      403,
    );
    return nonce;
  }
  return Object.freeze({
    clearCookie,
    async start(actor) {
      assertConfigured();
      return locked(async () => {
        const ctx = await context();
        owner(actor, ctx, true);
        paid(ctx);
        const old = await read("connection");
        if (old) checkConnection(old, ctx);
        requireValue(
          !old || old.status !== "connected",
          "Disconnect the existing Square account before replacing it.",
          409,
        );
        const state = c.shopId + "." + randomToken(),
          nonce = randomToken(),
          expiresAt = now() + TEN_MINUTES;
        await put("oauth", {
          stateHash: await hash(state),
          nonceHash: await hash(nonce),
          ownerUid: ctx.ownerUid,
          country: ctx.country,
          currency: ctx.currency,
          expiresAt,
        });
        const url = new URL(API + "/oauth2/authorize");
        for (const [key, value] of Object.entries({
          client_id: c.applicationId,
          scope: SCOPES.join(" "),
          // Sandbox cannot start its own seller login. It reuses the test
          // seller session launched from Square Developer Console.
          session: c.environment === "production" ? "false" : "true",
          state,
          redirect_uri: c.callbackUrl,
        }))
          url.searchParams.set(key, value);
        // setCookie is for the server's response header only. Never serialize it
        // into a browser JSON body, query string, analytics or application log.
        return {
          authorizationUrl: url.href,
          setCookie: `${COOKIE}=${state}.${nonce}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
          expiresAt,
        };
      });
    },
    async callback({ state, code, error, cookieHeader } = {}) {
      assertConfigured();
      return locked(async () => {
        requireValue(
          typeof state === "string" &&
            state.startsWith(c.shopId + ".") &&
            tokenString(state.slice(c.shopId.length + 1)),
          "The Square connection session is invalid.",
          403,
        );
        const nonce = cookieNonce(cookieHeader, state),
          pending = await read("oauth");
        requireValue(
          pending &&
            pending.expiresAt > now() &&
            pending.stateHash === (await hash(state)) &&
            pending.nonceHash === (await hash(nonce)),
          "The Square connection session expired. Start again.",
          403,
        );
        await remove("oauth"); // One use, including denied/failed exchanges.
        const ctx = await context();
        paid(ctx);
        requireValue(
          ctx.ownerUid === pending.ownerUid &&
            ctx.country === pending.country &&
            ctx.currency === pending.currency,
          "Shop settings changed during Square authorization. Start again.",
          409,
        );
        requireValue(
          !error &&
            typeof code === "string" &&
            code.length > 0 &&
            code.length <= 191,
          "Square authorization was declined or incomplete.",
          400,
        );
        const old = await read("connection");
        if (old) checkConnection(old, ctx);
        requireValue(
          !old || old.status !== "connected",
          "Disconnect the existing Square account before replacing it.",
          409,
        );
        const data = await api("/oauth2/token", {
          method: "POST",
          body: {
            client_id: c.applicationId,
            client_secret: c.applicationSecret,
            grant_type: "authorization_code",
            code,
            redirect_uri: c.callbackUrl,
          },
        });
        requireValue(
          validTokens(data),
          "Square did not return a complete account connection.",
          503,
        );
        requireValue(
          !old?.merchantId || old.merchantId === data.merchant_id,
          "This shop is bound to a different Square merchant. Contact Nebula before changing merchants.",
          409,
        );
        const eligible = await locations(
          data.access_token,
          data.merchant_id,
          ctx,
        );
        requireValue(
          eligible.length,
          "No active Square card-processing location matches this shop market.",
          409,
        );
        await registry.claim({
          environment: c.environment,
          merchantId: data.merchant_id,
          shopId: c.shopId,
          ownerUid: ctx.ownerUid,
        });
        const record = {
          schemaVersion: 1,
          environment: c.environment,
          shopId: c.shopId,
          ownerUid: ctx.ownerUid,
          applicationId: c.applicationId,
          status: "connected",
          merchantId: data.merchant_id,
          locationId: eligible.length === 1 ? eligible[0].id : null,
          locations: eligible,
          connectedAt: now(),
          refreshedAt: now(),
          verifiedAt: now(),
          expiresAt: Date.parse(data.expires_at),
          encryptedTokens: await encrypt(
            {
              access_token: data.access_token,
              refresh_token: data.refresh_token,
              merchant_id: data.merchant_id,
              expires_at: data.expires_at,
            },
            c.encryptionKey,
            aad,
          ),
        };
        await put("connection", record);
        return { ...publicStatus(record), clearCookie: clearCookie() };
      });
    },
    async status(actor, { verify = false } = {}) {
      return locked(async () => {
        const ctx = await context();
        owner(actor, ctx);
        let record = await read("connection");
        if (record) checkConnection(record, ctx);
        if (
          verify &&
          configured() &&
          c.enabled === true &&
          record?.status === "connected"
        )
          record = (await refreshRecord(record, ctx, { verify: true })).record;
        return publicStatus(record);
      });
    },
    async chooseLocation(actor, id) {
      assertConfigured();
      return locked(async () => {
        const ctx = await context();
        owner(actor, ctx, true);
        paid(ctx);
        requireValue(identifier(id), "Choose a valid Square location.");
        const result = await refreshRecord(await read("connection"), ctx, {
          verify: true,
        });
        requireValue(
          result.record.locations.some((row) => row.id === id),
          "Choose a matching active Square location.",
          409,
        );
        const record = { ...result.record, locationId: id };
        await put("connection", record);
        return publicStatus(record);
      });
    },
    async refreshConnection() {
      assertConfigured(false);
      return locked(async () => {
        const ctx = await context();
        const record = await read("connection");
        if (!record || record.status !== "connected")
          return publicStatus(record);
        return publicStatus(
          (await refreshRecord(record, ctx, { verify: true })).record,
        );
      });
    },
    async recordRevocation(event) {
      return locked(async () => {
        const record = await read("connection");
        requireValue(
          record && record.merchantId === event.merchant_id,
          "Square merchant mismatch.",
          403,
        );
        const at = Date.parse(
          event.data?.object?.revocation?.revoked_at || event.created_at,
        );
        if (Number.isFinite(at) && at < record.connectedAt) return;
        await put("connection", {
          ...record,
          status: "revoked",
          encryptedTokens: null,
        });
        await remove("oauth");
      });
    },
    // Server-only: the caller must separately authorize a persisted quote/order
    // and all checkout gates. This method never charges or returns to a browser.
    async serverCredentials({ maintenance = false } = {}) {
      assertConfigured(!maintenance);
      return locked(async () => {
        const ctx = await context();
        if (!maintenance) paid(ctx);
        const { record, value } = await refreshRecord(
          await read("connection"),
          ctx,
          { verify: true },
        );
        requireValue(
          record.locationId,
          "Choose a Square location before checkout.",
          409,
        );
        return {
          environment: c.environment,
          shopId: c.shopId,
          merchantId: record.merchantId,
          locationId: record.locationId,
          country: ctx.country,
          currency: ctx.currency,
          accessToken: value.access_token,
        };
      });
    },
    async disconnect(actor) {
      assertConfigured(false);
      return locked(async () => {
        const ctx = await context();
        owner(actor, ctx, true);
        const record = await read("connection");
        await remove("oauth");
        if (!record) return publicStatus(null);
        checkConnection(record, ctx);
        if (record.status === "revoked") return publicStatus(record);
        const value = await tokens(record, ctx);
        await put("connection", { ...record, status: "disconnect_pending" });
        const result = await api("/oauth2/revoke", {
          method: "POST",
          revoke: true,
          body: {
            client_id: c.applicationId,
            access_token: value.access_token,
          },
        });
        requireValue(
          result.success === true,
          "Square did not confirm disconnection.",
          503,
        );
        const next = {
          ...record,
          status: "revoked",
          locationId: null,
          locations: [],
          encryptedTokens: null,
          disconnectedAt: now(),
        };
        await put("connection", next);
        return publicStatus(next);
      });
    },
  });
}
