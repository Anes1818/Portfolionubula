"""
Turn the studio logo JPG into transparent runtime artwork.

The background cannot be keyed on colour alone: the black line drawing and the
wordmark are achromatic, exactly like the paper (both measured at chroma 0-1).
What separates them is brightness. And it cannot be keyed on brightness alone
either, because the pale lilac edge of the watercolour wash is nearly as bright
as the paper. So the key takes whichever signal is stronger per pixel:

    signal = max(255 - luminance, chroma * 1.6)

Paper (255, chroma 0) gives 0. The wordmark gives ~225. The wash gives ~130,
and even its faintest edge still clears the floor on chroma.

Two outputs, because one file cannot serve both sizes:
  logo-mark  the flower and its nebula only, for the ~40px header slot where
             "EST. 2026" would be an illegible smudge
  logo-full  the whole lockup, for the exported picture where there is room
"""
import os
import numpy as np
from PIL import Image

SRC = 'incoming/logo.jpg'

def key(rgb):
    lum = rgb.mean(axis=2)
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    signal = np.maximum(255.0 - lum, chroma * 1.6)
    return np.clip((signal - 6.0) / 22.0, 0, 1)

def trim(rgb, a, thr=0.06):
    ys, xs = np.nonzero(a > thr)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    return rgb[y0:y1, x0:x1], a[y0:y1, x0:x1], (int(x0), int(y0), int(x1), int(y1))

def save(rgb, a, path, longest):
    im = Image.fromarray(np.dstack([rgb.astype(np.uint8), (a * 255).astype(np.uint8)]), 'RGBA')
    w, h = im.size
    s = longest / max(w, h)
    if s < 1:
        im = im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, 'WEBP', quality=94, method=6)
    return im.size, os.path.getsize(path) / 1024

def main():
    rgb = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)
    a = key(rgb)
    rgb, a, box = trim(rgb, a)
    print('source %dx%d -> artwork box %s' % (rgb.shape[1], rgb.shape[0], box))

    # Find the blank band between the drawing and the wordmark, so the mark can
    # be cut without slicing letters. Scan the lower half for the widest gap.
    rows = (a > 0.10).sum(axis=1)
    H = len(rows)
    blank = rows < max(2, rows.max() * 0.012)
    best, run, start = None, 0, 0
    for y in range(int(H * 0.35), H):
        if blank[y]:
            if run == 0:
                start = y
            run += 1
        else:
            if run and (best is None or run > best[1] - best[0]):
                best = (start, y)
            run = 0
    cut = (best[0] + best[1]) // 2 if best else int(H * 0.66)
    print('wordmark gap %s -> mark cut at y=%d of %d' % (best, cut, H))

    mr, ma, _ = trim(rgb[:cut], a[:cut])
    size1, kb1 = save(mr, ma, 'assets/brand/logo-mark.webp', 512)
    size2, kb2 = save(rgb, a, 'assets/brand/logo-full.webp', 900)
    print('logo-mark %s  %.1f KB   (header icon)' % ('%dx%d' % size1, kb1))
    print('logo-full %s  %.1f KB   (exported picture)' % ('%dx%d' % size2, kb2))

    op = (ma > 0.5).mean()
    print('mark opaque coverage %.3f' % op)

if __name__ == '__main__':
    main()
