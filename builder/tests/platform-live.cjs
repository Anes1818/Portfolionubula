/* Read-only public deployment smoke. Never signs in, creates accounts/shops,
 * sends email, starts subscriptions or calls payment provider APIs. */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { chromium } = require("playwright");
(async () => {
  const base = process.env.PLATFORM_BASE || "https://app.nebulastudio.site";
  const out = path.resolve(__dirname, "../../.private/qa/platform/live");
  fs.mkdirSync(out, { recursive: true });
  const health = await fetch(base + "/api/health");
  assert.equal(health.status, 200);
  const data = await health.json();
  assert.equal(data.stage, "private_beta");
  assert.equal(data.signupMode, "private-beta");
  for (const flag of ["billingEnabled", "checkoutEnabled", "publishingEnabled"])
    assert.equal(data[flag], false);
  const cfg = await (await fetch(base + "/api/config")).json();
  assert.equal(cfg.firebase.projectId, "la-flora-6ed47");
  assert.equal(cfg.squareConnectionEnabled, false);
  assert.equal(cfg.SQUARE_SANDBOX_APPLICATION_SECRET, undefined);
  assert.equal(cfg.BETA_ACCESS_EMAILS, undefined);
  assert.equal((await fetch(base + "/api/session")).status, 401);
  for (const route of [
    "/cloudflare/platform/worker.mjs",
    "/.private/qa/platform/test-entry.mjs",
    "/platform/builder-adapter.js",
    "/cloudflare/platform/square-connection.mjs",
    "/api/shops/sh_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/readiness",
    "/api/shops/sh_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/square/status",
    "/api/shops/unpublished-preview",
  ])
    assert.equal(
      (await fetch(base + route)).status,
      404,
      route + " must not expose source/private data",
    );
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1365, height: 900 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(base + "/login", { waitUntil: "domcontentloaded" });
    await page
      .getByRole("button", { name: "Continue with Google" })
      .waitFor({ timeout: 45000 });
    await page.waitForFunction(
      () =>
        document.querySelector(".story-image img")?.complete &&
        document.querySelector(".story-image img")?.naturalWidth > 0,
      undefined,
      { timeout: 45000 },
    );
    await page.screenshot({
      path: path.join(out, "login-desktop.png"),
      fullPage: true,
    });
    await page.goto(base + "/dashboard/orders", {
      waitUntil: "domcontentloaded",
    });
    await page
      .getByRole("button", { name: "Continue with Google" })
      .waitFor({ timeout: 45000 });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await page.screenshot({
      path: path.join(out, "login-mobile.png"),
      fullPage: true,
    });
    await page.goto(base + "/s/unpublished-preview", {
      waitUntil: "domcontentloaded",
    });
    await page
      .getByText("This shop isn’t open to the public yet.", { exact: false })
      .waitFor();
    assert.equal(await page.locator(".flower-card").count(), 0);
    assert.deepEqual(errors, []);
    console.log(
      "PASS live public SDK boot, login/deep routes, inactive provider flags, anonymous access denial, source-file exclusion and mobile layout. No login or write occurred.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
