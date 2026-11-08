import {
  HttpError,
  requireValue,
  readJson,
  verifyFirebase,
  hash as secureHash,
  verifyWebhook,
} from "../rays-payments/security.mjs";
import { ShopRegistry, ShopStore, json } from "./stores.mjs";
import {
  humanCheckEnabled,
  humanCheckConfig,
  hasHumanProof,
  verifyHumanRequest,
} from "./human-check.mjs";
import { orderPreview } from "./order-preview.mjs";
import {
  createInput,
  normalizeEmail,
  object,
  readImage,
  validateDraft,
  validatePublication,
  boundedDesign,
  REQUEST_LIMIT,
  entitled,
  mediaReferences,
  text,
  multilineText,
  requestUpdate,
} from "./validation.mjs";
import {
  priceDesign,
  validateDesign,
  normalizePolicy,
} from "../../platform/shared/policy.mjs";
import { billingPublicConfig, handleBillingWebhook } from "./billing.mjs";
import {
  clearSquareCookie,
  squareSandboxConfigured,
  squareCheckoutConfigured,
} from "./square-storage.mjs";
export { ShopRegistry, ShopStore };

const PUBLIC_ORIGIN = "https://app.nebulastudio.site";
const LEGACY_ORIGIN = "https://nebula.aneslaidaoui06.workers.dev";
const publicFirebase = Object.freeze({
  apiKey: "AIzaSyDIwvYLyHE6sVy1XMmNU_GVnlWxQpLa4wI",
  authDomain: "la-flora-6ed47.firebaseapp.com",
  databaseURL: "https://la-flora-6ed47-default-rtdb.firebaseio.com",
  projectId: "la-flora-6ed47",
  storageBucket: "la-flora-6ed47.firebasestorage.app",
  messagingSenderId: "723839530405",
  appId: "1:723839530405:web:cc546bb8e6100677c7244c",
});
const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function allowedOrigin(origin, env) {
  return (
    origin === (env.PUBLIC_ORIGIN || PUBLIC_ORIGIN) ||
    origin === LEGACY_ORIGIN ||
    origin === "https://nebulastudio.site" ||
    (env.ENVIRONMENT === "local" &&
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(origin))
  );
}

function originCheck(request, env) {
  const origin = request.headers.get("Origin");
  if (origin)
    requireValue(
      allowedOrigin(origin, env),
      "This request origin is not allowed.",
      403,
    );
  if (mutationMethods.has(request.method))
    requireValue(origin, "An allowed request origin is required.", 403);
  return origin;
}

async function responseData(response) {
  const data = await response.json();
  if (!response.ok)
    throw new HttpError(
      response.status,
      data.error || "Shop storage is temporarily unavailable.",
    );
  return data;
}

