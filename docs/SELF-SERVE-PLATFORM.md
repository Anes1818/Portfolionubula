# Nebula self-service platform — implementation blueprint

Status: implementation sequence for the agreed product flow, 28 October 2026.
The account/private draft, owner preview and shared fresh-flower collection studio
are implemented as a private beta. Satin, subscription activation and generalized
merchant payments still require work. The disconnected Lemon test adapter alone
cannot activate a subscription. See `PLATFORM-BETA-2026-10-28.md` for the tested
release state. Existing shops and their agreed terms remain in place.

## Customer journey

1. A florist signs in with Firebase Google or verified email/password.
2. They create one shop and choose its name, logo, contact details, catalogue
   preset, offered products, prices and collection. Start with compatible library
   recipes; the florist need not manually build four bouquets before previewing.
3. Their final shop URL opens a private owner preview. Anonymous visitors see an
   inactive-shop page. Draft changes persist across sign-in sessions.
4. They choose the USD $29 monthly subscription and pay through Lemon Squeezy.
5. Verified server-side billing state and complete shop configuration allow
   publication and new order requests.
6. A connected supported Square merchant, approved complete prices and fulfillment
   settings additionally enable customer card checkout. Square can be connected
   during setup so eligibility can be checked before subscribing.

## Budget and services

- GitHub remains source control. Cloudflare Static Assets hosts the public app;
  Workers handle authenticated APIs, billing and storefront routes.
- Firebase is reused for Google and email/password authentication. SMS and
  passwordless email-link sign-in are outside the initial release.
- Reuse SQLite-backed Durable Objects for shop data and the existing payment
  ledger. Do not add D1 or another primary database just to duplicate that data.
- Keep images bounded and compressed in the browser. Proposed first-release
  limits: one logo up to 80 KiB and four collection thumbnails up to 150 KiB each.
  A dedicated bounded upload route and SQLite BLOB storage handle these images;
  the current 60 KB payment JSON endpoint is not an upload API.
- Use the existing flower artwork and predefined page themes. Arbitrary uploaded
  flower sprites and automated photo-to-bouquet reconstruction are not initial
  self-service features. Bespoke artwork remains separate work.
- Use free provider plans only initially. Cache versioned public configuration and
  images; debounce draft saves and keep bouquet rendering in the browser.
- Free quotas are shared and finite. Set per-account shop/upload/request limits.
  Payment/API failure must not claim success. No automatic paid-plan upgrades.
- Lemon Squeezy and Square transaction/payout charges remain applicable; zero
  hosting subscription is not a claim of zero processing costs or unlimited scale.

## Reuse and boundaries

Keep the current bouquet geometry, renderer, saved designs and URL encoding.
Replace per-shop runtime duplication with a shared bootstrap that obtains a
validated profile before initializing the catalogue/model. Existing generated
shops retain their working routes during the migration.

The current payment service is a foundation, not a generic merchant product: it
imports Ray's catalogue, assumes CAD and applies Ray-specific fee rules. Extract
the catalogue/pricing policy behind a validated shop contract before enabling it
for new merchants. Start Square rollout with tested CAD/Canada and USD/US flows;
other countries require their own supported currency and provider testing.

## Ownership and data

- Firebase UID is the owner identity; email alone is not authorization.
- A platform directory atomically reserves shop IDs/slugs and binds the owner.
  Account creation does not grant platform-admin access.
- Each shop stores a draft, an immutable published version, its configuration
  readiness, media, subscription reference and separately managed Square status.
- Keep public brand/catalogue data separate from private identity, customer
  orders, subscription details and encrypted Square tokens.
- Shop/profile reads must not wait behind slow Square requests. Keep storefront
  configuration storage separate from serialized payment reconciliation work.
- The payment service uses the canonical published price-policy version. Draft
  autosaves never mutate live prices or invalidate customers' existing checkouts.

## Pages

