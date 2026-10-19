# Mixed lily bouquet: assets and composition trials

## Current batch — 18 October, afternoon

Eight supplied PNG files are preserved as masters and converted to lossless WebP in `clients/la-flor-eterna/assets/lily-family/`. The exact file mapping, pixel dimensions, alpha bounds and hashes are in `batch-manifest.json`. `qa/next-phase/prepare-lily-batch.py` verifies decoded RGBA equality; no resizing, recoloring or generated imagery was used.

The existing studio now offers **Lilies + peach** (`lily-mixed-v1`). It uses two distinct lily views, two ivory roses, white flowering sprays, eucalyptus, peach/blush/ivory paper, and an adjustable blush satin bow. Pink roses retain the previously supplied salmon artwork. The paper is an intact backing asset: flowers cover its center. The bow is excluded from toy face-clearance rules so it remains on the bouquet face. Existing pink-reference and old lily-study links remain supported.

Open `clients/la-flor-eterna/qa/next-phase/lily-mixed-link.txt` for the editable full composition, rather than switching the artwork finish on an all-rose bouquet. This local demonstration contains 28 model items: six lilies, four white flowering sprays and eighteen roses, plus eight greenery additions and one bow. Sprays are independent editable items, not hidden decoration. Counts are a design trial, not an inferred florist recipe. The white spray uses a provisional $3.50 sample rate; the satin bow inherits the existing $4 demo bow rate. All prices remain unapproved sample estimates.

Visual review: separate lily views and ivory-rose variants reduce repetition; overlapping roses cover spray bases and eucalyptus is distributed among the perimeter flowers. The bow stays on the face rather than floating above the bouquet. The reference's closed lily buds, paler blush roses, short inner eucalyptus and another oblique lily view have not been supplied. Do not describe the current artwork as an exact reproduction or guaranteed delivered result.

Verification: `lily-mixed.cjs` checks loaded assets, exact counts, bow placement/pricing, greenery edits, spray replacement, undo, saved-link reconstruction, reload, PNG export, fresh florist sheet and 320/390px layout. Reference artwork, reference customization, legacy lily study and all 63 client QA checks pass. Two regression runs initially failed during concurrent local-server traffic; they passed when rerun sequentially. SMS URL/recipient behavior is tested without sending a message; physical-phone delivery is still untested. No public deployment occurred.

The current visual proofs are `qa/next-phase/lily-mixed.png` and `lily-mixed-mobile.png` under the client directory.

## Historical first lily study

18 October 2026. User-approved source: `IMG_20261018_130715_676.png`.

Master: `clients/la-flor-eterna/assets/lily-family/masters/lily-pink-open-a.png`.
Runtime: `clients/la-flor-eterna/assets/lily-family/lily-pink-open-a.webp`.
Conversion: lossless, full 831×833 RGBA, no resizing, retouching or color change. Decoded WebP RGBA matches the original exactly. PNG 612,435 bytes; WebP 319,722 bytes. SHA-256 recorded in the family manifest.

The existing studio's **Lily study** finish uses this asset for lilies and the accepted salmon roses for pink roses. Existing reference finishes and the general lily catalog retain their previous assets. The finish round-trips through saved designs, exports and the florist request sheet.

The saved trial in `clients/la-flor-eterna/qa/next-phase/lily-study-link.txt` has 24 flowers, including three lilies. Its counts and prices are composition-test inputs, not the florist's confirmed recipe. Wrapping and filler are disabled to judge the flowers together, not presented as a finished bouquet.

Visual review: the new lily's texture and muted pink work beside the salmon roses. The old cream rose looks yellower than the shop reference; do not describe it as a final color match. Reusing the same lily three times is visibly repetitive. Next assets should establish a genuinely different cupped/oblique lily, buds and a paler cream rose if needed. White flowering sprays, greenery placement, peach wrapping and a satin bow remain outstanding. Do not create a new separate editor or claim the full reference bouquet is complete.

Verification: `builder/tests/lily-study.cjs` passes correct asset loading, 24-flower/three-lily count, deterministic reconstruction, draft reload, export, and a fresh florist sheet. Desktop screenshots at 720×820 and mobile at 390px are stored beside the saved trial link. Physical-phone SMS delivery has not been tested.
