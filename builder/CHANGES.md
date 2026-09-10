# Changes

## Current release

The app was reshaped from a florist quote tool into a bouquet-picture studio.

**Removed on purpose**
- The florist quote flow and its dialog. The app now ends at a shared picture.
- Auto blend and Heart zones. Painting by hand is the only way to change a slot.
- The per-position list, the diamond pin, the v3 import banner, the sash width
  slider, the kraft wrap, `limonium`, `babys_compact` and `babys_medium`.

**Added**
- **Share bouquet** — hands a real 1080×1080 PNG to the device's share sheet,
  falling back to a download where files cannot be shared.
- Three Classic starting points: Romantic, Pure white, All yellow.
- Seven new or re-shot flowers: yellow chrysanthemum, cream rose, yellow stock,
  blush spray rose, purple statice, plus top-view baby's breath and a fuller
  eucalyptus.
- Optional eucalyptus collar on the Dome, priced as eight real sprigs.
- Studio identity in the footer and stamped on every exported picture.
- A "What is this studio for?" panel, collapsed by default.

**Fixed, each with a measurement**
- Heart blooms are one size. Centre/rim ratio 0.82 → 1.00, spread 1.56× → 1.00×.
- Classic blooms no longer cross the paper mouth: worst overhang 40.8px → 0.
- Bloom draw scale 0.85 with row offsets scaled to match, so rows stay packed.
- Green screen spill: worst petal layer 23.5% → 6.5% of its soft edge.
- Five tulip blooms carried a detached leaf fragment. Removed.
- Phone: drag moves and tap paints; touch slop measured in real pixels; hover
  effects disabled on touch; the delete × covers 3.7% of a bloom, down from 41%.
- Finishing panel 153px → 287px on a phone.
- Startup decodes 21 assets instead of 93; peak bitmap memory 113 MB → ~30 MB.

**Known gaps** — see TEST-REPORT.md
- The project's Playwright suite was not run in this environment.
- No physical device testing; native sharing verified by simulation only.
- Keyboard and screen-reader editing was removed and not replaced.
- Prices remain demo values.

## Earlier (v6 original)

v2 palette patches and accent patterns; direct tap/drag painting; fixed-position
Dome and Heart templates; selection ×, refillable empty slots, one-gesture Undo.

---

© 2026 Nebula Sites Studio. All rights reserved.
