import test from "node:test";
import assert from "node:assert/strict";
import Commerce from "../../../clients/raysbouquetz/commerce-core.js";
import { fixture, design, policy, fixedNow } from "./fixtures.mjs";
import {
  randomToken,
  encrypt,
  decrypt,
  verifyWebhook,
  verifyFirebase,
  b64,
} from "../security.mjs";
import { checkoutUrl } from "../square.mjs";
import { makeHandler } from "../worker.mjs";
test("all catalogue combinations use shared cents, CAD/USD, package, delivery and tax rules", () => {
  const p = policy();
  assert.deepEqual(Commerce.policyProblems(p), []);
  for (const mode of ["dome", "heart"])
    for (const n of [1, 7, 18, 30, 57, 86, 100]) {
      const s = design(
          Array.from({ length: n }, (_, i) =>
            i % 2 ? "rose_pink" : "cash_usd_1",
          ),
          mode,
        ),
        r = Commerce.calculate(s, p, { method: "Pickup" }, fixedNow);
      assert.equal(r.lines.filter((l) => l.id === "money_styling").length, 1);
      assert.equal(r.payment.dueCents + r.payment.balanceCents, r.totalCents);
      assert.ok(Number.isSafeInteger(r.totalCents));
    }
  assert.equal(
    Commerce.calculate(
      design(Array(7).fill("foam_rose_black")),
      p,
      undefined,
      fixedNow,
    ).totalCents,
    4000,
  );
  const money = design([
    ...Array(50).fill("cash_usd_1"),
    ...Array(7).fill("foam_rose_black"),
  ]);
  money.finishes.sash = "blank_blackband";
  assert.equal(
    Commerce.calculate(money, p, undefined, fixedNow).totalCents,
    20442,
  );
  money.finishes.studio.cashSupply = "customer";
  assert.equal(
    Commerce.calculate(money, p, undefined, fixedNow).totalCents,
    13200,
  );
  p.tax = { approved: true, mode: "added", bps: 1300, cashValueTaxable: false };
  const calc = Commerce.calculate(
    design(),
    p,
    { method: "Delivery", zoneId: "winnipeg", postalCode: "R3C1A1" },
    fixedNow,
  );
  assert.equal(calc.subtotalCents, 2300);
  assert.equal(calc.taxCents, 299);
  assert.equal(calc.totalCents, 2599);
  assert.equal(calc.payment.dueCents, 1300);
  p.tax.mode = "included";
  assert.equal(
    Commerce.calculate(design(), p, { method: "Pickup" }, fixedNow).totalCents,
    800,
  );
});
test("unknown prices, stale FX, unsupported catalogue/finishes and contradictory layouts cannot become payable", () => {
  const p = policy();
  p.unitCents.satin_dahlia_pink = null;
  assert.throws(
    () => Commerce.calculate(design(), p, undefined, fixedNow),
    /Confirm/,
  );
  p.enabledItems = p.enabledItems.filter((i) => i !== "satin_dahlia_pink");
  assert.equal(
    Commerce.calculate(design(), p, undefined, fixedNow).totalCents,
    800,
  );
  p.usdToCad.expiresAt = "2026-10-26T10:00:00Z";
  assert.throws(
    () => Commerce.calculate(design(["cash_usd_1"]), p, undefined, fixedNow),
    /exchange rate/,
  );
  const s = design();
  s.template.palette = ["cash_usd_100"];
  s.template.overrides = {};
  const stored = Commerce.validateDesign(s);
  assert.equal(stored.template.overrides[0], "rose_pink");
  assert.throws(() => Commerce.validateDesign({ ...s, mode: "classic" }));
  assert.throws(() =>
    Commerce.validateDesign({ ...s, items: [{ ...s.items[0], id: "lily" }] }),
  );
  assert.throws(() =>
    Commerce.validateDesign({ ...s, items: [...s.items, ...s.items] }),
  );
  s.finishes.fillerCount = 1;
  assert.throws(() => Commerce.validateDesign(s));
});
test("server computes the quote, ignores browser totals and scopes the order capability", async () => {
  const f = await fixture(),
    q = await f.service.quote({
      ...f.request,
      totalCents: 1,
      paidCents: 999999,
    });
  assert.equal(q.totalCents, 800);
  assert.equal(q.paidCents, 0);
  assert.deepEqual(await f.service.quote(f.request), q);
  await assert.rejects(
    () => f.service.customerOrder(q.id, randomToken()),
    /authorised/,
  );
  await assert.rejects(
    () =>
      f.service.quote({
        ...f.request,
        customer: { ...f.request.customer, name: "Changed" },
      }),
    /different order/,
  );
  assert.ok(!(await f.service.status(q.id, f.request.requestKey)).accessHash);
});
test("deposit, safe retries, verified completion and remaining balance are recorded exactly once", async () => {
  const f = await fixture();
  f.request.design = design(Array(3).fill("rose_pink"));
  const q = await f.service.quote(f.request),
    a = await f.service.checkout(q.id, f.request.requestKey, {
      revision: 1,
      choice: "deposit",
    });
  assert.equal(a.request.dueCents, 1200);
  assert.equal(a.paidCents, 0);
  await f.service.checkout(q.id, f.request.requestKey, {
    revision: 1,
    choice: "deposit",
  });
  assert.equal(f.square.keys.size, 1);
  await assert.rejects(
    () =>
      f.service.checkout(q.id, f.request.requestKey, {
        revision: 1,
        choice: "full",
      }),
    /Cancel/,
  );
  const stored = await f.service.getOrder(q.id),
    p = f.square.pay(stored.requests[0].squareOrderId);
  await f.service.event({
    event_id: "event-1",
    merchant_id: "test-merchant",
    type: "payment.updated",
    data: { object: { payment: { id: p.id } } },
  });
  await f.service.event({
    event_id: "event-1",
    merchant_id: "test-merchant",
    type: "payment.updated",
    data: { object: { payment: { id: p.id } } },
  });
  let status = await f.service.status(q.id, f.request.requestKey);
  assert.equal(status.paidCents, 1200);
  assert.equal(status.balanceCents, 1200);
  assert.equal(status.status, "deposit_paid");
  f.clock.now += 86400000;
  status = await f.service.checkout(q.id, f.request.requestKey, {
    revision: 1,
    choice: "full",
  });
  assert.equal(status.request.dueCents, 1200);
  const last = (await f.service.getOrder(q.id)).requests.at(-1);
  f.square.pay(last.squareOrderId, { id: "balance" });
  status = await f.service.status(q.id, f.request.requestKey);
  assert.equal(status.paidCents, 2400);
  assert.equal(status.status, "paid");
  await assert.rejects(
    () =>
      f.service.checkout(q.id, f.request.requestKey, {
        revision: 1,
        choice: "full",
      }),
    /no payment due/,
  );
});
test("network loss after Square accepts a link retries the same persisted attempt", async () => {
  const f = await fixture(),
    q = await f.service.quote(f.request);
  f.square.timeoutNextLink();
  await assert.rejects(
    () =>
      f.service.checkout(q.id, f.request.requestKey, {
        revision: 1,
        choice: "full",
      }),
    /temporarily unavailable/,
  );
  assert.equal((await f.service.getOrder(q.id)).requests[0].status, "creating");
  const restored = new f.service.constructor({
    storage: f.storage,
    env: f.env,
    shop: "raysbouquetz",
    fetchImpl: f.square.fetchImpl,
    now: () => f.clock.now,
  });
  const result = await restored.checkout(q.id, f.request.requestKey, {
    revision: 1,
    choice: "full",
  });
  assert.ok(result.request.url);
  assert.equal(f.square.keys.size, 1);
});
test("cancel retires Square URL and replacement gets a different attempt key", async () => {
  const f = await fixture(),
    q = await f.service.quote(f.request);
  await f.service.checkout(q.id, f.request.requestKey, {
    revision: 1,
    choice: "full",
  });
  const r = (await f.service.getOrder(q.id)).requests[0];
  await f.service.cancel(await f.service.getOrder(q.id));
  assert.equal(f.square.orders.get(r.squareOrderId).cancelled, true);
  await assert.rejects(
    () =>
      f.service.checkout(q.id, f.request.requestKey, {
        revision: 1,
        choice: "full",
      }),
    /attention/,
  );
  const next = await f.service.quote({
    ...f.request,
    requestKey: randomToken(),
  });
  await f.service
    .checkout(next.id, (await f.service.getOrder(next.id)).accessHash, {
      revision: 1,
      choice: "full",
    })
    .then(() => assert.fail("hash is not the capability"))
    .catch((e) => assert.match(e.message, /authorised/));
});
test("price updates and expiry retire unpaid links, paid orders keep their agreed price", async () => {
  const f = await fixture(),
    q = await f.service.quote(f.request);
  await f.service.checkout(q.id, f.request.requestKey, {
    revision: 1,
    choice: "full",
  });
  const s = await f.service.settings();
  s.policy.unitCents.rose_pink = 900;
  await f.service.saveSettings(f.actor, {
    version: 1,
    policy: s.policy,
    checkoutEnabled: true,
  });
  assert.equal((await f.service.getOrder(q.id)).status, "cancelled");
  await assert.rejects(
    () => f.service.quote({ ...f.request, requestKey: randomToken() }),
    /Prices changed/,
  );
  const g = await fixture(),
    expired = await g.service.quote(g.request);
  await g.service.checkout(expired.id, g.request.requestKey, {
    revision: 1,
    choice: "full",
  });
  g.clock.now += 1000000;
  await g.service.maintain();
  assert.equal((await g.service.getOrder(expired.id)).status, "expired");
});
test("mismatched payment and completed refunds require attention and never enable automatic recharging", async () => {
  const f = await fixture(),
    q = await f.service.quote(f.request);
  await f.service.checkout(q.id, f.request.requestKey, {
    revision: 1,
    choice: "full",
  });
  let r = (await f.service.getOrder(q.id)).requests[0];
  const p = f.square.pay(r.squareOrderId, { amount: 1 });
  await f.service.payment(p.id);
  assert.equal((await f.service.getOrder(q.id)).status, "review_required");
  assert.equal((await f.service.getOrder(q.id)).paidCents, 0);
  const g = await fixture(),
    q2 = await g.service.quote(g.request);
  await g.service.checkout(q2.id, g.request.requestKey, {
    revision: 1,
    choice: "full",
  });
  r = (await g.service.getOrder(q2.id)).requests[0];
  const paid = g.square.pay(r.squareOrderId);
  await g.service.payment(paid.id);
  g.square.refunds.set("refund-1", {
    id: "refund-1",
    payment_id: paid.id,
    status: "COMPLETED",
    amount_money: { amount: 800, currency: "CAD" },
  });
  await g.service.refund("refund-1");
  await g.service.refund("refund-1");
  assert.equal((await g.service.getOrder(q2.id)).refundedCents, 800);
  assert.equal((await g.service.getOrder(q2.id)).status, "refunded");
  await assert.rejects(
    () =>
      g.service.checkout(q2.id, g.request.requestKey, {
        revision: 1,
        choice: "full",
      }),
    /attention/,
  );
});
test("merchant access, email-bound invitations, platform privilege and production activation are enforced", async () => {
  const f = await fixture();
  await assert.rejects(
    () => f.service.listOrders({ uid: "other" }),
    /not assigned/,
  );
  await assert.rejects(
    () => f.service.invite(f.actor, "test@example.test"),
    /platform owner/,
  );
  const platform = {
      uid: "platform-owner",
      email: "owner@example.test",
      authTime: fixedNow / 1000,
    },
    invite = await f.service.invite(platform, "new@example.test");
  await assert.rejects(
    () =>
      f.service.claim(
        { uid: "new", email: "wrong@example.test" },
        invite.invite,
      ),
    /another email/,
  );
  assert.equal(
    (
      await f.service.claim(
        { uid: "new", email: "new@example.test" },
        invite.invite,
      )
    ).role,
    "merchant",
  );
  await assert.rejects(
    () =>
      f.service.claim({ uid: "new", email: "new@example.test" }, invite.invite),
    /invalid/,
  );
  f.env.ENVIRONMENT = "production";
  assert.equal(await f.service.enabled(), false);
});
test("OAuth state is one use, encrypted token context is shop-specific, and revocation disables checkout", async () => {
  const f = await fixture();
  await f.storage.delete("connection");
  const start = await f.service.oauthStart(f.actor),
    state = new URL(start.url).searchParams.get("state").split(".")[1];
  await assert.rejects(
    () => f.service.oauthCallback({ state, code: "code", nonce: "wrong" }),
    /expired/,
  );
  await f.service.oauthCallback({
    state,
    code: "code",
    nonce: start.browserNonce,
  });
  const c = await f.storage.get("connection");
  assert.ok(!JSON.stringify(c).includes("fake-access"));
  await assert.rejects(() =>
    decrypt(c.tokens, f.env.TOKEN_ENCRYPTION_KEY, "sandbox:another-shop"),
  );
  await assert.rejects(
    () =>
      f.service.oauthCallback({
        state,
        code: "code",
        nonce: start.browserNonce,
      }),
    /expired/,
  );
  await f.service.event({
    event_id: "revoked",
    merchant_id: "test-merchant",
    type: "oauth.authorization.revoked",
  });
  assert.equal(await f.service.enabled(), false);
  assert.equal((await f.service.connection()).tokens, null);
});
test("webhook signatures bind exact URL and raw body, and sandbox URLs are environment-specific", async () => {
  const secret = "local-webhook-test",
    url = "https://example.test/webhooks/square",
    raw = '{"event_id":"test"}',
    k = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    ),
    bytes = new Uint8Array(
      await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(url + raw)),
    ),
    sig = btoa(String.fromCharCode(...bytes));
  assert.ok(await verifyWebhook(raw, sig, secret, url));
  assert.equal(await verifyWebhook(raw + " ", sig, secret, url), false);
  assert.equal(await verifyWebhook(raw, sig, secret, url + "/"), false);
  assert.ok(
    checkoutUrl("https://sandbox.square.link/u/test", {
      ENVIRONMENT: "sandbox",
    }),
  );
  assert.equal(
    checkoutUrl("https://square.link/u/test", { ENVIRONMENT: "sandbox" }),
    false,
  );
  assert.equal(
    checkoutUrl("https://sandbox.square.link.evil/u/test", {
      ENVIRONMENT: "sandbox",
    }),
    false,
  );
});
test("public API requires permitted origin, verified auth and order capability, with no secret health data", async () => {
  let last;
  const env = {
    ENVIRONMENT: "sandbox",
    SITE_ORIGIN: "https://nebulastudio.site",
    ALLOWED_SHOPS: "raysbouquetz",
    FIREBASE_PROJECT_ID: "test",
    COMMERCE: {
      idFromName: (n) => n,
      get: () => ({
        fetch: async (_, req) => {
          last = JSON.parse(req.body);
          return new Response(JSON.stringify({ available: false }));
        },
      }),
    },
  };
  const handler = makeHandler({
    verifyIdentity: async (token) => {
      assert.equal(token, "verified-test");
      return { uid: "ray", email: "ray@example.test" };
    },
  });
  assert.equal(
    (
      await handler(
        new Request("https://api.test/v1/shops/raysbouquetz/quotes", {
          method: "POST",
          headers: {
            Origin: "https://evil.test",
            "Content-Type": "application/json",
          },
          body: "{}",
        }),
        env,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await handler(
        new Request("https://api.test/v1/shops/raysbouquetz/orders"),
        env,
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await handler(
        new Request("https://api.test/v1/shops/another/config"),
        env,
      )
    ).status,
    404,
  );
  const ok = await handler(
    new Request("https://api.test/v1/shops/raysbouquetz/account", {
      headers: { Authorization: "Bearer verified-test" },
    }),
    env,
  );
  assert.equal(ok.status, 200);
  assert.equal(last.actor.uid, "ray");
  const health = await (
    await handler(new Request("https://api.test/health"), env)
  ).json();
  assert.deepEqual(Object.keys(health).sort(), [
    "configured",
    "environment",
    "paymentsEnabled",
  ]);
});
test("Firebase JWTs require Google signature, correct project/issuer, verified email and valid expiry", async () => {
  const pair = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"],
    ),
    jwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  jwk.kid = "fixture-key";
  const project = "firebase-jwt-fixture",
    now = fixedNow / 1000,
    claims = {
      aud: project,
      iss: "https://securetoken.google.com/" + project,
      sub: "ray",
      email: "ray@example.test",
      email_verified: true,
      exp: now + 3600,
      iat: now,
      auth_time: now,
    };
  let calls = 0;
  const fetchKeys = async () => {
    calls++;
    return new Response(JSON.stringify({ keys: [jwk] }));
  };
  async function jwt(c = claims, h = { alg: "RS256", kid: "fixture-key" }) {
    const a = b64(new TextEncoder().encode(JSON.stringify(h))),
      b = b64(new TextEncoder().encode(JSON.stringify(c))),
      signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        pair.privateKey,
        new TextEncoder().encode(a + "." + b),
      );
    return a + "." + b + "." + b64(new Uint8Array(signature));
  }
  assert.equal(
    (await verifyFirebase(await jwt(), project, fetchKeys, fixedNow)).uid,
    "ray",
  );
  for (const c of [
    { ...claims, exp: now - 1 },
    { ...claims, email_verified: false },
    { ...claims, aud: "other-project" },
    { ...claims, iss: "https://evil.test" },
  ]) {
    const invalid = await jwt(c);
    await assert.rejects(() =>
      verifyFirebase(invalid, project, fetchKeys, fixedNow),
    );
  }
  const valid = await jwt(),
    parts = valid.split(".");
  parts[1] = b64(
    new TextEncoder().encode(
      JSON.stringify({ ...claims, sub: "platform-owner" }),
    ),
  );
  await assert.rejects(() =>
    verifyFirebase(parts.join("."), project, fetchKeys, fixedNow),
  );
  await assert.rejects(() =>
    verifyFirebase("malformed", project, fetchKeys, fixedNow),
  );
  assert.equal(calls, 1);
});
test("late payment after cancellation is held for review and forbidden settings edits have no side effects", async () => {
  const f = await fixture(),
    q = await f.service.quote(f.request);
  await f.service.checkout(q.id, f.request.requestKey, {
    revision: 1,
    choice: "full",
  });
  const r = (await f.service.getOrder(q.id)).requests[0];
  const s = await f.service.settings();
  await assert.rejects(
    () =>
      f.service.saveSettings(f.actor, {
        version: 1,
        policy: s.policy,
        checkoutEnabled: true,
        cashPaymentsApproved: true,
      }),
    /platform owner/,
  );
  assert.equal((await f.service.getOrder(q.id)).status, "awaiting_payment");
  await f.service.cancel(await f.service.getOrder(q.id));
  const payment = f.square.pay(r.squareOrderId);
  await f.service.payment(payment.id);
  assert.equal((await f.service.getOrder(q.id)).paidCents, 800);
  assert.equal((await f.service.getOrder(q.id)).status, "review_required");
});
test("postal delivery rules and the tax treatment of cash are explicit", () => {
  const p = policy(),
    s = design(["cash_cad_100"]);
  p.tax = { approved: true, mode: "added", bps: 1300, cashValueTaxable: false };
  assert.equal(
    Commerce.calculate(s, p, { method: "Pickup" }, fixedNow).taxCents,
    1040,
  );
  p.tax.cashValueTaxable = true;
  assert.equal(
    Commerce.calculate(s, p, { method: "Pickup" }, fixedNow).taxCents,
    2340,
  );
  assert.throws(
    () =>
      Commerce.calculate(
        s,
        p,
        { method: "Delivery", zoneId: "winnipeg", postalCode: "M5V1A1" },
        fixedNow,
      ),
    /outside/,
  );
});

