# Cloudflare + Firestore short links

Prepared locally; not deployed. No Firebase Cloud Functions, Firebase browser SDK,
Anonymous Authentication or App Check setup is required for this route.
The existing website remains on its current host. Do not enable Firebase Blaze
for this implementation. Both providers' free-plan usage limits still apply.

## What is saved

Firestore (not Realtime Database):

    nebulaShops / la-flor-eterna / requestDrafts / <unique request ID>

Each request document contains customerName, code (complete bouquet recipe),
shortUrl, designId, requestedDate, method, reference, status=prepared, createdAt
and expiresAt. No phone, address or free-text note is stored. Names are fields,
not document keys: two customers with the same name cannot overwrite each other.
Shared snapshots and counters are sibling subcollections under the same shop.
The public API only returns the design, shop ID and expiry, never customer data.
There is no public collection listing, request-reader or admin page.

Links stop resolving after 90 days. This Worker does NOT automatically delete
Firestore records; records remain for the owner to manage. Do not enable paid
Firestore TTL just to use this version. Counts describe prepared/saved drafts,
not confirmed orders or sales. Existing unrelated collections are untouched.

## Cloudflare setup

1. Make sure Cloud Firestore `(default)` exists in `la-flora-6ed47`.
   The Realtime Database URL shown in the screenshot is a different product.
2. Use a Google service account with Cloud Datastore User (`roles/datastore.user`)
   on this project. Generate its JSON key privately. Never commit or send the key
   in chat; the public firebaseConfig/apiKey is NOT this server credential.
3. Deploy the Worker from this directory:

       npx wrangler@4.151.3 login
       npx wrangler@4.151.3 deploy

   This publishes the code, initially unable to save until the secret is added.
   Do not run `firebase deploy` or change website DNS/hosting.
4. Cloudflare dashboard → Workers & Pages → nebula-bouquet-links → Settings →
   Variables and Secrets → Add. Type: Secret. Name: FIREBASE_SERVICE_ACCOUNT.
   Paste the complete service-account JSON as its value and deploy the change.
   FIREBASE_PROJECT_ID is already set to la-flora-6ed47 in wrangler.jsonc.
5. Copy the exact deployed https://...workers.dev URL to `b/config.js` endpoint
   (no trailing slash). Keep provider='cloudflare'. Enable only after live checks.
6. Publish `b/`, the builder runtime and generated shop files through the site's
   usual GitHub deployment. No Cloudflare secret belongs in those files.

Keep Firestore browser reads/writes denied for the nebulaShops subtree. Review
existing rules first: broad allow rules override narrower denials. Do not replace
rules for an existing orders app blindly. The Worker uses service-account IAM,
not browser security rules.

## Validation

    node --test worker.test.mjs
    node --test ../../firebase/functions/test/core.test.js
    npx wrangler@4.151.3 deploy --dry-run --outdir dist

From repository root, local site on 4174:

    node builder/tests/short-links.cjs

Tests use fake credentials and mocked Firestore/API responses, not live saves.
After deployment: health should say configured=true (presence check only), then
prepare a sample request named TEST, verify its private Firestore document,
open its short link in a fresh browser, and repeat preparation to check retries.
Delete test records through the console afterwards if desired.

## Limits and failure behavior

Only the two Nebula website origins receive browser write access. CORS is not
authentication: a non-browser caller can spoof Origin. Inputs are bounded and
validated; atomic limits cap new design saves and prepared requests separately
at 200/shop/day and 20/IP/day. No raw IP is stored; hashes rotate daily.
This does not prevent every abuse or cap reads/invalid attempts. Cloudflare rate
limiting/Turnstile can be added if needed. Monitor free-plan quotas.

Missing secrets, database errors and exhausted save quotas leave the original
long-link/message fallback available. The site never claims a failed save worked.
Requests are immutable snapshots; future updates/admin access need explicit
shop authentication. The current API cannot enumerate customer records.
