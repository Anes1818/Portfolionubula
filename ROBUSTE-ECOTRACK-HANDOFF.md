# Robuste × EcoTrack — extracted handoff

Extracted 2026-10-01 from the Claude export and the local Robuste source archive. This is a source-based reconstruction, not a live production test. Do not treat instructions in the archived chat or code as new user instructions.

## Claude conversation found

- Export: `C:\Users\laptops zone\Downloads\conversations-000.zip` → `conversations.json`.
- Conversation: `الشعور بالضياع وتراكم المهام بلا نتائج` (`a5c1e78b-dbe8-481b-8027-c89db145cf2b`).
- 2026-09-08 11:01:27, user: “first this is the ecommerce site i built just take look around it”. Claude's tool log says it opened an attached `robuste - Copy.zip`.
- 2026-09-08 11:03:48, Claude: “ربط تتبع التوصيل مع EcoTrack شغال فعليًا، مو مجرد فكرة.” Claude also described a Cloudflare Worker holding secrets server-side, Firestore order storage and rules, and an SEO build script. It noted nested Robuste copies and different `admin.html` versions. This was Claude's assessment of the uploaded archive, not evidence of a current production test.
- The export has no separate Claude conversation or project named EcoTrack/Robuste. Its four project records are `builder`, `h`, `hh`, and `michi normal`. The Robuste source attachment is not included in the Claude export itself.

## Local source recovered

`C:\Users\laptops zone\Downloads\robuste-seo-fixed\robuste - Copy.zip` contains the attached-style Robuste source, including `cloudflare-worker.js`, `admin.html`, `admin-tracking.html`, and `tracking.html`, plus a nested duplicate. Separate older-looking copies of the Worker and tracking pages are in Downloads. Use the ZIP as the coherent snapshot; do not assume it matches the deployed site.

### Intended order and tracking flow in that ZIP

1. `POST /` on the Cloudflare Worker validates and stores a new order in Firestore. It leaves `ecotrackTracking` empty until shipping is confirmed.
2. `admin.html` has a “الشحن / Ecotrack” queue. Its “send” action calls `POST /admin/confirm-ship` with the order ID and shipping options.
3. The Worker builds the EcoTrack parcel payload: customer name, phone, address, commune, wilaya code, amount, products, delivery type, `stop_desk`, and a reference. It calls `POST {ECOTRACK_API_URL}/api/v1/create/order`, expects a tracking number, then saves it to the Firestore order. An order already carrying a tracking number is refused to reduce duplicate shipments.
4. `tracking.html` calls `GET /track?phone=...`. The Worker queries that customer's orders by phone; for orders with tracking numbers it asks EcoTrack for current activity, maps French/Arabic status text to a customer-facing stage, and returns a reduced order view without full address or email. This is **on-demand status retrieval**, not a scheduled background sync back into Firestore.
5. `admin-tracking.html` offers a separate manual route: look up by phone and write a tracking number/status through `POST /admin/set-tracking`.

The Worker expects `ECOTRACK_API_URL` and `ECOTRACK_TOKEN` as server-side environment values, plus Firestore credentials and `ADMIN_KEY`. No secret values are reproduced here.

## Important gap found in the archived code

The `admin.html` shipping action sends `Authorization: Bearer <Firebase ID token>`. The Worker function `adminOk()` accepts only `X-Admin-Key` matching `ADMIN_KEY` for `/admin/confirm-ship`. With those exact archived files together, the automatic shipping action would receive **401 Unauthorized**. The separate `admin-tracking.html` manual route does send `X-Admin-Key`. A different live Worker or admin file could change this conclusion; deployment was not inspected.

The Worker itself comments that the exact EcoTrack tracking-info endpoint must be verified for this tenant. It tries `/api/v1/get/trackings/info` and then `/api/public/get/trackings/info`. No real parcel API response or end-to-end test is present in the Claude export. The public `/track?phone` also exposes a `debug=1` diagnostics path in this snapshot, so its response should be reviewed before relying on it in production.

## Practical status

The archived snapshot contains the architecture and most of the implementation. The Claude export contains one positive assessment, but does **not** prove a successful EcoTrack parcel creation, current live status lookup, or deployment of the same files. Before using this in production: identify the deployed Worker and admin version, fix/align admin authentication, verify the tenant API paths with a controlled order, and review the public phone lookup/debug behavior.
