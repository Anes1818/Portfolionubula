# Halloween bouquet logic — final local version

Updated 2026-10-09. All three designs are live under **Spooky Bouquets**. The For Love and Autumn collections remain available.

## Default recipes

| Recipe | Flower slots | Separate extras | Wrapping |
|---|---|---|---|
| Scream for You | 30 red roses | 6 baby's-breath sprigs, mask, long black bow | Existing black round collar, stretched vertically 10% |
| Forever My Boo | 22 red + 22 black roses | 6 ghost decals, editable black sash | Existing black round collar |
| Midnight Blooms | 5 pink lilies + 3 pink gerberas + 8 black roses + 4 burgundy mums | 3 blue thistles | Supplied tall black fan wrap |

These are designed counts, not counts inferred from the photographs. The unsupplied Jack coffin topper is omitted and never charged. The existing black collar substitutes for the unsupplied angular paper. The long bow has no printed message; Forever My Boo has an editable sash message of up to 28 characters.

## Artwork intake

All seven supplied PNGs are retained unchanged under `assets/halloween/`. `tools/prepare-halloween.cjs` makes lossless WebP delivery copies and checks every alpha value and every visible RGB value against the originals. Dimensions and original filenames are recorded in `assets/halloween/manifest.json`.

| Supplied filename suffix | Local asset |
|---|---|
| 234823_755.png | rose-black-a |
| 234824_130.png | rose-black-b |
| 234823_567.png | black-bow-tails |
| 234823_903.png | pink-dark-daisy |
| 234824_174.png | blue-thistle |
| 234824_381.png | black-fan-wrap |
| 234824_467.png | scream-mask |

Red rose variants, lily, burgundy mum and baby's breath reuse existing assets. Ghosts use the separate code-native SVG `ghost-decal.svg`.

## Implementation map

- `halloween-layout.js`: deterministic geometry, species ratios, exclusions, recipe quantities and component inventory; global `NebulaHalloween`.
- `halloween.js`: live catalogue adapter, dimensions, fitting, slot rules, finishes, sample prices and offline artwork; global `NebulaSpooky`.
- `model.js`: edits, validation, price totals and saved-state rules.
- `fall.js`: routes Halloween into the existing organic layout/picking path.
- `renderer.js`: shared scene for gallery, preview, picking and PNG export.
- `design-link.js`: shared links retaining recipe, seed, empty slots and finishes.
- `app.js`, `index.html`, `i18n-v6.js`: English/Spanish gallery and controls.
- `order.js`, `order.html`: florist sheet with matching artwork and quantities.
- `halloween-embedded.js`: generated fallback loaded only for local `file:` sessions.

## Units and petal overlap

The planning unit **D** maps to **68 world pixels**. It describes spacing rather than the literal final photographic rose diameter. Scream and Forever use a **1.35 petal-envelope multiplier**. Midnight uses **1.60** to close gaps around the narrower three-quarter lily silhouette. Each recipe applies its multiplier equally to every species, retaining the size ratios. The table below gives the 1.35 baseline; multiply planning diameters by 1.60 for Midnight.

| Species | Planning diameter | Rendered maximum dimension |
|---|---:|---:|
| Red/black and compatible replacement roses | 1D | 1.35D |
| Pink lily | 1.8D | 2.43D |
| Pink gerbera | 1.45D | 1.9575D |
| Burgundy mum | 1.05D | 1.4175D |

Source aspect ratio is preserved: for source dimensions `(iw, ih)` and required maximum dimension `d`, use `k = d / max(iw, ih)`. These are artistic size assumptions, not predictions of real flower measurements.

World coordinates: `x = 360 + 68u`, `y = 390 + 68v`.

Fit the entire scene with `scale = min(availableWidth / boundsWidth, availableHeight / boundsHeight)`. Bounds include rotated flower corners, filler, props and complete paper. Preview and export use the same scene, keeping the tall wrap visible.

## Scream for You

Twelve inner rose centres follow an ellipse with radii `(1.80D, 2.40D)`; eighteen outer centres use `(2.68D, 3.34D)`. Equal arc-length sampling, from a 2,048-segment cumulative table, avoids crowding ellipse ends.

The mask reserve is an ellipse with radii `(1.05D, 1.65D)`. Numerically sample 720 boundary points and require:

`distance(roseCentre, maskBoundary) >= 0.5 × 1.35D + 0.05D`.