const internal = (path, method = "GET", body, ownerUid) =>
  new Request("https://internal" + path, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(ownerUid ? { "X-Owner-Uid": ownerUid } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const registryStub = (env) =>
  env.REGISTRY.get(env.REGISTRY.idFromName("platform-registry-v1"));
const shopStub = (env, id) => env.SHOPS.get(env.SHOPS.idFromName(id));
const registryLookup = async (env, field, value) =>
  (
    await responseData(
      await registryStub(env).fetch(
        internal(`/${field}?value=${encodeURIComponent(value)}`),
      ),
    )
  ).entry;
const ensureShop = async (env, entry) =>
  (
    await responseData(
      await shopStub(env, entry.id).fetch(
        internal("/ensure", "POST", { entry }),
      ),
    )
  ).shop;

async function loadCatalog(env) {
  requireValue(
    env.ASSETS?.fetch,
    "The flower catalog is temporarily unavailable.",
    503,
  );
  const response = await env.ASSETS.fetch(
    new Request("https://assets/catalog.json"),
  );
  requireValue(
    response.ok,
    "The flower catalog is temporarily unavailable.",
    503,
  );
  let catalog;
  try {
    catalog = await response.json();
  } catch {
    throw new HttpError(503, "The flower catalog is temporarily unavailable.");
  }
  requireValue(
    Array.isArray(catalog.flowers) &&
      Array.isArray(catalog.extras) &&
      Array.isArray(catalog.recipes),
    "The flower catalog is temporarily unavailable.",
    503,
  );
  return catalog;
}

function publicShop(shop, env) {
  requireValue(
    shop.published &&
      entitled(shop) &&
      env.PUBLISHING_ENABLED === "true" &&
      shop.subscription.testEnvironment ===
        (env.BILLING_TEST_MODE === "true" || env.LEMON_TEST_MODE === "true") &&
      (!(env.BILLING_TEST_MODE === "true" || env.LEMON_TEST_MODE === "true") ||
        ["local", "test"].includes(env.ENVIRONMENT)),
    "Shop not found.",
    404,
  );
  return {
    id: shop.id,
    slug: shop.slug,
    version: shop.published.version,
    draft: shop.published.draft,
    published: {
      version: shop.published.version,
      catalogVersion: shop.published.catalogVersion,
    },
    readiness: [],
    checkoutSettings: shop.commerce
      ? {
          paymentOptions: shop.commerce.paymentOptions || "full_and_deposit",
          pickupEnabled: shop.commerce.pickupEnabled,
          deliveryEnabled: shop.commerce.deliveryEnabled,
          taxBps: shop.commerce.taxBps,
          deliveryCents: shop.commerce.deliveryCents,
          deliveryNote: shop.commerce.deliveryNote || "",
          fulfillmentRules: shop.commerce.fulfillmentRules || null,
          terms: shop.commerce.terms,
        }
      : null,
    features: {
      requestsEnabled: true,
      checkoutEnabled:
        squareCheckoutConfigured(env) &&
        shop.commerce?.enabled === true &&
        shop.checkoutConnectionAvailable === true,
    },
  };
}

async function verifyFirebaseAdmin(user, token, env) {
  const url = new URL(
    `/adminUids/${encodeURIComponent(user.uid)}.json`,
    publicFirebase.databaseURL,
  );
  url.searchParams.set("auth", token);
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return response.ok && (await response.json()) === true;
  } catch {
    return false;
  }
}

export async function updateRegistrySummary(env, shop) {
  const summary = {
    uid: shop.ownerUid,
    shopId: shop.id,
    slug: shop.slug,
    name: shop.draft.name,
    preset: shop.draft.preset,
    status: shop.published && entitled(shop) ? "published" : "draft",
    subscriptionStatus:
      !entitled(shop) && shop.activationRequest?.status === "pending"
        ? "activation_requested"
        : shop.subscription?.status === "active" && !entitled(shop)
          ? "expired"
          : shop.subscription?.status || "inactive",
    publishedVersion: shop.published?.version || 0,
    version: shop.version,
    revision: shop.summaryRevision || shop.version,
  };
  await responseData(
    await registryStub(env).fetch(internal("/summary", "POST", { summary })),
  );
}

function decorateResponse(response, origin, env) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  if (!headers.has("Referrer-Policy"))
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // API data is never an executable document, including when opened directly.
  if (headers.get("Content-Type")?.startsWith("application/json"))
    headers.set(
      "Content-Security-Policy",
      "default-src 'none'; frame-ancestors 'none'; sandbox",
    );
  if (origin && allowedOrigin(origin, env)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, OPTIONS",
    );
    headers.set(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type, X-Order-Token",
    );
    headers.set("Vary", "Origin");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function makeHandler({
  verifyIdentity,
  verifyAuth = verifyIdentity || verifyFirebase,
  verifyAdmin = verifyFirebaseAdmin,
} = {}) {
  return async (request, env) => {
    let origin;
    try {
      const url = new URL(request.url),
        path = url.pathname;
      // Old bookmarks keep working while all customer-facing pages use Nebula.
      if (
        url.origin === LEGACY_ORIGIN &&
        env.CANONICAL_ORIGIN &&
        ["GET", "HEAD"].includes(request.method) &&
        !path.startsWith("/api/")
      ) {
        const target = new URL(url.pathname + url.search, env.CANONICAL_ORIGIN);
        return Response.redirect(target.href, 302);
      }
      // Platform bookmarks lead to the operator console. The separate marketing
      // site's legacy admin remains outside this Worker's routes.
      if (path === "/admin.html" && ["GET", "HEAD"].includes(request.method))
        return Response.redirect(
          new URL("/admin" + url.search, url.origin).href,
          302,
        );
      if (!path.startsWith("/api/")) {
        requireValue(
          env.ASSETS?.fetch,
          "The application is temporarily unavailable.",
          503,
        );
        const assetUrl = new URL(url);
        if (path === "/") assetUrl.pathname = "/welcome.html";
        else if (/^\/demo\/?$/.test(path)) assetUrl.pathname = "/try.html";
        else if (
          /^\/login\/?$/.test(path) ||
          /^\/dashboard(?:\/(shop|prices|collection|products|editor|billing|payments|orders))?\/?$/.test(
            path,
          ) ||
          /^\/s\/[a-z0-9-]+\/?$/.test(path) ||
          /^\/admin(?:\/login|\/shops\/sh_[a-f0-9]{32}\/(?:preview|orders))?\/?$/.test(
            path,
          )
        )
          assetUrl.pathname = "/index.html";
        return decorateResponse(
          await env.ASSETS.fetch(new Request(assetUrl, request)),
          null,
          env,
        );
      }
      if (request.method === "POST" && path === "/api/square/webhook") {
        const environment = env.SQUARE_ENVIRONMENT || "sandbox";
        const key =
          env[
            environment === "production"
              ? "SQUARE_PRODUCTION_WEBHOOK_SIGNATURE_KEY"
              : "SQUARE_SANDBOX_WEBHOOK_SIGNATURE_KEY"
          ];
        requireValue(
          squareSandboxConfigured(env, { requireEnabled: false }) && key,
          "Square webhook is not configured.",
          503,
        );
        const reader = request.body?.getReader();
        requireValue(reader, "Missing webhook.");
        const chunks = [];
        let size = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 128 * 1024) {
            await reader.cancel();
            throw new HttpError(413, "Webhook too large.");
          }
          chunks.push(value);
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.length;
        }
        const raw = new TextDecoder().decode(bytes);
        requireValue(
          await verifyWebhook(
            raw,
            request.headers.get("x-square-hmacsha256-signature"),
            key,
            (env.CANONICAL_ORIGIN || env.PUBLIC_ORIGIN || PUBLIC_ORIGIN) +
              "/api/square/webhook",
          ),
          "Invalid webhook signature.",
          403,
        );
        let event;
        try {
          event = JSON.parse(raw);
        } catch {
          throw new HttpError(400, "Invalid webhook.");
        }
        requireValue(
          /^[A-Za-z0-9_-]{1,128}$/.test(event.event_id || "") &&
            /^[A-Za-z0-9_-]{1,191}$/.test(event.merchant_id || ""),
          "Invalid webhook identifiers.",
        );
        if (
          ![
            "payment.created",
            "payment.updated",
            "refund.created",
            "refund.updated",
            "oauth.authorization.revoked",
          ].includes(event.type)
        )
          return decorateResponse(json({ received: true }), null, env);
        const result = await responseData(
          await registryStub(env).fetch(
            internal(
              "/square-owner?" +
                new URLSearchParams({
                  environment,
                  merchantId: event.merchant_id,
                }),
            ),
          ),
        );
        if (!result.entry)
          return decorateResponse(json({ received: true }), null, env);
        const entry = result.entry;
        const data = await responseData(
          await shopStub(env, entry.id).fetch(
            internal("/checkout/event", "POST", { event }, entry.ownerUid),
          ),
        );
        return decorateResponse(json(data), null, env);
      }
      if (request.method === "POST" && path === "/api/billing/webhook")
        return decorateResponse(
          await handleBillingWebhook(request, env),
          null,
          env,
        );
      if (request.method === "GET" && path === "/api/square/callback") {
        let result = "connection_failed";
        try {
          requireValue(
            squareSandboxConfigured(env),
            "Square sandbox setup is pending.",
            503,
          );
          requireValue(
            url.origin ===
              (env.CANONICAL_ORIGIN || env.PUBLIC_ORIGIN || PUBLIC_ORIGIN),
            "Invalid Square return origin.",
            403,
          );
          requireValue(
            url.search.length < 2048 &&
              [...url.searchParams.keys()].every((key) =>
                [
                  "state",
                  "code",
                  "error",
                  "error_description",
                  "response_type",
                ].includes(key),
              ) &&
              [...url.searchParams.keys()].every(
                (key) => url.searchParams.getAll(key).length === 1,
              ),
            "Invalid Square return parameters.",
          );
          const state = url.searchParams.get("state"),
            matched = state?.match(/^(sh_[a-f0-9]{32})\.[A-Za-z0-9_-]{43}$/);
          requireValue(
            matched,
            "The Square connection session is invalid.",
            403,
          );
          const entry = await registryLookup(env, "id", matched[1]);
          requireValue(entry, "Shop not found.", 404);
          await responseData(
            await shopStub(env, entry.id).fetch(
              internal(
                "/square/callback",
                "POST",
                {
                  actor: { uid: entry.ownerUid },
                  callback: {
                    state,
                    code: url.searchParams.get("code"),
                    error: url.searchParams.get("error"),
                    cookieHeader: request.headers.get("Cookie") || "",
                  },
                },
                entry.ownerUid,
              ),
            ),
          );
          result =
            env.SQUARE_ENVIRONMENT === "production"
              ? "connected"
              : "sandbox_connected";
        } catch {}
        return decorateResponse(
          new Response(null, {
            status: 303,
            headers: {
              Location: new URL(
                "/dashboard/payments?square=" + result,
                env.CANONICAL_ORIGIN || env.PUBLIC_ORIGIN || PUBLIC_ORIGIN,
              ).href,
              "Set-Cookie": clearSquareCookie(env),
              "Cache-Control": "no-store",
              "Referrer-Policy": "no-referrer",
            },
          }),
          null,
          env,
        );
      }
      origin = originCheck(request, env);
      if (request.method === "OPTIONS") {
        requireValue(origin, "An allowed request origin is required.", 403);
        return decorateResponse(
          new Response(null, { status: 204 }),
          origin,
          env,
        );
      }
      if (request.method === "GET" && path === "/api/health")
        return decorateResponse(
          json({
            ok: Boolean(env.REGISTRY && env.SHOPS && env.ASSETS),
            stage: "private_beta",
            signupMode:
              env.PUBLIC_SIGNUPS === "true" ? "open-beta" : "private-beta",
            storageConfigured: Boolean(env.REGISTRY && env.SHOPS),
            draftPersistence: "durable-object-sqlite",
            billingEnabled: billingPublicConfig(env).billingEnabled,
            checkoutEnabled: squareCheckoutConfigured(env),
            squareConnectionEnabled: squareSandboxConfigured(env),
            squareEnvironment: env.SQUARE_ENVIRONMENT || "sandbox",
            publishingEnabled: env.PUBLISHING_ENABLED === "true",
            providers: {
              billing:
                env.MANUAL_ACTIVATION_ENABLED === "true"
                  ? "manual_review"
                  : "pending_setup",
              square: squareCheckoutConfigured(env)
                ? "checkout_configured"
                : squareSandboxConfigured(env)
                  ? "connection_configured"
                  : "pending_setup",
            },
          }),
          origin,
          env,
        );
      if (request.method === "GET" && path === "/api/config")
        return decorateResponse(
          json({
            firebase: publicFirebase,
            humanCheck: humanCheckConfig(env),
            stage: "private_beta",
            signupMode:
              env.PUBLIC_SIGNUPS === "true" ? "open-beta" : "private-beta",
            ...billingPublicConfig(env),
            squareConnectionEnabled: squareSandboxConfigured(env),
            squareEnvironment: env.SQUARE_ENVIRONMENT || "sandbox",
            branding: {
              name: "Nebula",
              hostedOrigin:
                env.CANONICAL_ORIGIN || env.PUBLIC_ORIGIN || PUBLIC_ORIGIN,
            },
            checkoutEnabled: squareCheckoutConfigured(env),
            publishingEnabled: env.PUBLISHING_ENABLED === "true",
          }),
          origin,
          env,
        );
      if (request.method === "GET" && path === "/api/catalog")
        return decorateResponse(json(await loadCatalog(env)), origin, env);
      if (request.method === "POST" && path === "/api/human-check")
        return decorateResponse(
          await verifyHumanRequest(request, env),
          origin,
          env,
        );

      const authenticate = async () => {
        const header = request.headers.get("Authorization");
        requireValue(
          typeof header === "string" && /^Bearer [^\s]+$/.test(header),
          "Sign in with a verified email address to continue.",
          401,
        );
        const user = await verifyAuth(
          header.slice(7),
          env.FIREBASE_PROJECT_ID || "la-flora-6ed47",
        );
        requireValue(
          typeof user?.uid === "string" &&
            !user.uid.startsWith("pending:") &&
            typeof user?.email === "string" &&
            user.emailVerified !== false,
          "Sign in with a verified email address to continue.",
          401,
        );
        const admin =
          path === "/api/session" ||
          path.startsWith("/api/admin/") ||
          !(env.BETA_ACCESS_EMAILS || "")
            .toLowerCase()
            .split(",")
            .map((email) => email.trim())
            .includes(user.email.toLowerCase())
            ? await verifyAdmin(user, header.slice(7), env)
            : false;
        const invited = (env.BETA_ACCESS_EMAILS || "")
          .split(",")
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean);
        let reservation = null;
        if (
          env.PUBLIC_SIGNUPS !== "true" &&
          !invited.includes(user.email.toLowerCase()) &&
          !admin &&
          (!env.REGISTRY?.objects || env.REGISTRY.objects.size > 0)
        ) {
          reservation = await registryLookup(
            env,
            "reservation",
            user.email.toLowerCase(),
          );
        }
        requireValue(
          env.PUBLIC_SIGNUPS === "true" ||
            invited.includes(user.email.toLowerCase()) ||
            admin ||
            Boolean(
              reservation &&
                (reservation.status === "pending" ||
                  reservation.claimedByUid === user.uid),
            ),
          "Private beta access is limited to invited accounts.",
          403,
        );
        // New shop owners must pass a server-verified challenge before any
        // registry record is written. Existing owners and pre-provisioned
        // email reservations keep normal access.
        if (
          humanCheckEnabled(env) &&
          !admin &&
          !(await hasHumanProof(request, env)) &&
          !(await registryLookup(env, "owner", user.uid))
        ) {
          const emailReservation =
            reservation ||
            (await registryLookup(
              env,
              "reservation",
              user.email.toLowerCase(),
            ));
          if (
            !emailReservation ||
            (emailReservation.status !== "pending" &&
              emailReservation.claimedByUid !== user.uid)
          ) {
            const error = new HttpError(
              403,
              "Complete the human verification to create your shop.",
            );
            error.code = "human_verification_required";
            throw error;
          }
        }
        const sessionData = await responseData(
          await registryStub(env).fetch(
            internal("/session", "POST", { uid: user.uid, email: user.email }),
          ),
        );
        if (sessionData.claimedEntry) {
          const claimedShop = await ensureShop(env, sessionData.claimedEntry);
          await updateRegistrySummary(env, claimedShop);
        }
        return { ...user, isAdmin: admin, token: header.slice(7) };
      };

      if (path === "/api/session" && request.method === "GET") {
        const user = await authenticate(),
          entry = await registryLookup(env, "owner", user.uid);
        const shop = entry ? await ensureShop(env, entry) : null;
        if (shop) await updateRegistrySummary(env, shop);
        return decorateResponse(
          json({
            user: { uid: user.uid, email: user.email },
            shop,
            isAdmin: user.isAdmin,
          }),
          origin,
          env,
        );
      }
      if (path === "/api/shops" && request.method === "POST") {
        const user = await authenticate(),
          input = createInput(await readJson(request, 4096));
        const { entry } = await responseData(
          await registryStub(env).fetch(
            internal("/create", "POST", { ownerUid: user.uid, input }),
          ),
        );
        const shop = await ensureShop(env, entry);
        await updateRegistrySummary(env, shop);
        return decorateResponse(json({ shop }, 201), origin, env);
      }
      if (path === "/api/admin/users" && request.method === "GET") {
        const user = await authenticate();
        requireValue(user.isAdmin, "Administrator access is required.", 403);
        const params = new URLSearchParams();
        for (const key of ["q", "status", "cursor", "limit"])
          if (url.searchParams.has(key))
            params.set(key, url.searchParams.get(key));
        return decorateResponse(
          json(
            await responseData(
              await registryStub(env).fetch(internal("/users?" + params)),
            ),
          ),
          origin,
          env,
        );
      }
      if (path === "/api/admin/reservations") {
        const user = await authenticate();
        requireValue(user.isAdmin, "Administrator access is required.", 403);
        requireValue(
          ["GET", "POST"].includes(request.method),
          "Not found.",
          404,
        );
        if (request.method === "GET") {
          return decorateResponse(
            json(
              await responseData(
                await registryStub(env).fetch(internal("/reservations")),
              ),
            ),
            origin,
            env,
          );
        }
        requireValue(
          Number.isFinite(user.authTime) &&
            Date.now() / 1000 - user.authTime < 600 &&
            user.authTime <= Date.now() / 1000 + 60,
          "Sign in again before creating or changing a reservation.",
          401,
        );
        const body = await readJson(request, 2 * 1024 * 1024);
        object(body, "Reservation", [
          "operationId",
          "email",
          "input",
          "draft",
          "media",
        ]);
        requireValue(
          /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(
            body.operationId || "",
          ),
          "A valid reservation operation ID is required.",
        );
        const email = normalizeEmail(body.email, "Owner email");
        const input = createInput(body.input);
        const mediaList = [];
        const mediaIds = new Set();
        if (body.media !== undefined) {
          requireValue(
            Array.isArray(body.media) && body.media.length <= 18,
            "Seed media may include at most 18 images.",
          );
          for (const item of body.media) {
            object(item, "Seed image", ["id", "kind", "mime", "base64"]);
            requireValue(
              /^img_[a-f0-9]{64}$/.test(item.id || "") &&
                ["logo", "cover", "hero"].includes(item.kind) &&
                typeof item.mime === "string" &&
                typeof item.base64 === "string" &&
                item.base64.length > 0 &&
                item.base64.length <= 360000 &&
                /^[A-Za-z0-9+/]+={0,2}$/.test(item.base64),
              "Each seed image requires a valid ID, kind, MIME type, and base64 payload.",
            );
            requireValue(
              !mediaIds.has(item.id),
              "Duplicate seed image IDs are not allowed.",
            );
            let decoded;
            try {
              decoded = Uint8Array.from(atob(item.base64), (c) =>
                c.charCodeAt(0),
              );
            } catch {
              throw new HttpError(400, "Invalid base64 image payload.");
            }
            const image = await readImage(
              new Request("https://internal/media", {
                method: "POST",
                headers: { "Content-Type": item.mime },
                body: decoded,
              }),
              item.kind,
            );
            const digest = [
              ...new Uint8Array(
                await crypto.subtle.digest("SHA-256", image.bytes),
              ),
            ]
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");
            requireValue(
              "img_" + digest === item.id,
              "Seed image ID must match its SHA-256 content digest.",
            );
            mediaIds.add(item.id);
            mediaList.push({
              id: item.id,
              kind: item.kind,
              mime: image.mime,
              base64: item.base64,
            });
          }
        }
        let draft;
        if (body.draft !== undefined) {
          const catalog = await loadCatalog(env);
          draft = validateDraft(body.draft, catalog);
          requireValue(
            draft.preset === input.preset,
            "Seed draft preset must match the reservation input.",
          );
          for (const refId of mediaReferences(draft)) {
            requireValue(
              mediaIds.has(refId),
              "Every image referenced in the seed draft must be included in the seed media array.",
            );
          }
        }
        const fingerprint = [
          ...new Uint8Array(
            await crypto.subtle.digest(
              "SHA-256",
              new TextEncoder().encode(
                JSON.stringify({
                  email,
                  input,
                  draft: draft || null,
                  mediaIds: [...mediaIds].sort(),
                }),
              ),
            ),
          ),
        ]
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const reserved = await responseData(
          await registryStub(env).fetch(
            internal("/reserve", "POST", {
              operationId: body.operationId.toLowerCase(),
              fingerprint,
              actorUid: user.uid,
              email,
              input,
            }),
          ),
        );
        let shop = await ensureShop(env, reserved.entry);
        if (
          (draft || mediaList.length > 0) &&
          shop.ownerUid.startsWith("pending:")
        ) {
          const seeded = await responseData(
            await shopStub(env, reserved.entry.id).fetch(
              internal(
                "/seed",
                "POST",
                {
                  operationId: body.operationId.toLowerCase(),
                  actorUid: user.uid,
                  draft,
                  media: mediaList,
                },
                reserved.entry.ownerUid,
              ),
            ),
          );
          shop = seeded.shop;
        }
        await updateRegistrySummary(env, shop);
        return decorateResponse(
          json(
            {
              reservation: reserved.reservation,
              shop,
              replayed: reserved.replayed,
            },
            reserved.replayed ? 200 : 201,
          ),
          origin,
          env,
        );
      }
      if (
        path === "/api/admin/reservations/cancel" &&
        request.method === "POST"
      ) {
        const user = await authenticate();
        requireValue(user.isAdmin, "Administrator access is required.", 403);
        requireValue(
          Number.isFinite(user.authTime) &&
            Date.now() / 1000 - user.authTime < 600 &&
            user.authTime <= Date.now() / 1000 + 60,
          "Sign in again before creating or changing a reservation.",
          401,
        );
        const body = await readJson(request, 4096);
        object(body, "Cancel reservation", ["email"]);
        const email = normalizeEmail(body.email, "Owner email");
        const data = await responseData(
          await registryStub(env).fetch(
            internal("/reserve/cancel", "POST", { email }),
          ),
        );
        return decorateResponse(json(data), origin, env);
      }
      const activationAdmin = path.match(
        /^\/api\/admin\/shops\/(sh_[a-f0-9]{32})\/activation$/,
      );
      if (activationAdmin) {
        const user = await authenticate();
        requireValue(user.isAdmin, "Administrator access is required.", 403);
        requireValue(
          ["GET", "POST"].includes(request.method),
          "Not found.",
          404,
        );
        if (request.method === "POST")
          requireValue(
            Number.isFinite(user.authTime) &&
              Date.now() / 1000 - user.authTime < 600 &&
              user.authTime <= Date.now() / 1000 + 60,
            "Sign in again before recording a payment or changing access.",
            401,
          );
        const entry = await registryLookup(env, "id", activationAdmin[1]);
        requireValue(entry, "Shop not found.", 404);
        const body =
          request.method === "POST" ? await readJson(request, 4096) : undefined;
        const call = internal("/activation", request.method, body);
        call.headers.set("X-Platform-Admin", "verified");
        call.headers.set("X-Admin-Uid", user.uid);
        const data = await responseData(
          await shopStub(env, entry.id).fetch(call),
        );
        if (data.shop) await updateRegistrySummary(env, data.shop);
        return decorateResponse(json(data), origin, env);
      }
      const adminReadiness = path.match(
        /^\/api\/admin\/shops\/(sh_[a-f0-9]{32})\/readiness$/,
      );
      if (adminReadiness && request.method === "GET") {
        const user = await authenticate();
        requireValue(user.isAdmin, "Administrator access is required.", 403);
        const entry = await registryLookup(env, "id", adminReadiness[1]);
        requireValue(entry, "Shop not found.", 404);
        return decorateResponse(
          json(
            await responseData(
              await shopStub(env, entry.id).fetch(
                internal("/readiness", "GET", undefined, entry.ownerUid),
              ),
            ),
          ),
          origin,
          env,
        );
      }
      const adminRequests = path.match(
        /^\/api\/admin\/shops\/(sh_[a-f0-9]{32})\/requests(?:\/(rq_[a-f0-9]{32}))?$/,
      );
      if (adminRequests && request.method === "GET") {
        const user = await authenticate();
        requireValue(user.isAdmin, "Administrator access is required.", 403);
        const entry = await registryLookup(env, "id", adminRequests[1]);
        requireValue(entry, "Shop not found.", 404);
        return decorateResponse(
          json(
            await responseData(
              await shopStub(env, entry.id).fetch(
                internal(
                  "/requests" +
                    (adminRequests[2] ? "/" + adminRequests[2] : "") +
                    url.search,
                  "GET",
                  undefined,
                  entry.ownerUid,
                ),
              ),
            ),
          ),
          origin,
          env,
        );
      }
      const adminMatch = path.match(
        /^\/api\/admin\/shops\/(sh_[a-f0-9]{32})(?:\/media\/(img_[a-f0-9]{64}|slot-[1-5]))?$/,
      );
      if (adminMatch && request.method === "GET") {
        const user = await authenticate();
        requireValue(user.isAdmin, "Administrator access is required.", 403);
        const entry = await registryLookup(env, "id", adminMatch[1]);
        requireValue(entry, "Shop not found.", 404);
        const shop = await ensureShop(env, entry);
        if (adminMatch[2]) {
          const image = await shopStub(env, entry.id).fetch(
            internal(
              "/media/" + adminMatch[2],
              "GET",
              undefined,
              entry.ownerUid,
            ),
          );
          return decorateResponse(image, origin, env);
        }
        const account = await responseData(
          await registryStub(env).fetch(
            internal("/user?uid=" + encodeURIComponent(entry.ownerUid)),
          ),
        );
        return decorateResponse(
          json({ shop, user: account.user }),
          origin,
          env,
        );
      }
      const notificationRoute = path.match(
        /^\/api\/shops\/(sh_[a-f0-9]{32})\/notifications$/,
      );
      if (notificationRoute) {
        const actor = await authenticate(),
          entry = await registryLookup(env, "id", notificationRoute[1]);
        requireValue(entry?.ownerUid === actor.uid, "Shop not found.", 404);
        requireValue(
          ["GET", "PUT", "PATCH", "POST"].includes(request.method),
          "Not found.",
          404,
        );
        const body =
          request.method === "GET" ? undefined : await readJson(request, 4096);
        if (request.method === "PUT") {
          object(body, "Notification settings", ["enabled"]);
          body.actorEmail = actor.email;
        }
        const data = await responseData(
          await shopStub(env, entry.id).fetch(
            internal("/notifications", request.method, body, actor.uid),
          ),
        );
        return decorateResponse(json(data), origin, env);
      }
      const commerceRoute = path.match(
        /^\/api\/shops\/(sh_[a-f0-9]{32})\/(commerce|checkout\/(quote|status|pay|cancel|merchant))$/,
      );
      if (commerceRoute) {
        const privateRoute =
          commerceRoute[2] === "commerce" || commerceRoute[3] === "merchant";
        const actor = privateRoute ? await authenticate() : null;
        const entry = await registryLookup(env, "id", commerceRoute[1]);
        requireValue(entry, "Shop not found.", 404);
        if (privateRoute)
          requireValue(actor.uid === entry.ownerUid, "Shop not found.", 404);
        if (commerceRoute[2] === "commerce") {
          requireValue(
            ["GET", "PUT"].includes(request.method),
            "Not found.",
            404,
          );
          const body =
            request.method === "PUT"
              ? await readJson(request, 16384)
              : undefined;
          const data = await responseData(
            await shopStub(env, entry.id).fetch(
              internal("/commerce", request.method, body, entry.ownerUid),
            ),
          );
          return decorateResponse(json(data), origin, env);
        }
        if (commerceRoute[3] === "merchant") {
          requireValue(request.method === "GET", "Not found.", 404);
          const data = await responseData(
            await shopStub(env, entry.id).fetch(
              internal(
                "/checkout/merchant",
                "POST",
                { cursor: url.searchParams.get("cursor") || undefined },
                entry.ownerUid,
              ),
            ),
          );
          return decorateResponse(json(data), origin, env);
        }
        requireValue(request.method === "POST", "Not found.", 404);
        const token = request.headers.get("X-Order-Token");
        requireValue(
          /^[A-Za-z0-9_-]{43}$/.test(token || ""),
          "This order link is not authorised.",
          403,
        );
        const body = await readJson(request, 4096);
        object(
          body,
          "Payment request",
          commerceRoute[3] === "quote"
            ? ["requestId"]
            : commerceRoute[3] === "pay"
              ? ["orderId", "revision", "choice"]
              : ["orderId"],
        );
        if (commerceRoute[3] === "quote")
          requireValue(
            /^rq_[a-f0-9]{32}$/.test(body.requestId || ""),
            "Invalid request reference.",
          );
        const ipBucket = (
          await secureHash(
            entry.id +
              ":" +
              (request.headers.get("CF-Connecting-IP") || "unknown"),
          )
        ).slice(0, 3);
        const data = await responseData(
          await shopStub(env, entry.id).fetch(
            internal(
              "/checkout/" + commerceRoute[3],
              "POST",
              { ...body, token, ipBucket },
              entry.ownerUid,
            ),
          ),
        );
        return decorateResponse(json(data), origin, env);
      }
      const publicMatch = path.match(
        /^\/api\/public\/shops\/([a-z0-9-]{3,48})$/,
      );
      if (publicMatch && request.method === "GET") {
        const entry = await registryLookup(env, "slug", publicMatch[1]);
        requireValue(entry, "Shop not found.", 404);
        const { shop } = await responseData(
          await shopStub(env, entry.id).fetch(internal("/snapshot")),
        );
        return decorateResponse(
          json({ shop: publicShop(shop, env) }),
          origin,
          env,
        );
      }
      const match = path.match(
        /^\/api\/shops\/(?:resolve\/([a-z0-9-]{3,48})|(sh_[a-f0-9]{32}|[a-z0-9-]{3,48}))(?:\/(draft|readiness|media(?:\/(img_[a-f0-9]{64}|slot-[1-5]))?|publish|billing\/(?:checkout|status|portal|activation-request)|square\/(?:connect|status|verify|location|disconnect)|products(?:\/([a-zA-Z0-9_-]{1,80}))?|requests(?:\/(rq_[a-f0-9]{32}))?))?$/,
      );
      if (!match) throw new HttpError(404, "Not found.");
      const value = match[1] || match[2],
        operation = match[3],
        mediaId = match[4];
      const requestId = match[6];
      const requestRead =
        operation?.startsWith("requests") && request.method === "GET";
      // Request history is private even when the storefront is public. Avoid
      // looking up a tenant for anonymous history probes.
      if (
        (requestRead ||
          operation === "readiness" ||
          operation?.startsWith("square/")) &&
        !request.headers.has("Authorization")
      )
        throw new HttpError(404, "Shop not found.");
      // Authenticate before allocating or querying tenant objects for every private
      // operation. A public read can only expose an entitled published snapshot.
      const privateOperation =
        !(operation === "requests" && request.method === "POST") &&
        (request.method !== "GET" || request.headers.has("Authorization"));
      const user = privateOperation ? await authenticate() : null;
      const entry = await registryLookup(
        env,
        value.startsWith("sh_") ? "id" : "slug",
        value,
      );
      requireValue(entry, "Shop not found.", 404);
      const owner = user?.uid === entry.ownerUid;
      const adminMedia =
        (operation?.startsWith("media/") ||
          requestRead ||
          operation === "readiness") &&
        user &&
        !owner &&
        (await verifyAdmin(user, user.token, env));
      if (privateOperation)
        requireValue(owner || adminMedia, "Shop not found.", 404);
      let shop;
      if (owner) shop = await ensureShop(env, entry);
      else
        shop = (
          await responseData(
            await shopStub(env, entry.id).fetch(internal("/snapshot")),
          )
        ).shop;

      if (request.method === "GET" && !operation)
        return decorateResponse(
          json({ shop: owner ? shop : publicShop(shop, env) }),
          origin,
          env,
        );
      if (request.method === "GET" && operation === "readiness") {
        requireValue(owner || adminMedia, "Shop not found.", 404);
        return decorateResponse(
          json(
            await responseData(
              await shopStub(env, entry.id).fetch(
                internal("/readiness", "GET", undefined, entry.ownerUid),
              ),
            ),
          ),
          origin,
          env,
        );
      }
      if (operation?.startsWith("requests")) {
        if (request.method === "GET") {
          requireValue(owner || adminMedia, "Shop not found.", 404);
          return decorateResponse(
            json(
              await responseData(
                await shopStub(env, entry.id).fetch(
                  internal(
                    "/requests" +
                      (requestId ? "/" + requestId : "") +
                      url.search,
                    "GET",
                    undefined,
                    entry.ownerUid,
                  ),
                ),
              ),
            ),
            origin,
            env,
          );
        }
        if (requestId && request.method === "PATCH") {
          requireValue(owner, "Shop not found.", 404);
          const update = requestUpdate(await readJson(request, 8192));
          return decorateResponse(
            json(
              await responseData(
                await shopStub(env, entry.id).fetch(
                  internal("/requests/" + requestId, "PATCH", update, user.uid),
                ),
              ),
            ),
            origin,
            env,
          );
        }
        if (!requestId && request.method === "POST") {
          const profile = publicShop(shop, env);
          const body = await readJson(request, 160 * 1024);
          object(body, "Customer request", [
            "requestKey",
            "kind",
            "productId",
            "design",
            "cardId",
            "customer",
            "fulfillment",
            "publishedVersion",
            "accessToken",
            "preview",
            "asListed",
          ]);
          if (body.publishedVersion !== undefined)
            requireValue(
              Number.isSafeInteger(body.publishedVersion) &&
                body.publishedVersion > 0,
              "A valid published shop version is required.",
            );
          requireValue(
            typeof body.requestKey === "string" &&
              /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(
                body.requestKey,
              ),
            "A valid request key is required.",
          );
          requireValue(
            ["product", "design"].includes(body.kind),
            "Choose a fixed product or bouquet design to request.",
          );
          let design, pricing, card;
          requireValue(
            body.asListed === undefined || typeof body.asListed === "boolean",
            "Choose a valid bouquet order.",
          );
          const preview = await orderPreview(body.preview);
          if (body.kind === "product") {
            const product = profile.draft.products.find(
              (item) =>
                item.id === body.productId &&
                item.available &&
                Number.isSafeInteger(item.priceCents),
            );
            requireValue(product, "This product is unavailable.", 409);
            requireValue(
              body.design === undefined &&
                body.cardId === undefined &&
                !body.asListed,
              "Fixed products cannot contain a custom design.",
            );
          } else {
            requireValue(
              body.productId === undefined,
              "Custom bouquet requests cannot contain a fixed product.",
            );
            if (body.cardId !== undefined && body.cardId !== null) {
              card = profile.draft.collection.find(
                (item) => item.id === body.cardId && item.available,
              );
              requireValue(card, "This bouquet is unavailable.", 409);
            } else
              requireValue(
                profile.draft.home.sections.includes("builder"),
                "The open builder is unavailable.",
                409,
              );
            if (body.asListed)
              requireValue(
                card && body.design === undefined && body.preview === undefined,
                "Choose a saved bouquet to order as listed.",
              );
            const raw = boundedDesign(
              body.asListed ? card.design : body.design,
            );
            requireValue(
              raw && raw.items?.length > 0,
              "Add at least one flower before requesting a bouquet.",
            );
            design = raw;
            // Authoritative semantic validation and pricing execute inside the
            // shop Durable Object rather than the edge request's free CPU budget.
          }
          object(body.customer, "Customer", [
            "name",
            "phone",
            "note",
            "date",
            "address",
            "postalCode",
            "country",
            "recipient",
          ]);
          const address = text(
            body.customer.address ?? "",
            "Delivery address",
            200,
          );
          const customer = {
            name: text(body.customer.name, "Name", 80, true),
            phone: text(body.customer.phone, "Phone", 40, true),
            note: multilineText(body.customer.note ?? "", "Note", 1000),
            date: body.customer.date ?? null,
            ...(address ? { address } : {}),
            ...(body.customer.postalCode
              ? {
                  postalCode: text(body.customer.postalCode, "Postal code", 20),
                }
              : {}),
            ...(body.customer.country
              ? { country: text(body.customer.country, "Delivery country", 2) }
              : {}),
          };
          if (body.customer.recipient !== undefined) {
            object(body.customer.recipient, "Recipient", [
              "name",
              "phone",
              "message",
            ]);
            customer.recipient = {
              name: text(
                body.customer.recipient.name,
                "Recipient name",
                80,
                true,
              ),
              phone: text(
                body.customer.recipient.phone || "",
                "Recipient phone",
                40,
              ),
              message: multilineText(
                body.customer.recipient.message || "",
                "Gift message",
                500,
              ),
            };
          }
          requireValue(
            customer.date === null ||
              (typeof customer.date === "string" &&
                /^\d{4}-\d{2}-\d{2}$/.test(customer.date) &&
                !Number.isNaN(Date.parse(customer.date + "T00:00:00Z")) &&
                new Date(customer.date + "T00:00:00Z")
                  .toISOString()
                  .slice(0, 10) === customer.date),
            "Choose a valid requested date.",
          );
          requireValue(
            ["pickup", "delivery"].includes(body.fulfillment),
            "Choose pickup or delivery.",
          );
          const hash = async (value) =>
            [
              ...new Uint8Array(
                await crypto.subtle.digest(
                  "SHA-256",
                  new TextEncoder().encode(value),
                ),
              ),
            ]
              .map((part) => part.toString(16).padStart(2, "0"))
              .join("");
          const accessHash =
            body.accessToken === undefined
              ? null
              : (requireValue(
                  /^[A-Za-z0-9_-]{43}$/.test(body.accessToken),
                  "Invalid request access token.",
                ),
                await secureHash(entry.id + ":" + body.accessToken));
          const fingerprint = await hash(
            JSON.stringify({
              kind: body.kind,
              productId: body.productId,
              cardId: card?.id || null,
              design,
              ...(preview ? { preview } : {}),
              ...(body.asListed ? { asListed: true } : {}),
              customer,
              fulfillment: body.fulfillment,
              accessHash,
            }),
          );
          // A fixed 4096-bucket hash space bounds rate-limit rows per shop and
          // keeps customer network addresses out of the request ledger.
          const ipBucket = (
            await hash(
              entry.id +
                ":" +
                (request.headers.get("CF-Connecting-IP") || "unknown"),
            )
          ).slice(0, 3);
          const data = await responseData(
            await shopStub(env, entry.id).fetch(
              internal(
                "/requests",
                "POST",
                {
                  requestKey: body.requestKey,
                  kind: body.kind,
                  productId: body.productId,
                  cardId: card?.id || null,
                  design,
                  preview,
                  asListed: body.asListed === true,
                  pricing,
                  publishedVersion: body.publishedVersion ?? profile.version,
                  customer,
                  fulfillment: body.fulfillment,
                  fingerprint,
                  accessHash,
                  ipBucket,
                },
                entry.ownerUid,
              ),
            ),
          );
          const receipt = {
            id: data.request.id,
            status: data.request.status,
            totalCents: data.request.totalCents,
            currency: data.request.currency,
            summary: data.request.summary,
            pricingNote:
              "Unpaid request. Tax and delivery charges are confirmed by the florist.",
          };
          const phone = profile.draft.phone.replace(/\D/g, "");
          const message = `Request ${receipt.id}: ${receipt.summary}. ${new Intl.NumberFormat("en", { style: "currency", currency: receipt.currency }).format(receipt.totalCents / 100)} before confirmed tax/delivery. ${customer.name}, ${customer.phone}. ${body.fulfillment}${customer.address ? " (" + customer.address + ")" : ""}${customer.date ? ". Date: " + customer.date : ""}${customer.note ? ". " + customer.note : ""}. This is an unpaid request. View saved bouquet (florist sign-in): ${new URL("/dashboard/orders?request=" + receipt.id, env.CANONICAL_ORIGIN || env.PUBLIC_ORIGIN).href}`;
          const channel = profile.draft.requestChannel || "whatsapp";
          const whatsappUrl =
            channel !== "sms" && /^\d{8,15}$/.test(phone)
              ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
              : null;
          const smsUrl =
            channel !== "whatsapp" && /^\d{8,15}$/.test(phone)
              ? `sms:+${phone}?body=${encodeURIComponent(message)}`
              : null;
          return decorateResponse(
            json({ request: receipt, whatsappUrl, smsUrl }, 201),
            origin,
            env,
          );
        }
      }
      if (operation === "draft" && request.method === "PUT") {
        const body = await readJson(request, REQUEST_LIMIT);
        object(body, "Save request", ["version", "draft"]);
        requireValue(
          Number.isSafeInteger(body.version) && body.version > 0,
          "A valid draft version is required.",
        );
        const draft = validateDraft(body.draft, await loadCatalog(env), {
          semantic: false,
        });
        const result = await shopStub(env, entry.id).fetch(
          internal("/draft", "PUT", { version: body.version, draft }, user.uid),
        );
        const data = await responseData(result);
        await updateRegistrySummary(env, data.shop);
        return decorateResponse(json(data), origin, env);
      }
      if (operation === "media" && request.method === "POST") {
        const slot = url.searchParams.get("slot"),
          kind = url.searchParams.get("kind");
        requireValue(
          /^(?:[1-9]|1[0-8])$/.test(slot || "") &&
            ["logo", "cover", "hero"].includes(kind),
          "Choose an image slot from 1 to 18 and a logo, cover, or hero image.",
        );
        requireValue(
          [...url.searchParams.keys()].every((key) =>
            ["slot", "kind"].includes(key),
          ) && [...url.searchParams].length === 2,
          "Invalid media upload parameters.",
        );
        const image = await readImage(request, kind),
          hash = new Uint8Array(
            await crypto.subtle.digest("SHA-256", image.bytes),
          ),
          id =
            "img_" +
            [...hash]
              .map((value) => value.toString(16).padStart(2, "0"))
              .join("");
        await responseData(
          await shopStub(env, entry.id).fetch(
            new Request("https://internal/media/" + id, {
              method: "PUT",
              headers: {
                "Content-Type": image.mime,
                "X-Owner-Uid": user.uid,
                "X-Media-Kind": kind,
              },
              body: image.bytes,
            }),
          ),
        );
        return decorateResponse(
          json(
            { media: { id, url: `/api/shops/${entry.id}/media/${id}` } },
            201,
          ),
          origin,
          env,
        );
      }
      if (
        operation?.startsWith("media/") &&
        mediaId &&
        request.method === "GET"
      ) {
        if (!owner && !adminMedia) {
          const published = publicShop(shop, env);
          const refs = mediaReferences(published.draft);
          requireValue(refs.includes(mediaId), "Image not found.", 404);
        }
        // Internal authorization always comes from the verified registry owner;
        // public media reaches this point only through the entitlement gate above.
        const result = await shopStub(env, entry.id).fetch(
          internal("/media/" + mediaId, "GET", undefined, entry.ownerUid),
        );
        if (!result.ok) await responseData(result);
        if (!owner && !adminMedia && /^img_/.test(mediaId)) {
          const headers = new Headers(result.headers);
          // Keep the entitlement gate ahead of all storage reads; browser caching
          // may reuse immutable bytes, but no shared cache can bypass revocation.
          headers.set("Cache-Control", "private, max-age=300, immutable");
          return decorateResponse(
            new Response(result.body, { status: result.status, headers }),
            origin,
            env,
          );
        }
        return decorateResponse(result, origin, env);
      }
      if (operation?.startsWith("products") && request.method === "GET") {
        const profile = owner ? shop : publicShop(shop, env);
        const products = profile.draft.products.filter(
          (item) => owner || (item.available && item.priceCents !== null),
        );
        if (match[5]) {
          const product = products.find((item) => item.id === match[5]);
          requireValue(product, "Product not found.", 404);
          return decorateResponse(
            json({ product, currency: profile.draft.currency }),
            origin,
            env,
          );
        }
        return decorateResponse(
          json({ products, currency: profile.draft.currency }),
          origin,
          env,
        );
      }
      if (
        operation?.startsWith("billing/") &&
        ["GET", "POST"].includes(request.method)
      ) {
        let body;
        if (request.method === "POST") {
          const input = await readJson(request, 4096);
          object(
            input,
            "Billing request",
            operation === "billing/activation-request"
              ? ["customDomainInterest"]
              : ["planId"],
          );
          body = {
            ...(operation === "billing/activation-request"
              ? input
              : {
                  actor: { uid: user.uid, email: user.email },
                  planId: input.planId || "shop",
                }),
          };
        }
        const result = await shopStub(env, entry.id).fetch(
          internal("/" + operation, request.method, body, user.uid),
        );
        const data = await responseData(result);
        if (data.shop) await updateRegistrySummary(env, data.shop);
        return decorateResponse(json(data), origin, env);
      }
      if (operation === "publish" && request.method === "POST") {
        requireValue(
          env.PUBLISHING_ENABLED === "true",
          "Publishing is unavailable until platform setup is complete.",
          409,
        );
        requireValue(
          entitled(shop),
          "Publishing is unavailable until a verified active subscription is available.",
          409,
        );
        const input = await readJson(request, 4096);
        object(input, "Publish request", ["version"]);
        requireValue(
          Number.isSafeInteger(input.version) && input.version > 0,
          "A valid draft version is required.",
        );
        const data = await responseData(
          await shopStub(env, entry.id).fetch(
            internal("/publish", "POST", { version: input.version }, user.uid),
          ),
        );
        await updateRegistrySummary(env, data.shop);
        return decorateResponse(json(data), origin, env);
      }
      if (operation?.startsWith("square/")) {
        requireValue(owner, "Shop not found.", 404);
        if (request.method === "GET" && operation === "square/status") {
          const result = await shopStub(env, entry.id).fetch(
            internal("/square/status", "GET", undefined, user.uid),
          );
          if (!result.ok) await responseData(result);
          return decorateResponse(result, origin, env);
        }
        requireValue(
          request.method === "POST" && operation !== "square/status",
          "Not found.",
          404,
        );
        if (operation === "square/connect")
          requireValue(
            entitled(shop),
            "An active paid subscription is required before connecting Square.",
            409,
          );
        const body = await readJson(request, 4096);
        object(
          body,
          "Square request",
          operation === "square/location" ? ["locationId"] : [],
        );
        const result = await shopStub(env, entry.id).fetch(
          internal(
            "/" + operation,
            "POST",
            {
              actor: { uid: user.uid, authTime: user.authTime },
              ...(operation === "square/location"
                ? { locationId: text(body.locationId, "Location", 191, true) }
                : {}),
            },
            user.uid,
          ),
        );
        if (!result.ok) await responseData(result);
        return decorateResponse(result, origin, env);
      }
      throw new HttpError(404, "Not found.");
    } catch (error) {
      return decorateResponse(
        json(
          {
            ...(error.code === "human_verification_required"
              ? { code: error.code }
              : {}),
            error:
              error instanceof HttpError
                ? error.message
                : "The service is temporarily unavailable.",
          },
          error instanceof HttpError ? error.status : 500,
        ),
        origin,
        env,
      );
    }
  };
}

export default { fetch: makeHandler() };
