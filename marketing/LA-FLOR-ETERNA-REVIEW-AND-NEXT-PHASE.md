# La Flor Eterna — implementation review and next phase

Reviewed 17 October 2026. Scope: local owner preview, source inspection, browser verification, asset inventory and planning. No publication, customer messages, image generation or application fixes were performed in this review.

## Decision

Keep the completed client foundation. It is a useful branded owner preview, not yet a faithful reconstruction of Maritza's bouquets or a customer-ready launch. The next milestone is **one convincing editable pink rose bouquet, with a reliable text-request journey**. Expand only after inspecting its assembled result at phone size.

Do not replace the renderer/framework, add checkout or introduce a database for this milestone. Do not resurrect Sunlit Heart. Preserve Nebula and the restored Midnight Blooms arrangement.

## What was verified

- Re-ran `node builder/tests/la-flor-eterna.cjs`: all 62 checks passed. The resulting `clients/la-flor-eterna/qa/results.json` records no unexpected missing resources or JavaScript errors. It explicitly records `physicalSMSDeliveryTested: false`.
- Reviewed generated mobile catalog/editor/request screenshots and the source files for build, configuration, request composition, rendering, Classic recipes and client translations.
- Independently simulated live mode in a browser by intercepting the local shop-config response only. No profile files were changed. Confirmed a selection restriction gap described below.
- Other tests listed by the implementation agent in `clients/la-flor-eterna/OWNER-PREVIEW.md` are reported evidence; this review did not independently rerun every suite.

Working foundation:

| Area | Result |
|---|---|
| Client identity | La Flor Eterna, supplied logo, ivory/blush/plum styling, EN/ES |
| Catalog/editor separation | Separate pages; catalog does not load the complete editor engine |
| SMS recipient | Trusted profile points to +13108729856 |
| Request behavior | Prepares text; customer opens their messaging app and presses Send themselves |
| Recovery | Copy request, selected-text fallback if clipboard fails, text without design link, image download |
| Payments | No payment picker/checkout in the client request flow; shop confirms and collects separately |
| Persistence | Client drafts/language/saved bouquets isolated from Nebula |
| Shared design | Reconstructs in a fresh browser; title/card note/contact fields are omitted from SMS design links |
| Assets | Lily loading/export and simulated transient/persistent failures pass current tests |
| Pricing | Clearly sample USD values; owner approval flags remain false |

## Findings, ordered by importance

### 1. Live selection restriction is incomplete — fix before customer launch

Evidence: `builder/app.js:682` blocks unselected `?template=` entry and the build filters live catalog cards. But `renderStarting()` at `builder/app.js:239` still exposes all featured presets and Midnight Blooms; mode switching is unrestricted.

Independent reproduction: intercept only the local shop-config response to set `demo:false`, with `selectedRecipeIds:["pink-promise"]` unchanged. Open Pink Promise, click Classic, expand its starting designs, choose Midnight Blooms, confirm. Result: `mode:classic`, `engine:classic-gathered`, `title:Midnight Blooms`, 23 items. Romantic/Pure white/All yellow are also displayed. This is a product-scope restriction gap, not evidence of a security breach.

Fix: one shop capability policy used by catalog, starting designs, mode selection, recipe application, restoration/import, shared links and request preparation. Clarify the distinction between approved recipes and approved custom options. An old unsupported design may remain viewable for recovery, but must not silently become a supported order. Explain the restriction and offer a supported starting point; do not destroy a saved draft.

Acceptance: a live shop with one approved recipe cannot prepare a request for an unsupported recipe through another UI entry or a saved/shared design. Nebula remains unrestricted under its own configuration.

### 2. The current art does not yet represent her supplied bouquets

The pink mobile preview is a regular overhead rose disc with a ruffled white collar. Her photo has dusty pink roses at varied angles, branching baby's breath, peach gingham/ivory folded paper and a large satin bow over the flowers. These are structural differences, not a color/theme adjustment.

Classic already supports anchors, multiple rendering branches, shared links and photographic assets. However, the gathered recipe uses a fixed fan wrap and mostly head images, while the general Classic renderer uses a different front/back wrap system. Filler/decorations also contain mode-specific restrictions. Extending those ad hoc for every photo would become fragile.

Fix: add one explicitly versioned, recipe-driven photographic composition family, reusing current canvas, history, assets, serialization and pricing infrastructure. Keep legacy engines intact. Validate a complete pink arrangement before adding another family.

### 3. SMS is implemented, but real-device delivery remains unverified

`builder/request.js` composes SMS URLs; `builder/app.js:379` prepares the request. Existing tests validate recipient/text/encoding and simulate cancellation by preventing navigation. They do not open native Messages or deliver a message.

`publicBaseUrl` is empty, so local drafts contain a loopback URL that Maritza cannot open remotely. This is expected for the current local preview, but is a launch blocker.

The measured local Midnight request was 1,844 characters; the stress case was 3,068 characters with a 6,986-character SMS URI. These are measurements, not guaranteed handset limits or counts of SMS segments. Long state links are a real usability concern that needs a phone test.

Fix order:

