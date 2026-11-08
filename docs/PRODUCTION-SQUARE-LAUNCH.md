# Square Production launch — updated 2 November 2026

This is the current launch record. Earlier plans describe historical states; they are not proof of a completed production payment.

## Deployed now

- Main app: https://app.nebulastudio.site — Worker `nebula`, version `87845de5-016e-4bff-8523-e8c00787137b` (2 November 2026). This adds [storefront-first owner onboarding](PREVIEW-FIRST-ONBOARDING-2026-11-02.md) on top of [guided setup and fulfillment rules](GUIDED-SHOP-SETUP-2026-11-02.md), retaining [complimentary administrator access](ADMIN-COMPLIMENTARY-ACCESS.md), original logo, Firebase verification UX and the corrected native Workers Turnstile gate; see [registration protection record](TURNSTILE-AND-EMAIL.md).
- Latest simplified workspace, mobile improvements, fresh + satin shops, direct collection Order / Customise, frozen previews, payment recovery and optional WhatsApp/SMS request drafts.
- The existing main registry, shop Durable Objects and migration are retained. Sandbox tenants, merchant tokens and test orders were not copied into main.
- Main selects `SQUARE_ENVIRONMENT=production`. Production connection is now enabled; Sandbox connection and customer card checkout remain disabled. Public shop signup, manual activation and publication remain available. The owner has no real merchant ready to connect yet.
- The personal-name `workers.dev` entry point is disabled; use the Nebula custom domain.
- A fresh `SQUARE_TOKEN_ENCRYPTION_KEY` was installed in the main Worker without displaying or saving plaintext. A recovery copy is encrypted with Windows DPAPI at `.private/secure/nebula-square-token-key.dpapi`, excluded from Git and deployed assets. Recovery requires this Windows user's profile/machine. Preserve it securely; do not replace a key used to encrypt merchant tokens.
- The sender identity is `orders@notify.nebulastudio.site`, with Reply-To `anescareer@gmail.com`. Main merchant email sending is now enabled with its Resend secret installed; the individual merchant still needs verified-email opt-in. No Production email has been sent or delivery verified by this release. A paid mailbox is not required.

## Account tasks

The owner confirmed that this exact Production OAuth redirect was saved:

`https://app.nebulastudio.site/api/square/callback`

In **Square Developer Console → Nebula → Production → Webhooks → Subscriptions**, create a Production subscription:

- Notification URL: `https://app.nebulastudio.site/api/square/webhook`
- Events: `payment.created`, `payment.updated`, `refund.created`, `refund.updated`, `oauth.authorization.revoked`.
- Use the same API version as the application integration, currently `2026-09-16`.

In **Cloudflare → Workers & Pages → nebula → Settings → Variables and Secrets**, save these as **Secret**, never in chat, source files or browser JavaScript:

| Name | Source |
| --- | --- |
| `SQUARE_PRODUCTION_APPLICATION_ID` | Nebula application, Production Application ID |
| `SQUARE_PRODUCTION_APPLICATION_SECRET` | Nebula application, Production OAuth Application secret; not a personal access token |
| `SQUARE_PRODUCTION_WEBHOOK_SIGNATURE_KEY` | The Production webhook subscription's Signature key |
| `RESEND_API_KEY` | Resend Sending API key scoped to verified `notify.nebulastudio.site` |

`SQUARE_TOKEN_ENCRYPTION_KEY` is already provisioned. Keep Sandbox secrets on the separate `nebula-payments-sandbox` Worker. Metadata checks can confirm names exist, but do not prove credentials are valid or a message arrived.

Account setup update: the owner confirmed the Production webhook was created and the four secrets were saved. A read-only Cloudflare metadata check verified all five required names on `nebula`. Secret values were not retrieved. Square credential validity and webhook delivery require the first real merchant acceptance check.

## Controlled enablement

