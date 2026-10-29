/* Actual local SQLite/API and receipt page; all Square requests are locally mocked. */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http");
const { chromium } = require("playwright");
(async () => {
  const { setup, token } = await import(
    "../../cloudflare/platform/test/checkout-fixture.mjs"
  );
  const f = await setup(),
    root = path.resolve(__dirname, "../../platform/public"),
    out = path.resolve(__dirname, "../../.private/qa/platform/checkout-ui");
  fs.mkdirSync(out, { recursive: true });
  const types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
  };
  f.env.ENVIRONMENT = "local";
  f.env.ASSETS = {
    fetch: async (request) => {
      const file = path.resolve(root, "." + new URL(request.url).pathname);
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
  const server = http.createServer(async (req, res) => {
    try {
      const parts = [];
      for await (const p of req) parts.push(p);
      const url = "http://127.0.0.1:" + server.address().port + req.url;
      const response = await f.handler(
        new Request(url, {
          method: req.method,
          headers: req.headers,
          ...(!["GET", "HEAD"].includes(req.method)
            ? { body: Buffer.concat(parts) }
            : {}),
        }),
        f.env,
      );
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (e) {
      res.writeHead(500);
      res.end(e.stack);
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });
  try {
    const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
      }),
      page = await ctx.newPage(),
      errors = [],
      outbound = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await ctx.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (u.origin === origin) return route.continue();
      if (u.hostname === "www.gstatic.com")
        return route.fulfill({
          contentType: "text/javascript",
          body: u.pathname.endsWith("firebase-app.js")
            ? "export const initializeApp=x=>x;"
            : "export const getAuth=()=>({currentUser:null}),browserSessionPersistence={};export const setPersistence=async()=>{};export const onAuthStateChanged=(a,cb)=>{queueMicrotask(()=>cb(null));return ()=>{};};",
        });
      if (u.hostname === "fonts.googleapis.com")
        return route.fulfill({
          contentType: "text/css",
          body: "/* local test fonts */",
        });
      if (u.hostname === "sandbox.square.link")
        return route.fulfill({
          contentType: "text/html",
          body: "<h1>Mock Square checkout</h1>",
        });
      outbound.push(u.href);
      return route.abort();
    });
    await page.goto(`${origin}/s/${f.shop.slug}`);
    await page.locator('[data-action="product-request"]').first().click();
    await page
      .locator('.nb-order-form input[name="name"]')
      .fill("Browser customer");
    await page
      .locator('.nb-order-form input[name="phone"]')
      .fill("15551234567");
    await page
      .locator('.nb-order-form select[name="fulfillment"]')
      .selectOption("delivery");
    await page
      .getByRole("button", { name: "Review final price & payment options" })
      .click();
    await page.getByRole("button", { name: /Pay 50% deposit/ }).waitFor();
    assert.equal(await page.locator("script:not([src])").count(), 0);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    assert.ok(
      !page.url().includes(token),
      "Token is removed from browser URL after local recovery storage",
    );
    const id = new URLSearchParams(new URL(page.url()).hash.slice(1)).get(
      "order",
    );
    await page.screenshot({
      path: path.join(out, "receipt-mobile.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: /Pay 50% deposit/ }).click();
    await page.getByRole("heading", { name: "Mock Square checkout" }).waitFor();
    assert.equal(f.network.links.size, 1);
    f.complete(1, 849);
    await page.goto(`${origin}/receipt.html#shop=${f.shop.id}&order=${id}`);
    await page.getByText("deposit paid", { exact: true }).waitFor();
    assert.equal(await page.locator("#payDeposit").isDisabled(), true);
    await page.getByRole("button", { name: /Pay remaining balance/ }).click();
    await page.getByRole("heading", { name: "Mock Square checkout" }).waitFor();
    f.complete(2, 848);
    await page.goto(`${origin}/receipt.html#shop=${f.shop.id}&order=${id}`);
    await page.getByText("paid", { exact: true }).waitFor();
    assert.equal(await page.locator("#payFull").count(), 0);
    await page.screenshot({
      path: path.join(out, "receipt-paid-mobile.png"),
      fullPage: true,
    });
    const other = await browser.newContext(),
      blocked = await other.newPage();
    await blocked.goto(`${origin}/receipt.html#shop=${f.shop.id}&order=${id}`);
    await blocked.getByRole("alert").waitFor();
    assert.equal(await blocked.locator("#payFull").count(), 0);
    assert.deepEqual(errors, []);
    assert.deepEqual(outbound, []);
    await other.close();
    await ctx.close();
    console.log(
      "PASS local storefront-to-checkout and receipt UI: final tax/delivery review, secret recovery, phone layout, deposit, balance, confirmed paid state and cross-browser access denial. All Square activity is simulated.",
    );
  } finally {
    f.restore();
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
