# Pink Promise realism update — 20 October 2026

Reference: the user's pink rose / baby's breath / satin bow photograph, also available as photo_3_2026-10-16_23-33-51.jpg.

## Implemented

- Pink Promise combines actual photographed oblique rose cups and side views with the existing front views. Measured source-image cup positions guide filler placement, rather than assuming the visible spiral is at the center of every image rectangle.
- A new pink satin bow replaces the ivory-looking bow in this finish. Its dimensions, rendering and drag hitbox use the same metadata. Classic ties and the lily bouquet's existing bow remain separate.
- The featured starter has 32 editable roses, full baby's breath and a larger bow above the left-center group. This is a visual interpretation, not a confirmed florist inventory. Old saved designs retain their own quantities and stored decoration positions; their rendering receives the revised artwork.
- Shared baby's breath uses a photographic branching cutout with larger readable florets. Light uses complete airy sprigs. Medium adds a second branch tip per selected stem in a different nearby gap. Full adds additional tips and slightly larger branches. Added visual tips belong to existing filler units; they are not billed as extra stems.
- Placement uses inter-flower gaps, measured flower silhouettes, rose-cup clearance, spacing between tips, and several candidate orientations. No hard clipping erases florets or leaves. The density settings retain all flower centers and quantities, with the existing gentle render-only size reduction as density increases.
- The optional perimeter baby's-breath wrap uses the new source and complete silhouettes too. Initial-letter texture retains the compact source designed for that purpose.

## Visual limits

This remains a layered 2D interpretation. The real bouquet has additional individual rose views, irregular stem heights, lighting variations and ribbon folds which cannot be recovered from a single photo. The generated sprig and bow are new artwork guided by the reference, not exact cutouts from it. Do not label this an exact replica or an owner-confirmed recipe.

## Verification and review files

The infill regression checks branch ownership, no duplicated gap positions, unchanged purchased flowers, filler billing, no leaf/floret clipping, deterministic saved links, unrelated-edit stability, finite geometry, and PNG export. The customization suite exercises density levels across Classic, Dome and Heart, gift placement and mobile dragging/undo/reload. The UI suite covers all four levels, independent sprays, toys, satin, perimeter filler, saved order sheets and mobile layouts. Top Sellers checks actual links and assets in English/Spanish at multiple widths.

Review images are in `clients/la-flor-eterna/qa/next-phase/`: `pink-promise-realism-preview.png`, `infill-density-pink-promise.png`, and the lily/sunflower density sheets. Screenshots are evidence for review, not proof of botanical accuracy.

## Generated assets and provenance

Both were made with built-in imagegen, transparent_background=true, using the original florist photograph as a visual reference. Original generated files are preserved; project copies are:

- `clients/la-flor-eterna/assets/refinements-oct19/breath-branch-v2.png` — 1430 × 1100 RGBA.
- `clients/la-flor-eterna/assets/refinements-oct19/bow-pink-reference-v2.png` — 1091 × 1442 RGBA.

### Baby's breath prompt

Use case: photorealistic-natural. Asset for compositing between roses in the provided florist photograph. Generate ONLY ONE complete small branching sprig of fresh baby's breath, true transparent background. Match the reference's cream-white double ruffled gypsophila florets and muted fine green branching stems. Approximately 24 clearly defined fluffy tiny blossoms, irregular groups of 2-4 at branch ends, some buds; blossoms visibly have layered curled petals, NOT beads or dots. Open asymmetrical fan, wider than tall, branches gently arc left and right with lots of transparent space between flower groups, main attachment at bottom center with a VERY SHORT bare stem. Several blossoms slightly turned sideways for realism. Overall width about 1.3 times height, flower heads each about 5-8% of sprig width so they read at small display scale. Soft diffuse daylight, botanical photographic texture. Entire intact sprig inside frame, 5% margin, no rose, bow, paper, vase, text, dirt, checkerboard, isolated floating particles or background shadow. Do not generate a whole bouquet, a dense cauliflower cloud or a long upright stalk.

### Satin bow prompt

Use case: product-mockup. Create an isolated real satin bow matching the pink satin bow in the attached florist reference. ONLY the bow on true transparent background. Two full asymmetrical glossy pale pink satin loops spread horizontally at the top, a small silver faceted bead at the knot, two broad long flowing tails hanging down: left tail drapes diagonally to the lower left and is somewhat shorter; right tail hangs almost vertically with a natural diagonal fabric cut. Delicate satin folds, soft daylight sheen and subtle natural shadows ON the fabric. Pink, not ivory or peach. Top loops comprise about the top 32% of full height; both tails fill the lower 68%. Front view matching the bouquet photograph. Full intact ribbon edges and tips, no crop, 5% clear margin. No flowers, paper, text, bouquet, background shadow, illustration or checkerboard. Single photographic ribbon accessory suitable for layering on the front of a flower bouquet.
