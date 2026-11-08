import { requireValue, readJson } from "../rays-payments/security.mjs";
import { object, text } from "./validation.mjs";

export function activationInput(value) {
  object(value, "Activation", [
    "operationId",
    "revision",
    "action",
    "paymentReference",
    "amountCents",
    "currency",
    "confirmed",
    "reason",
  ]);
  requireValue(
    /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(
      value.operationId || "",
    ),
    "A valid operation ID is required.",
  );
  requireValue(
    Number.isSafeInteger(value.revision) && value.revision >= 0,
    "A valid activation revision is required.",
  );
  requireValue(
    ["extend", "suspend", "test", "grant"].includes(value.action),
    "Choose paid activation, complimentary access or suspend.",
  );
  if (value.action === "extend") {
    requireValue(
      value.confirmed === true,
      "Confirm that you verified this commercial payment inside PayPal.",
    );
    requireValue(
      value.currency === "USD" && value.amountCents === 2900,
      "The hosted plan is USD 29 for 30 days.",
    );
    requireValue(
      /^[A-Z0-9-]{8,80}$/.test(value.paymentReference || ""),
      "PayPal reference must contain 8–80 uppercase letters, digits or hyphens. Copy the actual transaction ID from PayPal.",
    );
  } else
    requireValue(
      value.paymentReference === undefined &&
        value.amountCents === undefined &&
        value.currency === undefined &&
        value.confirmed === undefined,
      "Non-payment access changes cannot record payment details.",
    );
  if (value.action === "grant") {
    value.reason = text(value.reason, "Access reason", 200, true);
    requireValue(
      value.reason.length >= 5,
      "Enter an access reason of at least 5 characters.",
    );
  } else
    requireValue(
      value.reason === undefined,
      "An access reason applies only to complimentary access.",
    );
  return value;
}

export async function activationRoutes(store, request) {
  const path = new URL(request.url).pathname,
    shop = store.shop(),
    sql = store.sql;
  if (path === "/billing/activation-request" && request.method === "POST") {
    store.owner(request, shop);
    requireValue(
      store.env.MANUAL_ACTIVATION_ENABLED === "true",
      "Manual activation is not available yet.",
      503,
    );
    const input = await readJson(request, 1024);
    object(input, "Activation request", ["customDomainInterest"]);
    requireValue(
      input.customDomainInterest === undefined ||
        typeof input.customDomainInterest === "boolean",
      "Custom domain interest must be true or false.",
    );
    const current = store.shop();
    const previous = current.activationRequest;
    const pending = previous?.status === "pending";
    const customDomainInterest = input.customDomainInterest === true;
    if (!pending || (customDomainInterest && !previous.customDomainInterest)) {
      const next = {
        ...current,
        activationRequest: {
          ...(pending
            ? previous
            : { status: "pending", requestedAt: Date.now() }),
          ...(customDomainInterest ? { customDomainInterest: true } : {}),
        },
        summaryRevision: (current.summaryRevision || current.version) + 1,
      };
      sql.exec(
        "UPDATE shop SET data=? WHERE singleton=1",
        JSON.stringify(next),
      );
    }
    return Response.json({ shop: store.shop() });
  }
  if (!path.startsWith("/activation")) return null;
  requireValue(
    request.headers.get("X-Platform-Admin") === "verified",
    "Administrator access is required.",
    403,
  );
  if (request.method === "GET")
    return Response.json({
      subscription: shop.subscription,
      request: shop.activationRequest || null,
      history: [
        ...sql.exec(
          "SELECT data FROM activation_history ORDER BY at DESC LIMIT 50",
        ),
      ].map((r) => {
        const { fingerprint, ...safe } = JSON.parse(r.data);
        return safe;
      }),
    });
  requireValue(
    request.method === "POST" && store.env.MANUAL_ACTIVATION_ENABLED === "true",
    "Manual activation is unavailable.",
    503,
  );
  const input = activationInput(await readJson(request, 4096));
  if (input.action === "test")
    requireValue(
      store.env.ENVIRONMENT === "test" &&
        store.env.SANDBOX_TEST_ACCESS === "true",
      "Test access is unavailable in this environment.",
      403,
    );
  if (input.action === "grant")
    requireValue(
      store.env.ENVIRONMENT !== "test" &&
        store.env.BILLING_TEST_MODE !== "true",
      "Use isolated sandbox test access in this environment.",
      403,
    );
  const actor = text(
    request.headers.get("X-Admin-Uid") || "",
    "Administrator",
    128,
    true,
  );
  const operation = async () => {
    const previous = [
      ...sql.exec(
        "SELECT data FROM activation_history WHERE id=?",
        input.operationId,
      ),
    ][0];
    if (previous) {
      requireValue(
        JSON.parse(previous.data).fingerprint === JSON.stringify(input),
        "This operation ID was used for different details.",
        409,
      );
      return Response.json({ shop: store.shop(), duplicate: true });
    }
    let current = store.shop();
    requireValue(
      (current.subscription.revision || 0) === input.revision,
      "Activation changed. Reload before recording another payment.",
      409,
    );
    if (input.action === "extend") {
      const registry = store.env.REGISTRY.get(
        store.env.REGISTRY.idFromName("platform-registry-v1"),
      );
      const response = await registry.fetch(
        new Request("https://internal/manual-payment-claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shopId: shop.id,
            ownerUid: shop.ownerUid,
            operationId: input.operationId,
            reference: input.paymentReference,
            fingerprint: JSON.stringify(input),
          }),
        }),
      );
      const result = await response.json();
      requireValue(
        response.ok,
        result.error || "The payment reference could not be reserved.",
        response.status,
      );
    }
    const at = Date.now();
    // No awaits between reading the revision and the atomic write below.
    current = store.shop();
    requireValue(
      (current.subscription.revision || 0) === input.revision,
      "Activation changed. Reload before retrying.",
      409,
    );
    const base =
      current.subscription.source === "sandbox_test"
        ? at
        : Math.max(at, Number(current.subscription.paidUntil) || at);
    const subscription =
      input.action === "test"
        ? {
            status: "active",
            source: "sandbox_test",
            paidUntil: at + 7 * 86400000,
            testEnvironment: true,
            revision: input.revision + 1,
          }
        : input.action === "extend" || input.action === "grant"
          ? {
              status: "active",
              source:
                input.action === "grant"
                  ? "admin_complimentary"
                  : "manual_paypal",
              paidUntil: base + 30 * 86400000,
              testEnvironment: false,
              revision: input.revision + 1,
            }
          : {
              ...current.subscription,
              status: "suspended",
              revision: input.revision + 1,
            };
    const next = {
      ...current,
      subscription,
      activationRequest: {
        ...current.activationRequest,
        status: input.action === "suspend" ? "suspended" : "resolved",
        updatedAt: at,
      },
      summaryRevision: (current.summaryRevision || current.version) + 1,
    };
    const audit = {
      ...input,
      actor,
      at,
      paidUntil: subscription.paidUntil || null,
      fingerprint: JSON.stringify(input),
    };
    store.state.storage.transactionSync(() => {
      sql.exec(
        "INSERT INTO activation_history(id,at,data) VALUES(?,?,?)",
        input.operationId,
        at,
        JSON.stringify(audit),
      );
      sql.exec(
        "UPDATE shop SET data=? WHERE singleton=1",
        JSON.stringify(next),
      );
    });
    return Response.json({ shop: next });
  };
  const pending = (store.activationQueue || Promise.resolve()).then(operation);
  store.activationQueue = pending.catch(() => {});
  return pending;
}
