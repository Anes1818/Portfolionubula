# Builder-first conversion and shop setup

Prepared 4 November 2026 from the current implementation, the Pavon reference,
the founder's requested experience, and Square's official Checkout documentation.
Implemented 4 November 2026. Deployment evidence is recorded below; live card
payments remain a separate release gate.

## The offer

**Give your customers a bouquet builder with your flowers, your prices and your brand.**

Customers design a bouquet, see its price, and either pay through the florist's
connected Square account or send the saved design through WhatsApp/SMS.

The included storefront supports the builder. Fixed products are an optional
expansion, never a prerequisite for setup or publication. One finished bouquet
is enough to begin; the six signature slots are a maximum, not six requirements.

Public headline: **Let customers design their bouquet. You make it real.**

Supporting copy: **Your flowers. Your prices. Your own branded page. Receive the
saved design and customer details with each order. Connect Square for online
payments, or take requests through WhatsApp or SMS.**

Primary action: **Try the bouquet builder** (no login).
Secondary action: **Create my shop preview**.
Show the current real-photo-to-builder comparison before feature explanations.
Explain paid activation before the florist invests time, without blocking the demo.

## Two presentations of one service

1. **Focus on my bouquet builder** — recommended for new shops. Pavon-inspired
   branded hero, dominant Design your bouquet button, visual builder section,
   optional starting bouquets, delivery/pickup information, contact and footer.
   No empty product grids or product-count tasks. Keep any existing saved products.
2. **Builder + product shop** — same builder and checkout, with optional fixed
   product cards. Existing six recipe cards keep Order and Customise actions.

Reuse existing home section order and hero button target rather than creating
another builder or another paid plan. A mode shortcut should preview the exact
section changes, preserve saved content, save only the draft, and require the
existing publication step. Do not silently change current merchants' public pages.

For customers, the main CTA is Design your bouquet. Starter recipes are shortcuts
into that same builder. Order opens review directly; Customise opens that recipe.

## A short florist journey

1. **See my shop** — shop name and fresh/satin/both, inheriting an existing demo
   choice where possible. Immediately show the branded private storefront.
2. **Build my first bouquet** — recipe, name, real photo, and prices for what was
   used. Keep unpriced unused library items off. Add the next five later.
3. **Receive orders** — contact details, pickup/delivery, then choose message
   requests or connect Square. Explain that Square is optional. Only open the
   selected method's extra fields. Preserve messaging as a separately configured
   fallback; never silently downgrade a failed payment to an unpaid request.
4. **Review & open** — show the exact public preview, included features, missing
   requirements, $29 USD/30 days and manual activation status. After access is
   verified, offer one clear Open my shop action backed by server publication
   checks. A successful payment to Nebula must not publish an unfinished draft.

Show a single next action on Home, plus the shop link and three status rows:
Shop: preview/open; Orders: WhatsApp/SMS/Square; Delivery: pickup/areas configured.
Keep advanced settings out of the initial journey.

## Order method and payment language

**Message requests:** select WhatsApp, SMS, or both and provide the shop number.
Save the request and its design first, then open a prefilled message. The customer
must tap Send. Never label opening that draft as a delivered message or payment.

**Square:** the florist authorises their own eligible seller account. The server
calculates the total and creates Hosted Checkout for that merchant. Verified
provider records determine paid amounts, independently of fulfillment status.

Call the choices **Pay in full** and **Pay a 50% deposit**, not a 100% deposit.
Merchant setting: Full payment only, or Full payment + 50% deposit.
The preference is validated, included in the public checkout settings, frozen on
the order quote and enforced by the server. Legacy quotes retain both options.
Arbitrary deposit percentages are not offered in this revision.
Show the amount due now and remaining balance before Square. Merchant terms
must explain when the balance is due; do not invent a due date.

Saved order includes frozen design image and contents, agreed total, payment
records, fulfillment choice, date and customer contact. The authenticated florist
order link belongs in the notification; do not expose customer recovery tokens.
Keep payment notifications and useful email links short and mobile-readable.

## Delivery is visible before checkout

Start with: Pickup only / Delivery only / Pickup + delivery.
When delivery is off, hide address, area and fee fields.
When on, show a short shop notice such as “We deliver to Toronto and North York.”
This is merchant-supplied copy, not a default assertion about a real shop.

