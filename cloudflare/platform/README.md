# Nebula private beta Worker

This Worker serves the self-service florist beta and its private saved drafts. It targets the existing **`nebula`** Worker in account `1b65e5ab35edeaa924ddf8fcff2e95aa`. It does not modify the Ray's payment Workers, existing storefronts, custom domains, or DNS.

Subscription billing, Square connection, publishing, order creation, and checkout are unavailable. Provider endpoints always return HTTP 409. Setting an environment variable to `true` cannot activate them: verified provider integration and entitlement handling have not been implemented.

## Access and storage

- Firebase ID tokens are verified with `../rays-payments/security.mjs`, including the RS256 signature, issuer, audience, expiry, and `email_verified === true`.
- `PUBLIC_SIGNUPS` defaults to the exact string `false`. With signups closed, verified users must match `BETA_ACCESS_EMAILS`. The allowlist grants beta access only; shop authorization still requires the matching Firebase UID. The API never discloses the list. A rejected beta login reaches no Durable Object.
- `ShopRegistry` is one SQLite Durable Object. A single synchronous SQLite transaction claims both its unique owner UID and unique slug, preventing races from creating duplicate shops or addresses. Registry seeds recover initialization if a request stops between registry creation and shop initialization.
- `ShopStore` is a separate SQLite Durable Object for each registry-assigned shop ID. It contains its draft, five bounded media BLOBs, and fixed mutation counters. Draft writes require the current optimistic version. A conflict returns 409 and leaves the saved draft unchanged.
- Subscription status, Square status, published state, owner UID, slug, and version are controlled by the server. The draft schema rejects extra properties and validates catalog IDs, integer cents, hex colors, collection entries, and bounded JSON designs.
- Draft saves are capped at 60/minute per shop; image uploads at 10/minute; authenticated image reads at 120/minute. Each shop has only one counter row for each action. Catalog and public config reads do not allocate tenant storage.

## API

All JSON responses and private media use `Cache-Control: no-store`. Errors return `{ "error": "Human-readable message" }` with a relevant HTTP status. JSON writes require `Content-Type: application/json`. Every API mutation requires an `Origin` matching `PUBLIC_ORIGIN` or `https://nebulastudio.site`. HTTP localhost/127.0.0.1 origins are accepted only when `ENVIRONMENT=local` is explicitly configured.

