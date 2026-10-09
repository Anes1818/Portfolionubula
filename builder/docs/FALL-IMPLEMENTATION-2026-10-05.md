# Autumn builder — templates and personal details

The gallery offers Autumn Latte, October Cream, Pumpkin Patch and Harvest Sunshine. Each
thumbnail is drawn from the same editable recipe and renderer used by the
builder and export, rather than a separate generated bouquet photograph.

## October 5: supplied asset integration

Seven additional user-clipped PNGs are integrated, with real alpha verified and
originals preserved. `fall-details.js` holds their measured source rectangles,
decoration defaults and deterministic filler placement.

| Runtime asset | Supplied source in Downloads |
|---|---|
| `breath-airy` | `babys-breath-transparent.png` |
| `breath-wide` | `babys-breath-2-transparent.png` |
| `plush-snoopy` | `Telegram Desktop/IMG_20261005_163201_622.png` |
| `topper-snoopy` | `Telegram Desktop/IMG_20261005_163201_197 (2).png` |
| `mum-burgundy` | `Telegram Desktop/IMG_20261005_163206_667 (2).png` |
| `rose-caramel` | `Telegram Desktop/IMG_20261005_163201_529.png` |
| `plush-kitty` | `Telegram Desktop/IMG_20261005_163206_515.png` |

- Autumn Latte starts with 30 editable flowers, six baby’s breath sprigs and
  Snoopy. The earlier three recipes retain their flower counts and finishes.
- Dome bouquets support 0–12 counted baby’s breath sprigs. Two source shapes
  alternate with deterministic rotations. A seeded candidate field scores
  clearance from flower centres and spacing from previous sprigs. Increasing
  the count reveals the next sprig without moving existing ones. Changing the
  flower recipe may reposition filler; text and accessory edits do not.
- Filler is composited above petals, with flower centres protected. It does
  not replace flower slots. Counts and per-sprig costs appear in the estimate
  and florist sheet, including when the flower slots have been emptied.
- Each new character can be added once: Snoopy plush, Hello Kitty plush and
  Snoopy pumpkin topper. On the Finishing tab, select and drag an accessory,
  or use arrow buttons/keyboard. Size, rotation, tucked/front placement,
  reset and removal are available. The older pumpkin controls remain intact.
- Accessory positions are stored relative to the bouquet radius, with bounded
  coordinates, scales and rotations. Dragging is one undo step; pointer cancel
  restores the previous state. All additions persist in JSON, autosave, shared
  links, the florist sheet and PNG export. Old links default to no new details.

New demo defaults: caramel rose $4, burgundy chrysanthemum $3.50, baby’s breath
$2 per pictured sprig, Snoopy/Kitty $22 each, flat topper $6. Override flower
prices with `flowerPrices.rose_caramel` / `mum_burgundy`, and extras with
`extrasCents.filler`, `snoopy`, `kitty`, `snoopy_topper` in `shop-config.js`.
These are sample amounts; the supplied sprig image is the counted visual unit,
not a measured wholesale stem or bunch.

## Earlier template foundation

- Seven supplied assets: two ivory roses, rust chrysanthemum, revised cocoa
  collar, brown ribbon, matching bow and pumpkin plush. Original PNGs are kept
  in `assets/fall`; lossless WebP files are the runtime copies. The four newest
  PNGs came from the user's `Downloads/transparent-images` directory. Rose and
  collar cutouts came from the earlier imagegen extraction in this conversation.
- Actual alpha checked in all seven assets. Transparent padding is handled by
  measured source rectangles at draw time, so the orange flower is not scaled
  to the width of its old landscape canvas.
- Three autonomous templates; every flower remains individually replaceable,
  removable and included in the estimate. Larger species use weighted spacing
  in autumn templates: sunflower/rose diameter ratio 1.85, gerbera 1.5. Ratios
  are initial visual calibration, not guaranteed physical stem measurements.
- Deterministic layout keyed by capacity, recipe and seed. A text or finish edit
  cannot reshuffle blooms. Larger mixes expand the layout; very large bouquets
  are normalized as a whole into the coordinate bounds, retaining species ratios.
- A blank cocoa ribbon supports editable text and existing placement/height
  controls. Its bow is a separate toggle and follows the band's placement.
- Pumpkin toggle, three top anchors and size adjustment. Petals overlap its
  lower edge. It is a separately priced object, never a replacement flower.
- New fields survive JSON import/export, autosave, history and shared links.
  The order sheet lists pumpkin placement/scale and the bow. Existing designs
  retain the old layout unless they explicitly use the organic template flag.
- English/Spanish labels, a scrollable mobile gallery and a larger autumn
  preview. No 3D option is introduced.

## Prices and availability

New sample prices: ivory rose $4, rust chrysanthemum $3.50, pumpkin $18, bow $4.
These are illustrative USD configuration defaults, not verified shop prices.
They can be overridden in `shop-config.js` through `flowerPrices` and
`extrasCents`. The existing sample price disclosures and order confirmation
workflow remain in place.

## Asset delivery

Lossless encoding reduces all fourteen PNGs from 9,261,462 to 5,507,994 bytes
(approximately 41%). `tools/prepare-fall.cjs` reproduces the WebP assets,
manifest and optional `fall-embedded.js` bundle with Node and Sharp. PNGs are
not retouched or overwritten. The embedded fallback loads only for `file://`
sessions so local PNG export can access untainted image data. HTTP sessions use
individual WebP assets. Keep the fallback alongside the other scripts when
distributing the builder for offline use.

## Validation and local preview

Run `node builder/tools/serve-local.cjs 8767` from the repository root. Open
`http://127.0.0.1:8767/builder/`. This is a local preview, not a deployment.

`tests/fall/verify.cjs` uses Playwright and Edge (override `EDGE_PATH` if needed).
It checks actual mobile touch replacement at 320/390 px, state persistence,
text undo, unchanged geometry after text edits, exact shared-link rendering,
order details, PNG export, species sizing, legacy designs, input validation
and English/Spanish gallery operation. Screenshots and results are saved in
that same directory. `tests/fall/edge-cases.cjs` checks file export, repeated
range edits, resizing, deletion, dense mixed sizes and asset pixel preservation.
`tests/fall/details.cjs` exercises filler stability and accounting, new flower
recipes, all accessory controls, drag undo, actual touch drags at 320/390 px,
JSON and link round-trips, malformed inputs, the florist sheet, English/Spanish
labels and offline export using all new decoration assets.

Latest validation: 76 passing checks (27 template regressions, 20 asset/edge
checks, 29 detail checks). New sprites preserve every visible RGB/alpha pixel
through lossless encoding. JavaScript syntax checks and `git diff --check`
passed. Preview remains local; this update has not been deployed.

## Boundaries of this slice

The new overhead assets are not offered in Classic: they do not supply the
matching side-view flower/stem photography. This is a fixed-view 2D compositor.
Per-flower painting changes a recipe; it does not simulate stems bending or
promise a physically exact bouquet. Existing dome/heart templates retain their
earlier spacing. The new filler and accessories are available in Dome only.
Each supplied character supports one instance; drag coordinates are bounded
to keep the detail near the bouquet. These fixed-view sprites do not provide
perspective rotation or physical depth simulation. Arbitrary photo uploads,
multiple copies of one character and shop inventory rules remain future work.
