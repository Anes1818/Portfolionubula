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
  const output = path.resolve(__dirname, "../../.private/qa/platform/launch");
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
    const ctx = await context({ width: 390, height: 740 });
    const page = await ctx.newPage();
    page.setDefaultTimeout(20000);
    const network = [];
    page.on("request", (r) =>
      network.push({ url: r.url(), method: r.method() }),
    );
    await page.goto(origin + "/");
    await page
      .getByRole("link", { name: "Try the bouquet builder", exact: false })
      .waitFor();
    assert.equal(
      network.some(
        (r) => r.url.includes("/api/") || r.url.includes("gstatic.com"),
      ),
      false,
      "Landing must work without auth or API",
    );
    await page.screenshot({
      path: path.join(output, "01-public-entry-mobile.png"),
      fullPage: true,
    });
    await page
      .getByRole("link", { name: "Try the bouquet builder", exact: false })
      .click();
    await page.getByRole("link", { name: /Try fresh flowers/ }).click();
    await page.waitForFunction(() => window.NebulaApp?.ready, undefined, {
      timeout: 50000,
    });
    await page.locator("#demoReview").waitFor();
    assert.equal(await page.locator('#aboutBlock, .move-toolbar').count(),0);
    const mobileLayout = await page.locator('#controls').evaluate(controls => ({
      gap: controls.getBoundingClientRect().top - document.querySelector('#artSurface').getBoundingClientRect().bottom,
      panelHeight: controls.querySelector('.panel-body').clientHeight,
    }));
    assert.ok(mobileLayout.gap >= 0 && mobileLayout.gap <= 12, JSON.stringify(mobileLayout));
    assert.ok(mobileLayout.panelHeight >= 140, JSON.stringify(mobileLayout));
    for (const tab of ['wrapping', 'finishing', 'flowers']) {
      await page.locator('#tab-' + tab).click();
      assert.equal(await page.locator('#panel-' + tab).isVisible(), true);
    }
    assert.deepEqual(await page.locator('#breathLevels button').allTextContents(), ['Off','Mini','Mid','Full']);
    assert.equal(await page.locator('#autumnFinishes').evaluate(n=>getComputedStyle(n).display),'none','duplicate finishing section stays hidden');
    assert.equal(await page.locator('#detailChoices').evaluate(n=>n.parentElement.id),'simpleToys','toy controls remain in their current section');
    assert.equal(await page.locator('#panel-flowers #platformFlowerType').count(),1);
    assert.equal(await page.locator('.demo-studio-bar .material-switch').count(),0);
    await page.evaluate(async () => {
      const s=NebulaApp.state;s.finishes.studio={...s.finishes.studio,v:1,buds:3};NebulaApp.setState(s);
      await NebulaRenderer.awaitAssets(s);
    });
    await page.locator('#bouquet').scrollIntoViewIfNeeded();
    const budPoint=await page.evaluate(()=>{
      NebulaApp.stopBrush();const sc=NebulaApp.scene(),v=NebulaRenderer.view(NebulaApp.state,NebulaApp.camera),rect=document.getElementById('bouquet').getBoundingClientRect();
      for(const n of sc.layeredFlowers.filter(n=>n.infillKind==='bud'))for(let y=-.4;y<.4;y+=.08)for(let x=-.4;x<.4;x+=.08){
        const q={x:n.x+x*n.w,y:n.y+y*n.h};
        if(NebulaFillerOptions.hit(sc,q)?.uid===n.uid&&!NebulaRenderer.detailHit(sc,q))return{x:rect.left+(q.x*v.scale+v.x)/720*rect.width,y:rect.top+(q.y*v.scale+v.y)/820*rect.height,id:n.uid};
      }
    });
    assert.ok(budPoint,'visible bud pointer target');
    await page.mouse.move(budPoint.x,budPoint.y);await page.mouse.down();await page.mouse.move(budPoint.x+18,budPoint.y+10,{steps:6});await page.mouse.up();
    assert.ok(await page.evaluate(id=>!!NebulaApp.state.finishes.studio.placements?.[id],budPoint.id),'pointer drag saves bud');
    const budCheck=await page.evaluate(()=>{
      const s=NebulaApp.state, before=JSON.stringify(s), sc=NebulaRenderer.scene(s);
      const buds=sc.layeredFlowers.filter(n=>n.uid.startsWith('bud-option-'));
      const n=buds[0];NebulaFillerOptions.move(s,n.uid,before,n.x>360?-25:25,n.y>390?-15:15);
      const moved=NebulaRenderer.scene(s).layeredFlowers.find(a=>a.uid===n.uid);
      const decoded=NebulaLink.decode(NebulaLink.encode(s));
      NebulaApp.setState(s);
      return {count:buds.length,moved:Math.abs(moved.x-n.x)>1,valid:!!decoded,
        stored:!!decoded?.design.finishes.studio.placements[n.uid]};
    });
    assert.deepEqual(budCheck,{count:3,moved:true,valid:true,stored:true});
    await page.locator('#breathLevels button').nth(1).click();
    await page.locator('#breathLevels button').nth(3).click();
    await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});
    await page.screenshot({path:path.join(output,'04-dark-builder.png'),fullPage:true});
    const palette=await page.locator('body').evaluate(el=>({bg:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color}));
    assert.equal(palette.bg,'rgb(43, 36, 42)');assert.equal(palette.color,'rgb(247, 237, 242)');
    await page.emulateMedia({colorScheme:'light'});
    const original = await page.evaluate(() => NebulaPlatformStudio.design());
    assert.ok(original.items.length > 0);
    await page.evaluate(() => {
      const design = NebulaApp.state;
      design.title = "My demo bouquet";
      NebulaApp.setState(design);
    });
    await page.locator("#demoReview").click();
    await page
      .getByRole("dialog", { name: "The idea, ready to share." })
      .waitFor();
    assert.ok(
      (await page.getByRole("dialog").innerText()).includes("Sample estimate:"),
    );
    assert.equal(
      await page.getByRole("dialog").locator("input,form").count(),
      0,
    );
    await page.screenshot({
      path: path.join(output, "02-demo-request-mobile.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Close demo request" }).click();
    await page.locator("#demoStartShop").click();
    await page
      .getByRole("button", { name: "Create my account", exact: false })
      .waitFor();
    await page
      .getByText("Your trial bouquet is kept in this tab.", { exact: false })
      .waitFor();
    const pending = await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem("nebula:trial-bouquet:v1")),
    );
    assert.equal(pending.design.title, "My demo bouquet");
    assert.equal(
      network.some((r) => r.method !== "GET"),
      false,
      "Guest exploration must not write to any endpoint",
    );
    await page.getByRole("button", { name: "Continue with Google" }).click();
    await page.locator("#shopName").fill("Launch Flowers");
    await page
      .getByRole("button", { name: "See my shop", exact: false })
      .click();
    await page
      .getByRole("dialog", { name: "This is your shop, Launch Flowers." })
      .waitFor();
    await page
      .getByRole("dialog")
      .getByRole("link", { name: "Build my first bouquet", exact: false })
      .click();
    await page.waitForFunction(() => window.NebulaApp?.ready, undefined, {
      timeout: 50000,
    });
    assert.equal(
      await page.evaluate(() => NebulaPlatformStudio.design().title),
      "My demo bouquet",
    );
    assert.deepEqual(
      await page.evaluate(() => NebulaPlatformStudio.design().items),
      pending.design.items,
    );
    let savedShop = (
      await (await f.call("/api/session", { token: "owner" })).json()
    ).shop;
    assert.deepEqual(
      savedShop.draft.flowerPrices,
      {},
      "Sample prices must never migrate into real shop",
    );
    await page.locator("#platformSaveCollection").click();
    await page.locator("#ojBouquetForm").waitFor();
    savedShop = (
      await (await f.call("/api/session", { token: "owner" })).json()
    ).shop;
    assert.equal(savedShop.draft.collection.length, 1);
    assert.equal(savedShop.draft.collection[0].design.title, "My demo bouquet");
    assert.ok(
      Object.values(savedShop.draft.flowerPrices).every(
        (value) => value === null,
      ),
      "Saving a trial recipe must leave merchant prices unset",
    );
    assert.equal(
      await page.evaluate(() =>
        sessionStorage.getItem("nebula:trial-bouquet:v1"),
      ),
      null,
    );
    await page
      .getByRole("button", { name: "Finish later", exact: true })
      .click();
    await page.goto(
      origin + "/studio/studio.html?demo=1&shop=" + savedShop.id + "&blank=1",
    );
    assert.equal(
      await page.locator("#demoStartShop").count(),
      0,
      "Tenant identifiers must not enter public demo mode",
    );
    await ctx.close();
    const guest = await context({ width: 320, height: 740 });
    const satin = await guest.newPage();
    const guestNetwork = [];
    satin.on("request", (r) => guestNetwork.push(r.url()));
    await satin.goto(
      origin +
        "/studio/studio.html?demo=1&flowers=satin&recipe=satin-pink-heart",
    );
    await satin.waitForFunction(() => window.NebulaApp?.ready, undefined, {
      timeout: 50000,
    });
    await satin.locator("#demoReview").waitFor();
    assert.equal(await satin.locator('#aboutBlock, .move-toolbar').count(),0);
    assert.equal(
      await satin.locator('[data-mode="classic"]').isVisible(),
      false,
    );
    assert.equal(await satin.locator("#platformSaveCollection").count(), 0);
    assert.equal(await satin.locator("#platformRequestOrder").count(), 0);
    assert.equal(
      guestNetwork.some(
        (url) => url.includes("/api/") || url.includes("gstatic.com"),
      ),
      false,
    );
    await satin.screenshot({
      path: path.join(output, "03-satin-demo-mobile.png"),
      fullPage: true,
    });
    satin.once('dialog',d=>d.dismiss());
    await satin.locator('#platformFlowerType').selectOption('fresh');
    assert.ok(satin.url().includes('flowers=satin'),'cancel retains satin design');
    satin.once('dialog',d=>d.accept());
    assert.equal(await satin.locator('#platformFlowerType').inputValue(),'satin');
    await satin.locator('#platformFlowerType').selectOption('fresh');
    await satin.waitForURL('**flowers=fresh');
    await satin.waitForFunction(()=>window.NebulaApp?.ready);
    assert.equal(await satin.locator('[data-mode="classic"]').isVisible(),true);
    assert.equal(await satin.locator('#platformFlowerType').inputValue(),'fresh');
    await satin.locator("#demoStartShop").click();
    await satin
      .getByRole("button", { name: "Create my account", exact: false })
      .waitFor();
    await satin.getByRole("button", { name: "Continue with Google" }).click();
    // Existing accounts keep their existing shop and never overwrite it automatically.
    assert.equal(
      (await (await f.call("/api/session", { token: "owner" })).json()).shop
        .draft.collection.length,
      1,
    );
    await guest.close();
    assert.deepEqual(errors, []);
    assert.deepEqual(badRequests, []);
    console.log(
      "PASS public landing without auth/API, fresh/satin guest builders, sample-only request preview, no guest writes, signup continuation of exact design, no sample-price migration, saved-owner recipe and tenant isolation. Mocked local accounts only.",
    );
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
