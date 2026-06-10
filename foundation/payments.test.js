/* payments.test.js — proves the REAL Stripe backend logic using an injected
 * fake stripe client. Same code path runs against the real SDK in production. */
require("./store.config.js");
require("./checkout.js");
const Payments = require("./payments.js");
const assert = require("assert");

let pass = 0;
function ok(label, cond) { assert.ok(cond, "FAIL: " + label); pass++; }

// A fake that records what our real code sends to Stripe.
function makeFakeStripe() {
  const calls = [];
  return {
    calls,
    paymentIntents: {
      create: async (params, opts) => {
        calls.push({ params, opts });
        return { id: "pi_test_123", client_secret: "pi_test_123_secret_abc" };
      }
    }
  };
}

// LESSON 2: integer minor units
ok("$54.43 -> 5443 cents", Payments.toMinorUnits(54.43, "USD") === 5443);
ok("JPY is zero-decimal", Payments.toMinorUnits(1000, "JPY") === 1000);
ok("float-safe (0.1+0.2 style)", Payments.toMinorUnits(0.3, "USD") === 30);

(async () => {
  const stripe = makeFakeStripe();

  // Client sends a MALICIOUS amount; server must ignore it (LESSON 1).
  const res = await Payments.createPaymentIntent(
    { id: "ORD-1", subtotal: 50, method: "standard", state: "NY", amount: 1 },
    { stripe }
  );

  // 50 + 6.99 shipping + 4.44 NY tax = 61.43 -> 6143 cents
  ok("server recomputed amount = 6143", res.amountMinor === 6143);
  ok("client-sent amount was ignored", res.amountMinor !== 1);

  const sent = stripe.calls[0].params;
  ok("Stripe charged the server amount", sent.amount === 6143);
  ok("currency lowercased to 'usd'", sent.currency === "usd");
  // LESSON 3: wallets unlocked in one flag
  ok("automatic_payment_methods enabled", sent.automatic_payment_methods.enabled === true);
  ok("orderId in metadata", sent.metadata.orderId === "ORD-1");
  // LESSON 4: idempotency key prevents double charge
  ok("idempotency key set", stripe.calls[0].opts.idempotencyKey === "pi_ORD-1");
  ok("client_secret returned to browser", res.clientSecret === "pi_test_123_secret_abc");

  // LESSON 5: webhook is the source of truth for order status
  const store = { status: {}, setStatus(id, s) { this.status[id] = s; } };
  const r1 = Payments.handleWebhookEvent(
    { type: "payment_intent.succeeded", data: { object: { metadata: { orderId: "ORD-1" } } } },
    { orders: store }
  );
  ok("succeeded -> order marked paid", r1.status === "paid" && store.status["ORD-1"] === "paid");

  const r2 = Payments.handleWebhookEvent(
    { type: "payment_intent.payment_failed", data: { object: { metadata: { orderId: "ORD-2" } } } },
    { orders: store }
  );
  ok("failed -> stays pending", r2.status === "pending");

  const r3 = Payments.handleWebhookEvent(
    { type: "charge.refunded", data: { object: { metadata: { orderId: "ORD-1" } } } },
    { orders: store }
  );
  ok("refund -> refunded", r3.status === "refunded" && store.status["ORD-1"] === "refunded");

  console.log(`payments.test PASSED — ${pass} assertions (server-recompute, cents, wallets, idempotency, webhook truth).`);
})().catch((e) => { console.error(e); process.exit(1); });