This reserve protects the central opening from flower centres. The supplied 520 × 1104 mask now renders at 4.75D high and `4.75D × 520 / 1104 ≈ 2.237D` wide, centered at `(0, 0.10D)`. Its natural silhouette overlaps the inner petals to fill the opening instead of floating inside a larger black gap. Source aspect ratio, flower positions, 30 stem count and price remain unchanged. The artwork extends beyond the core reserve; the live integration check verifies that every charged rose still contributes visible pixels. Removing the mask now reflows the same 30 slots into a filled ellipse; see CONNECTED-BUILDER-2026-10-09.md for the equations.

Baby's breath follows the outer ellipse `(2.83D, 3.47D)`, with 0–12 counted sprigs, default 6. The fixed upper-left black bow can be toggled and intentionally overlaps petals.

## Forever My Boo

Four staggered rings contain `1 + 7 + 14 + 22 = 44` roses at radii `0, 1.00D, 1.98D, 2.99D`. Stable slots alternate between two source variants per rose color.

Divide the plane into eight sectors. Allocate `floor(sectorCount / 2)` black roses per sector; distribute the remaining quota among odd-sized sectors in seeded order. Defaults contain exactly 22 red and 22 black roses, with a difference of at most one between colors in every sector.

Six ghost positions lie at radius `3.96D`, on the paper layer behind flowers. The count control selects 0–6. Adding ghosts enables the wrapper; paper removal is disabled until ghosts are removed. The black sash uses fitted white text. Existing position/height controls remain available; the front sash intentionally overlaps petals without reducing the flower count.

## Midnight Blooms

Revised 8 October after comparing the generated catalog photo against the real inspiration. A more photographic catalog image alone preserved the old flat arrangement, so the editable geometry was revised first.

Keep 20 stable slots: five lilies, three gerberas, eight black roses, four burgundy mums. Three thistles remain separately counted. Lily anchors (before the final upward shift) are:

| Slot | x / D | y / D | Rotation, radians | Draw depth |
|---|---:|---:|---:|---:|
| 0 | -2.15 | -1.10 | -0.38 | 28 |
| 1 | 0.05 | -0.20 | 0.20 | 34 |
| 2 | 2.05 | -0.75 | 0.43 | 27 |
| 3 | -1.55 | 1.30 | -0.58 | 36 |
| 4 | 0.90 | 1.85 | 0.30 | 38 |

Gerbera anchors are (-0.80, -2.55), (-2.35, 2.55), (2.45, 1.50), with draw depths 24, 39, 32. Supporting roses and mums use depth 25. Thus the high gerbera sits behind the support flowers and the low left gerbera overlaps the front lily. Sorting is by depth then y, instead of putting every large species over every small species.

Support centers are selected from 2,400 seeded golden-angle candidates:

- angle = i * 2.39996323 + seeded jitter up to 0.02 radians;
- radius = sqrt((i + 0.5) / 2400);
- x = 3.0 * radius * cos(angle);
- y = 0.15 + 2.65 * radius * sin(angle).

For each support flower maximize min(distance(candidate, occupied) / ((candidateDiameter + occupiedDiameter) / 2)); reject scores below 0.70. Thistles use the same gap search and stay at least 1.40D apart. Shift every flower and thistle upward by 0.25D. Rendered flower size is planning diameter * 1.60 * 68 pixels, with the original image aspect ratio preserved.

All five lilies now use the existing assets/classic/lily-bloom.webp photograph (567 x 479), whose curled petals and visible stamens read as a three-quarter view. No bitmap was generated or altered. Rotations vary orientation only; they do not create new camera views. Custom replacements select their own normal flower artwork. Asset loading already includes this lily photograph for both HTTP and offline use.

Paper is 9D wide and 9D * 1042 / 754 high, centered at (0, 0.40D). The adapter uses this same plan value, removing the duplicated wrapper coordinates. After the first revision at 7.5D wide, user feedback requested more wrapping. The current 9D wrapper is 20 percent larger in both dimensions, exposing more paper around the unchanged flower canopy. The whole wrapper stays at its natural source ratio.

There is no topper or unused topper reservation. The default count and sample estimate are unchanged. Existing saved Midnight designs use this revised geometry while retaining their slot overrides, missing flowers, colors and extras.

### Remaining visual limitations

This remains a 2D composition of cutouts. The lily source repeats five times, some leaf/neck fragments remain in that asset, and the supplied wrapper is a single image behind the flowers. A separately aligned front fold and distinct lily photographs are needed for stronger depth. The Jack/coffin topper from the inspiration is still absent. See MIDNIGHT-ASSET-NEXT-STEPS.md for complete optional asset prompts. Do not present a generated catalog photograph as an exact preview until its arrangement agrees with the editable composition.

## Layers and editing rules

