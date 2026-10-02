# Strawberry Dome: focused visual candidate

Created 29–30 September 2026. Local review only; no publishing or deployment.

Five distinct cutouts were generated with the built-in imagegen tool. The complete
prompts, tool provenance and source paths are recorded in [generation.json](generation.json).
Final transparent PNGs are `berry-1.png` through `berry-5.png` beside this document;
runtime files are `assets/heads/strawberry-dome-v2-1.webp` through
`assets/heads/strawberry-dome-v2-5.webp`. All are included in the offline bundle.

Three fruit specimens provide broad notched shoulders, a squat sloping outline,
and a narrower conical silhouette. Two more lean toward opposing edges and show
small calyxes. Lighting remains upper-left and rotations remain small. These are
generated derivatives, not photographs of physical florist stock. No rosemary
was added: the test needs to establish recognition from the fruit itself.

## Preserved release

This revision changes only Dome asset selection and Classic availability. The
white collar and its scale, slot coordinates, diameters, radius caps, depth,
rotation, draw order, Fit framing, prices and quantities are unchanged. The
pre-change runtime is retained in `tests/visual-revision-2026-09-29/baseline`.
Heart keeps its previous two overhead assets. Existing Classic strawberry images
and saved recipes remain compatible, with their old quantities and prices.

Classic no longer offers strawberries in its catalog, family dropdown or featured
recipes. Model-level add/replace also refuse new Classic strawberries. Existing
Classic berries can still be moved, deleted, replaced with flowers and restored
with Undo; importing a prior saved design does not discard paid items.

The five new images are selected deterministically by slot. Broad fruit is used
in the interior; the narrow specimen is restricted to the outer band. Angled
calyx-bearing fruit is limited to a subset of outer slots. Deleting one item does
not reshuffle its neighbours. No geometry was enlarged to fill gaps in the art.

## Visual assessment

The pointed outlines and lighter, shallower seeds improve recognition compared
with the previous round pitted pair. The 44-piece composition is the strongest
candidate. At normal 390px phone size, the 30- and 44-piece versions read more
readily as strawberries to the reviewer; 62 pieces remains busy. The surface
highlights are still glossier than the florist reference, and repeated poses and
some gaps remain visible in the exports. This is not claimed as finished
photorealistic artwork or independent user-tested recognition.

Fresh unlabelled review evidence is in `tests/visual-revision-2026-09-29`:

- `phone-30.png`, `phone-44.png`, `phone-62.png`: 390 × 844 normal Fit view.
- `export-30.png`, `export-44.png`, `export-62.png`: 1080 × 1080, art only.
- `production-export-*.png`: ordinary customer export path retained for checking.
- `design-*.json`: the exact editable compositions.
- `index.html`: side-by-side review gallery with editable local preview links.

The art proofs call the existing production `drawArt` with its existing scene;
only the label-free 1080px presentation differs from the branded export.
Screenshots have no added labels and the designs have no descriptive title.

## Verification

`review.cjs` compares measured geometry, collar, framing and full price data to
the saved pre-change release for 30/44/62. It checks unchanged Heart and legacy
Classic images, Classic withdrawal, old links, delete/Undo and offline export.
It compares unchanged modes before rendering differing Dome art in either browser
context, avoiding different image-resampling cache histories in pixel comparisons.
The broader release and overhead suites are also rerun. Results live beside their
scripts. Visual quality remains a review judgment, not a passing behavior test.

Final result: **100 checks passed, zero failures** — 57 release checks,
20 overhead behavior checks and 23 focused revision checks. All six gallery
images decoded at their requested dimensions (three 390×844 captures and three
1080×1080 exports). Syntax and whitespace checks also passed. Previous embedded
assets were retained byte-for-byte; the five additions bring the bundle to 131.
