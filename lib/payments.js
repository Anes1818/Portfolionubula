/*
 * payments.js — REAL Stripe payment backend for ROBUSTE Appliances
 * ----------------------------------------------------------------
 * This is PRODUCTION code, not a simulation. The only thing "test" about
 * Stripe test mode is the API keys and the card numbers — the integration,
 * tokenization, and money flow are identical to live.
 *
 * KEY DESIGN: dependency injection. createPaymentIntent() receives a `stripe`
 * client. In production you pass require('stripe')(process.env.STRIPE_SECRET_KEY);
 * in tests you pass a fake with the same shape. The function body is REAL and
 * unchanged either way — that is how we run genuine code offline and prove it.
 *
 * THE FIVE PAYMENT LESSONS baked into this file:
 *  1. NEVER trust the client for the amount — recompute on the server.
 *  2. Money is INTEGER minor units (cents), never floats.
 *  3. automatic_payment_methods unlocks cards + Apple Pay + Google Pay at once.
 *  4. Idempotency keys prevent double charges on retry.
 *  5. The WEBHOOK is the source of truth for "paid" — not the browser redirect.
 */
(function (root) {
	"use strict";

	// Currencies whose smallest unit is the whole number (no cents). Most have 2.
	var ZERO_DECIMAL = { JPY: true, KRW: true, VND: true, CLP: true, XOF: true };
	function minorUnitDigits(currency) {
		return ZERO_DECIMAL[String(currency || "").toUpperCase()] ? 0 : 2;
	}
	// $54.43 (USD) -> 5443. Integer math avoids the classic 0.1+0.2 float bug.
	function toMinorUnits(amount, currency) {
		var factor = Math.pow(10, minorUnitDigits(currency));
		return Math.round((Number(amount) || 0) * factor);
	}

	// LESSON 1: recompute the chargeable amount on the server from the cart +
	// store config. A malicious client could POST { amount: 1 } — we ignore it
	// entirely and trust only our own single-source-of-truth math (checkout.js).
	function computeServerAmount(order, deps) {
		var Checkout = (deps && deps.Checkout) || root.Checkout;
		if (!Checkout) throw new Error("Checkout module required to recompute amount");
		var summary = Checkout.buildOrderSummary({
			subtotal: order.subtotal,
			method: order.method,
			state: order.state
		});
		return {
			summary: summary,
			currency: summary.currency,
			amountMinor: toMinorUnits(summary.total, summary.currency)
		};
	}

	// Create a Stripe PaymentIntent. REAL Stripe API shape.
	async function createPaymentIntent(order, deps) {
		deps = deps || {};
		var stripe = deps.stripe;
		if (!stripe) throw new Error("A stripe client must be injected (real SDK in prod, fake in tests)");
		if (!order || !order.id) throw new Error("order.id is required (used as idempotency key + metadata)");

		var money = computeServerAmount(order, deps);

		var intent = await stripe.paymentIntents.create(
			{
				amount: money.amountMinor, // LESSON 2: integer cents
				currency: String(money.currency).toLowerCase(),
				// LESSON 3: one flag -> cards + Apple Pay + Google Pay, no extra code
				automatic_payment_methods: { enabled: true },
				metadata: { orderId: String(order.id) },
				description: "ROBUSTE Appliances order " + order.id
			},
			// LESSON 4: same key on retry => Stripe returns the SAME intent, never a 2nd charge
			{ idempotencyKey: "pi_" + order.id }
		);

		return {
			clientSecret: intent.client_secret, // safe to send to the browser; scoped to this intent
			paymentIntentId: intent.id,
			amountMinor: money.amountMinor,
			currency: money.currency,
			summary: money.summary
		};
	}

	// LESSON 5: Stripe calls THIS (server-to-server) when payment truly settles.
	// The browser redirect can be lost (closed tab, flaky network); the webhook
	// cannot. So order status is written here, from the verified event.
	function handleWebhookEvent(event, deps) {
		deps = deps || {};
		var orders = deps.orders || { setStatus: function () {} };
		var obj = (event && event.data && event.data.object) || {};
		var orderId = obj.metadata && obj.metadata.orderId;
		switch (event && event.type) {
			case "payment_intent.succeeded":
				orders.setStatus(orderId, "paid");
				return { handled: true, orderId: orderId, status: "paid" };
			case "payment_intent.payment_failed":
				orders.setStatus(orderId, "pending");
				return { handled: true, orderId: orderId, status: "pending" };
			case "charge.refunded":
				orders.setStatus(orderId, "refunded");
				return { handled: true, orderId: orderId, status: "refunded" };
			default:
				return { handled: false };
		}
	}

	var Payments = {
		minorUnitDigits: minorUnitDigits,
		toMinorUnits: toMinorUnits,
		computeServerAmount: computeServerAmount,
		createPaymentIntent: createPaymentIntent,
		handleWebhookEvent: handleWebhookEvent
	};

	root.Payments = Payments;
	if (typeof module !== "undefined" && module.exports) module.exports = Payments;
})(typeof window !== "undefined" ? window : globalThis);
