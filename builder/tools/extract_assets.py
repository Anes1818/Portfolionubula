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
    return np.clip((100.0 - dist) / 55.0, 0, 1).astype(np.float32), screen   # <45 bg, >100 subject

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
    k = max(8, min(h, w) // 40)
    corners = np.concatenate([rgb[:k,:k].reshape(-1,3), rgb[:k,-k:].reshape(-1,3),
                              rgb[-k:,:k].reshape(-1,3), rgb[-k:,-k:].reshape(-1,3)])
    return bg.astype(np.float32), np.median(corners, axis=0)

def despill_green(rgb, alpha, screen):
    """Remove the screen from the soft edge by UNDOING the composite.

    Two earlier attempts both failed, in opposite directions:
      * capping green across the whole subject turned lemon petals orange
        (chrysanthemum measured hue 33 deg from a clean lemon source);
      * feathering that cap by alpha made it a near no-op, leaving a green rim
        on 99-100% of the soft edge of every new asset.

    Unpremultiplying by the KEY's alpha also failed, because that alpha is wrong
    at the edge: the distance key was tuned to keep dark leaves (which sit 136+
    from the screen), so a nearly pure screen pixel 87 away scored alpha 0.83 and
    was treated as opaque petal.

    So measure the screen's share from the pixel itself. Spill above the pixel's
    own red/blue is the screen showing through:
        beta = (g - max(r,b)) / (screen_g - max(screen_r, screen_b))
        petal = (observed - screen*beta) / (1 - beta)
    A leaf keeps most of itself (beta ~0.2); a green halo is almost all screen
    (beta ~0.4-1.0) and dissolves.
    """
    out = rgb.astype(np.float32)
    scr = np.asarray(screen, dtype=np.float32)
    screen_spill = scr[1] - max(scr[0], scr[2])
    if screen_spill < 40:                            # not a green screen
        return np.clip(out, 0, 255).astype(np.uint8)
    spill = out[..., 1] - np.maximum(out[..., 0], out[..., 2])
    beta = np.clip(spill / screen_spill, 0, 0.94)[..., None]
    fixed = (out - scr.reshape(1, 1, 3) * beta) / (1.0 - beta)
    return np.clip(np.where(beta > 0.02, fixed, out), 0, 255).astype(np.uint8)

def shoulder(a, lo=0.10, hi=0.90):
    """ImageMagick's -level 10%,90% on the alpha channel."""
    return np.clip((a - lo) / (hi - lo), 0, 1)

def process(name, src, mode, dst):
    rgb = load(src)
    bg, screen = key_green(rgb) if mode == 'green' else key_white_flood(rgb)
    alpha = shoulder(1.0 - bg)
    rgb8 = despill_green(rgb, alpha, screen)

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
