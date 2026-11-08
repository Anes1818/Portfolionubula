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
  assert.equal(data.signupMode, "open-beta");
  for (const flag of ["billingEnabled", "checkoutEnabled"])
    assert.equal(data[flag], false);
  assert.equal(data.publishingEnabled, true);
  assert.equal(data.squareConnectionEnabled, true);
  assert.equal(data.providers.square, "connection_configured");
  const cfg = await (await fetch(base + "/api/config")).json();
  assert.equal(cfg.firebase.projectId, "la-flora-6ed47");
  assert.equal(cfg.squareConnectionEnabled, true);
  assert.equal(cfg.squareEnvironment, "production");
  assert.equal(cfg.manualActivationEnabled, true);
  assert.equal(cfg.humanCheck.enabled, true);
  assert.equal(cfg.humanCheck.siteKey, "0x4AAAAAAFwcWrFTh7VHtZn0");
  assert.equal(cfg.TURNSTILE_SECRET_KEY, undefined);
  assert.equal(cfg.HUMAN_PROOF_SECRET, undefined);
  assert.equal(cfg.SQUARE_SANDBOX_APPLICATION_SECRET, undefined);
  assert.equal(cfg.SQUARE_PRODUCTION_APPLICATION_SECRET, undefined);
  assert.equal(cfg.SQUARE_TOKEN_ENCRYPTION_KEY, undefined);
  assert.equal(cfg.RESEND_API_KEY, undefined);
  assert.equal(cfg.BETA_ACCESS_EMAILS, undefined);
  const catalogue = await (await fetch(base + "/api/catalog")).json();
  assert.ok(
    catalogue.presets.some(
      (preset) => preset.id === "mixed" && preset.available,
    ),
    "Fresh + satin catalogue must be deployed",
  );
  for (const module of [
    "workspace-home.js",
    "shop-presentation.mjs",
    "icons.js",
    "checkout-client.js",
    "shop-flow.js",
    "fulfillment-rules.mjs",
    "commerce-ui.js",
    "owner-onboarding.js",
    "bouquet-setup.mjs",
    "bouquet-slots.mjs",
  ])
    assert.equal((await fetch(base + "/" + module)).status, 200, module);
  assert.equal((await fetch(base + "/api/session")).status, 401);
  for (const route of [
    "/cloudflare/platform/worker.mjs",
    "/.private/qa/platform/test-entry.mjs",
    "/platform/builder-adapter.js",
    "/cloudflare/platform/square-connection.mjs",
    "/cloudflare/platform/merchant-checkout.mjs",
    "/cloudflare/platform/manual-activation.mjs",
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
    await page.goto(base + "/", { waitUntil: "domcontentloaded" });
    await page
      .getByRole("link", { name: "Try the bouquet builder", exact: false })
      .waitFor();
    await page.goto(base + "/demo");
    await page.getByRole("link", { name: /Try fresh flowers/ }).click();
    await page.waitForFunction(() => window.NebulaApp?.ready, undefined, {
      timeout: 60000,
    });
    await page.locator("#demoReview").waitFor();
    assert.equal(await page.locator("#platformSaveCollection").count(), 0);
    await page.locator("#demoReview").click();
    await page
      .getByRole("dialog", { name: "The idea, ready to share." })
      .waitFor();
    await page.getByRole("button", { name: "Close demo request" }).click();
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
    await page
      .locator(".nebula-logo-mark img")
      .evaluate((image) => image.decode());
    assert.equal(
      await page.locator(".nebula-logo-mark img").getAttribute("src"),
      "/assets/nebula-logo.jpg",
    );
    await page.screenshot({
      path: path.join(out, "login-desktop.png"),
      fullPage: true,
    });
    await page.goto(base + "/admin/login", { waitUntil: "domcontentloaded" });
    await page
      .getByRole("button", {
        name: "Open Nebula administration ↗",
        exact: true,
      })
      .waitFor({ timeout: 45000 });
    assert.equal(await page.locator('[data-action="auth-mode"]').count(), 0);
    assert.equal(
      await page.locator(".app-header .beta-label").textContent(),
      "NEBULA ADMIN",
    );
    assert.equal((await fetch(base + "/api/admin/users")).status, 401);
    await page.screenshot({
      path: path.join(out, "operator-login-desktop.png"),
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
    await page.goto(
      base +
        "/receipt.html#shop=sh_" +
        "a".repeat(32) +
        "&order=" +
        "a".repeat(24),
      { waitUntil: "domcontentloaded" },
    );
    await page.getByRole("alert").waitFor();
    assert.equal(await page.locator("#payFull").count(), 0);
    assert.deepEqual(errors, []);
    console.log(
      "PASS live public SDK boot, login/deep routes, production connection enabled with checkout closed, anonymous access denial, source-file exclusion and mobile layout. No login or write occurred.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
