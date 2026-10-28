import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createLemonAdapter } from "../lemon.mjs";

const fixedNow = Date.parse("2026-10-28T12:00:00.000Z");
const config = {
  apiKey: "test-api-key-local-fixture-only",
  webhookSecret: "test-webhook-secret-fixture",
  storeId: "123",
  variantId: "456",
  checkoutHost: "nebula-test.lemonsqueezy.com",
  siteOrigin: "https://nebula.aneslaidaoui06.workers.dev",
  testMode: true,
};
const shop = { id: "sh_" + "a".repeat(32), ownerUid: "verified-owner-uid" };
const verifiedUser = { uid: shop.ownerUid, email: "owner@example.test" };
const checkoutId = "708d1619-d78e-4045-aef6-83c6453a8612";
const responseJson = (data, status = 201) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/vnd.api+json" },
  });

function fixture({ respond, timeoutMs = 1000 } = {}) {
  const calls = [];
  const adapter = createLemonAdapter(config, {
    now: () => fixedNow,
    timeoutMs,
    fetchImpl: async (url, options) => {
      const payload = JSON.parse(options.body);
      calls.push({ url, options, payload });
      const body = {
        data: {
          type: "checkouts",
          id: checkoutId,
          attributes: {
            store_id: 123,
            variant_id: 456,
            test_mode: true,
            expires_at: payload.data.attributes.expires_at,
            url: `https://${config.checkoutHost}/checkout/custom/${checkoutId}?expires=${(fixedNow + 30 * 60000) / 1000}&signature=${"a".repeat(64)}`,
          },
        },
      };
      return respond
        ? respond({ url, options, payload, body })
        : responseJson(body);
    },
  });
  return { adapter, calls };
}

const create = (adapter) => adapter.createCheckout({ verifiedUser, shop });
function webhook(custom, attributes = {}, event = "subscription_created") {
  return {
    meta: {
      event_name: event,
      test_mode: true,
      custom_data: structuredClone(custom),
    },
    data: {
      type: "subscriptions",
      id: "789",
      attributes: {
        store_id: 123,
        variant_id: 456,
        test_mode: true,
        status: "active",
        cancelled: false,
        renews_at: "2026-11-28T12:00:00.000000Z",
        ends_at: null,
        trial_ends_at: null,
        created_at: "2026-10-28T11:00:00.000000Z",
        updated_at: "2026-10-28T12:00:00.000000Z",
        ...attributes,
      },
    },
  };
}
function signed(
  payload,
  {
    raw,
    signature,
    eventName,
    method = "POST",
    contentType = "application/json",
  } = {},
) {
  const bytes = raw ?? JSON.stringify(payload);
  const actual =
    signature === undefined
      ? createHmac("sha256", config.webhookSecret).update(bytes).digest("hex")
      : signature;
  return new Request("https://example.invalid/disconnected-webhook-test", {
    method,
    headers: {
      ...(contentType ? { "Content-Type": contentType } : {}),
      ...(actual === null ? {} : { "X-Signature": actual }),
      ...(eventName ? { "X-Event-Name": eventName } : {}),
    },
    ...(method === "GET" ? {} : { body: bytes }),
  });
}
async function checkoutFixture() {
  const f = fixture(),
    result = await create(f.adapter);
  return {
    ...f,
    result,
    custom: f.calls[0].payload.data.attributes.checkout_data.custom,
    expected: {
      expectedShop: shop,
      expectedCheckoutNonce: result.checkoutNonce,
    },
  };
}

