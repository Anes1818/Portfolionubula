# Nebula Launch Master Plan & Step-by-Step Checklist

> Historical plan from 30 October. For the verified 1 November deployment, current credential setup and remaining Production acceptance steps, use [PRODUCTION-SQUARE-LAUNCH.md](PRODUCTION-SQUARE-LAUNCH.md). Statements below about deployments, zero secrets and pending Sandbox tests describe the earlier state.

Generated: 30 October 2026

This document maps out **where the platform is right now**, **what is still missing** between the current deployment and real florists collecting real Square payments on `https://app.nebulastudio.site`, and the **exact step-by-step plan** to launch.

---

## 1. Current State Summary (What Already Works)

### Live Environments
1. **Sandbox Testing Environment (`https://sandbox.nebulastudio.site`)**
   - Configured in `cloudflare/platform/wrangler.sandbox.jsonc` (`nebula-payments-sandbox`).
   - Square Sandbox OAuth (`https://app.squareupsandbox.com/oauth2/authorize`), location selection, online order rules, Square Hosted Checkout (`50% deposit`, `full payment`, `remaining balance`), signed webhooks, and private customer receipts (`receipt.html`) are **enabled and deployed**.
   - Invite-only login (`PUBLIC_SIGNUPS: "false"`); 7-day free sandbox activation available in `/admin`.
2. **Main Public Platform (`https://app.nebulastudio.site`)**
   - Configured in `cloudflare/platform/wrangler.jsonc` (`nebula`).
   - Public florist sign-ups (`PUBLIC_SIGNUPS: "true"`), shop creation wizard, Fresh & Satin 3D/2D bouquet studio, 6 customizable collection recipes, 10 fixed products, storefront visual editor, manual PayPal activation (`/admin`), shop publication (`/s/:slug`), and unpaid customer order requests (+ WhatsApp drafts) are **live**.
   - **Important**: On `app.nebulastudio.site`, Square connection and online card checkout are currently **switched OFF** (`CHECKOUT_ENABLED: "false"`, `SQUARE_LIVE_APPROVED: "false"`) until you complete Sandbox verification and add Production Square secrets.

---

## 2. What You Are Missing Right Now (The 5 Gaps)

| # | Gap | Why It Matters | Status |
| :--- | :--- | :--- | :--- |
| **1** | **One real human test pass in Square Sandbox (`sandbox.nebulastudio.site`)** | Automated tests mock Square's servers. You must click through one real Sandbox OAuth + test card payment + webhook on `sandbox.nebulastudio.site` to confirm your Square app settings and webhook URL match. | Ready to execute now (Phase 1 below) |
| **2** | **Production Square credentials & flags on `app.nebulastudio.site`** | `app.nebulastudio.site` currently has `0` Square secrets installed and `CHECKOUT_ENABLED: "false"`. Real florists cannot connect real Square accounts until Production secrets and flags are enabled. | Ready after Phase 1 (Phase 2 below) |
| **3** | **Order notifications when a customer pays online** | Customers on `receipt.html` now have a **"Send order & payment confirmation to florist on WhatsApp ↗"** button that opens a pre-filled WhatsApp message to the florist's number with the order ID, items, delivery address, and live Square payment status (`Paid in full via Square`, `50% deposit paid via Square`, or `Order saved`). | **Completed & Deployed** |
| **4** | **Dedicated delivery address input on checkout requests** | Selecting `Delivery` in the order modal now reveals a required **Delivery address** field (`order-ui.js`), validates and persists it (`worker.mjs`), displays it on `receipt.html` (`receipt.js`) and in the florist's `/dashboard/orders` view (`app.js`), and includes it in the WhatsApp confirmation. | **Completed & Deployed** |
| **5** | **International Square currencies & markets** | Unlocked **US (`USD`)**, **Canada (`CAD`)**, **United Kingdom (`GBP`)**, **Eurozone (`EUR`)**, and **Australia (`AUD`)** across shop creation, brand settings, `/dashboard/payments`, Square OAuth market validation, and checkout link generation. | **Completed & Deployed** |
| **6** | **Your own $29/mo subscription collection workflow** | Automated Lemon Squeezy billing is disabled (`BILLING_ENABLED: "false"`). Florists click **Request activation** in `/dashboard/billing` and message `@nebulaa_studio`; you invoice them $29 USD externally (e.g., PayPal) and activate them in `/admin`. | Manual workflow active (Phase 3) |

