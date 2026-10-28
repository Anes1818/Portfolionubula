/* Disconnected, test-mode-only Lemon Squeezy adapter foundation.
 * Not imported by worker.mjs. It cannot persist or activate an entitlement.
 */
import { HttpError, requireValue } from "../rays-payments/security.mjs";

const encoder = new TextEncoder();
const API_URL = "https://api.lemonsqueezy.com/v1/checkouts";
const JSON_API = "application/vnd.api+json";
const MAX_BYTES = 64 * 1024;
const origins = new Set([
  "https://nebula.aneslaidaoui06.workers.dev",
  "https://nebulastudio.site",
]);
const events = new Set([
  "subscription_created",
  "subscription_updated",
  "subscription_cancelled",
  "subscription_resumed",
  "subscription_expired",
  "subscription_paused",
  "subscription_unpaused",
  "subscription_plan_changed",
]);
const statuses = new Set([
  "on_trial",
  "active",
  "paused",
  "past_due",
  "unpaid",
  "cancelled",
  "expired",
]);
const hex = (bytes) =>
  [...new Uint8Array(bytes)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
const hexBytes = (value) =>
  Uint8Array.from(value.match(/../g), (pair) => parseInt(pair, 16));
const failure = () =>
  new HttpError(
    502,
    "The subscription provider returned an invalid response. Please try again later.",
  );

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function providerId(value) {
  if (!["string", "number"].includes(typeof value)) return null;
  const result = String(value);
  return /^[1-9][0-9]{0,15}$/.test(result) &&
    Number.isSafeInteger(Number(result))
    ? result
    : null;
}
function resourceId(value) {
  return typeof value === "string" && /^[A-Za-z0-9-]{1,100}$/.test(value);
}
function identity(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 128 &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}
function shopIdentity(shop) {
  requireValue(
    plain(shop) &&
      /^sh_[a-f0-9]{32}$/.test(shop.id || "") &&
      identity(shop.ownerUid),
    "A server-loaded shop and verified owner are required.",
    403,
  );
  return { shopId: shop.id, ownerUid: shop.ownerUid };
}
function date(value, required = false) {
  if (value === null || value === undefined) {
    requireValue(!required, "Webhook subscription dates are incomplete.");
    return null;
  }
  requireValue(
    typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(value),
    "Webhook subscription contains an invalid date.",
  );
  const milliseconds = Date.parse(value);
  requireValue(
    Number.isFinite(milliseconds) &&
      new Date(milliseconds).toISOString().slice(0, 19) === value.slice(0, 19),
    "Webhook subscription contains an invalid date.",
  );
  return value;
}

async function readBounded(source, message, status) {
  const lengthHeader = source.headers.get("Content-Length");
  if (lengthHeader)
    requireValue(
      /^\d+$/.test(lengthHeader) && Number(lengthHeader) <= MAX_BYTES,
      message,
      status,
    );
  requireValue(source.body, message, status);
  const reader = source.body.getReader(),
    parts = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) {
        try {
          await reader.cancel();
        } catch {}
        throw new HttpError(status, message);
      }
      parts.push(value);
    }
  } catch (error) {
    throw error instanceof HttpError ? error : new HttpError(status, message);
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}

function parseJson(bytes, error) {
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw error;
  }
}

