# ROBUSTE Payments Backend (Firebase Cloud Functions)

This is the server half of Stripe payments. The browser collects the card via
Stripe.js (in a secure iframe); this backend creates the charge and is the
source of truth for whether an order was paid.

## What's here

| File | Role |
|------|------|
| `index.js` | Two HTTPS functions: `createPaymentIntent` and `stripeWebhook` |
| `load-lib.js` | Loads the shared `lib/` business logic (same code the storefront uses) |
| `lib/` | Deploy-time copy of `../lib` (run `npm run sync-lib`) |
| `.env.example` | The two secrets you must set (copy to `.env`) |

## One-time setup

1. **Stripe account** — sign up at stripe.com, switch on **Test mode** (top-right).
2. **Keys** — Developers → API keys. You get two:
   - **Publishable** (`pk_test_…`) → paste into `../stripe-checkout.js` (it's public).
   - **Secret** (`sk_test_…`) → goes in `.env` here (NEVER in the browser).
3. **Install tooling** (once): `npm install -g firebase-tools && firebase login`.
4. **Init** (once, in project root): `firebase init functions` (pick your existing
   `robuste-c8e0f` project; skip overwriting these files).

## Run it locally (no real money)

```bash
cd functions
npm install
npm run sync-lib          # copies ../lib -> ./lib so it deploys
cp .env.example .env      # then paste your sk_test_ key
npm run serve             # Firebase emulator
```

## Deploy

```bash
npm run deploy            # syncs lib + firebase deploy --only functions
```

Firebase prints your function URLs. Then:

5. **Webhook** — Stripe → Developers → Webhooks → Add endpoint → paste the
   deployed `stripeWebhook` URL. Subscribe to: `payment_intent.succeeded`,
   `payment_intent.payment_failed`, `charge.refunded`. Copy the signing secret
   (`whsec_…`) into `.env` as `STRIPE_WEBHOOK_SECRET` and redeploy.
6. **Frontend** — in `../stripe-checkout.js` set `CREATE_INTENT_URL` to your
   deployed `createPaymentIntent` URL and paste the `pk_test_` key.

## Test the whole flow with a fake card

Use Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP.
Watch the order flip from `pending` → `paid` in Firestore when the webhook fires.

## Why it's built this way (the 5 lessons)

1. **Never trust the client amount** — `createPaymentIntent` recomputes the total
   from `lib/checkout.js` + `store.config.js`. A forged `{ amount: 1 }` is ignored.
2. **Money is integer cents**, never floats (`toMinorUnits`).
3. **One flag** (`automatic_payment_methods`) unlocks cards + Apple Pay + Google Pay.
4. **Idempotency key** (`pi_<orderId>`) means a retry never double-charges.
5. **The webhook is truth** — a closed tab can lose the browser redirect; the
   server-to-server webhook cannot, so order status is written there.

Prove lessons 1–5 run, offline, with no Stripe account:

```bash
node ../foundation/payments.integration.test.js
```