Use the existing delivery-zone model: area name, postal code(s)/prefixes, fee.
Show readable names and fees on the storefront and review; postal-code details
can sit under Check delivery availability. Validate country/postcode and fee on
the server before payment. Unsupported addresses cannot receive a pay link for
delivery; offer pickup only if the florist enables it. Informational area text
alone cannot enforce boundaries. Do not promise map/radius or street-level checks.

Collect customer date/address once in Nebula, show delivery and tax separately,
then send the already validated amount to Square. Preserve the current deposit
ledger and avoid adding the delivery fee twice. Address changes affecting the
fee require a new server quote and safe payment-link replacement.

## What Square supports and what Nebula controls

Square Hosted Checkout supports address collection/prepopulation and a shipping
fee. It also supports up to two custom text fields. These are payment-page
capabilities, not a reason to move bouquet design, delivery eligibility or the
florist's preparation rules into unvalidated text fields.

Nebula should remain the source for delivery areas, fees, allowed dates and the
saved bouquet; Square hosts payment. Do not assume that a florist's Square Online
delivery-zone settings automatically synchronise with a custom Checkout API app.
No automatic Square Online zone import has been implemented or verified here.

Sources checked 4 November 2026:
- https://developer.squareup.com/docs/checkout-api/optional-checkout-configurations
- https://developer.squareup.com/reference/square/objects/CheckoutOptions

## Current foundations and gaps

Already implemented: builder recipes, six cards, ten optional products, configurable
home sections, real photos, direct Order versus Customise, message drafts, Square
OAuth, full/deposit/balance, server prices, delivery zones/calendar, saved order
previews, dashboard payment notifications and Resend payment emails.

Verified today with the actual Square Sandbox: CAD159 full payment; customised
CAD158 order with CAD79 deposit and CAD79 balance; matching Square transaction
records and saved florist/customer views. Resend accepted notifications; this is
not independent inbox-delivery evidence. Production checkout is still gated.

Implemented: builder-focused and expanded page-style shortcuts; clearer offer and
setup copy; public delivery summary and zone fees; method-specific order settings;
server-backed full-only/both payment preference and due-now/balance review;
activation steps, included features and separate Open my shop publication action.
Review whether notification emails cover new unpaid requests: current confirmed
email evidence is for payment events, not every messaging enquiry.

## Rollout and success checks

Implement presentation/setup changes first using existing schemas where possible.
Then add the payment-choice preference and test both browser/server policy paths.
Keep existing drafts/products, prices, order links and public snapshots intact.
Try builder-only and expanded shops on phone and desktop; existing merchants
opt into layout changes. Keep public payment rollout separate from UI publication.

Acceptance: a new florist can see a branded preview, build one bouquet, add its
photo/prices, choose messaging or Square, explain delivery coverage and identify
the remaining activation task without needing the founder to explain the panel.
Test successful/failed payments, deposit/balance, unserved postcode, delivery fee,
message-only request and email link before describing each as launch-verified.
Observe the first independent florist completing this flow; do not claim a
conversion lift or a perfect experience before that evidence exists.


## Verification on 4 November 2026

- 113 backend tests pass, including full-only price policy, rejected forged deposits,
  retained cancelled-request blocking, legacy home fallback compatibility,
  tenant isolation, delivery zones, refunds, notification and retry behavior.
- Local browser journeys pass: guest demo/login handoff, real satin recipe and
  photo/used-item prices, activation then publication, Order versus Customise,
  page-style switching preserving uploaded products, 320/390/768px layouts,
  message-only requests, delivery fees and invalid postcodes/dates, full-only,
  deposit and balance, failed provider response and private recovery.
- Existing shops opt in to page-style changes; no merchant records are migrated.
- Main CHECKOUT_ENABLED stays false; Sandbox stays isolated and test-only.
- Payment-notification inbox placement and the first real merchant Production
  payment/refund still require launch validation. Do not advertise those as proven
  by the local browser tests or the earlier Sandbox transactions.


## Deployed release

Published 4 November 2026 with the existing Worker configurations:

- Main: https://app.nebulastudio.site/ — Worker nebula,
  version ef30ad37-a61b-4a18-9369-a89760cc1123.
- Sandbox: https://sandbox.nebulastudio.site/ — Worker nebula-payments-sandbox,
  version 7c2174ba-d930-408a-871d-b5480affa0a6.
- Florist page-style choice: /dashboard/shop; also available in the inline editor.
- No SQLite merchant records migrated and no Production payment gate enabled.

Read-only Sandbox checks confirm the new modules, the existing public test shop,
legacy default full/deposit preference and Sandbox-only checkout configuration.
