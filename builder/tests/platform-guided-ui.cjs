/* End-to-end local browser QA. Firebase SDK requests are intercepted locally;
 * no accounts, email, subscription or payment API calls leave this test. */
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");

(async () => {
  const { fixture } = await import(
    "../../cloudflare/platform/test/fixtures.mjs"
  );
  const root = path.resolve(__dirname, "../../platform/public");
  const output = path.resolve(
    __dirname,
    "../../.private/qa/platform/guided-ui",
  );
  fs.mkdirSync(output, { recursive: true });
  const catalog = JSON.parse(
    fs.readFileSync(path.join(root, "catalog.json"), "utf8"),
  );
  const types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".webp": "image/webp",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
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
    env: {
      ASSETS: assets,
      ENVIRONMENT: "local",
      MANUAL_ACTIVATION_ENABLED: "true",
      PUBLISHING_ENABLED: "true",
    },
    verifyIdentity: async (id) => ({
      uid: "uid-" + id,
      email: id + "@example.test",
      authTime: Date.now() / 1000,
    }),
    verifyAdmin: async (actor) => actor.uid === "uid-owner",
  });
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
    badRequests = [];
  async function context(
    viewport = { width: 1365, height: 900 },
    identity = null,
  ) {
    const ctx = await browser.newContext({ viewport });
    if (identity)
      await ctx.addInitScript((value) => {
        try {
          if (!sessionStorage.getItem("qaIdentity"))
            sessionStorage.setItem("qaIdentity", value);
        } catch {}
      }, identity);
    await ctx.route("https://www.gstatic.com/firebasejs/**", async (route) => {
      if (route.request().url().endsWith("/firebase-app.js"))
        return route.fulfill({
          contentType: "text/javascript",
          body: "export const initializeApp=c=>c;",
        });
      return route.fulfill({
        contentType: "text/javascript",
        body: `
        let listener;const auth={currentUser:null};
        function setUser(id){auth.currentUser=id?{uid:'uid-'+id,email:id+'@example.test',emailVerified:true,reload:async()=>{},getIdToken:async()=>id}:null;}
        setUser(sessionStorage.getItem('qaIdentity'));
        export const getAuth=()=>auth,browserSessionPersistence={};
        export const setPersistence=async()=>{};
        export const onAuthStateChanged=(a,cb)=>{listener=cb;queueMicrotask(()=>cb(auth.currentUser));return()=>{};};
        export class GoogleAuthProvider{}
        export async function signInWithPopup(){sessionStorage.setItem('qaIdentity','owner');setUser('owner');listener?.(auth.currentUser);return{user:auth.currentUser};}
        export async function signOut(){sessionStorage.removeItem('qaIdentity');setUser(null);listener?.(null);}
        export const signInWithEmailAndPassword=signInWithPopup;
        export const reauthenticateWithPopup=async()=>({user:auth.currentUser});
        export async function sendPasswordResetEmail(){throw Error('Outbound email is forbidden in this test');}
        export async function sendEmailVerification(){throw Error('Outbound email is forbidden in this test');}
      `,
      });
    });
    // Everything else external is forbidden, including accidental order links.
    await ctx.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin === origin || url.hostname === "www.gstatic.com")
        return route.fallback();
      if (url.hostname === "fonts.googleapis.com")
        return route.fulfill({
          contentType: "text/css",
          body: "/* use local fallback fonts in offline QA */",
        });
      badRequests.push(url.href);
      return route.abort();
    });
    ctx.on("page", (p) => {
      p.on("pageerror", (e) => errors.push(e.message));
    });
    return ctx;
  }
  try {
    const ctx = await context({ width: 390, height: 844 }, "other"),
      page = await ctx.newPage();
    page.setDefaultTimeout(20000);
    await page.goto(origin + "/dashboard");
    await page.locator("#shopName").fill("First Bouquet Studio");
    await page.locator("#createShopForm > details > summary").click();
    await page.locator('[data-wizard="country"]').selectOption("CA");
    await page.locator('[data-wizard="timeZone"]').fill("America/Toronto");
    await page.locator('[data-wizard="currency"]').selectOption("CAD");
    await page.locator('#createShopForm button[type="submit"]').click();
    await page
      .getByRole("button", { name: "Explore my shop first", exact: true })
      .click();
    await page.goto(origin + "/dashboard/products?setup=1");
    await page.locator(".collection-intro").waitFor();
    assert.ok(page.url().includes("setup=1"));
    assert.equal(await page.locator(".sidebar-nav>a").count(), 5);
    assert.equal(
      (
        await page.locator('.setup-progress [aria-current="step"]').innerText()
      ).replace(/\s+/g, " "),
      "2 First bouquet",
    );
    const saved = () =>
      page.waitForFunction(
        () =>
          document.querySelector("#saveState")?.textContent ===
          "All changes saved",
      );
    // Builder-focused is the default. Expand to a product shop without replacing content.
    await page.goto(origin + "/dashboard/shop");
    await page
      .locator('[data-action="shop-presentation"][data-style="shop"]')
      .click();
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await saved();
    // A fixed-product-only shop can explicitly turn the independent builder off.
    await page.goto(origin + "/dashboard/collection?setup=1");
    await page.locator(".builder-visibility > summary").click();
    await page.locator("[data-open-builder]").uncheck();
    await saved();
    await page.goto(origin + "/dashboard/products?setup=1");
    await page.locator('[data-action="add-product"]').first().click();
    await page.locator('[data-item-key="title"]').fill("Pink Celebration");
    await page.locator('[data-item-key="priceCents"]').fill("39.95");
    await page
      .locator('input[data-kind="product"]')
      .setInputFiles(path.join(root, "assets/studio-pink.webp"));
    await page.locator(".product-photo img").waitFor();
    await saved();
    const shop = (
      await (await f.call("/api/session", { token: "other" })).json()
    ).shop;
    assert.equal(shop.draft.home.sections.includes("builder"), false);
    assert.deepEqual(shop.draft.flowerPrices, {});
    assert.equal(shop.draft.products[0].priceCents, 3995);
    // Hiding the optional product section must not delete an uploaded product.
    await page.goto(origin + "/dashboard/shop");
    await page
      .locator('[data-action="shop-presentation"][data-style="builder"]')
      .click();
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await saved();
    await page.screenshot({
      path: path.join(output, "builder-style-mobile.png"),
      fullPage: true,
    });
    await page.goto(origin + "/s/" + shop.slug);
    await page.locator("#builder").waitFor();
    assert.equal(await page.locator("#products").count(), 0);
    await page.goto(origin + "/dashboard/shop");
    await page
      .locator('[data-action="shop-presentation"][data-style="shop"]')
      .click();
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await saved();
    const expanded = (
      await (await f.call("/api/session", { token: "other" })).json()
    ).shop;
    assert.deepEqual(expanded.draft.products, shop.draft.products);
    await page.goto(origin + "/dashboard/collection?setup=1");
    await page.locator(".builder-visibility > summary").click();
    await page.locator("[data-open-builder]").uncheck();
    await saved();
    await page.goto(origin + "/dashboard/products?setup=1");
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "No setup overflow at " + width,
      );
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: path.join(output, "first-product-mobile.png"),
      fullPage: true,
    });
    await page
      .locator(".setup-next")
      .getByRole("link", { name: "Save & continue" })
      .click();
    await page.locator('[data-path="phone"]').fill("+14165550123");
    await page.locator('[data-path="requestChannel"]').selectOption("both");
    await saved();
    assert.equal(
      await page.locator(".optional-square").getAttribute("open"),
      null,
    );
    assert.equal(
      await page.locator("[data-delivery-settings]").isVisible(),
      false,
    );
    await page.locator('[name="deliveryEnabled"]').check();
    assert.equal(
      await page.locator("[data-delivery-settings]").isVisible(),
      true,
    );
    await page.locator("[data-delivery-settings] details > summary").click();
    await page.locator(".fulfillment-options > summary").click();
    await page.locator('[name="enforceDeliveryZones"]').check();
    await page.locator("[data-add-zone]").click();
    await page.locator("[data-zone-name]").fill("Downtown");
    await page.locator("[data-zone-codes]").fill("M5V*, M5H*");
    await page.locator("[data-zone-fee]").fill("8.75");
    await page.locator('[name="calendarEnabled"]').check();
    await page.locator('[name="leadHours"]').fill("24");
    await page.getByRole("button", { name: "Save order settings" }).click();
    await page
      .locator("#commerceResult")
      .filter({ hasText: "Checkout rules saved" })
      .waitFor();
    const commerce = (
      await (
        await f.call("/api/shops/" + shop.id + "/commerce", { token: "other" })
      ).json()
    ).settings;
    assert.equal(
      commerce.enabled,
      false,
      "Message setup does not enable Square",
    );
    assert.equal(commerce.fulfillmentRules.deliveryZones[0].feeCents, 875);
    assert.equal(commerce.fulfillmentRules.leadHours, 24);
    await page.locator('[name="leadHours"]').fill("48");
    await page.locator(".optional-square > summary").click();
    await page.locator('[data-action="square-refresh"]').click();
    await page
      .locator('[data-action="square-refresh"]')
      .waitFor({ state: "visible" });
    await page.waitForFunction(
      () => !document.querySelector('[data-action="square-refresh"]').disabled,
    );
    assert.equal(
      await page.locator('[name="leadHours"]').inputValue(),
      "48",
      "Connection refresh keeps unsaved delivery edits",
    );
    await page.screenshot({
      path: path.join(output, "delivery-rules-mobile.png"),
      fullPage: true,
    });
    await page
      .locator(".setup-next")
      .getByRole("link", { name: "Save & continue" })
      .click();
    await page.getByText("CONTENT READY", { exact: true }).waitFor();
    const continuedRules = (
      await (
        await f.call("/api/shops/" + shop.id + "/commerce", { token: "other" })
      ).json()
    ).settings;
    assert.equal(
      continuedRules.fulfillmentRules.leadHours,
      48,
      "Continue saves order rules without another manual button",
    );
    const current = (
      await (await f.call("/api/session", { token: "other" })).json()
    ).shop;
    const sql = f.env.SHOPS.objects.get(current.id).state.storage.sql;
    sql.exec(
      "UPDATE shop SET data=?",
      JSON.stringify({
        ...current,
        subscription: {
          status: "active",
          source: "admin_complimentary",
          paidUntil: Date.now() + 86400000,
          testEnvironment: false,
        },
      }),
    );
    await page.reload();
    await page
      .getByRole("button", { name: /(?:Publish|Open) my shop/, exact: false })
      .click();
    await page
      .getByRole("button", { name: "Open my customer shop", exact: false })
      .waitFor();
    await page.goto(origin + "/s/" + current.slug + "?view=live");
    await page.locator(".flower-card").waitFor();
    assert.equal(await page.locator("#builder").count(), 0);
    await page
      .locator(".flower-card")
      .getByRole("button", { name: "Order", exact: false })
      .click();
    await page.locator('[name="name"]').fill("Test Buyer");
    await page.locator('[name="phone"]').fill("+14165550199");
    await page
      .locator('[name="date"]')
      .fill(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    await page.locator('[name="isGift"]').check();
    await page.locator('[name="recipientName"]').fill("Gift Person");
    await page.locator('[name="giftMessage"]').fill("A little thank you");
    await page
      .getByRole("button", { name: "Send unpaid request", exact: false })
      .click();
    await page
      .getByRole("link", { name: "Open WhatsApp draft", exact: false })
      .waitFor();
    const stored = JSON.parse(
      sql.exec("SELECT data FROM customer_requests")[0].data,
    );
    assert.equal(stored.customer.recipient.name, "Gift Person");
    assert.equal(stored.customer.recipient.message, "A little thank you");
    await page.goto(origin + "/dashboard/collection?setup=1");
    await page.locator("#recipeInspiration").evaluate((n) => (n.open = true));
    await page.locator('[data-action="add-card"]').first().click();
    await page.locator(".collection-editor").waitFor();
    await saved();
    const cardForPricing = (
      await (await f.call("/api/session", { token: "other" })).json()
    ).shop.draft.collection[0];
    await page.goto(
      origin + "/dashboard/prices?used=" + cardForPricing.id + "&setup=1",
    );
    await page.locator("[data-flower-price]").first().waitFor();
    const shownIds = await page
      .locator("[data-flower-price]")
      .evaluateAll((nodes) => nodes.map((node) => node.dataset.flowerPrice));
    const selected = (
      await (await f.call("/api/session", { token: "other" })).json()
    ).shop.draft.collection[0];
    const recipe = catalog.recipes.find((row) => row.id === selected.recipeId);
    assert.deepEqual(
      shownIds.sort(),
      [...new Set(recipe.design.items.map((row) => row.id))].sort(),
      "Focused pricing shows only the recipe's flowers",
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(badRequests, []);
    await ctx.close();
    console.log(
      "PASS four-step saved setup, five primary sections, first photo product without stem pricing, optional Square, publishing, 320/390/768px and persisted gift recipient. Local SQLite and mocked identity only.",
    );
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
