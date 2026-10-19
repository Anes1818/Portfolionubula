# Realism calibration — one rose first

18 October 2026. This supersedes the numeric 35-degree camera and wide-open rose instructions in the earlier first-batch prompts. Do not regenerate the whole batch. No image was generated in this review.

Reference: `C:/Users/laptops zone/Downloads/Telegram Desktop/photo_3_2026-10-16_23-33-51.jpg`.

## Visual diagnosis

The reference has compact spiral rose centers, moderately open outer petals, varied bloom orientation and restrained warm pink. The supplied generated rose A has a broad open cup, strongly exposed front petal wall and visible calyx/neck. It is usable for some oblique edge positions, but repeating it throughout the existing bouquet exaggerates its side profile. This is not fixed by rotating the same image or cropping every bloom identically.

The reference's real paper has broad irregular sheets rather than an even ruffled ring. Its bow is a large foreground object. Those remain later work; a replacement flower alone cannot reproduce the complete photograph.

## Generate now

Attach only the real pink bouquet photograph, not the existing generated rose or the screenshot of the app. Use the following prompt for one image named `rose-salmon-reference-center-v1.png`.

```text
Use the attached REAL bouquet photograph as the sole visual reference. Create one isolated photographic cutout of a single fresh pink rose suitable for compositing into that same bouquet.

Match the actual rose character in the photograph: warm muted salmon/blush pink, a relatively tight curled spiral center, moderately opened outer petals, and a compact standard florist-rose form. Use the clearly visible roses in the lower-right part of the bouquet as the main reference. Do not substitute a very open garden rose, a peony, a many-petalled rosette, or the exaggerated wide cup often seen in AI flower renders.

VIEWPOINT IS CRITICAL: show the face of the rose as it would appear near the center of this photographed bouquet. The viewer should look into the spiral center and see the outer petals surrounding it, with only modest side-wall visibility. Keep natural depth; do not flatten the flower into a graphic. The stem, green calyx and attachment point must be hidden BEHIND the blossom by its orientation, not abruptly cut off along a straight line. No visible stem, green spikes or leaves below the flower.

Match the reference's soft diffuse light, natural contrast and restrained color. Petals should have thin, smooth organic surfaces, subtle veins, slight edge irregularity and believable soft shadows between layers. Avoid thick leathery folds, waxy or plastic shine, excessively sharpened texture, heavy dark outlines, orange centers or sugary pale-pink highlights. Do not add water droplets or glitter.

Exactly ONE complete bloom, centered, filling approximately 75–80% of a square canvas. Keep every outer petal intact, with clear margin on every side. No neighboring flowers, baby's breath, ribbon, paper, card, text or props. No cast shadow onto a background. Preserve subtle self-shadow within the flower.

Deliver a high-resolution PNG with genuine transparent alpha outside the flower. Do not draw a checkerboard or simulate transparency on white. Do not return a grid or multiple views.
```

## Acceptance before another generation

1. Check genuine alpha, intact petals and no dark/light matte fringe on cream, white and dark backgrounds.
2. Compare bloom form and color to the real photograph, not only to the rejected generated set.
3. View at actual mobile flower size as well as full resolution.
4. Render several instances inside the existing studio with the real surrounding flowers. Check overlap, side-wall visibility, silhouette and center prominence. No new standalone study page.
5. Only after the assembled check succeeds, request a second individual bloom with different petal arrangement and the same light/view. Then assess whether additional edge views are actually missing.

If PNG/alpha is not delivered, report that result; never rename a JPEG or accept visible checkerboard pixels as transparency. A real separately photographed bloom from Maritza under matching light would be preferable when available, but is not a prerequisite for this bounded test.

## Later assets, in order

- Another central rose variation; subtle edge-facing rose views only where needed. Do not mirror lighting or use extreme side profiles around the entire rim.
- Airy branching baby's breath only if existing sprigs still look wrong in the accepted rose assembly. It must retain irregular branches and fine white florets, not opaque clouds.
- Paper: match the visible broad peach gingham/ivory sheet silhouette and their overlap. Do not reuse the rejected empty tunnel/crown prompt. Define flower bounds and paper bounds together before asking for a source.
- Separate pink satin bow with its two long asymmetrical tails, oriented to lie across the flower face. Use actual logo as a separate existing asset for a small card.

Avoid changing camera, flower type, light and layout simultaneously. Diagnose one observed defect per iteration. Realistic individual cutouts require coherent placement, partial occlusion and consistent shadows in the renderer to produce a realistic bouquet.

## Current implementation checkpoint

The original studio now has an owner-preview-only Original / New roses comparison under Flowers. The new finish uses the four preserved rose assets with mild overlap and petal masks, without changing original slot coordinates, quantities or pricing. `finishes.roseArtwork = blush-v1` persists through validation, undo/redo, save/reload, links and the florist sheet. Designs without the finish retain their original appearance. No new catalog recipe was enabled and the archived pink-study route stays disabled.

Validation completed: 63 client checks; targeted rose-artwork comparison, quantity/price/anchor invariance, fresh-browser sheet round-trip, mixed-flower editing and export; mask/link regression suite. No physical SMS delivery test and no deployment. The new rose appearance is a comparison option, not a claim of matching the full reference bouquet.
