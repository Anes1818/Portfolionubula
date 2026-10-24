# Lead readiness — 24 October 2026

## Approved offer

Confirmed by the owner in this chat on 24 October:

- $29 USD/month for one Nebula-hosted bouquet studio using supported layouts and existing artwork, configured with the shop’s branding, contact destination, currency and prices.
- One setup review round. One monthly batch of up to 10 price, text or contact edits. Up to 20 minutes of asynchronous support monthly. No rollover.
- Custom bouquet recreations, new artwork, seasonal changes, extra work and custom domains require an agreed separate quote.
- No payment from an enquiry or setup submission. Billing begins after approval and launch. Existing individually agreed trials, including La Flora’s free month, are unchanged.
- No promised 48-hour turnaround, unlimited revisions, automatic checkout or guaranteed sales improvement.

## Review findings and implementation

1. The gallery buried the business outcome. The request example now comes before the full gallery, with direct collection navigation. All 14 bouquets stay visible; phone cards stay in two columns.
2. Landing and builder language preferences diverged. Both now use the demo’s scoped language key, including return navigation.
3. The mobile purchase action automatically focused an input and could open the keyboard before the offer was read. It now focuses the section instead.
4. Setup promised free custom and seasonal work and a fixed $35 domain package, unlike the price page. English, Spanish, Turkish, payloads, email summaries and plan displays now use the approved offer. Four photo slots are optional references, not a free-work entitlement.
5. Invalid phone numbers could silently become Nebula’s own phone number. Setup now requires an international number and validates fields before submission.
6. Setup and lead forms copied personal information into public bouquet records and predictable numbered slots. New writes use dedicated private collections; the customer request transport no longer creates public copies.
7. The admin page required no identity and offered to make records public or enter a database secret. It now uses Firebase Google sign-in plus an explicit admin UID allowlist. Database rules enforce access independently of the page.
8. A failed database upload could be described as successfully saved photos. Failure now lists the photos that need to be sent separately; email success is accepted only after a positive service response.

## What is verified locally

- Firebase emulator compiles the actual rules: public design retrieval works; private record reads, unapproved accounts, role escalation, overwrite and deletion attempts are denied; approved-owner reads work. Historical non-bouquet payloads in public design storage are denied to anonymous readers without deleting them.
- Browser suite covers setup, EN/ES/TR copy, photo upload and reconstruction, revised offer payload, unapproved/approved admin sign-in and lead rendering. Firebase and email services are mocked; no real lead or message is sent by this suite.
- Demo suite covers all 14 cards, phone layout, language handoff, current Pink Promise, request preview, enquiry failure/success, setup prefill and the VIP gate.
- These tests do not prove that a real email reaches the owner’s inbox or that live Firebase settings have been changed.

## Account activation required

1. Publish `firebase/realtime.rules.json` in Firebase → Realtime Database → Rules. The prior live access checks returned HTTP 200 for leads, setups, customer requests and a historical setup slot; a hidden page or VIP query does not protect these records.
2. Enable Google under Firebase Authentication → Sign-in method. Under Authentication → Settings → Authorized domains, include `nebulastudio.site`.
3. Open `/admin.html` and sign in. An unapproved account sees its Firebase UID but no records. In Realtime Database, create `adminUids/<that UID>` with boolean `true`. Only approve the owner’s account.
4. Sign in again, verify the real records and check an existing customer short link in a fresh browser. No existing record has been deleted or migrated.
5. If a database secret was previously entered into the old admin page, rotate it in Firebase. The new page removes the legacy local-storage value and never asks for that secret.

The revised rules require a privileged owner to grant admin roles. Anonymous visitors can create validated, bounded submissions but cannot read them. Rate limiting/App Check and automated data-retention cleanup are separate hardening work; do not claim abuse-proof storage or automatic deletion.

## Sales handoff

Public entry: `https://nebulastudio.site/flowers/`

