# Nebula florist platform, v4

Current private-beta app: https://app.nebulastudio.site/login
Platform administrator: https://app.nebulastudio.site/admin

This service uses the existing `nebula` Worker and existing SQLite Durable Objects. The main GitHub Pages site, Ray's existing shop and payment services are separate. The new `app` subdomain is a Worker Custom Domain; the apex domain is not moved. The old workers.dev page redirects to the branded app. Firebase must authorize `app.nebulastudio.site` (owner confirmed this on 2026-10-28).

## Delivered product

- One shop per verified Firebase UID, with atomic slug reservation.
- Shared version-2 fresh and satin catalogues, filtered by preset. Merchants toggle and price their own items. Missing prices remain null, never silently free. Sample amounts are copied only by an explicit owner action and must be replaced/approved before activation.
- Six independently editable customisable recipes and ten separate fixed products. A new shop begins empty. Order and Customise use the same stored bouquet; Open Builder starts a separate blank design.
- Existing fresh renderer/model/geometry copied unchanged. Satin uses the existing Ray integration with a generic tenant policy and no Classic mode. Ray's original deployment is not modified.
- Click-to-edit storefront, compressed image upload, section visibility/order, mobile canvas, optimistic draft autosave and explicit publication.
- Protected administrator directory of verified users who have opened a platform session, including those without shops. Indexed pagination and read-only draft/live inspection; role comes from the existing Firebase `/adminUids/:uid` rule, not an email address.
- Tested publication and persisted unpaid product/design request paths behind closed server gates. Optional Square is not required for publication. No request is labelled paid.

## Release gates and manual activation

The current v4 supports free shop signup, private editing and manual activation. Publication still requires an active server-owned entitlement and a complete saved draft. The operator records a verified USD 29 commercial PayPal payment for 30 days in the admin panel; PayPal collection remains external and manual. References cannot be reused across shops. Automatic subscription billing stays disabled.

Square OAuth, hosted checkout, private receipts and payment/refund reconciliation are implemented. Real Square Sandbox acceptance is still outstanding because the developer application/test seller and protected credentials have not been created. The main app leaves Square connection, checkout and production approval disabled. Switching a single flag cannot start live charges. The separate invited sandbox Worker is deployed with explicitly simulated test access and isolated storage; provider credentials and real Sandbox acceptance are still pending.

See `docs/PLATFORM-V4-PAYMENTS.md` for exact routes/behavior, remaining account setup, isolated Sandbox instructions and required acceptance. Earlier v1–v3 notes are historical release records. Ray's existing site and payment service remain separate and unchanged.

## Data and isolation

`ShopRegistry` owns unique UID/slug claims, indexed account summaries and unique provider-resource associations. Each `ShopStore` owns its draft, current and previous published snapshots, media and unpaid requests. Old v1 rows hydrate to schema v2 without rewriting or dropping the saved draft.

Draft JSON is capped at 192 KiB; each design at 24 KiB. A shop has at most 18 active media references: logo 80 KiB, six recipe covers and ten product covers 150 KiB each, hero 250 KiB. Media IDs are immutable SHA-256 hashes. A 12 MiB retained-image quota covers current, previous, draft and historical request media. Unreferenced uploads older than 24 hours may be reclaimed; current snapshots and request product photos are protected. Uploads stop at the quota instead of silently deleting order evidence. No paid storage upgrade is automatic. Legacy slots remain readable and cannot be overwritten.

Unpaid requests persist the published product or full bouquet design, calculated price, currency, customer details and fulfillment preference. The server recalculates design prices against the published policy using the same semantic model as the browser; it accepts no client amount. Duplicate UUID retries return the existing record, conflicting reuse returns 409. Only the owner/admin can read request history. A WhatsApp link is an optional explicit action after persistence, never proof of delivery or payment.

Semantic validation/pricing runs in the SQLite object, avoiding repeated expensive geometry work on the Worker Free request budget. Geometry runtimes are cached by preset and reset all prices synchronously between merchants. Static artwork/runtime requests bypass Worker execution; API/SPA routes run through it. Free quotas remain finite and shared; no unlimited-user claim is made. The central directory pages indexed summaries rather than opening every shop.

## Routes

- `/login`, `/dashboard`, `/dashboard/shop`, `/dashboard/prices`, `/dashboard/collection`, `/dashboard/products`, `/dashboard/editor`, `/dashboard/billing`, `/dashboard/payments`
- `/s/:slug`: owner private draft or eligible immutable public storefront
- `/studio/studio.html?shop=:id&card=:id`: owner recipe; `blank=1`: independent design
- `/studio/studio.html?slug=:slug&card=:id`: public recipe when eligible
- `/admin`: protected platform accounts and inspection
- `GET /api/config`, `/api/health`, `/api/catalog`
- `GET /api/session`; `POST /api/shops`; `GET /api/shops/:id`
- `PUT /api/shops/:id/draft` with current `{version,draft}`
- `POST /api/shops/:id/media?slot=1..18&kind=logo|cover|hero`
- `GET /api/public/shops/:slug`; `POST /api/shops/:id/publish`
- `POST /api/shops/:id/requests`; owner/admin `GET` on same path
- `GET /api/admin/users?q=&cursor=&status=&limit=`; `GET /api/admin/shops/:id`
- `GET /api/shops/:id/readiness`: saved-draft content and activation checklist
- Owner/admin `GET /api/shops/:id/requests/:requestId`; owner-only `PATCH` with `{version,status,merchantNote}`
- `/square/status`, `/square/connect`, `/square/verify`, `/square/location`, `/square/disconnect`: owner-only sandbox connection lifecycle; configured environment and fresh sign-in required for changes
- `GET /api/square/callback`: validates one-use browser-bound OAuth state, clears its cookie and redirects without exposing tokens
- `/billing/*`: closed provider setup responses

