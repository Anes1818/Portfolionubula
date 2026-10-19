# Reference match review — 19 October 2026

Reference: photo_5_2026-10-16_23-33-51.jpg, supplied by the user. This is a visual study, not a verified florist stem recipe. Occluded flowers cannot be counted reliably from this photograph.

## Corrected in the running builder

- Removed the half-plane destination-out mask from interior filler. It sliced complete leaves and white blossoms wherever a foreground petal overlapped the lower portion of the cutout.
- Infill fitting now evaluates the complete visible asset; it no longer assumes unwanted leaves can be erased. Greenery sizes are reduced to suit the gaps. All selected greenery units remain present.
- Replaced the flat teal sparse eucalyptus with a complete silver, textured sprig. It uses its own crown and attachment coordinates and real image dimensions. No geometric mask removes its leaves.
- Mixed-lily pink roses now use the existing photographed oblique rose cups and side views. Flower quantities, slot anchors and prices are unchanged.
- Browser pixel regression compares each infill cutout against its unmasked silhouette with flower geometry present. Density, counts, links, replacement, asset loading and build checks also pass. These checks establish correctness, not photographic identity.

## Why this is still an interpretation

The default has 28 main flowers, including 6 lilies and 22 roses, plus 4 white accents and 8 greenery units. That inventory is not confirmed by the florist. It creates a rose-heavy dome, while the photograph shows a smaller central rose group, substantial stock sprays, open and closed lilies, and a bow nearer the center. Changing only rotation or adding filler cannot correct those differences.

## Reference-specific construction

1. Confirm the florist's sellable recipe: rose stems by color, lily stems and expected open heads/buds per stem, white stock stems, greenery, paper and ribbon. Count heads separately from stems so the illustration does not silently charge for decorative buds.
2. Build an explicit, versioned arrangement template. Store normalized positions, view choices, scale and depth in the same geometry consumed by drawing, hit testing and dragging; do not add renderer-only position offsets. Keep the existing template available to saved designs.
3. Use the central region for an irregular blush/ivory rose group. Reserve larger peripheral regions for lilies: upper-left/upper-center, both shoulders and lower edge. Match the photographed asymmetric outline, rather than evenly alternating the flower types across a circular grid.
4. Add closed buds as parts of their lily stems. Connect their origin to the same stem group and keep each visible head editable without misrepresenting the florist's stem quantity.
5. Place tall stock sprays rising at the upper left, with shorter clustered tips near the lower left, lower center and right shoulder. Do not make every stock stem the same short round stamp. Use existing tall and short assets as the first trial.
6. Fit short eucalyptus into seams and selected outward-facing edges. Keep complete leaves in front of petals, with short attachment stems. Do not fill every available gap or arrange a uniform green ring.
7. Put the bow knot near the central upper rose group, with tails falling down through the middle. Save this in the new preset's decoration coordinates so dragging and links agree. Do not reposition an existing user's bow during every render.
8. Compare matched crops of the florist photograph and the editor at phone and desktop sizes. Assess outline, relative flower sizes, ivory/blush/green area balance, center of the bow and visible stock height before adding more detail.

## Still-needed source views

- A closed pink/green lily bud with a short connected neck, plus a partially opening bud. Match the pink lily family, diffuse daylight and true alpha. Each botanical part must be complete, not cut off by the canvas.
- An ivory rose cup at a three-quarter angle. The current ivory heads are overhead spiral views and remain a major perspective mismatch.
- Optional: a second dusty round-leaf eucalyptus tip with smaller leaves, to reduce repetition. The new sprig is usable now; a second view would improve variation.

For literal product matching, isolated photographs from the florist's actual flowers under consistent light are preferable to generated substitutes. A single flattened photograph cannot supply occluded views or an exact stem inventory.

## Generated asset provenance

Built-in imagegen was used, with photo_5_2026-10-16_23-33-51.jpg as the reference and transparent_background=true. Original output is preserved; the project copy is `clients/la-flor-eterna/assets/refinements-oct19/eucalyptus-silver-tip-v2.png` (1100 × 1430 RGBA). No API/CLI fallback was used.

Prompt:

> Create one photorealistic isolated florist eucalyptus tip asset for a layered bouquet builder, transparent background. Reference image supplied shows desired dusty blue-green round eucalyptus leaves at lower left and lower right of real bouquet. Generate ONLY a small single complete eucalyptus sprig, 6 rounded silver dollar leaves in irregular alternating pairs with powdery mottled silver bloom and subtle natural veins, realistic angled leaves, soft diffuse florist lighting, muted dusty sage not flat teal. Slender natural branching stem, a very short bare attachment at bottom center, growing upward with slight lean right. Entire sprig and all leaf edges visible with 8% empty padding on every side. Compact rounded cluster, height roughly 1.3 times width. No flowers, paper, bow, vase, text, checkerboard or cast background shadow. Real botanical photography, not illustration. This is a component to overlay petals, not a whole bouquet.

The generated result has five prominent leaves, rather than the requested six. This is acceptable as a visual sprig variant; it does not define the priced stem count. It is not an exact extraction from the florist photograph.
