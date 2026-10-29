# Nebula v4: manual activation and merchant checkout

## Delivered software

- Free shop configuration and owner preview. One shared app resolves shop slugs from SQLite; it does not create GitHub directories for merchants.
- Owner activation/renewal request saved in the admin directory. Commercial PayPal invoices are arranged outside the app; there is no PayPal API integration or automatic subscription debit.
- Platform admin can record a personally verified USD 29 payment and grant 30 days, extend from the current paid-through date, or suspend access. Fresh admin authentication, optimistic revisions, immutable audit history, operation idempotency and global PayPal-reference uniqueness protect changes. A timed-out request is retried with the same operation ID/reference. A reserved reference is never silently released to a different shop after an unknown outcome; an unresolved conflicting reservation needs operator review.
- Access expiry is checked on public requests in the server. A scheduled job is not required to close new access. Drafts, historical orders and owner access are retained. Activation does not publish an unfinished draft or mark a bouquet paid.
- Explicit merchant approval of exact prices, pickup/delivery, tax rate, delivery fee and fulfillment/refund terms. Missing tax/fees stay unset; enabled checkout requires explicit values. Tax is calculated on items plus delivery, rounded to the nearest cent. A 50% deposit rounds up to the cent. Cash/banknote designs and declared cash products cannot use online checkout pending provider eligibility review; they remain available for enquiries.
- A server-priced immutable order is made from the saved customer request, with design/product snapshot, policy/publication version, final tax/delivery total, customer, terms and expiry. A private 256-bit customer token is stored only as a server hash. The receipt uses a URL fragment/local recovery storage; no bearer token is placed in API paths, queries or provider redirects.
- Merchant-specific Square Hosted Checkout for deposit/full/balance, reusing the existing Ray service's reconciliation and retry logic through a platform adapter. Ray's own source and deployment are unchanged. The adapter supports USD/CAD and the tenant's own selected location/merchant.
- Checkout intent/idempotency key is stored before the provider call. A lost provider response is recovered with that same key. A pending link cannot be silently replaced by a different payment choice. Cancellation reconciles before and after deletion to catch races. Customer design changes create a separate reviewed order; an existing order is immutable and must be cancelled before being replaced.
- Signed Square webhooks route by environment/merchant, fetch authoritative payment/refund records with that merchant's credentials, verify location/currency/amount and never mark return URLs paid. Duplicate events and out-of-order payment/refund signals do not add the same money twice. Refunds or mismatches stop further checkout for review. The first version issues refunds through Square Dashboard.
- Owners see final total, paid, refunded and outstanding amounts separately from fulfillment status. Private receipt recovery works after plan expiry. New charges stop when access/checkout is disabled. Existing provider links may still settle; reconciliation continues so an expiry cannot erase or conceal a payment.
- Square credentials remain encrypted in the tenant's SQLite object. Sandbox and production use distinct keys, cookie names, registry partitions, API hosts and protected settings. Live mode requires explicit server launch approval in addition to production credentials and feature gates.

## Environments and release

The main app configuration enables free signup, manual activation and publication for manually entitled shops. Automatic billing, Square connection and customer card checkout remain disabled. No production Square secret has been configured or payment accepted by this work.

`cloudflare/platform/wrangler.sandbox.jsonc` prepares a **separate**, invited test Worker and separate Durable Object namespaces. It was deployed on 29 October 2026 after the user created the Square Sandbox seller. It uses the same Firebase identity project but separate shop, media, token and ledger storage. An administrator can grant seven days of clearly labelled sandbox test access without recording a fictitious PayPal payment. That action is rejected in the main app. No production approval is granted by this config.

## Next human setup: real Square Sandbox acceptance

