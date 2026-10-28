# Nebula shop payments

Implemented locally; not deployed or connected to a real Square application yet.
The public Ray preview remains non-payment. `payments-config.json` has no endpoint.
No live or Square Sandbox transaction has been performed by this implementation.

## Runtime and boundaries

- Existing GitHub Pages shop and bouquet engines remain in place.
- A Cloudflare Worker exposes the API. One SQLite-backed Durable Object per
  environment/shop stores settings, owner bindings, immutable priced orders,
  checkout attempts, verified payments/refunds and an audit trail.
- The same DO serialises requests, including network calls. A persisted attempt
  idempotency key recovers a Square request accepted just before a timeout/crash.
- A registry object maps Square merchants to shops. Merchant IDs cannot bind to
  two shops. A shop with payment history cannot silently switch merchant accounts.
- Browser pricing and the server import the same pure `commerce-core.js` module.
  Draft preview arithmetic was extracted without changing its existing rules.
  Approved live rules use per-item prices, exact foam-package overrides and
  explicit wrapping, fulfillment, tax and FX configuration.
- No application fee, subscription collection or custom domain is created.
- Square keys stay in Cloudflare. Merchant tokens use AES-256-GCM with unique
  IVs and environment/shop-bound additional authenticated data. Authenticated
  browser responses never contain tokens or encrypted token records.

Square calls are native fetch/WebCrypto: no Square SDK runtime dependency.
Wrangler/Miniflare are development tools only. Node 22.19+ is required locally.

## Local checks

From this directory:

```powershell
npm ci
npm test
npm run check
node ../../builder/tests/rays-payments-durable.cjs
npm run dev
```

`npm run check` builds locally, without deployment, into the Git-ignored QA
directory. The durable test runs actual workerd/SQLite, simulates Square calls,
tests simultaneous checkout and restarts the runtime to verify persisted payment
state. Browser tests require Playwright and Edge as in the existing project:

```powershell
node builder/tools/build-raysbouquetz.cjs
node builder/tests/rays-pricing.cjs
node builder/tests/rays-square.cjs
node builder/tests/rays-builder.cjs
node builder/tests/rays-payments-browser.cjs
```

Run the last block from the repository root. The final test uses local HTTP,
simulated Firebase modules and simulated Square responses. It cannot charge money.

## Required environment values

Set values separately for `sandbox` and `production`. All secret values belong in
Cloudflare Variables and Secrets / `wrangler secret put`, never in Git/chat.

| Name | Kind | Purpose |
|---|---|---|
| `SQUARE_APPLICATION_ID` | Variable | Square application ID for this environment |
| `SQUARE_APPLICATION_SECRET` | Secret | Matching application secret |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Secret | Matching webhook subscription signature key |
| `TOKEN_ENCRYPTION_KEY` | Secret | 32 random bytes, base64url encoded; keep a secure backup |
| `RATE_LIMIT_SALT` | Secret | Random value for daily-rotated visitor hashes |
| `API_BASE_URL` | Variable | Exact deployed HTTPS Worker origin, no trailing slash |
| `PLATFORM_ADMIN_UIDS` | Variable | Comma-separated verified Firebase UIDs, no emails |
| `FIREBASE_PROJECT_ID` | Variable | Existing `la-flora-6ed47` project |
| `SITE_ORIGIN` | Variable | Existing `https://nebulastudio.site` |
| `ALLOWED_SHOPS` | Variable | Initially `raysbouquetz` only |
| `PAYMENTS_ENABLED` | Variable | String `false` by default; gates new checkouts |
| `LIVE_CHECKOUT_APPROVED` | Production variable | String `true` only after real Sandbox checks and launch review |
| `DEVELOPMENT_ORIGINS` | Sandbox-only variable | Optional exact localhost origins, comma-separated |

The API also requires the shop's checkout flag, complete approved pricing and a
connected CAD/card-processing location. Charging shop-supplied banknote value has
an additional platform-only eligibility record. No preview assumption grants it.

Do not change the encryption key without a migration or planned reconnection;
the stored OAuth tokens cannot be decrypted with a different key. It does not
encrypt the entire order database: access controls protect order/customer data.
Do not expose the Cloudflare account or local storage explorer publicly.

