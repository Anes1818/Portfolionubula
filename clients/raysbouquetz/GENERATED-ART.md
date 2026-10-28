# Confirmed material update

Added `public/art/foam-rose-black-v1.png` (1254 × 1254 RGBA), a matte black foam head generated with the built-in image_gen tool. It is integrated into Money Moves with seven foam roses. Original output is retained. Exact prompt and provenance: `foam-rose-prompt.md`. All previous art is preserved.

# Follow-up: first builder preview

Selected satin flower, triangle-wrap, bow and cap candidates are now integrated into the original builder for owner review. Artwork approval remains pending. Card and CAD-note candidates with glow are withheld. See `README.md` for the current build; the generation-session report below describes the earlier handoff before integration.

---

# Ray’s Bouquetz generated artwork — 26 October 2026

Created with the built-in image_gen tool. These are artwork candidates, not approved or integrated website assets. No builder, catalogue, checkout or website code was changed during this artwork session.

## What is saved

`public/art/` contains 26 distinct assets plus two cleanup attempts (28 PNG files total):

- Nine satin roses: red, black, purple, lilac, pink, ivory, blue, peach, and glitter red.
- Three satin dahlias: pink, blue and ivory.
- Three five-petal ribbon flowers: purple, lilac and ivory.
- One yellow satin sunflower.
- Four empty triangular dome surrounds: black, lilac, pink and ivory.
- Two empty triangular heart surrounds: black and lilac.
- One lilac bow, one graduation cap, one blank gift card and one illustrative folded Canadian-style note.

Every file is RGBA and has transparent pixels. The centre pixel of all six wrapping surrounds is fully transparent. Those checks do not establish that every edge is clean or that every pixel inside each opening is transparent.

## Visual review and limitations

All outputs were viewed during generation. They are individual objects rather than whole bouquets. Flower material is folded satin/ribbon; the wraps use the requested small triangular silhouette.

- The pastel wraps, pale flowers, bow, sunflower and gold tassel show some edge fringing or stray pixels. Inspect on light and dark backgrounds before production use.
- Both versions of the blank card and folded Canadian-style note retain visible coloured glow around their silhouettes. The targeted background-removal attempts did not solve this. Neither version should be integrated as a clean sprite yet.
- The note is a decorative CAD-inspired illustration, not a faithful Canadian banknote. Its printed denomination must not drive pricing or imply that every selected denomination is shown accurately. Currency, face value, count and approved conversion belong in the builder’s data.
- `card-blank-v2.png` and `folded-cad-note-v2.png` are retained cleanup attempts, not approved replacements for v1.
- No file is registered in the asset manifest, assigned to a recipe, or published. Asset approval remains pending.

## Remaining artwork work

Priority: remove edge halos/specks, especially the card and folded note, and verify the whole cutout on both light and dark backgrounds. Keep original versions and save clean replacements with a new version suffix.

Optional later additions: specific wrapping-paper patterns chosen by the shop; foam rose only if the shop confirms it is needed. Existing crown, butterfly, black bow and blank sash assets can be reused after checking their style. A money fan can be assembled from individual folded notes; no whole-fan image is required. No separate banknote image is required for every price denomination.

For a further image-editor cleanup request, attach the relevant PNG and use:

> Preserve the physical object, its exact shape, folds, colour and surface detail. Remove all surrounding glow, haze, shadow, coloured fringe and detached specks. Every pixel outside the physical silhouette must be fully transparent alpha. Do not add a background or checkerboard, redesign the object, or change its lighting. Keep the complete object inside the canvas.

## Files for handoff

- `generated-art-prompts.json`: exact generation and edit prompts for all 28 files.
- `generated-art-metadata.json`: actual pixel dimensions, alpha range, centre alpha and byte sizes.
- `raysbouquetz-generated-art-v1.zip`: PNGs plus this guide, metadata and prompt inventory. Contains no private onboarding information.

Later integration must use the existing builder and a shared complete bouquet recipe for both Order and Customise. Artwork generation alone does not complete that integration.