async function depositOrder(f) {
  f.request.design = design(Array(3).fill("rose_pink"));
  const q = await f.service.quote(f.request);
  await f.service.checkout(q.id, f.request.requestKey, {
    revision: 1,
    choice: "deposit",
  });
  const r = (await f.service.getOrder(q.id)).requests[0],
    payment = f.square.pay(r.squareOrderId);
  await f.service.payment(payment.id);
  return { id: q.id, payment };
}

async function refundDeposit(f, payment) {
  f.square.refunds.set("deposit-refund", {
    id: "deposit-refund",
    payment_id: payment.id,
    status: "COMPLETED",
    amount_money: { amount: 1200, currency: "CAD" },
  });
  await f.service.refund("deposit-refund");
}

test("refunding a deposit retires its outstanding balance link and hides it from customers", async () => {
  const f = await fixture(),
    { id, payment } = await depositOrder(f);
  await f.service.checkout(id, f.request.requestKey, {
    revision: 1,
    choice: "full",
  });
  const balance = (await f.service.getOrder(id)).requests.at(-1);
  await refundDeposit(f, payment);
  const q = await f.service.getOrder(id);
  assert.equal(q.status, "refunded");
  assert.equal(q.requests.at(-1).status, "cancelled");
  assert.equal(f.square.orders.get(balance.squareOrderId).cancelled, true);
  assert.equal(f.service.publicOrder(q).request, null);
  assert.equal(q.requests.at(-1).url, undefined);
});

