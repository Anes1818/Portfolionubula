/*
 * stripe-checkout.js — front-end Stripe Payment Element integration
 * -----------------------------------------------------------------
 * This is the BROWSER half of the payment. It never sees your secret key and
 * never touches a raw card number — Stripe.js renders the card fields inside a
 * secure iframe (that is what keeps you in the lightest PCI tier, SAQ A).
 *
 * Flow:
 *   1. POST the cart to your createPaymentIntent function -> get a clientSecret.
 *   2. Mount the Payment Element (cards + Apple Pay + Google Pay automatically).
 *   3. confirmPayment() -> Stripe handles 3-D Secure, then redirects to
 *      return_url. The WEBHOOK (server) is what actually marks the order paid.
 *
 * SETUP: add <script src="https://js.stripe.com/v3/"></script> to the page,
 * then a container like <div id="payment-element"></div>, paste your TEST
 * publishable key below, and set CREATE_INTENT_URL to your deployed function.
 */
(function (root) {
	"use strict";

	// Publishable key is PUBLIC by design (pk_test_...). Safe to ship.
	var PUBLISHABLE_KEY = "pk_test_REPLACE_ME";
	// Your deployed Cloud Function URL (Firebase prints it after `deploy`):
	var CREATE_INTENT_URL =
		"https://us-central1-robuste-c8e0f.cloudfunctions.net/createPaymentIntent";

	var stripe = null;
	var elements = null;

	// Build the order payload the backend expects. The backend RECOMPUTES the
	// amount from this — we send the cart facts, not a trusted total.
	function buildOrderPayload(cart, form) {
		return {
			id: "ORD-" + Date.now(),
			subtotal: cart.subtotal,
			method: form.method, // 'standard' | 'express'
			state: form.state, // destination US state code
			items: cart.items,
			customer: { name: form.fullName, email: form.email, phone: form.phone },
			shipping: form.shipping || null,
		};
	}

	async function mountPaymentElement(orderPayload, mountSelector) {
		if (!root.Stripe) {
			throw new Error(
				"Stripe.js not loaded. Add <script src='https://js.stripe.com/v3/'></script>"
			);
		}
		stripe = root.Stripe(PUBLISHABLE_KEY);

		var res = await fetch(CREATE_INTENT_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(orderPayload),
		});
		var data = await res.json();
		if (!data.clientSecret) throw new Error(data.error || "No client secret returned");

		elements = stripe.elements({ clientSecret: data.clientSecret });
		var paymentElement = elements.create("payment");
		paymentElement.mount(mountSelector);
		return data.summary; // authoritative totals to display
	}

	async function confirmPayment(returnUrl) {
		if (!stripe || !elements) throw new Error("Call mountPaymentElement first.");
		var result = await stripe.confirmPayment({
			elements: elements,
			confirmParams: { return_url: returnUrl },
		});
		// If we get here without a redirect, something failed (e.g. card declined).
		if (result.error) return { ok: false, error: result.error.message };
		return { ok: true };
	}

	root.StripeCheckout = {
		buildOrderPayload: buildOrderPayload,
		mountPaymentElement: mountPaymentElement,
		confirmPayment: confirmPayment,
	};
})(typeof window !== "undefined" ? window : globalThis);
