# Crimson Velvet assets

Built-in imagegen assets, generated 22 October 2026. Original files retained in the local Codex generated_images directory. Production copies are here; no external image service is required at runtime.

- `smoke-wrap.png`: transparent photographic empty smoke-black cellophane wrap, 1122 × 1402. Runtime uses one aligned image for the back and a contour-masked front so the stems tuck inside the rim.
- `rose-crimson.png`: transparent crimson rose with subtle glitter. Back/edge flowers also use the existing oblique red-rose photograph for angle variation.
- Cover: `../featured/crimson-velvet.jpg` is the supplied, unmodified story screenshot, framed with CSS. A generated cleanup was reviewed and rejected because it changed details of the label; it is not used.

Reference: user-supplied `photo_2026-10-22_23-10-57.jpg`. The editable recipe contains 20 individually stored rose stems; this is an interpretation, not a verified count or quoted price for the photographed product. Existing sample prices remain in effect.

## Generation briefs

Wrap: Create one photorealistic isolated transparent cutout of the empty smoke-black translucent cellophane wrapper from the reference, upright front view slightly from above. Tall irregular smoky silver-gray folded sheets with solid black border strips, gathered lower handle, broad dark inner cavity, low V-shaped black-tissue front rim. No flowers, leaves, ribbon, card, text or logo. All edges in frame. Real reflective highlights, not illustrated paper.

Rose: One deep crimson-red florist rose bloom, true transparent background, oblique three-quarter view about 35 degrees rather than overhead. Velvety petals, tight spiral and broad irregular outer petals, minute silver glitter on a few outer edges. No stem, leaves, paper, bow or extra flower. Soft indoor side light, red highlights and burgundy shadows; natural photographic detail.

## Integration

Authored anchors and flower-specific artwork are in `../../crimson-arrangement.js`. Wrap style `smoke-upright` is available to all Classic bouquets. `crimson-classic-v1` is versioned and serialized with the normal design link. Flowers, filler and removable bow remain independent. The catalog card uses the encoded recipe, with EN/ES copy.

Build: `node builder/tools/build-shop.cjs` then `node builder/tools/build-demo.cjs` from the repository root. Regression coverage: `builder/tests/crimson-preview.cjs`, `top-sellers.cjs`, `nebula-demo.cjs`, and `shop-build.cjs`.
