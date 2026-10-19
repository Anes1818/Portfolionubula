# La Flor Eterna — photographic asset prompt pack

Prepared 17 October 2026. Prompts only; no images generated in this review.

## How to use

Start with the pink reference `C:/Users/laptops zone/Downloads/Telegram Desktop/photo_3_2026-10-16_23-33-51.jpg`. Attach it as a visual reference, not as a request to replicate its background. Generate one asset per call. For each call, combine the common brief with exactly one asset brief below. Supply an accepted first asset as a second reference to keep camera, color and light consistent.

For Codex execution use the imagegen skill and built-in image tool; set `transparent_background:true`. Do not use a white or checkerboard background as a substitute for real alpha. The tool may choose output dimensions; inspect the returned file and preserve the master rather than claiming an unrequested format was delivered. Do not upscale a poor image and call it high quality.

Inspect existing assets first. These eight first-pass files are a maximum missing-component set, not a requirement to regenerate suitable originals. Do not generate every later asset before the first assembled bouquet passes visual review.

## Common brief — paste before each asset brief

```text
Create one photorealistic photographic cutout for an editable florist bouquet, not a finished bouquet illustration.

Image 1 is a reference for the florist's real materials, flower color and character. Its background, shop furniture, printed business card and complete arrangement must not appear. If Image 2 is supplied, it is the accepted lighting/camera reference for this asset family.

Visual system: an upright hand-tied bouquet photographed from an elevated front view, camera looking down approximately 35 degrees. Natural floral product photography, mild telephoto perspective, soft diffuse daylight from upper left, restrained highlights and natural color. Match the accepted reference family over the numeric angle if needed.

Show real fine surface texture, natural asymmetry and believable thin material edges. Preserve fine branching and transparent spaces. No plastic, wax, 3D-render sheen, cartoon outlines, neon saturation or artificially perfect symmetry. Keep integral self-shadow and gentle form shading; no cast shadow on an imaginary floor.

Output exactly one isolated object on a genuinely transparent background with clean alpha and a small clear margin. Nothing clipped. No labels, words, logos, watermarks, border, checkerboard pattern, collage or contact sheet. Do not add any object not requested in the asset brief. This image will overlap other independent cutouts, so the silhouette and perspective must be physically plausible.
```

## First proof set: pink roses, filler, paper and bow

### P01 — rose-blush-open-a.png

```text
Subject: one fresh dusty blush-pink rose bloom, medium-open, matching the warm salmon-pink roses in Image 1. Show the natural curled spiral center, overlapping irregular petals, delicate veins and gently darker petal creases. Three-quarter view with the center visible; the bloom faces toward the camera with a slight upward tilt. Include only a short green neck below the calyx, sufficient for tucking behind another flower. No long stem, no leaves, no filler, no wrapping. Center the bloom; preserve complete outer petals.
```

### P02 — rose-blush-open-b.png

```text
Subject: another individual dusty blush-pink rose of the same cultivar and freshness as the accepted rose in Image 2. Match its color, texture, camera and lighting. Give this bloom a naturally different petal arrangement and a slightly looser outer cup, facing about 15 degrees toward the viewer's left. This must be a different physical bloom, not a rotated or mirrored copy. Keep the center readable. Include only its short green neck; no other objects.
```

### P03 — rose-blush-edge-left.png

```text
Subject: one dusty blush-pink rose of the accepted family, inclined outward for the left edge of a bouquet. View the blossom obliquely so the side of its cupped petals is visible and its center is less exposed than the central bloom. Natural outward tilt, not a face-on flower rotated in the image plane. Include its short neck. Keep all petals in frame. Same camera and upper-left light as the accepted reference.
```

### P04 — rose-blush-edge-right.png

```text
Subject: one dusty blush-pink rose of the accepted family, inclined outward for the right edge of a bouquet. Show a convincing side/three-quarter cup with a partly visible center, distinct petal arrangement and short neck. Keep light coming from upper left; do not simply mirror the left-edge asset, which would reverse the lighting. Preserve every outer petal within the frame.
```

