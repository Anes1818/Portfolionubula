"""
Strip leftover green screen spill from the ORIGINAL shipped artwork.

Those files arrived already keyed, so there is no source to re-extract. But the
same per-pixel measurement works on the output: the project's asset notes say
blooms were keyed against #00FF00, and spill above a pixel's own red/blue is
that screen showing through.

    beta  = (g - max(r,b)) / (255 - 0)
    fixed = (observed - screen*beta) / (1 - beta)

Only the soft rim is touched. Fully opaque pixels are left exactly as they are,
so a green leaf or stem in the body of the image cannot be altered - the fix
can only reach the anti-aliased boundary where the screen actually bled in.
"""
import json, io, re, os
import numpy as np
from PIL import Image

SCREEN = np.array([0.0, 255.0, 0.0], dtype=np.float32)
EDGE_HI = 0.985          # anything more opaque than this is untouchable body
SPILL_MIN = 18           # below this the green is the flower's own

def spill_pct(rgb, al):
    edge = (al > 0.05) & (al < 0.85)
    if edge.sum() < 50:
        return None, 0
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return edge, 100.0 * ((edge & ((g - np.maximum(r, b)) > 28)).sum()) / edge.sum()

def fix(path):
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im).astype(np.float32)
    rgb, al = a[..., :3].copy(), a[..., 3] / 255.0
    edge, before = spill_pct(rgb, al)
    if edge is None or before < 4:
        return None

    body = al >= EDGE_HI
    spill = rgb[..., 1] - np.maximum(rgb[..., 0], rgb[..., 2])
    beta = np.clip((spill - SPILL_MIN) / (255.0 - SPILL_MIN), 0, 0.94)
    beta[body] = 0                                   # never touch solid pixels
    b3 = beta[..., None]
    fixed = (rgb - SCREEN.reshape(1, 1, 3) * b3) / (1.0 - b3)
    out = np.where(b3 > 0.01, np.clip(fixed, 0, 255), rgb)

    moved = float(np.abs(out[body] - rgb[body]).max()) if body.any() else 0.0
    _, after = spill_pct(out, al)
    Image.fromarray(np.dstack([out.astype(np.uint8), (al * 255).astype(np.uint8)]), 'RGBA') \
        .save(path, 'WEBP', quality=92, method=6)
    return before, after, moved

if __name__ == '__main__':
    meta = json.loads(re.sub(r'^[^{]*', '', io.open('asset-meta.js', encoding='utf-8').read())
                      .rstrip().rstrip(';'))
    seen, rows = set(), []
    for fid, v in meta['flowers'].items():
        for kind in ('head', 'classicBloom', 'classicStem'):
            p = v.get(kind)
            if not p or p in seen or not os.path.exists(p):
                continue
            seen.add(p)
            r = fix(p)
            if r:
                rows.append((fid, kind, *r))
    rows.sort(key=lambda x: -x[2])
    print('%-22s %-13s %8s %8s %10s' % ('flower', 'layer', 'before', 'after', 'bodyDelta'))
    for fid, kind, before, after, moved in rows:
        print('%-22s %-13s %7.1f%% %7.1f%% %10.1f' % (fid, kind, before, after, moved))
    print('\n%d layers cleaned; body pixels changed by at most %.1f' %
          (len(rows), max([r[4] for r in rows], default=0)))