test("a held balance create is recovered by its persisted key and retired after a network timeout", async () => {
  const f = await fixture(),
    { id, payment } = await depositOrder(f);
  f.square.timeoutNextLink();
  await assert.rejects(
    () =>
      f.service.checkout(id, f.request.requestKey, {
        revision: 1,
        choice: "full",
      }),
    /temporarily unavailable/,
  );
  assert.equal(
    (await f.service.getOrder(id)).requests.at(-1).status,
    "creating",
  );
  await refundDeposit(f, payment);
  const q = await f.service.getOrder(id),
    balance = q.requests.at(-1);
  assert.equal(f.square.keys.size, 2);
  assert.equal(q.status, "refunded");
  assert.equal(balance.status, "cancelled");
  assert.equal(f.square.orders.get(balance.squareOrderId).cancelled, true);
  assert.equal(f.service.publicOrder(q).request, null);
});

test("failed held-link retirement preserves the hold and retries provider deletion in maintenance", async () => {
  const f = await fixture(),
    { id, payment } = await depositOrder(f);
  await f.service.checkout(id, f.request.requestKey, {
    revision: 1,
    choice: "full",
  });
  const fetchSquare = f.service.fetchImpl;
  let failDelete = true;
  f.service.fetchImpl = async (url, options) => {
    if (options.method === "DELETE" && failDelete)
      throw Error("Simulated provider outage");
    return fetchSquare(url, options);
  };
  await refundDeposit(f, payment);
  let q = await f.service.getOrder(id),
    balance = q.requests.at(-1);
  assert.equal(q.status, "refunded");
  assert.equal(balance.status, "pending");
  assert.equal(balance.retirementPending, true);
  assert.equal(f.square.orders.get(balance.squareOrderId).cancelled, undefined);
  assert.equal(f.service.publicOrder(q).request, null);
  failDelete = false;
  await f.service.maintain();
  q = await f.service.getOrder(id);
  balance = q.requests.at(-1);
  assert.equal(q.status, "refunded");
  assert.equal(balance.status, "cancelled");
  assert.equal(balance.retirementPending, undefined);
  assert.equal(f.square.orders.get(balance.squareOrderId).cancelled, true);
});

