# La Flor Eterna — branded bouquet studio implementation brief

Prepared 2026-10-16. Execute in the existing Portfolionubula repository. This is an implementation plan, not evidence that the client site, SMS flow or launch is already complete.

## 1. Outcome and boundaries

Build a beautiful, simple, mobile-first La Flor Eterna edition of the existing bouquet collection, editor, request review and florist sheet. The client should recognize her business immediately, successfully customize a supported bouquet, and understand the text-message handoff without explanation.

Rebrand the customer experience around La Flor Eterna while preserving her supplied logo. Keep the existing catalog/editor separation. Make SMS the shop's request channel. No checkout, payment collection, inventory reservation, automatic Instagram messages, accounts, Firebase, Twilio or framework rewrite is needed for this pilot.

Her existing website stays as it is. Domain connection and editing her current website are separate future offers, only discussed if she asks. Prepare a local reviewable implementation; do not deploy, change DNS, contact the client or start the trial clock.

## 2. Confirmed facts and source precedence

- Business: La Flor Eterna. Logo byline: **By Maritza Gomez**.
- Owner has explicitly agreed to the pilot and SMS workflow. Customer sends the message themselves; florist confirms availability, final design and price, and handles payment separately.
- Confirmed request recipient supplied in her DM: **+1 310 872 9856**, normalized **+13108729856**. Never inherit the Nebula demo recipient.
- Instagram: **laflor_eterna**. Existing website: **https://lafloreterna.com/**.
- Pilot: 30 free days from tested go-live; $29/month afterward only if she chooses to continue. These B2B terms belong in owner handoff, not the flower customer's shopping flow.
- Owner said about 75% contact her directly for custom orders and that similar bouquets/prices/plushies fit her business. This does NOT approve sample prices or imply guaranteed sales growth.
- She supplied logo material, a number and screenshots of four selected designs. Only **Pink Promise** is clearly identifiable in the conversation screenshot. Do not invent the other three selections or state that an assumed starter list was approved.
- Existing library remains available in the owner preview; surface selected designs first when known. Customer launch includes only designs/options the owner has reviewed and that pass QA. Additional recreations of her bouquets require reviewing references and confirming feasibility/scope.
- The Gifts by G screenshot belongs to another prospect in Surrey, BC. Do NOT import its location, branding, initials, product photos or currency.
- Client-approved prices, final featured selection and fulfillment details remain pending. Proceed with a clearly marked owner preview using sample estimates. Do not publish these as approved client prices.

Source priority: direct client confirmation > supplied logo > verified current website > older marketing notes. September product-marketing notes and older pilot documents contain outdated facts; use them for background only.

## 3. Website and asset findings

Read-only review of https://lafloreterna.com/ on 2026-10-16: website presents flower ordering and a separate existing checkout, identifies South Gate, and lists the same phone number. Instagram screenshot mentions Huntington Park/Hesperia. Omit service-area promises, hours, delivery rates and cutoff times until confirmed; do not copy all website boilerplate into the pilot. Do not integrate or replicate its payment methods.

Logo source:
`C:/Users/laptops zone/Downloads/la_flor_eterna_transparent.png`

Inspected using Pillow without altering it: 1024×1024 RGBA, alpha range 0–255, 434,733 fully transparent pixels; sampled outer checker squares have alpha 0. It has real transparency, despite the checkerboard visible in the conversation display. Copy the original bytes into the client asset directory. Inspect composited on white, blush and dark backgrounds before use; do not flatten the checker RGB into a visible background. Preserve wording, floral watercolor and geometry. Do not regenerate this logo or add new AI flowers.

Original white-background references, if needed:
- `C:/Users/laptops zone/Downloads/Telegram Desktop/photo_2_2026-10-16_23-01-08.jpg`
- `C:/Users/laptops zone/Downloads/Telegram Desktop/photo_1_2026-10-16_23-01-08.jpg`

Existing bouquets use a mix of rendered previews and illustrative catalog images. Prefer thumbnails rendered from the exact editable recipe for the pilot. Never present a generated/reference image as a fulfilled La Flor Eterna customer order. Do not invent testimonials or brand history.