## Account setup sequence

1. Create the Nebula Square developer application and a Canadian Sandbox test
   seller. Use truthful developer identity details. Ray keeps her real Canadian
   merchant account; the developer does not impersonate a Canadian merchant.
2. Deploy **Sandbox only**, initially disabled, with `npm run deploy:sandbox`.
   Record its exact Worker URL in `API_BASE_URL`.
3. In the Square application's Sandbox OAuth settings, register exactly:
   `WORKER_ORIGIN/oauth/callback`.
4. Add a Sandbox webhook subscription with notification URL exactly
   `WORKER_ORIGIN/webhooks/square`. Subscribe to `payment.created`,
   `payment.updated`, `refund.created`, `refund.updated`,
   `oauth.authorization.revoked`; install its signature key as a Worker secret.
5. Enable Firebase Email/Password in the existing project, retain Google for the
   platform owner, require a suitable password policy, and verify authorized
   website domains and email verification/reset templates. No Firestore or
   Realtime Database rules need broadening for payment data.
6. Set the public Sandbox Worker URL in
   `clients/raysbouquetz/payments-config.json`, keeping environment `sandbox`.
   Only endpoint/shop/environment/public Firebase keys are accepted by the build.
   Build and publish the allowlisted shop output through the existing process.
7. Open the shop's `account.html`. Sign in with the existing owner Google
   account. Before assignment, the page displays its own UID. Install only this
   verified owner UID in `PLATFORM_ADMIN_UIDS`; never approve arbitrary customers.
8. The platform owner creates a seven-day invitation bound to Ray's email.
   Delivery of the invitation is manual; the service sends no marketing/email.
   Ray creates her password through Firebase, verifies her email and claims it.
   Anyone can create an unassigned Firebase account; this grants no shop access.
9. Connect the Canadian **test seller** through the account's Square button.
   A top-level visit to the Worker sets the secure OAuth session cookie before
   redirecting to Square. The callback checks one-use state and the browser
   nonce. This avoids relying on cross-site fetch/third-party cookies.
10. Fill the test prices and policies, approve them, select the location, and
    enable both the shop flag and Sandbox `PAYMENTS_ENABLED=true`.
11. Execute the real Square Sandbox checklist below. Only after passing it,
    deploy the separate production environment, configure production credentials
    and webhooks, invite the actual owner there, approve actual prices, connect
    Ray's merchant account, and intentionally enable production.

**Production never imports test owners, tokens, fake prices, orders or approval.**
Do not turn `LIVE_CHECKOUT_APPROVED` on merely because local tests passed.

## Pricing approval

The live policy explicitly defines every enabled item and extra, including all
mixed satin/foam/money combinations. Foam-only exact counts use their package
price; other counts/mixes use approved unit prices and wrapping. This replaces
preview menu ranges only after the merchant approves that automatic model.
Glitter rose units include their glitter price. Message ribbon + bow uses the
bundle once; the standard simple bow is included in an exact foam package.
All physical decorations still must be enabled, even when bundled/included.

Taxes are configured by the merchant, not inferred. Tax treatment of cash face
value is explicit. Delivery requires an offered zone and a matching three-letter/
digit postal prefix (Canadian FSA, e.g. R3C), plus address. Do not invent delivery
fees, coverage or tax rules. Pickup can be the sole supported method initially.

USD conversion requires a positive rational merchant-approved TD cash rate with source,
observation time and expiry. The server rejects expired/future-dated rates. Quote
validity is 15 minutes or the rate expiry, whichever is earlier. A paid order's
remaining balance keeps its original agreed CAD price.

## API contract

Base `/v1/shops/:shopId/`. JSON bodies are capped at 60 KB; only the configured
website origins can make browser writes. CORS is not authentication.