### P05 — babys-breath-airy-a.png

```text
Subject: one small airy branching sprig of white baby's breath like the tiny white filler in Image 1. Fine irregular green branches with distinct small white florets and a few buds; plenty of transparent space between branches. The sprig fans upward, loosely and asymmetrically, with a short stem base for tucking between roses. Show realistic botanical branching and varied flower orientation. No large white blobs, repeated pearl dots, cotton clouds or solid white disk. No roses or other greenery.
```

### P06 — babys-breath-airy-b.png

```text
Subject: a second, smaller, laterally branching baby's-breath sprig in the accepted photographic family. Its airy branches extend gently toward the right with irregular small white florets, a few closed buds and a narrow stem base. Different branching from Image 2; preserve delicate green connections and true empty gaps. It will occupy a gap between rose heads, so avoid a dense opaque mass. No other flowers or props.
```

### P07 — wrap-gingham-ivory-master.png

```text
Subject: one empty florist paper wrap shell inspired by Image 1: warm peach-and-white gingham outer sheets and soft ivory inner sheets, folded into a broad hand-tied bouquet sleeve. Elevated front view matching the rose asset family. Naturally overlapping broad folded corners, subtle paper thickness, believable crease shading and softly irregular edges. The gingham follows the folded paper surfaces instead of appearing as a flat pasted texture.

The upper opening is a generous oval cavity intended to receive a mound of roses later. Render no flowers, foliage, stems, bow, card or logo. The central aperture must be genuinely open/transparent where the flowers would enter; no painted white oval, placeholder disk or checkerboard. Keep visible inner/back paper and the lower front cuff physically coherent. Taper the lower sleeve naturally. Include the entire wrap with margin.

This single coherent wrap will be divided into aligned front/back drawing regions by the application. Do not output separate unrelated pieces or a diagram.
```

### P08 — bow-pink-satin-longtails.png

```text
Subject: one real light blush-pink satin florist bow inspired by the bow resting over the roses in Image 1. Two full softly folded loops, a small tight central knot and two long asymmetric hanging ribbon tails. Satin has fine fabric grain and soft directional sheen, with believable folded edges, not a plastic surface. The tails curve gently down over an imaginary mound of flowers; they must remain separate wherever there is an actual gap. Match the elevated camera and upper-left lighting of the rose family. Entire bow and tails isolated, no flowers, pin text, wrapping or background. Avoid a perfectly symmetric gift-icon silhouette.
```

## Evaluate before expanding

Compose the eight-or-fewer accepted assets into one reference layout. Generation alone is not the deliverable. Reject mismatched perspectives, blurred florets, green confetti, dark/white halos, oversaturated roses, checkerboard pixels, unnatural repeated rows and a bow that looks like a sticker.

Inspect on ivory, white and a dark background at 100% and at the actual mobile display size. A source may have genuine transparency while its edge colors still look poor. Check alpha separately from appearance. Keep filenames, source references, generation brief and acceptance notes in an asset manifest.

Record measured alpha bounds, a flower/attachment anchor, crop/pivot and family view for each file. If cropping, transform anchor coordinates too. Do not guess crop metadata from a prompt. Preserve masters. Create aligned wrap masks from the same source using code/vector paths; image edits use the image tool unless the user explicitly requests another method. A composite image must never replace the editable scene while being presented as editable.

## Second batch — only after the pink proof succeeds

Use the same common brief and substitute the relevant real client photograph as Image 1. Each bullet below is one separate generation call; inspect existing files before generating.

### Red rose family

Reference: `photo_2_2026-10-16_23-33-51.jpg`.

```text
One natural deep crimson-red rose bloom, medium-open, with velvety thin petals, a clear curled center and restrained rich red color. Three-quarter front view with a short green neck. Match the accepted rose family's photographic light and camera. No glitter, rhinestones, filler or other props. This is the clean base rose; optional embellishments are separate.
```