1. Sign in to the [Square Developer Dashboard](https://developer.squareup.com/apps) and create an application called **Nebula** using truthful account information. If onboarding does not offer an eligible developer setup, stop there and ask Square support; do not enter a fictitious residency.
2. Select **Sandbox**, then create a Sandbox test seller for Canada/CAD (and later US/USD for the second market). This is a simulated seller, not Ray's real merchant connection.
3. The isolated test app uses `https://sandbox.nebulastudio.site`; its personal `workers.dev` hostname is disabled. Add `sandbox.nebulastudio.site` in Firebase Authentication → Settings → Authorized domains. Authorizing the apex domain or `app.nebulastudio.site` does not authorize this separate hostname.
4. Register this Sandbox OAuth redirect URL exactly:
   `https://sandbox.nebulastudio.site/api/square/callback`
5. Add Sandbox webhook subscription URL:
   `https://sandbox.nebulastudio.site/api/square/webhook`
   Subscribe to `payment.created`, `payment.updated`, `refund.created`, `refund.updated`, and `oauth.authorization.revoked`.
6. Enter these as **secrets on the isolated sandbox Worker**, never in chat, client JavaScript or Git:
   `SQUARE_SANDBOX_APPLICATION_ID`, `SQUARE_SANDBOX_APPLICATION_SECRET`, `SQUARE_SANDBOX_WEBHOOK_SIGNATURE_KEY`, `SQUARE_TOKEN_ENCRYPTION_KEY` (32 cryptographically random bytes encoded as base64url, 43 characters). Retain the encryption key securely; replacing it makes existing ciphertext unreadable without migration.
7. Sign in to the isolated test app, create a test shop, grant sandbox access through the admin controls, set real test prices/terms, publish the test snapshot, connect the Square Sandbox seller and select its matching location.
8. Exercise deposit, full, balance, declined payment, repeat click, browser return/recovery, signature rejection, delayed/duplicate events, cancellation races, partial/full refund, connection revocation, expiry, price changes and API failures. Use only Square's official test payment data. Check the provider logs and stored ledger; a simulated local test alone is insufficient acceptance.
9. Record acceptance evidence before configuring production. Production requires a genuinely eligible florist's own Square account, approved prices/fulfillment/tax/refund rules, separate production credentials and webhook signature key, and explicit launch approval. Square's eligibility for cash-containing products and Nebula's own PayPal receiving/withdrawal setup are independent checks, not solved by code.

The scoped Square feature gates can disable new charges without deleting the builder or payment evidence. Keep server credentials available for reconciliation/revocation while pausing new checkout. Do not change a Square location once it has order history, and cancel pending links before disconnecting.

## Validation

102 Node tests pass across the new platform and the existing Ray payment tests; 21 shared recipe/price parity cases also pass. Local verification uses fake identities/provider responses and real local SQLite/workerd. It does not send email, debit a customer, activate a real florist or authorize a real Square account. Node tests cover manual approval/isolation/idempotency, published designs, cents/rounding, USD/CAD deposit/balance/refunds, private receipt access, lost-response retries, invalid signatures, foreign merchant events and price changes. Browser tests exercise manual admin controls, merchant rules and the actual storefront-to-checkout/receipt pages. Existing shared engine identity/parity and request UI regressions remain required.

Free Cloudflare quotas are finite. Per-store financial orders are capped at 1,000 until a retention/archival policy is deliberately implemented; no ledger evidence is silently deleted to make room. Background reconciliation pages ten orders at a time. This is not an unlimited or zero-fee payment service.

## Deployment record · 29 October 2026

Main app Worker version: `47db8b0f-86a8-491b-bb5a-4c3c43ce5b66`. Read-only live smoke passed after upload, including Firebase SDK boot, open signup copy, private routes/source exclusion, absent Square checkout and unauthorised receipt handling. No real user/shop/payment was created by live verification.

Isolated test Worker initial source version: `d6f14ecd-50d0-413c-aa3d-e9e9cb28e32c`. Its two SQLite namespaces are separate from the main app. The test hostname is now configured as `https://sandbox.nebulastudio.site`. All four required secret names are present; the credential values and real Sandbox acceptance still need validation through OAuth and payment tests. Existing secrets and SQLite storage are retained when the hostname changes. The encryption secret has an ignored local private backup; its value is not recorded here. Update the existing Square Sandbox OAuth redirect and webhook subscription to the branded URLs above before testing; the signature check requires the exact registered webhook URL. If Square changes the signature key on subscription replacement, update the Worker secret privately.

Branded Sandbox deployment: `1399b9e8-1c8c-4a51-8f80-15a992958d29` on 29 October 2026. Cloudflare attached `sandbox.nebulastudio.site` as a Custom Domain and disabled this test Worker's `workers.dev` endpoint. The branded login responds with HTTP 200. Firebase authorized domains and Square's registered callback/subscription settings must also be updated; a successful page response does not establish authentication or payment acceptance.
