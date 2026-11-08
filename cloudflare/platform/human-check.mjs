import {
  HttpError,
  requireValue,
  readJson,
} from "../rays-payments/security.mjs";

const cookieName = "__Host-nebula-human";
const lifetime = 30 * 60;
export const humanCheckEnabled = (env) => env.TURNSTILE_ENABLED === "true";
const configured = (env) =>
  Boolean(
    env.TURNSTILE_SITE_KEY &&
      env.TURNSTILE_SECRET_KEY &&
      env.HUMAN_PROOF_SECRET,
  );
export function humanCheckConfig(env) {
  return {
    enabled: humanCheckEnabled(env),
    siteKey: humanCheckEnabled(env) ? env.TURNSTILE_SITE_KEY || null : null,
  };
}
async function key(env) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.HUMAN_PROOF_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
const hex = (bytes) =>
  [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
export async function hasHumanProof(request, env, now = Date.now()) {
  if (!humanCheckEnabled(env)) return true;
  if (!configured(env)) return false;
  const proof = request.headers
    .get("Cookie")
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(cookieName + "="))
    ?.slice(cookieName.length + 1);
  if (!proof || !/^\d+\.[a-f0-9]{64}$/.test(proof)) return false;
  const [expires, signature] = proof.split(".");
  if (
    Number(expires) <= now / 1000 ||
    Number(expires) > now / 1000 + lifetime + 10
  )
    return false;
  const bytes = new Uint8Array(
    signature.match(/../g).map((v) => parseInt(v, 16)),
  );
  return crypto.subtle.verify(
    "HMAC",
    await key(env),
    bytes,
    new TextEncoder().encode(expires + "|" + new URL(request.url).origin),
  );
}
export async function verifyHumanRequest(request, env, fetcher = fetch) {
  requireValue(
    humanCheckEnabled(env) && configured(env),
    "Human verification is being configured. Please try again later.",
    503,
  );
  const body = await readJson(request, 4096);
  requireValue(
    typeof body.token === "string" &&
      body.token.length > 0 &&
      body.token.length <= 2048,
    "Complete the human verification and try again.",
    400,
  );
  let result;
  try {
    const response = await fetcher(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET_KEY,
          response: body.token,
          remoteip: request.headers.get("CF-Connecting-IP") || undefined,
        }),
        signal: AbortSignal.timeout(10000),
        // workerd only supports follow/manual; error rejects before sending.
        // Reject any redirect response below, without following it with secrets.
        redirect: "manual",
      },
    );
    if (!response.ok) throw Error("provider");
    result = await response.json();
  } catch {
    throw new HttpError(
      503,
      "Human verification is temporarily unavailable. Please try again.",
    );
  }
  requireValue(
    result.success === true &&
      result.hostname === new URL(request.url).hostname &&
      result.action === "nebula_access",
    "Human verification expired or failed. Please try again.",
    403,
  );
  const expires = String(Math.floor(Date.now() / 1000) + lifetime);
  const signature = hex(
    await crypto.subtle.sign(
      "HMAC",
      await key(env),
      new TextEncoder().encode(expires + "|" + new URL(request.url).origin),
    ),
  );
  return new Response(JSON.stringify({ verified: true }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Set-Cookie": `${cookieName}=${expires}.${signature}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${lifetime}`,
    },
  });
}