Generate one central and, only if needed after reuse checks, two distinct oblique edge variants using P03/P04's orientation constraints.

```text
One empty upright bouquet wrap shell matching the black folded paper in Image 1: layered smoky translucent charcoal florist paper with darker solid borders and a black lower cuff. Strong but natural folded peaks around a broad flower opening, tapering toward a visible narrow neck. Keep realistic transmission in the thin paper, not a metallic foil or shiny plastic cone. No flowers, stems, bow or card. Same coherent-source/open-aperture constraints as the accepted pink wrap, adapted to an upright bouquet silhouette.
```

```text
One small black satin bow tied at a bouquet neck, two soft loops and two unequal flowing tails. Natural folds, subtle edge highlights and textured black fabric with enough detail to read on charcoal paper. Front three-quarter view matching the black-wrap family, complete silhouette and genuine alpha. No stems or wrapping attached.
```

Glitter roses and silver filler are a later approved variant. Do not fake silver baby's breath by painting unrelated white blobs or silently add a paid finish.

### Mixed bouquet family

References: `photo_5_2026-10-16_23-33-51.jpg`, then `photo_4_2026-10-16_23-33-51.jpg`.

```text
One open pink-and-ivory lily bloom matching the lily character in Image 1: six naturally curved tepals, softly pink central areas, pale edges and restrained natural speckling, slender realistic stamens. Elevated front three-quarter view, facing slightly outward, with a short connected neck. Match the accepted camera/light family. Avoid a flat six-point star, cloned petals or oversized orange stamens. No extra blooms or buds in this asset.
```

```text
One botanically plausible closed lily bud with a short connected green stem, elongated tapered form, green outer surface with a restrained blush tint near the seam. Slight outward lean, consistent elevated camera and natural soft light. Realistic thin stem, intact attachment, no detached floating bud and no open flower.
```

```text
One fresh eucalyptus sprig like Image 1, with a slender continuous branching stem and irregularly spaced round dusty blue-green leaves. Show varied leaf angles, delicate natural veins, matte surfaces and partly overlapping leaves. Some leaves reveal an edge or underside. Airy natural asymmetry with transparent gaps. No perfect coin chain, plastic gloss, identical repeated discs or dense opaque wreath.
```

```text
One cream rose bloom matching the pale roses in Image 1, softly open and photographed in the same elevated front view as the accepted pink rose family. Warm ivory petals with subtle cream shadows, real petal texture and slight asymmetry, short green neck only. No yellow cast, pure white clipping or other props.
```

The upright white accent flowers in the client images need identification/confirmation before a species-specific production prompt. Existing white carnation/stock-like candidates may be useful, but do not label an uncertain botanical guess as her approved inventory. A lily bud rendered as a child of a stem is not automatically an extra charged stem.

### Gift set — deferred

Reference: `photo_1_2026-10-16_23-33-51.jpg`. Reuse a suitable sunflower if possible; otherwise:

```text
One fresh sunflower head with a short natural green neck, viewed obliquely from the elevated front. Golden-yellow irregular petals, dark brown textured seed center, green sepals partly visible at the edge. Slightly cupped profile rather than a perfectly flat circular icon. Match the accepted family light. No other flowers, wrap or ribbon.
```

Use the same wrap-shell method for yellow paper. Request a clean photo of the actual available chocolate box if needed for accuracy. Do not generate invented brand lettering/packaging and present it as the exact product. The box remains a separate optional gift item in both layout and pricing.

## Correction prompt template

```text
Edit only [specific defect] in Image 1. Preserve the accepted flower/material identity, color, camera, light direction, silhouette scale, transparent background and all other details. Required correction: [observable change, e.g. replace the dense white filler mass with finer connected branches and fewer florets]. Do not add props or change the composition. Return the same single isolated asset, not a comparison sheet.
```
