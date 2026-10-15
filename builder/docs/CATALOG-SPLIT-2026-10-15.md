# Catalog and editor separation — 15 October 2026

## Routes and behavior

- `/flowers/`: the florist-facing marketing homepage.
- `/builder/` or `/builder/index.html`: collection browsing. Static bouquet cards,
  small WebP thumbnails, search, EN/ES, collection filters and local saved copies.
- `/builder/studio.html`: the editing studio. Direct links accept `?template=<id>`
  or `?saved=<local-id>`. Entry selections are consumed after successful loading,
  so refresh resumes edits rather than reapplying the starting template.
- `/builder/order.html#b=…`: the existing read-only bouquet sheet.

Existing `/builder/#b=…` and `/builder/index.html#b=…` design links redirect to the
studio without changing their payload. New editable links target `studio.html`.
Viewing a shared bouquet does not replace the visitor's local draft. Once they
edit and successfully save it locally, the original hash is cleared so refresh
does not discard those edits. Local saved copies use the existing storage key;
the studio still validates complete saved designs before opening them.

The catalog never imports the model, renderer or artwork bundle, and never
constructs bouquet canvases. HTTP editor and order-sheet sessions use individual
artwork files. Only `file://` sessions load the embedded fallback. The renderer
loads the active design and requests other artwork as needed; its eager idle
preloader has been removed. PNG export still awaits all artwork in its snapshot.

## Local measurement

In a fresh Edge context at 1440 × 1000, after `networkidle`, resource
`encodedBodySize` totals were **26,522,641 bytes before** and approximately
**482,000 bytes after** for the collection entry screen: about **98% less**.
This measures local resource bytes, excluding the document, not real-world
network latency or a guaranteed loading-time improvement. Native image lazy
loading means exact totals depend on viewport and scrolling. All ten optimized
thumbnails together total 503,846 bytes.

## Validation

Run a local static server, then `node tests/catalog-split.cjs` with Playwright
resolvable through `NODE_PATH`. Optional variables: `BUILDER_URL`, `BROWSER_PATH`,
and `QA_OUTPUT`. Artifacts default to a temporary directory.

The suite covers the catalog/engine boundary, filters/search/Spanish, 320–1440px
layouts, browser Back and refresh, all ten recipe handoffs, saved-copy reopening
and deletion, shared-link compatibility, order-sheet editor links, PNG export,
Classic/Heart switching, storage errors, no-JavaScript catalog browsing, and
critical artwork retry. It sends no messages and places no orders. Historical
scripts expecting gallery DOM and `NebulaApp` on `index.html` describe the retired
combined interface; use this suite for the new navigation contract.

## Maintaining the collection

`node tools/build-catalog.cjs` derives names, descriptions and IDs from the same
recipe modules used by the editor, generating `catalog-data.js` and the marked
static card region in `index.html`. It does not render images. Keep optimized
720px WebP thumbnails in `assets/catalog/thumbs/`; Pumpkin Patch uses a renderer
preview, and the other nine use the existing catalog photographs. The catalog
does not publish stale precomputed prices: the editor calculates the estimate
from current shop settings and the selected recipe.

## Data boundary

No database, accounts, remote saved designs or inventory service were added.
Browser-local saves and self-contained shared links remain. Cross-device saves,
an owner catalog-management screen or request tracking would require a separate
backend design, authentication and access rules. None is needed to separate the
catalog from the editor or remove unused artwork downloads.
