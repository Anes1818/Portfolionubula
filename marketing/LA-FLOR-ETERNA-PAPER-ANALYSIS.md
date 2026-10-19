# Paper comparison — 17 October 2026

The user requested analysis after three unsuccessful generated wrap sources. No new prompt or generation is requested by this analysis. All three wrap attempts remain rejected and unintegrated.

## Verified current implementation

Opened the current local client studio at `studio.html?template=pink-promise` in a fresh browser context and inspected the actual state and scene. It is Dome / organic / ivory, with 44 rendered flowers. The paper node uses `assets/wrapping/dome-ivory-ruffle.webp`, centered at (360,390), displayed as a 558.14 square with zero rotation in this state. The renderer selects the ivory ruffle in `collarNode` and paints the single paper image behind all flowers. The accepted new rose family is not yet active.

This is different from both other paper systems in the repository: legacy Classic has aligned ivory back/front artwork; gathered Classic uses the photographic black fan wrap. Neither is the paper currently displayed for Pink Promise.

The current ruffle works for its own overhead round composition: many small rolled/pleated folds form an even perimeter, with the flowers covering its center. It cannot become the target merely through a color or texture substitution.

## What the target photograph actually shows

- A camera looking down onto the flower face; no visible long stem neck. Exact lens/angle is not inferred from the photograph.
- A roughly tall oval mass of flowers, framed by broad square sheets at uneven angles. The full paper outline is irregular and taller than the failed landscape crown.
- Peach/white gingham corners at the rear, especially the left and upper middle; ivory side sheets; additional gingham visible at the right edge and bottom.
- Broad, overlapping diagonal paper panels below the flowers, including a lower pointed ivory panel. This lower apron is substantial, not a thin horizontal ribbon.
- Few broad creases and sheet corners rather than the current ruffle's numerous small folds.
- Flowers hide most of the inner paper and attachment area. A single empty source cannot reveal the true hidden paper structure, so that structure must be inferred conservatively rather than claimed as a faithful reconstruction.

## Why the generated attempts fail

1. The first generated a deep tube lying sideways, with a projecting neck.
2. The next generated a symmetric crown/frame with a huge center hole and baked-in checkerboard.
3. The latest filled the same crown with ivory backing. It still has mirrored rear peaks, a wide horizontal silhouette and a thin front rim. A solid background solves neither geometry nor perspective.

The prompts overconstrained an empty opening and then described replacement backing without first defining the paper silhouette in relation to the flowers. The numeric camera description and words such as sleeve/cavity/cuff encouraged a container view. The target is better specified by the visible sheet boundaries and their overlap around the flower face.

## Implementation direction

Establish the intended oval flower silhouette and paper outline together before asking for more art. Evaluate a source in a rough assembled bouquet rather than as an empty object. The essential visible regions are rear/side sheets behind the roses, the rose/filler mass, then the lower foreground folds and bow. Derive rear and front masks in shared coordinates from one coherent approved source; never request independently generated unrelated front/back paper. Preserve legacy engines and the original source.

The current single centered ruffle node cannot reproduce that foreground overlap or tall irregular silhouette. The new photographic recipe needs explicit paper bounds, independent flower bounds and front/back layer placement. Replacing the ruffle image while retaining its square placement would distort or misalign the new wrap.

No additional flower or filler generation is justified by this paper failure. Four rose views remain accepted for proof; existing airy/wide baby's breath remains the first reuse candidate. The current approved assets do not yet constitute an accepted complete bouquet.

## Evidence

- `clients/la-flor-eterna/qa/next-phase/paper-analysis-runtime.json`: live local scene inspection.
- `clients/la-flor-eterna/qa/next-phase/paper-analysis-current-bouquet.png`: fresh local render.
- `clients/la-flor-eterna/qa/next-phase/paper-analysis-comparison.png`: current render, original reference and latest rejected generation.

No site code, deployment, customer messages, owner approvals or active recipe changed during this comparison.
