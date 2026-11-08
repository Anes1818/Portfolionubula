/* Local-only operator activation UI regressions. No identities or provider calls. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");
(async () => {
  const root = path.resolve(__dirname, "../../platform/public");
  const server = http.createServer((req, res) => {
    if (req.url === "/manual-ui.js") {
      res.setHeader("Content-Type", "text/javascript");
      res.end(fs.readFileSync(path.join(root, "manual-ui.js")));
    } else {
      res.setHeader("Content-Type", "text/html");
      res.end(
        '<main><aside class="admin-detail"><h2>Test Flowers</h2><p>owner@example.test</p><dl id="facts"><dt>Details</dt></dl></aside></main>',
      );
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(origin);
    await page.evaluate(async () => {
      const { mountActivationAdmin } = await import("/manual-ui.js");
      window.qa = {
        calls: [],
        loadFails: true,
        posts: 0,
        verified: 0,
        changes: 0,
        subscription: { status: "inactive", revision: 0 },
      };
      window.qa.mount = () =>
        mountActivationAdmin({
          shop: { id: "sh_" + "a".repeat(32), draft: { name: "Test Flowers" } },
          config: { manualActivationEnabled: true },
          reauthMethod: "password",
          reauthenticate: async (password) => {
            if (password !== "test-password") throw Error("Bad test password");
            qa.verified++;
          },
          api: async (path, options) => {
            if (!options) {
              if (qa.loadFails) throw Error("Could not load subscription");
              return { subscription: qa.subscription, history: [] };
            }
            qa.calls.push(structuredClone(options.body));
            qa.posts++;
            if (qa.posts === 1)
              return new Promise((resolve, reject) => {
                qa.release = () =>
                  reject(Error("Connection lost; result unknown"));
              });
            if (qa.posts === 2) {
              const error = Error("Sign in again before changing access");
              error.status = 401;
              throw error;
            }
            qa.subscription = {
              status: "active",
              revision: 1,
              paidUntil: Date.now() + 30 * 86400000,
            };
            return {
              shop: {
                id: "sh_" + "a".repeat(32),
                subscription: qa.subscription,
              },
            };
          },
          onChange: async () => {
            qa.changes++;
          },
        });
      await qa.mount();
    });
    await page
      .getByRole("status")
      .filter({ hasText: "Could not load subscription" })
      .waitFor();
    await page.evaluate(() => (qa.loadFails = false));
    await page
      .getByRole("button", { name: "Retry loading subscription" })
      .click();
    await page.locator("#manualActivationForm").waitFor();
    assert.ok(
      await page
        .locator(".manual-admin-panel")
        .evaluate((e) => e.nextElementSibling.id === "facts"),
      "Controls precede merchant facts",
    );
    await page
      .getByRole("button", { name: "Record payment & activate 30 days" })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "PayPal reference must contain 8–80" })
      .waitFor();
    assert.equal(await page.evaluate(() => qa.calls.length), 0);
    await page.locator('input[name="reference"]').fill("PAYPAL-TEST-0001");
    await page.locator('input[name="confirmed"]').check();
    await page
      .getByRole("button", { name: "Record payment & activate 30 days" })
      .click();
    await page.waitForFunction(() => qa.calls.length === 1);
    assert.equal(
      await page.locator(".manual-admin-panel").getAttribute("aria-busy"),
      "true",
    );
    assert.equal(await page.locator("#suspendAccess").isDisabled(), true);
    assert.equal(
      await page.locator('input[name="reference"]').isDisabled(),
      true,
    );
    assert.equal(await page.locator("#retryActivationLoad").isDisabled(), true);
    await page.evaluate(() => qa.release());
    await page
      .getByRole("status")
      .filter({ hasText: "Connection lost" })
      .waitFor();
    assert.equal(
      await page.locator('input[name="reference"]').isDisabled(),
      true,
      "Unknown result freezes original details",
    );
    await page.getByRole("button", { name: "Retry saved activation" }).click();
    await page.locator("#verifyAdminSession").waitFor();
    await page.locator("#activationPassword").fill("test-password");
    await page.locator("#verifyAdminSession").click();
    await page
      .getByRole("status")
      .filter({ hasText: "Administrator verified" })
      .waitFor();
    assert.equal(
      await page.evaluate(() => qa.calls.length),
      2,
      "Reauthentication does not submit activation",
    );
    assert.equal(
      await page.locator("#activationPassword").count(),
      0,
      "Password cleared and field removed",
    );
    await page.getByRole("button", { name: "Retry saved activation" }).click();
    await page
      .getByRole("status")
      .filter({ hasText: "Verified payment recorded" })
      .waitFor();
    const calls = await page.evaluate(() => qa.calls);
    assert.deepEqual(calls[0], calls[1]);
    assert.deepEqual(calls[1], calls[2]);
    assert.equal(await page.evaluate(() => qa.changes), 1);
    await page.locator(".complimentary-access summary").click();
    await page
      .getByRole("button", { name: "Grant 30 days · no payment" })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Enter an access reason" })
      .waitFor();
    assert.equal(await page.evaluate(() => qa.calls.length), 3);
    await page.locator('input[name="reason"]').fill("Own shop trial");
    await page
      .getByRole("button", { name: "Grant 30 days · no payment" })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Complimentary access activated" })
      .waitFor();
    const complimentary = await page.evaluate(() => qa.calls.at(-1));
    assert.equal(complimentary.action, "grant");
    assert.equal(complimentary.reason, "Own shop trial");
    assert.equal(complimentary.paymentReference, undefined);
    assert.equal(complimentary.amountCents, undefined);
    // A late completion must not render into a different merchant's panel.
    await page.evaluate(async () => {
      const { mountActivationAdmin } = await import("/manual-ui.js");
      document.querySelector(".admin-detail").innerHTML =
        '<h2>Sandbox A</h2><p>a@example.test</p><dl id="facts"></dl>';
      qa.sandboxCalls = 0;
      await mountActivationAdmin({
        shop: { id: "sh_" + "b".repeat(32), draft: { name: "Sandbox A" } },
        config: { manualActivationEnabled: true, sandboxTestAccess: true },
        api: async (path, options) => {
          if (!options)
            return { subscription: { status: "inactive" }, history: [] };
          qa.sandboxCalls++;
          return new Promise(
            (resolve) =>
              (qa.finishSandbox = () =>
                resolve({
                  shop: {
                    id: "sh_" + "b".repeat(32),
                    subscription: { status: "active", revision: 1 },
                  },
                })),
          );
        },
        onChange: async () => {
          qa.sandboxChanged = true;
        },
      });
    });
    assert.equal(
      await page.locator("#manualActivationForm").count(),
      0,
      "No real PayPal form in Sandbox",
    );
    await page.locator("#grantSandboxAccess").click();
    await page.waitForFunction(() => qa.sandboxCalls === 1);
    assert.equal(await page.locator("#suspendAccess").isDisabled(), true);
    await page.evaluate(() => {
      document.querySelector(".admin-detail").innerHTML =
        "<h2>Different shop B</h2>";
      qa.finishSandbox();
    });
    await page.waitForFunction(() => qa.sandboxChanged === true);
    assert.equal(
      await page.locator(".admin-detail").innerText(),
      "Different shop B",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS activation UI: visible validation/loading/failure/retry, frozen idempotency, whole-panel busy controls, password reauthentication without mutation, Sandbox form isolation and detached completion safety. All services simulated.",
    );
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
