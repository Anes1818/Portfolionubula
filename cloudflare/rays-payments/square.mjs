import { HttpError, requireValue } from "./security.mjs";
export const scopes = [
  "MERCHANT_PROFILE_READ",
  "ORDERS_READ",
  "ORDERS_WRITE",
  "PAYMENTS_READ",
  "PAYMENTS_WRITE",
];
export const host = (env) =>
  env.ENVIRONMENT === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
export function checkoutUrl(value, env) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (env.ENVIRONMENT === "production"
        ? ["square.link", "checkout.square.site"]
        : ["sandbox.square.link"]
      ).includes(url.hostname) &&
      url.pathname.startsWith("/")
    );
  } catch {
    return false;
  }
}
export async function square(
  env,
  path,
  { token, body, method = "GET", fetchImpl = fetch } = {},
) {
  const headers = {
    "Square-Version": "2026-09-16",
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = "Bearer " + token;
  let response, data;
  try {
    response = await fetchImpl(host(env) + path, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(8000),
    });
    data = await response.json();
  } catch {
    throw new HttpError(
      503,
      "Square is temporarily unavailable. Your order is saved; retry safely.",
    );
  }
  if (!response.ok) {
    if (response.status === 401)
      throw new HttpError(
        409,
        "Square needs reconnecting. No payment was confirmed.",
      );
    throw new HttpError(
      503,
      "Square could not complete this request. Your order is saved.",
    );
  }
  return data;
}
export async function locations(env, token, fetchImpl) {
  const data = await square(env, "/v2/locations", { token, fetchImpl });
  return (data.locations || [])
    .filter(
      (l) =>
        l.status === "ACTIVE" &&
        l.country === "CA" &&
        l.currency === "CAD" &&
        (l.capabilities || []).includes("CREDIT_CARD_PROCESSING"),
    )
    .map((l) => ({ id: l.id, name: l.name, currency: l.currency }));
}
export function validTokens(data) {
  requireValue(
    typeof data.access_token === "string" &&
      typeof data.refresh_token === "string" &&
      typeof data.merchant_id === "string" &&
      Number.isFinite(Date.parse(data.expires_at)),
    "Square did not return a complete account connection.",
    503,
  );
  return data;
}