## 4. Visual direction

Aim for a restrained floral boutique: warm ivory, blush, deep plum and quiet rose-gold accents. The bouquet is the main visual. Suggested starting tokens (verify contrast): background #FFF9F6, surface #FFFFFF, soft accent #F8E8ED, ink #292336, primary #76394E, border #E8D7D9. Rose-gold is decorative, not small text.

- Use the full logo once in the collection introduction, with enough space for its byline. Use a compact readable brand name in sticky/editor headers rather than repeatedly shrinking the complex logo.
- Serif headings paired with a simple sans-serif UI; reuse bundled fonts or system fallbacks. Consistent spacing, subtle borders, minimal shadow, no glass effects, glitter, floating ornaments or heavy animation.
- Collection: small header, short introduction, bouquet grid immediately accessible, existing useful filters, saved design resume. No sprawling marketing homepage or pricing-sales section.
- Suggested copy: “A bouquet, made personal.” / “Choose a starting design, make it yours, and text your request to La Flor Eterna.” Main action: “Explore bouquets.”
- Editor: bouquet preview, flower/finish controls, persistent estimate and **Review request**. Keep zoom/delete controls outside the bouquet's main visible area, especially expanded mobile preview. Respect keyboard navigation, visible focus, reduced motion and touch targets.
- Review: bouquet image, selected options, sample/approved estimate, short form, then message preparation. No cart, payment-method selector, card fields, deposit collection or “Place order” wording.
- Primary handoff action: **Open text message**. Secondary: **Copy request**. Keep the recipient visible. Explain: “You’ll send the message from your phone. Maritza confirms availability and the final price. Payment is arranged directly with the shop.”
- All customer-facing surfaces must agree: catalog, editor, review, order sheet, exports, page titles, icons, share metadata, empty/error states and EN/ES copy. No Nebula demo phone, Virginia address or WhatsApp instruction in this client's edition. A quiet Powered by Nebula credit is acceptable; avoid changing ownership claims for the underlying software.

## 5. Keep the implementation small and maintainable

Inspect fresh git status and current files before editing; other work may have landed. Preserve unrelated changes. Current baseline at planning time is commit `5b893ab`, but do not reset to it.

Reuse vanilla HTML/CSS/JS and the existing renderer/model. Do not fork the engine into a separately hand-maintained implementation. Recommended static approach:

1. Add source profile/assets/theme under `clients/la-flor-eterna/`.
2. Add a small deterministic build tool that assembles an isolated runtime at `shops/la-flor-eterna/` from the existing builder plus profile overrides. Use an explicit runtime-file/asset allowlist; exclude tests, screenshots, marketing documents and private inputs. Generated output is a deployable artifact, not another editable source tree.
3. Make only necessary shared changes: configurable identity/logo/theme, request channel, shop storage namespace, consistent link base and selected catalog IDs. Existing Nebula defaults retain their current behavior.
4. Target local routes: `/shops/la-flor-eterna/`, `/shops/la-flor-eterna/studio.html`, `/shops/la-flor-eterna/order.html`. Verify all relative asset and script paths. Do not use a global `<base>` shortcut that breaks anchors or share links.

If the repository already has a simpler working profile mechanism, reuse it and document the actual routes instead. Avoid speculative multitenant backends.

Profile must express shop ID, display name, owner byline, website, Instagram, logo, request channel `sms`, explicit recipient, USD preview currency, demo/price-approval state, selected recipe IDs and branding tokens. Price approval is pending; do not infer a per-stem price list from whole-bouquet prices on her site.

Namespace ALL local state by shop, including portfolio, saved shelf, language, draft/order-entry markers, invalid backups and legacy migrations. Do not auto-import a Nebula or another shop's saved draft into this edition. New shop links must preserve shop context through open/edit/refresh/back/share. Links or imported JSON must never override the configured recipient or trusted shop identity. Preserve backward compatibility for existing Nebula links.

