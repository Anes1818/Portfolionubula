# Customization consolidation — requested 18 October 2026

Scope: improve the existing three client studies and their shared editor before adding another bouquet. Preserve saved designs and florist request detail. No deployment.

## User correction and acceptance standards — 19 October

- Classic toys are separate accompanying gifts, alongside the chocolate box; they must not sit inside the flower canopy. Their position controls/dragging use the gift area. Classic satin bows sit at the gathered stem neck. Dome/Heart retain tucked/on-top accessory placements.
- Filler is small relative to surrounding flower heads; branches originate behind petals. Light = airy sprigs only; Medium = sprigs with compact tufts; Full = greater coverage while flower centers stay readable. New filler is never a flower-slot replacement.
- Stable deterministic positions: toggling a bow or changing a note never moves flowers/filler. Increasing density uses a stable prefix of placements. New toys avoid overlapping existing gifts by default.
- Visual acceptance requires review of each supported viewpoint and a small/medium/large sample, not only passing unit tests. Upright wrappers may cover stems but cannot conceal paid flower heads.
- Interaction acceptance requires real pointer/touch dragging, bounded movement, undo, size/placement, and full link/export/request reconstruction. Rejected visual trials remain QA artifacts, not presented as approved outcomes.
- No claim of photographic side-view conversion by rotating overhead imagery; use actual Classic artwork or identify the missing source.

## Implementation checklist

- [x] Remove developer-facing Compare Roses and sunflower comparison controls from the customer flow; retain compatibility for saved artwork versions.
- [x] Flowers panel: separate flower stems from filler. Baby's breath has None / Light / Medium / Full. Light uses airy branches only; Medium adds compact tufts; Full increases both. Deterministic gap placements, no occupied flower slots.
- [x] White flowering sprays become independently counted filler with +/−, not full-size flower slots. Preserve legacy saved spray stems without silently deleting purchased items.
- [x] Add separate baby's-breath perimeter wrap at the bottom of the finishing panel, alongside greenery wrap. Keep flower counts, filler quantities and prices distinct.
- [x] Reorganize finishing into toys/bows, small accents, lettering/sashes, perimeter greenery, gift. Remove duplicate old filler controls and toy movement arrows. Retain size, rotation/placement and reset/remove, plus direct dragging.
- [x] Make existing toys work in Classic, Dome and Heart. Put pumpkin plush in the same chooser. Bow can accompany a toy, using existing photographed blush, black, cocoa, burgundy and sage assets where suitable. No false claim that digital tint creates a different photographic angle.
- [x] Make accessory drag respect stored coordinates; prevent automatic collision adjustments from fighting deliberate moves. Keep back/tucked/front layers coherent.
- [x] Floral initial only in Dome/Heart; improve compact floral texture, centering and scale. Keep printed sash distinct from floral lettering.
- [x] Expose available wrap styles according to viewpoint: upright wraps only in Classic, overhead/heart-compatible choices in top views. Separate material/style from color. Retain old saved wrap semantics. Do not claim round papers fit a heart or overhead papers fit Classic.
- [x] Classic uses existing angled Classic flower artwork where available, especially roses; avoid pretending flat rotation produces a side view. Keep large focal lilies/sunflowers and independent anchors.
- [x] Verify three studies plus all modes: small/large quantities, mixed flowers, filler levels, spray count, toys + bows, pumpkin, lettering, wrapping, undo, links, order sheet, export, mobile drag and desktop pointer.
- [x] Document exact missing assets and residual limitations after visual review, with focused prompts if needed.

## Known input limitations

Sunflower paper has synthetic texture; chocolate lid has a baked checkerboard; matching lily buds/pale pink rose variants have not arrived. Current upright wrapper sources are limited. Reuse genuine compatible photographs; unsupported viewpoints require new assets rather than distorted overhead images.

## Acceptance

No Compare Roses button; one filler control per type in Flowers; no hidden extra flower slots used by newly added fillers; all visible choices render and persist; no double-charging legacy pumpkin/bows; direct toy drag survives reload; flowering initials absent from Classic; all published UI labels describe the actual selected material/amount. No claim of perfect physical reproduction or owner-approved prices.

## Implementation and review evidence — 19 October

Implemented in the client customization modules plus the shared renderer/model/link hooks. Build: 249 explicit runtime files. The existing three study recipes remain editable; the public catalogue has not been expanded.

