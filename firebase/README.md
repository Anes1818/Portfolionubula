# Active: direct Realtime Database pilot

The site currently uses `b/database.js` with provider `realtime` in `b/config.js`.
The owner published `realtime.rules.json` in Realtime Database. No Worker,
Cloud Functions, secret, billing upgrade or anonymous-auth setup is required.

Data lives under `nebula/la-flor-eterna/designs/<id>` and
`nebula/la-flor-eterna/requests/<id>`. Each private request contains customerName,
code (full bouquet recipe), shortUrl, requestedDate, method, reference and
status=prepared. Names are fields, not IDs, to avoid same-name collisions.
The console owner can inspect requests; public clients cannot read them.
Public links allow only individual unexpired design reads, not collection listing.
Writes are validated and immutable; identical retries are allowed. No deletion
or arbitrary-field writes are allowed through this client route.

This is an unauthenticated create-only pilot, not the rate-limited Worker path.
It has no application rate limit; do not assume CORS or the public API key
prevents spam. Monitor Spark quotas. The later Cloudflare implementation can
replace creation, but retain the existing Realtime link resolver for old links.
Records are not automatically deleted; public links expire after 90 days.

The opt-in `builder/tests/realtime-live.cjs` creates one clearly labeled sample
request in the real database and checks public access isolation and reconstruction.
It never sends a message to the florist. Use `NEBULA_LIVE_TEST=1` to run it.

The Cloudflare instructions below are for an optional later migration only.

# Superseded deployment: use Cloudflare

The active deployment instructions are in `../cloudflare/bouquet-links/README.md`.
Do not deploy these Cloud Functions or enable Blaze for the new Cloudflare route.
`functions/core.js` remains the shared validated service used by the Worker.
The notes below describe the earlier, inactive Cloud Functions implementation.

# Bouquet snapshot links — prepared, not deployed

Project: `la-flora-6ed47`. Firestore `(default)`, region `us-central1`.
The current static site remains on GitHub Pages. `b/config.js` is disabled until
the backend, registered web app and App Check have passed deployment checks.
No customer files are uploaded. Firebase Storage is not used.

## Remaining console setup

1. Project settings → General → Your apps → Web (`</>`). Register **Nebula Bouquet**.
   Do not enable Firebase Hosting. Copy the public `firebaseConfig` object.
2. Register that web app in App Check using reCAPTCHA Enterprise. Authorize
   `nebulastudio.site` (and `www.nebulastudio.site` if used). Supply the public site
   key for the frontend. No service-account private key belongs in this repository.
3. Blaze billing is required to deploy Cloud Functions. Set billing alerts;
   alerts, maxInstances and application quotas are not hard spending caps.
4. Authenticate the Firebase CLI interactively on the owner's machine. Deployment
   uses its credentials, not a copied private key.

## Deploy after owner confirms billing

From `firebase/functions`: `npm ci`, `npm test`.
From `firebase`: `firebase deploy --project la-flora-6ed47 --only firestore,functions:bouquetLinks`.
Supply `BOUQUET_WEB_APP_ID` when prompted (the public web app's appId).
Deploy Firestore rules only after checking that this new project has no unrelated
clients depending on permissive rules. These rules deny all browser database access.
Confirm the reported endpoint; expected:
`https://us-central1-la-flora-6ed47.cloudfunctions.net/bouquetLinks`.
Configure firebaseConfig/site key in `b/config.js`; verify App Check and API behavior
before enabling and publishing the static build. Keep the feature disabled if any
deployment step fails. Local/saved long links keep working without this service.

## API and data

- POST `/designs`: allowlisted shop, bounded version 6/7 bouquet code, purpose
  (`share` or `request`), random request key. Requires a valid App Check token from
  the registered app and allowed browser origin. Origin checking alone is not auth.
- GET `/designs/{id}`: read one unexpired design via its random 128-bit capability.
  No listing/search API. Anyone who receives the link can read the design.
- Public design links contain no customer name, phone, requested date, private
  title, card note or message. Deliberately visible lettering is part of the design.
- POST `/requests` stores a separate private `requestDrafts` record: customer name,
  requested date, pickup/delivery, design ID, shop ID, reference, creation/expiry
  timestamps and `status: prepared`. The form discloses this storage. No phone,
  address or free-text notes are retained. Request records have no public read API.
  Shared design IDs never grant access to request records. Retention is at most
  90 days, with TTL cleanup and immediate server-side expiry checks for designs.
  A future admin portal requires Firebase Authentication plus server-enforced
  shop membership. A hidden URL is not access control; no admin UI exists yet.
- `bouquetLinks` and retry keys expire after 90 days. Code rejects expired records
  immediately; Firestore TTL deletes asynchronously. TTL billing still applies.
- `linkMetrics/{shopId}_{UTC-date}` counts immutable saves by purpose, not completed
  shares, SMS delivery, real customers, paid orders or physical bouquets made.
  Repeat attempts with the same request key count once. A new browser session can
  count the same design again. Pilot tests count too; establish the real trial date.
- `preparedRequests` counts private form snapshots; it is not evidence of sending
  a message or of a sale. Sharing a design alone does not create a customer record.
- Daily application limits: 200 new saves total for the shop, 20 per visitor IP
  across shops. Raw IPs are not stored by application code; daily hashes expire
  after two days. Shared connections may hit a limit and fall back to long links.
- Min instances 0, max 2. Public reads and rejected requests still incur potential
  costs. Monitor usage; these settings do not guarantee a maximum invoice.

## Tests

`node --test firebase/functions/test/*.test.js`
`node builder/tests/short-links.cjs` (local preview on port 4174; browser API and
App Check responses mocked, no customer data sent to Firebase).
Run the existing shop checks with the feature disabled. Once deployed, verify a
single approved sample on the real backend, retry idempotency, a short link opened
in a fresh browser, expired/invalid link recovery, and the original long-link path.

Photo-in-bouquet uploads and a dashboard are intentionally outside this release.
