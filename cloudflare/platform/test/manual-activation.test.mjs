import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./fixtures.mjs";

const prepared = async () => {
  const f = fixture({
    env: { MANUAL_ACTIVATION_ENABLED: "true", PUBLISHING_ENABLED: "true" },
    verifyIdentity: async (token) => ({
      uid: "uid-" + token,
      email: token + "@example.test",
      authTime: Date.now() / 1000 - (token === "stale" ? 1000 : 0),
    }),
    verifyAdmin: async (u) => ["uid-admin", "uid-stale"].includes(u.uid),
  });
  const { shop } = await f.create();
  return { ...f, shop, path: `/api/admin/shops/${shop.id}/activation` };
};
const parse = async (r, status = 200) => {
  assert.equal(r.status, status, await r.clone().text());
  return r.json();
};
const grant = (revision = 0, reference = "PAYPAL-TEST-001") => ({
  operationId: crypto.randomUUID(),
  revision,
  action: "extend",
  paymentReference: reference,
  amountCents: 2900,
  currency: "USD",
  confirmed: true,
});

test("complimentary activation requires fresh admin and a reason, restores suspended access and never claims a payment", async () => {
  const f = await prepared();
  const suspended = await parse(
    await f.call(f.path, {
      method: "POST",
      token: "admin",
      body: {
        operationId: crypto.randomUUID(),
        revision: 0,
        action: "suspend",
      },
    }),
  );
  assert.equal(suspended.shop.subscription.status, "suspended");
  const body = {
    operationId: crypto.randomUUID(),
    revision: 1,
    action: "grant",
    reason: "Own shop preview test",
  };
  for (const token of ["owner", "other", "stale", null])
    assert.ok(
      [401, 403].includes(
        (await f.call(f.path, { method: "POST", token, body })).status,
      ),
    );
  await parse(
    await f.call(f.path, {
      method: "POST",
      token: "admin",
      body: { ...body, reason: "" },
    }),
    400,
  );
  await parse(
    await f.call(f.path, {
      method: "POST",
      token: "admin",
      body: { ...body, amountCents: 2900 },
    }),
    400,
  );
  const result = await parse(
    await f.call(f.path, { method: "POST", token: "admin", body }),
  );
  assert.equal(result.shop.subscription.status, "active");
  assert.equal(result.shop.subscription.source, "admin_complimentary");
  assert.equal(result.shop.subscription.testEnvironment, false);
  assert.ok(
    Math.abs(result.shop.subscription.paidUntil - Date.now() - 30 * 86400000) <
      1000,
  );
  const retry = await parse(
    await f.call(f.path, { method: "POST", token: "admin", body }),
  );
  assert.equal(
    retry.shop.subscription.paidUntil,
    result.shop.subscription.paidUntil,
  );
  const audit = await parse(await f.call(f.path, { token: "admin" }));
  const row = audit.history.find((row) => row.action === "grant");
  assert.equal(row.reason, "Own shop preview test");
  assert.equal(row.paymentReference, undefined);
  assert.equal(row.amountCents, undefined);
  f.env.ENVIRONMENT = "test";
  await parse(
    await f.call(f.path, {
      method: "POST",
      token: "admin",
      body: { ...body, operationId: crypto.randomUUID(), revision: 2 },
    }),
    403,
  );
});

test("manual activation requires fresh server admin, records audit and preserves draft", async () => {
  const f = await prepared(),
    input = grant(),
    before = JSON.stringify(f.shop.draft);
  for (const token of ["owner", "other", null])
    assert.ok(
      [401, 403].includes(
        (await f.call(f.path, { method: "POST", token, body: input })).status,
      ),
    );
  await parse(
    await f.call(f.path, { method: "POST", token: "stale", body: input }),
    401,
  );
  await parse(
    await f.call(f.path, {
      method: "POST",
      token: "admin",
      body: { ...input, confirmed: false },
    }),
    400,
  );
  const { shop } = await parse(
    await f.call(f.path, { method: "POST", token: "admin", body: input }),
  );
  assert.equal(shop.subscription.status, "active");
  assert.equal(shop.subscription.source, "manual_paypal");
  assert.equal(shop.subscription.revision, 1);
  assert.equal(JSON.stringify(shop.draft), before);
  assert.ok(
    Math.abs(shop.subscription.paidUntil - Date.now() - 30 * 86400000) < 1000,
  );
  const audit = await parse(await f.call(f.path, { token: "admin" }));
  assert.equal(audit.history.length, 1);
  assert.equal(audit.history[0].actor, "uid-admin");
  assert.equal(audit.history[0].fingerprint, undefined);
});

