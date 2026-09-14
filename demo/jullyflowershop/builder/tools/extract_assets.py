"""
Turn the generated reference JPGs in incoming/ into runtime WebP artwork.

Two keying strategies, chosen per image:

  green  - chroma distance. Blooms are shot on #00FF00, so anything strongly
           green-dominant is background. Also de-spills the green fringe that
           JPEG leaves around petal edges.

  white  - flood fill inward from the frame border. Baby's breath is white
           florets on a white ground; a plain threshold would eat the flowers,
           so only background CONNECTED to the border is removed. Interior
           white stays.

Then: clean the alpha shoulder, crop to alpha > 0.10, trim to content (never
square-pad), resize the longest side to 512, export WebP.
"""
import os, sys, json
import numpy as np
from PIL import Image

SRC = 'incoming'
OUT = 'assets'
LONGEST = 512

def load(path):
    return np.asarray(Image.open(path).convert('RGB')).astype(np.int16)

def key_green(rgb):
    """Alpha from RGB distance to the SAMPLED screen colour.

    Measured across this batch: the screen is (8,245,5) in most frames but
    (76,202,87) in spray_rose-head, so a fixed "greenness" threshold either
    keeps the soft screen or eats the leaves. Distance separates them cleanly:
    every leaf/stem green sits 136-168 away from its own screen colour, while
    the screen itself is under ~40. Band the key between those.
    """
    h, w, _ = rgb.shape
    k = max(8, min(h, w) // 40)
    corners = np.concatenate([
        rgb[:k, :k].reshape(-1, 3), rgb[:k, -k:].reshape(-1, 3),
        rgb[-k:, :k].reshape(-1, 3), rgb[-k:, -k:].reshape(-1, 3)])
    screen = np.median(corners, axis=0)
    dist = np.linalg.norm(rgb.astype(np.float32) - screen, axis=2)
    return np.clip((100.0 - dist) / 55.0, 0, 1).astype(np.float32)   # <45 bg, >100 subject

def key_white_flood(rgb, tol=14):
    """Alpha from a border-connected flood fill, so interior white survives."""
    h, w, _ = rgb.shape
    near_white = (rgb.min(axis=2) >= 255 - tol)
    bg = np.zeros((h, w), dtype=bool)
    # seed every border pixel that is near-white, then grow with a queue
    stack = []
    for x in range(w):
        for y in (0, h - 1):
            if near_white[y, x] and not bg[y, x]:
                bg[y, x] = True; stack.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if near_white[y, x] and not bg[y, x]:
                bg[y, x] = True; stack.append((y, x))
    while stack:
        y, x = stack.pop()
        for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and near_white[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True; stack.append((ny, nx))
    return bg.astype(np.float32)

def despill_green(rgb, alpha):
    """Pull green back toward the red/blue average, but ONLY on the soft fringe.

    An earlier version applied the cap across the whole subject. A yellow petal
    is legitimately green-rich (250,230,40), so capping it at (r+b)/2 turned it
    into orange: the chrysanthemum measured hue 33 deg (orange) when its source
    was clean lemon. Spill lives only where the key is partial, so restrict the
    correction to that band and feather it by how transparent the pixel is.
    """
    out = rgb.astype(np.float32).copy()
    r, g, b = out[..., 0], out[..., 1], out[..., 2]
    cap = (r + b) / 2.0 + 12
    fringe = (alpha > 0.02) & (alpha < 0.92)
    w = np.zeros_like(g)
    w[fringe] = 1.0 - alpha[fringe] / 0.92      # fully corrected only where nearly clear
    over = g > cap
    g[over] = g[over] * (1 - w[over]) + cap[over] * w[over]
    return np.clip(out, 0, 255).astype(np.uint8)

def shoulder(a, lo=0.10, hi=0.90):
    """ImageMagick's -level 10%,90% on the alpha channel."""
    return np.clip((a - lo) / (hi - lo), 0, 1)

def process(name, src, mode, dst):
    rgb = load(src)
    bg = key_green(rgb) if mode == 'green' else key_white_flood(rgb)
    alpha = shoulder(1.0 - bg)
    rgb8 = despill_green(rgb, alpha) if mode == 'green' else rgb.astype(np.uint8)

    ys, xs = np.where(alpha > 0.10)
    if not len(xs):
        raise SystemExit('%s: nothing survived the key' % name)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    rgb8 = rgb8[y0:y1+1, x0:x1+1]
    alpha = alpha[y0:y1+1, x0:x1+1]

    im = Image.fromarray(np.dstack([rgb8, (alpha*255).astype(np.uint8)]), 'RGBA')
    w, h = im.size
    s = LONGEST / max(w, h)
    if s < 1:
        im = im.resize((max(1, round(w*s)), max(1, round(h*s))), Image.LANCZOS)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im.save(dst, 'WEBP', quality=92, method=6)

    a = np.asarray(im)[..., 3].astype(np.float32) / 255
    return {'file': dst, 'w': im.size[0], 'h': im.size[1],
            'aspect': round(im.size[0]/im.size[1], 3),
            'alphaFill': round(float((a > 0.5).mean()), 3),
            'kb': round(os.path.getsize(dst)/1024, 1)}

JOBS = [
    # name,                     source file,                     key,     output
    ('chrysanthemum_yellow',   'chrysanthemum_yellow-head.jpg',  'green', 'assets/heads/chrysanthemum_yellow.webp'),
    ('spray_rose',             'spray_rose-head.jpg',            'green', 'assets/heads/spray_rose.webp'),
    ('rose_cream',             'rose_cream-head.jpg',            'green', 'assets/heads/rose_cream.webp'),
    ('stock_yellow',           'stock_yellow-head.jpg',          'green', 'assets/heads/stock_yellow.webp'),
    ('statice_purple',         'statice_purple-head.jpg',        'white', 'assets/heads/statice_purple.webp'),
    ('babys_breath',           'babys_breath-head.jpg',          'white', 'assets/heads/babys_breath.webp'),
    ('eucalyptus',             'eucalyptus-head.jpg',            'white', 'assets/heads/eucalyptus.webp'),
]

if __name__ == '__main__':
    print('%-24s %10s %7s %10s %8s' % ('asset', 'size', 'aspect', 'alphaFill', 'kb'))
    report = {}
    for name, src, mode, dst in JOBS:
        r = process(name, os.path.join(SRC, src), mode, dst)
        report[name] = r
        print('%-24s %10s %7.3f %10.3f %8.1f' % (
            name, '%dx%d' % (r['w'], r['h']), r['aspect'], r['alphaFill'], r['kb']))
    json.dump(report, open('tools/extract-report.json', 'w'), indent=1)
