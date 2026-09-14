# Artwork and realism

The runtime embeds **110 RGBA WebP images**: 33 flower entries, one photographed
ivory wrap in two aligned layers, two black paper collars, 8 finishes, and the
studio logo in two sizes. Nothing is generated at runtime and no paid flower is
ever added invisibly.

## Classic pairs

32 catalogue entries have a source-aligned bloom / stem pair. Both layers come
from one source transform — same centre, scale and rotation — and overlap by
eight source pixels at the crop boundary, so the neck has no seam.

Chocolate has no stemmed Classic photo and is offered in Dome and Heart only.
Baby's breath is offered in Classic only: seen straight down it reads as a grey
smudge rather than a flower.

## Keying and spill

Blooms are keyed against `#00FF00`; eucalyptus, statice and baby's breath
against `#FFFFFF`, because a green screen destroys silver-green foliage.

Screen spill is removed per pixel from its own green excess, not by clamping
green globally. Measured after the fix: the worst petal layer retains **6.5%**
green on its soft edge (alstroemeria, whose petals are genuinely green-streaked)
and only 1 of 59 petal layers exceeds 5%. Before the fix the worst was 35%.

Five tulip bloom crops carried a detached ~200px leaf fragment from the stem
photo. Removed, with metadata re-derived so the blooms did not shift.

## Calibration targets

- Heads: aspect ≈ 1.003, opaque fill ≈ 0.734
- `headRadius` is the furthest opaque pixel from centre over the longest side.
  Calibrated against the eight original heads, it reproduces their stored values
  to within 0.004.
- Longest side 512px for heads, 1200px tall for stem sources.
- Eucalyptus head aspect corrected 0.598 → 1.003; the old narrow tip is
  documented in the engine notes as reading like a thorn rather than a leaf.

## Withdrawn artwork

`babys_compact`, `babys_medium`, `limonium`, the diamond pin and the kraft wrap
were removed from the product. Saved designs referencing them are remapped on
load rather than rejected — see `RETIRED` in `config.js`.

## Honest limits

Digital paper tints are colour studies of the one photographed ivory wrap, not
proof of a stocked material. Sash lettering is baked into the supplied artwork
and is English only. Natural petal overlap remains; flower-face protection does
not prohibit intentional decorative overlays.

---

© 2026 Nebula Sites Studio. All rights reserved.
