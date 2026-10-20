# Midnight Blooms and accessory selection — 20 October 2026

## Reference and scope

Reference: the user's photograph of a black wrapped bouquet with magenta/white lilies, black roses, dusky pink daisies, small blue thistles and a character balloon.

The former Classic recipe treated three thistles as purchased main flowers, and the original thistle image contained pale background regions. The photographed bouquet instead uses thistles as small secondary accents. The old pale lily artwork also differed substantially from the reference's saturated, recurved lilies.

Fresh Midnight recipes now contain 20 individually editable flowers: five lilies, eight black roses, three pink daisies and four burgundy mums. Thistles default to None. Flowers → Filler flowers offers None / 1 / 2 / 3. These accents use the same deterministic gap solver as the other filler, limited to 0.72 frame units, with a penalty for covering flower centers. They render above petals without a hard rectangular mask.

The option works in Classic, Dome and Heart. Existing `thistleCount` serialization is retained; selected accents are priced once each. No paid main flowers are added or replaced. Old saved Classic designs containing full-slot thistles remain readable; explicitly choosing a thistle level converts those old items into the chosen accent quantity. Undo restores the old items and positions.

The client-only lily replacement keeps authored flower positions and IDs. Right-side lilies use a mirrored source with small deterministic rotation differences. Existing black-rose variants are preserved. Other lily bouquet families retain their artwork. The catalog thumbnail is exported from the actual updated builder.

This is a closer editable interpretation, not an exact photographic reconstruction. The supplied reference's character balloon is not included. Generated lily/thistle artwork is not presented as an original florist photograph.

## Accessory removal

Selecting a toy or satin on the canvas now shows the same nearby × action used for flowers. It removes the selected accessory, preserves the flower inventory and supports exact undo/redo. Actual alpha hit testing, touch drag, keyboard Delete and the existing size/placement controls remain available. Classic toys remain accompanying gifts near the paper base; satin remains a bouquet tie.

## Generated assets

Built-in imagegen with `transparent_background: true`. Original generated PNGs were copied unchanged, preserving their alpha.

- `clients/la-flor-eterna/assets/midnight-oct20/lily-magenta.png` — 1308 × 1202 RGBA.
- `clients/la-flor-eterna/assets/midnight-oct20/thistle-blue.png` — 1312 × 1199 RGBA.

Lily source: `C:/Users/laptops zone/.codex/generated_images/01a13bc6-a2c1-7861-a8f0-0a96c10d3147/exec-cb530e4e-397a-49b8-90ff-2648ef658197.png`

Lily reference input: `C:/Users/LAPTOP~1/AppData/Local/Temp/codex-clipboard-125c5d76-304e-4eee-abb6-d99aff0826c4.png`

Prompt:

> Generate ONLY ONE isolated open oriental Stargazer lily flower head, true transparent background, for layering in a florist bouquet builder. Reference photo shows desired flower: rich deep raspberry-magenta petals with crisp narrow white edges, long narrow pointed recurved petals, six petals forming an irregular star, long natural stamens. Match the dramatic pink lilies in the reference black-wrapped bouquet, not a pale blush lily or alstroemeria. Photographic botanical realism in soft outdoor shade. Three-quarter view looking slightly into the bloom, petals bend backward and show depth, asymmetrical natural shape. Whole flower including petal tips visible, no clipping. Very short green attachment neck mostly hidden behind petals, no long stem or extra leaves. Flower centered with 5% clear margin. No bouquet, paper, other flowers, balloon, text, checkerboard, colored matte, or background shadow. Preserve true alpha between petals and stamens.

Thistle source: `C:/Users/laptops zone/.codex/generated_images/01a13bc6-a2c1-7861-a8f0-0a96c10d3147/exec-0988b65a-caae-496b-ae47-4810db5a850f.png`

Prompt:

> Photorealistic florist cutout, one small blue eryngium thistle flower head with a very short stem. Muted steel-blue oval central head, delicate narrow spiky bracts around its base, natural botanical texture, soft diffuse light. This is a subtle filler between roses and lilies, not a giant radial star. Small loose irregular bracts, central head occupies about one third of total width. View at slight three-quarter angle. Entire plant tips intact with 8% transparent margin. True transparent background everywhere around and between the bracts. No pale background rectangle, white halo, checkerboard, vase, bouquet, text or background shadow. No broad leaves, long stalk or multiple flowers.

## Verification

`builder/tests/midnight-accessories.cjs` checks optional accents, unchanged flower inventory, price deltas, saved links, legacy conversion/undo, opaque-pixel accessory selection with actual mouse/touch input in all three modes, exact undo/redo, drag preservation and keyboard removal.

Additional regression suites: Classic/Heart recipes, customization UX, customization standards, infill geometry, deterministic shop build and full florist site workflow.

Visual evidence: `clients/la-flor-eterna/qa/next-phase/midnight-after-oct20.png`, `midnight-optional-thistles-oct20.png`, `accessory-remove-mobile-oct20.png`.

## Floral lettering follow-up

The user also requested improved Dome/Heart lettering and a public preview push. The client now uses `floral-lettering.js`: a consistent 420 px glyph cap height, letter-specific canvas width, whole small blossom clusters on a jittered hexagonal arrangement, bouquet-centered placement, and fitting to the flower canopy. Classic excludes lettering. Input focus selects the existing initial; users can replace or clear it normally. Clearing on blur removes the initial and remains undoable.

A dedicated generated floret asset was copied unchanged into `clients/la-flor-eterna/assets/lettering-oct20/white-florets.png`. Source: `C:/Users/laptops zone/.codex/generated_images/01a13bc6-a2c1-7861-a8f0-0a96c10d3147/exec-2b466ad6-c071-480d-bbf2-a87c166c70db.png`. Built-in imagegen, true transparent background.

Prompt:

> One tiny natural baby's breath floret cluster for a photorealistic floral-letter monogram renderer. Top view macro product photograph of ONLY FIVE small creamy-white double gypsophila blossoms touching in a loose asymmetrical cluster. Each of the five flowers has distinct delicate ruffled white petals and a small pale green center, visible dimensional petals. Very few short fine pale green connecting stems concealed underneath the five blossoms; no foliage, no long branching sprig. Cluster is about as wide as it is tall, fills 85 percent of a square composition. Soft neutral diffuse light, no strong shadow, no container, no bouquet, no text. Actual transparent background around and between the flowers, no white matte, no checkerboard, no shadow outside the flowers. This must read as five individual flowers at small display size, not a large ball of dozens of tiny flowers.

Verification: `builder/tests/floral-lettering.cjs` covers all 26 letters in Dome and Heart, uncut alpha margins, consistent heights, size/offset extremes, unchanged paid flowers, exact shared-link geometry, price reversal on removal, typing/clearing/undo/reload, shared florist sheets and the 390 px UI. Before/after grids are under `clients/la-flor-eterna/qa/next-phase/lettering-*-oct20.png`.

Publication target: `https://nebulastudio.site/shops/la-flor-eterna/`. Existing GitHub Pages repository uses `main`; only the build-manifest runtime files are added to this new shop path. The sample-price status remains enabled. Private review documents and QA artifacts are not part of that runtime payload.