---

## 3. Step-by-Step Master Plan

### Phase 1: Complete Your Square Sandbox Test Pass (Today · 20 Minutes)

Do this on **`https://sandbox.nebulastudio.site`** to verify your Square developer configuration end-to-end:

1. **Check Square Developer Console (Sandbox settings)**
   - Open [Square Developer Console](https://developer.squareup.com/apps) -> select your app -> toggle **Sandbox**.
   - Under **OAuth**, verify **Redirect URL** is set to:
     `https://sandbox.nebulastudio.site/api/square/callback`
   - Under **Webhooks -> Subscriptions**, verify a Sandbox webhook points to:
     `https://sandbox.nebulastudio.site/api/square/webhook`
     with these 5 events enabled:
     - `payment.created`
     - `payment.updated`
     - `refund.created`
     - `refund.updated`
     - `oauth.authorization.revoked`
2. **Activate & Publish Your Test Shop**
   - Sign in at `https://sandbox.nebulastudio.site/admin` using your admin email (`anescareer@gmail.com` or `aneslaidaoui06@gmail.com`).
   - Select your shop -> click **Grant 7-day sandbox access**.
   - Click **Florist workspace ↗** -> go to **Plan & Publish** (`/dashboard/billing`) -> click **Review publication readiness** -> click **Publish my shop**.
3. **Connect Square Sandbox Seller**
   - In [Square Developer Console](https://developer.squareup.com/apps), go to **Sandbox test accounts** and click **Square Dashboard** next to your test seller. **Leave that `app.squareupsandbox.com` tab open.**
   - Go to `https://sandbox.nebulastudio.site/dashboard/payments`.
   - Set **Shop currency & Square market** to match that test seller (`CAD · Canada` or `USD · United States`) and save if needed.
   - Click **Connect Square Sandbox ↗** -> click **Allow / Authorize** on Square.
4. **Enable Online Checkout Rules**
   - On `/dashboard/payments`, confirm your **Square location** is selected.
   - In **Your online order rules**, enter:
     - **Tax rate**: e.g. `13` (or `0`)
     - **Delivery fee**: e.g. `15`
     - Check **Offer pickup** and/or **Offer delivery**
     - **Terms**: at least 20 characters (e.g. `"Pickup and delivery by arrangement. 50% deposit required; balance due at delivery."`)
     - Check **I approve the exact catalogue/product prices…**
     - Check **Allow online checkout when Square and the platform are ready**
   - Click **Save checkout rules**. Confirm all 4 items in **Online Square checkout checklist** show `✓`.
5. **Test Customer Deposit, Balance Payment & Webhook**
   - Open your public test storefront: `https://sandbox.nebulastudio.site/s/<your-slug>`
   - Request a product or bouquet -> click **Review final price & payment options**.
   - On `receipt.html`, click **Pay 50% deposit** -> pay on Square Sandbox using Square's test card (`4532 0155 0016 4662`, any future exp, any CVV, postal code `M5V 2T6` for CAD or `94103` for USD).
   - Verify `receipt.html` updates to **`deposit paid`**.
   - Click **Pay remaining balance** -> pay on Square Sandbox -> verify `receipt.html` updates to **`paid`**.

---

### Phase 2: Unlock Live Square Payments on `https://app.nebulastudio.site`

Once Phase 1 passes, turn on real Square payments for your customers on the main platform:

1. **Configure Square Developer Console (Production tab)**
   - In [Square Developer Console](https://developer.squareup.com/apps), switch the top toggle from **Sandbox** to **Production**.
   - Under **OAuth**, set the **Production Redirect URL** to:
     `https://app.nebulastudio.site/api/square/callback`
   - Copy your **Production Application ID** and **Production Application Secret**.
   - Under **Webhooks -> Subscriptions**, add a **Production** endpoint:
     `https://app.nebulastudio.site/api/square/webhook`
     with events: `payment.created`, `payment.updated`, `refund.created`, `refund.updated`, `oauth.authorization.revoked`.
   - Copy the **Production Webhook Signature Key**.
2. **Add Production Secrets to the Main `nebula` Cloudflare Worker**
   Run these 4 commands in PowerShell (paste each secret when prompted):
   ```powershell
   npx wrangler secret put SQUARE_PRODUCTION_APPLICATION_ID --config cloudflare/platform/wrangler.jsonc
   npx wrangler secret put SQUARE_PRODUCTION_APPLICATION_SECRET --config cloudflare/platform/wrangler.jsonc
   npx wrangler secret put SQUARE_PRODUCTION_WEBHOOK_SIGNATURE_KEY --config cloudflare/platform/wrangler.jsonc
   npx wrangler secret put SQUARE_TOKEN_ENCRYPTION_KEY --config cloudflare/platform/wrangler.jsonc
   ```
   *(Generate a fresh 32-byte base64url key for `SQUARE_TOKEN_ENCRYPTION_KEY` via `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` and back it up safely.)*
3. **Enable Production Square Flags in `cloudflare/platform/wrangler.jsonc`**
   Update lines 38–42 of `cloudflare/platform/wrangler.jsonc`:
   ```json
   "CHECKOUT_ENABLED": "true",
   "SQUARE_ENVIRONMENT": "production",
   "SQUARE_SANDBOX_CONNECT_ENABLED": "false",
   "SQUARE_PRODUCTION_CONNECT_ENABLED": "true",
   "SQUARE_LIVE_APPROVED": "true"
   ```
   Then deploy:
   ```powershell
   npx wrangler deploy --config cloudflare/platform/wrangler.jsonc
   ```

---

### Phase 3: Your Florist Onboarding & Subscription Workflow (How You Make Money)

With Phase 2 live, here is the exact repeatable workflow for every florist customer you onboard:

1. **Florist Signs Up & Builds Their Shop (Free)**
   - Send florists to `https://app.nebulastudio.site/login`.
   - They create their account, verify their email, pick their shop name/slug and preset (`Fresh` or `Satin`), upload products/recipes, set prices, and preview their shop privately.
2. **Florist Requests Activation & Pays You $29/mo**
   - In `/dashboard/billing`, the florist clicks **Request activation** and messages `@nebulaa_studio` with their shop ID (`sh_...`).
   - You send them a **$29 USD** invoice (via PayPal or your preferred commercial invoicing method).
   - Once paid, open `https://app.nebulastudio.site/admin`:
     - Filter by **Activation requests**.
     - Select their shop -> enter the PayPal transaction reference -> check confirm -> click **Record USD 29 & grant 30 days**.
3. **Florist Publishes & Connects Their Own Square Account**
   - The florist clicks **Publish my shop** in `/dashboard/billing`.
   - In `/dashboard/payments`, they select their currency (`CAD` or `USD`), click **Connect Square ↗**, sign in to their own Square seller account, choose their location, and save their tax/delivery/terms rules.
   - Their customers now pay deposits or full payments directly into **that florist's Square account**, and Nebula reconciles every order automatically.

---

### Phase 4: Shipped UX & Market Enhancements (Live Now)

1. **WhatsApp Order & Payment Confirmation Button on `receipt.html`** (`platform/public/receipt.js`, `cloudflare/platform/merchant-checkout.mjs`):
   - Customers now see **"Send order & payment confirmation to florist on WhatsApp ↗"** (`#whatsappFlorist`) on `receipt.html` whenever the florist has a phone or WhatsApp number configured. The message automatically reflects the live Square payment status (`Paid in full via Square`, `50% deposit paid via Square`, or `Order saved`).
2. **Dedicated Delivery Address Field in `order-ui.js`** (`platform/public/order-ui.js`, `cloudflare/platform/worker.mjs`, `platform/public/receipt.js`, `platform/public/app.js`):
   - Selecting `Delivery` in the order modal dynamically reveals and requires `<input name="address">`, persists `customer.address` on the order record, shows it on `receipt.html` and in the florist's `/dashboard/orders` detail view, and includes it in the WhatsApp message.
3. **Additional Square Markets (`USD`, `CAD`, `GBP`, `EUR`, `AUD`)** (`cloudflare/platform/validation.mjs`, `cloudflare/platform/square-connection.mjs`, `cloudflare/platform/square-storage.mjs`, `platform/public/app.js`):
   - Florists in the United States (`USD`), Canada (`CAD`), United Kingdom (`GBP`), Eurozone (`EUR`: `IE`, `FR`, `ES`, `DE`, `IT`, `NL`, `BE`, `AT`, `PT`, `FI`, `EU`), and Australia (`AUD`) can select their market currency and connect matching Square locations.