function configValues(input) {
  requireValue(
    plain(input) && input.testMode === true,
    "The Lemon Squeezy foundation requires explicit test mode.",
    503,
  );
  requireValue(
    Object.keys(input).every((key) =>
      [
        "apiKey",
        "webhookSecret",
        "storeId",
        "variantId",
        "checkoutHost",
        "siteOrigin",
        "testMode",
      ].includes(key),
    ),
    "The Lemon Squeezy foundation has unsupported configuration.",
    503,
  );
  const storeId = providerId(input.storeId),
    variantId = providerId(input.variantId);
  requireValue(
    storeId && variantId,
    "A fixed test store and subscription variant are required.",
    503,
  );
  requireValue(
    typeof input.apiKey === "string" &&
      input.apiKey.length >= 16 &&
      input.apiKey.length <= 10000 &&
      !/\s/.test(input.apiKey),
    "A server-side test API key is required.",
    503,
  );
  requireValue(
    typeof input.webhookSecret === "string" &&
      input.webhookSecret.length >= 6 &&
      input.webhookSecret.length <= 40 &&
      !/[\u0000-\u001f\u007f]/.test(input.webhookSecret),
    "A server-side webhook signing secret is required.",
    503,
  );
  requireValue(
    typeof input.checkoutHost === "string" &&
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.lemonsqueezy\.com$/.test(
        input.checkoutHost,
      ) &&
      !["api.lemonsqueezy.com", "app.lemonsqueezy.com"].includes(
        input.checkoutHost,
      ),
    "An exact Lemon Squeezy test store checkout host is required.",
    503,
  );
  const siteOrigin =
    input.siteOrigin || "https://nebula.aneslaidaoui06.workers.dev";
  requireValue(
    origins.has(siteOrigin),
    "The subscription return origin is not approved.",
    503,
  );
  return Object.freeze({ ...input, storeId, variantId, siteOrigin });
}

/**
 * Only call from a trusted server after verifying Firebase and loading the shop.
 * Credentials are constructor configuration, never request fields. No live mode.
 */
