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
  const output = path.resolve(__dirname, "../../.private/qa/platform/auth-ui");
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
        function setUser(id){auth.currentUser=id?{uid:'uid-'+id,email:id+'@example.test',emailVerified:id!=='other'||sessionStorage.getItem('qaVerified')==='1',reload:async()=>{auth.currentUser.emailVerified=sessionStorage.getItem('qaVerified')==='1';},getIdToken:async()=>id}:null;}
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
        export async function sendEmailVerification(user,options){window.qaMail={count:(window.qaMail?.count||0)+1,url:options.url};}
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
    const ctx = await context({ width: 390, height: 844 }, "other");
    const page = await ctx.newPage();
    await page.goto(origin + "/dashboard");
    await page.getByRole("heading", { name: "Check your inbox." }).waitFor();
    await page.locator(".nebula-logo-mark img").evaluate((img) => img.decode());
    assert.equal(await page.locator(".verification-icon svg").count(), 1);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.getByRole("button", { name: "Send verification email" }).click();
    await page
      .locator("#authMessage")
      .getByText(
        "Verification email sent. Check your inbox, then return here.",
        { exact: true },
      )
      .waitFor();
    assert.deepEqual(await page.evaluate(() => window.qaMail), {
      count: 1,
      url: origin + "/dashboard",
    });
    await page.getByRole("button", { name: "Send verification email" }).click();
    await page
      .locator("#authMessage")
      .getByText(
        "Please wait a minute before requesting another verification email.",
        { exact: true },
      )
      .waitFor();
    assert.equal(await page.evaluate(() => window.qaMail.count), 1);
    await page.screenshot({
      path: path.join(output, "verify-mobile.png"),
      fullPage: true,
    });
    await page.evaluate(() => sessionStorage.setItem("qaVerified", "1"));
    await page
      .getByRole("button", { name: "I’ve verified my email", exact: false })
      .click();
    await page.locator("#shopName").waitFor();
    let received;
    await ctx.route("**/api/human-check", async (route) => {
      received = route.request().postDataJSON();
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ verified: true }),
      });
    });
    await page.evaluate(() => {
      window.turnstile = {
        render: (container, options) => {
          setTimeout(() => options.callback("browser-test-token"), 10);
          return 1;
        },
        remove: () => {},
      };
    });
    await page.evaluate(async () => {
      const { ensureHuman } = await import("/human-check.js");
      await ensureHuman({ humanCheck: { enabled: true, siteKey: "fixture" } });
    });
    assert.deepEqual(received, { token: "browser-test-token" });
    assert.equal(await page.locator("dialog").count(), 0);
    assert.deepEqual(errors, []);
    assert.deepEqual(badRequests, []);
    await ctx.close();
    console.log(
      "PASS mobile original logo, verification email return URL, resend cooldown, verified token refresh and Turnstile dialog/server handoff. All Firebase/email/challenge responses mocked; no real account or email created.",
    );
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
