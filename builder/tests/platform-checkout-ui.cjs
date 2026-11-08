/* Actual local SQLite/API and receipt page; all Square requests are locally mocked. */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http");
const { chromium } = require("playwright");
(async () => {
  const { setup, token, settings } = await import(
    "../../cloudflare/platform/test/checkout-fixture.mjs"
  );
  const f = await setup("CAD"),
    root = path.resolve(__dirname, "../../platform/public"),
    out = path.resolve(__dirname, "../../.private/qa/platform/checkout-ui");
  fs.mkdirSync(out, { recursive: true });
  const { png } = await import("../../cloudflare/platform/test/fixtures.mjs");
  const mediaId = "img_" + "c".repeat(64);
  const savedShop = JSON.parse(f.sql.exec("SELECT data FROM shop")[0].data);
  savedShop.draft.country = savedShop.published.draft.country = "CA";
  savedShop.draft.timeZone = savedShop.published.draft.timeZone =
    "America/Toronto";
  savedShop.draft.products[0].cover = mediaId;
  savedShop.published.draft.products[0].cover = mediaId;
  f.sql.exec("UPDATE shop SET data=?", JSON.stringify(savedShop));
  f.sql.exec(
    "INSERT INTO media(id,kind,mime,body,byte_length,updated_at) VALUES(?,?,?,?,?,?)",
    mediaId,
    "cover",
    "image/png",
    png,
    png.length,
    Date.now(),
  );
  const commerce = await (
    await f.call(`/api/shops/${f.shop.id}/commerce`)
  ).json();
  const deliveryDate = new Date(Date.now() + 14 * 86400000)
    .toISOString()
    .slice(0, 10);
  const closedDate = new Date(Date.now() + 15 * 86400000)
    .toISOString()
    .slice(0, 10);
  const originalRequest = JSON.parse(
    f.sql.exec("SELECT data FROM customer_requests WHERE id=?", f.requestId)[0]
      .data,
  );
  Object.assign(originalRequest.customer, {
    date: deliveryDate,
    postalCode: "M5V2T6",
    country: "CA",
  });
  f.sql.exec(
    "UPDATE customer_requests SET data=? WHERE id=?",
    JSON.stringify(originalRequest),
    f.requestId,
  );
  const fulfillmentRules = {
    calendarEnabled: true,
    closedDates: [closedDate],
    closedWeekdays: [],
    leadHours: 24,
    sameDayCutoff: "",
    enforceDeliveryZones: true,
    deliveryZones: [
      {
        id: "central",
        name: "Central Toronto",
        postcodes: ["M5V*"],
        feeCents: 875,
      },
    ],
  };
  const deliveryNote =
    "Toronto and North York only. Include your apartment number.";
  assert.equal(
    (
      await f.call(`/api/shops/${f.shop.id}/commerce`, {
        method: "PUT",
        body: {
          ...settings,
          version: commerce.settings.version,
          deliveryNote,
          fulfillmentRules,
        },
      })
    ).status,
    200,
  );
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
    assert.equal(
      await page
        .locator(".nb-order-close")
        .evaluate((el) => el === document.activeElement),
      true,
      "Opening checkout does not force the phone keyboard open",
    );
    for (const [width, height] of [
      [320, 640],
      [390, 844],
      [430, 740],
      [568, 360],
    ]) {
      await page.setViewportSize({ width, height });
      await page.waitForFunction(
        ({ width, height }) => {
          const r = document
            .querySelector(".nb-order-dialog")
            .getBoundingClientRect();
          return (
            Math.abs(r.width - width) < 2 && Math.abs(r.height - height) < 2
          );
        },
        { width, height },
      );
      assert.ok(
        await page
          .locator('[name="name"]')
          .evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 16),
      );
      const closeBox = await page.locator(".nb-order-close").boundingBox();
      assert.ok(
        closeBox.width >= 44 &&
          closeBox.height >= 44 &&
          closeBox.x >= 0 &&
          closeBox.y >= 0,
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
    }
    await page
      .getByRole("button", { name: "Close request", exact: true })
      .click();
    assert.notEqual(
      await page.evaluate(() => document.body.style.overflow),
      "hidden",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-action="product-request"]').first().click();
    await page.locator(".nb-order-review img").waitFor();
    await page.waitForFunction(
      () => document.querySelector(".nb-order-review img")?.naturalWidth > 0,
    );
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
      .locator(".nb-delivery-note")
      .filter({ hasText: deliveryNote })
      .waitFor();
    await page
      .locator('.nb-order-form input[name="address"]')
      .fill("123 Blossom Lane, Toronto");
    await page.locator('[name="date"]').fill(deliveryDate);
    await page.locator('[name="postalCode"]').fill("V6B 1A1");
    await page.locator('[name="country"]').selectOption("CA");
    let firstRequestAttempts = 0;
    page.on("request", (request) => {
      if (
        new URL(request.url()).pathname.endsWith("/requests") &&
        request.method() === "POST"
      )
        firstRequestAttempts++;
    });
    await page.getByRole("button", { name: "Continue to Square" }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "outside the shop’s delivery areas" })
      .waitFor();
    assert.equal(
      firstRequestAttempts,
      0,
      "Outside delivery never submits a request",
    );
    await page.locator('[name="postalCode"]').fill("M5V 2T6");
    await page.locator('[name="date"]').fill(closedDate);
    await page.getByRole("button", { name: "Continue to Square" }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "closed for orders" })
      .waitFor();
    assert.equal(
      firstRequestAttempts,
      0,
      "A closed date never submits a request",
    );
    await page.locator('[name="date"]').fill(deliveryDate);
    await page.locator('[name="isGift"]').check();
    await page.locator('[name="recipientName"]').fill("Gift recipient");
    await page.locator('[name="giftMessage"]').fill("Happy birthday!");
    assert.match(
      await page.locator(".nb-order-review .nb-order-price").innerText(),
      /21[.,]20/,
    );
    await page.locator('[name="paymentChoice"]').selectOption("deposit");
    await page.screenshot({
      path: path.join(out, "order-review-mobile.png"),
      fullPage: true,
    });
    const quoteResponse = page.waitForResponse((r) =>
      new URL(r.url()).pathname.endsWith("/checkout/quote"),
    );
    await page.getByRole("button", { name: "Continue to Square" }).click();
    const firstOrder = (await (await quoteResponse).json()).order;
    const id = firstOrder.id;
    assert.equal(firstOrder.pricing.deliveryCents, 875);
    assert.equal(firstOrder.totalCents, 2120);
    assert.equal(firstOrder.customer.recipient.name, "Gift recipient");
    await page.getByRole("heading", { name: "Mock Square checkout" }).waitFor();
    assert.equal(f.network.links.size, 1);
    await page.goto(`${origin}/receipt.html#shop=${f.shop.id}&order=${id}`);
    await page
      .getByText("Waiting for payment confirmation", { exact: true })
      .waitFor();
    await page.getByText(deliveryNote, { exact: false }).waitFor();
    assert.ok(
      (await page.locator("#whatsappFlorist").getAttribute("href")).startsWith(
        "https://wa.me/15551234567?text=",
      ),
    );
    await page
      .getByText("123 Blossom Lane, Toronto", { exact: false })
      .waitFor();
    assert.equal(await page.locator("script:not([src])").count(), 0);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    assert.ok(!page.url().includes(token));
    await page.screenshot({
      path: path.join(out, "receipt-mobile.png"),
      fullPage: true,
    });
    f.complete(1, 1060);
    // Bounded automatic refresh notices the verified payment without manual reload.
    await page
      .getByText("Deposit received", { exact: true })
      .waitFor({ timeout: 15000 });
    assert.equal(await page.locator("#payDeposit").isDisabled(), true);
    await page.getByRole("button", { name: /Pay remaining balance/ }).click();
    await page.getByRole("heading", { name: "Mock Square checkout" }).waitFor();
    f.complete(2, 1060);
    await page.goto(`${origin}/receipt.html#shop=${f.shop.id}&order=${id}`);
    await page.getByText("Paid in full", { exact: true }).waitFor();
    assert.equal(await page.locator("#payFull").count(), 0);
    await page.screenshot({
      path: path.join(out, "receipt-paid-mobile.png"),
      fullPage: true,
    });
    const savedKey = `nebula-order:${f.shop.id}:${id}`;
    const savedToken = await page.evaluate(
      (key) => localStorage.getItem(key),
      savedKey,
    );
    assert.ok(savedToken);
    await page.goto(`${origin}/receipt.html`);
    await page.getByText("Paid in full", { exact: true }).waitFor();
    // Explicit incomplete links cannot borrow the last saved order's identity.
    await page.goto(
      `${origin}/receipt.html#shop=${f.shop.id}&token=${"Z".repeat(43)}`,
    );
    await page.getByRole("alert").waitFor();
    assert.equal(
      await page.evaluate((key) => localStorage.getItem(key), savedKey),
      savedToken,
    );
    // Even a complete link with a wrong token cannot poison the recovery store.
    await page.goto(
      `${origin}/receipt.html#shop=${f.shop.id}&order=${id}&token=${"Z".repeat(43)}`,
    );
    await page.getByRole("alert").waitFor();
    assert.equal(
      await page.evaluate((key) => localStorage.getItem(key), savedKey),
      savedToken,
    );
    await page.goto(`${origin}/receipt.html#shop=${f.shop.id}&order=${id}`);
    await page.getByText("Paid in full", { exact: true }).waitFor();
    const other = await browser.newContext(),
      blocked = await other.newPage();
    await blocked.goto(`${origin}/receipt.html#shop=${f.shop.id}&order=${id}`);
    await blocked.getByRole("alert").waitFor();
    assert.equal(await blocked.locator("#payFull").count(), 0);

    // A quote outage keeps the first request and all customer fields, with one recovery link.
    await page.goto(`${origin}/s/${f.shop.slug}`);
    await page.locator('[data-action="product-request"]').first().click();
    await page.locator('[name="name"]').fill("Retry customer");
    await page.locator('[name="phone"]').fill("+15551234567");
    await page.locator('[name="date"]').fill(deliveryDate);
    await page.locator('[name="paymentChoice"]').selectOption("deposit");
    let requestsCreated = 0;
    page.on("request", (request) => {
      if (
        new URL(request.url()).pathname.endsWith("/requests") &&
        request.method() === "POST"
      )
        requestsCreated++;
    });
    await page.route("**/checkout/quote", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Test quote outage" }),
      }),
    );
    await page.getByRole("button", { name: "Continue to Square" }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Test quote outage" })
      .waitFor();
    await page.getByRole("button", { name: "Resume secure checkout" }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Test quote outage" })
      .waitFor();
    assert.equal(await page.locator(".nb-order-recovery").count(), 1);
    assert.equal(requestsCreated, 1);
    assert.equal(
      await page.locator('[name="paymentChoice"]').isDisabled(),
      true,
    );
    await page.unroute("**/checkout/quote");
    // A lost Square response retries the same deposit and reaches one hosted link.
    const linksBefore = f.network.links.size;
    f.network.failCreate = true;
    await page.getByRole("button", { name: "Resume secure checkout" }).click();
    await page.getByRole("heading", { name: "Mock Square checkout" }).waitFor();
    assert.equal(f.network.links.size, linksBefore + 1);
    assert.equal(requestsCreated, 1);

    // Full-only is enforced in the storefront and on the saved receipt too.
    const currentPolicy = (
      await (await f.call(`/api/shops/${f.shop.id}/commerce`)).json()
    ).settings;
    const putChoice = (choice) =>
      f.call(`/api/shops/${f.shop.id}/commerce`, {
        method: "PUT",
        body: {
          ...settings,
          version: currentPolicy.version + (choice === "full" ? 0 : 1),
          deliveryNote,
          fulfillmentRules,
          paymentOptions: choice,
        },
      });
    assert.equal((await putChoice("full")).status, 200);
    await page.goto(`${origin}/s/${f.shop.slug}`);
    await page.locator('[data-action="product-request"]').first().click();
    assert.equal(
      await page.locator('[name="paymentChoice"] option').count(),
      1,
    );
    assert.equal(
      await page.locator('[name="paymentChoice"]').inputValue(),
      "full",
    );
    await page.locator('[name="name"]').fill("Full only customer");
    await page.locator('[name="phone"]').fill("+15551234567");
    await page.locator('[name="date"]').fill(deliveryDate);
    await page
      .getByRole("status")
      .filter({ hasText: "Full payment" })
      .waitFor();
    const fullQuote = page.waitForResponse((r) =>
      new URL(r.url()).pathname.endsWith("/checkout/quote"),
    );
    await page.getByRole("button", { name: "Continue to Square" }).click();
    const fullOrder = (await (await fullQuote).json()).order;
    assert.equal(fullOrder.paymentOptions, "full");
    await page.getByRole("heading", { name: "Mock Square checkout" }).waitFor();
    await page.goto(
      `${origin}/receipt.html#shop=${f.shop.id}&order=${fullOrder.id}`,
    );
    await page.locator("#payFull").waitFor();
    assert.equal(await page.locator("#payDeposit").isVisible(), false);
    assert.equal((await putChoice("full_and_deposit")).status, 200);

    // Browsers may deny persistent storage while allowing this tab's session.
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("Storage blocked", "SecurityError");
        },
      });
    });
    await page.goto(
      `${origin}/receipt.html#shop=${f.shop.id}&request=${f.requestId}&token=${token}`,
    );
    await page.locator("#payDeposit").waitFor();
    const fallbackId = new URLSearchParams(
      new URL(page.url()).hash.slice(1),
    ).get("order");
    assert.ok(!page.url().includes(token));
    await page.locator("#payDeposit").click();
    await page.getByRole("heading", { name: "Mock Square checkout" }).waitFor();
    await page.goto(
      `${origin}/receipt.html#shop=${f.shop.id}&order=${fallbackId}`,
    );
    await page.locator("#payDeposit").waitFor();

    // Denying both stores must not erase recovery access or start checkout.
    await page.addInitScript(() => {
      Object.defineProperty(window, "sessionStorage", {
        get() {
          throw new DOMException("Storage blocked", "SecurityError");
        },
      });
    });
    await page.goto(
      `${origin}/receipt.html#shop=${f.shop.id}&order=${fallbackId}&token=${token}`,
    );
    await page.locator("#payDeposit").waitFor();
    assert.ok(
      page.url().includes(token),
      "Keep the private fragment when storage is unavailable",
    );
    let attemptedPayment = 0;
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.endsWith("/checkout/pay"))
        attemptedPayment++;
    });
    await page.locator("#payDeposit").click();
    await page
      .getByRole("status")
      .filter({ hasText: "Browser storage is blocked" })
      .waitFor();
    assert.equal(attemptedPayment, 0);
    await page.reload();
    await page.locator("#payDeposit").waitFor();
    assert.deepEqual(errors, []);
    assert.deepEqual(outbound, []);
    await other.close();
    await ctx.close();
    console.log(
      "PASS local storefront-to-checkout and receipt UI: zone fees, closed-date rejection, saved gift recipient, final tax/delivery review, secret recovery, phone layout, deposit, balance, confirmed paid state, cross-browser access denial, session-storage fallback and safe blocked-storage recovery. All Square activity is simulated.",
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