1. Keep the manual-copy and image alternatives.
2. Reduce repeated prose and use compact, versioned recipe/configuration links where possible; retain complete legacy decoding and custom-state fallback. Never truncate an encoded design.
3. Use a real reachable HTTPS preview when publication is authorized, then test iPhone Safari, Android Chrome and Instagram's in-app browser. Test recipient/text/newlines/accented characters, cancellation, long links and reopening the exact design on the receiving phone.
4. Use a team test number for an actual delivery trial. Do not send unsolicited test requests to Maritza.
5. Consider stored short links only if tested client-side links are inadequate. A backend is a separate decision with access, retention, privacy and operating costs; Firebase is not required for the visual milestone.

### 4. The florist receives an editor link rather than the simpler sheet

`builder/app.js:289` clears SMS private fields and sets `order=null`, then chooses `studio.html`. A separate `smsSheet` link points to `order.html`, but that is a button in the sender's UI, not the default link in the message.

Both links work. This is a workflow improvement: send the clean design link to the read-only florist sheet, with an explicit secondary “Open in studio” action. Do not restore customer/card data to the URL. Keep customer details in the message. The sheet must say current estimate and must not claim to be a stored/accepted order.

### 5. Request UI and editor expose too much internal terminology

Visible examples: “FIXED TEMPLATE SIZE”, “slots”, painting slots, and the SMS “encoded characters” counter. The SMS handoff also puts many troubleshooting sentences ahead of the main action. These details are useful for diagnostics but increase customer effort.

Proposed default journey:

**Choose bouquet → Personalize → Review → Open text message.**

- Keep the bouquet large and controls limited to that recipe's supported colors/size/wrap/bow/add-ons.
- Show real quantities when confirmed, not a generic capacity described as flower stems.
- Retain free placement under an optional “Adjust arrangement” section only where supported.
- Request screen: recipient, concise summary, primary Open text message, secondary Copy request. One line: “Review and send in your messaging app. Maritza will confirm your request.”
- Put manual attachment/link-free fallback under “Having trouble?”; keep it keyboard accessible. Diagnostics belong in QA logs, not customer copy.
- Do not collapse error messages or hide the no-payment/final-confirmation explanation.

## Existing assets: reuse carefully

The base manifest contains 35 flower entries, including non-flower special entries; additional modules extend it. Most base Classic flowers have only one bloom view. The library already has pink/red/cream roses, lily, sunflower, eucalyptus, baby's breath, wrap layers, ribbons and seasonal assets. More files are not automatically better.

Reuse the engine, logo, rendering/export pipeline and suitable existing photographic assets after a side-by-side check. Inspect these candidates before generating replacements:

- `builder/assets/classic/rose_pink-bloom.webp`, `rose_red-bloom.webp`, `rose_cream-bloom.webp`;
- `builder/assets/romance/rose-red-cup-a.webp` and `rose-red-cup-b.webp`;
- `builder/assets/fall/breath-airy.webp` and `breath-wide.webp`;
- `builder/assets/romance/eucalyptus-sparse-a.webp` and `eucalyptus-sparse-b.webp`;
- `builder/assets/classic/lily-bloom.webp` and `sunflower-bloom.webp`;
- `builder/assets/finishes/ribbon_blush.webp`.

Reuse is conditional on camera, light, edge quality and assembled appearance. The user's rejection of toy-like greenery is an aesthetic constraint. A technically transparent file is not sufficient.

## Five references and implementation order

Reference root: `C:/Users/laptops zone/Downloads/Telegram Desktop/`.

| Order | Reference | Actual visual need | Approach |
|---|---|---|---|
| 1 | `photo_3_2026-10-16_23-33-51.jpg` | Dusty pink roses, baby's breath, gingham/ivory wrap, large pink bow | First complete photographic recipe proof |
| 2 | `photo_2_2026-10-16_23-33-51.jpg` | Upright red roses, black folded wrap/bow, glitter/silver detail | Reuse rose-family logic with a separately authored upright layout; omit glitter until approved/credible |
| 3 | `photo_5_2026-10-16_23-33-51.jpg` | Mixed roses/lilies/buds/upright white flowers/eucalyptus | Mixed family with botanical stem groups and separate height zones |
| 4 | `photo_4_2026-10-16_23-33-51.jpg` | Larger mixed bouquet, message sash and more open lilies | Variant of proven mixed family, not a new renderer |
| 5 | `photo_1_2026-10-16_23-33-51.jpg` | Tall sunflowers plus separate chocolate box | Gift-set composition with a separately priced object and independent anchor |

Do not count exact stems from these photographs or identify every white flower with certainty. Ask Maritza for counts, varieties, sizes, prices and available finishes when preparing her recipe sheet. Do not place another prospect's branding/content in this shop. Working recipe names are internal until approved.

## Proposed composition logic

### A. Stable recipe scene

Add a versioned recipe definition containing: recipe id/version, camera family, supported options, named zones, authored anchors, envelope/occlusion masks, wrap layout, price configuration references and default seed.

