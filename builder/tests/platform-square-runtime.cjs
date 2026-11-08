/* Real Workers fetch construction and redirect handling; no external network,
 * real accounts, credentials, or payments. Use cached Wrangler NODE_PATH. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { build } = require("esbuild");
const {
  Miniflare,
  Response: MFResponse,
  convertV4MiniflareOptions,
} = require("miniflare");

(async () => {
  const root = path.resolve(__dirname, "../..");
  const dir = path.join(root, ".private/qa/square-runtime");
  fs.mkdirSync(dir, { recursive: true });
  const source = path.join(dir, "entry.mjs");
  const bundle = path.join(dir, "worker.mjs");
  const service = path
    .join(root, "cloudflare/platform/square-connection.mjs")
    .replaceAll("\\", "/");
  fs.writeFileSync(
    source,
    `import {createSquareConnectionService} from ${JSON.stringify(service)};
  export default {async fetch(request) {
    if (new URL(request.url).pathname === '/probe') {
      try {new Request('https://example.test', {redirect:'error'}); return Response.json({unsupported:false})}
      catch(e){return Response.json({unsupported:e instanceof TypeError})}
    }
    const map=new Map(), shopId='sh_'+'a'.repeat(32), now=Date.now();
    const service=createSquareConnectionService({environment:'sandbox',enabled:true,shopId,
      applicationId:'sandbox-fixture-app',applicationSecret:'fixture-secret',encryptionKey:'A'.repeat(43),
      callbackUrl:'https://test.example/api/square/callback'}, {
      repository:{get:async k=>map.get(k),put:async(k,v)=>map.set(k,v),delete:async k=>map.delete(k),withLock:f=>f()},
      registry:{claim:async()=>{}},getContext:async()=>({shopId,ownerUid:'owner',country:'CA',currency:'CAD',
        subscription:{status:'active',paidUntil:now+86400000}})
    });
    try {
      const start=await service.start({uid:'owner',authTime:now/1000});
      const result=await service.callback({state:new URL(start.authorizationUrl).searchParams.get('state'),
        code:'fixture-code',cookieHeader:start.setCookie.split(';')[0]});
      return Response.json({connected:result.connected,locationId:result.locationId});
    } catch(e){return Response.json({error:e.message},{status:e.status||500})}
  }};`,
  );
  await build({
    entryPoints: [source],
    outfile: bundle,
    bundle: true,
    format: "esm",
    platform: "browser",
    logLevel: "silent",
  });
  let redirect = false;
  const calls = [];
  let options = {
    scriptPath: bundle,
    modules: true,
    compatibilityDate: "2026-10-01",
    outboundService: async (request) => {
      const url = new URL(request.url);
      assert.equal(url.origin, "https://connect.squareupsandbox.com");
      calls.push(url.pathname);
      if (redirect)
        return new MFResponse(null, {
          status: 302,
          headers: { Location: "https://untrusted.example" },
        });
      let data;
      if (url.pathname === "/oauth2/token") {
        assert.equal(request.method, "POST");
        assert.equal((await request.json()).grant_type, "authorization_code");
        data = {
          access_token: "fixture-access",
          refresh_token: "fixture-refresh",
          merchant_id: "fixture-merchant",
          expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        };
      } else {
        assert.equal(url.pathname, "/v2/locations");
        data = {
          locations: [
            {
              id: "fixture-location",
              merchant_id: "fixture-merchant",
              status: "ACTIVE",
              country: "CA",
              currency: "CAD",
              capabilities: ["CREDIT_CARD_PROCESSING"],
            },
          ],
        };
      }
      return new MFResponse(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    },
  };
  if (convertV4MiniflareOptions)
    options = await convertV4MiniflareOptions(options);
  const mf = new Miniflare(options);
  try {
    assert.equal(
      (await (await mf.dispatchFetch("https://local.test/probe")).json())
        .unsupported,
      true,
    );
    const success = await mf.dispatchFetch("https://local.test/connect");
    assert.equal(success.status, 200, await success.clone().text());
    assert.deepEqual(await success.json(), {
      connected: true,
      locationId: "fixture-location",
    });
    assert.deepEqual(calls, ["/oauth2/token", "/v2/locations"]);
    calls.length = 0;
    redirect = true;
    const denied = await mf.dispatchFetch("https://local.test/connect");
    assert.equal(denied.status, 503);
    assert.deepEqual(
      calls,
      ["/oauth2/token"],
      "A redirect must never forward the secret to another host",
    );
    assert.ok(!(await denied.text()).includes("fixture-secret"));
    console.log(
      "PASS real workerd: unsupported error redirect mode reproduced; Square callback succeeds with manual mode; redirects rejected without credential forwarding. All provider responses are simulated.",
    );
  } finally {
    await mf.dispose();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