test("a balance payment racing held-link deletion is recorded and remains held for review", async () => {
  const f = await fixture(),
    { id, payment } = await depositOrder(f);
  await f.service.checkout(id, f.request.requestKey, {
    revision: 1,
    choice: "full",
  });
  const balance = (await f.service.getOrder(id)).requests.at(-1),
    fetchSquare = f.service.fetchImpl;
  f.service.fetchImpl = async (url, options) => {
    if (options.method === "DELETE")
      f.square.pay(balance.squareOrderId, { id: "racing-balance" });
    return fetchSquare(url, options);
  };
  await refundDeposit(f, payment);
  const q = await f.service.getOrder(id);
  assert.equal(q.status, "review_required");
  assert.equal(q.paidCents, 1200);
  assert.equal(q.payments["racing-balance"].status, "COMPLETED");
  assert.equal(q.requests.at(-1).status, "paid");
  assert.equal(f.service.publicOrder(q).request, null);
});

test("a lost refund webhook is discovered before any balance link is created", async () => {
  const f = await fixture(),
    { id, payment } = await depositOrder(f);
  payment.refunded_money = { amount: 1200, currency: "CAD" };
  await assert.rejects(
    () =>
      f.service.checkout(id, f.request.requestKey, {
        revision: 1,
        choice: "full",
      }),
    /attention/,
  );
  assert.equal(f.square.keys.size, 1);
  assert.equal((await f.service.getOrder(id)).status, "refunded");
});

