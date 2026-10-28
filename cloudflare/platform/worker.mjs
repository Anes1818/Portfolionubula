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
} from "./validation.mjs";
export { ShopRegistry, ShopStore };

const PUBLIC_ORIGIN = "https://nebula.aneslaidaoui06.workers.dev";
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

function publicShop(shop) {
  // No route currently writes either entitlement or published data. Future provider
  // work must implement verified server webhooks before this gate can open.
  requireValue(
    shop.published &&
      shop.subscription.status === "active" &&
      shop.square.status === "connected",
    "Shop not found.",
    404,
  );
  return {
    id: shop.id,
    slug: shop.slug,
    version: shop.published.version,
    draft: shop.published.draft,
    published: { version: shop.published.version },
    readiness: [],
  };
}

function decorateResponse(response, origin, env) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
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
    headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
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
} = {}) {
  return async (request, env) => {
    let origin;
    try {
      const url = new URL(request.url),
        path = url.pathname;
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
          /^\/dashboard(?:\/(shop|prices|collection|billing|payments))?\/?$/.test(
            path,
          ) ||
          /^\/s\/[a-z0-9-]+\/?$/.test(path)
        )
          assetUrl.pathname = "/index.html";
        return decorateResponse(
          await env.ASSETS.fetch(new Request(assetUrl, request)),
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
            billingEnabled: false,
            checkoutEnabled: false,
            publishingEnabled: false,
            providers: { billing: "pending_setup", square: "pending_setup" },
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
            billingEnabled: false,
            checkoutEnabled: false,
            publishingEnabled: false,
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
        const invited = (env.BETA_ACCESS_EMAILS || "")
          .split(",")
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean);
        requireValue(
          env.PUBLIC_SIGNUPS === "true" ||
            invited.includes(user.email.toLowerCase()),
          "Private beta access is limited to invited accounts.",
          403,
        );
        return user;
      };

      if (path === "/api/session" && request.method === "GET") {
        const user = await authenticate(),
          entry = await registryLookup(env, "owner", user.uid);
        return decorateResponse(
          json({
            user: { uid: user.uid, email: user.email },
            shop: entry ? await ensureShop(env, entry) : null,
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
        return decorateResponse(
          json({ shop: await ensureShop(env, entry) }, 201),
          origin,
          env,
        );
      }
      const match = path.match(
        /^\/api\/shops\/(?:resolve\/([a-z0-9-]{3,48})|(sh_[a-f0-9]{32}|[a-z0-9-]{3,48}))(?:\/(draft|media(?:\/(slot-[1-5]))?|publish|billing\/checkout|square\/connect))?$/,
      );
      if (!match) throw new HttpError(404, "Not found.");
      const value = match[1] || match[2],
        operation = match[3],
        mediaId = match[4];
      // Authenticate before allocating or querying tenant objects for every private
      // operation. A public read can only expose an entitled published snapshot.
      const privateOperation =
        request.method !== "GET" || request.headers.has("Authorization");
      const user = privateOperation ? await authenticate() : null;
      const entry = await registryLookup(
        env,
        value.startsWith("sh_") ? "id" : "slug",
        value,
      );
      requireValue(entry, "Shop not found.", 404);
      const owner = user?.uid === entry.ownerUid;
      if (privateOperation) requireValue(owner, "Shop not found.", 404);
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
          json({ shop: owner ? shop : publicShop(shop) }),
          origin,
          env,
        );
      if (operation === "draft" && request.method === "PUT") {
        const body = await readJson(request, 80 * 1024);
        object(body, "Save request", ["version", "draft"]);
        requireValue(
          Number.isSafeInteger(body.version) && body.version > 0,
          "A valid draft version is required.",
        );
        const draft = validateDraft(body.draft, await loadCatalog(env));
        const result = await shopStub(env, entry.id).fetch(
          internal("/draft", "PUT", { version: body.version, draft }, user.uid),
        );
        return decorateResponse(json(await responseData(result)), origin, env);
      }
      if (operation === "media" && request.method === "POST") {
        const slot = url.searchParams.get("slot"),
          kind = url.searchParams.get("kind");
        requireValue(
          /^[1-5]$/.test(slot || "") &&
            kind === (slot === "1" ? "logo" : "cover"),
          "Use slot 1 for a logo or slots 2–5 for covers.",
        );
        requireValue(
          [...url.searchParams.keys()].every((key) =>
            ["slot", "kind"].includes(key),
          ) && [...url.searchParams].length === 2,
          "Invalid media upload parameters.",
        );
        const image = await readImage(request, kind),
          id = "slot-" + slot;
        await responseData(
          await shopStub(env, entry.id).fetch(
            new Request("https://internal/media/" + id, {
              method: "PUT",
              headers: { "Content-Type": image.mime, "X-Owner-Uid": user.uid },
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
        if (!owner) {
          const published = publicShop(shop);
          const refs = [
            published.draft.logoMediaId,
            ...published.draft.collection.map((item) => item.cover),
          ];
          requireValue(refs.includes(mediaId), "Image not found.", 404);
        }
        // Internal authorization always comes from the verified registry owner;
        // public media reaches this point only through the entitlement gate above.
        const result = await shopStub(env, entry.id).fetch(
          internal("/media/" + mediaId, "GET", undefined, entry.ownerUid),
        );
        if (!result.ok) await responseData(result);
        return decorateResponse(result, origin, env);
      }
      if (
        ["publish", "billing/checkout", "square/connect"].includes(operation) &&
        request.method === "POST"
      ) {
        const messages = {
          publish:
            "Publishing is unavailable until subscription billing and Square provider setup are complete.",
          "billing/checkout":
            "Subscription billing provider setup is pending. No checkout session was created.",
          "square/connect":
            "Square provider setup is pending. No payment connection was created.",
        };
        throw new HttpError(409, messages[operation]);
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