1. Verify the required secret names on Worker `nebula`, Production redirect and webhook settings. Re-run relevant tests after any code changes.
2. Completed: Production connection is deployed with `SQUARE_PRODUCTION_CONNECT_ENABLED=true` and `SQUARE_LIVE_APPROVED=true`. `CHECKOUT_ENABLED=false` remains in force while the first real florist connects. This is application rollout approval, not a claim of Square App Marketplace approval.
3. The florist signs into **their own main-app workspace**, connects their own eligible Square seller via OAuth, and selects the correct location/currency. Never request their password or personal access token. Sandbox authorization does not transfer.
4. The florist approves their actual published catalogue, exact prices, tax, fulfillment fee/methods and terms. Start with pickup if delivery boundaries or dates cannot yet be guaranteed. All permitted builder combinations must price exactly; unpriced/unsupported choices cannot be sold online.
5. Provider configuration completed: `MERCHANT_EMAIL_ENABLED=true` and the Resend secret are deployed. The florist must still opt into payment emails using their verified sign-in email. The Sandbox forced test-recipient setting is absent from main.
6. Enable `CHECKOUT_ENABLED=true` only when the pilot is ready, then use the agreed real merchant/product/amount to make a real pilot purchase. No real purchase has been authorized or performed by this release. Per-shop checkout rules and active subscription/publication remain required after the global flag opens.
7. Verify provider-side payment, signed webhook delivery, saved image/contents, deposit/full/balance arithmetic, customer contact, dashboard status and actual merchant email arrival. Opening a success URL or creating a checkout link is not payment proof.
8. With the pilot merchant's agreement, test a refund in Square and verify the site's recorded refund/balance. Only then describe Production as accepted and open rollout to more merchants.

Each deployment uses `cloudflare/platform/wrangler.jsonc`, preserving Worker name and SQLite bindings. Dashboard secrets survive deployment; tracked nonsecret flags are managed by the config. Keep the original Sandbox test environment available for regression testing.

## Existing behavior and limits

- Server recalculates the design price, freezes the design/media/customer/fulfillment details and creates a Square Hosted Checkout link for the due amount. Full payment, 50% deposit and the remaining balance are supported. Order/link retries reuse saved attempts to avoid duplicate charges.
- Verified Square payment records update the ledger and create one merchant notification per payment. Email failures retain the order and dashboard notification. The florist can open their authenticated order page and contact the customer.
- Checkout funds belong to the connected florist's merchant account. Square processing fees, account eligibility and bank payout timing are controlled by Square. Nebula's manual subscription activation is separate; no application commission is added.
- Cash/banknote products remain blocked from online checkout pending provider eligibility. They can be unpaid enquiries. This release does not promise payment processing for every country or product category.
- One shop can offer fresh and satin bouquets; each individual bouquet uses its corresponding engine. This release does not combine both materials within a single bouquet.
- Delivery rules can now enforce merchant-defined postal-code areas/fees, closed dates, preparation lead time and same-day cutoff in the published shop time zone; see [guided setup release](GUIDED-SHOP-SETUP-2026-11-02.md). Existing fixed-fee settings remain until explicitly changed. This checks the entered postcode, not geocoded address validity; exact delivery slots and daily capacity are not implemented. Physical iOS/Android keyboard and SMS-app behavior still need handset checks.
- The free infrastructure has finite quotas, and the current checkout implementation limits stored payment orders to 1,000 per shop until retention is deliberately implemented.

## Validation and remaining proof

- Build passes with 35 unchanged original runtime scripts and 225 artwork assets.
- All 106 platform tests pass, including focused fresh/satin bouquet setup, opt-in library defaults, single-product publication, postal-zone fees/calendar/gift recipients, approved Production OAuth host/cookie/token isolation, disabled/missing-configuration handling, truthful health configuration states, human verification and audited complimentary access. Local tests simulate provider responses.
- Review fixes: health distinguishes configured OAuth from enabled checkout without claiming merchant verification; failed notification-preference saves restore the checkbox; deposit copy refers to merchant terms instead of assuming delivery. These fixes are deployed on main and Sandbox (version `8b26778a-c947-40ae-91c8-1facad221df9`).
- Local browser order and checkout suites passed, including notification-save failure recovery, mobile layout, full/deposit/balance amounts and payment recovery. Native workerd/SQLite checks passed for persistence across restart, ownership isolation, protected media and gates.
- Real Square Sandbox OAuth and full/deposit simulations have succeeded previously. The owner confirmed the Resend connection-test email arrived; actual payment-email inbox delivery remains a separate acceptance check.
- Main public read-only deployment smoke passed again after the review release: Firebase SDK/login and admin/deep routes, 390px phone layout, fresh + satin catalogue, new modules, Production connection enabled with customer checkout closed, anonymous authorization denial and exclusion of server/private files. It created no account, order, email or charge.
- Cloudflare metadata confirms the required five secret names are installed. Public configuration confirms the app's expected Production credential shape passes its setup gate; this does not authenticate the credentials against Square or Resend.
- No real Production merchant connection, payment or refund has been verified yet.

Sources: [Square Production OAuth requirements](https://developer.squareup.com/docs/oauth-api/movetoprod), [Square supported markets](https://developer.squareup.com/docs/international-development), [Resend domain verification](https://resend.com/docs/dashboard/domains/introduction).