1. Photographic wrapper. Round designs also have a flat dark interior backing representing the shadowed inside of black paper. This is a visual approximation, not additional foliage, a paid object or evidence of flower coverage.
2. Ghost decals on paper.
3. Flowers: size order for round designs; explicit slot depth for Midnight.
4. Counted white/blue filler.
5. Mask, bow and sash.

Flower slots and item IDs remain stable. Replace, remove, refill and compatible swaps preserve other positions. A replacement must fit that slot's original species diameter: a rose fits a lily slot, while a lily cannot fit a rose slot. Invalid replacements/swaps fail atomically. Empty slots subtract their stem price and persist in JSON/links.

Recipe capacities stay at 30, 44 and 20. The size selector is hidden and arbitrary resizing is rejected. New quantities need explicitly designed layouts with equivalent collision checks.

All collection bouquets now share toys, crowns, initials, greenery, sashes and Halloween extras. Ghost decals require wrapping. Malformed values remain rejected; see CONNECTED-BUILDER-2026-10-09.md for current behavior.

## Prices and saved designs

The geometry inventory has no prices. The live model is the pricing authority: each occupied flower slot costs one catalogue unit. Mask, bow, ghost and thistle counts feed both renderer and `price().extraLines`. White filler uses the existing counted baby's-breath charge. Wrapping is included in existing base preparation, not charged again.

New sample prices in integer cents: black rose 400, pink gerbera 400, mask 2000, long bow 400, ghost 100 each, thistle 250 each. Override through `NEBULA_SHOP.flowerPrices` and `NEBULA_SHOP.extrasCents`. Existing sample-price notices remain; the florist confirms actual production and pricing. No omitted topper is charged.

Version-6 state adds `template.layout = 'halloween'`, `template.halloweenRecipe`, and finishes `spookyMask`, `spookyBow`, `ghostCount`, `thistleCount`. Older designs default to false/zero. Sharing, validation, undo, reload, JSON and the florist sheet use the same state pipeline.

## Verification and running locally

- `node builder/tests/halloween/verify.cjs`: 35 geometry/count/readiness checks, including expanded petals around the mask.
- `node builder/tests/halloween/integration.cjs`: live gallery, exact counts, every flower contributing visible pixels, pricing, edits, invalid inputs, undo, sharing, reload, florist sheet, Spanish controls, 320/390px screens and offline exports.
- `node builder/tests/fall/romance.cjs` and `node builder/tests/fall/verify.cjs`: existing Love/Autumn regression checks.
- Final PNGs and machine-readable results are in `tests/halloween/`.

Browser tests use Playwright and headless Edge. Open `http://127.0.0.1:8767/builder/`; start the server with `node builder/tools/serve-local.cjs 8767` if needed. `docs/halloween-plan.html` is the construction diagram; the gallery shows actual artwork.

This is a local 2D design preview, not a deployed site or physically exact florist simulation. Lighting and perspective come from separate cutouts. The recipes function with the current assets; the Midnight asset note describes optional improvements needed to approach the supplied reference.

## Spooky customization update — 7 October

The Flowers panel now makes the editing flow explicit. All ten supplied rose
colors are offered in the Halloween filter. A selected flower reports its number
of compatible positions. Oversized substitutions explain the position requirement
instead of suggesting an unavailable rearrangement.

“Change all roses” changes only occupied rose slots to the selected rose variety.
It preserves empty slots, non-rose flowers, slot identities, positions and finishes;
the entire action is one Undo step. Prices use the newly selected catalogue variety.
The original 30 / 44 / 20 slot capacities and collision envelopes still apply.

All three recipes support black, ivory, blush, sage and custom paper tones on their
original photographic wrapper. Black uses the original artwork; other tones are
explicitly labelled digital color previews. Tinting preserves alpha and uses
`L = 0.2126R + 0.7152G + 0.0722B` and a shadow-preserving pigment multiplier
`0.42 + 0.58 × sqrt(L / 255)` for black-source paper, avoiding clipped white folds.
Round interior backing follows the paper tone. Light paper adds a small shadow
beneath ghost decals. This backing is never counted as flower coverage.

As of 9 October, cocoa wrapping is also available and seasonal extras are shared
across all Dome collection recipes. Ghost decals still require wrapping.
Shortcuts open Wrapping or Finishing; gift notes work for all three, and Forever
My Boo also retains its editable sash. JSON, links, Undo and florist sheets carry
the chosen colors and messages through the existing validated state pipeline.

`tests/halloween/customization.cjs` checks bulk recolor, undo, saved prices and
colors, paper pixel changes without flower movement, fit feedback, deleted slots,
Spanish labels and 320/390px controls. No additional bitmap assets are needed.
