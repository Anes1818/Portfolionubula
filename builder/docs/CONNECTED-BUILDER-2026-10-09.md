# Connected collection builder — 9 October 2026

Local build: `20261009a`. Applies to the ten collection bouquets, all of which use the Dome builder. Classic and Flat Heart keep their existing view-specific controls; incompatible front-view/overhead assets are not silently enabled.

## Removing the Scream mask

Scream for You has the same 30 editable slots in both states. With the mask enabled, retain the existing annular layout and center reserve. With it disabled, redistribute those same slots into a filled ellipse:

`r(0) = 0`; for `i = 1...29`, `r(i) = 3 * sqrt(i / 29)`.

`angle(i) = i * 2.39996323`, `x = 0.94 * r * cos(angle)`, `y = 1.10 * r * sin(angle)`.

Use a 1.60 petal envelope for the filled state, preserving source image aspect ratios. Clear the center exclusion and remove the mask from the plan inventory. The plan cache includes the mask state. Keep each slot's flower override and any intentionally empty slots. No flower is added or billed automatically: removing the mask subtracts its price only. Re-enabling the mask restores the ring geometry; Undo restores the complete prior state. Reflow, validation, links, reloads and exports read the same finishes flag.

The default unmasked center is verified at more than 95 percent flower alpha coverage over the former central opening's 80 x 120 pixel sample.

## Shared options

All collection bouquets expose:

- Snoopy plush, Hello Kitty pumpkin plush and Snoopy pumpkin topper, including position, scale, rotation and tucked/front placement.
- Pumpkin plush, cocoa bow and printed or custom-text sashes.
- Baby's breath, eucalyptus, floral initials, greenery rim, crown and butterflies.
- Halloween mask, long black bow, ghost decals and blue thistles.

Finishing includes shortcuts for toys, greenery/filler and Halloween extras. It no longer hides shared controls when a Halloween recipe is active. Spooky paper choices include cocoa wrapping as well as the five existing tones. Ghosts still require wrapping. Quantity, input-type, range and duplicate-toy checks remain enforced by the model.

Shared extras are rendered, loaded, billed and encoded for every Dome collection. Other collections use their own bouquet radius to scale Halloween extras. Scream's baby's breath retains its perimeter placement; other bouquets use the existing scattered/border filler planner. Scattered filler pockets avoid an enabled mask. Thistles are additional counted sprigs, not replacements for baby's breath. The greenery rim now renders on organic collection layouts as well as contributing its existing counted price.

Template flower replacement still respects available head sizes. The Spooky catalog now offers compatible flower species from the common catalog, not a manually maintained seasonal list. Species spacing uses the common size ratios. A sunflower is larger than a rose and cannot be forced into a small rose slot. Fit uses the full artwork bounds for all collection bouquets, including added toys.

## Catalog pictures

Nine supplied JPGs were copied unchanged to `assets/catalog/`. Their original source filenames are recorded in `assets/catalog/sources.json`.

| Supplied time | Catalog recipe |
|---|---|
| October 08, 12:32 PM | Pink Promise |
| October 08, 12:38 PM | Written in Roses |
| October 08, 12:39 PM | Always You |
| October 08, 12:41 PM | Scream for You |
| October 08, 12:43 PM | Forever My Boo |
| October 08, 12:51 PM | Midnight Blooms |
| October 09, 3:55 PM | Autumn Latte |
| October 09, 4:08 PM | October Cream |
| October 09, 4:10 PM | Harvest Sunshine |

Pumpkin Patch has no supplied photograph and retains its editable rendered preview. Failed style images also fall back to the rendered preview. Cards label the supplied pictures as AI-generated style images. The preview dialog switches between Style image and Editable design preview. The latter is the exact card canvas raster produced by the live renderer; the former is an illustrative photographic treatment that can differ in flower count, wrapper shape and depth. The quantity list is labelled Starting recipe. Customize opens that recipe, not an inferred reconstruction of the generated photograph.

JPGs are lazy-loaded in the gallery and included in the delivery ZIP. They do not enter the bouquet renderer or contaminate the PNG export canvas. The release smoke check covers both HTTP and local-file loading.

## Harvest Sunshine

The recipe already contained four sunflowers alongside 14 ivory roses and 12 rust mums. Retain all four at their existing large 1.85-to-1 rose-head size and use the supplied sunflower photograph on its catalog card. Raise the default sash by 60 percent of a layout unit to expose more of the lower flowers. This changes neither its 30-flower count nor its price. The full editable design remains available beside the style image.

## Verification

- `tests/connected-options.cjs`: all nine photo mappings and preview switching; center coverage; mask price/undo/redo; Hello Kitty through UI; all ten recipes with shared extras, matching prices and share-link scenes; four rendered sunflowers; mobile toy controls.
- Existing Halloween integration/customization, collection preview, phone movement, Autumn, and For Love checks passed. Assertions restricting options to one seasonal recipe were updated to reflect the new shared behavior; malformed inputs still fail.
- The extracted release is checked independently for artwork loading, matching file hashes, links and exports over HTTP and `file:`.

No site deployment or external message was performed.
