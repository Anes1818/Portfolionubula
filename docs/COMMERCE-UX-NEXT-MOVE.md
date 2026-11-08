# Commerce UX: researched next move

Research date: 1 November 2026. Approved implementation now covers the bounded Sandbox release below. Production checkout and email remain gated.

## Evidence and goal

The supplied Nebula receipt shows a Sandbox order paid CA$159 with zero balance. This confirms one provider-backed payment reached the application ledger. It does not by itself establish automatic webhook delivery versus status reconciliation, seller email delivery, deposit/balance acceptance, or production readiness.

Current code uses Quick Pay with the amount due and internal order reference. Customer details are collected before a separate receipt/payment-choice page. That page still exposes recovery/debug controls and a pre-payment message after payment. The proposed change makes one normal purchase flow with a saved visual design and merchant notification.

## Recommended customer experience

1. Build bouquet or select a product.
2. A single review panel shows the bouquet image, short contents, pickup/delivery, requested date, optional gift message, total, and payment choice. Full payment is the primary action; retain 50% deposit when the merchant offers it.
3. Continue to Square Hosted Checkout. Preserve the authoritative server quote, immutable order snapshot, idempotency, and signed payment verification.
4. Return to a short confirmation page: image, human-readable reference, confirmed paid/deposit status, amount paid/balance, fulfillment details and contact-shop action. Update pending status automatically with bounded polling; retain manual refresh only as a recovery action. Remove pre-payment prompts after a confirmed payment and move technical recovery controls into secondary help.

No florist approval is required between a valid approved catalogue quote and payment. Merchant prices, tax/delivery rules and policies are approved once during setup. Unpriced, disabled or ineligible designs must not silently become purchasable.

## Use Square where it fits