| Request                                       | Result                                                                                                                                                                                                     |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/health`                             | Truthful private-beta stage, configured bindings, closed provider flags and signup mode. No provider success claim.                                                                                        |
| `GET /api/config`                             | `{firebase, stage, signupMode, billingEnabled:false, checkoutEnabled:false, publishingEnabled:false}`. Firebase config is copied from the existing public `b/config.js`; it contains no server credential. |
| `GET /api/catalog`                            | Public local `platform/public/catalog.json`, fetched through `ASSETS`. Returns 503 if missing or malformed.                                                                                                |
| `GET /api/session`                            | Requires invited verified identity. `{user:{uid,email},shop:null\|ownerShop}`.                                                                                                                             |
| `POST /api/shops`                             | `{name,slug,currency:"USD"\|"CAD",preset:"fresh"\|"satin"}` → 201 `{shop}`. One shop per UID.                                                                                                              |
| `GET /api/shops/:id`                          | Owner token returns the saved draft. Anonymous/unrelated identities receive 404 while the shop is private.                                                                                                 |
| `GET /api/shops/resolve/:slug`                | The same owner/public visibility rules, looked up by shop slug. `GET /api/shops/:slug` is also supported.                                                                                                  |
| `PUT /api/shops/:id/draft`                    | `{version,draft}` → `{shop}` with incremented version. Whole request ≤80 KiB; each bouquet design ≤24 KiB, depth ≤14, total nodes ≤2,500, any array ≤300.                                                  |
| `POST /api/shops/:id/media?slot=1&kind=logo`  | Owner-only raw PNG/JPEG/WebP ≤80 KiB. Returns `{media:{id:"slot-1",url}}`.                                                                                                                                 |
| `POST /api/shops/:id/media?slot=2&kind=cover` | Cover slots 2–5; owner-only raw PNG/JPEG/WebP ≤150 KiB each. Existing fixed slots can be replaced. No arbitrary object key or SVG.                                                                         |
| `GET /api/shops/:id/media/:mediaId`           | Private image fetch requires owner Bearer token. The browser must fetch the image with the token and create a local object URL.                                                                            |
| `POST /api/shops/:id/publish`                 | 409: billing and Square provider setup pending.                                                                                                                                                            |
| `POST /api/shops/:id/billing/checkout`        | 409: no checkout session created.                                                                                                                                                                          |
| `POST /api/shops/:id/square/connect`          | 409: no payment connection created.                                                                                                                                                                        |

The initial owner shop is:

```js
{
  id: "sh_<randomhex>", ownerUid, slug, version: 1,
  draft: {
    name, tagline: "", city: "", phone: "", instagram: "",
    logoMediaId: null,
    theme: { primary: "#7c6649", background: "#f7f4ee" },
    currency, preset, flowerPrices: {}, disabledFlowers: [],
    extrasCents: {}, collection: []
  },
  subscription: { status: "inactive" },
  square: { status: "not_connected" },
  published: null,
  readiness: [{ code, message }]
}
```

Collection entries contain `{id,title,recipeId:null|catalogId,design:null|JSON,cover:null|"slot-2"..."slot-5"}`. At least a recipe or a design is required. Up to four entries can be saved. `draft.logoMediaId` accepts `null` or `slot-1`. An attached media ID must already exist in this shop's SQLite storage.

Anonymous reads are guarded by a published snapshot **and** server-owned active subscription **and** connected Square status. No current endpoint can create those conditions. Before future publishing is implemented, also implement provider webhook verification, entitlement revocation, immutable published media snapshots, and a controlled activation review. This beta has no payment or order API.

## Local verification and deployment

Node 22.19+ is required. Run from the repository root:

```powershell
node --test cloudflare/platform/test/*.test.mjs
```

Tests execute the actual SQLite schema and transactions using Node's `node:sqlite`. In-memory test namespaces call the real Durable Object classes. The suite tests real signed Firebase tokens, verified-email rejection, invite checks before object allocation, atomic uniqueness races, owner isolation, private preview/media, stale versions, spoofed entitlement fields, bounded drafts/images, mutation rate caps, origins, static routes, and fail-closed provider actions. Node currently labels its SQLite module experimental.

From this directory, install the pinned development dependency if needed and run:

```powershell
npm run check
npm run dev
```

`check` is a Wrangler **dry run**. `dev` starts only a local Worker at `127.0.0.1:4192`, with state under the ignored repository `.private/qa/platform-state`. For local browser requests, override `ENVIRONMENT=local` and `PUBLIC_ORIGIN=http://127.0.0.1:4192` using local development vars. Public signup remains closed unless explicitly changed. No test token or authentication bypass exists in the deployed entry point; tests inject a verifier through the exported `makeHandler` factory.

`wrangler.jsonc` binds `REGISTRY`, `SHOPS`, and `ASSETS` with SQLite migration `platform-v1`. Static assets come from `../../platform/public`. `/`, `/login`, `/dashboard`, and `/s/:slug` serve `index.html`; `/studio/*` is served as ordinary static files. The Worker uses its `workers.dev` origin; no custom-domain route is declared.

Deployment is a separate authorized operator action: `npm run deploy` uploads to **`nebula`** only. Review the account, existing Worker migration history, generated asset bundle, and local checks before that action. Never deploy this config over a payment Worker or infer that a successful upload has enabled billing, Square, publishing, checkout, or public signup.

## Separate Lemon Squeezy adapter foundation

`lemon.mjs` is a disconnected library, **not imported by the Worker**. No route, store, configuration binding, provider account, or entitlement is changed by this foundation. The deployed billing endpoint continues to return 409. Tests use only locally mocked API responses and locally signed fixtures; no real provider API request, charge, or credential was used.

The implementation was checked against these official documents on 2026-10-28:

- [API request requirements](https://docs.lemonsqueezy.com/api/getting-started/requests): HTTPS API endpoint, JSON:API content headers, and server Bearer authentication.
- [Create a checkout](https://docs.lemonsqueezy.com/api/checkouts/create-checkout): the selected store/variant relationships, test-mode flag, enabled variant restriction, custom data, expiry, and returned checkout URL.
- [Signing requests](https://docs.lemonsqueezy.com/help/webhooks/signing-requests): HMAC-SHA256 over unchanged raw request bytes, checked against `X-Signature`.
- [Webhook requests](https://docs.lemonsqueezy.com/help/webhooks/webhook-requests): signed JSON resource payloads, event header, custom metadata, and delivery retries.
- [Event types](https://docs.lemonsqueezy.com/help/webhooks/event-types): subscription lifecycle events contain subscription resources; payment events contain invoice resources.
- [Subscription object](https://docs.lemonsqueezy.com/api/subscriptions/the-subscription-object): provider status, cancellation, renewal/end/trial dates, store, variant, and test-mode fields.

The server-only `createLemonAdapter(config, dependencies)` factory requires `testMode: true`, one fixed `storeId`, one fixed `variantId`, a test API key, a webhook signing secret, and an exact approved store host under `lemonsqueezy.com`. Its return origin is restricted to the existing Nebula Worker origin or `https://nebulastudio.site`. Live mode and client-selected provider configuration are rejected. Configuration has no defaults for credentials or product IDs and is not read from browser input.

`createCheckout({verifiedUser, shop})` must receive an already verified Firebase user and a shop loaded from trusted server storage. It rejects a UID mismatch. It generates the shop ID, owner UID, random checkout nonce, and a separate domain-scoped HMAC metadata binding on the server. It sends no custom price or client-selected variant. The API URL is fixed; HTTP redirects are forbidden; successful responses must remain test mode and match the configured store/variant. The returned checkout must use the exact HTTPS store host and matching custom-checkout path. Return links, credentials, fragments, arbitrary query parameters, unexpected expiry, cross-host URLs, and malformed responses are rejected. Requests and response reads share a bounded timeout, and provider responses are capped at 64 KiB. Errors never include provider bodies, API keys, or signing secrets.

`verifyWebhook(request, {expectedShop, expectedCheckoutNonce})` requires trusted shop/checkout context from a future server ledger. It bounds raw bytes to 64 KiB, verifies the MAC using WebCrypto before JSON parsing, checks the server-generated metadata binding and expected shop/UID/nonce, and rejects unapproved stores, variants, live-mode payloads, inconsistent event headers, and malformed subscription fields. It normalizes subscription lifecycle events into a payload fingerprint ID, event type, provider subscription ID, fixed store/variant, test-mode flag, verified custom data, subscription status, cancellation object, and period dates. `paidUntil` is a conservative mapping of the provider's renewal/end fields; it is **not proof that an invoice was paid**, and trials/past-due/paused/unpaid states receive no paid-until value.

This library deliberately returns `requiresReconciliation: true` and no activation decision. A payload SHA-256 fingerprint is a replay key because the documented webhook resource ID identifies the subscription rather than a unique delivery. A production integration still needs an atomic persistent ledger for checkout attempts, nonce bindings, duplicate events, resource ownership, webhook retries, event ordering, and entitlement transitions. Creation timeouts have an unknown provider outcome and cannot be blindly retried. Future code must handle webhook arrival before checkout persistence, confirm the actual recurring USD plan/product and price, reconcile current subscription state with authenticated provider retrieval, process payment/refund/invoice events, enforce separate test/live credentials and storage, and define cancellation/expiry/grace rules before opening access. Subscription-invoice, order, refund, and other unsupported event types are rejected for separate reconciliation rather than treated as activation. Timestamp ordering and payload fingerprints alone cannot solve stale or out-of-order events.

Run only the foundation tests with `node --test cloudflare/platform/test/lemon.test.mjs`, or run the complete beta suite with the command above. No deployed entry point uses test-injected identities or this adapter.