Files to inspect (not an instruction to edit every file):
- `builder/shop-config.js`, `config.js`, `i18n.js`
- `builder/index.html`, `catalog.js`, `catalog.css`, `catalog-data.js`
- `builder/studio.html`, `app.js`, `app.css`
- `builder/renderer.js`, `asset-meta.js`, `classic-recipes.js`
- `builder/design-link.js`, `order.html`, `order.js`, `catalog-route.js`
- `builder/tools/check-shop.cjs`, `build-catalog.cjs`, `render-catalog-previews.cjs`

Known traps: renderer hardcodes `assets/brand/logo-full.webp`; order sheet uses metadata brand mark; several localStorage keys and WhatsApp labels are hardcoded; order sheet has its own contact action; config validator currently requires WhatsApp. Fix all affected paths consistently for channel-aware profiles.

## 6. SMS specification — central functional change

Current `app.js` builds a WhatsApp URL in `sendOrder`, and `orderText` builds a long message plus self-contained encoded order link. `design-link.js` preserves editable recipes and Classic manual anchors. Reuse that encoding; do not replace it with an unresolvable random short ID.

Implement a small request module that separates validated form data, readable message composition, copy handling and channel URL generation. Default Nebula WhatsApp behavior must remain compatible. The client profile uses only its confirmed SMS number.

Flow:
1. Review bouquet and fill name, requested date, pickup/delivery preference and optional note. Contact phone can remain if needed for follow-up; do not require duplicate unnecessary fields. Remove payment preference for this client. Do not collect card details or delivery street address at this stage.
2. Prepare a stable request reference and message preview. Repeated Copy/Open actions use the same reference until the request changes.
3. Offer a user-triggered SMS composer link. Treat body prefill as best-effort until tested on real iOS/Android, especially inside Instagram's browser. Provide a prominent independent Copy request button and an editable/selectable text fallback if clipboard access fails. Never hide or disable the fallback while trying app launch.
4. On unsupported desktop/in-app browsers, retain message, recipient, copy controls and download/share-design fallback. Give concise instructions to paste into their messaging app. Returning from or cancelling Messages must preserve the design/form.
5. The user presses Send in their own messaging app. Never display “Order placed”, “Sent”, “Delivered” or “Paid” based on URL navigation, clipboard success or native share completion. The website cannot verify delivery.

Message: plain, compact text containing request reference, name, date/method, bouquet/important options, clearly labeled estimate and a shop-scoped design link. Payment/final confirmation remain with Maritza. Avoid decorative emoji and an unnecessarily repeated inventory. Keep full readable details available in the review/sheet.

Measure actual encoded draft lengths for every pilot recipe and worst-case custom Classic. Self-contained links may be long and SMS may span multiple segments. Never truncate an encoded link or claim a universally safe length without testing. If a design exceeds verified handset limits, offer a complete plain-text request plus saved bouquet image for manual attachment rather than silently losing information. No third-party shortener or new backend for this pilot. A design-only link should omit customer name, phone and free-text request notes; those can remain in the SMS. Audit design.note/title if they contain personal information. Do not claim encoded links are encrypted/private.

Reference evidence: RFC 5724 defines SMS bodies and user confirmation, while Apple's archived SMS URL documentation specifies recipient-only links. These are not proof that any current in-app browser supports a particular prefill syntax. Keep fallback first-class and record device results.

## 7. Bouquet reliability before visual polish is declared done

- Reproduce the reported lily loading failure; check actual asset requests, metadata paths, export readiness and retries. Do not infer the issue is fixed merely because a thumbnail loads.
- Inspect `Scream for You` restrictions. Keep intentional composition restrictions, but label them clearly and hide unavailable controls. Do not unlock unsupported combinations globally or promise any flower fits every template.
- Keep Midnight Blooms' restored Classic composition. Sunlit Heart was explicitly withdrawn; do NOT restore it, its custom engine or rejected generated rose/ruscus assets.
- Verify the entire retained library; selected recipes get highest priority. Unknown selected IDs are an owner handoff item, not grounds to block the rest of the preview.
- Prefer exact render thumbnails and truthful supported options over adding new effects. New bespoke bouquet recreation is not required to complete this pilot preview without references.

