import { createSquareConnectionService } from "./square-connection.mjs";
import { requireValue } from "../rays-payments/security.mjs";

export const clearSquareCookie = (env = {}) =>
  "__Host-nebula-square-" +
  (env.SQUARE_ENVIRONMENT || "sandbox") +
  "=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";
export function squareSandboxConfigured(env, { requireEnabled = true } = {}) {
  const production = env.SQUARE_ENVIRONMENT === "production";
  const prefix = production ? "SQUARE_PRODUCTION_" : "SQUARE_SANDBOX_";
  return (
    ["sandbox", "production"].includes(env.SQUARE_ENVIRONMENT) &&
    (!production || env.SQUARE_LIVE_APPROVED === "true") &&
    (!requireEnabled ||
      env[
        production
          ? "SQUARE_PRODUCTION_CONNECT_ENABLED"
          : "SQUARE_SANDBOX_CONNECT_ENABLED"
      ] === "true") &&
    /^[A-Za-z0-9_-]{1,191}$/.test(env[prefix + "APPLICATION_ID"] || "") &&
    typeof env[prefix + "APPLICATION_SECRET"] === "string" &&
    env[prefix + "APPLICATION_SECRET"].length >= 2 &&
    /^[A-Za-z0-9_-]{43}$/.test(env.SQUARE_TOKEN_ENCRYPTION_KEY || "")
  );
}

export function squareCheckoutConfigured(env) {
  const key =
    env[
      env.SQUARE_ENVIRONMENT === "production"
        ? "SQUARE_PRODUCTION_WEBHOOK_SIGNATURE_KEY"
        : "SQUARE_SANDBOX_WEBHOOK_SIGNATURE_KEY"
    ];
  return (
    env.CHECKOUT_ENABLED === "true" &&
    squareSandboxConfigured(env) &&
    typeof key === "string" &&
    key.length >= 8
  );
}

/** A separate async queue protects OAuth writes without blocking profile edits. */
export function storedSquareService(store) {
  const sql = store.sql,
    env = store.env,
    shop = store.shop();
  requireValue(shop, "Shop not found.", 404);
  const repository = {
    async get(key) {
      const row = [
        ...sql.exec("SELECT data FROM square_state WHERE key=?", key),
      ][0];
      return row ? JSON.parse(row.data) : null;
    },
    async put(key, value) {
      const data = JSON.stringify(value);
      requireValue(
        new TextEncoder().encode(data).byteLength <= 32 * 1024,
        "Square connection data is too large.",
        503,
      );
      sql.exec(
        "INSERT INTO square_state(key,data) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data",
        key,
        data,
      );
    },
    async delete(key) {
      sql.exec("DELETE FROM square_state WHERE key=?", key);
    },
    withLock(callback) {
      const operation = (store.squareQueue || Promise.resolve()).then(callback);
      store.squareQueue = operation.catch(() => {});
      return operation;
    },
  };
  return createSquareConnectionService(
    {
      environment: env.SQUARE_ENVIRONMENT || "sandbox",
      enabled:
        env[
          env.SQUARE_ENVIRONMENT === "production"
            ? "SQUARE_PRODUCTION_CONNECT_ENABLED"
            : "SQUARE_SANDBOX_CONNECT_ENABLED"
        ] === "true",
      liveApproved: env.SQUARE_LIVE_APPROVED === "true",
      shopId: shop.id,
      applicationId:
        env[
          env.SQUARE_ENVIRONMENT === "production"
            ? "SQUARE_PRODUCTION_APPLICATION_ID"
            : "SQUARE_SANDBOX_APPLICATION_ID"
        ],
      applicationSecret:
        env[
          env.SQUARE_ENVIRONMENT === "production"
            ? "SQUARE_PRODUCTION_APPLICATION_SECRET"
            : "SQUARE_SANDBOX_APPLICATION_SECRET"
        ],
      encryptionKey: env.SQUARE_TOKEN_ENCRYPTION_KEY,
      callbackUrl:
        (env.CANONICAL_ORIGIN ||
          env.PUBLIC_ORIGIN ||
          "https://app.nebulastudio.site") + "/api/square/callback",
    },
    {
      repository,
      getContext: async () => {
        const current = store.shop(),
          currency =
            current.published?.draft.currency || current.draft.currency;
        return {
          shopId: current.id,
          ownerUid: current.ownerUid,
          currency,
          country: currency === "CAD" ? "CA" : "US",
          subscription: current.subscription,
        };
      },
      registry: {
        claim: async (value) => {
          const registry = env.REGISTRY.get(
            env.REGISTRY.idFromName("platform-registry-v1"),
          );
          const response = await registry.fetch(
            new Request("https://internal/square-claim", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(value),
            }),
          );
          const result = await response.json();
          requireValue(
            response.ok,
            result.error || "Square merchant ownership could not be saved.",
            response.status,
          );
        },
      },
    },
  );
}
