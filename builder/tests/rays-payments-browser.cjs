/* Local end-to-end browser checks. Fake Square/Firebase only; no outbound calls. */
const { chromium } = require("playwright"),
  fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict");
(async () => {
  const { fixture } = await import(
    "../../cloudflare/rays-payments/test/fixtures.mjs"
  );
  const { makeHandler } = await import(
    "../../cloudflare/rays-payments/worker.mjs"
  );
  const f = await fixture(Date.now()),
    root = path.resolve(__dirname, "../../shops/raysbouquetz"),
    out = path.resolve(__dirname, "../../.private/qa/raysbouquetz/payments");
  fs.mkdirSync(out, { recursive: true });
  const routeActions = {
    config: () => f.service.publicConfig(),
    account: (a) => f.service.account(a.actor),
    orders: (a) => f.service.listOrders(a.actor, a.cursor),
    detail: (a) => f.service.orderDetail(a.actor, a.id),
    quote: (a) => f.service.quote(a.body),
    checkout: (a) => f.service.checkout(a.id, a.token, a.body),
    status: (a) => f.service.status(a.id, a.token),
    cancel: async (a) =>
      f.service.cancel(await f.service.customerOrder(a.id, a.token)),
    settings: (a) => f.service.saveSettings(a.actor, a.body),
    invite: (a) => f.service.invite(a.actor, a.body.email),
  };
  f.env.ALLOWED_SHOPS = "raysbouquetz";
  f.env.COMMERCE = {
    idFromName: (s) => s,
    get: () => ({
      fetch: async (_, o) => {
        try {
          const a = JSON.parse(o.body),
            result = await routeActions[a.action](a);
          return new Response(JSON.stringify(result));
        } catch (e) {
          return new Response(JSON.stringify({ error: e.message }), {
            status: e.status || 400,
          });
        }
      },
    }),
  };
  const handler = makeHandler({
    verifyIdentity: async (token) => {
      assert.equal(token, "browser-only");
      return {
        uid: "platform-owner",
        email: "owner@example.test",
        authTime: f.clock.now / 1000,
      };
    },
  });
  const types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".png": "image/png",
    ".webp": "image/webp",
    ".json": "application/json",
  };
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1:" + server.address().port);
      if (url.pathname.startsWith("/api/")) {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const headers = new Headers(req.headers);
        headers.set("CF-Connecting-IP", "local-test");
        const response = await handler(
          new Request(url.origin + url.pathname.slice(4) + url.search, {
            method: req.method,
            headers,
            ...(req.method === "GET" ? {} : { body: Buffer.concat(chunks) }),
          }),
          f.env,
        );
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(await response.text());
        return;
      }
      const prefix = "/shops/raysbouquetz/";
      if (!url.pathname.startsWith(prefix)) {
        res.writeHead(404);
        res.end();
        return;
      }
      let name = url.pathname.slice(prefix.length) || "index.html";
      const file = path.resolve(root, name);
      if (!file.startsWith(root + path.sep)) throw Error();
      res.setHeader(
        "Content-Type",
        types[path.extname(file)] || "application/octet-stream",
      );
      if (name === "payments-config.js") {
        res.end(
          "window.NEBULA_PAYMENTS=" +
            JSON.stringify({
              endpoint: url.origin + "/api",
              shopId: "raysbouquetz",
              environment: "sandbox",
              firebase: { projectId: "test" },
            }),
        );
        return;
      }
      res.end(fs.readFileSync(file));
    } catch (e) {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base =
    "http://127.0.0.1:" + server.address().port + "/shops/raysbouquetz/";
  f.env.SITE_ORIGIN = new URL(base).origin;
  const browser = await chromium.launch({
      headless: true,
      executablePath:
        "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    }),
    context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    page = await context.newPage(),
    errors = [],
    requests = [];
  page.on("pageerror", (e) => errors.push(e.stack));
  await context.route("**/*", async (r) => {
    const u = r.request().url();
    if (u.startsWith(new URL(base).origin)) return r.continue();
    if (u.includes("firebase-app.js"))
      return r.fulfill({
        contentType: "text/javascript",
        body: "export const initializeApp = () => ({});",
      });
    if (u.includes("firebase-auth.js"))
      return r.fulfill({
        contentType: "text/javascript",
        body: `const user={uid:'platform-owner',email:'owner@example.test',emailVerified:true,reload:async()=>{},getIdToken:async()=>'browser-only'};export const getAuth=()=>({currentUser:user}),browserSessionPersistence={},setPersistence=async()=>{},onAuthStateChanged=(a,fn)=>setTimeout(()=>fn(user),0),signInWithEmailAndPassword=async()=>({user}),createUserWithEmailAndPassword=async()=>({user}),sendEmailVerification=async()=>{},sendPasswordResetEmail=async()=>{},signOut=async()=>{},signInWithPopup=async()=>({user});export class GoogleAuthProvider{}`,
      });
    if (u.startsWith("https://sandbox.square.link/")) {
      requests.push(u);
      return r.fulfill({
        contentType: "text/html",
        body: "<h1>Local mock Square checkout</h1>",
      });
    }
    return r.abort();
  });
  try {
    await page.goto(base + "studio.html?template=money-moves");
    await page.waitForFunction(
      () => window.__ready && window.RayPayments?.available,
    );
    await page.evaluate(() => NebulaApp.render(false));
    const parity = await page.evaluate(() => {
      const s = NebulaApp.state,
        p = RayPayments.price(s),
        c = RayCommerce.calculate(s, RayPayments.config.policy);
      return {
        preview: p.totalCents,
        serverInput: c.totalCents,
        quote: p.quoteRequired,
        canonicalValid: !!NebulaModel.validate(RayCommerce.validateDesign(s)),
      };
    });
    assert.equal(parity.preview, parity.serverInput);
    assert.equal(parity.quote, false);
    assert.equal(parity.canonicalValid, true);
    await page.locator("#orderButton").click();
    await page.locator("#orderDialog[open]").waitFor();
    await page.locator("#ordName").fill("TEST ONLY");
    await page.locator("#ordPhone").fill("+12045550100");
    await page.locator("#payEmail").fill("test@example.test");
    await page.locator("#ordDate").fill(f.request.customer.date);
    await page.locator("#ordMethod").selectOption("Delivery");
    await page.locator("#payPostal").fill("R3C 1A1");
    await page.locator("#payAddress").fill("123 TEST STREET, Winnipeg");
    assert.match(await page.locator("#totalPrice").textContent(), /219\.42/);
    assert.match(await page.locator("#payFinal").textContent(), /219\.42/);
    await page.locator("#ordMethod").selectOption("Pickup");
    assert.match(await page.locator("#totalPrice").textContent(), /204\.42/);
    assert.equal(await page.locator("#orderSend").isEnabled(), true);
    await page.screenshot({
      path: path.join(out, "checkout-mobile.png"),
      fullPage: true,
    });
    let releaseQuote, quoteIntercepted;
    const quoteGate = new Promise((resolve) => {
      releaseQuote = resolve;
    });
    const quoteSeen = new Promise((resolve) => {
      quoteIntercepted = resolve;
    });
    await page.route("**/api/v1/shops/raysbouquetz/quotes", async (route) => {
      quoteIntercepted();
      await quoteGate;
      await route.continue();
    });
    await page.locator("#orderSend").click();
    await quoteSeen;
    assert.equal(await page.locator("#rayPaymentPlan").isDisabled(), true);
    assert.equal(await page.locator("#ordName").isDisabled(), true);
    releaseQuote();
    await page.waitForURL("https://sandbox.square.link/**");
    assert.equal(requests.length, 1);
    assert.equal(f.square.keys.size, 1);
    const all = await f.service.allOrders();
    assert.equal(all.length, 1);
    const q = all[0];
    assert.equal(q.totalCents, 20442);
    assert.equal(q.requests[0].dueCents, 10221);
    assert.equal(q.paidCents, 0);
    f.square.pay(q.requests[0].squareOrderId);
    const statusPattern = "**/api/v1/shops/raysbouquetz/orders/" + q.id;
    await page.route(statusPattern, async (route) => {
      await page.unroute(statusPattern);
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Test interrupted connection" }),
      });
    });
    await page.goto(base + "payment-status.html#order=" + q.id);
    await page.waitForFunction(() =>
      document
        .querySelector("#statusMessage")
        .textContent.includes("Test interrupted connection"),
    );
    assert.equal(await page.locator("#orderSummary").isVisible(), false);
    assert.equal(await page.locator("#refresh").isVisible(), true);
    assert.equal(await page.locator("#refresh").isEnabled(), true);
    await page.locator("#refresh").click();
    await page.waitForFunction(
      () =>
        document.querySelector("#heading").textContent === "Deposit received.",
    );
    assert.match(await page.locator("#summary").textContent(), /102\.21/);
    await page.screenshot({
      path: path.join(out, "deposit-status-mobile.png"),
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.locator("#payFull").click();
    await page.waitForURL("https://sandbox.square.link/**");
    assert.equal(f.square.keys.size, 2);
    const current = await f.service.getOrder(q.id);
    f.square.pay(current.requests.at(-1).squareOrderId, { id: "balance" });
    await page.goto(base + "payment-status.html#order=" + q.id);
    await page.waitForFunction(
      () =>
        document.querySelector("#heading").textContent === "Payment confirmed.",
    );
    assert.equal((await f.service.getOrder(q.id)).paidCents, 20442);
    await page.goto(base + "account.html");
    await page.waitForFunction(
      () => !document.querySelector("#shopPanel").hidden,
    );
    assert.match(await page.locator("#ordersList").textContent(), /TEST ONLY/);
    await page.locator(".order-row").click();
    await page.locator("#orderDetail").waitFor({ state: "visible" });
    assert.match(await page.locator("#orderDetail").textContent(), /204\.42/);
    await page.screenshot({
      path: path.join(out, "orders-mobile.png"),
      fullPage: true,
    });
    await page.locator('[data-tab="squarePanel"]').click();
    assert.match(
      await page.locator("#squareStatus").textContent(),
      /connected/,
    );
    await page.locator('[data-tab="settingsPanel"]').click();
    assert.equal(
      await page.locator('[data-price="rose_pink"]').inputValue(),
      "8.00",
    );
    await page.screenshot({
      path: path.join(out, "settings-mobile.png"),
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    // A second administrator saving prices must not be overwritten by a stale form.
    await page.locator('[data-price="rose_pink"]').fill("8.01");
    const competing = await f.service.settings();
    competing.policy.unitCents.rose_red = 950;
    await f.service.saveSettings(f.actor, {
      version: competing.policy.version,
      policy: competing.policy,
      checkoutEnabled: true,
    });
    await page.locator('[data-tab="ordersPanel"]').click();
    await page.locator("#refreshOrders").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#accountMessage")
        .textContent.includes("Checkout is enabled"),
    );
    await page.locator('[data-tab="settingsPanel"]').click();
    await page.locator('#settingsForm button[type="submit"]').click();
    await page.waitForFunction(() =>
      document
        .querySelector("#accountMessage")
        .textContent.includes("Settings changed"),
    );
    assert.equal((await f.service.settings()).policy.unitCents.rose_red, 950);
    assert.deepEqual(errors, []);
    console.log(
      "PASS browser/server price parity, canonical design, delivery total updates, busy payment-plan lock, initial status retry, deposit/balance checkout, merchant orders, stale-settings conflict, mobile layout and no real external calls.",
    );
  } catch (e) {
    await page.screenshot({
      path: path.join(out, "failure.png"),
      fullPage: true,
    });
    console.log(errors);
    throw e;
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
