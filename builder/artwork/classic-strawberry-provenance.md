# Classic strawberry artwork — 29 September 2026

Later revision: Classic Strawberry is withheld from featured recipes after user
visual review. The Dome/Heart assets described as unchanged below were subsequently
replaced by the [overhead strawberry revision](overhead-berries/README.md).
Classic art remains available for saved-design compatibility.

Production inputs are the existing `incoming/strawberry-new-2.jpg`,
`strawberry-new-3.jpg`, and `rosemary-1.jpg` through `rosemary-3.jpg`.
Image 1 is retained untouched as a source but not used: its broad, round shape
weakens the pointed side-view silhouette on a phone. The other two retain seed
texture and two distinct orientations. All three herbs provide directional variety.

`tools/prepare-classic-berries.py` removes neutral white/grey ground and cast
shadows using a feathered saturation matte, preserving enclosed fruit highlights.
It crops/registers fruit into 420×500 and sprigs into 300×620 transparent WebPs.
No synthetic stem, external image or Elena photograph is included. Rosemary
and berry positions, widths and rotations are deterministic and editable.
The herbs are six real catalog entries at the configured per-sprig price, not
unpriced decoration. Real assembly and food suitability require florist review.

The existing `__berry` ID, four top-view heads and Dome/Heart geometry remain.
Classic adds `classicBlooms` metadata; the renderer preloads every variant for
preview and exports. Shared links preserve item IDs so variations do not reshuffle.

The old bundle was the effective runtime source of truth: many on-disk files
had different dimensions/compression, and eight bundled assets were missing from
disk entirely. Those eight were recovered byte-for-byte from commit `615d1db`.
The selective bundle update retains ALL old embedded asset bytes and adds only
five new cutouts. Do not blindly rebuild the whole bundle from stale disk files.

These supplied photos’ commercial rights and suitability still need the owner's
confirmation before use for a real shop. This release records input provenance;
it does not assert a license or Elena's endorsement.
