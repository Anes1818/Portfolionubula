import {
  HttpError,
  requireValue,
  readJson,
  verifyFirebase,
} from "../rays-payments/security.mjs";
import { ShopRegistry, ShopStore, json } from "./stores.mjs";
import {
  createInput,
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
      shop.subscription.testEnvironment === (env.LEMON_TEST_MODE === "true") &&
      (env.LEMON_TEST_MODE !== "true" ||
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
    features: { requestsEnabled: true, checkoutEnabled: false },
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
    subscriptionStatus: shop.subscription?.status || "inactive",
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
    headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
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
      if (!path.startsWith("/api/")) {
        requireValue(
          env.ASSETS?.fetch,
          "The application is temporarily unavailable.",
          503,
        );
        const assetUrl = new URL(url);
        if (
          path === "/" ||
          /^\/login\/?$/.test(path) ||
          /^\/dashboard(?:\/(shop|prices|collection|products|editor|billing|payments|orders))?\/?$/.test(
            path,
          ) ||
          /^\/s\/[a-z0-9-]+\/?$/.test(path) ||
          /^\/admin\/?$/.test(path)
        )
          assetUrl.pathname = "/index.html";
        return decorateResponse(
          await env.ASSETS.fetch(new Request(assetUrl, request)),
          null,
          env,
        );
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
          result = "sandbox_connected";
        } catch {}
        return decorateResponse(
          new Response(null, {
            status: 303,
            headers: {
              Location: new URL(
                "/dashboard/payments?square=" + result,
                env.CANONICAL_ORIGIN || env.PUBLIC_ORIGIN || PUBLIC_ORIGIN,
              ).href,
              "Set-Cookie": clearSquareCookie(),
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
            checkoutEnabled: false,
            squareConnectionEnabled: squareSandboxConfigured(env),
            squareEnvironment: "sandbox",
            publishingEnabled:
              env.PUBLISHING_ENABLED === "true" &&
              billingPublicConfig(env).billingEnabled,
            providers: {
              billing: billingPublicConfig(env).billingEnabled
                ? "test"
                : "pending_setup",
              square: "pending_setup",
            },
          }),
          origin,
          env,
        );
      if (request.method === "GET" && path === "/api/config")
        return decorateResponse(
          json({
            firebase: publicFirebase,
            stage: "private_beta",
            signupMode:
              env.PUBLIC_SIGNUPS === "true" ? "open-beta" : "private-beta",
            ...billingPublicConfig(env),
            squareConnectionEnabled: squareSandboxConfigured(env),
            squareEnvironment: "sandbox",
            branding: {
              name: "Nebula",
              hostedOrigin:
                env.CANONICAL_ORIGIN || env.PUBLIC_ORIGIN || PUBLIC_ORIGIN,
            },
            checkoutEnabled: false,
            publishingEnabled:
              env.PUBLISHING_ENABLED === "true" &&
              billingPublicConfig(env).billingEnabled,
          }),
          origin,
          env,
        );
      if (request.method === "GET" && path === "/api/catalog")
        return decorateResponse(json(await loadCatalog(env)), origin, env);

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
        requireValue(
          env.PUBLIC_SIGNUPS === "true" ||
            invited.includes(user.email.toLowerCase()) ||
            admin,
          "Private beta access is limited to invited accounts.",
          403,
        );
        await responseData(
          await registryStub(env).fetch(
            internal("/session", "POST", { uid: user.uid, email: user.email }),
          ),
        );
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
        /^\/api\/shops\/(?:resolve\/([a-z0-9-]{3,48})|(sh_[a-f0-9]{32}|[a-z0-9-]{3,48}))(?:\/(draft|readiness|media(?:\/(img_[a-f0-9]{64}|slot-[1-5]))?|publish|billing\/(?:checkout|status|portal)|square\/(?:connect|status|verify|location|disconnect)|products(?:\/([a-zA-Z0-9_-]{1,80}))?|requests(?:\/(rq_[a-f0-9]{32}))?))?$/,
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
          const body = await readJson(request, 32 * 1024);
          object(body, "Customer request", [
            "requestKey",
            "kind",
            "productId",
            "design",
            "cardId",
            "customer",
            "fulfillment",
            "publishedVersion",
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
          if (body.kind === "product") {
            const product = profile.draft.products.find(
              (item) =>
                item.id === body.productId &&
                item.available &&
                Number.isSafeInteger(item.priceCents),
            );
            requireValue(product, "This product is unavailable.", 409);
            requireValue(
              body.design === undefined && body.cardId === undefined,
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
            const raw = boundedDesign(body.design);
            requireValue(
              raw && raw.items?.length > 0,
              "Add at least one flower before requesting a bouquet.",
            );
            design = raw;
            // Authoritative semantic validation and pricing execute inside the
            // shop Durable Object rather than the edge request's free CPU budget.
          }
          object(body.customer, "Customer", ["name", "phone", "note", "date"]);
          const customer = {
            name: text(body.customer.name, "Name", 80, true),
            phone: text(body.customer.phone, "Phone", 40, true),
            note: multilineText(body.customer.note ?? "", "Note", 1000),
            date: body.customer.date ?? null,
          };
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
          const fingerprint = await hash(
            JSON.stringify({
              kind: body.kind,
              productId: body.productId,
              cardId: card?.id || null,
              design,
              customer,
              fulfillment: body.fulfillment,
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
                  pricing,
                  publishedVersion: body.publishedVersion ?? profile.version,
                  customer,
                  fulfillment: body.fulfillment,
                  fingerprint,
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
          const whatsappUrl = /^\d{8,15}$/.test(phone)
            ? `https://wa.me/${phone}?text=${encodeURIComponent(`Request ${receipt.id}: ${receipt.summary}. ${customer.name}, ${customer.phone}. ${body.fulfillment}. This is an unpaid request.`)}`
            : null;
          return decorateResponse(
            json({ request: receipt, whatsappUrl }, 201),
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
          object(input, "Billing request", ["planId"]);
          body = {
            actor: { uid: user.uid, email: user.email },
            planId: input.planId || "shop",
          };
        }
        const result = await shopStub(env, entry.id).fetch(
          internal("/" + operation, request.method, body, user.uid),
        );
        return decorateResponse(json(await responseData(result)), origin, env);
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