| Route                   | Responsibility                                         |
| ----------------------- | ------------------------------------------------------ |
| `/login`                | Sign-in, verification and password recovery            |
| `/dashboard`            | Own shop, setup checklist and activation state         |
| `/dashboard/shop`       | Brand, catalogue, prices and fulfillment               |
| `/dashboard/collection` | Save/edit recipes, covers and collection cards         |
| `/dashboard/billing`    | Subscribe and open Lemon billing portal                |
| `/dashboard/payments`   | Square connection and merchant orders                  |
| `/s/:slug`              | Private draft preview or published customer storefront |

Order and Customise on a collection card must reference the same saved recipe.
A cover photograph alone cannot reconstruct that recipe. Generated design
thumbnails are the initial automatic option; uploaded photos require the merchant
to choose/build the matching recipe.

## Activation and money

The server evaluates separate conditions rather than trusting a browser `active`
flag: authenticated owner, valid published configuration, subscription entitlement,
and optional Square checkout readiness. Frontend visibility is presentation only.

Lemon checkout is created for the authenticated shop and fixed server-configured
product/variant. Verified signed webhooks and provider data update the subscription
ledger idempotently. Handle renewal, failures, cancellation through the paid-through
date, expiry, pause/resume and refunds. A success redirect never activates a shop.
Lemon collects Nebula's subscription; Square collects the florist's bouquet sale.

When new orders are disabled, retain owner access, saved designs and old order
records. Existing paid-order balances, refunds and receipts need their own policy;
do not delete them or strand them behind a subscription screen.

## Implementation order and acceptance

### 1. Account and private draft

Implement public merchant sign-in, automatic owner binding, one-shop creation,
validated draft updates and private preview access. Acceptance: a returning owner
keeps changes; a second user cannot read/edit the draft; anonymous visitors cannot
submit an order. Existing admin access remains separate.

### 2. Shared builder and collection

Load the shop profile before the existing engine. Provide compatible presets for
fresh and satin/eternal flowers, complete enabled-item pricing, saved collection
recipes and matching Order/Customise links. Acceptance: design/quantity/price
round trips, cross-shop isolation, mobile editing and preview lock all pass.

### 3. Subscription activation

Integrate Lemon test checkout, subscription state, billing portal and server
publication gates. Acceptance: successful/failed/repeated/abandoned payments,
delayed/duplicate webhooks, cancellation, expiry and seasonal pause behave as
documented. Obtain Lemon's actual store/product approval before live collection.

### 4. Generalized merchant checkout

Reuse the existing OAuth, encryption, checkout idempotency and payment/refund
ledger. Replace Ray-specific defaults with approved per-shop rules. Acceptance:
real Square Sandbox, deposit/full/balance, prices, supported seller/currency,
refunds and retries all pass for the initially supported configurations.

### 5. Hosting migration and pilot

Deploy an explicit public-file allowlist to Cloudflare, add authenticated API and
storefront routing, and test on a staging URL. Configure Firebase domains and
provider callbacks for that exact origin. Move the existing domain only after
legacy URLs, shop previews and payment tests pass. Launch with a bounded pilot;
do not infer unlimited free capacity or product demand from signups alone.

## Account setup required from the founder

- A Cloudflare Free account, without enabling paid products.
- Access to the existing Firebase project; enable the chosen login providers.
- A Lemon Squeezy store in test mode, identity/payout setup and product review.
- A Square developer application and supported-country test sellers for testing.

Secrets go into protected Worker configuration, never chat, Git or public files.
Product approval, payout eligibility and real payment tests cannot be replaced by
local mocks. No hosted service has been connected by writing this blueprint.

## Verified provider references

- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Static Assets billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
- [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [Firebase Authentication limits](https://firebase.google.com/docs/auth/limits)
- [Lemon Squeezy fees](https://docs.lemonsqueezy.com/help/getting-started/fees)
- [Square international development](https://developer.squareup.com/docs/international-development)
