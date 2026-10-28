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
  const f = fixture({ env: { ASSETS: assets, ENVIRONMENT: "local" } });
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
  page.on("console", (msg) => {
    if (msg.type() === "error") console.error("Browser:", msg.text());
  });
  page.setDefaultTimeout(15000);
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
    let shop = (await (await f.call("/api/session")).json()).shop;
    assert.equal(shop.draft.collection.length, 4);
    assert.equal(shop.draft.currency, "CAD");
    assert.deepEqual(shop.draft.flowerPrices, {});
    await page
      .locator('a[data-nav][href="/dashboard/collection"]')
      .first()
      .click();
    await page
      .getByRole("button", { name: "Use sample prices for preview" })
      .click();
    await page
      .getByText("Sample prices saved for design previews.", { exact: false })
      .waitFor();
    shop = (await (await f.call("/api/session")).json()).shop;
    assert.equal(
      Object.keys(shop.draft.flowerPrices).length,
      catalog.flowers.length,
    );
    await page.goto(origin + "/dashboard/shop");
    await page
      .locator('input[data-path="tagline"]')
      .fill("Made with care, saved in your own studio.");
    await page.locator('input[data-path="city"]').fill("Toronto");
    await page.locator('[data-action="save"]').click();
    await page
      .locator("#pageMessage")
      .filter({ hasText: "Your private draft is saved." })
      .waitFor();
    await page
      .locator("#logoFile")
      .setInputFiles(path.join(root, "assets/studio-pink.webp"));
    await page.waitForFunction(
      () =>
        document.querySelector(".logo-preview img")?.complete &&
        document.querySelector(".logo-preview img")?.naturalWidth > 0,
    );
    await page.waitForFunction(
      () =>
        document.querySelector("#saveState")?.textContent ===
        "All changes saved",
    );
    await page.goto(origin + "/dashboard/prices");
    await page.locator('[data-flower-price="rose_pink"]').fill("9.75");
    await page.locator('[data-action="save"]').click();
    await page
      .locator("#pageMessage")
      .filter({ hasText: "Your private draft is saved." })
      .waitFor();
    shop = (await (await f.call("/api/session")).json()).shop;
    assert.equal(shop.draft.flowerPrices.rose_pink, 975);
    await page.goto(origin + "/s/" + shop.slug);
    await page.locator(".store-card").first().waitFor();
    assert.equal(await page.locator(".store-card").count(), 4);
    const links = await page
      .locator(".store-card")
      .first()
      .locator("a")
      .evaluateAll((els) => els.map((el) => el.href));
    assert.equal(
      new URL(links[0]).searchParams.get("card"),
      new URL(links[1]).searchParams.get("card"),
    );
    assert.equal(new URL(links[0]).searchParams.get("shop"), shop.id);
    await page.screenshot({
      path: path.join(output, "storefront-desktop.png"),
      fullPage: true,
    });
    await page
      .locator(".store-card")
      .first()
      .getByRole("link", { name: "Customise" })
      .click();
    try {
      await page.waitForFunction(() => window.NebulaApp?.ready, undefined, {
        timeout: 60000,
      });
    } catch (error) {
      console.error(
        "Studio diagnostic",
        await page.evaluate(() => ({
          boot: document.querySelector("#platformBoot")?.textContent,
          errors: window.__errors,
          ready: window.NebulaApp?.ready,
          stage: document.body.innerText.slice(0, 1300),
        })),
      );
      throw error;
    }
    assert.equal(await page.locator("#orderButton").isVisible(), false);
    assert.ok(
      (await page.locator("#brandLogo").getAttribute("src")).startsWith(
        "blob:",
      ),
    );
    await page.evaluate(() => NebulaApp.setTab("finishing"));
    await page.locator("#designName").fill("Saved for my collection");
    await page.locator("#designName").blur();
    await page.locator("#platformSaveCollection").click();
    await page
      .getByText("Saved to your collection.", { exact: false })
      .waitFor();
    const saved = await page.evaluate(() => NebulaApp.state);
    shop = (await (await f.call("/api/session")).json()).shop;
    assert.deepEqual(shop.draft.collection[0].design, saved);
    assert.equal(
      shop.draft.collection[0].design.title,
      "Saved for my collection",
    );
    await page.screenshot({
      path: path.join(output, "studio-desktop.png"),
      fullPage: true,
    });
    await page.reload();
    await page.waitForFunction(() => window.NebulaApp?.ready, undefined, {
      timeout: 60000,
    });
    assert.deepEqual(await page.evaluate(() => NebulaApp.state), saved);
    // Verify each original arrangement mode can still be edited and persisted.
    for (const mode of ["classic", "heart", "dome"]) {
      await page.locator('[data-mode="' + mode + '"]').click();
      await page.waitForFunction((m) => NebulaApp.state.mode === m, mode);
      await page.evaluate(() => NebulaRenderer.awaitAssets(NebulaApp.state));
      await page.locator("#platformSaveCollection").click();
      await page
        .getByText("Saved to your collection.", { exact: false })
        .waitFor();
      shop = (await (await f.call("/api/session")).json()).shop;
      assert.equal(shop.draft.collection[0].design.mode, mode);
      assert.deepEqual(
        shop.draft.collection.slice(1).map((row) => row.design),
        [null, null, null],
      );
    }
    // Realistic multi-tab conflict: another owner tab saves after editor opens.
    await f.call("/api/shops/" + shop.id + "/draft", {
      method: "PUT",
      body: {
        version: shop.version,
        draft: { ...shop.draft, city: "Latest city" },
      },
    });
    await page.locator("#platformSaveCollection").click();
    await page
      .getByText("Your shop changed in another tab.", { exact: false })
      .waitFor();
    assert.equal(
      (await (await f.call("/api/session")).json()).shop.draft.city,
      "Latest city",
    );
    const mobile = await context({ width: 390, height: 844 }, "owner");
    const phone = await mobile.newPage();
    await phone.goto(origin + "/dashboard");
    await phone.locator(".sidebar").waitFor();
    assert.ok(
      await phone.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await phone.screenshot({
      path: path.join(output, "dashboard-mobile.png"),
      fullPage: true,
    });
    await phone.goto(origin + "/s/" + shop.slug);
    await phone.locator(".store-card").first().waitFor();
    assert.ok(
      await phone.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await phone.screenshot({
      path: path.join(output, "storefront-mobile.png"),
      fullPage: true,
    });
    await phone
      .locator(".store-card")
      .first()
      .getByRole("link", { name: "Customise" })
      .click();
    await phone.waitForFunction(() => window.NebulaApp?.ready, undefined, {
      timeout: 60000,
    });
    assert.ok(
      await phone.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    assert.equal(
      await phone.locator("#platformSaveCollection").isVisible(),
      true,
    );
    await phone.screenshot({
      path: path.join(output, "studio-mobile.png"),
      fullPage: true,
    });
    await mobile.close();
    const anon = await context({ width: 390, height: 844 });
    const visitor = await anon.newPage();
    await visitor.goto(origin + "/s/" + shop.slug);
    await visitor
      .getByText("This shop is a private draft.", { exact: false })
      .waitFor();
    assert.equal(await visitor.locator(".store-card").count(), 0);
    assert.equal(
      (await visitor.request.get(origin + "/api/shops/" + shop.id)).status(),
      404,
    );
    await visitor.screenshot({
      path: path.join(output, "locked-mobile.png"),
      fullPage: true,
    });
    await anon.close();
    assert.deepEqual(errors, [], "No unhandled browser errors");
    assert.deepEqual(badRequests, [], "No unintended outbound requests");
    console.log(
      "PASS local browser sign-in, shop creation, sample pricing, private logo, direct routes, four matching recipe links, unchanged-engine design/save/reload, conflicts, mobile layout and anonymous lock. Firebase was a local fixture; no real email or payment was sent.",
    );
    console.log("Screenshots: " + output);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