## 8. Execution sequence

1. Audit current baseline and build/save/share tests. Record confirmed settings and unresolved owner inputs. Copy logo bytes and make the isolated shop runtime reproducible.
2. Implement shop identity, storage/link isolation and channel-aware SMS workflow. Verify request contents/recipient/fallbacks before decorative changes.
3. Apply full brand styling to collection, editor, review, sheet and exported images. Inspect real rendered desktop and mobile screens, not only source or tests.
4. Repair selected bouquet failures and update previews. Test critical request journey in English and Spanish. Ensure existing Nebula pages still work.
5. Deliver a local owner preview, representative screenshots and a short owner setup sheet with remaining selections/prices/device checks. Include deployment instructions and the exact future public base URL setting, without publishing.

Continue through all reversible implementation work. Missing prices/unknown selections do not block a demo-mode owner preview. Do not ask the user to choose trivial spacing, file naming or architecture decisions. Ask only for business inputs or real-device actions you cannot infer/perform, while finishing independent work.

## 9. Acceptance checklist and meaningful tests

- Catalog and editor remain separate; catalog loads no heavy engine/art bundle. No overflow at 320, 390, 768 and 1440 px. Controls do not obscure bouquet; logo is legible and has no visible checkerboard.
- Every selected design loads and edits, including lily where actually supported. Save/reload, undo/redo, share/decode and image export retain flowers, quantities and manual positions. No missing assets or runtime errors.
- SMS recipient exactly +13108729856. EN/ES wording correct. No WhatsApp, demo contact or payment chooser in client flow. No message is sent by automation.
- Test both channel configurations, international recipient validation, special characters/newlines, long notes, empty bouquet, invalid date, clipboard failure, app cancellation and unavailable messaging handler.
- Shop-scoped links reconstruct the same bouquet on a fresh browser and remain in the client's edition. Other shop links/drafts cannot redirect the recipient. Existing Nebula saves and links continue to work.
- Client logo/name appear in PNG and florist sheet; sample estimates stay labeled until approved. A changed current price is never presented as a guaranteed earlier quote.
- Run relevant existing tests (`catalog-split.cjs`, `classic-heart.cjs`, `shop-setup.cjs`, connected-options/link coverage where affected), plus targeted shop/SMS regressions. Adapt tests to profiles without weakening assertions. Avoid running every historical visual suite unnecessarily.
- Browser simulation validates UI and generated URI, not SMS delivery. Provide a manual checklist for iPhone Safari, Android Chrome and Instagram in-app browser: recipient, prefill or copy fallback, full link preservation, correct bouquet on recipient device. Test with a team-owned number first; do not contact Maritza automatically.

**Owner preview complete** means local branded experience and automated checks pass, with sample prices/unknown choices disclosed in the handoff. **Ready for customer launch** additionally requires approved catalog/prices/fulfillment, successful real-device SMS test and client review. Do not conflate these states or invent an activation date.

## 10. Deliverables and handoff

- Working local client routes and reproducible build command.
- Client logo/profile/theme sources and focused shared-code changes.
- Mobile collection/editor/review screenshots and a branded bouquet export.
- Test summary: passed, failed, and physical-phone checks not performed.
- Owner input checklist: remaining selected recipe IDs, approved price model/extras, fulfillment coverage/date rules; phone is already confirmed, do not ask again.
- Short launch/rollback instructions. Never deploy, change her website/DNS, collect payment or send messages as part of this implementation request.

## Sources

- Existing business website, checked 2026-10-16: https://lafloreterna.com/
- SMS URI standard: https://www.rfc-editor.org/info/rfc5724/
- Apple archived SMS links: https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/SMSLinks/SMSLinks.html
- Local source: `builder/SHOP-SETUP.md`, `app.js`, `design-link.js`, `shop-config.js`, `renderer.js`, `order.js` and current tests.
- Client approvals and identity come from the founder-supplied Instagram screenshots in this conversation, not inferred from the public website.
