import { DatabaseSync } from "node:sqlite";
import { ShopRegistry, ShopStore, makeHandler } from "../worker.mjs";
import { HttpError } from "../../rays-payments/security.mjs";
import { createRuntime } from "../../../platform/shared/runtime.mjs";

const runtime = createRuntime("fresh");
export const design = runtime.Model.empty();
runtime.Model.add(design, "rose_red");

export const origin = "https://nebula.aneslaidaoui06.workers.dev";
export const catalog = {
  flowers: [
    {
      id: "rose_red",
      en: "Red rose",
      family: "fresh",
      priceCents: 500,
      classic: true,
      preset: "fresh",
    },
  ],
  extras: [{ id: "card", label: "Card", priceCents: 200 }],
  recipes: [
    {
      id: "fresh-classic",
      name: "Classic",
      mode: "classic",
      preset: "fresh",
      cover: null,
      design,
    },
  ],
};
export const png = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN8kAAAAASUVORK5CYII=",
    "base64",
  ),
);

export function sqliteState() {
  const db = new DatabaseSync(":memory:");
  const sql = {
    exec(query, ...parameters) {
      const statement = db.prepare(query),
        values = parameters.map((value) =>
          value instanceof ArrayBuffer ? new Uint8Array(value) : value,
        );
      if (statement.columns().length) return statement.all(...values);
      statement.run(...values);
      return [];
    },
  };
  return {
    db,
    storage: {
      sql,
      transactionSync(callback) {
        db.exec("BEGIN IMMEDIATE");
        try {
          const value = callback();
          db.exec("COMMIT");
          return value;
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      },
    },
  };
}

export function namespace(Class, environment = {}) {
  const objects = new Map();
  return {
    objects,
    idFromName: (value) => value,
    get(id) {
      if (!objects.has(id)) {
        const state = sqliteState();
        objects.set(id, {
          state,
          instance: new Class(
            state,
            typeof environment === "function" ? environment() : environment,
          ),
        });
      }
      return { fetch: (request) => objects.get(id).instance.fetch(request) };
    },
  };
}

export function fixture(options = {}) {
  const env = {
    REGISTRY: namespace(ShopRegistry),
    SHOPS: namespace(ShopStore, () => env),
    ENVIRONMENT: "private-beta",
    FIREBASE_PROJECT_ID: "la-flora-6ed47",
    PUBLIC_ORIGIN: origin,
    PUBLIC_SIGNUPS: "false",
    BETA_ACCESS_EMAILS: "owner@example.test,other@example.test",
    ASSETS: {
      async fetch(request) {
        const path = new URL(request.url).pathname;
        if (path === "/catalog.json") return Response.json(catalog);
        if (path === "/index.html")
          return new Response("<main>Private beta</main>", {
            headers: { "Content-Type": "text/html" },
          });
        if (path === "/studio/app.js")
          return new Response("/* studio */", {
            headers: { "Content-Type": "text/javascript" },
          });
        return new Response("Not found", { status: 404 });
      },
    },
    ...options.env,
  };
  const verifyIdentity =
    options.verifyIdentity ||
    (async (token) => {
      if (token === "owner")
        return { uid: "uid-owner", email: "owner@example.test" };
      if (token === "other")
        return { uid: "uid-other", email: "other@example.test" };
      if (token === "uninvited")
        return { uid: "uid-uninvited", email: "not-invited@example.test" };
      throw new HttpError(401, "Verify your email and sign in again.");
    });
  const handler = makeHandler({
    verifyIdentity,
    verifyAdmin: options.verifyAdmin || (async () => false),
  });
  const call = (
    path,
    { method = "GET", body, token = "owner", from = origin, headers = {} } = {},
  ) =>
    handler(
      new Request(origin + path, {
        method,
        headers: {
          ...(from ? { Origin: from } : {}),
          ...(token ? { Authorization: "Bearer " + token } : {}),
          ...(body === undefined || body instanceof Uint8Array
            ? {}
            : { "Content-Type": "application/json" }),
          ...headers,
        },
        ...(body === undefined
          ? {}
          : { body: body instanceof Uint8Array ? body : JSON.stringify(body) }),
      }),
      env,
    );
  const create = async (
    name = "Test Flowers",
    slug = "test-flowers",
    token = "owner",
  ) => {
    const response = await call("/api/shops", {
      method: "POST",
      body: { name, slug, currency: "USD", preset: "fresh" },
      token,
    });
    return { response, ...(await response.json()) };
  };
  return { env, call, create, handler };
}
