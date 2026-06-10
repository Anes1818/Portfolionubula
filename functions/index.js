"use strict";
/*
 * index.js — ROBUSTE Appliances payment backend (Firebase Cloud Functions)
 * ------------------------------------------------------------------------
 * Two endpoints, mapping directly to the two halves of a real card payment:
 *
 *   POST /createPaymentIntent
 *      The browser sends the CART (items + chosen shipping + destination state).
 *      We RECOMPUTE the amount here from store.config.js — never trusting the
 *      client — create a Stripe PaymentIntent, save a `pending` order, and
 *      return only the clientSecret (safe to expose; scoped to this one intent).
 *
 *   POST /stripeWebhook
 *      Stripe calls this server-to-server when the payment truly settles. We
 *      verify the signature, then flip the order to `paid` (or refunded, etc.).
 *      The webhook — not the browser redirect — is the source of truth.
 *
 * SECRETS: STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET live in the function
 * environment (see .env.example), NEVER in client code.
 */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Stripe = require("stripe");

admin.initializeApp();
const db = admin.firestore();

const lib = require("./load-lib.js"); // { Checkout, Payments, Orders, StoreConfig }

const stripe = Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_PLACEHOLDER");
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

function cors(res) {
	res.set("Access-Control-Allow-Origin", "*");
	res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
	res.set("Access-Control-Allow-Headers", "Content-Type");
}

// ---- 1) Create the PaymentIntent (amount recomputed server-side) ----------
exports.createPaymentIntent = functions.https.onRequest(async (req, res) => {
	cors(res);
	if (req.method === "OPTIONS") return res.status(204).send("");
	if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
	try {
		const order = req.body || {};
		if (!order.id) return res.status(400).json({ error: "order.id is required" });

		// REAL lib code. Recomputes amount from cart + config; ignores any
		// client-sent amount. Returns clientSecret + the authoritative summary.
		const result = await lib.Payments.createPaymentIntent(order, {
			stripe,
			Checkout: lib.Checkout,
		});

		// Persist a pending order so the webhook can later flip it to paid.
		await db.collection("orders").doc(String(order.id)).set(
			{
				status: lib.Orders.STATUS.PENDING,
				amountMinor: result.amountMinor,
				currency: result.currency,
				summary: result.summary,
				paymentIntentId: result.paymentIntentId,
				customer: order.customer || null,
				shipping: order.shipping || null,
				items: order.items || null,
				createdAt: admin.firestore.FieldValue.serverTimestamp(),
			},
			{ merge: true }
		);

		return res.json({ clientSecret: result.clientSecret, summary: result.summary });
	} catch (e) {
		console.error("createPaymentIntent failed:", e);
		return res.status(400).json({ error: e.message });
	}
});

// ---- 2) Webhook: the source of truth for "paid" ---------------------------
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
	let event;
	try {
		const sig = req.headers["stripe-signature"];
		// rawBody is required for signature verification; Cloud Functions provides it.
		event = stripe.webhooks.constructEvent(req.rawBody, sig, WEBHOOK_SECRET);
	} catch (e) {
		console.error("Webhook signature verification failed:", e.message);
		return res.status(400).send(`Webhook Error: ${e.message}`);
	}

	// Firestore-backed status writer injected into the REAL handler. We capture
	// the write promise so we can await it before returning 200.
	let write = Promise.resolve();
	const ordersAdapter = {
		setStatus: (orderId, status) => {
			if (!orderId) return;
			write = db.collection("orders").doc(String(orderId)).set(
				{
					status,
					statusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
				},
				{ merge: true }
			);
			return write;
		},
	};

	try {
		const out = lib.Payments.handleWebhookEvent(event, { orders: ordersAdapter });
		await write; // ensure Firestore write committed before acknowledging
		return res.json(out);
	} catch (e) {
		console.error("Webhook handling failed:", e);
		return res.status(500).send("handler error");
	}
});