test("status refreshes completed deposits, retires a balance after a lost refund event and throttles retries", async () => {
  const f = await fixture(),
    { id, payment } = await depositOrder(f);
  await f.service.checkout(id, f.request.requestKey, {
    revision: 1,
    choice: "full",
  });
  const balance = (await f.service.getOrder(id)).requests.at(-1);
  payment.refunded_money = { amount: 1200, currency: "CAD" };
  f.clock.now += 60001;
  let q = await f.service.status(id, f.request.requestKey);
  assert.equal(q.status, "refunded");
  assert.equal(q.request, null);
  assert.equal(f.square.orders.get(balance.squareOrderId).cancelled, true);
  const calls = f.square.calls.filter((c) =>
    c.path.startsWith("/v2/payments/"),
  ).length;
  q = await f.service.status(id, f.request.requestKey);
  assert.equal(q.status, "refunded");
  assert.equal(
    f.square.calls.filter((c) => c.path.startsWith("/v2/payments/")).length,
    calls,
  );
});

test("maintenance discovers refunds without webhooks even after a full payment completed", async () => {
  const f = await fixture(),
    q = await f.service.quote(f.request);
  await f.service.checkout(q.id, f.request.requestKey, {
    revision: 1,
    choice: "full",
  });
  const r = (await f.service.getOrder(q.id)).requests[0],
    payment = f.square.pay(r.squareOrderId);
  await f.service.payment(payment.id);
  payment.refunded_money = { amount: 800, currency: "CAD" };
  f.clock.now += 60001;
  await f.service.maintain();
  const refreshed = await f.service.getOrder(q.id);
  assert.equal(refreshed.status, "refunded");
  assert.equal(refreshed.refundedCents, 800);
});

