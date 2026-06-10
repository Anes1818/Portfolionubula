/*
 * functions.stripe.example.js — how payments.js plugs into YOUR Firebase stack.
 * -----------------------------------------------------------------------------
 * This is the real production wiring. payments.js stays pure/testable; this
 * file is the thin "adapter" that gives it the real Stripe SDK, Firestore, and
 * HTTP. Deploy with the Firebase CLI:  firebase deploy --only functions
 *
 * Prereqs (one-time):
 *   npm i stripe firebase-admin firebase-functions
 *   firebase functions:config:set stripe.secret="sk_test_..." stripe.whsec="whsec_..."
 */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Payments = require("./payments.js");
require("./store.config.js");   // populates globalThis.StoreConfig
require("./checkout.js");       // populates globalThis.Checkout (server-side recompute)

admin.initializeApp();
const db = admin.firestore();
const stripe = require("stripe")(functions.config().stripe.secret);

// Firestore-backed order store implementing the { setStatus } interface
// payments.js expects. This is the ONLY place that knows about Firestore.
const orders = {
  async setStatus(orderId, status) {
    if (!orderId) return;
    await db.collection("orders").doc(orderId).set(
      { status, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
  }
};

// 1) Frontend calls this to start payment. Body carries the CART only — never a
//    trusted amount. payments.js recomputes the real total server-side.
exports.createPaymentIntent = functions.https.onCall(async (data) => {
  const order = {
    id: data.orderId,
    subtotal: data.subtotal,   // re-derive from cart in a hardened build
    method: data.method,
    state: data.state
  };
  const { clientSecret, amountMinor, currency } =
    await Payments.createPaymentIntent(order, { stripe });
  return { clientSecret, amountMinor, currency }; // publishable, intent-scoped
});

// 2) Stripe -> us. Verify the signature so nobody can forge a "paid" event,
//    then let payments.js decide the status transition. Source of truth.
exports.stripeWebhook = functions.https.onRequest((req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      req.headers["stripe-signature"],
      functions.config().stripe.whsec
    );
  } catch (err) {
    return res.status(400).send(`Webhook signature failed: ${err.message}`);
  }
  Promise.resolve(Payments.handleWebhookEvent(event, { orders }))
    .then(() => res.json({ received: true }))
    .catch((e) => res.status(500).send(e.message));
});