export function createLemonAdapter(
  input,
  { fetchImpl = fetch, now = () => Date.now(), timeoutMs = 8000 } = {},
) {
  const config = configValues(input);
  requireValue(
    typeof fetchImpl === "function" &&
      typeof now === "function" &&
      Number.isInteger(timeoutMs) &&
      timeoutMs >= 1 &&
      timeoutMs <= 15000,
    "The subscription adapter configuration is invalid.",
    503,
  );
  let hmacKey;
  const key = () =>
    (hmacKey ||= crypto.subtle.importKey(
      "raw",
      encoder.encode(config.webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    ));
  const sign = async (bytes) =>
    hex(await crypto.subtle.sign("HMAC", await key(), bytes));
  // WebCrypto performs MAC verification without a JavaScript string comparison.
  const verify = async (bytes, signature) =>
    typeof signature === "string" &&
    /^[a-f0-9]{64}$/i.test(signature) &&
    crypto.subtle.verify("HMAC", await key(), hexBytes(signature), bytes);
  const bindingBytes = (shopId, ownerUid, nonce) =>
    encoder.encode(
      JSON.stringify([
        "nebula-lemon-checkout-v1",
        shopId,
        ownerUid,
        nonce,
        config.storeId,
        config.variantId,
        true,
      ]),
    );

  async function createCheckout(request) {
    requireValue(
      plain(request) &&
        Object.keys(request).every((key) =>
          ["verifiedUser", "shop"].includes(key),
        ),
      "A verified owner and server-loaded shop are required.",
      403,
    );
    const { shopId, ownerUid } = shopIdentity(request.shop),
      user = request.verifiedUser;
    requireValue(
      plain(user) &&
        user.uid === ownerUid &&
        typeof user.email === "string" &&
        user.email.length <= 254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email),
      "The verified owner does not match this shop.",
      403,
    );
    const nonce = crypto.randomUUID(),
      binding = await sign(bindingBytes(shopId, ownerUid, nonce));
    const expiresAt = new Date(now() + 30 * 60000).toISOString();
    const payload = {
      data: {
        type: "checkouts",
        attributes: {
          test_mode: true,
          expires_at: expiresAt,
          product_options: {
            enabled_variants: [Number(config.variantId)],
            redirect_url:
              config.siteOrigin + "/dashboard/billing?checkout=returned",
          },
          checkout_options: { embed: false },
          checkout_data: {
            email: user.email,
            custom: {
              nebula_shop_id: shopId,
              nebula_owner_uid: ownerUid,
              nebula_checkout_nonce: nonce,
              nebula_binding: binding,
            },
          },
        },
        relationships: {
          store: { data: { type: "stores", id: config.storeId } },
          variant: { data: { type: "variants", id: config.variantId } },
        },
      },
    };
    const controller = new AbortController();
    let timer;
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(
          new HttpError(
            504,
            "The subscription provider timed out. Please try again later.",
          ),
        );
      }, timeoutMs);
    });
    try {
      return await Promise.race([
        deadline,
        (async () => {
          let response;
          try {
            response = await fetchImpl(API_URL, {
              method: "POST",
              redirect: "error",
              signal: controller.signal,
              headers: {
                Accept: JSON_API,
                "Content-Type": JSON_API,
                Authorization: "Bearer " + config.apiKey,
              },
              body: JSON.stringify(payload),
            });
          } catch {
            throw new HttpError(
              502,
              "The subscription provider is temporarily unavailable. Please try again later.",
            );
          }
          if (response.status === 429)
            throw new HttpError(
              503,
              "The subscription provider is temporarily busy. Please try again later.",
            );
          if (
            !response.ok ||
            response.redirected ||
            response.status !== 201 ||
            !/^application\/(vnd\.api\+json|json)(?:;|$)/i.test(
              response.headers.get("Content-Type") || "",
            )
          )
            throw failure();
          const data = parseJson(
            await readBounded(
              response,
              "The subscription provider returned an oversized or empty response.",
              502,
            ),
            failure(),
          ).data;
          if (
            !plain(data) ||
            data.type !== "checkouts" ||
            !resourceId(data.id) ||
            !plain(data.attributes)
          )
            throw failure();
          const attributes = data.attributes;
          if (
            providerId(attributes.store_id) !== config.storeId ||
            providerId(attributes.variant_id) !== config.variantId ||
            attributes.test_mode !== true ||
            Date.parse(attributes.expires_at) !== Date.parse(expiresAt)
          )
            throw failure();
          let url;
          try {
            url = new URL(attributes.url);
          } catch {
            throw failure();
          }
          if (
            url.protocol !== "https:" ||
            url.hostname !== config.checkoutHost ||
            url.port ||
            url.username ||
            url.password ||
            url.hash ||
            url.pathname !== "/checkout/custom/" + data.id
          )
            throw failure();
          const parameters = [...url.searchParams];
          if (
            parameters.some(
              ([name]) => !["expires", "signature"].includes(name),
            ) ||
            new Set(parameters.map(([name]) => name)).size !== parameters.length
          )
            throw failure();
          if (
            url.searchParams.has("signature") &&
            !/^[a-f0-9]{64}$/i.test(url.searchParams.get("signature"))
          )
            throw failure();
          if (
            url.searchParams.has("expires") &&
            (!/^\d{1,12}$/.test(url.searchParams.get("expires")) ||
              Number(url.searchParams.get("expires")) <=
                Math.floor(now() / 1000) ||
              Number(url.searchParams.get("expires")) !==
                Math.floor(Date.parse(expiresAt) / 1000))
          )
            throw failure();
          return {
            checkoutId: data.id,
            checkoutNonce: nonce,
            url: url.href,
            expiresAt,
            storeId: config.storeId,
            variantId: config.variantId,
            testMode: true,
          };
        })(),
      ]);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw failure();
    } finally {
      clearTimeout(timer);
    }
  }

  /** Verify raw signed bytes, then normalize against a trusted future ledger record.
   * The caller must still deduplicate, reconcile ordering and apply entitlement policy.
   */
  async function verifyWebhook(
    request,
    { expectedShop, expectedCheckoutNonce } = {},
  ) {
    const { shopId, ownerUid } = shopIdentity(expectedShop);
    requireValue(
      typeof expectedCheckoutNonce === "string" &&
        /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
          expectedCheckoutNonce,
        ),
      "A server-side checkout ledger record is required.",
      409,
    );
    requireValue(
      request.method === "POST" &&
        /^application\/json(?:;|$)/i.test(
          request.headers.get("Content-Type") || "",
        ),
      "A JSON webhook POST is required.",
      415,
    );
    const signature = request.headers.get("X-Signature");
    requireValue(
      typeof signature === "string" && /^[a-f0-9]{64}$/i.test(signature),
      "The webhook signature is missing or invalid.",
      401,
    );
    const raw = await readBounded(
      request,
      "Webhook body must be at most 64 KiB.",
      413,
    );
    requireValue(
      await verify(raw, signature),
      "The webhook signature is invalid.",
      401,
    );
    const payload = parseJson(
      raw,
      new HttpError(400, "The signed webhook JSON is invalid."),
    );
    requireValue(
      plain(payload) && plain(payload.meta) && plain(payload.data),
      "The signed webhook payload is invalid.",
    );
    const type = payload.meta.event_name,
      headerType = request.headers.get("X-Event-Name");
    requireValue(
      events.has(type),
      "This webhook event requires separate provider reconciliation.",
      422,
    );
    requireValue(
      !headerType || headerType === type,
      "The webhook event name does not match.",
    );
    requireValue(
      payload.data.type === "subscriptions" &&
        providerId(payload.data.id) &&
        plain(payload.data.attributes),
      "A subscription resource is required.",
      422,
    );
    const attributes = payload.data.attributes,
      custom = payload.meta.custom_data;
    requireValue(
      providerId(attributes.store_id) === config.storeId &&
        providerId(attributes.variant_id) === config.variantId,
      "Webhook store or variant is not approved.",
      403,
    );
    requireValue(
      attributes.test_mode === true &&
        (payload.meta.test_mode === undefined ||
          payload.meta.test_mode === true),
      "Only test-mode subscription events are accepted.",
      403,
    );
    requireValue(
      plain(custom) &&
        Object.keys(custom).length === 4 &&
        custom.nebula_shop_id === shopId &&
        custom.nebula_owner_uid === ownerUid &&
        custom.nebula_checkout_nonce === expectedCheckoutNonce,
      "Webhook shop metadata does not match the server ledger.",
      403,
    );
    requireValue(
      await verify(
        bindingBytes(shopId, ownerUid, expectedCheckoutNonce),
        custom.nebula_binding,
      ),
      "Webhook shop metadata binding is invalid.",
      403,
    );
    requireValue(
      statuses.has(attributes.status) &&
        typeof attributes.cancelled === "boolean",
      "Webhook subscription status is invalid.",
    );
    const createdAt = date(attributes.created_at, true),
      updatedAt = date(attributes.updated_at, true),
      renewsAt = date(attributes.renews_at),
      endsAt = date(attributes.ends_at),
      trialEndsAt = date(attributes.trial_ends_at);
    requireValue(
      Date.parse(updatedAt) >= Date.parse(createdAt),
      "Webhook subscription dates are inconsistent.",
    );
    requireValue(
      attributes.status !== "cancelled" || (attributes.cancelled && endsAt),
      "Cancelled subscriptions require an end date.",
    );
    requireValue(
      !attributes.cancelled ||
        ["cancelled", "expired"].includes(attributes.status),
      "Webhook cancellation status is inconsistent.",
    );
    requireValue(
      attributes.status !== "expired" || endsAt,
      "Expired subscriptions require an end date.",
    );
    const paidUntil = ["cancelled", "expired"].includes(attributes.status)
      ? endsAt
      : attributes.status === "active"
        ? endsAt || renewsAt
        : null;
    return {
      // Provider docs expose resource IDs, not a universal webhook delivery ID.
      // This fingerprint is a replay key, never sufficient event ordering policy.
      id: "sha256:" + hex(await crypto.subtle.digest("SHA-256", raw)),
      idSource: "payload-sha256",
      provider: "lemon_squeezy",
      type,
      resourceType: "subscriptions",
      subscriptionId: providerId(payload.data.id),
      storeId: config.storeId,
      variantId: config.variantId,
      testMode: true,
      customData: { shopId, ownerUid, checkoutNonce: expectedCheckoutNonce },
      subscriptionStatus: attributes.status,
      cancellation: { cancelled: attributes.cancelled, endsAt },
      paidUntil,
      renewsAt,
      endsAt,
      trialEndsAt,
      createdAt,
      updatedAt,
      requiresReconciliation: true,
    };
  }

  return Object.freeze({ createCheckout, verifyWebhook });
}