test("delayed revocation from an older grant cannot disable the same merchant after reconnecting", async () => {
  const f = await fixture();
  await f.storage.delete("connection");
  async function connect() {
    const start = await f.service.oauthStart(f.actor),
      state = new URL(start.url).searchParams.get("state").split(".")[1];
    await f.service.oauthCallback({
      state,
      code: "code",
      nonce: start.browserNonce,
    });
  }
  await connect();
  const revokedAt = f.clock.now;
  await f.service.disconnect(f.actor);
  f.clock.now += 60000;
  await connect();
  const settings = await f.service.settings();
  settings.checkoutEnabled = true;
  await f.storage.put("settings", settings);
  const connection = await f.service.connection();
  assert.equal(connection.connectedAt, f.clock.now);
  for (const [event_id, data] of [
    [
      "old-grant-revoked",
      {
        object: {
          revocation: { revoked_at: new Date(revokedAt).toISOString() },
        },
      },
    ],
    ["old-grant-created-at-fallback", undefined],
  ]) {
    await f.service.event({
      event_id,
      merchant_id: "test-merchant",
      type: "oauth.authorization.revoked",
      created_at: new Date(data ? f.clock.now + 1000 : revokedAt).toISOString(),
      data,
    });
    assert.equal((await f.service.connection()).status, "connected");
    assert.deepEqual((await f.service.connection()).tokens, connection.tokens);
    assert.equal(await f.service.enabled(), true);
  }
  await f.service.event({
    event_id: "current-grant-revoked",
    merchant_id: "test-merchant",
    type: "oauth.authorization.revoked",
    data: {
      object: {
        revocation: { revoked_at: new Date(f.clock.now + 1000).toISOString() },
      },
    },
  });
  assert.equal((await f.service.connection()).status, "revoked");
  assert.equal(await f.service.enabled(), false);
});

test("checkout stays unavailable until a connected merchant has selected a Square location", async () => {
  const f = await fixture(),
    c = await f.service.connection();
  for (const locationId of [null, "", "   "]) {
    await f.storage.put("connection", { ...c, locationId });
    assert.equal(await f.service.enabled(), false);
    assert.equal((await f.service.publicConfig()).available, false);
  }
  await f.storage.put("connection", c);
  assert.equal((await f.service.publicConfig()).available, true);
});
