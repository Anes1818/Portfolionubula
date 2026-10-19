# Filler between flowers — 19 October 2026

Implemented the user's close-up reference study and subsequent direction: eucalyptus and baby's-breath tips sit above the petals; greater breath density makes flower heads slightly smaller and filler larger. This supersedes the earlier exact-position density-prefix rule. Main flower centers, IDs, quantities, manual anchors and pricing are unchanged.

## Placement

Each head is represented by a rotated ellipse, with a smaller solid core for an open lily than for a round rose. For a candidate point, approximate clearance is `min(rx, ry) × (sqrt((localX/rx)² + (localY/ry)²) − 1)`. Neighbor pairs and triangle incenters seed gaps; a short local search maximizes the minimum clearance. Candidates far from flowers or bridging deliberately separated heads are rejected. Real outer petal valleys supply additional short tips.

White accents, eucalyptus and baby's breath share one reservation list. A candidate's score rewards clearance and spacing from already reserved pockets. Each source has an authored crown and basal attachment point; rotation maps that botanical axis toward the gap. A second fitting step tests three orientations against cached 80 × 80 alpha silhouettes from the actual flower images, scoring exposed foliage/florets, hidden stem bases and interference with flower centers. It is a sampled 2D fit, not a full botanical 3D simulation.

Internal eucalyptus uses the existing round-leaf branch photographs; the long oval-leaf source is no longer placed at fixed radial positions inside the lily bouquet. Perimeter greenery remains a separate feature.

## Layering and density

The visible leaves/florets render above the main petals, below toys, bows and lettering. Only the basal stem region is occluded by full-size neighboring petal alpha. No circular eraser or scaled flower silhouette cuts into the canopy. Compact breath crowns supplement the same logical sprig; they are not extra priced units. The separate breath perimeter wrap remains distinct from interior filler.

| Breath | Flower width/height | Branch size multiplier | Compact crown |
|---|---:|---:|---|
| None | 100% | — | None |
| Light | 99% | 0.90 | None |
| Medium | 95.5% | 1.05 | Small |
| Full | 91.5% | 1.22 | Larger |

Counts retain the existing count-adaptive formula and prices. Dimensions also depend on local bloom size and gap clearance. Changing density can re-fit filler to the newly opened space; changing a note, gift or satin does not move flowers or filler. Geometry/alpha-fit caches keep repeated rendering inexpensive and are invalidated when flower geometry or source loading changes.

## Verification and limits

`builder/tests/infill-layout.cjs` covers all three featured designs, four density levels, exact logical quantities, distinct pockets across filler types, canopy ordering, unchanged main-flower anchors, saved-link reconstruction, unrelated edits and maximum filler combinations. Captured density comparisons are in `clients/la-flor-eterna/qa/next-phase/infill-density-*.png`. The broader customization matrix and real pointer/touch checks cover three shapes, flower replacement, gifts, undo/reload and export.

Source angle, leaf texture and missing unopened lily buds cannot be invented by placement math. The current source photos remain unchanged. First fitting takes more work than a cached redraw; measurements are recorded in `infill-results.json`. Visual comparisons, rather than passing tests alone, remain the basis for judging resemblance.