[Checkout options](https://developer.squareup.com/docs/checkout-api/optional-checkout-configurations) support prefilled email, phone and address, optional address collection, and up to two custom text fields. The normal contact section remains part of Square checkout. Prefer collecting information once; prefill any details already collected in Nebula. A later change can move buyer contact collection to Square, but first the server must support an anonymous pending order and hydrate verified contact from the returned payment/order records. This is a data-model change, not merely hiding inputs.

For local flower delivery, recipient, delivery area and requested date remain Nebula business logic. Do not defer an address needed for delivery eligibility or price until after payment, or allow an edited address to invalidate the quoted fee unnoticed. Square's address-collection option produces SHIPMENT fulfillment; it is not automatically a local delivery scheduler. Keep buyer and gift-recipient identities distinct. Use country-aware structured address fields, international phone input, browser autofill, merchant-local dates/timezones, localized currency formatting and conditional fields.

[Square Order Checkout](https://developer.squareup.com/docs/checkout-api/square-order-checkout) can create an itemized order and payment link together. Recommend a later upgrade for full-payment orders: one priced custom-bouquet bundle (or properly reconciled components), explicit taxes/delivery, a short Nebula reference, and a design reference in the line-item note. Do not explode every one-off arrangement into permanent Square Catalog products.

Keep the existing deposit ledger during the first UX change. A 50% Quick Pay link represents the amount due now, not a fully paid Square order for the entire bouquet. [Invoices API](https://developer.squareup.com/docs/invoices-api/create-publish-invoices) supports deposit + balance schedules and reminders, but requires customer/invoice resources, more permissions and separate testing. Some invoice capabilities require Invoices Plus. Treat native invoice-based deposits as an optional later project; never create both an invoice and checkout link charging the same amount.

## Saved design and order link

Freeze the final design JSON and a bounded raster preview at order creation. An existing order must continue to show its purchased design after the florist edits templates or prices. Merchant order details show image, flower/extra counts, fulfillment information, Square payment reference and a View bouquet action.

Attach a short Nebula order reference to Square. For structured orders, use reference_id and a readable line-item note containing the merchant order/design URL. [OrderLineItem](https://developer.squareup.com/reference/square/objects/OrderLineItem) supports notes; metadata is application-private and is not a merchant-visible notification channel. Verify note/link visibility in the real seller Dashboard; do not promise that every Square email or surface renders arbitrary URLs as clickable links or supports arbitrary uploaded bouquet images.

The merchant link requires the florist's sign-in and correct shop ownership. Any customer share link must be separate, read-only, revocable and show only the design. Never copy the receipt's payment-capable recovery token into Square notes, a public image URL, an email subject or metadata. The preview link does not authorize editing, payment or access to other customers.

## Merchant notifications with the current budget

[Square's Quick Pay guide](https://developer.squareup.com/docs/checkout-api/quick-pay-checkout) documents customer receipts and a payment-received email to the seller's primary Square email, controlled in payment-link notification settings. Verify a real seller's configuration and delivery during launch; Sandbox does not prove real email delivery. Square Online new-order notification settings are a different product and must not be assumed to cover a Nebula store.

Recommend two complementary signals:

- Square handles its standard payment receipt/notification.
- Nebula creates an unread paid/deposit event in the merchant dashboard and sends a concise order email with bouquet image, reference, amount paid/balance, fulfillment date and an authenticated View order link.

For the custom email, [Resend Free](https://resend.com/pricing) currently allows 3,000 transactional emails/month with a 100/day limit shared across the entire platform account. [Verified domain setup](https://resend.com/docs/dashboard/domains/introduction) is required for production sending; use a Nebula transactional subdomain and Cloudflare DNS. This is a bounded starting tier, not unlimited free notifications. WhatsApp remains an optional share/contact action, not the notification mechanism the merchant must depend on.

Persist the notification event alongside verified payment state and deliver asynchronously with retries, delivery status and duplicate suppression by payment/event identity. A return URL or browser tab must never cause a paid notification. If delivery fails or the quota is reached, the paid order and unread dashboard event remain available. Email/SMS/push permissions and accounts are not configured by this document.

## Square limitations to preserve in the design

[Common pitfalls](https://developer.squareup.com/docs/checkout-api/common-pitfalls) distinguishes API-generated single-use links from reusable Dashboard links: API links are not listed in the Dashboard Payment Links manager, although associated payments/orders are accessible through their appropriate views/APIs. DIGITAL fulfillment on payment-link orders has management limitations, and payment completion is distinct from fulfillment completion. Retain Nebula's fulfillment tracking unless an explicitly tested physical-fulfillment integration replaces it. Do not label all paid Square orders COMPLETED merely to simplify the UI.

## Implementation sequence and acceptance

1. Simplify customer review/confirmation copy and layout; preserve the working payment backend and both payment choices.
2. Add immutable order preview, merchant View bouquet page and a short human-facing reference.
3. Implement unread merchant payment events and durable notification outbox; configure and test one verified email sender.
4. Test full/deposit/balance, successful and failed payments, closed browser, slow/duplicate events, notification retries, forbidden cross-shop links and later template edits. Confirm real Sandbox results without manual status refresh as well as recovery behavior.
5. Separately prototype itemized Square Order Checkout and, only if chosen, native Square Invoices for deposits. Confirm seller Dashboard visibility, note display, taxes/fees, customer/contact hydration and refund reconciliation before migration.

The next bounded release is steps 1–3 in Sandbox. Existing production/payment gates stay unchanged. No new payment engine or broad platform rebuild is required.

## Implemented in the bounded Sandbox release

- Public checkout review displays the approved tax/delivery total, fulfillment, terms and full/deposit choice in one modal. The server still freezes/recalculates the quote; changed totals fall back to final review. Storage recovery is established before leaving for Square. Existing offline enquiries remain unpaid enquiries.
- Square receives the short Nebula reference, the correct full/deposit/balance label and an authenticated merchant order URL in its readable note. Optional phone prefill was removed after a real Sandbox rejection; Nebula keeps the florist's customer phone, and Square collects its own checkout contact information. Seller-Dashboard note visibility still needs confirmation in Square itself.
- New custom orders capture a bounded raster preview from the existing renderer; product/recipe cover fallbacks are copied from saved media. The preview and semantic design are frozen in the request and quote, separately from future catalogue changes. Existing orders without images remain readable.
- A paid/deposit confirmation shows a short status, saved image where available, fulfillment and paid/balance amounts. Recovery/download/cancellation/terms controls are secondary; pre-payment copy is removed after payment. Bounded status polling handles slow payment updates.
- Each newly verified completed payment atomically writes an unread merchant event alongside the payment ledger and customer-request summary. A duplicate provider event creates no second event. Merchant links require the right owner, and notifications have a persistent read state and minute-level refresh while the tab is visible.
- Optional merchant email targets the owner’s verified sign-in email. The durable outbox uses stable provider idempotency keys and frozen payloads, bounded retries, opt-out checks, explicit provider-accepted status and a forced Sandbox test inbox. Sandbox sending is now configured and the owner confirmed inbox delivery of the connection-test email; production sending remains off. See RESEND-SETUP.md.

Buyer contact still has minimal Nebula name/phone fields; Square collects its own receipt email. Fully moving contact collection into Square, delivery-zone scheduling, itemized Square Orders, native Invoices, Resend delivery webhooks and public design-sharing links are separate later work. The first release does not claim these are complete.

## Validation and deployment — 1 November 2026

- 91 platform Node tests pass, including frozen raster previews, malicious image rejection, tenant isolation, full/deposit/balance ledger behavior, event deduplication, atomic ledger/event rollback, Resend response-loss retries, stable idempotent payloads, quota failure and retry expiry. Unchanged payment polling no longer increments the merchant request edit version.
- Local actual-SQLite browser tests pass for storefront/builder order snapshots, protected merchant deep links, notification read state and verified-email opt-in, direct full/deposit review, phone layout, automatic payment-status refresh and recovery when browser storage is blocked. External payment/email responses in these tests are simulated.
- The real workerd Square transport regression passes. The existing builder engine identity/syntax build checks pass.
- Deployed only `nebula-payments-sandbox`, version `da6dfcbb-1aae-4c06-9e58-15fc2ce2b11d`, on `https://sandbox.nebulastudio.site`.
- Post-deploy public checks: new assets return 200, the existing `anes` public shop remains available with Sandbox checkout enabled, anonymous notification access returns 401, and main-app checkout remains false.
- Later on 1 November, Resend setup was completed for Sandbox and one authorized connection-test email reached the owner's confirmed inbox. No order or payment was fabricated by that test. A new real-provider Sandbox payment/notification check remains outstanding; production was not deployed or enabled.

## Direct bouquet orders and delivery — 1 November 2026

- Collection **Order** opens the order review on the storefront, with the florist's uploaded photo and the exact published recipe. **Customise** still opens the existing builder. The server selects the as-listed design rather than trusting a client-supplied recipe. Photos and contents are frozen in saved orders; Square's hosted form is not promised to display arbitrary bouquet photos.
- Florists can enable pickup and/or delivery, set a delivery fee, and save up to 600 characters of delivery-area instructions in Square payments → online order rules. The review shows the note only for delivery, adds the fee/tax, and requires an address before an online payment quote. Saved quotes retain their original delivery note and amounts.
- Failed link creation exposes the existing payment choice for recovery. A retry keeps the same request, choice, provider key and frozen Square create payload. Changing full/deposit on an unresolved attempt returns the customer to that saved order; it does not create another charge. The modal retains customer fields and renders only one recovery link.
- Local SQLite/API and browser tests cover direct Order versus Customise, uploaded images, delivery notes/totals, unavailable delivery, missing delivery addresses, lost Square responses, duplicate submission recovery and exact payload reuse after a merchant name change.
- A real Sandbox create-link call reproduced HTTP 400 `INVALID_PHONE_NUMBER` for `pre_populated_data.buyer_phone_number`. New attempts omit this optional prefill. Legacy attempts are retired only when Square explicitly returns that validation rejection; ambiguous response loss still preserves the original key/body. The next attempt keeps the same saved order and recalculated due amount. Regression tests distinguish these cases.
- Validation: all 95 platform Node tests, storefront/builder browser tests, checkout/receipt browser tests, merchant-orders browser tests and the native workerd Square transport regression pass. The existing builder engine identity/syntax checks also pass.
- Latest Sandbox version `86403cf1-b98e-4c3c-91fc-ff547865f6c3`. The real `anes` storefront smoke confirms Order opens on the storefront with its uploaded photo, disabled delivery is omitted, and Customise opens the matching builder card. A separate clearly labelled `Nebula Sandbox QA` order was recovered from the reproduced rejection, then completed using Square's real Sandbox test panel: total CAD159.00, verified deposit CAD79.50, remaining CAD79.50, frozen uploaded photo visible on the receipt. No real money or fulfillment. Actual payment-email arrival for this test still requires inbox confirmation. Main-app checkout is still false; production was not deployed.
