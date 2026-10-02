# Overhead strawberry revision — 29 September 2026

Local composition review. The user supplied Gemini-generated candidates from
`Generated Image September 29, 2026 - 8_53PM.jpg` (main berry) and
`Generated Image September 29, 2026 - 9_01PM.jpg` (secondary berry).
These are generated images, not photographs of real shop inventory.

The built-in imagegen tool extracted the backgrounds and generated an empty
white ruffled paper collar. Reviewed PNG outputs are saved beside this file:
`berry-overhead-1.png`, `berry-overhead-2.png`, `dome-ivory-ruffle.png`.
The tool can reinterpret pixels during extraction; these are reviewed derivatives,
not a claim of pixel-identical masking of the Gemini originals.
The florist screenshot was visual reference only; none of its pixels or branding
were copied into the website assets.

`../../tools/prepare-overhead-berries.cjs` crops transparent margins, registers
the cutouts on square canvases and packages WebPs without synthesizing a mask.
Runtime outputs are `assets/heads/strawberry-overhead-{1,2}.webp` and
`assets/wrapping/dome-ivory-ruffle.webp`, also embedded by the selective bundler.
Original assets remain available. The berry ID and saved-design format are unchanged.

## Composition

- Dome and Heart use the overhead cutouts; Classic keeps separate side-view art.
- A stable per-slot choice uses the first berry about 70% of the time. Small turns
  keep highlights approximately aligned; no more centre-facing side-view rotation.
- The measured berry radius is 0.49 of its asset box; this reduces excess overlap.
- Dome ivory paper uses the new collar. Black/custom and Heart retain their own wraps.
- The white collar is wider, and Fit accounts for its complete bounds.
- The local sample contains 44 separately editable berries, no added greenery,
  and a $167 demo estimate ($132 berries + $25 preparation + $10 labour).
  The existing optional eucalyptus finish is separate and priced as before.
- Classic strawberry remains loadable but is withdrawn from featured starting recipes.

This improves the perspective and silhouette but remains a composite design preview.
Two repeating berry images do not establish photographic realism, and no new
rosemary asset or angled edge-berry set was introduced in this revision.

## Built-in imagegen prompts

### Main berry — background-extraction

Edit target: the supplied single overhead strawberry photo. Remove only the
white/off-white background and return this SAME strawberry as an isolated cutout
on genuine transparent alpha. Preserve its exact overhead perspective, naturally
rounded outline, red colour, fine seeds, surface texture and lighting. Do not
regenerate, beautify, smooth, add leaves or change the berry. No shadow outside
the fruit, no white halo, no checkerboard. Keep full fruit visible, centred with
modest transparent margin. This is an individual compositing asset for a bouquet builder.

### Secondary berry — background-extraction

Edit target: supplied single overhead strawberry photo. Remove only white/off-white
background. Preserve this SAME berry's irregular outline, overhead perspective,
crimson red colour, seeds, surface texture and lighting. Do not redesign or add
leaves. Return one complete strawberry as a genuine transparent alpha cutout,
centred with modest margin. No outside shadow, white halo, checkerboard or other
objects. This is a compositing asset for a bouquet builder.

### White collar — product-mockup

Create a photorealistic compositing asset: an EMPTY white florist paper collar for
a round strawberry bouquet, viewed exactly overhead. Only the paper wrapping,
no fruit, leaves, flowers, stems or ribbon. A wide circular wreath of matte soft
white florist sheets, loosely hand-folded into irregular rounded curls and open
rolled pleats around the perimeter, like the white ruffled paper around a
professional berry bouquet. Elegant layered thin paper with soft natural creases,
differing curl sizes and subtly uneven outer edges; not a manufactured accordion
rosette, no shiny plastic. The central circular opening occupies approximately
60 percent of the total outside diameter and is completely transparent. The
outside background is also genuinely transparent. Paper only in the ring between
the hole and the outside edge. All paper visible, centred in a square with 5
percent margin. Camera perpendicular overhead, soft diffuse daylight upper left,
delicate grey shading inside folds, no outside cast shadow, no text or logos.

All three calls used `transparent_background: true`; no CLI/API fallback was used.

## Review

Open `tests/release-2026-09-29/preview-dome-berries.html` through the local server.
Evidence: `overhead-export.png`, `overhead-320.png`, `overhead-390.png`,
`overhead-1440.png` and `overhead-results.json` in that test directory.
`verify-overhead.cjs` covers alpha, counts, deleting/Undo, stable remaining slots,
all five sizes, links, viewport access, export and offline loading.
