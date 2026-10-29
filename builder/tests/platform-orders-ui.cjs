/* Actual local request-management UI with SQLite API. No provider, email or real identity calls. */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http");
const { chromium } = require("playwright");
(async () => {
  const { fixture, design } = await import(
    "../../cloudflare/platform/test/fixtures.mjs"
  );
  const root = path.resolve(__dirname, "../../platform/public"),
    out = path.resolve(__dirname, "../../.private/qa/platform/orders-ui");
  fs.mkdirSync(out, { recursive: true });
  const types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".webp": "image/webp",
    ".png": "image/png",
    ".jpg": "image/jpeg",
  };
  const assets = {
    fetch: async (request) => {
      const file = path.resolve(
        root,
        "." + decodeURIComponent(new URL(request.url).pathname),
      );
      if (
        !file.startsWith(root + path.sep) ||
        !fs.existsSync(file) ||
        !fs.statSync(file).isFile()
      )
        return new Response("Not found", { status: 404 });
      return new Response(fs.readFileSync(file), {
        headers: {
          "Content-Type":
            types[path.extname(file)] || "application/octet-stream",
        },
      });
    },
  };
  const f = fixture({
    env: { ASSETS: assets, ENVIRONMENT: "local", PUBLISHING_ENABLED: "true" },
    verifyAdmin: async (user) => user.uid === "uid-owner",
  });
  let { shop } = await f.create("Request Flower Room", "requests-room");
  const draft = {
    ...shop.draft,
    phone: "+14165550123",
    flowerPrices: { rose_red: 500 },
    products: [
      {
        id: "ready-roses",
        title: "Ready roses",
        description: "A saved product.",
        priceCents: 3995,
        cover: null,
        available: true,
        category: "",
      },
    ],
  };
  const save = await f.call("/api/shops/" + shop.id + "/draft", {
    method: "PUT",
    body: { version: shop.version, draft },
  });
  assert.equal(save.status, 200, await save.clone().text());
  shop = (await save.json()).shop;
  const sql = f.env.SHOPS.objects.get(shop.id).state.storage.sql;
  sql.exec(
    "UPDATE shop SET data=? WHERE singleton=1",
    JSON.stringify({
      ...shop,
      published: { version: 1, draft },
      subscription: {
        status: "active",
        paidUntil: Date.now() + 86400000,
        testEnvironment: false,
      },
    }),
  );
  let designRequest;
  for (let i = 0; i < 27; i++) {
    const body = {
      requestKey: crypto.randomUUID(),
      kind: i === 0 ? "design" : "product",
      ...(i === 0 ? { design } : { productId: "ready-roses" }),
      customer: {
        name: "Customer " + i,
        phone: "5551234567",
        note: "<img src=x onerror=alert(1)> Gift note " + i,
        date: "2026-11-05",
      },
      fulfillment: i % 2 ? "delivery" : "pickup",
    };
    const response = await f.call("/api/shops/" + shop.id + "/requests", {
      method: "POST",
      token: null,
      headers: { "CF-Connecting-IP": "198.51.100." + (i + 1) },
      body,
    });
    assert.equal(response.status, 201, await response.clone().text());
    if (!i) designRequest = (await response.json()).request;
  }
  const row = JSON.parse([...sql.exec("SELECT data FROM shop")][0].data);
  sql.exec(
    "UPDATE shop SET data=? WHERE singleton=1",
    JSON.stringify({ ...row, subscription: { status: "inactive" } }),
  );
  await f.create("Other Flower Room", "other-requests-room", "other");
  const server = http.createServer(async (req, res) => {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const url = new URL(req.url, "http://127.0.0.1:" + server.address().port);
      const response = await f.handler(
        new Request(url, {
          method: req.method,
          headers: req.headers,
          ...(["GET", "HEAD"].includes(req.method)
            ? {}
            : { body: Buffer.concat(chunks) }),
        }),
        f.env,
      );
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      res.writeHead(500);
      res.end(error.stack);
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });
  const errors = [],
    outbound = [];
  async function context(identity) {
    const ctx = await browser.newContext({
      viewport: { width: 1365, height: 900 },
    });
    await ctx.route("https://www.gstatic.com/firebasejs/**", (route) =>
      route.fulfill({
        contentType: "text/javascript",
        body: route.request().url().endsWith("/firebase-app.js")
          ? "export const initializeApp=c=>c;"
          : `const user={uid:'uid-${identity}',email:'${identity}@example.test',emailVerified:true,getIdToken:async()=>'${identity}'};const auth={currentUser:user};export const getAuth=()=>auth,browserSessionPersistence={};export const setPersistence=async()=>{};export const onAuthStateChanged=(a,cb)=>{queueMicrotask(()=>cb(user));return()=>{};};`,
      }),
    );
    await ctx.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin === origin || url.hostname === "www.gstatic.com")
        return route.fallback();
      if (url.hostname === "fonts.googleapis.com")
        return route.fulfill({ contentType: "text/css", body: "" });
      outbound.push(url.href);
      return route.abort();
    });
    ctx.on("page", (p) =>
      p.on("pageerror", (error) => errors.push(error.message)),
    );
    return ctx;
  }
  const owner = await context("owner"),
    page = await owner.newPage();
  page.setDefaultTimeout(15000);
  try {
    await page.goto(origin + "/dashboard/orders");
    await page.locator(".request-list-item").first().waitFor();
    assert.equal(await page.locator(".request-list-item").count(), 25);
    assert.equal(await page.locator('[data-action="orders-more"]').count(), 1);
    assert.match(
      await page.locator(".requests-toolbar").innerText(),
      /plan is inactive/,
    );
    const id = await page
      .locator(".request-list-item")
      .first()
      .getAttribute("data-id");
    await page.locator(".request-list-item").first().click();
    await page.locator("#requestMerchantNote").waitFor();
    assert.equal(
      await page.locator(".request-customer-note img").count(),
      0,
      "Customer text must stay escaped",
    );
    await page.locator("#requestMerchantNote").fill("Call before pickup");
    await page.locator("#requestStatus").selectOption("accepted");
    const external = await f.call("/api/shops/" + shop.id + "/requests/" + id, {
      method: "PATCH",
      body: {
        version: 1,
        status: "accepted",
        merchantNote: "Another window saved this",
      },
    });
    assert.equal(external.status, 200);
    await page.locator('#requestUpdateForm button[type="submit"]').click();
    await page
      .getByText("This request changed in another window.", { exact: false })
      .waitFor();
    assert.equal(
      await page.locator("#requestMerchantNote").inputValue(),
      "Call before pickup",
    );
    await page.locator('[data-action="orders-review"]').click();
    await page
      .getByText("The latest saved status is loaded.", { exact: false })
      .waitFor();
    assert.equal(
      await page.locator("#requestMerchantNote").inputValue(),
      "Call before pickup",
    );
    await page.locator('#requestUpdateForm button[type="submit"]').click();
    await page
      .getByText("Request changes saved. No payment was recorded.", {
        exact: true,
      })
      .waitFor();
    let request = (
      await (await f.call("/api/shops/" + shop.id + "/requests/" + id)).json()
    ).request;
    assert.equal(request.status, "accepted");
    assert.equal(request.merchantNote, "Call before pickup");
    assert.equal(request.paymentStatus, "unpaid");
    await page
      .locator('[data-action="orders-filter"][data-status="accepted"]')
      .click();
    await page.waitForFunction(
      () => document.querySelectorAll(".request-list-item").length === 1,
    );
    await page.locator("#requestStatus").selectOption("fulfilled");
    await page.locator('#requestUpdateForm button[type="submit"]').click();
    await page
      .getByText("Request changes saved. No payment was recorded.", {
        exact: true,
      })
      .waitFor();
    await page.waitForFunction(
      () => document.querySelectorAll(".request-list-item").length === 0,
    );
    assert.deepEqual(
      await page
        .locator("#requestStatus option")
        .evaluateAll((nodes) => nodes.map((node) => node.value)),
      ["fulfilled"],
    );
    await page
      .locator('[data-action="orders-filter"][data-status="all"]')
      .click();
    await page.locator('[data-action="orders-more"]').waitFor();
    await page.locator('[data-action="orders-more"]').click();
    await page.waitForFunction(
      () => document.querySelectorAll(".request-list-item").length === 27,
    );
    await page
      .locator(
        '[data-action="orders-select"][data-id="' + designRequest.id + '"]',
      )
      .click();
    await page
      .getByRole("heading", { name: "The bouquet they created" })
      .waitFor();
    assert.match(
      await page.locator(".request-pick-list").innerText(),
      /Red rose/,
    );
    await page.screenshot({
      path: path.join(out, "orders-desktop.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(
        () =>
          document.querySelector(".request-detail").getBoundingClientRect()
            .top <
          document.querySelector(".requests-list").getBoundingClientRect().top,
      ),
      "Selected request details appear before the scrolling list on mobile",
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await page.screenshot({
      path: path.join(out, "orders-mobile.png"),
      fullPage: true,
    });
    await page.goto(origin + "/dashboard/orders?adminShop=" + shop.id);
    await page.locator(".request-list-item").first().waitFor();
    await page.locator(".request-list-item").first().click();
    await page
      .getByText(
        "Administrator view · request changes are available only to this shop’s owner.",
        { exact: true },
      )
      .waitFor();
    assert.equal(await page.locator("#requestUpdateForm").count(), 0);
    await page.goto(origin + "/dashboard/billing");
    await page.locator(".publication-issues li").first().waitFor();
    assert.equal(
      await page.locator('[data-action="publish-shop"]').isEnabled(),
      false,
    );
    const other = await context("other"),
      otherPage = await other.newPage();
    await otherPage.goto(origin + "/dashboard/orders");
    await otherPage
      .getByRole("heading", { name: "A little room for your first request." })
      .waitFor();
    assert.equal(await otherPage.locator(".request-list-item").count(), 0);
    await other.close();
    assert.deepEqual(errors, []);
    assert.deepEqual(outbound, []);
    console.log(
      "PASS local orders UI: expired owner history, newest-first pagination/status filters, detail contents, escaped customer text, optimistic conflicts preserving notes, fulfillment-only status updates, readonly admin, merchant isolation, mobile width and authoritative readiness. No provider calls or real emails.",
    );
  } catch (error) {
    await page
      .screenshot({ path: path.join(out, "failure.png"), fullPage: true })
      .catch(() => {});
    console.error(
      page.url(),
      (await page.locator("body").innerText()).slice(-5000),
    );
    throw error;
  } finally {
    await owner.close();
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
