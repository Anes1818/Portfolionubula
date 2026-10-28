const enc = new TextEncoder();
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const requireValue = (ok, message, status = 400) => {
  if (!ok) throw new HttpError(status, message);
};
export function randomToken() {
  return b64(crypto.getRandomValues(new Uint8Array(32)));
}
export function b64(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
export function unb64(s) {
  requireValue(
    typeof s === "string" && /^[A-Za-z0-9_-]+$/.test(s),
    "Invalid token",
  );
  return Uint8Array.from(
    atob(s.replaceAll("-", "+").replaceAll("_", "/")),
    (c) => c.charCodeAt(0),
  );
}
export async function hash(s) {
  return b64(
    new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s))),
  );
}
export async function encrypt(value, secret, context) {
  const key = await crypto.subtle.importKey(
      "raw",
      unb64(secret),
      "AES-GCM",
      false,
      ["encrypt"],
    ),
    iv = crypto.getRandomValues(new Uint8Array(12));
  return {
    iv: b64(iv),
    data: b64(
      new Uint8Array(
        await crypto.subtle.encrypt(
          { name: "AES-GCM", iv, additionalData: enc.encode(context) },
          key,
          enc.encode(JSON.stringify(value)),
        ),
      ),
    ),
  };
}
export async function decrypt(value, secret, context) {
  const key = await crypto.subtle.importKey(
    "raw",
    unb64(secret),
    "AES-GCM",
    false,
    ["decrypt"],
  );
  return JSON.parse(
    new TextDecoder().decode(
      await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: unb64(value.iv),
          additionalData: enc.encode(context),
        },
        key,
        unb64(value.data),
      ),
    ),
  );
}
export async function verifyWebhook(raw, signature, key, url) {
  if (!signature || !key || !url) return false;
  const imported = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  try {
    return await crypto.subtle.verify(
      "HMAC",
      imported,
      Uint8Array.from(atob(signature), (c) => c.charCodeAt(0)),
      enc.encode(url + raw),
    );
  } catch {
    return false;
  }
}
const jwksCache = new Map();
export async function verifyFirebase(
  token,
  project,
  fetchImpl = fetch,
  now = Date.now(),
) {
  try {
    requireValue(
      typeof token === "string" && token.length < 10000 && project,
      "Sign in is required.",
      401,
    );
    const [h, p, s, ...rest] = token.split(".");
    requireValue(!rest.length && h && p && s, "Sign in again.", 401);
    const header = JSON.parse(new TextDecoder().decode(unb64(h))),
      claims = JSON.parse(new TextDecoder().decode(unb64(p))),
      time = Math.floor(now / 1000);
    requireValue(
      header.alg === "RS256" &&
        typeof header.kid === "string" &&
        claims.aud === project &&
        claims.iss === "https://securetoken.google.com/" + project &&
        typeof claims.sub === "string" &&
        claims.sub.length > 0 &&
        claims.sub.length <= 128 &&
        Number.isFinite(claims.exp) &&
        claims.exp > time &&
        Number.isFinite(claims.iat) &&
        claims.iat <= time + 30 &&
        Number.isFinite(claims.auth_time) &&
        claims.auth_time <= time + 30 &&
        claims.email_verified === true &&
        typeof claims.email === "string",
      "Verify your email and sign in again.",
      401,
    );
    let keys = jwksCache.get(project);
    if (
      keys &&
      keys.until >= now &&
      !keys.keys.some((k) => k.kid === header.kid) &&
      keys.lastFetch > now - 60000
    )
      throw new HttpError(401, "Sign in again.");
    if (
      !keys ||
      keys.until < now ||
      !keys.keys.some((k) => k.kid === header.kid)
    ) {
      const response = await fetchImpl(
        "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
        { signal: AbortSignal.timeout(8000) },
      );
      requireValue(
        response.ok,
        "Sign-in verification is temporarily unavailable.",
        503,
      );
      const data = await response.json();
      keys = { keys: data.keys, until: now + 3600000, lastFetch: now };
      requireValue(
        Array.isArray(keys.keys),
        "Sign-in verification unavailable.",
        503,
      );
      jwksCache.set(project, keys);
    }
    const jwk = keys.keys.find((k) => k.kid === header.kid);
    requireValue(jwk, "Sign in again.", 401);
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    requireValue(
      await crypto.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        key,
        unb64(s),
        enc.encode(h + "." + p),
      ),
      "Sign in again.",
      401,
    );
    return {
      uid: claims.sub,
      email: claims.email.toLowerCase(),
      authTime: claims.auth_time,
    };
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(401, "Sign in again.");
  }
}
export async function readJson(request, limit = 60000) {
  requireValue(
    request.headers.get("content-type")?.startsWith("application/json"),
    "JSON is required.",
    415,
  );
  const reader = request.body?.getReader();
  requireValue(reader, "A request body is required.");
  let length = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > limit) {
      await reader.cancel();
      throw new HttpError(413, "Request is too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}
