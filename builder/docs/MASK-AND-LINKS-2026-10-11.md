# Mask layout and compact design links

## Mask and flowers

All Dome bouquets reserve space when the horror mask is enabled. Paid flower nodes
move around a padded ellipse rather than being removed. The number and types of
flowers remain unchanged. Removing the mask restores the underlying arrangement.

For each bloom, the exclusion ellipse has radii `mask.width / 2 + bloom.width * .42
+ 6` and `mask.height / 2 + bloom.height * .42 + 6`. A deterministic 120-pass
relaxation combines a spring toward the original position, pair separation and
projection outside this ellipse. Slot hit targets follow their rendered flowers;
moving flowers uses those adjusted targets. Only fresh scene geometry is changed.

## Sash placement

With a mask enabled, the sash moves below the mask, keeping 8 scene units of
clearance. Its rotated bounding box is used, including diagonal sashes. The attached
bow moves by the same amount. The stored placement and offset stay intact and take
effect again when the mask is removed.

## Link format

The encoder chooses the shortest of legacy v6 JSON, compact v7 arrays, and packed
versions, with or without a local flower dictionary. The `z1_` prefix identifies
bounded LZ-packed UTF-8 data. Decoding expands v7 to the existing validated recipe.
Decompression is bounded to 64,000 bytes; malformed matches and invalid recipes
are rejected. Both the builder and florist sheet use the same decoder.

Links remain self-contained, work across devices, and preserve Unicode and order
details. Older v6 links still open. This is compression, not an ID-based shortening
service; a tiny fixed-length URL would require persistent server-side storage.

Measured recipe-code lengths with identical sample order details:

| Recipe | Previous | New |
| --- | ---: | ---: |
| Pink Promise | 372 | 308 |
| Written in Roses | 396 | 332 |
| Always You | 375 | 311 |
| Scream for You | 451 | 386 |
| Forever My Boo | 1048 | 469 |
| Midnight Blooms | 484 | 419 |
| Autumn Latte | 1002 | 531 |
| October Cream | 487 | 423 |
| Pumpkin Patch | 740 | 485 |
| Harvest Sunshine | 746 | 490 |

These figures exclude the URL prefix. Savings depend on the design and text.

## Verification

- `tests/mask-and-links.cjs`: all ten recipes, three sash placements and three
  offsets; flower count and layout restoration; masked flower movement; undo/redo;
  exact scene round trips; Unicode; 60 mixed-state round trips; legacy/malformed
  links; fresh-browser order opening and return to editing.
- `tests/launch-final.cjs`: all 13 checks passed after the new link format.
- `tests/phone-movement.cjs` and `tests/connected-options.cjs`: passed during this
  change. Phone screenshots checked in browser emulation, not on a physical phone.

## Shop setup and control polish

Build `20261011b` adds explicit sample prices for all 40 flowers/materials and 15
extras to `shop-config.js`. Existing totals are unchanged. A read-only
`node builder/tools/check-shop.cjs` checks every runtime catalogue key, detects
missing/invalid/unknown prices, checks identity/contact fields and prints the ten
recipe estimates. `--live` additionally requires demo mode to be off; `--json`
produces a structured report. It does not approve prices or publish anything.

The sash controls now explain, in English and Spanish, that a mask keeps the sash
below the face and the saved position applies fully after mask removal. Both
controls reference that explanation with `aria-describedby` and remain editable.

Validation: seven setup regression checks passed; all ten totals match the
previous configuration. Mask/link regressions passed again. Headless Edge at
390 × 844 verified both languages, mask toggling, unchanged saved settings,
restored sash geometry, undo/redo and no page errors.

Cache version: `20261011b`. Changes are local; deployment is a separate step.
