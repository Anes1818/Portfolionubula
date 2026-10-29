/* Real workerd + SQLite integration. Identity and assets are local fixtures only.
 * The injected identity entry is generated under .private and is never deployed.
 * Run with NODE_PATH containing the cached Wrangler dependencies (or installed
 * esbuild/miniflare). No Firebase users, messages, billing or Square calls occur.
 */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { build } = require("esbuild");
const {
  Miniflare,
  Response: MFResponse,
  convertV4MiniflareOptions,
} = require("miniflare");

(async () => {
  const root = path.resolve(__dirname, "../..");
  const qa = path.join(root, ".private/qa/platform");
  fs.mkdirSync(qa, { recursive: true });
  const dir = fs.mkdtempSync(path.join(qa, "durable-"));
  const source = path.join(dir, "test-entry.mjs");
  const bundle = path.join(dir, "worker.mjs");
  const worker = path
    .join(root, "cloudflare/platform/worker.mjs")
    .replaceAll("\\", "/");
  fs.writeFileSync(
    source,
    `import {makeHandler,ShopRegistry,ShopStore} from ${JSON.stringify(worker)};
    import {HttpError} from ${JSON.stringify(path.join(root, "cloudflare/rays-payments/security.mjs").replaceAll("\\", "/"))};
    export {ShopRegistry,ShopStore};
    export default {fetch:makeHandler({verifyIdentity:async token=>{
      if(!['owner','other'].includes(token)) throw new HttpError(401,'Test identity required');
      return {uid:'uid-'+token,email:token+'@example.test',authTime:Date.now()/1000};
    },verifyAdmin:async u=>u.uid==='uid-owner'})};`,
  );
  await build({
    entryPoints: [source],
    outfile: bundle,
    bundle: true,
    format: "esm",
    platform: "browser",
    logLevel: "silent",
  });
  const catalog = JSON.parse(
    fs.readFileSync(path.join(root, "platform/public/catalog.json"), "utf8"),
  );
  const options = {
    name: "platform-integration-test",
    scriptPath: bundle,
    modules: true,
    compatibilityDate: "2026-10-01",
    durableObjects: {
      REGISTRY: { className: "ShopRegistry", useSQLite: true },
      SHOPS: { className: "ShopStore", useSQLite: true },
    },
    durableObjectsPersist: path.join(dir, "state"),
    bindings: {
      PUBLIC_ORIGIN: "https://platform.example.test",
      PUBLIC_SIGNUPS: "false",
      MANUAL_ACTIVATION_ENABLED: "true",
      BETA_ACCESS_EMAILS: "owner@example.test,other@example.test",
    },
    serviceBindings: {
      ASSETS: async (request) => {
        const p = new URL(request.url).pathname;
        if (p === "/catalog.json")
          return new MFResponse(JSON.stringify(catalog), {
            headers: { "Content-Type": "application/json" },
          });
        if (p === "/index.html")
          return new MFResponse("<main>Private beta</main>", {
            headers: { "Content-Type": "text/html" },
          });
        return new MFResponse("Not found", { status: 404 });
      },
    },
    outboundService: () => {
      throw Error("Unexpected network request in local-only test");
    },
  };
  const runtimeOptions = convertV4MiniflareOptions
    ? await convertV4MiniflareOptions(options)
    : options;
  if (convertV4MiniflareOptions)
    runtimeOptions.resourcePersistencePath = path.join(dir, "state");
  let mf = new Miniflare(runtimeOptions);
  const call = (
    route,
    { method = "GET", token = "owner", body, headers = {} } = {},
  ) =>
    mf.dispatchFetch("https://platform.example.test" + route, {
      method,
      headers: {
        Origin: "https://platform.example.test",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      ...(body
        ? { body: typeof body === "string" ? body : JSON.stringify(body) }
        : {}),
    });
  const data = async (r, status = 200) => {
    const d = await r.json();
    assert.equal(r.status, status, JSON.stringify(d));
    return d;
  };
  try {
    await mf.ready;
    await data(await call("/api/session", { token: null }), 401);
    let { shop } = await data(
      await call("/api/shops", {
        method: "POST",
        body: {
          name: "Runtime Flowers",
          slug: "runtime-flowers",
          currency: "CAD",
          preset: "fresh",
        },
      }),
      201,
    );
    const id = shop.id;
    await data(
      await call("/api/shops", {
        method: "POST",
        token: "other",
        body: {
          name: "Other Flowers",
          slug: "runtime-flowers",
          currency: "USD",
          preset: "fresh",
        },
      }),
      409,
    );
    await data(await call("/api/shops/" + id, { token: "other" }), 404);
    await data(await call("/api/shops/" + id, { token: null }), 404);
    const first = catalog.recipes[0];
    const draft = {
      ...shop.draft,
      tagline: "Saved in actual SQLite",
      city: "Toronto",
      collection: [
        {
          id: "card-1",
          title: first.name,
          recipeId: first.id,
          design: null,
          cover: null,
        },
      ],
    };
    ({ shop } = await data(
      await call("/api/shops/" + id + "/draft", {
        method: "PUT",
        body: { version: 1, draft },
      }),
    ));
    assert.equal(shop.version, 2);
    await data(
      await call("/api/shops/" + id + "/draft", {
        method: "PUT",
        body: { version: 1, draft: { ...draft, name: "Stale overwrite" } },
      }),
      409,
    );
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN8kAAAAASUVORK5CYII=",
      "base64",
    );
    const upload = await mf.dispatchFetch(
      "https://platform.example.test/api/shops/" +
        id +
        "/media?slot=1&kind=logo",
      {
        method: "POST",
        headers: {
          Origin: "https://platform.example.test",
          Authorization: "Bearer owner",
          "Content-Type": "image/png",
        },
        body: png,
      },
    );
    const uploaded = await data(upload, 201);
    const imageId = uploaded.media.id;
    assert.match(imageId, /^img_[a-f0-9]{64}$/);
    const image = await call("/api/shops/" + id + "/media/" + imageId);
    assert.equal(image.status, 200);
    assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);
    await data(
      await call("/api/shops/" + id + "/media/" + imageId, { token: "other" }),
      404,
    );
    await data(
      await call("/api/shops/" + id + "/publish", { method: "POST", body: {} }),
      409,
    );
    await data(
      await call("/api/shops/" + id + "/billing/checkout", {
        method: "POST",
        body: {},
      }),
      503,
    );
    await data(
      await call("/api/shops/" + id + "/square/connect", {
        method: "POST",
        body: {},
      }),
      409,
    );
    const activation = {
      operationId: crypto.randomUUID(),
      revision: 0,
      action: "extend",
      paymentReference: "LOCAL-WORKERD-PAYPAL-0001",
      amountCents: 2900,
      currency: "USD",
      confirmed: true,
    };
    const activated = await data(
      await call("/api/admin/shops/" + id + "/activation", {
        method: "POST",
        body: activation,
      }),
    );
    const paidUntil = activated.shop.subscription.paidUntil;
    await mf.dispose();
    mf = new Miniflare(runtimeOptions);
    await mf.ready;
    const restored = (await data(await call("/api/session"))).shop;
    assert.equal(restored.id, id);
    assert.equal(restored.subscription.paidUntil, paidUntil);
    const retried = await data(
      await call("/api/admin/shops/" + id + "/activation", {
        method: "POST",
        body: activation,
      }),
    );
    assert.equal(retried.shop.subscription.paidUntil, paidUntil);
    const audit = await data(
      await call("/api/admin/shops/" + id + "/activation"),
    );
    assert.equal(audit.history.length, 1);
    assert.equal(restored.version, 2);
    assert.equal(restored.draft.tagline, draft.tagline);
    assert.deepEqual(restored.draft.collection, shop.draft.collection);
    assert.equal(
      (await call("/api/shops/" + id + "/media/" + imageId)).status,
      200,
    );
    console.log(
      "PASS actual workerd/SQLite creation, unique slug, owner isolation, stale-version protection, private media, restart persistence, and inactive billing/Square/publication. No real authentication or payment services were called.",
    );
  } finally {
    await mf.dispose();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
