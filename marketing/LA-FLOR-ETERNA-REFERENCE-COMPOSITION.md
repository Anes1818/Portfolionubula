# Reference composition — 18 October 2026

## Customization rules audit

Reference compositions now draw lilies and sunflowers above the rose/filler layers, preserving their existing size and editable slots. Toys avoid focal flower centers and the mask face; the sash draws last and clears toy faces. With a mask, the gingham backing grows to cover the reserved arrangement. Fit uses all artwork bounds so toys and banners remain inside the preview. Blue thistles keep their own asset instead of being incorrectly converted into baby's breath.

`builder/tests/reference-customization.cjs` checks the combined 44-flower design with two lilies, a sunflower, Snoopy, Kitty, mask, personalized diagonal sash, paired filler and thistles. Checks include foreground ordering, mask separation, price lines, exact scene link reconstruction, missing assets, framing, real UI mask removal/toy layer change, undo/redo, reload, export and 320/390px widths. Full arrangements reject an additional stem until a slot is freed; removing then adding retains the expected count. This is a bounded combination audit, not proof that every arbitrary user arrangement is aesthetically balanced. Existing Halloween recipe restrictions remain in place.

## Paired filler update

At the user's request, `reference-v3` combines each compact tuft with one light branching layer from the earlier airy/wide assets. The branch is slightly offset and placed behind the crown and surrounding petals. Both visual layers belong to one selected filler unit: adding/removing a unit adds/removes the pair, and pricing is unchanged. Tests cover 0, 1, 5 and 12 units, link reconstruction, export and mobile layout. `reference-v1` and `reference-v2` shared designs retain their previous rendering. **Roses + gingham** now selects this paired version.

## Compact filler update

The user supplied `IMG_20261018_075829_729.png` and requested its use. It is a 618×588 RGBA image with real transparency, preserved unchanged as `breath-compact-reference-v1.png`. The visible **Roses + gingham** button now selects `reference-v2`: twelve compact tufts in the 44-rose proof, each approximately 40–49% of a standard rose diameter, varied deterministically and tucked into petal seams. Quantity zero removes them. Old `reference-v1` shared designs retain their original wide filler. The generation prompt later in this document is historical and no longer a pending request. The large satin bow remains pending.

The existing studio now has an opt-in `reference-v1` finish, labelled **Roses + gingham** under Flowers / Compare roses. Original and previous `blush-v1` links retain their artwork. No public deployment or default catalog change was made.

## Source and behavior

- Both user-supplied salmon roses and the complete gingham/ivory paper are preserved unchanged in `clients/la-flor-eterna/assets/pink-family/masters/` with measured alpha and SHA-256 metadata.
- Uses the existing editable flower slots and real selected quantities. Deterministic diameter, rotation and slight peripheral compression provide variation; they are not substitutes for true oblique source photographs.
- Gingham appears for ivory paper with wrapping enabled; other paper choices and the no-wrap setting still work.
- Existing branching baby's breath is interleaved with flowers. Soft occlusion under the rose centers avoids covering their spirals. Requested filler count is preserved; no unpriced extra flowers are inserted.
- The reference finish is saved in design links, undo/redo, local drafts, the florist SMS sheet and image exports.

## Verification

`builder/tests/reference-artwork.cjs` passed: count, price, sprig count, deterministic link reconstruction, undo/redo, reload, phone layout, SMS sheet round trip, replacing a flower, and export.

`builder/tests/rose-artwork.cjs` passed the old finish and original Nebula checks. `builder/tests/la-flor-eterna.cjs` passed all 63 checks.

Central flower-only alpha coverage: zero open pixels in the tested core (52,825 samples). This excludes the perimeter, paper, shadows and details, and does not certify photographic realism. Desktop headless rendering averaged approximately 3.2 ms per 720×820 paint over 15 frames; physical mobile performance has not been measured. SMS delivery on a real phone remains untested.

Review images and saved studio link: `clients/la-flor-eterna/qa/next-phase/reference-*`.

## Remaining visual work

The paper is much closer to the supplied reference. The existing baby's breath is a provisional reuse: it is sparse and softer than the real bouquet, and a matching asset should be reviewed in composition before replacing it. The large satin bow is still absent. Do not describe this proof as an exact recreation or owner-approved final artwork.

Next generation: attach Maritza's pink bouquet as the reference and generate only the isolated branching sprig below. Do not generate the whole bouquet or another rose batch.

```text
Use the tiny white filler flowers in the attached real bouquet as the appearance reference. Create one isolated photorealistic sprig of baby's breath for compositing between warm salmon roses.

Show a delicate, irregular branching spray, viewed from the same direction as the flower face in the reference bouquet. Fine muted green-tan stems must remain visibly connected. Place tiny creamy-white, softly ruffled blossoms in uneven little groups along the branch tips, with generous open spaces between branches. Include a few smaller buds. The flowers must look like miniature blossoms, not smooth white beads, berries, foam, or glitter.

An airy asymmetric fan shape with one short attachment stem pointing down and slightly right. Branches spread mainly upward and left. Keep the full sprig inside the canvas with clear margin. Soft diffuse daylight, restrained highlights, realistic fine botanical texture. No large leaves, roses, ribbon, wrapping, container, text, or external cast shadow. One sprig only, no grid or multiple separate specimens.

Export a high-resolution PNG with genuine alpha transparency, never a drawn checkerboard. If transparency is unavailable, use a perfectly uniform dark blue background instead and keep the white blossoms and fine stems clearly separate from it.
```

Judge the new sprig at final bouquet scale, not only enlarged. It should connect visually through inter-flower seams without hiding the rose centers. Preserve this version and change the finish version if later layout changes would alter existing shared designs.
