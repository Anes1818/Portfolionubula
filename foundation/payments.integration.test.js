"use strict";
/*
 * payments.integration.test.js — proves the REAL payment flow with NO Stripe
 * account and NO network. Dependency injection lets us pass a fake Stripe
 * client + a fake orders store, while the code under test is the exact same
 * lib/payments.js that runs in production.
 */
require("../lib/store.config.js");
require("../lib/checkout.js");
require("../lib/orders.js");
require("../lib/payments.js");

const assert = require("assert");
const Payments = globalThis.Payments;
const Checkout = globalThis.Checkout;
let pass = 0;
function ok(c, m) {
	assert.ok(c, m);
	pass++;
}

(async function () {
	// Fake Stripe: records what it was called with, returns a realistic intent.
	let captured = null;
	const fakeStripe = {
		paymentIntents: {
			create: async (params, opts) => {
				captured = { params, opts };
				return { id: "pi_test_123", client_secret: "pi_test_123_secret_abc" };
			},
		},
	};

	// NY order: $50 subtotal, standard shipping. NY tax 8.875%.
	const order = { id: "ORD-1001", subtotal: 50, method: "standard", state: "NY" };
	const out = await Payments.createPaymentIntent(order, { stripe: fakeStripe, Checkout });

	ok(out.clientSecret === "pi_test_123_secret_abc", "returns client secret");
	ok(captured.opts.idempotencyKey === "pi_ORD-1001", "idempotency key derived from order id");
	ok(captured.params.currency === "usd", "currency lowercased for Stripe");
	ok(Number.isInteger(captured.params.amount), "amount is integer minor units (cents)");
	ok(captured.params.automatic_payment_methods.enabled === true, "wallets enabled in one flag");
	ok(captured.params.amount === Math.round(out.summary.total * 100), "charged amount == server total");
	ok(out.summary.total === 61.43, "NY $50 + $6.99 ship + 8.875% tax = $61.43");

	// LESSON 1: a tampered client amount is ignored — server recomputes.
	await Payments.createPaymentIntent(
		{ id: "ORD-2", subtotal: 50, method: "standard", state: "NY", amount: 1 },
		{ stripe: fakeStripe, Checkout }
	);
	ok(captured.params.amount > 1, "ignores client-tampered amount");

	// Free shipping over $99 (OR has 0% tax) -> total == subtotal.
	const free = await Payments.createPaymentIntent(
		{ id: "ORD-3", subtotal: 120, method: "standard", state: "OR" },
		{ stripe: fakeStripe, Checkout }
	);
	ok(free.summary.shipping === 0 && free.summary.total === 120, "free ship + 0% OR tax => $120");

	// Webhook is the source of truth: succeeded -> paid, refunded -> refunded.
	const writes = {};
	const ordersAdapter = { setStatus: (id, s) => { writes[id] = s; } };
	Payments.handleWebhookEvent(
		{ type: "payment_intent.succeeded", data: { object: { metadata: { orderId: "ORD-1001" } } } },
		{ orders: ordersAdapter }
	);
	ok(writes["ORD-1001"] === "paid", "succeeded webhook marks order paid");
	Payments.handleWebhookEvent(
		{ type: "charge.refunded", data: { object: { metadata: { orderId: "ORD-1001" } } } },
		{ orders: ordersAdapter }
	);
	ok(writes["ORD-1001"] === "refunded", "refund webhook marks order refunded");
	Payments.handleWebhookEvent(
		{ type: "payment_intent.payment_failed", data: { object: { metadata: { orderId: "ORD-9" } } } },
		{ orders: ordersAdapter }
	);
	ok(writes["ORD-9"] === "pending", "failed webhook keeps order pending");

	console.log("PAYMENTS INTEGRATION: " + pass + " assertions PASSED");
})().catch((e) => {
	console.error("FAIL:", e);
	process.exit(1);
});
