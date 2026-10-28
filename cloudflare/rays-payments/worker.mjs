import { ShopService } from "./shop-service.mjs";
import {
  HttpError,
  requireValue,
  hash,
  readJson,
  verifyFirebase,
  verifyWebhook,
} from "./security.mjs";

const json = (value, status = 200, headers = {}) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      ...headers,
    },
  });
const allowed = (env, shop) =>
  (env.ALLOWED_SHOPS || "raysbouquetz").split(",").includes(shop) &&
  /^[a-z0-9-]{1,60}$/.test(shop);
export class CommerceObject {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.queue = Promise.resolve();
  }
  fetch(request) {
    const task = this.queue.then(() => this.run(request));
    this.queue = task.catch(() => {});
    return task;
  }
  async run(request) {
    try {
      const {
        kind,
        shop,
        action,
        actor,
        body = {},
        token,
        id,
        cursor,
        visitor,
      } = await request.json();
      if (kind === "registry") {
        requireValue(
          typeof body.merchantId === "string" && body.merchantId.length < 200,
          "Invalid Square merchant.",
        );
        const key = "merchant:" + body.merchantId,
          existing = await this.ctx.storage.get(key);
        if (action === "bind") {
          requireValue(
            !existing || existing === body.shop,
            "This Square account is already connected to another shop.",
            409,
          );
          await this.ctx.storage.put(key, body.shop);
          return json({ shop: body.shop });
        }
        return json({ shop: existing || null });
      }
      requireValue(allowed(this.env, shop), "Unknown shop.", 404);
      const s = new ShopService({
        storage: this.ctx.storage,
        env: this.env,
        shop,
        registry: async (action, body) => {
          const stub = this.env.COMMERCE.get(
            this.env.COMMERCE.idFromName(this.env.ENVIRONMENT + ":registry"),
          );
          const r = await stub.fetch("https://internal/registry", {
            method: "POST",
            body: JSON.stringify({ kind: "registry", action, body }),
          });
          const v = await r.json();
          if (!r.ok) throw new HttpError(r.status, v.error);
          return v;
        },
      });
      if (!(await this.ctx.storage.get("shop-id")))
        await this.ctx.storage.put("shop-id", shop);
      if (visitor)
        await s.rate(
          visitor,
          action === "quote"
            ? "quote"
            : action === "checkout"
              ? "checkout"
              : "read",
        );
      const methods = {
        config: () => s.publicConfig(),
        account: () => s.account(actor),
        invite: () => s.invite(actor, body.email),
        claim: () => s.claim(actor, body.invite),
        settings: () => s.saveSettings(actor, body),
        oauth: () => s.oauthStart(actor),
        location: () => s.chooseLocation(actor, body.locationId),
        disconnect: () => s.disconnect(actor),
        callback: () => s.oauthCallback(body),
        quote: () => s.quote(body),
        checkout: () => s.checkout(id, token, body),
        status: () => s.status(id, token),
        cancel: async () => s.cancel(await s.customerOrder(id, token)),
        orders: () => s.listOrders(actor, cursor),
        detail: () => s.orderDetail(actor, id),
        event: () => s.event(body),
        begin: async () => {
          const pending = await s.storage.get(
            "oauth:" + (await hash(body.state)),
          );
          requireValue(
            pending &&
              pending.expiresAt > s.now() &&
              !pending.begun &&
              pending.nonceHash === (await hash(body.nonce)),
            "The connection session expired. Start again.",
            403,
          );
          pending.begun = true;
          await s.storage.put("oauth:" + (await hash(body.state)), pending);
          return { begun: true };
        },
      };
      requireValue(methods[action], "Unknown operation.", 404);
      return json(await methods[action]());
    } catch (e) {
      return json(
        {
          error:
            e instanceof HttpError
              ? e.message
              : "The request could not be completed safely. Please retry.",
          code: e instanceof HttpError ? e.status : 503,
        },
        e instanceof HttpError ? e.status : 503,
      );
    }
  }
  alarm() {
    const task = this.queue.then(async () => {
      const shop = await this.ctx.storage.get("shop-id");
      if (shop) {
        const s = new ShopService({
          storage: this.ctx.storage,
          env: this.env,
          shop,
        });
        await s.maintain();
      }
    });
    this.queue = task.catch(() => {});
    return task;
  }
}
export function makeHandler({ verifyIdentity = verifyFirebase } = {}) {
  return async function (request, env) {
    const url = new URL(request.url),
      origin = request.headers.get("Origin"),
      origins = new Set([
        env.SITE_ORIGIN,
        ...(env.ENVIRONMENT === "sandbox"
          ? (env.DEVELOPMENT_ORIGINS || "").split(",").filter(Boolean)
          : []),
      ]),
      cors = origins.has(origin)
        ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
        : {};
    const reply = (body, status = 200) => json(body, status, cors);
    async function call(shop, action, options = {}) {
      requireValue(allowed(env, shop), "Unknown shop.", 404);
      const stub = env.COMMERCE.get(
          env.COMMERCE.idFromName(env.ENVIRONMENT + ":shop:" + shop),
        ),
        r = await stub.fetch("https://internal/shop", {
          method: "POST",
          body: JSON.stringify({ shop, action, ...options }),
        });
      const data = await r.json();
      if (!r.ok) throw new HttpError(r.status, data.error);
      return data;
    }
    const redirect = (target, headers = {}) =>
      new Response(null, {
        status: 303,
        headers: {
          Location: target,
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
          ...headers,
        },
      });
    try {
      requireValue(
        ["sandbox", "production"].includes(env.ENVIRONMENT),
        "Payment environment is not configured.",
        503,
      );
      if (request.method === "OPTIONS")
        return new Response(null, {
          status: origins.has(origin) ? 204 : 403,
          headers: {
            ...cors,
            "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
            "Access-Control-Allow-Headers":
              "Content-Type,Authorization,X-Order-Key",
            "Access-Control-Max-Age": "600",
          },
        });
      if (url.pathname === "/health" && request.method === "GET")
        return reply({
          environment: env.ENVIRONMENT,
          configured:
            !!env.SQUARE_APPLICATION_ID &&
            !!env.SQUARE_APPLICATION_SECRET &&
            /^[A-Za-z0-9_-]{43}$/.test(env.TOKEN_ENCRYPTION_KEY || "") &&
            !!env.SQUARE_WEBHOOK_SIGNATURE_KEY &&
            !!env.API_BASE_URL,
          paymentsEnabled: env.PAYMENTS_ENABLED === "true",
        });
      if (url.pathname === "/oauth/start" && request.method === "GET") {
        const shop = url.searchParams.get("shop"),
          state = url.searchParams.get("state"),
          nonce = url.searchParams.get("nonce");
        requireValue(
          state?.length === 43 && nonce?.length === 43,
          "Invalid connection session.",
        );
        await call(shop, "begin", { body: { state, nonce } });
        const base =
            env.ENVIRONMENT === "production"
              ? "https://connect.squareup.com"
              : "https://connect.squareupsandbox.com",
          auth = new URL(base + "/oauth2/authorize");
        const scopes =
          "MERCHANT_PROFILE_READ ORDERS_READ ORDERS_WRITE PAYMENTS_READ PAYMENTS_WRITE";
        for (const [k, v] of Object.entries({
          client_id: env.SQUARE_APPLICATION_ID,
          scope: scopes,
          session: "false",
          state: shop + "." + state,
          redirect_uri: env.API_BASE_URL + "/oauth/callback",
        }))
          auth.searchParams.set(k, v);
        return redirect(auth.href, {
          "Set-Cookie":
            "__Host-nebula-square=" +
            shop +
            "." +
            state +
            "." +
            nonce +
            "; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600",
        });
      }
      if (url.pathname === "/oauth/callback" && request.method === "GET") {
        const state = url.searchParams.get("state") || "",
          [shop, value] = state.split("."),
          cookie = (request.headers.get("Cookie") || "")
            .split(";")
            .map((c) => c.trim())
            .find((c) => c.startsWith("__Host-nebula-square="))
            ?.slice("__Host-nebula-square=".length),
          parts = cookie?.split(".");
        requireValue(
          parts?.length === 3 && parts[0] === shop && parts[1] === value,
          "The connection session is invalid. Return to your shop account and try again.",
          403,
        );
        await call(shop, "callback", {
          body: {
            state: value,
            nonce: parts[2],
            code: url.searchParams.get("code"),
            denied: !!url.searchParams.get("error"),
          },
        });
        return redirect(
          env.SITE_ORIGIN + "/shops/" + shop + "/account.html?square=connected",
          {
            "Set-Cookie":
              "__Host-nebula-square=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
          },
        );
      }
      if (url.pathname === "/webhooks/square" && request.method === "POST") {
        // Verify the exact raw bytes, not a re-serialised JSON object.
        const reader = request.body?.getReader();
        requireValue(reader, "A body is required.");
        const chunks = [];
        let size = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 262144) {
            await reader.cancel();
            throw new HttpError(413, "Notification is too large.");
          }
          chunks.push(value);
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const c of chunks) {
          bytes.set(c, offset);
          offset += c.length;
        }
        const raw = new TextDecoder().decode(bytes);
        requireValue(
          await verifyWebhook(
            raw,
            request.headers.get("x-square-hmacsha256-signature"),
            env.SQUARE_WEBHOOK_SIGNATURE_KEY,
            env.API_BASE_URL + "/webhooks/square",
          ),
          "Invalid Square signature.",
          403,
        );
        let event;
        try {
          event = JSON.parse(raw);
        } catch {
          throw new HttpError(400, "Invalid notification.");
        }
        requireValue(
          typeof event.event_id === "string" &&
            event.event_id.length < 200 &&
            typeof event.merchant_id === "string" &&
            event.merchant_id.length < 200,
          "Invalid notification.",
        );
        const reg = env.COMMERCE.get(
            env.COMMERCE.idFromName(env.ENVIRONMENT + ":registry"),
          ),
          lookup = await reg.fetch("https://internal/registry", {
            method: "POST",
            body: JSON.stringify({
              kind: "registry",
              action: "lookup",
              body: { merchantId: event.merchant_id },
            }),
          }),
          mapped = await lookup.json();
        if (!mapped.shop) return reply({ received: true });
        return reply(await call(mapped.shop, "event", { body: event }));
      }
      const m =
        /^\/v1\/shops\/([a-z0-9-]+)\/(config|account|invites|claim|settings|square\/connect|square\/location|square\/disconnect|quotes|orders)(?:\/([A-Za-z0-9_-]+)(?:\/(checkout|cancel))?)?$/.exec(
          url.pathname,
        );
      requireValue(m, "Not found.", 404);
      const [, shop, resource, id, operation] = m;
      requireValue(allowed(env, shop), "Unknown shop.", 404);
      if (request.method !== "GET")
        requireValue(
          origins.has(origin),
          "This website origin is not allowed.",
          403,
        );
      const needsAuth =
        [
          "account",
          "invites",
          "claim",
          "settings",
          "square/connect",
          "square/location",
          "square/disconnect",
        ].includes(resource) ||
        (resource === "orders" &&
          !operation &&
          !request.headers.get("X-Order-Key"));
      let actor;
      if (needsAuth) {
        const auth = request.headers.get("Authorization");
        requireValue(auth?.startsWith("Bearer "), "Sign in is required.", 401);
        actor = await verifyIdentity(auth.slice(7), env.FIREBASE_PROJECT_ID);
      }
      const body = ["POST", "PUT"].includes(request.method)
          ? await readJson(request)
          : {},
        visitor = await hash(
          (env.RATE_LIMIT_SALT ||
            env.SQUARE_APPLICATION_SECRET ||
            "unconfigured") +
            ":" +
            Math.floor(Date.now() / 86400000) +
            ":" +
            (request.headers.get("CF-Connecting-IP") || "local"),
        );
      let action;
      if (resource === "config" && request.method === "GET" && !id)
        action = "config";
      if (resource === "account" && request.method === "GET" && !id)
        action = "account";
      if (resource === "invites" && request.method === "POST" && !id)
        action = "invite";
      if (resource === "claim" && request.method === "POST" && !id)
        action = "claim";
      if (resource === "settings" && request.method === "PUT" && !id)
        action = "settings";
      if (resource === "square/connect" && request.method === "POST" && !id)
        action = "oauth";
      if (resource === "square/location" && request.method === "POST" && !id)
        action = "location";
      if (resource === "square/disconnect" && request.method === "POST" && !id)
        action = "disconnect";
      if (resource === "quotes" && request.method === "POST" && !id)
        action = "quote";
      if (resource === "orders") {
        if (request.method === "GET" && !id) action = "orders";
        else if (request.method === "GET" && id && !operation)
          action = actor ? "detail" : "status";
        else if (request.method === "POST" && id) action = operation;
      }
      requireValue(action, "Not found.", 404);
      const data = await call(shop, action, {
        actor,
        body,
        id,
        token: request.headers.get("X-Order-Key"),
        cursor: url.searchParams.get("cursor") || null,
        visitor,
      });
      if (action === "oauth")
        return reply({
          url:
            env.API_BASE_URL +
            "/oauth/start?" +
            new URLSearchParams({
              shop,
              state: new URL(data.url).searchParams.get("state").split(".")[1],
              nonce: data.browserNonce,
            }),
        });
      return reply(data);
    } catch (e) {
      return reply(
        {
          error:
            e instanceof HttpError
              ? e.message
              : "The payment service is unavailable. Your bouquet has not been lost.",
        },
        e instanceof HttpError ? e.status : 503,
      );
    }
  };
}
export default { fetch: makeHandler() };
