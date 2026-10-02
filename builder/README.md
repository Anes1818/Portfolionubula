# Nebula — the bouquet studio

A self-contained bouquet design studio for florists. A customer arranges real
photographed flowers, sees a live price estimate, saves a picture, and prepares a WhatsApp request with a bouquet-sheet link.
The florist confirms availability and final price; no payment or order is confirmed here.

**Why it exists:** try an idea before a single stem is cut. Redesign as often as
you like without using a flower, show a customer their bouquet before they
commit, and send them away with a picture that carries the shop's name.

## Open it

1. Extract the complete ZIP into a new folder.
2. On a computer, open `index.html`. No npm install or build step.
3. On a phone, open the deployed URL. An iOS Files preview is not a supported
   way to run it.
4. Keep `shop-config.js`, every script, the stylesheet and `assets/` together.
   Read **SHOP-SETUP.md** before customer use.

## 3D studio

Open **`3d.html`**, or select **Explore 3D** in the photo studio. It also opens
directly from disk, with no installation or external network requests.

- Real WebGL geometry: curved petals, stems, leaves, folded paper and a ribbon bow.
- Drag to orbit; scroll or pinch to zoom. Front, top and side views, automatic
  rotation and reset are available below the bouquet.
- Fifteen catalogue choices, three starting bouquets and up to 36 individual
  stems. Gathered, dome and heart arrangements; four paper tones and three ribbons.
- Select a stem in the scene to remove it, or edit quantities under **Details**.
  Keyboard users can use catalogue buttons and the quantity list; arrow keys
  rotate the focused canvas, `+`/`-` zoom, `0` resets, and Escape clears selection.
- Undo/redo, local autosave, a 1600×1600 PNG and validated editable 3D JSON files.
  `Ctrl/Cmd+Z` undoes; add Shift to redo.

The 3D page reads the same catalogue and approved shop pricing configuration.
Its storage key (`nebulaBouquet3D_v1`) and JSON format are independent of the
photo studio, so switching studios does not change an existing photo design.
There is no automatic conversion between their designs or ordering from 3D.

These are stylized flower models for exploring shape and color, with catalogue
photographs as selection references. Sample prices remain clearly labeled.
Your florist confirms availability, materials and the final price. WebGL is
required; unsupported browsers get a link back to the photo studio.

Implementation: `studio-3d-model.js`, `studio-3d-scene.js`, `studio-3d.js` and
`studio-3d.css`. Three.js r160 is included under its MIT license in `vendor/`.
Verification instructions and coverage are in `tests/3d/README.md`.

## The three bouquets

Each is saved separately; switching never converts one into another.

| Mode | What it is | Sizes |
|---|---|---|
| **Classic** | Hand-gathered, in a real photographed paper wrap | ~20 rose-sized units |
| **Dome** | Top-view *ramo buchón*, fixed slots | 15 / 30 / 44 / 62 / 84 |
| **Flat heart** | Heart shape, fixed slots | 21 / 41 / 67 / 100 |

Classic opens on the **Romantic** starting point; Dome and Heart open filled
with red roses. Four starting points are offered in Classic: Strawberry (14 berries + 6 rosemary
sprigs, $89 sample estimate), Romantic, Pure white and All yellow.
Open “Try strawberries & more” to choose one. The existing Dome/Heart berry heads
remain unchanged.

## How it is used

- **Pick a flower, then tap or brush across the bouquet.** There is no automatic
  blend mode and no Replace dialog — every change is a direct touch.
- **Tap a bloom to reveal its small ×.** On Dome and Heart, deleting leaves a
  visible empty slot that can be refilled; the template never shrinks or repacks.
- **In Classic, drag a bloom to move it.** A tap paints, a drag moves. Touch has
  a 12px slop so a finger tap is never mistaken for a drag.
- **Expand** enlarges the preview; zoom, pan and Fit help on dense templates.
- **Finishes:** paper tone, printed sash, a gold butterfly, a ribbon in Classic
  only, and an optional eucalyptus collar on the Dome. The ribbon is tied around
  the stems, so it is offered only in the view that shows them; Dome and Heart
  look straight down and neither draw nor charge for one.

## Estimate

Every occupied position is one priced catalogue unit — a stem, head, cluster or
sprig, not a count of petals. Empty positions cost nothing.

With the supplied **sample** rates, 30 roses in a Dome cost $155 including
preparation and labour. The eucalyptus collar adds $16, because it is eight real
sprigs a florist must supply; it is priced rather than hidden as free decoration.

Prices ship as `demo: true`, so the app says **SAMPLE ESTIMATE** everywhere.
A florist must confirm real stems, availability, feasibility, tax and delivery.

## Sharing

**Share bouquet** builds a 1080×1080 PNG and hands it to the device's own share
sheet as a real image file. Where the device cannot share files, it downloads
instead. Nothing is ever sent automatically — the person chooses the destination.

**Save design** exports PNG artwork and an editable JSON of all three bouquets.
Saving is local to the device; there is no account and no backend.

The studio's name, site and phone appear in the page footer and are stamped on
every exported picture, so a shared bouquet leads back to the shop.

## Files

- `index.html`, `app.css`, `app.js` — UI and interactions
- `shop-config.js` — the single shop-owner settings file (prices, studio details)
- `template-engine.js`, `dome-engine-v2.js` — fixed geometry and v2 recipe helpers
- `model.js`, `geometry.js`, `renderer.js` — state, pricing, envelope and drawing
- `asset-meta.js`, `assets-bundle.js`, `assets/` — aligned photographic artwork,
  embedded as base64 so PNG export works from `file://`
- `docs/ARCHITECTURE.md` — implementation boundaries
- `TEST-REPORT.md` — what has and has not been verified

## Honest limits

The original `index.html` studio is a photographed 2D preview, not a 3D floral simulator or a certified
assembly recipe. Natural petal overlap remains. Digital paper tints are colour
studies of the one photographed ivory wrap, not proof of a stocked material.
Sash lettering is baked into the supplied artwork and is English only.

**Accessibility:** the per-position list that allowed keyboard and screen-reader
editing was removed in favour of a simpler interface. Editing now requires
seeing and touching the canvas. This is a deliberate trade-off and a known gap —
see TEST-REPORT.md before deploying for a business that must meet ADA or WCAG.

Tested in Chromium with emulated phone layouts and touch input. Physical
iPhone / Safari / Android hardware and real florist assembly were not tested.
All shop contact details and prices must be approved by the owner before launch.

---

© 2026 Nebula Sites Studio. All rights reserved.