test("checkout uses fixed test store/variant, JSON:API headers, owner-derived signed metadata and approved return origin", async () => {
  const f = fixture(),
    result = await create(f.adapter);
  assert.equal(f.calls.length, 1);
  const { url, options, payload } = f.calls[0],
    attributes = payload.data.attributes;
  assert.equal(url, "https://api.lemonsqueezy.com/v1/checkouts");
  assert.equal(options.method, "POST");
  assert.equal(options.redirect, "error");
  assert.equal(options.headers.Accept, "application/vnd.api+json");
  assert.equal(options.headers["Content-Type"], "application/vnd.api+json");
  assert.equal(options.headers.Authorization, "Bearer " + config.apiKey);
  assert.ok(options.signal instanceof AbortSignal);
  assert.deepEqual(payload.data.relationships, {
    store: { data: { type: "stores", id: "123" } },
    variant: { data: { type: "variants", id: "456" } },
  });
  assert.equal(attributes.test_mode, true);
  assert.equal(attributes.custom_price, undefined);
  assert.equal(
    attributes.product_options.redirect_url,
    config.siteOrigin + "/dashboard/billing?checkout=returned",
  );
  assert.deepEqual(attributes.product_options.enabled_variants, [456]);
  assert.equal(attributes.checkout_data.email, verifiedUser.email);
  const custom = attributes.checkout_data.custom;
  assert.equal(custom.nebula_shop_id, shop.id);
  assert.equal(custom.nebula_owner_uid, verifiedUser.uid);
  assert.equal(custom.nebula_checkout_nonce, result.checkoutNonce);
  assert.match(custom.nebula_binding, /^[a-f0-9]{64}$/);
  assert.equal(result.testMode, true);
  assert.equal(result.checkoutId, checkoutId);
  assert.equal(result.expiresAt, "2026-10-28T12:30:00.000Z");
  assert.ok(!JSON.stringify(result).includes(config.apiKey));
  assert.ok(!JSON.stringify(result).includes(config.webhookSecret));
  await assert.rejects(
    () =>
      f.adapter.createCheckout({
        verifiedUser: { ...verifiedUser, uid: "attacker" },
        shop,
      }),
    { status: 403 },
  );
  await assert.rejects(
    () =>
      f.adapter.createCheckout({
        verifiedUser,
        shop,
        variantId: "999",
        custom: { ownerUid: "attacker" },
      }),
    { status: 403 },
  );
  assert.equal(f.calls.length, 1);
});

test("live mode, unknown server options, redirect origins and checkout host impersonation fail before any request", () => {
  for (const patch of [
    { testMode: false },
    { testMode: "true" },
    { storeId: "not-a-store" },
    { variantId: "0" },
    { checkoutHost: "nebula-test.lemonsqueezy.com.evil.test" },
    { checkoutHost: "https://nebula-test.lemonsqueezy.com" },
    { checkoutHost: "api.lemonsqueezy.com" },
    { checkoutHost: "nebula-test.lemonsqueezy.com:443" },
    { siteOrigin: "https://evil.test" },
    { siteOrigin: "http://nebulastudio.site" },
    { endpoint: "https://evil.test" },
  ])
    assert.throws(() => createLemonAdapter({ ...config, ...patch }), {
      status: 503,
    });
});

test("checkout URL requires exact HTTPS store host and matching custom checkout path; redirects and query injection are rejected", async () => {
  const badUrls = [
    `http://${config.checkoutHost}/checkout/custom/${checkoutId}`,
    `https://${config.checkoutHost}.evil.test/checkout/custom/${checkoutId}`,
    `https://evil.test/checkout/custom/${checkoutId}`,
    `https://user:pass@${config.checkoutHost}/checkout/custom/${checkoutId}`,
    `https://${config.checkoutHost}:444/checkout/custom/${checkoutId}`,
    `https://${config.checkoutHost}/checkout/custom/wrong-id`,
    `https://${config.checkoutHost}/checkout/custom/${checkoutId}#redirect`,
    `https://${config.checkoutHost}/checkout/custom/${checkoutId}?redirect_url=https://evil.test`,
    `https://${config.checkoutHost}/checkout/custom/${checkoutId}?signature=bad`,
    `https://${config.checkoutHost}/checkout/custom/${checkoutId}?expires=1`,
    `https://${config.checkoutHost}/checkout/custom/${checkoutId}?expires=9999999999`,
    `https://${config.checkoutHost}/checkout/custom/${checkoutId}?expires=9999999999&expires=9999999999`,
  ];
  for (const url of badUrls) {
    const f = fixture({
      respond: ({ body }) => {
        body.data.attributes.url = url;
        return responseJson(body);
      },
    });
    await assert.rejects(() => create(f.adapter), { status: 502 }, url);
  }
  const redirected = fixture({
    respond: ({ body }) => {
      const response = responseJson(body);
      Object.defineProperty(response, "redirected", { value: true });
      return response;
    },
  });
  await assert.rejects(() => create(redirected.adapter), { status: 502 });
});