test("same activation retry is idempotent, reused references are globally rejected, renewal keeps days", async () => {
  const f = await prepared(),
    input = grant();
  const first = await parse(
    await f.call(f.path, { method: "POST", token: "admin", body: input }),
  );
  const retry = await parse(
    await f.call(f.path, { method: "POST", token: "admin", body: input }),
  );
  assert.equal(
    retry.shop.subscription.paidUntil,
    first.shop.subscription.paidUntil,
  );
  const other = (await f.create("Other", "other-flowers", "other")).shop;
  await parse(
    await f.call(`/api/admin/shops/${other.id}/activation`, {
      method: "POST",
      token: "admin",
      body: grant(),
    }),
    409,
  );
  await parse(
    await f.call(f.path, {
      method: "POST",
      token: "admin",
      body: grant(0, "PAYPAL-TEST-002"),
    }),
    409,
  );
  const next = await parse(
    await f.call(f.path, {
      method: "POST",
      token: "admin",
      body: grant(1, "PAYPAL-TEST-002"),
    }),
  );
  assert.equal(
    next.shop.subscription.paidUntil,
    first.shop.subscription.paidUntil + 30 * 86400000,
  );
  const suspended = await parse(
    await f.call(f.path, {
      method: "POST",
      token: "admin",
      body: {
        operationId: crypto.randomUUID(),
        revision: 2,
        action: "suspend",
      },
    }),
  );
  assert.equal(suspended.shop.subscription.status, "suspended");
  const suspendedList = await parse(
    await f.call("/api/admin/users?status=suspended", { token: "admin" }),
  );
  assert.deepEqual(
    suspendedList.users.map((u) => u.shopId),
    [f.shop.id],
  );
  const activeList = await parse(
    await f.call("/api/admin/users?status=active", { token: "admin" }),
  );
  assert.equal(
    activeList.users.some((u) => u.shopId === f.shop.id),
    false,
  );
});

test("activation request is persisted once and appears in the indexed admin directory", async () => {
  const f = await prepared();
  const path = `/api/shops/${f.shop.id}/billing/activation-request`;
  const first = await parse(await f.call(path, { method: "POST", body: {} }));
  const interested = await parse(
    await f.call(path, {
      method: "POST",
      body: { customDomainInterest: true },
    }),
  );
  assert.equal(interested.shop.activationRequest.customDomainInterest, true);
  const second = await parse(await f.call(path, { method: "POST", body: {} }));
  assert.equal(
    first.shop.activationRequest.requestedAt,
    second.shop.activationRequest.requestedAt,
  );
  assert.equal(second.shop.activationRequest.customDomainInterest, true);
  assert.equal(second.shop.summaryRevision, interested.shop.summaryRevision);
  const adminDetails = await parse(await f.call(f.path, { token: "admin" }));
  assert.equal(adminDetails.request.customDomainInterest, true);
  await parse(
    await f.call(path, {
      method: "POST",
      body: { customDomainInterest: "$35" },
    }),
    400,
  );
  const directory = await parse(
    await f.call("/api/admin/users", { token: "admin" }),
  );
  assert.equal(
    directory.users.find((u) => u.uid === "uid-owner").subscriptionStatus,
    "activation_requested",
  );
  const pending = await parse(
    await f.call("/api/admin/users?status=activation_requested", {
      token: "admin",
    }),
  );
  assert.deepEqual(
    pending.users.map((u) => u.shopId),
    [f.shop.id],
  );
  await parse(
    await f.call(path, { method: "POST", token: "other", body: {} }),
    404,
  );
  await parse(
    await f.call(path, { method: "POST", body: { paid: true } }),
    400,
  );
});

test("simulated test access is isolated, labelled and never records a PayPal payment", async () => {
  const f = await prepared(),
    body = { operationId: crypto.randomUUID(), revision: 0, action: "test" };
  await parse(
    await f.call(f.path, { method: "POST", token: "admin", body }),
    403,
  );
  f.env.ENVIRONMENT = "test";
  f.env.SANDBOX_TEST_ACCESS = "true";
  f.env.BILLING_TEST_MODE = "true";
  const result = await parse(
    await f.call(f.path, { method: "POST", token: "admin", body }),
  );
  assert.equal(result.shop.subscription.source, "sandbox_test");
  assert.equal(result.shop.subscription.testEnvironment, true);
  assert.ok(
    Math.abs(result.shop.subscription.paidUntil - Date.now() - 7 * 86400000) <
      1000,
  );
  const audit = await parse(await f.call(f.path, { token: "admin" }));
  assert.equal(audit.history[0].paymentReference, undefined);
  const registry = f.env.REGISTRY.objects.values().next().value.state
    .storage.sql;
  assert.equal(
    [...registry.exec("SELECT * FROM manual_payment_claims")].length,
    0,
  );
});
