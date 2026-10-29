/* Server-only subscription integration. Provider setup is closed until valid. */
import { HttpError } from "../rays-payments/security.mjs";
export function billingPublicConfig(env = {}) {
  return {
    sandboxTestAccess:
      env.ENVIRONMENT === "test" && env.SANDBOX_TEST_ACCESS === "true",
    manualActivationEnabled: env.MANUAL_ACTIVATION_ENABLED === "true",
    billingEnabled: false,
    billingEnvironment: "test",
    plans: [
      {
        id: "shop",
        name: "Nebula Shop",
        priceCents: 2900,
        currency: "USD",
        interval: "month",
        available: false,
      },
      {
        id: "domain",
        name: "Own Domain",
        priceCents: 3500,
        currency: "USD",
        interval: "month",
        available: false,
      },
    ],
  };
}
export async function handleBillingInternal(request, { shop } = {}) {
  if (!new URL(request.url).pathname.startsWith("/billing/")) return null;
  if (request.headers.get("X-Owner-Uid") !== shop?.ownerUid)
    throw new HttpError(404, "Shop not found.");
  if (
    request.method === "GET" &&
    new URL(request.url).pathname === "/billing/status"
  )
    return Response.json(
      {
        subscription: shop.subscription,
        billingEnabled: false,
        reason: "provider_setup_pending",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  throw new HttpError(
    503,
    "Subscription setup is still being prepared. No payment was created.",
  );
}
export async function reconcileBillingForAlarm() {
  // Nothing is scheduled or activated until a supported, verified payout route
  // and real provider test acceptance exist. The billing adapter is disconnected.
  return null;
}
export async function handleBillingWebhook() {
  return Response.json(
    { error: "Subscription provider setup is pending." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