| Route | Method | Access / result |
|---|---|---|
| `config` | GET | Public approved/draft policy, environment and availability; no owner/token records |
| `account` | GET | Verified Firebase Bearer token; own UID/role or assigned-shop details |
| `invites` | POST | Platform owner; `{email}` → private invitation token |
| `claim` | POST | Verified matching email; `{invite}` → shop membership |
| `settings` | PUT | Assigned merchant/platform owner; `{version,policy,checkoutEnabled}` |
| `square/connect` | POST | Assigned user, sign-in within 10 minutes; Worker start URL |
| `square/location` | POST | Recent sign-in; `{locationId}` |
| `square/disconnect` | POST | Recent sign-in; retires unpaid links before revoking |
| `quotes` | POST | `{requestKey,policyVersion,design,customer}` → saved priced order |
| `orders/:id/checkout` | POST | `X-Order-Key`; `{revision,choice:deposit|full}` → pending Square URL |
| `orders/:id/cancel` | POST | `X-Order-Key`; verified retirement, never assumed |
| `orders/:id` | GET | `X-Order-Key` → customer status; assigned Bearer token → shop detail |
| `orders` | GET | Assigned Bearer token; 25 orders/page with opaque cursor |

`requestKey` is a random 32-byte base64url capability generated by the customer
browser. The server stores only its shop-bound hash; the order ID alone grants no
access. Reusing a request key with different content is rejected. Browser amounts
are ignored; amounts come from the stored server quote. The stored design's
explicit slot overrides are canonicalised to exactly the paid item list.

Customer data: name, phone, email, date, Pickup/Delivery, zone ID, postal code,
address only for delivery, bounded note. No card number, bank data or password is
accepted by these endpoints. Private order links put capabilities in URL fragments,
not query strings, and remove them from the visible location after loading.

`GET /health` reports only configuration presence/environment/activation flag.
OAuth routes and `/webhooks/square` are outside the shop API. The HMAC uses the
exact configured URL and raw notification body. Payments are re-read from Square
and matched to merchant, order, location, CAD amount and no tip. Duplicate or
out-of-order events do not double-credit the ledger. A refund/late/conflicting
payment puts an order on hold rather than silently enabling another charge.

## Real Square Sandbox acceptance — still pending

- Actual consent page, cancellation, callback, refresh and disconnect/revoke.
- Actual Sandbox checkout URL and Square-provided test card, declined payment,
  successful deposit, signed webhook, refresh of return page and paid balance.
- Repeat click, interrupted connection, cancelled old link and expired quote.
- Save/reload the exact order, then compare item list and server/browser totals.
- Refund through Square Sandbox dashboard; verify status and no double credit.
- One user/shop cannot read another shop; unassigned accounts cannot approve prices.

Keep a dated result record. Local fake responses do **not** satisfy this checklist.
Production verification requires a separately agreed live test; no automatic
charge is made by any included test.

## Operations and rollback

Disable new checkout using the shop flag or `PAYMENTS_ENABLED=false`. Existing
Square URLs must also be retired; an API flag alone cannot invalidate an already
issued provider URL. During a Square outage, keep records pending and retry or
retire links directly in Square. Never report cancellation before Square verifies it.

Alarms reconcile pending requests, retry retirement of held links, periodically
refresh completed payments to recover missing refund events, and refresh OAuth
within six days (checked hourly when idle). Completed-payment checks are throttled
and limited per maintenance run. Delayed revocations older than the current OAuth
grant cannot revoke a newly reconnected account. Raw IPs are never stored. Temporary
OAuth/invitation/rate/event records are cleaned; orders and audit history remain
for explicit business retention/backup decisions. Review Cloudflare storage/PITR
and account recovery before launch. The account UI and Square dashboard expose
connection/payment problems; no external monitoring messages are configured.

No paid Cloudflare tier or Firebase Blaze upgrade is enabled here. Provider free
quotas still apply and exhausted quotas must fail without claiming payment success.

The dated local test record is in [VALIDATION.md](VALIDATION.md). Actual Square
Sandbox acceptance remains pending, separately from these local checks.

Sources: [Square Checkout](https://developer.squareup.com/docs/checkout-api),
[OAuth](https://developer.squareup.com/docs/oauth-api/receive-and-manage-tokens),
[token maintenance](https://developer.squareup.com/docs/oauth-api/refresh-revoke-limit-scope),
[webhook verification](https://developer.squareup.com/docs/webhooks/step3validate),
[Firebase ID-token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens),
[SQLite Durable Objects](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/).