Private demo: `https://nebulastudio.site/demo/nebula-builder/?vip=nebula`

Short enquiry: the demo’s “For my shop” section. Full setup: `https://nebulastudio.site/shop-setup.html` after the shop’s fit and scope are discussed.

Suggested DM:

> Here’s the demo I mentioned: [demo link]. Try changing a bouquet, then open the sample request to see what you’d receive. We can set it up with your branding, supported designs and prices from $29 USD/month. Which bouquet from your shop would you want customers to personalize first?

After they show interest:

> Send me one or two examples and I’ll check how closely our existing artwork fits. I’ll confirm what’s included, any custom-work quote and the delivery date before we start. You’ll review your shop’s version before launch and billing.

Follow-up when appropriate, not an automation:

> Did you get a chance to try it on your phone? I’d especially like to know whether the design request would give you the details you need to quote a customer.

Record the shop, date, need, objection, agreed scope and next step. A positive reaction is interest; an accepted price and agreed next step are stronger closing evidence. Do not present La Flora as a paying customer or promise results that have not been measured.

## Completion gate

Do not mark the full launch goal complete until deployment, live private-read denial, owner sign-in, existing short-link reconstruction, mobile checks, and owner-confirmed receipt of a deliberately authorized test enquiry have been verified. Keep unresolved checks explicit.

Live verification on October 24: after the owner published the rules, anonymous reads of leads, setups, customer requests and the historical setup slot all returned HTTP 401. Owner Google sign-in still needs activation and verification. The admin opens on website setups and supports shop/contact search and submission dates.

October 24 release follow-up: owner confirmed Google admin access works. Live deployment bd4eb37 verified at 320, 390, 768 and 1440px, with all 14 bouquet cards, language handoff, preview rendering/scrolling and anonymous admin lock. Existing screenshot bouquet record returns HTTP 200 and its short link reconstructs successfully in the live preview. No production data was changed by these checks. Real enquiry email receipt remains awaiting owner confirmation.

Enquiry follow-up: owner clarified the missing email was expected at the submitted customer address, not the Nebula notification inbox. No automatic customer confirmation is implemented, so this is not evidence of a delivery failure. Demo enquiries now also save to the protected leads collection and appear in admin; a browser test proves saved enquiries succeed even when the notification service fails, while total failure retains the form. Actual owner-inbox receipt remains unconfirmed.


## October 25 handoff

The owner deferred the real email test. Do not send a test message without explicit authorization or claim inbox receipt is verified. Automated tests cover database-only success, email-only success, total failure with retained input, and duplicate submission prevention. The public landing notification is not an automatic customer confirmation email.

Admin search now covers the selected category: full website setups, short demo/consultation enquiries and bouquet requests. Search by shop, contact or reference; clear the field to see all records. Failed request-table loads now display an incomplete-sync warning rather than a successful sync message.

### Daily owner workflow

1. Open https://nebulastudio.site/admin.html and sign in with the approved Google account.
2. Check **Consultation & Builder Leads** for short enquiries. Open **Florist Shop Setups** for prices, photos and complete shop details. **La Flor Eterna Orders** contains bouquet requests; these are not automatically confirmed or paid orders.
3. Open the full setup and review photos, supported materials, prices and contact destination before quoting or building. Use the reply buttons to contact the lead yourself.
4. Confirm scope and any separate custom-work quote before starting. Preserve La Flora's agreed free month.
5. Send the shop preview for approval; agree the launch/billing date. Do not promise payment processing, instant delivery or a particular sales result.

Sales links: public page https://nebulastudio.site/flowers/ ; invited demo https://nebulastudio.site/demo/nebula-builder/?vip=nebula ; full setup https://nebulastudio.site/shop-setup.html . Keep the admin link for the owner.

Remaining manual verification: when convenient, submit a labelled test from the demo and check the configured Nebula notification inbox and the admin leads tab. No new customer confirmation-email feature was added.
