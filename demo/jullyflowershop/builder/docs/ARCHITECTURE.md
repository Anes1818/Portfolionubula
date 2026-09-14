# Architecture

## Layers

`shop-config.js` → validated catalogue/configuration → artwork metadata and
embedding → v2 helpers → `template-engine.js` → geometry → model → renderer → UI.

`NebulaTemplates.layout(mode, capacity)` caches deterministic slot geometry. The
supplied v2 skeleton seeds Dome; the actual v1 heart rings define counts and
wall/fill/center membership. Geometry is independent of palette, price, deletion,
seed reshuffling and viewport.

`template = {capacity, palette, formation, accent, zones, overrides}`. An explicit
flower ID overrides the automatic recipe; `null` is a deliberate empty position.
Occupied slots have stable slot UIDs. No ghost flowers are included in pricing.
A size change reapplies the recipe, then maps explicit edits to the closest
unused normalised sites.

The automatic **Auto blend / Heart zones** controls were removed. The recipe
engine still fills a fresh template — Dome and Heart open as full red roses —
but the customer changes it only by painting. Do not restore a blend UI.

## Sizing rules that differ per mode

- **Dome** takes bloom size from `DomeEngine.spec()`. Those are measured
  constants; the interior really is nearer the camera, so per-slot capping is
  correct there and is kept.
- **Heart is flat**, so size variation reads as an error rather than
  perspective. Every heart bloom shares one size, the median neighbour cap. See
  `heartUnit()` in `geometry.js`.
- **Classic** draws blooms at `CLASSIC_BLOOM` (0.85) of catalogue diameter, and
  the three row offsets scale with the same number so rows stay packed. Pricing
  and the 20-unit capacity use the raw catalogue values, so this is a picture
  change only.

## Classic wrap and envelope

Classic keeps restrained row logic with paper-support projection and physical
area limits. Head and stem share one source transform, centre, scale and
rotation. The front photo covers stems; a support mask clips loose stem pixels.

`classicEnvelope()` bounds where a bloom may sit. Its horizontal limit comes from
the **wrap's own** `mouthHalf`, measured per paper at `rimCenter.y - 170`; the
formula reproduces the shipped 0.455 for ivory. Its lower limit is `rimY -
h*0.5 - 4`, because blooms are painted after the front panel and anything
reaching past the mouth lands on the paper instead of behind it.

`NEBULA_META.wraps` holds one entry per photographed paper. A new wrap is
resampled at build time onto the ivory's paper box, so adding one needs no change
to `classicFrame`'s measured constants. Tinted tones recolour the ivory
photograph and are colour studies, not new materials.

## Artwork pipeline

Sources live in `incoming/`; `tools/extract_assets.py` and
`tools/extract_stems.py` produce the runtime WebP.

Keying uses distance to the **sampled** screen colour, because the screen is not
always the same green. Spill is then removed per pixel from its own green excess:

    beta  = (g - max(r,b)) / (screen_g - max(screen_r, screen_b))
    petal = (observed - screen*beta) / (1 - beta)

Two simpler approaches were tried and failed: clamping green across the whole
subject turned lemon petals orange, and unpremultiplying by the key's alpha left
the rim untouched because that alpha is wrong at the edge. Do not revert to
either.

## UI transactions

A pointer gesture records one before-snapshot. A brush visits each slot once;
Undo restores the whole gesture; pointer cancel rolls it back.

In Classic a drag moves a bloom and a tap paints it, so the paint is held until
the gesture's direction is known. Dome and Heart keep instant brush strokes.
Touch slop is 12 CSS pixels, mouse 4 — measured in real pixels, not canvas units,
so it does not change with preview size.

Camera zoom and pan belong only to the preview, never to the design, history,
price or export. Three bouquet banks and their histories are independent.

## Artwork loading

Only the artwork the three saved bouquets use is awaited before first paint; the
rest decodes on an idle queue. `image()` returns `null` rather than throwing when
a bitmap is not ready, and every drawing site treats that as "skip and repaint".

**Export is the exception.** `blob()` awaits its design's assets first, because a
preview frame may skip a bloom but a saved picture may not.

## Estimates

The model sums actual occupied catalogue units, configured preparation and
labour, and explicit extras. The Dome's eucalyptus collar is decorative geometry
that occupies no slot, but it is priced as eight real sprigs — nothing is added
silently. A stored or imported total is never authoritative.

There is no backend, checkout, auto-send or order number. Sharing hands a PNG to
the device's own share sheet; the person chooses the destination.

## Accessibility

The per-position list that allowed keyboard and screen-reader editing was
removed. Editing now requires seeing and touching the canvas. This was a
deliberate simplification, and it is a known gap — see TEST-REPORT.md. If it is
restored, it belongs behind the flower panel and must stay in sync with
`M.paintSlot` rather than duplicating its logic.

## Regression priorities

Keep the real-touch tests, especially selection ×, stroke Undo, and drag-versus-
tap in Classic. Keep the paper-mouth envelope check per wrap. Check actual
per-flower alpha visibility, not merely flower counts. Do not restore the v5
replacement modal, the quote flow, or automatic paid filler to conceal holes.

---

© 2026 Nebula Sites Studio. All rights reserved.