Represent purchasable stems/items separately from rendered nodes. Example: one approved lily stem can display an open head and two buds; those render children do not become three billed stems. Filler quantity must use the florist's approved unit (stem, bunch or fixed inclusion), not an arbitrary number of repeated sprites. Bow, paper and chocolate box are separate line items or explicit inclusions.

Keep the same canonical design data feeding canvas, estimate, florist sheet, text request and export. No hidden decorative roses. Do not silently change billed quantities to fill a visual gap.

### B. Depth and placement

Render in authored groups: rear paper → rear greenery/stems → rear flowers → central flowers/filler → foreground flowers → front paper cuff → bow/card/sash. Allow local overlap inside groups where the recipe requires it. Use actual petal/leaf alpha; do not cover flowers with opaque green shapes.

Use bounded, deterministic scale/rotation/view variation keyed to persistent item ids. Do not regenerate random positions when changing a ribbon, name, price, language or viewport. Use side-view blossoms at edges; rotating an overhead image is not a different camera view.

Rose family: gently uneven oval mound, larger focal roses, partially occluded edge roses, airy filler through selected gaps. Avoid straight rows and a mechanically uniform disc.

Mixed family: rose core, larger lily focal points, narrow upright accents, buds and eucalyptus at the silhouette. Reserve space for lilies instead of inserting them into a rose-sized slot. A size change selects an authored quantity/layout preset, not unlimited stretching.

Gift family: bouquet bounds plus external chocolate-box bounds; a flower count change cannot move/resize the box arbitrarily.

### C. Paper and bow

Generate/approve a single coherent wrap source per style. Derive aligned back/front rendering masks from that same source with shared coordinates; do not generate unrelated front/back sheets. Preserve original files. Author masks in code/vector where appropriate. Reject a source that contains a blank placeholder disk instead of a usable opening.

Bow placement must be recipe-specific. The pink reference's large bow sits over the flower face; the black reference's bow sits at the stem neck. Reusing one fixed waist coordinate cannot reproduce both.

Keep the actual logo as an overlay on a small card if desired. Do not regenerate her name or logo as image text. Default card scale must not dominate the bouquet.

### D. Persistence and compatibility

Persist recipe/version, chosen options, stable item ids, seed and supported manual adjustments. Round-trip these through save/share/import/undo/redo/export. Decode old links with their original engine. If a version or asset is unavailable, offer recovery; never silently show a different bouquet.

Keep existing Midnight composition and legacy Classic behavior stable. Add the new family behind a client/recipe feature flag until visual acceptance. Store approved assets under a dedicated client/family directory and avoid overwriting old flower files.

## Execution milestones and acceptance

### Milestone 1 — request and scope hardening

Fix the live selection gap; simplify handoff copy; default florist link to the sheet; remove diagnostics from customer view. Add targeted regression checks for the demonstrated bypass and sheet link. Keep prices/sample flags unchanged. This can proceed while visual assets are being developed.

### Milestone 2 — pink bouquet proof

Use the asset prompt pack. Inspect existing candidates; generate only missing/rejected components. First assemble one fixed-size recipe without new customer controls. Compare it beside the supplied photograph at 390px width and as a large export.

Gate: recognizable rose form/color, varied angles, convincing airy filler, coherent gingham/ivory folds, naturally placed satin bow, no halos/checkerboards, no detached stems, no cloned grid. If it fails, correct the specific asset/layout problem before generating the next family. One beautiful full bouquet is more valuable than dozens of unused cutouts.

Then add supported options, correct quantity/estimate behavior, undo, save and link restoration. Counts and prices remain clearly provisional until owner approval.

### Milestone 3 — red recipe, then mixed recipe

Adapt rose-family anchors for the upright red reference. Validate black paper/light separately. Only then add lily/bud/greenery groups for the mixed reference. Use one proven mixed recipe for the two similar client photographs. Defer sunflower gift set if it delays a strong pilot.

### Milestone 4 — owner review and launch preparation

Render catalog thumbnails from the actual approved scenes. Keep real reference photographs clearly distinct from editable previews. Confirm selection, quantity/price model, availability, pickup/delivery rules and add-ons with Maritza. Do not claim generated previews are photos of delivered work.

With authorized reachable hosting, perform physical SMS checks and receiving-phone design checks. Launch only with actual approvals; never flip approval flags to make tests pass. The 30-day pilot begins at the agreed tested/live stage, not at this local review.

## Definition of done

- Each offered option is actually rendered and accurately reflected in the request/estimate.
- At least one new client recipe passes visual comparison; no promise to reproduce any conceivable bouquet.
- Preview, saved/reopened design, shared sheet, thumbnail and PNG show the same scene.
- Correct stem/item units; no decorative nodes inflate the bill.
- Supported-only request paths in live mode, including saved/shared imports.
- EN/ES, 320/390/768/1440 layouts, keyboard focus, slow/missing assets and image retry checked.
- Existing Nebula and Midnight tests pass for touched code; do not rewrite regression expectations merely to bless a changed arrangement.
- Physical phone status reported honestly, including any unverified device.
- No external website/DNS edits, checkout, automatic message sending or deployment bundled into this phase.

This is a bounded quality plan. Photorealism is assessed on assembled output, not promised by a prompt or a passing unit test.
