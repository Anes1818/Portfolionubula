import test from "node:test";
import assert from "node:assert/strict";
import {
  verifyHumanRequest,
  hasHumanProof,
  humanCheckConfig,
} from "../human-check.mjs";
import { fixture, origin } from "./fixtures.mjs";

const env = {
  TURNSTILE_ENABLED: "true",
  TURNSTILE_SITE_KEY: "public-fixture",
  TURNSTILE_SECRET_KEY: "private-fixture",
  HUMAN_PROOF_SECRET: "independent-signing-fixture",
};
const request = (token = "test-token") =>
  new Request(origin + "/api/human-check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
const provider = async () =>
  Response.json({
    success: true,
    hostname: new URL(origin).hostname,
    action: "nebula_access",
  });

test("Turnstile requires provider approval, expected hostname/action and protected short-lived proof", async () => {
  const response = await verifyHumanRequest(request(), env, provider);
  const cookie = response.headers.get("Set-Cookie");
  assert.match(cookie, /Secure; HttpOnly; SameSite=Strict; Max-Age=1800/);
  const proven = new Request(origin + "/api/session", {
    headers: { Cookie: cookie.split(";")[0] },
  });
  assert.equal(await hasHumanProof(proven, env), true);
  assert.equal(await hasHumanProof(proven, env, Date.now() + 1801000), false);
  assert.equal(
    await hasHumanProof(
      new Request("https://other.test/api/session", {
        headers: proven.headers,
      }),
      env,
    ),
    false,
  );
  assert.equal(
    await hasHumanProof(proven, { ...env, HUMAN_PROOF_SECRET: "different" }),
    false,
  );
  for (const data of [
    { success: false },
    { success: true, hostname: "other.test", action: "nebula_access" },
    { success: true, hostname: new URL(origin).hostname, action: "wrong" },
  ])
    await assert.rejects(
      verifyHumanRequest(request(), env, async () => Response.json(data)),
      { status: 403 },
    );
  await assert.rejects(
    verifyHumanRequest(request(), env, async () => {
      throw Error("offline");
    }),
    { status: 503 },
  );
  await assert.rejects(
    verifyHumanRequest(request("x".repeat(2049)), env, provider),
    { status: 400 },
  );
  assert.equal(
    JSON.stringify(humanCheckConfig(env)).includes("private-fixture"),
    false,
  );
});

test("new-owner registry and shop creation cannot bypass the server challenge; existing owners retain access", async () => {
  const f = fixture();
  const { shop } = await f.create();
  Object.assign(f.env, env);
  assert.equal((await f.call("/api/session")).status, 200);
  const blocked = await f.call("/api/session", { token: "other" });
  assert.equal(blocked.status, 403);
  assert.equal((await blocked.json()).code, "human_verification_required");
  const blockedCreate = await f.create(
    "Other Flowers",
    "other-flowers",
    "other",
  );
  assert.equal(blockedCreate.response.status, 403);
  const proof = (await verifyHumanRequest(request(), env, provider)).headers
    .get("Set-Cookie")
    .split(";")[0];
  const created = await f.call("/api/shops", {
    method: "POST",
    token: "other",
    headers: { Cookie: proof },
    body: {
      name: "Other Flowers",
      slug: "other-flowers",
      currency: "USD",
      preset: "fresh",
    },
  });
  assert.equal(created.status, 201, await created.clone().text());
  assert.notEqual((await created.json()).shop.id, shop.id);
  assert.equal((await f.call("/api/session", { token: "other" })).status, 200);
  const closed = fixture({ env: { TURNSTILE_ENABLED: "true" } });
  assert.equal((await closed.create()).response.status, 403);
});
