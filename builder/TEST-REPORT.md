# Nebula — what has and has not been verified

This report replaces the earlier v6 report. That one described a build with a
florist quote flow, a diamond pin, an Auto blend mode and a per-position list.
All four were removed on purpose, so its numbers ("191 passed", "0 accessibility
violations") no longer describe this software and have been withdrawn.

## What was measured on the current build

Every figure below came from running the app and reading a number back, not from
inspection.

**Catalogue and rendering**
- 32 varieties × 3 modes rendered with **no failures**.
- Estimates stable across the change series: Classic $79.00, Dome $155.00,
  Heart $204.00 for the default designs.
- PNG export produces a real `image/png` of ~630 KB at 1080×1080, and waits for
  its own artwork first — an exported picture is never missing a bloom.

**Geometry**
- Heart blooms are now one shared size. Centre-to-rim ratio went from 0.82 to
  **1.00**, spread from 1.56× to **1.00×**. The shared size is the median
  neighbour cap, which holds worst-case overlap at ~32% — the engine's own
  measured overlap constant is 0.33.
- Classic blooms no longer cross the paper mouth. Across five bouquets the worst
  overhang went from **+40.8px to 0**.
- Bloom draw scale is 0.85 of catalogue diameter, with row offsets scaled to
  match so rows stay packed. Pricing and the 20-unit capacity are unaffected.
- Dome engine constants: `all 12 measured constants intact`.

**Artwork**
- Green screen spill: worst petal layer went from **23.5% to 6.5%** of its soft
  edge, and only 1 of 59 petal layers is above 5%. That one is alstroemeria,
  whose petals are naturally green-streaked.
- Five tulip bloom crops carried a detached ~200px leaf fragment from the stem.
  Removed; metadata re-derived so the blooms did not shift.
- Eucalyptus head aspect corrected from 0.598 to 1.003. The old narrow tip was
  documented in the engine notes as reading like a thorn.

**Performance**
- Startup decodes only the artwork the three saved bouquets need: **21 assets
  instead of 93**, about 30 MB of bitmap instead of 113 MB. The rest decodes in
  the background and each arrival triggers a repaint.
- Render cost 0.6–1.3 ms per frame at up to 100 blooms, against a 16.7 ms budget.
- Embedded bundle 9.63 MB.

**Phone behaviour** (375×812 emulated, touch input)
- Drag moves a bloom; a tap paints it. Verified with synthetic touch gestures:
  a 6px tap painted, a 30px drag moved and painted nothing.
- Touch slop 12 CSS px, mouse 4. Measured in real pixels, not canvas units.
- `:hover` effects are disabled under `@media (hover:none)` so they cannot stick
  after a tap.
- The delete × covers **3.7%** of a bloom, down from 40.9%, while keeping a
  44×44 target.
- Finishing panel height 287px of 664px content (43% visible), up from 153px
  (23%).

**Data safety**
- Designs saved before flowers were withdrawn still load: `limonium`,
  `babys_compact`, `babys_medium` and the retired `kraft` paper are remapped
  rather than rejected. Verified with a real exported design, all items kept.

## What has NOT been verified

Read this section before launching.

1. **The project's own Playwright suite was not run.** `tests/v6/*.cjs` requires
   Playwright, which was not available in this environment. Every number above
   is an independent measurement, not those 191 checks.
2. **No physical device testing.** Chromium with emulated viewports only. No
   real iPhone, Safari or Android hardware.
3. **Native sharing is unproven on a real device.** `navigator.share` does not
   exist in the environment used here. The three code paths (share, cancel,
   fall back to download) were verified by simulation; a real share sheet was
   never seen to open.
4. **No accessibility audit, and a known regression.** The per-position list
   that gave keyboard and screen-reader users a way to edit was removed on
   purpose. Editing now requires seeing and touching the canvas. The earlier
   "0 violations" result does not carry over. For a business that must meet ADA
   or WCAG this is an open risk, not an oversight.
5. **Prices are demo values.** `shop-config.js` ships `demo: true` and the app
   says SAMPLE ESTIMATE. Nothing here is a florist's confirmed quote.
6. **Print/production feasibility untested.** No florist has assembled a bouquet
   from one of these designs.

## Standing rule for this project

Never claim something is fixed without a measurement or a file read that proves
it. Several defects in this series were found only because a number was checked
after the change — including two where the code looked right and the output was
wrong.

---

© 2026 Nebula Sites Studio. All rights reserved.
