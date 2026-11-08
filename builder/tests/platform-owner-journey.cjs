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
    "../../.private/qa/platform/owner-journey",
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
    await page.locator("#shopName").fill("Nebula Flowers");
    await page.locator('[data-wizard="preset"]').selectOption("satin");
    await page
      .getByRole("button", { name: "See my shop", exact: false })
      .click();
    await page
      .getByRole("dialog", { name: "This is your shop, Nebula Flowers." })
      .waitFor();
    assert.ok(new URL(page.url()).pathname.startsWith("/s/"));
    await page
      .locator(".store-brand")
      .filter({ hasText: "Nebula Flowers" })
      .waitFor();
    let shop = (await (await f.call("/api/session", { token: "other" })).json())
      .shop;
    assert.equal(Object.keys(shop.draft.flowerPrices).length, 0);
    assert.equal(shop.subscription.status, "inactive");
    await page.screenshot({
      path: path.join(output, "01-my-shop-first.png"),
      fullPage: true,
    });
    await page
      .getByRole("dialog")
      .getByRole("link", { name: "Build my first bouquet", exact: false })
      .click();
    await page.waitForFunction(() => window.NebulaApp?.ready, undefined, {
      timeout: 50000,
    });
    assert.equal(
      await page.locator('[data-mode="classic"]').isVisible(),
      false,
    );
    assert.ok(
      (await page.locator("[data-flower]:visible:enabled").count()) > 0,
      "Owner can explore before pricing",
    );
    await page.locator('[data-flower="rose_red"]').click();
    await page.locator("#bouquet").press("Enter");
    await page.waitForFunction(() => NebulaApp.state.items.length > 0);
    const exactDesign = await page.evaluate(() =>
      NebulaPlatformStudio.design(),
    );
    await page.locator("#platformSaveCollection").click();
    await page.locator("#ojBouquetForm").waitFor();
    let stored = (
      await (await f.call("/api/session", { token: "other" })).json()
    ).shop;
    assert.equal(
      stored.draft.collection.length,
      1,
      "Design saved before photo or any activation",
    );
    assert.deepEqual(stored.draft.collection[0].design, exactDesign);
    await page
      .getByRole("button", { name: "Finish later", exact: true })
      .click();
    await page.locator("#platformSaveCollection").click();
    await page.locator("#ojBouquetForm").waitFor();
    await page.locator('#ojBouquetForm [name="title"]').fill("Ruby Satin");
    for (const input of await page.locator("[data-price-index]").all())
      await input.fill("8.00");
    await page
      .locator('#ojBouquetForm input[type="file"]')
      .setInputFiles(path.join(root, "assets/studio-pink.webp"));
    await page
      .getByText("Your photo is ready to save.", { exact: true })
      .waitFor();
    await page.screenshot({
      path: path.join(output, "02-photo-and-used-prices.png"),
      fullPage: true,
    });
    await page
      .getByRole("button", {
        name: "See this bouquet in my shop",
        exact: false,
      })
      .click();
    await page
      .locator("#custom .flower-card h3")
      .filter({ hasText: "Ruby Satin" })
      .waitFor();
    stored = (await (await f.call("/api/session", { token: "other" })).json())
      .shop;
    assert.equal(
      stored.draft.collection.length,
      1,
      "Retrying completion does not duplicate the bouquet",
    );
    assert.deepEqual(stored.draft.collection[0].design, exactDesign);
    assert.match(stored.draft.collection[0].cover, /^img_[a-f0-9]{64}$/);
    assert.equal(stored.draft.flowerPrices.satin_rose_red, 800);
    assert.equal(
      stored.subscription.status,
      "inactive",
      "Completing the preview never activates a subscription",
    );
    assert.equal(stored.published, null);
    await page.waitForFunction(
      () =>
        document.querySelector("#custom .flower-photo img")?.naturalWidth > 0,
    );
    await page.waitForFunction(() => {
      const card = document.querySelector(".bouquet-just-created");
      const rect = card?.getBoundingClientRect();
      return (
        card?.textContent.includes("Bouquet saved to your preview") &&
        rect.top >= 0 &&
        rect.top < window.innerHeight / 2
      );
    });
    assert.equal(
      await page
        .locator(".bouquet-just-created")
        .getAttribute("data-bouquet-card"),
      stored.draft.collection[0].id,
    );
    await page.goto(origin + "/dashboard");
    const myShop = page.getByRole("link", { name: "My shop", exact: true });
    assert.equal(await myShop.getAttribute("href"), "/s/" + stored.slug);
    await myShop.click();
    await page
      .locator(".store-brand")
      .filter({ hasText: "Nebula Flowers" })
      .waitFor();
    assert.equal(new URL(page.url()).pathname, "/s/" + stored.slug);

    await page
      .getByRole("button", { name: "Set up customer requests", exact: false })
      .click();
    await page
      .locator('#ownerJourneyDialog [name="phone"]')
      .fill("+14165550123");
    await page
      .locator('#ownerJourneyDialog [name="channel"]')
      .selectOption("both");
    await page
      .getByRole("button", { name: "Save my contact details", exact: false })
      .click();
    await page
      .getByRole("button", {
        name: "Activate my shop",
        exact: false,
      })
      .waitFor();
    await page.screenshot({
      path: path.join(output, "03-bouquet-in-my-shop.png"),
      fullPage: true,
    });
    const anon = await context(),
      visitor = await anon.newPage();
    await visitor.goto(origin + "/s/" + stored.slug + "?welcome=1");
    await visitor
      .getByText("This shop isn’t open to the public yet.", { exact: false })
      .waitFor();
    assert.equal(
      await visitor.locator("#ownerJourney").count(),
      0,
      "Public visitors cannot enter the owner setup flow",
    );
    assert.equal(await visitor.locator("#custom .flower-card").count(), 0);
    await anon.close();
    await page
      .getByRole("button", { name: "Activate my shop", exact: false })
      .click();
    assert.equal(new URL(page.url()).pathname, "/dashboard/billing");
    await page.getByRole("checkbox", { name: /use my own domain/ }).check();
    await page.getByText(/\$35 USD total for 30 days/).waitFor();
    await page
      .getByRole("button", { name: "Request shop activation", exact: false })
      .click();
    await page
      .getByRole("heading", { name: "Activation requested", exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole("link", {
          name: "Message Nebula on Instagram",
          exact: false,
        })
        .getAttribute("href"),
      "https://www.instagram.com/nebulaa_studio/",
    );
    const requested = (
      await (await f.call("/api/session", { token: "other" })).json()
    ).shop;
    assert.equal(requested.activationRequest.status, "pending");
    assert.equal(requested.activationRequest.customDomainInterest, true);
    assert.equal(requested.published, null);
    assert.equal(requested.subscription.status, "inactive");
    await page.reload();
    await page
      .getByRole("heading", { name: "Activation requested", exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Request shop activation", exact: false })
        .count(),
      0,
    );
    const message = await page.locator("#activationMessage").inputValue();
    assert.ok(
      message.includes(requested.slug) &&
        message.includes("$35 USD") &&
        message.includes("confirm availability"),
    );
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: async (text) => {
            window.copiedActivationMessage = text;
          },
        },
      });
    });
    await page
      .getByRole("button", { name: "Copy message", exact: true })
      .click();
    assert.equal(
      await page.evaluate(() => window.copiedActivationMessage),
      message,
    );
    await page.screenshot({
      path: path.join(output, "activation-requested-mobile.png"),
      fullPage: true,
    });
    const activated = await f.call(
      `/api/admin/shops/${requested.id}/activation`,
      {
        token: "owner",
        method: "POST",
        body: {
          action: "grant",
          revision: requested.subscription.revision || 0,
          operationId: crypto.randomUUID(),
          reason: "Local browser journey test",
        },
      },
    );
    assert.equal(activated.status, 200, await activated.clone().text());
    await page
      .getByRole("button", { name: "Check activation status", exact: false })
      .click();
    await page
      .getByRole("button", { name: /(?:Publish|Open) my shop/, exact: false })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", {
          name: "Activate my shop",
          exact: false,
        })
        .count(),
      0,
      "Activated owners are not asked to activate/pay again",
    );
    await page
      .getByRole("button", { name: /(?:Publish|Open) my shop/, exact: false })
      .click();
    await page
      .getByText("Your shop is live. Share your public link with customers.", {
        exact: true,
      })
      .waitFor();
    await page
      .locator(".shop-address")
      .getByRole("link", { name: "Open customer shop", exact: false })
      .click();
    await page
      .locator("#custom .flower-card")
      .getByRole("button", { name: "Order", exact: false })
      .click();
    await page.locator(".nb-order-review img").waitFor();
    assert.equal(
      await page.locator('.nb-order-form button[type="submit"]').isEnabled(),
      true,
    );
    assert.ok(
      !new URL(page.url()).pathname.startsWith("/studio/"),
      "Order opens review, not builder",
    );
    await page
      .getByRole("button", { name: "Close request", exact: true })
      .click();
    await page
      .locator("#custom .flower-card")
      .getByRole("link", { name: "Customise", exact: false })
      .click();
    await page.waitForFunction(() => window.NebulaApp?.ready, undefined, {
      timeout: 50000,
    });
    assert.deepEqual(
      await page.evaluate(() => NebulaPlatformStudio.design()),
      exactDesign,
      "Customer customises the same saved design",
    );
    assert.equal(
      await page.locator("#platformSaveCollection").count(),
      0,
      "Customer cannot change shop pricing",
    );
    // Continue after first publication: all six slots use the same real-builder path.
    const readOwner = async () =>
      (await (await f.call("/api/session", { token: "other" })).json()).shop;
    for (const number of [3, 2, 4, 5, 6]) {
      await page.goto(origin + "/dashboard/collection");
      await page.locator(".bouquet-slot-grid").waitFor();
      assert.equal(await page.locator("[data-bouquet-slot]").count(), 6);
      const empty = page.locator(`[data-bouquet-slot="${number}"]`);
      await empty
        .getByRole("link", { name: `Build bouquet ${number}`, exact: false })
        .click();
      await page.waitForFunction(() => window.NebulaApp?.ready, undefined, {
        timeout: 50000,
      });
      await page.locator('[data-flower="rose_red"]').click();
      await page.locator("#bouquet").press("Enter");
      await page.waitForFunction(() => NebulaApp.state.items.length > 0);
      const recipe = await page.evaluate(() => NebulaPlatformStudio.design());
      await page.locator("#platformSaveCollection").click();
      await page.locator("#ojBouquetForm").waitFor();
      await page
        .locator('#ojBouquetForm [name="title"]')
        .fill(`Signature ${number}`);
      for (const input of await page.locator("[data-price-index]").all())
        assert.equal(await input.inputValue(), "8.00", "Reuse florist prices");
      await page
        .locator('#ojBouquetForm input[type="file"]')
        .setInputFiles(path.join(root, "assets/studio-pink.webp"));
      await page
        .getByText("Your photo is ready to save.", { exact: true })
        .waitFor();
      await page
        .getByRole("button", {
          name: "See this bouquet in my shop",
          exact: false,
        })
        .click();
      await page
        .locator("#custom .flower-card h3")
        .filter({ hasText: `Signature ${number}` })
        .waitFor();
      const ownerState = await readOwner();
      assert.deepEqual(
        ownerState.draft.collection.find(
          (c) => c.id === `bouquet-slot-${number}`,
        ).design,
        recipe,
      );
      assert.equal(
        ownerState.published.draft.collection.length,
        1,
        "New designs stay private until explicit publication",
      );
    }
    await page.goto(origin + "/dashboard/collection");
    await page.locator(".bouquet-slot-grid").waitFor();
    assert.equal(await page.locator(".bouquet-empty-slot").count(), 0);
    assert.equal(await page.locator(".collection-editor").count(), 6);
    await page.screenshot({
      path: path.join(output, "04-six-builder-bouquets-mobile.png"),
      fullPage: true,
    });
    const beforeTry = await readOwner();
    await page
      .locator('[data-bouquet-slot="2"]')
      .getByRole("link", { name: "Try customer customisation", exact: false })
      .click();
    await page.waitForFunction(() => window.NebulaApp?.ready, undefined, {
      timeout: 50000,
    });
    assert.equal(
      await page.locator("#platformSaveCollection").isVisible(),
      false,
    );
    assert.deepEqual(
      (await readOwner()).draft,
      beforeTry.draft,
      "Trying customer editing never updates a shop recipe",
    );
    await page.goto(origin + "/dashboard/collection");
    await page
      .locator('[data-bouquet-slot="2"]')
      .getByRole("button", { name: "Name, photo & prices", exact: true })
      .click();
    await page.locator("#ojBouquetForm").waitFor();
    assert.equal(
      await page.locator('#ojBouquetForm [name="title"]').inputValue(),
      "Signature 2",
    );
    await page.locator('#ojBouquetForm [name="title"]').fill("Signature Two");
    await page
      .getByRole("button", {
        name: "See this bouquet in my shop",
        exact: false,
      })
      .click();
    await page
      .locator("#custom .flower-card h3")
      .filter({ hasText: "Signature Two" })
      .waitFor();
    assert.equal(
      (await readOwner()).draft.collection.length,
      6,
      "Editing an existing bouquet never duplicates it",
    );
    assert.deepEqual(
      (await readOwner()).draft.collection.find(
        (c) => c.id === beforeTry.draft.collection[0].id,
      ).design,
      exactDesign,
    );
    const international = await context({ width: 390, height: 844 }, "owner"),
      intlPage = await international.newPage();
    await intlPage.goto(origin + "/dashboard");
    await intlPage.locator("#shopName").fill("زهور");
    await intlPage
      .getByRole("button", { name: "See my shop", exact: false })
      .click();
    await intlPage.getByRole("dialog").waitFor();
    await intlPage
      .locator(".store-brand")
      .filter({ hasText: "زهور" })
      .waitFor();
    const intlShop = (
      await (await f.call("/api/session", { token: "owner" })).json()
    ).shop;
    assert.match(
      intlShop.slug,
      /^shop-[a-f0-9]{8}$/,
      "A non-Latin shop name gets a valid suggested link",
    );
    await international.close();
    assert.deepEqual(errors, []);
    assert.deepEqual(badRequests, []);
    await ctx.close();
    console.log(
      "PASS name-to-private-store preview, dismissible invitation, real satin builder before pricing, saved recipe, resumable photo/prices, contact, saved activation request, Instagram handoff and copy, status refresh, activated-owner direct publication, Order/Customise and customer isolation. Local fixtures only; no real account/email/payment.",
    );
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