- New density adapts to flower count: a base of ceil(sqrt(flower count) × 0.75), capped at eight, multiplied by Light/Medium/Full (1/2/3). Billing uses the same logical sprig quantity. Medium/Full add compact tufts as part of those units, not extra priced flowers.
- Gap candidates include adjacent pairs and three-head pockets. Clearance ranking and spacing choose a deterministic prefix. Peripheral wrap follows ray intersections with the flower silhouette, including the heart notch.
- Classic toys have separate bounded gift positions. The bow uses the measured wrapper neck; camera framing stays fixed during a drag. Dome/Heart use bouquet-relative positions. Changing satin color preserves the user's adjustment.
- Five photographed satin choices are available: blush, black, cocoa, burgundy, sage. New top-view bows start near the lower edge so a central initial remains clearer. Existing saved coordinates are retained.
- Existing white spray stems remain intact in old links; an explicit conversion control moves up to the available filler capacity, without discarding any excess stems. Legacy pumpkin/bows remain removable or convertible to draggable details.
- Upright options: fan, ivory, kraft, yellow. Dome: round, ruffle, cocoa, gingham, peach. Heart retains its matching heart wrapper. Color variants are labeled digital previews; no claim that every wrapper has a photographed color variant.

Verification performed:

1. `builder/tests/la-flor-eterna.cjs`: 63 existing storefront, recipe, SMS preparation, recovery, link, export and responsive checks passed. No message was sent.
2. `builder/tests/customization-ux.cjs`: real controls, all density levels, white accents, all three modes, toys/bow/pumpkin, real pointer drag, every offered paper shape, links, fresh order sheets and mobile overflow passed.
3. `builder/tests/customization-standards.cjs`: Classic 3/7/20 and Dome/Heart 12/28/60, density prefix stability, unchanged flower state, exact scene link round-trip, five decoded satin sources, gifts separate from Classic flowers, 390px touch drag, undo/redo/reload passed. Contact sheets are in `clients/la-flor-eterna/qa/next-phase/density-standard-*.png`.
4. Existing sunflower and mixed-lily interaction tests passed, including independent flower dragging/replacement, chocolate pricing/removal, editable bow, undo, reload and export.
5. Shop configuration check passed in sample-price mode.

Visual limits: a sparse manually edited Classic can retain empty space because deleting flowers intentionally does not rearrange the remaining anchors. Its Arrange action is available when a new composition is desired. Current yellow paper and chocolate plastic are source-quality limitations; a colored black paper is still a digital color preview. The review matrix covers representative combinations, not a proof that every possible manual overlap is beautiful. User-positioned accessories can intentionally cover a flower or initial.

Focused image prompts and acceptance gates are in [CUSTOMIZATION-ASSETS](LA-FLOR-ETERNA-CUSTOMIZATION-ASSETS.md). These are remaining realism improvements, not a claim of perfect physical reproduction. No replacement assets were invented or silently substituted.

## Subsequent supplied asset refinement

The 19 October batch supersedes the fixed Classic gift slots with a centered group near the wrapper base, and replaces yellow wrapping, Classic pink roses, compact white filler and the chocolate box. The mirrored-side sunflower trial was rejected by the user; the previous face-forward center/right and oblique-left logic is restored. See [batch review](LA-FLOR-ETERNA-OCT19-ASSET-REVIEW.md) for exact source decisions and tests.

## Final implementation status after sunflower correction

The implementation checklist above is complete for the available assets. Final sunflower flower choices match the earlier logic; the supplied butter-yellow wrapper and grouped gifts remain. Reset now returns new bows to their intended lower-edge defaults in top views, and legacy spray conversion labels show only the quantity that fits the remaining filler capacity.

No external image input blocks this implementation. The user accepted the new chocolate photograph as-is; it is integrated without retouching, with its original aspect ratio, optional pricing and saved-link support in all modes. The second wrapper image is archived as an alternate full wrapper, not composited as a front-only layer. Catalogue expansion, deployment and florist price approval remain outside this customization task.

## Subsequent filler reference correction

The user's close-ups and explicit canopy/density correction supersede the earlier fixed-position filler prefix: density now gently reduces rendered bloom size, enlarges breath and re-fits the shared pockets. Authored flower centers and quantities remain unchanged. Eucalyptus, white accents and baby's breath share geometric reservations and actual alpha fitting; exposed tips sit above petals, basal stems below. See [infill logic and verification](LA-FLOR-ETERNA-INFILL-LOGIC.md). Current build: 253 runtime files including the three Top Sellers photo covers.
