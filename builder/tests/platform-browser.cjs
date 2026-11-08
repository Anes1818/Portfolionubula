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
    for (let i = 0; i < n; i++) {
      await p.locator("#recipeInspiration").evaluate((n) => (n.open = true));
      await p
        .locator('[data-action="add-card"]')
        .nth(i % 3)
        .click();
      await p.waitForFunction(
        (n) => document.querySelectorAll(".collection-editor").length === n,
        i + 1,
      );
    }
    await clickSave(p);
  }
  try {
    await page.goto(origin + "/admin/login");
    await page.getByRole("button", { name: "Continue with Google" }).waitFor();
    await page.screenshot({
      path: path.join(output, "login-desktop.png"),
      fullPage: true,
    });
    assert.equal(await page.locator('[data-action="auth-mode"]').count(), 0);
    await page.getByRole("button", { name: "Continue with Google" }).click();
    await page.locator(".admin-page").waitFor();
    assert.equal(
      await page.locator("#shopName").count(),
      0,
      "Operator does not need to create a flower shop",
    );
    await page
      .getByRole("link", { name: "Florist workspace ↗", exact: true })
      .click();
    await page.locator("#shopName").fill("Runtime Flower Room");
    await page.locator("#createShopForm > details > summary").click();
    await page.locator('[data-wizard="currency"]').selectOption("CAD");
    await page.locator('#createShopForm button[type="submit"]').click();
    await page
      .getByRole("button", { name: "Explore my shop first", exact: true })
      .click();
    await page.goto(origin + "/dashboard/products?setup=1");
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
    const editGroup = async (target) =>
      page
        .locator(`.editor-customization [data-target="${target}"]`)
        .first()
        .click();
    const closeGroup = async () =>
      page.locator('[data-action="close-inspector"]').first().click();
    await editGroup("header");
    await page
      .locator('[data-path="home.announcementText"]')
      .fill("Holiday orders open · Toronto pickup");
    await page.locator('[data-path="home.navProducts"]').fill("Gifts");
    await page.locator('[data-path="home.announcementEnabled"]').uncheck();
    assert.equal(await page.locator(".store-announcement").count(), 0);
    await page.locator('[data-path="home.announcementEnabled"]').check();
    await closeGroup();
    await editGroup("hero-copy");
    await page
      .locator('[data-path="home.heroEyebrow"]')
      .fill("Handcrafted in Toronto");
    await page
      .locator('[data-path="home.description"]')
      .fill(
        "Satin flowers for every little celebration.\nChoose your colours and make them yours.",
      );
    await page
      .locator('[data-path="home.heroButtonLabel"]')
      .fill("Shop our gifts");
    await page
      .locator('[data-path="home.heroButtonTarget"]')
      .selectOption("products");
    await page.locator('[data-path="home.heroStamp"]').fill("made with care");
    await closeGroup();
    assert.equal(
      await page.locator(".hero-copy .button").getAttribute("href"),
      "#products",
    );
    await editGroup("sections");
    await page.locator('input[data-section="products"]').uncheck();
    assert.equal(
      await page.locator(".hero-copy .button").getAttribute("href"),
      "#custom",
    );
    assert.equal(
      await page.locator('.store-header nav a[href="#products"]').count(),
      0,
    );
    await page.locator('input[data-section="products"]').check();
    await closeGroup();
    await editGroup("hero-look");
    for (const layout of ["centered", "image-first", "split"]) {
      await page.locator('[data-path="home.heroLayout"]').selectOption(layout);
      assert.equal(
        await page.locator(`.floral-store.hero-layout-${layout}`).count(),
        1,
      );
    }
    await page
      .locator('[data-path="home.heroLayout"]')
      .selectOption("image-first");
    await closeGroup();
    await editGroup("sections");
    await page.locator('[data-target="section-custom"]').click();
    await page
      .locator('[data-path="home.customTitle"]')
      .fill("Build your forever flowers");
    await page
      .locator('[data-path="home.customDescription"]')
      .fill("Choose a favourite and make it personal.");
    await closeGroup();
    await editGroup("contact");
    await page
      .locator('[data-path="home.contactTitle"]')
      .fill("Visit our flower room");
    await page
      .locator('[data-path="home.contactDetails"]')
      .fill("Pickup by appointment\nTuesday–Saturday, 10am–6pm");
    await page.locator('[data-path="instagram"]').fill("@flowerroom");
    await closeGroup();
    await editGroup("footer");
    await page
      .locator('[data-path="home.footerText"]')
      .fill('<img src=x onerror="window.unsafeStorefront=true">');
    assert.equal(
      await page.locator(".store-bottom img").count(),
      0,
      "Store text never becomes executable HTML",
    );
    await page
      .locator('[data-path="home.footerText"]')
      .fill("Handmade with love in Toronto");
    await page
      .locator('[data-path="home.ribbonText"]')
      .fill("Made by hand · Designed by you");
    await closeGroup();
    await editGroup("appearance");
    await page.locator('[data-path="home.motionEnabled"]').uncheck();
    await closeGroup();
    await clickSave(page);
    await page.reload();
    await page.locator(".floral-store.hero-layout-image-first").waitFor();
    assert.equal(
      await page.locator(".store-announcement").textContent(),
      "Holiday orders open · Toronto pickup",
    );
    assert.equal(
      await page.locator("#custom .store-section-heading h2").textContent(),
      "Build your forever flowers",
    );
    assert.equal(
      await page
        .locator('#contact a[href="https://www.instagram.com/flowerroom/"]')
        .count(),
      1,
    );
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
    assert.equal(links.length, 1, "Only Customise navigates to the builder");
    assert.ok(new URL(links[0]).searchParams.get("card"));
    await page.screenshot({
      path: path.join(output, "storefront-desktop.png"),
      fullPage: true,
    });
    await page
      .locator("#custom .flower-card")
      .first()
      .getByRole("button", { name: "Order", exact: false })
      .click();
    await page.locator(".nb-order-review").waitFor();
    assert.equal(
      await page.locator('.nb-order-form button[type="submit"]').isEnabled(),
      false,
      "Owner order preview cannot send",
    );
    assert.equal(
      await page.locator('.nb-order-form input[name="name"]').isDisabled(),
      true,
    );
    await page.getByRole("link", { name: "Go to publishing" }).waitFor();
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
    await page
      .locator("#custom .flower-card")
      .first()
      .getByRole("link", { name: "Customise" })
      .click();
    await studioReady(page);
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
    // Keep explicit coverage of the older direct editor/cover-export route too.
    const legacyEditor = new URL(page.url());
    legacyEditor.searchParams.delete("onboarding");
    await page.goto(legacyEditor.href);
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
    // Explicit Sandbox helper saves a valid small catalogue without granting
    // access or approving tax/payment rules; the main app does not show it.
    await phone.route("**/api/config", async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        json: { ...(await response.json()), sandboxTestAccess: true },
      });
    });
    await phone.goto(origin + "/dashboard/billing");
    await phone.locator('[data-action="review-publication"]').click();
    await phone.locator('[data-action="sandbox-test-catalog"]').waitFor();
    phone.once("dialog", (dialog) => dialog.accept());
    await phone.locator('[data-action="sandbox-test-catalog"]').click();
    await phone
      .locator("#pageMessage")
      .filter({ hasText: "Test catalogue saved" })
      .waitFor();
    assert.equal(
      (await readShop("other")).subscription?.status === "active",
      false,
    );
    await phone.unroute("**/api/config");
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
    await page.goto(origin + "/dashboard/billing");
    await page.locator('[data-action="review-publication"]:enabled').waitFor();
    assert.equal(
      await page.locator("#shopAddress").inputValue(),
      origin + "/s/" + shop.slug,
    );
    await page
      .getByText("Your address is reserved.", { exact: true })
      .waitFor();
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
    // Refresh detects a plan activated elsewhere without losing the draft.
    await page.locator('[data-action="review-publication"]').click();
    // The configuration flag changed only inside this local fixture.
    await page.reload();
    await page.locator('[data-action="publish-shop"]:enabled').waitFor();
    await page.locator('[data-action="publish-shop"]').click();
    await page.getByText("Ready to share.", { exact: true }).waitFor();
    assert.equal(
      await page.locator("#shopAddress").inputValue(),
      origin + "/s/" + shop.slug,
    );
    await page.goto(origin + "/s/" + shop.slug);
    await page.getByRole("link", { name: "Open customer shop" }).click();
    await page.locator('[data-action="product-request"]').first().waitFor();
    assert.equal(await page.locator(".preview-banner").count(), 0);
    assert.ok(new URL(page.url()).searchParams.get("view") === "live");
    await page.goto(origin + "/dashboard/billing");
    await visitor.reload();
    await visitor.locator("#products .flower-card").first().waitFor();
    assert.equal(await visitor.locator("#custom .flower-card").count(), 6);
    assert.equal(
      await visitor.locator(".store-announcement").textContent(),
      "Holiday orders open · Toronto pickup",
    );
    assert.equal(
      await visitor.locator(".hero-copy .button").getAttribute("href"),
      "#products",
    );
    assert.equal(
      await visitor.locator(".store-motion").count(),
      0,
      "Saved motion preference controls the public page",
    );
    assert.ok(
      await visitor
        .locator(".contact-extra")
        .textContent()
        .then((t) => t.includes("Tuesday–Saturday")),
    );
    assert.equal(
      await visitor.locator(".floral-ribbon .ribbon-copy").isVisible(),
      true,
    );
    assert.ok(
      await visitor.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await visitor.locator('[data-action="product-request"]').first().click();
    await visitor
      .locator('.nb-order-form input[name="name"]')
      .fill("Local Test Customer");
    await visitor
      .locator('.nb-order-form input[name="phone"]')
      .fill("5551234567");
    await visitor.locator('.nb-order-form button[type="submit"]').click();
    await visitor.getByText("YOUR ENQUIRY IS SAVED", { exact: true }).waitFor();
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
    await visitor.getByText("YOUR ENQUIRY IS SAVED", { exact: true }).waitFor();
    assert.equal(
      (await (await f.call("/api/shops/" + shop.id + "/requests")).json())
        .requests.length,
      2,
    );
    const savedDesignRequest = (
      await (await f.call("/api/shops/" + shop.id + "/requests")).json()
    ).requests.find((r) => r.kind === "design");
    const savedDesignDetail = (
      await (
        await f.call(
          "/api/shops/" + shop.id + "/requests/" + savedDesignRequest.id,
        )
      ).json()
    ).request;
    assert.match(savedDesignDetail.preview, /^data:image\/jpeg;base64,/);
    assert.ok(savedDesignDetail.preview.length <= 100000);
    await page.goto(
      origin + "/dashboard/orders?request=" + savedDesignRequest.id,
    );
    await page.locator('.request-contents img[src^="data:image/"]').waitFor();
    assert.ok(
      await page
        .locator(".request-contents img")
        .evaluate((img) => img.complete && img.naturalWidth > 0),
    );
    await page.screenshot({
      path: path.join(output, "merchant-saved-bouquet.png"),
      fullPage: true,
    });
    await visitor.goto(origin + "/s/" + shop.slug);
    await visitor
      .locator("#custom .flower-card")
      .first()
      .getByRole("button", { name: "Order", exact: false })
      .click();
    await visitor.locator(".nb-order-review").waitFor();
    assert.equal(new URL(visitor.url()).pathname, "/s/" + shop.slug);
    const uploadedCover = shop.draft.collection[0].cover;
    assert.ok(uploadedCover);
    await visitor
      .locator(`.nb-order-review img[src$="/${uploadedCover}"]`)
      .waitFor();
    await visitor.waitForFunction(
      () => document.querySelector(".nb-order-review img")?.naturalWidth > 0,
    );
    assert.equal(
      await visitor.locator('.nb-order-form button[type="submit"]').isEnabled(),
      true,
      "Public Order opens checkout directly without visiting the builder",
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
    await page.locator(".optional-square > summary").click();
    await page.getByText("SETUP PENDING", { exact: true }).waitFor();
    assert.equal(
      await page.locator('[data-action="square-connect"]').isEnabled(),
      false,
    );
    await page.locator("#commerceSettings").waitFor({ state: "attached" });
    assert.equal(await page.locator("#enableSandboxCheckout").count(), 0);
    await page.route("**/api/config", async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        json: {
          ...(await response.json()),
          sandboxTestAccess: true,
          squareEnvironment: "sandbox",
        },
      });
    });
    await page.reload();
    await page.locator("#enableSandboxCheckout").waitFor();
    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("#enableSandboxCheckout").click();
    await page
      .getByText(
        "Checkout rules saved. Existing paid orders keep their agreed totals.",
        { exact: true },
      )
      .waitFor();
    const testRules = (
      await (await f.call(`/api/shops/${shop.id}/commerce`)).json()
    ).settings;
    assert.equal(testRules.enabled, true);
    assert.equal(testRules.taxBps, 0);
    assert.equal(testRules.pricesApproved, true);
    assert.match(testRules.terms, /Sandbox testing only/);
    // Still no Square setup in this fixture: the shortcut never creates a
    // connection or skips any server checkout gate.
    assert.equal(
      (await (await f.call(`/api/shops/${shop.id}/square/status`)).json())
        .connected,
      false,
    );
    await page.unroute("**/api/config");
    await page.reload();
    await page.locator(".checkout-settings > summary").click();
    await page.locator("#commerceSettings").waitFor();
    assert.equal(await page.locator("#enableSandboxCheckout").count(), 0);
    await page.locator(".payment-options > summary").click();
    await page.locator('#commerceSettings input[name="enabled"]').uncheck();
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
      .locator(
        '[data-action="admin-filter"][data-status="activation_requested"]',
      )
      .click();
    await page.getByText("No matching accounts.", { exact: true }).waitFor();
    // This fixture still has paid access: renewal requests do not hide its active status.
    await page.locator('[data-action="admin-filter"][data-status=""]').click();
    await page
      .locator(`[data-action="admin-select"][data-id="${satinShop.id}"]`)
      .waitFor();
    await page
      .locator('#manualActivationForm input[name="reference"]')
      .fill("BROWSER-PAYPAL-0001");
    await page.locator('#manualActivationForm input[name="confirmed"]').check();
    let releaseActivation, postedActivation;
    const activationPosted = new Promise(
      (resolve) => (postedActivation = resolve),
    );
    await owner.route(
      `**/api/admin/shops/${shop.id}/activation`,
      async (route) => {
        if (route.request().method() !== "POST") return route.continue();
        const response = await route.fetch();
        await new Promise((resolve) => {
          releaseActivation = resolve;
          postedActivation();
        });
        await route.fulfill({ response });
      },
    );
    await page.locator('#manualActivationForm button[type="submit"]').click();
    await activationPosted;
    assert.equal(await page.locator("#suspendAccess").isDisabled(), true);
    assert.equal(
      await page.locator(".manual-admin-panel").getAttribute("aria-busy"),
      "true",
    );
    await page
      .locator(`[data-action="admin-select"][data-id="${satinShop.id}"]`)
      .click();
    await page
      .locator(".admin-detail > h2")
      .filter({ hasText: satinShop.draft.name })
      .waitFor();
    releaseActivation();
    await page.locator(".admin-feedback").waitFor();
    assert.equal(
      await page.locator(".admin-detail > h2").textContent(),
      satinShop.draft.name,
    );
    await owner.unroute(`**/api/admin/shops/${shop.id}/activation`);
    await page
      .locator(`[data-action="admin-select"][data-id="${shop.id}"]`)
      .click();
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
    // Isolated sandbox activation uses the real audited admin endpoint in local QA.
    f.env.ENVIRONMENT = "test";
    f.env.PUBLIC_ORIGIN = origin;
    f.env.BILLING_TEST_MODE = "true";
    f.env.SANDBOX_TEST_ACCESS = "true";
    const beforeTest = await readShop();
    object.state.storage.sql.exec(
      "UPDATE shop SET data=? WHERE singleton=1",
      JSON.stringify({
        ...beforeTest,
        subscription: {
          ...beforeTest.subscription,
          status: "inactive",
          paidUntil: 0,
        },
      }),
    );
    await page.reload();
    await page.locator(".publication-checklist").waitFor();
    assert.equal(
      await page.locator("#grantSandboxAccess").count(),
      0,
      "No activation controls in florist workspace",
    );
    await page.goto(origin + "/admin");
    await page
      .locator(`[data-action="admin-select"][data-id="${shop.id}"]`)
      .click();
    let requireReauth = true,
      sandboxPosts = 0;
    await owner.route(
      `**/api/admin/shops/${shop.id}/activation`,
      async (route) => {
        if (route.request().method() !== "POST") return route.continue();
        sandboxPosts++;
        if (requireReauth) {
          requireReauth = false;
          return route.fulfill({
            status: 401,
            contentType: "application/json",
            body: JSON.stringify({
              error:
                "Sign in again before recording a payment or changing access.",
            }),
          });
        }
        return route.continue();
      },
    );
    await page.locator("#grantSandboxAccess").click();
    await page.locator("#verifyAdminSession").click();
    await page.locator("#retryActivation").waitFor();
    assert.equal(
      sandboxPosts,
      1,
      "Reauthentication alone never activates a shop",
    );
    await page.locator("#retryActivation").click();
    await page
      .getByText("Activation audit (2 most recent)", { exact: true })
      .waitFor();
    await page.goto(origin + "/dashboard/billing");
    await page.locator('[data-action="publish-shop"]:enabled').waitFor();
    await page.locator('[data-action="publish-shop"]').click();
    await page.getByText("Ready to share.", { exact: true }).waitFor();
    assert.equal((await readShop()).subscription.source, "sandbox_test");
    assert.equal(await page.locator("#grantSandboxAccess").count(), 0);
    await page.goto(origin + "/admin");
    await page
      .locator(`[data-action="admin-select"][data-id="${shop.id}"]`)
      .click();
    await page.locator("[data-admin-preview]").first().click();
    await page.locator(".operator-tabs").waitFor();
    assert.ok(new URL(page.url()).pathname.startsWith("/admin/shops/"));
    assert.equal(await page.locator(".sidebar").count(), 0);
    assert.equal(await page.locator('[data-action="save"]').count(), 0);
    await page.locator(".operator-tabs [data-admin-orders]").click();
    await page.locator(".requests-layout").waitFor();
    await page.reload();
    await page.locator(".requests-layout").waitFor();
    assert.equal(await page.locator("#requestUpdateForm").count(), 0);
    await page.screenshot({
      path: path.join(output, "operator-inspection-mobile.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.locator(".operator-login").waitFor();
    assert.equal(new URL(page.url()).pathname, "/admin/login");
    assert.equal(await page.locator(".request-list-item").count(), 0);
    assert.equal(await page.locator('[data-action="auth-mode"]').count(), 0);
    const floristOnly = await context({ width: 390, height: 844 }, "other");
    const floristPage = await floristOnly.newPage();
    let directoryRequests = 0;
    floristPage.on("request", (r) => {
      if (new URL(r.url()).pathname.startsWith("/api/admin/"))
        directoryRequests++;
    });
    await floristPage.goto(origin + "/admin");
    await floristPage
      .getByRole("heading", { name: "Administrator access required." })
      .waitFor();
    assert.equal(await floristPage.locator(".admin-table").count(), 0);
    await floristPage.goto(origin + `/admin/shops/${shop.id}/orders`);
    await floristPage
      .getByRole("heading", { name: "Administrator access required." })
      .waitFor();
    assert.equal(
      directoryRequests,
      0,
      "Florist page never fetches another customer's admin data",
    );
    await floristPage.goto(origin + "/dashboard/billing");
    await floristPage.locator(".plan-surface").waitFor();
    assert.equal(await floristPage.locator("#grantSandboxAccess").count(), 0);
    await floristOnly.close();
    const switchLogin = await context();
    const switchPage = await switchLogin.newPage();
    await switchPage.goto(origin + "/admin/login");
    await switchPage
      .getByRole("link", { name: "florist sign-in", exact: true })
      .click();
    await switchPage
      .getByRole("button", { name: "Continue with Google", exact: true })
      .click();
    await switchPage.locator(".sidebar").waitFor();
    assert.equal(new URL(switchPage.url()).pathname, "/dashboard");
    assert.equal(
      await switchPage.locator(".app-header .beta-label").textContent(),
      "FLORIST WORKSPACE",
    );
    await switchPage.locator(".shop-health").waitFor();
    await switchPage.screenshot({
      path: path.join(output, "simple-workspace-desktop.png"),
      fullPage: true,
    });
    assert.equal(await switchPage.locator(".sidebar-nav .ui-icon").count(), 5);
    await switchPage.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await switchPage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await switchPage.screenshot({
      path: path.join(output, "simple-workspace-mobile.png"),
      fullPage: true,
    });
    await switchPage.locator("#workspacePage").selectOption("/dashboard/shop");
    await switchPage
      .locator('.workspace-subnav a[href="/dashboard/payments"]')
      .click();
    await switchPage.locator(".request-channel-panel").waitFor();
    assert.ok(
      await switchPage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await switchPage.locator("#workspacePage").selectOption("/dashboard");
    await switchPage.locator(".shop-health").waitFor();
    await switchPage.setViewportSize({ width: 1365, height: 900 });
    await switchPage.goto(origin + "/dashboard/payments");
    await switchPage
      .locator("#commerceSettings")
      .waitFor({ state: "attached" });
    assert.equal(
      await switchPage.locator("#commerceSettings").isVisible(),
      false,
    );
    await switchPage
      .locator('.request-channel-panel [data-path="requestChannel"]')
      .selectOption("both");
    await saved(switchPage);
    assert.equal((await readShop()).draft.requestChannel, "both");
    await switchPage.screenshot({
      path: path.join(output, "simple-payments-desktop.png"),
      fullPage: true,
    });

    await switchPage.goto(origin + "/dashboard/shop");
    const previousMixed = await readShop();
    await switchPage.locator("[data-preset]").selectOption("mixed");
    await saved(switchPage);
    let mixed = await readShop();
    assert.equal(mixed.draft.preset, "mixed");
    const withoutType = (rows) =>
      rows.map((row) => {
        const copy = structuredClone(row);
        if (copy.design) delete copy.design.flowerType;
        return copy;
      });
    assert.deepEqual(
      withoutType(mixed.draft.collection),
      withoutType(previousMixed.draft.collection),
    );
    assert.equal(
      mixed.published.draft.preset,
      previousMixed.published.draft.preset,
    );
    // Seed explicit QA-only prices; no real merchant prices are changed by this test.
    mixed.draft.flowerPrices = Object.fromEntries(
      catalog.flowers.map((row) => [row.id, 100]),
    );
    mixed.draft.extrasCents = Object.fromEntries(
      catalog.extras.map((row) => [row.id, 50]),
    );
    mixed.draft.disabledFlowers = [];
    mixed.draft.disabledExtras = [];
    mixed.draft.requestChannel = "both";
    const freshRecipe = catalog.recipes.find((row) => row.preset === "fresh");
    const satinRecipe = catalog.recipes.find((row) => row.preset === "satin");
    mixed.draft.collection = [freshRecipe, satinRecipe].map((row) => ({
      id: row.preset + "-mixed",
      title: row.name,
      recipeId: row.id,
      design: null,
      cover: null,
      available: true,
      category: "",
    }));
    const mixedSaved = await f.call(`/api/shops/${mixed.id}/draft`, {
      method: "PUT",
      body: { version: mixed.version, draft: mixed.draft },
    });
    assert.equal(mixedSaved.status, 200, await mixedSaved.clone().text());
    mixed = (await mixedSaved.json()).shop;
    await switchPage.goto(origin + "/dashboard/prices");
    await switchPage.locator("#flowerTypeFilter").selectOption("fresh");
    assert.equal(
      await switchPage
        .locator('[data-flower-price="satin_rose_pink"]')
        .isVisible(),
      false,
    );
    await switchPage.locator("#flowerTypeFilter").selectOption("satin");
    assert.equal(
      await switchPage
        .getByRole("heading", { name: "Fresh · Rose", exact: true })
        .isVisible(),
      false,
      "Collection filters hide empty headings and tables",
    );
    assert.equal(
      await switchPage.locator('[data-flower-price="rose_red"]').isVisible(),
      false,
    );
    for (const width of [320, 360, 390, 430, 768]) {
      await switchPage.setViewportSize({ width, height: 740 });
      assert.ok(
        await switchPage.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `Catalogue fits ${width}px`,
      );
      assert.ok(
        await switchPage
          .locator("#flowerTypeFilter")
          .evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 16),
      );
      const hit = await switchPage
        .locator(".availability-hit:visible")
        .first()
        .boundingBox();
      assert.ok(hit.width >= 40 && hit.height >= 44);
      await switchPage.evaluate(() => scrollTo(0, 900));
      const nav = await switchPage.locator("#workspacePage").boundingBox();
      const save = await switchPage
        .locator('.save-bar [data-action="save"]')
        .boundingBox();
      assert.ok(
        nav.y >= 0 && nav.y + nav.height < 100,
        `Page menu stays reachable at ${width}px`,
      );
      assert.ok(
        save.y >= 0 && save.y + save.height <= 741,
        `Save stays reachable at ${width}px`,
      );
    }
    await switchPage.setViewportSize({ width: 390, height: 844 });
    await switchPage.evaluate(() => scrollTo(0, 0));
    await switchPage.screenshot({
      path: path.join(output, "phone-price-controls.png"),
      fullPage: false,
    });
    await switchPage.setViewportSize({ width: 1365, height: 900 });
    await switchPage.goto(
      origin + `/studio/studio.html?shop=${mixed.id}&blank=1`,
    );
    await switchPage
      .getByRole("heading", { name: "What would you like to create?" })
      .waitFor();
    await switchPage.getByRole("link", { name: "Satin flowers" }).click();
    await studioReady(switchPage);
    assert.equal(
      await switchPage.locator("#platformFlowerType").inputValue(),
      "satin",
    );
    await switchPage.locator("#platformFlowerType").selectOption("fresh");
    await switchPage.waitForURL(/flowers=fresh/);
    await studioReady(switchPage);
    assert.equal(
      await switchPage.locator("#platformFlowerType").inputValue(),
      "fresh",
    );
    await switchPage.locator("#platformFlowerType").selectOption("satin");
    await switchPage.waitForURL(/flowers=satin/);
    await studioReady(switchPage);
    assert.equal(
      await switchPage.locator('[data-mode="classic"]').isVisible(),
      false,
    );
    await switchPage.goto(
      origin + `/studio/studio.html?shop=${mixed.id}&card=fresh-mixed`,
    );
    await studioReady(switchPage);
    assert.equal(await switchPage.locator('[data-mode="classic"]').count(), 1);
    await switchPage.goto(
      origin + `/studio/studio.html?shop=${mixed.id}&card=satin-mixed`,
    );
    await studioReady(switchPage);
    assert.equal(
      (await switchPage.evaluate(() => NebulaPlatformStudio.design()))
        .flowerType,
      "satin",
    );
    assert.equal(
      (await switchPage.evaluate(() => NebulaPlatformStudio.price())).ok,
      true,
    );
    assert.equal(
      (
        await f.call(`/api/shops/${mixed.id}/publish`, {
          method: "POST",
          body: { version: mixed.version },
        })
      ).status,
      200,
    );
    const messageCtx = await context({ width: 390, height: 844 }),
      messagePage = await messageCtx.newPage();
    for (const channel of ["both", "whatsapp", "sms"]) {
      const currentMessageShop = (
        await (await f.call(`/api/shops/${mixed.id}`)).json()
      ).shop;
      currentMessageShop.draft.requestChannel = channel;
      const messageSave = await f.call(`/api/shops/${mixed.id}/draft`, {
        method: "PUT",
        body: {
          version: currentMessageShop.version,
          draft: currentMessageShop.draft,
        },
      });
      assert.equal(messageSave.status, 200);
      const messageVersion = (await messageSave.json()).shop.version;
      assert.equal(
        (
          await f.call(`/api/shops/${mixed.id}/publish`, {
            method: "POST",
            body: { version: messageVersion },
          })
        ).status,
        200,
      );
      await messagePage.goto(origin + `/s/${mixed.slug}`);
      await messagePage
        .locator("#custom .flower-card")
        .last()
        .getByRole("button", { name: "Order", exact: false })
        .click();
      await messagePage.locator('[name="name"]').fill("Message QA");
      await messagePage.locator('[name="phone"]').fill("+14165550199");
      assert.match(
        await messagePage.locator("[data-message-steps]").innerText(),
        /tap Send/,
      );
      await messagePage
        .getByRole("button", { name: "Send unpaid request" })
        .click();
      await messagePage
        .getByRole("heading", { name: "Send your request to the florist." })
        .waitFor();
      assert.equal(
        await messagePage
          .getByRole("link", { name: "Open WhatsApp draft" })
          .count(),
        channel === "sms" ? 0 : 1,
      );
      assert.equal(
        await messagePage.getByRole("link", { name: "Open SMS draft" }).count(),
        channel === "whatsapp" ? 0 : 1,
      );
      if (channel !== "whatsapp") {
        const smsHref = await messagePage
          .getByRole("link", { name: "Open SMS draft" })
          .getAttribute("href");
        assert.match(smsHref, /^sms:\+\d+\?body=/);
        assert.ok(decodeURIComponent(smsHref).includes("florist sign-in"));
      }
      await messagePage.screenshot({
        path: path.join(output, "message-order-mobile.png"),
        fullPage: true,
      });
    }
    await messageCtx.close();
    await switchLogin.close();
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
