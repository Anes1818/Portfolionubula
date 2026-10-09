# Collection previews — 8 October 2026

## Scope and basis

The user confirmed that “index page” means `builder/index.html`, and that the
bouquet imagery should come from the actual editable designs, not photos of
unrelated finished bouquets. This update follows the current first-paying-shop
plan's requirement to demonstrate the current builder and the florist walkthrough's
emphasis on a clear preview → customization → request journey. Sales-page pricing,
shop configuration and public deployment are unchanged.

## What changed

- All ten recipes render into 1080 × 1240 portrait canvases using their actual
  flowers, wrapper, greenery and finishing details. A common neutral background
  and framing make the full bouquet easy to inspect without cropping components.
- The View bouquet button opens a larger image from that card's exact PNG raster.
  The same already-loaded picture is reused instead of rendering a second version.
  These are editable design previews, not claims of finished physical products.
- Each preview lists the recipe's real flowers and charged extras, plus its current
  catalogue estimate. Customize opens that recipe through the existing builder.
- All / For Love / Spooky / Autumn filters retain the active bouquet while
  narrowing the visible cards. Pressed states, keyboard buttons and a live count
  support navigation. Filtering is presentation-only and never rewrites a design.
- The collection UI has cleaner cards, larger portraits, green action buttons and
  responsive filters. The demo florist guide now follows the collection and saved
  bouquets so the entry screen prioritizes the bouquet pictures.
- New controls, descriptions and preview actions support English and Spanish.

## Rendering and data

`drawCollectionPreview` uses `NebulaRenderer.scene`, `artBounds` and `drawArt`.
The fit scale is `min((width - 108) / bounds.width, (height - 108) / bounds.height)`.
The image includes the complete scene's bounds with a 54-pixel margin. Original
bitmap artwork is unchanged. No external image service or invented inventory is
used. Cards wait for their recipe assets; existing loading/error/retry controls
remain. Enlarged images use a local PNG data URL and work with the embedded
artwork when the packaged page is opened as a file.

The ingredients and total use `NebulaModel.price(design)`, and customization uses
the same collection recipe factory. Base preparation and arranging remain part
of the total; the preview ingredient list shows physical components, while the
existing estimate breakdown provides the full cost breakdown.

## Validation

`tests/collection-preview.cjs` checks all ten high-resolution canvases, filter
counts and non-mutation, exact card/enlarged-image equality, ingredients and
estimates, exact preview-to-editor designs, 320/390px layout, Escape/focus return,
Spanish text and runtime errors. Screenshots are under `tests/collection-preview`.
`tests/launch-final.cjs` verifies gallery resource recovery still works.
`tests/release-smoke.cjs` checks a freshly extracted package over HTTP and file URLs,
including enlarged previews with embedded artwork.

Current preview cache token: `20261008a`.


Midnight Blooms was revised later the same day (cache token 20261008b). Its collection image automatically uses the new shared geometry and existing angled lily asset; the supplied generated photograph is not used.


## 9 October: supplied style images

Nine user-supplied AI-generated JPGs now serve as catalog style images. Pumpkin Patch retains its rendered preview. The full-size dialog offers a separate Editable design preview from the actual renderer. Recipe quantities and prices describe that editable design. See CONNECTED-BUILDER-2026-10-09.md for source mapping and verification.