test("unknown checkout variants/modes and malformed responses cannot produce a usable URL", async () => {
  for (const patch of [
    { variant_id: 999 },
    { store_id: 999 },
    { test_mode: false },
    { test_mode: "true" },
    { expires_at: null },
    { expires_at: "2026-12-31T00:00:00Z" },
  ]) {
    const f = fixture({
      respond: ({ body }) => {
        Object.assign(body.data.attributes, patch);
        return responseJson(body);
      },
    });
    await assert.rejects(() => create(f.adapter), { status: 502 });
  }
  for (const respond of [
    () =>
      new Response("not-json", {
        status: 201,
        headers: { "Content-Type": "application/vnd.api+json" },
      }),
    () => new Response("<html>secret upstream details</html>", { status: 201 }),
    () =>
      new Response(JSON.stringify({ data: "x".repeat(65 * 1024) }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    () =>
      responseJson(
        { errors: [{ detail: config.apiKey + config.webhookSecret }] },
        401,
      ),
    () => responseJson({ data: { type: "subscriptions", id: "789" } }),
    () => Response.redirect("https://evil.test", 302),
  ]) {
    const f = fixture({ respond });
    await assert.rejects(
      () => create(f.adapter),
      (error) =>
        error.status === 502 &&
        !error.message.includes(config.apiKey) &&
        !error.message.includes(config.webhookSecret) &&
        !error.message.includes("secret upstream"),
    );
  }
});

test("network failures, rate limits and a network or body read timeout have bounded clean errors", async () => {
  const network = fixture({
    respond: () => {
      throw new Error("Network " + config.apiKey);
    },
  });
  await assert.rejects(
    () => create(network.adapter),
    (error) => error.status === 502 && !error.message.includes(config.apiKey),
  );
  const busy = fixture({
    respond: () => new Response(config.apiKey, { status: 429 }),
  });
  await assert.rejects(() => create(busy.adapter), { status: 503 });
  const timed = fixture({
    timeoutMs: 15,
    respond: () => new Promise(() => {}),
  });
  await assert.rejects(() => create(timed.adapter), { status: 504 });
  const stuckBody = fixture({
    timeoutMs: 15,
    respond: () =>
      new Response(new ReadableStream({ start() {} }), {
        status: 201,
        headers: { "Content-Type": "application/vnd.api+json" },
      }),
  });
  await assert.rejects(() => create(stuckBody.adapter), { status: 504 });
});

test("verified subscription payloads normalize IDs, status, cancellation and period fields without activating anything", async () => {
  const f = await checkoutFixture(),
    payload = webhook(f.custom);
  const result = await f.adapter.verifyWebhook(
    signed(payload, { eventName: "subscription_created" }),
    f.expected,
  );
  assert.equal(result.provider, "lemon_squeezy");
  assert.equal(result.type, "subscription_created");
  assert.equal(result.subscriptionId, "789");
  assert.match(result.id, /^sha256:[a-f0-9]{64}$/);
  assert.equal(result.idSource, "payload-sha256");
  assert.deepEqual(result.customData, {
    shopId: shop.id,
    ownerUid: shop.ownerUid,
    checkoutNonce: f.result.checkoutNonce,
  });
  assert.equal(result.storeId, "123");
  assert.equal(result.variantId, "456");
  assert.equal(result.testMode, true);
  assert.equal(result.subscriptionStatus, "active");
  assert.equal(result.paidUntil, payload.data.attributes.renews_at);
  assert.deepEqual(result.cancellation, { cancelled: false, endsAt: null });
  assert.equal(result.requiresReconciliation, true);
  assert.equal(result.entitled, undefined);
  assert.equal(result.active, undefined);
  assert.equal(
    (await f.adapter.verifyWebhook(signed(payload), f.expected)).id,
    result.id,
  );
  const cancelled = await f.adapter.verifyWebhook(
    signed(
      webhook(
        f.custom,
        {
          status: "cancelled",
          cancelled: true,
          ends_at: "2026-11-28T12:00:00Z",
        },
        "subscription_cancelled",
      ),
    ),
    f.expected,
  );
  assert.equal(cancelled.cancellation.cancelled, true);
  assert.equal(cancelled.paidUntil, cancelled.endsAt);
  const trial = await f.adapter.verifyWebhook(
    signed(
      webhook(f.custom, {
        status: "on_trial",
        trial_ends_at: "2026-11-04T12:00:00Z",
      }),
    ),
    f.expected,
  );
  assert.equal(trial.paidUntil, null);
  const pastDue = await f.adapter.verifyWebhook(
    signed(webhook(f.custom, { status: "past_due" })),
    f.expected,
  );
  assert.equal(pastDue.paidUntil, null);
});

test("missing, altered or malformed webhook signatures and wrong event headers are rejected", async () => {
  const f = await checkoutFixture(),
    payload = webhook(f.custom),
    raw = JSON.stringify(payload),
    signature = createHmac("sha256", config.webhookSecret)
      .update(raw)
      .digest("hex");
  for (const bad of [null, "", "invalid", "a".repeat(63), "0".repeat(64)])
    await assert.rejects(
      () =>
        f.adapter.verifyWebhook(
          signed(payload, { signature: bad }),
          f.expected,
        ),
      { status: 401 },
    );
  await assert.rejects(
    () =>
      f.adapter.verifyWebhook(
        signed(payload, { raw: raw + " ", signature }),
        f.expected,
      ),
    { status: 401 },
  );
  await assert.rejects(
    () =>
      f.adapter.verifyWebhook(
        signed(payload, { eventName: "subscription_expired" }),
        f.expected,
      ),
    { status: 400 },
  );
  await assert.rejects(
    () =>
      f.adapter.verifyWebhook(
        signed(webhook(f.custom, {}, "subscription_payment_success")),
        f.expected,
      ),
    { status: 422 },
  );
});

test("signed but wrong store, variant, mode, shop, owner, nonce or metadata binding cannot cross tenants", async () => {
  const f = await checkoutFixture();
  for (const patch of [
    { store_id: 999 },
    { variant_id: 999 },
    { store_id: { toString: "spoof" } },
    { test_mode: false },
    { test_mode: "true" },
  ])
    await assert.rejects(
      () =>
        f.adapter.verifyWebhook(signed(webhook(f.custom, patch)), f.expected),
      { status: 403 },
    );
  for (const patch of [
    { nebula_shop_id: "sh_" + "b".repeat(32) },
    { nebula_owner_uid: "attacker" },
    { nebula_checkout_nonce: "b".repeat(36) },
    { nebula_binding: "0".repeat(64) },
    { extra: "unapproved" },
  ])
    await assert.rejects(
      () =>
        f.adapter.verifyWebhook(
          signed(webhook({ ...f.custom, ...patch })),
          f.expected,
        ),
      { status: 403 },
    );
  await assert.rejects(
    () =>
      f.adapter.verifyWebhook(signed(webhook(f.custom)), {
        ...f.expected,
        expectedShop: { ...shop, ownerUid: "different-stored-owner" },
      }),
    { status: 403 },
  );
  await assert.rejects(
    () =>
      f.adapter.verifyWebhook(signed(webhook(f.custom)), {
        expectedShop: shop,
      }),
    { status: 409 },
  );
  const modeMismatch = webhook(f.custom);
  modeMismatch.meta.test_mode = false;
  await assert.rejects(
    () => f.adapter.verifyWebhook(signed(modeMismatch), f.expected),
    { status: 403 },
  );
});

test("webhook raw bytes, resource schemas, status and dates are bounded before a normalized event is returned", async () => {
  const f = await checkoutFixture(),
    payload = webhook(f.custom);
  await assert.rejects(
    () =>
      f.adapter.verifyWebhook(
        signed(payload, { raw: " ".repeat(64 * 1024 + 1) }),
        f.expected,
      ),
    { status: 413 },
  );
  await assert.rejects(
    () =>
      f.adapter.verifyWebhook(signed(payload, { raw: "{invalid" }), f.expected),
    { status: 400 },
  );
  await assert.rejects(
    () =>
      f.adapter.verifyWebhook(signed(payload, { method: "GET" }), f.expected),
    { status: 415 },
  );
  await assert.rejects(
    () =>
      f.adapter.verifyWebhook(
        signed(payload, { contentType: "text/plain" }),
        f.expected,
      ),
    { status: 415 },
  );
  for (const patch of [
    { status: "invented" },
    { cancelled: "false" },
    { status: "cancelled", cancelled: true, ends_at: null },
    { status: "expired", ends_at: null },
    { cancelled: true },
    { updated_at: "2026-02-31T12:00:00Z" },
    { updated_at: "2020-01-01T12:00:00Z" },
    { created_at: null },
  ])
    await assert.rejects(
      () =>
        f.adapter.verifyWebhook(signed(webhook(f.custom, patch)), f.expected),
      { status: 400 },
    );
  const invoice = webhook(f.custom);
  invoice.data.type = "subscription-invoices";
  await assert.rejects(
    () => f.adapter.verifyWebhook(signed(invoice), f.expected),
    { status: 422 },
  );
});