JSON/API mutations require an approved Origin. Authentication verifies Firebase signature, project, expiry and verified email. Owner UID and server-side admin role enforce tenancy; invite emails only control private-beta admission. Source/private files are outside the static asset allowlist.

## Build and verification

From repository root (Node 22.19+):

```powershell
node builder/tools/build-platform.cjs
node builder/tests/platform-policy.cjs
node --test cloudflare/platform/test/*.test.mjs
node builder/tests/platform-durable.cjs
node builder/tests/platform-browser.cjs
node builder/tests/platform-orders-ui.cjs
```

The last two additionally require Miniflare/esbuild and Playwright with Edge respectively. Browser/workerd QA uses a real local SQLite/runtime implementation but injected local Firebase identities and a synthetic local entitlement, never production bypasses. Tests never send email, connect Square or charge a card. Generated studio/policy/runtime copies and QA captures are ignored in Git. The original model/renderer identity is checked at build time.

From `cloudflare/platform`, `npm run check` builds and performs a Wrangler dry run. `npm run deploy` builds and deploys to the existing `nebula` Worker only. Review account, route, flags and binding preservation before deployment. Do not replace the apex domain or deploy over a Ray payment Worker. Read-only live smoke: `node builder/tests/platform-live.cjs`; optional `PLATFORM_BASE` overrides the branded origin.

See `docs/PLATFORM-V4-PAYMENTS.md` for current payment/activation behavior. `docs/PLATFORM-V3-2026-10-29.md` and `docs/SQUARE-CONNECTION.md` describe the previous release. `docs/PLATFORM-V2-2026-10-28.md` records the earlier release. Earlier beta notes are historical, not current specifications.

## Request management and review

Requests use independent optimistic versions. Owners can change requested → accepted/cancelled, then accepted → fulfilled/cancelled; terminal states do not reopen. Internal notes are private. Fulfillment status never records a payment. History stays readable by its owner after subscription expiry, and administrators have read-only inspection. Newest-first keyset pagination uses an opaque filter-bound cursor and indexed status/time/id queries. A fixed-size counter table tracks status totals, with one-time legacy backfill and atomic updates.

New browser requests include the reviewed published version; a changed shop returns409 before insertion. Lost-response retries still return the original request first. Review shows contents and an estimate before submission. Owner review cannot send a request. Order consumes its URL action once; Customise opens the editor. Merchants may explicitly render the saved design into an immutable collection cover, preserving the previous photo until both upload and versioned draft save succeed.

Generic folded notes use explicit merchant per-note pricing in shop currency. No exchange rate, assembly fee or deposit policy is inferred from Ray's separate implementation. Customer-supplied cash/payment-plan metadata can remain in private imported artwork but is blocked from public quotes until supported by an approved commerce policy. Ray's existing original service is unchanged.

## V4 routes

- Owner `POST /api/shops/:id/billing/activation-request` with `{}` saves an activation/renewal request.
- Platform admin `GET/POST /api/admin/shops/:id/activation` reads audited history or records a revisioned manual grant/suspension. A fresh sign-in is required for writes. Main app grants accept only USD 29/30 days; test grants exist only in the isolated test environment.
- Owner `GET/PUT /api/shops/:id/commerce` manages versioned exact checkout rules.
- Public `POST /api/shops/:id/checkout/quote` with `{requestId}` and `X-Order-Token` creates/replays a server-priced final order from a saved request.
- Customer `POST /api/shops/:id/checkout/status|pay|cancel` requires the same private header; `pay` accepts only order ID, revision and deposit/full choice. `full` collects the remaining balance after a deposit. Client amounts are rejected.
- Owner `GET /api/shops/:id/checkout/merchant?cursor=` pages financial orders.
- `POST /api/square/webhook` verifies the raw signature against the exact configured URL before merchant lookup. Provider event data never constitutes browser authorization.
- `/receipt.html` is a standalone private receipt/recovery view. Customer secrets use fragments/local storage, not URL queries or provider redirects.

Run `node builder/tests/platform-checkout-ui.cjs` for the storefront-to-payment receipt browser flow with locally simulated Square responses. Run the existing browser regression for manual admin controls and checkout rule editing. The real workerd test also verifies activation/audit persistence and idempotency across restart.
