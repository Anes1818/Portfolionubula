/* Native Workers regression: synthetic challenges only; no real CAPTCHA or provider calls. */
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { build } = require("esbuild");
const {
  Miniflare,
  Response: MFResponse,
  convertV4MiniflareOptions,
} = require("miniflare");
(async () => {
  const root = path.resolve(__dirname, "../..");
  const dir = fs.mkdtempSync(
    path.join(root, ".private/qa/platform/human-native-"),
  );
  const source = path.join(dir, "entry.mjs"),
    bundle = path.join(dir, "worker.mjs");
  const modulePath = path
    .join(root, "cloudflare/platform/human-check.mjs")
    .replaceAll("\\", "/");
  fs.writeFileSync(
    source,
    `import {verifyHumanRequest,hasHumanProof} from ${JSON.stringify(modulePath)};
 export default {async fetch(request,env){try{
 if(new URL(request.url).pathname==='/proof') return Response.json({verified:await hasHumanProof(request,env)});
 return await verifyHumanRequest(request,env);
 }catch(error){return Response.json({error:error.message},{status:error.status||500});}}};`,
  );
  await build({
    entryPoints: [source],
    outfile: bundle,
    bundle: true,
    format: "esm",
    platform: "browser",
    logLevel: "silent",
  });
  let outbound = 0;
  const options = {
    name: "human-check-native",
    scriptPath: bundle,
    modules: true,
    compatibilityDate: "2026-10-01",
    bindings: {
      TURNSTILE_ENABLED: "true",
      TURNSTILE_SITE_KEY: "local-sitekey",
      TURNSTILE_SECRET_KEY: "local-provider-secret",
      HUMAN_PROOF_SECRET: "local-independent-proof-key",
    },
    outboundService: async (request) => {
      outbound++;
      assert.equal(
        request.url,
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      );
      const data = await request.json();
      assert.equal(data.secret, "local-provider-secret");
      assert.equal(data.response, "synthetic-local-challenge");
      return new MFResponse(
        JSON.stringify({
          success: true,
          hostname: "app.example.test",
          action: "nebula_access",
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    },
  };
  const opts = convertV4MiniflareOptions
    ? await convertV4MiniflareOptions(options)
    : options;
  if (convertV4MiniflareOptions)
    opts.resourcePersistencePath = path.join(dir, "state");
  const mf = new Miniflare(opts);
  try {
    const r = await mf.dispatchFetch(
      "https://app.example.test/api/human-check",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "synthetic-local-challenge" }),
      },
    );
    assert.equal(r.status, 200, await r.clone().text());
    assert.equal(outbound, 1, "Native runtime must reach Siteverify");
    const proof = r.headers.get("Set-Cookie").split(";")[0];
    const checked = await mf.dispatchFetch("https://app.example.test/proof", {
      headers: { Cookie: proof },
    });
    assert.equal((await checked.json()).verified, true);
    console.log(
      "PASS native workerd Siteverify fetch and signed cookie. Synthetic outbound fixture only; no live CAPTCHA attempted.",
    );
  } finally {
    await mf.dispose();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
