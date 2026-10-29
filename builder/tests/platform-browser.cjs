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
  const output = path.resolve(__dirname, "../../.private/qa/platform/browser");
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
  const owner = await context();
  const page = await owner.newPage();
  page.setDefaultTimeout(15000);
  const readShop = async (token = "owner") =>
    (await (await f.call("/api/session", { token })).json()).shop;
  async function saved(p) {
    await p.waitForFunction(
      () =>
        document.querySelector("#saveState")?.textContent ===
        "All changes saved",
      undefined,
      { timeout: 20000 },
    );
  }
  async function clickSave(p) {
    const button = p.locator('[data-action="save"]');
    if (await button.isEnabled()) await button.click();
    await saved(p);
  }
  async function studioReady(p) {
    try {
      await p.waitForFunction(() => window.NebulaApp?.ready, undefined, {
        timeout: 50000,
      });
    } catch (e) {
      console.error(
        await p.evaluate(() => ({
          boot: document.querySelector("#platformBoot")?.textContent,
          errors: window.__errors,
        })),
      );
      throw e;
    }
  }
  async function fillSample(p) {
    await p.goto(origin + "/dashboard/prices");
    await p.locator('[data-action="sample-prices"]').click();
    await p
      .locator("#pageMessage")
      .filter({ hasText: "Sample prices saved" })
      .waitFor();
    await saved(p);
  }
  async function addCards(p, n) {
    await p.goto(origin + "/dashboard/collection");
    for (let i = 0; i < n; i++)
      await p
        .locator('[data-action="add-card"]')
        .nth(i % 3)
        .click();
    await clickSave(p);
  }
  try {
    await page.goto(origin + "/login");
    await page.getByRole("button", { name: "Continue with Google" }).waitFor();
    await page.screenshot({
      path: path.join(output, "login-desktop.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Continue with Google" }).click();
    await page.locator("#shopName").fill("Runtime Flower Room");
    await page.locator('[data-wizard="currency"]').selectOption("CAD");
    await page.locator('#createShopForm button[type="submit"]').click();
    await page.locator('#createShopForm button[type="submit"]').click();
    await page.locator(".sidebar").waitFor();
    let shop = await readShop();
    assert.equal(
      shop.draft.collection.length,
      0,
      "No unsolicited starting recipes",
    );
    assert.deepEqual(shop.draft.flowerPrices, {});
    await fillSample(page);
    await addCards(page, 6);
    assert.equal(await page.locator(".collection-editor").count(), 6);
    assert.equal(
      await page.locator('[data-action="add-card"]:enabled').count(),
      0,
    );
    shop = await readShop();
    assert.equal(shop.draft.collection.length, 6);
    await page.goto(origin + "/dashboard/products");
    for (let i = 0; i < 10; i++)
      await page.locator('[data-action="add-product"]').first().click();
    assert.equal(
      await page.locator('[data-action="add-product"]:enabled').count(),
      0,
    );
    await page
      .locator('[data-item-kind="products"][data-item-key="title"]')
      .first()
      .fill("Ready-made roses");
    await page
      .locator('[data-item-kind="products"][data-item-key="description"]')
      .first()
      .fill("Exactly as photographed.");
    await page
      .locator('[data-item-kind="products"][data-item-key="priceCents"]')
      .evaluateAll((nodes) =>
        nodes.forEach((input, index) => {
          input.value = String(39.95 + index);
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }),
      );
    await clickSave(page);
    shop = await readShop();
    assert.equal(shop.draft.products.length, 10);
    assert.equal(shop.draft.products[0].priceCents, 3995);
    await page.goto(origin + "/dashboard/shop");
    await page.locator('input[data-path="city"]').fill("Toronto");
    await page.locator('input[data-path="phone"]').fill("+14165550123");
    await clickSave(page);
    await page
      .locator('input[data-kind="logo"]')
      .setInputFiles(path.join(root, "assets/studio-pink.webp"));
    await page.waitForFunction(
      () =>
        document.querySelector(".logo-preview img")?.complete &&
        document.querySelector(".logo-preview img")?.naturalWidth > 0,
    );
    await saved(page);
    shop = await readShop();
    assert.match(shop.draft.logoMediaId, /^img_[a-f0-9]{64}$/);
    await page.goto(origin + "/dashboard/editor");
    await page.locator('[data-edit="headline"]').click();
    const headline = page.locator('[data-path="home.headline"]');
    await headline.fill("Flowers made for your moments");
    await page.locator('[data-action="close-inspector"]').first().click();
    await clickSave(page);
    await page.screenshot({
      path: path.join(output, "editor-desktop.png"),
      fullPage: true,
    });
    shop = await readShop();
    assert.equal(shop.draft.home.headline, "Flowers made for your moments");
    await page.goto(origin + "/s/" + shop.slug);
    await page.locator("#custom .flower-card").first().waitFor();
    assert.equal(await page.locator("#custom .flower-card").count(), 6);
    assert.equal(await page.locator("#products .flower-card").count(), 10);
    const links = await page
      .locator("#custom .flower-card")
      .first()
      .locator("a[data-studio]")
      .evaluateAll((nodes) => nodes.map((n) => n.href));
    assert.equal(
      new URL(links[0]).searchParams.get("card"),
      new URL(links[1]).searchParams.get("card"),
    );
    await page.screenshot({
      path: path.join(output, "storefront-desktop.png"),
      fullPage: true,
    });
    await page
      .locator("#custom .flower-card")
      .first()
      .getByRole("link", { name: "Custom Order" })
      .click();
    await studioReady(page);
    await page.locator(".nb-order-review").waitFor();
    assert.equal(
      await page.locator('.nb-order-form button[type="submit"]').isEnabled(),
      false,
      "Owner order preview cannot send",
    );
    await page
      .locator(".nb-order-form")
      .evaluate((form) =>
        form.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        ),
      );
    assert.equal(
      (await (await f.call("/api/shops/" + shop.id + "/requests")).json())
        .requests.length,
      0,
    );
    await page
      .getByRole("button", { name: "Close request", exact: true })
      .click();
    await page.evaluate(() => NebulaApp.setTab("finishing"));
    await page.locator("#designName").fill("Saved exact fresh design");
    await page.locator("#designName").blur();
    await page.locator("#platformSaveCollection").click();
    await page
      .locator("#platformSaveStatus")
      .filter({ hasText: "Saved" })
      .waitFor();
    const firstDesign = await page.evaluate(() =>
      NebulaPlatformStudio.design(),
    );
    shop = await readShop();
    assert.deepEqual(shop.draft.collection[0].design, firstDesign);
    await page.reload();
    await studioReady(page);
    assert.deepEqual(
      await page.evaluate(() => NebulaPlatformStudio.design()),
      firstDesign,
    );
    assert.equal(
      await page.locator("#nebula-order-modal").count(),
      0,
      "The order action is consumed once",
    );
    await page.locator("#platformUseDesignCover").click();
    await page
      .locator("#platformSaveStatus")
      .filter({ hasText: "collection photo" })
      .waitFor();
    shop = await readShop();
    assert.match(shop.draft.collection[0].cover, /^img_[a-f0-9]{64}$/);
    const designPhoto = await f.call(
      "/api/shops/" + shop.id + "/media/" + shop.draft.collection[0].cover,
    );
    assert.equal(designPhoto.status, 200);
    assert.match(designPhoto.headers.get("Content-Type"), /^image\/(webp|png)/);
    assert.deepEqual(
      shop.draft.collection[0].design,
      firstDesign,
      "Creating a cover keeps the saved semantic design intact",
    );
    for (const mode of ["classic", "heart", "dome"]) {
      await page.locator('[data-mode="' + mode + '"]').click();
      await page.waitForFunction(
        (value) => NebulaApp.state.mode === value,
        mode,
      );
      // Modes keep independent bouquets. Switching can legitimately open an
      // empty design; exercise saving an offered flower in each one.
      await page.evaluate(() => {
        if (!NebulaApp.state.items.length) NebulaApp.add("rose_pink");
      });
      await page.locator("#platformSaveCollection").click();
      await page
        .locator("#platformSaveStatus")
        .filter({ hasText: "Saved" })
        .waitFor();
      shop = await readShop();
      assert.equal(shop.draft.collection[0].design.mode, mode);
    }
    await page.screenshot({
      path: path.join(output, "studio-desktop.png"),
      fullPage: true,
    });
    await f.call("/api/shops/" + shop.id + "/draft", {
      method: "PUT",
      body: {
        version: shop.version,
        draft: { ...shop.draft, city: "Latest city" },
      },
    });
    await page.locator("#platformSaveCollection").click();
    await page
      .locator("#platformSaveStatus")
      .filter({ hasText: "changed in another tab" })
      .waitFor();
    shop = await readShop();
    assert.equal(shop.draft.city, "Latest city");
    // New satin shop and existing data use the same policy/API, with compatible modes.
    const response = await f.call("/api/shops", {
      method: "POST",
      token: "other",
      body: {
        name: "Satin Room",
        slug: "satin-room",
        currency: "USD",
        preset: "satin",
      },
    });
    assert.equal(response.status, 201);
    const satin = await context({ width: 390, height: 844 }, "other");
    const phone = await satin.newPage();
    phone.setDefaultTimeout(15000);
    await fillSample(phone);
    await phone.locator('[data-action="disable-unpriced"]').click();
    await clickSave(phone);
    await addCards(phone, 5);
    let satinShop = await readShop("other");
    assert.ok(
      satinShop.draft.disabledFlowers.length > 0,
      "Unknown prices are explicitly turned off, with no invented cash conversion or zero fallback",
    );
    assert.equal(
      Object.keys(satinShop.draft.flowerPrices).length,
      catalog.flowers.filter(
        (r) => r.preset === "satin" && Number.isSafeInteger(r.priceCents),
      ).length,
      "Only explicit sample prices may be copied; unknown prices stay unset",
    );
    await phone.goto(
      origin +
        "/studio/studio.html?shop=" +
        satinShop.id +
        "&card=" +
        satinShop.draft.collection[0].id,
    );
    await studioReady(phone);
    assert.equal(
      await phone.locator('[data-mode="classic"]').isVisible(),
      false,
    );
    assert.ok(
      await phone.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await phone.locator("#platformSaveCollection").click();
    await phone
      .locator("#platformSaveStatus")
      .filter({ hasText: "Saved" })
      .waitFor();
    satinShop = await readShop("other");
    assert.ok(satinShop.draft.collection[0].design);
    await phone.screenshot({
      path: path.join(output, "satin-studio-mobile.png"),
      fullPage: true,
    });
    await phone.goto(
      origin + "/studio/studio.html?shop=" + satinShop.id + "&blank=1",
    );
    await studioReady(phone);
    await phone.locator("#platformCardTitle").fill("My new satin recipe");
    // An empty bouquet must never become a sellable design; add an offered item.
    await phone.evaluate(() => {
      const id = Object.keys(NebulaConfig.CAT).find(
        (id) =>
          NebulaConfig.CAT[id].kind === "flower" &&
          NebulaConfig.CAT[id].top !== false,
      );
      NebulaApp.add(id);
    });
    await phone.locator("#platformSaveCollection").click();
    await phone
      .locator("#platformSaveStatus")
      .filter({ hasText: "Saved" })
      .waitFor();
    satinShop = await readShop("other");
    assert.equal(satinShop.draft.collection.length, 6);
    assert.equal(satinShop.draft.collection[5].title, "My new satin recipe");
    await satin.close();
    const anon = await context({ width: 390, height: 844 });
    const visitor = await anon.newPage();
    visitor.setDefaultTimeout(15000);
    await visitor.goto(origin + "/s/" + shop.slug);
    await visitor
      .getByText("This shop isn’t open to the public yet.", { exact: false })
      .waitFor();
    assert.equal(
      (await visitor.request.get(origin + "/api/shops/" + shop.id)).status(),
      404,
    );
    // Only local QA receives a synthetic entitlement, never the deployed service.
    shop = await readShop();
    const object = f.env.SHOPS.objects.get(shop.id);
    object.state.storage.sql.exec(
      "UPDATE shop SET data=? WHERE singleton=1",
      JSON.stringify({
        ...shop,
        subscription: {
          status: "active",
          paidUntil: Date.now() + 86400000,
          testEnvironment: false,
        },
      }),
    );
    f.env.PUBLISHING_ENABLED = "true";
    const published = await f.call("/api/shops/" + shop.id + "/publish", {
      method: "POST",
      body: { version: shop.version },
    });
    assert.equal(published.status, 200, await published.clone().text());
    await visitor.reload();
    await visitor.locator("#products .flower-card").first().waitFor();
    assert.equal(await visitor.locator("#custom .flower-card").count(), 6);
    await visitor.locator('[data-action="product-request"]').first().click();
    await visitor
      .locator('.nb-order-form input[name="name"]')
      .fill("Local Test Customer");
    await visitor
      .locator('.nb-order-form input[name="phone"]')
      .fill("5551234567");
    await visitor.locator('.nb-order-form button[type="submit"]').click();
    await visitor.getByText("YOUR REQUEST IS SAVED", { exact: true }).waitFor();
    const requests = await (
      await f.call("/api/shops/" + shop.id + "/requests")
    ).json();
    assert.equal(requests.requests.length, 1);
    assert.equal(requests.requests[0].totalCents, 3995);
    await visitor.locator("[data-close]").click();
    await visitor.screenshot({
      path: path.join(output, "storefront-mobile.png"),
      fullPage: true,
    });
    await visitor
      .locator("#custom .flower-card")
      .first()
      .getByRole("link", { name: "Customise" })
      .click();
    await studioReady(visitor);
    assert.equal(await visitor.locator("#platformSaveCollection").count(), 0);
    assert.equal(
      await visitor.locator("#platformRequestOrder").isEnabled(),
      true,
    );
    await visitor.locator("#platformRequestOrder").click();
    await visitor
      .locator('.nb-order-form input[name="name"]')
      .fill("Local Design Customer");
    await visitor
      .locator('.nb-order-form input[name="phone"]')
      .fill("5551234568");
    await visitor.locator('.nb-order-form button[type="submit"]').click();
    await visitor.getByText("YOUR REQUEST IS SAVED", { exact: true }).waitFor();
    assert.equal(
      (await (await f.call("/api/shops/" + shop.id + "/requests")).json())
        .requests.length,
      2,
    );
    await visitor.goto(origin + "/s/" + shop.slug);
    await visitor
      .locator("#custom .flower-card")
      .first()
      .getByRole("link", { name: "Custom Order" })
      .click();
    await studioReady(visitor);
    await visitor.locator(".nb-order-review").waitFor();
    assert.equal(
      await visitor.locator('.nb-order-form button[type="submit"]').isEnabled(),
      true,
      "Public order action opens the same recipe review",
    );
    assert.equal(new URL(visitor.url()).searchParams.has("action"), false);
    await visitor
      .getByRole("button", { name: "Close request", exact: true })
      .click();
    assert.equal(
      (await (await f.call("/api/shops/" + shop.id + "/requests")).json())
        .requests.length,
      2,
      "Reviewing without submitting creates no order",
    );
    await anon.close();
    await page.goto(origin + "/admin");
    await page.locator(".admin-table tbody tr").first().waitFor();
    assert.ok((await page.locator(".admin-table tbody tr").count()) >= 2);
    await page.screenshot({
      path: path.join(output, "admin-desktop.png"),
      fullPage: true,
    });
    await page.goto(origin + "/dashboard/payments");
    await page.getByText("SETUP PENDING", { exact: true }).waitFor();
    assert.equal(
      await page.locator('[data-action="square-connect"]').isEnabled(),
      false,
    );
    await page.locator("#commerceSettings").waitFor();
    await page.locator('#commerceSettings input[name="tax"]').fill("0");
    await page.locator('#commerceSettings input[name="delivery"]').fill("5");
    await page
      .locator('#commerceSettings textarea[name="terms"]')
      .fill(
        "Pickup by arrangement. Balance due before collection. Contact the florist for cancellations.",
      );
    await page
      .locator('#commerceSettings input[name="pricesApproved"]')
      .check();
    await page.locator('#commerceSettings button[type="submit"]').click();
    await page
      .getByText(
        "Checkout rules saved. Existing paid orders keep their agreed totals.",
        { exact: true },
      )
      .waitFor();
    await page.goto(origin + "/dashboard/billing");
    await page.locator("#requestActivation").click();
    await page
      .getByText(
        "Request saved. Message @nebulaa_studio with your shop reference to arrange your invoice.",
        { exact: true },
      )
      .waitFor();
    await page.goto(origin + "/admin");
    await page
      .locator(`[data-action="admin-select"][data-id="${shop.id}"]`)
      .click();
    await page.locator("#manualActivationForm").waitFor();
    await page
      .locator('#manualActivationForm input[name="reference"]')
      .fill("BROWSER-PAYPAL-0001");
    await page.locator('#manualActivationForm input[name="confirmed"]').check();
    await page.locator('#manualActivationForm button[type="submit"]').click();
    await page
      .getByText("Activation audit (1 most recent)", { exact: true })
      .waitFor();
    const activated = await readShop();
    assert.equal(activated.subscription.source, "manual_paypal");
    assert.equal(activated.subscription.revision, 1);
    await page.screenshot({
      path: path.join(output, "manual-activation-admin.png"),
      fullPage: true,
    });
    await page.goto(origin + "/dashboard/billing");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("#requestActivation").waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await page.screenshot({
      path: path.join(output, "manual-plan-mobile.png"),
      fullPage: true,
    });
    assert.deepEqual(errors, [], "No unhandled browser errors");
    assert.deepEqual(badRequests, [], "No unexpected outbound service");
    console.log(
      "PASS V2 actual local API: fresh/satin catalogues,6recipes,10fixedproducts,inlineeditor,immutablelogo,allfreshmodes,satinblank/save,mobile,versions,admin,unpaidrequestreceiptsandpublic/ownerisolation. LocalfakeFirebaseandentitlementonly; norealchargesoremail.",
    );
  } catch (error) {
    await page
      .screenshot({ path: path.join(output, "failure.png"), fullPage: true })
      .catch(() => {});
    console.error(
      "Page:",
      page.url(),
      (
        await page
          .locator("body")
          .innerText()
          .catch(() => "")
      ).slice(0, 3500),
    );
    throw error;
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
