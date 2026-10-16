# Gathered Classic bouquets

- New Classic designs use a gathered canopy with full-size focal flowers, smaller blooms placed into open spaces, and the photographic fan wrap. Adding, moving and replacing a stem preserves all other anchors.
- `classic-recipes.js` restores Midnight Blooms' original arrangement and flower mix: five pink lilies, eight black roses, three dusky daisies, four burgundy mums and three blue thistles. The thistles are editable, priced stems, so the design has 23 pieces. The original black fan photograph supplies the wrapping; ivory and other tones are color studies.
- Catalog and Classic starting points open the new Classic recipe. Old Midnight Blooms Dome saves/shared links still use their original Halloween layout.
- `frames.classic.engine` identifies `classic-gathered`; validation checks their canonical frame coordinates and dimensions. Shared links already carry the Classic frame and individual anchors. Existing Classic saves without this marker retain their legacy geometry, and the separate flat Heart mode remains unchanged.
- Gathered Classic permits up to 32 main flowers / 48 rose-sized area units, with up to eight texture stems. Placement can reject additions earlier when no safe space remains. The UI displays the appropriate flower limit.
- Catalog thumbnails show the actual new editable designs, rather than the user's reference photograph. No new image service or database is needed.

Regenerate metadata/cards with `node builder/tools/build-catalog.cjs`. With the preview server running, render thumbnails with `node builder/tools/render-catalog-previews.cjs`. Both browser tools use Playwright; set `NODE_PATH` to its installed location if necessary.

Verification: `node builder/tests/classic-heart.cjs` and `node builder/tests/catalog-split.cjs`. Browser outputs go to a temporary folder unless `QA_OUTPUT` is set. Tests exercise layout constraints, edit operations, failure rollback, legacy compatibility, save/share, exports, responsive pages and the catalog/editor boundary.
