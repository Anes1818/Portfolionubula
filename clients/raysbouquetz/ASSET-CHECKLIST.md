# Ray’s Bouquetz — artwork to make

Start with batch 1. Do not make a whole catalogue before we inspect the first rose
and fit it into Ruby Royale. Four original bouquet photos are already installed
as covers; no cover regeneration is needed.

## Batch 1 — Ruby Royale (first visual approval)

| File | What to create | Specification |
|---|---|---|
| `satin-rose-red.png` | One red satin/ribbon rose, photographed straight down | Visible folded satin texture, no stem or leaves, transparent background, 1024 × 1024 |
| `wrap-triangle-black-dome.png` | Her small triangular black/taupe paper layers, seen from above | Empty circular centre with actual transparency; whole wrap visible, no flowers, ribbon or text |
| `sash-black-blank.png` | One blank black satin message band | Transparent background, wide horizontal band, clear writing area; we draw the customer’s text in code |

We already have a gold crown, gold butterflies and a black bow to inspect for reuse.
Do not regenerate them unless the style/angle does not fit. Glitter should be a
separate optional effect/overlay, not baked into every rose colour.

## Batch 2 — remaining collection

| Files | Purpose |
|---|---|
| `satin-rose-black.png`, `satin-rose-purple.png`, `satin-rose-lilac.png` | Money Moves and Pretty & Paid |
| `satin-rose-pink.png`, `satin-rose-ivory.png`, `satin-rose-blue.png`, `satin-rose-peach.png` | Anu’s pastel palette |
| `satin-dahlia-pink.png`, `satin-dahlia-blue.png` | Actual handmade ribbon dahlia shape |
| `satin-plumeria-ivory.png`, `satin-plumeria-purple.png` | Her folded five-petal ribbon flowers |
| `satin-sunflower-yellow.png` | Her handmade ribbon sunflower, not a fresh sunflower photograph |
| `wrap-triangle-lilac-dome.png`, `wrap-triangle-pink-dome.png`, `wrap-triangle-ivory-dome.png` | Small triangular dome wrapping, open centres |
| `wrap-triangle-black-heart.png`, `wrap-triangle-lilac-heart.png` | Matching empty heart wrapping |
| `bow-lilac.png` | Lilac satin bow with long tails, separate from flowers and sash |
| `sash-lilac-blank.png` | Blank lilac band, personalised lettering drawn in code |

Foam is a separate material. If the final product list includes it, make
`foam-rose-pink.png` first, then only the additional colours she actually offers.
Do not silently turn satin selection into foam or use fresh-rose images for either.

## Batch 3 — additional personal touches

- `card-blank.png`: one small blank gift card; text is supplied by the customer.
- `graduation-cap.png`: one cap with tassel, transparent cutout, overhead/three-quarter
  angle compatible with a top-view bouquet; separate from a bouquet.
- `cricut-topper-blank.png`: simple neutral topper backing/stick, no fixed name or
  birthday text. Real Cricut shapes are quoted from her availability.
- `money-fan.png`: only after deciding how many physical notes one fan represents.
  A pictured fan cannot silently create extra uncounted cash.
- `folded-cad-note.png`: one folded Canadian note as a single illustrative unit,
  transparent background, portrait orientation. We already have an illustrative
  folded USD note. Separate currency artwork; no new asset for every denomination
  is necessary if the studio explicitly labels the image as illustrative.

## Image rules

- PNG with a real alpha channel. No white background, fake checkerboard, watermark,
  labels, whole bouquet or embedded price. One item per file.
- Flowers: overhead, centred, 1024 × 1024, roughly 80–90% frame coverage, the same
  soft upper-left light and scale family. Keep natural satin folds; do not paint
  photographic fresh petals to look like fabric.
- Papers: large enough to inspect folds (at least 1440 px longest side), no cropped
  corners. Keep the empty centre transparent. We measure its opening and fit it
  to the exact flower envelope; we will not stretch the flower images to fit it.
- Bow, card, cap and sash: transparent cutouts, complete edges; keep text blank.
- One excellent asset first. Two genuinely different rose angles can be added
  after the first batch works, rather than producing inconsistent bulk variants.

## Where they go and how they connect

Supply your generated files for inspection. Once accepted, store them under
`clients/raysbouquetz/public/art/`. Register inspected metadata in `assets.json`.
Only assets with the shared `approved: true` flag are packaged for the editor.

Example flower entry:

```json
{"id":"ribbon_rose_red","label":"Ruby ribbon rose","material":"ribbon_rose","colour":"red","url":"art/satin-rose-red.png","width":1024,"height":1024,"headRadius":0.44}
```

Example wrap entry:

```json
{"id":"wrap_black_dome","mode":"dome","colour":"black","url":"art/wrap-triangle-black-dome.png","width":1440,"height":1640}
```

Current runtime supports one registered wrap per mode/colour, one active bow and
one sash style. Multiple paper patterns, independently movable accessories,
glitter rendering and exact starting recipes need the final inspected assets and
the florist’s recipe counts. Do not claim those visual details are already complete.

The builder initially shows the original reference photo, clearly labelled. It
does not invent satin artwork or pretend the photo changes when controls change.

Rebuild: `node builder/tools/build-raysbouquetz.cjs`
