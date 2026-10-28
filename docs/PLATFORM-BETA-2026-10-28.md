# Nebula self-service beta — 28 October 2026

## Current release

Private beta: **https://nebula.aneslaidaoui06.workers.dev/login**.

- Worker: `nebula`, account `1b65e5ab35edeaa924ddf8fcff2e95aa`.
- Deployed version: `f3db2ebf-e29a-4688-8889-3a555dc375a2`.
- Previous user-created Hello World version, recorded before any deployment:
  `acbfe7a7-8ef2-4f6f-bc3c-3817dad4cefc`.
- No custom-domain or DNS change; GitHub Pages, the existing demo and Ray's
  storefront/payment flags are unchanged.
- Invited verified emails: `anescareer@gmail.com`, `aneslaidaoui06@gmail.com`.
  These emails grant beta access only. Firebase UID owns each private shop;
  neither email automatically grants an administration role.
- Public signup access, publication, customer orders, subscriptions and Square
  connection remain disabled. The backend rejects provider actions with 409.

## Implemented

Firebase Google/email sign-in UI, verification and recovery; one shop per owner;
atomic shop-link reservation; a responsive owner dashboard; shop identity,
logo, contact details and theme colours; stem/extra draft prices; four collection
cards with supported starting recipes; private owner preview at `/s/:slug`;
matching Order/Customise entry into the saved recipe; exact design saving with
stale-version protection; bounded, private, compressed raster images.

The initial working studio is **fresh flowers**, with 44 catalogue items, 22 extra
price keys and 15 starting recipes. The original renderer/model/geometry and
related runtime scripts are copied byte-for-byte; generated output is ignored in
Git and rebuilt with `node builder/tools/build-platform.cjs`.

Prices start empty. The owner may explicitly load sample prices for design
previews. These remain draft estimates and cannot be charged. Uploaded covers
remain merchant-selected photos; a saved design does not automatically replace
its cover photograph. An original library cover remains a starting-recipe image
until the owner selects a different cover.

Satin branding can be reserved, but the compatible self-service satin catalogue
and studio are still marked **preparing**. This does not replace or change Ray's
existing bespoke satin builder.

## Verified

- **21 Node tests**: real signed Firebase-token checks with locally generated
  certificates, SQLite registry/ownership/version/limits, current catalogue IDs,
  media validation, origin checks, provider locks; nine tests cover the separate
  disconnected Lemon adapter with local mocks and signed fixtures.
- **Real workerd + SQLite integration**: creation, unique slugs, owner isolation,
  private media, conflicts and state surviving a runtime restart. Test identities
  exist only in generated `.private` test entries, never the deployed Worker.
- **Local browser flow**: sign-in fixture, shop creation, explicit sample prices,
  logo upload, direct dashboard routes, all three original arrangement modes,
  exact design save/reload, multi-tab conflicts, mobile layout and anonymous lock.
  No real account, email or payment was created by this test.
- **Read-only deployed checks**: real Firebase SDK boot, sign-in/deep routes,
  flower image decoding, mobile layout, inactive flags, unauthorized API denial,
  private/source-file exclusion and locked anonymous preview. No live login or
  owner write has been performed by the agent.
- Fixed a deployment-only redirect loop: Cloudflare's automatic HTML redirects
  conflicted with the explicit `/index.html` SPA rewrite. Static Assets now uses
  `html_handling: none`; only explicit application paths are rewritten, and
  unknown paths remain 404. Duplicate version-preview URLs are disabled.

Screenshots and runtime state are under ignored `.private/qa/platform/`.

## Founder tasks, in order

1. Firebase → Authentication → Settings → Authorized domains → Add domain:
   **`nebula.aneslaidaoui06.workers.dev`** (hostname only, no protocol or slash).
   A read-only project configuration check confirmed on 28 October that only
   localhost, the two Firebase default domains and `nebulastudio.site` were listed.
   Google sign-in on the beta origin requires this addition.
2. Open the beta link and sign in with an invited email. If using email/password,
   verify the email. For the first technical test choose **Fresh flowers**, load
   sample prices explicitly, open a collection card, change it, save and reload.
   This is a private test shop, not a live customer storefront.
3. Continue Lemon Squeezy setup without making a live charge: enable 2FA, complete
   the required store/identity/payout review, and create a **test-mode recurring
   USD $29/month SaaS subscription variant**. Record the public store ID, variant
   ID and store checkout hostname. Do not send API keys, passwords or webhook
   secrets in chat or commit them. Provider wiring and its real test checkout
   come after those settings exist.
4. Square developer application/test sellers are a later separate step. The
   florist's bouquet revenue belongs to their Square account, while Lemon
   collects Nebula's software subscription.

## Work still required before customer launch

The separate `cloudflare/platform/lemon.mjs` test-only adapter is not imported by
the Worker. It validates fixed-provider checkout requests and signed subscription
payloads, but cannot persist billing or activate access. Still needed: durable
checkout/event ledger, current-provider reconciliation, invoice/refund/renewal
handling, entitlement transitions, billing management UI and real Lemon test
acceptance with the approved product. Success-page visits must never activate a
shop.

Also pending: self-service satin support; full approved pricing/fulfilment/tax
policies; immutable published configuration/media; generic per-merchant Square
configuration/OAuth; real Square Sandbox acceptance; controlled publication and
new-order enablement. Existing Ray-specific payment pricing must not silently
become a policy for every merchant.

Do not open public signups, switch provider flags, migrate the domain, or represent
this beta as a completed subscription or online-payment service yet.

## Rebuild/check

```powershell
node builder/tools/build-platform.cjs
node --test cloudflare/platform/test/*.test.mjs
node builder/tests/platform-durable.cjs
node builder/tests/platform-browser.cjs
node builder/tests/platform-live.cjs
```

The last three use installed or cached Miniflare/esbuild/Playwright dependencies;
see their headers. Browser tests use the installed Edge. The live test is strictly
read-only. Worker config and technical details are in
[`cloudflare/platform/README.md`](../cloudflare/platform/README.md).
