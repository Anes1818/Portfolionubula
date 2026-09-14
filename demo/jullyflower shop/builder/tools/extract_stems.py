"""
Split each side-view stem photo into the Classic pair the renderer expects.

The renderer draws the two layers from ONE source transform:
    classicStem  = the whole source frame, drawn at -bloomCenter
    classicBloom = just the flower, drawn centred on the node
so both must share the same pixel space. That is why the stem file keeps the
full frame instead of being cropped to the bare stalk.

stemCutY is found from the alpha width profile: the bloom is wide, the stalk
below it is narrow, so the cut is the first row after the widest part where the
width collapses under a fraction of the bloom's own width and stays there.
"""
import os, json
import numpy as np
from PIL import Image

PAD = 5           # bloomPadding, matches the shipped assets
OVERLAP = 8       # joinOverlap, keeps the neck seamless
TARGET_H = 1200   # keeps file size near the existing sources

def key_distance(rgb):
    h, w, _ = rgb.shape
    k = max(8, min(h, w) // 40)
    corners = np.concatenate([
        rgb[:k, :k].reshape(-1, 3), rgb[:k, -k:].reshape(-1, 3),
        rgb[-k:, :k].reshape(-1, 3), rgb[-k:, -k:].reshape(-1, 3)])
    screen = np.median(corners, axis=0)
    dist = np.linalg.norm(rgb.astype(np.float32) - screen, axis=2)
    bg = np.clip((100.0 - dist) / 55.0, 0, 1)
    return 1.0 - bg, screen

def despill(rgb, screen, alpha):
    """Fringe-only green correction. Capping the whole subject turns a yellow
       petal orange (measured: hue 33 deg from a clean lemon source)."""
    out = rgb.astype(np.float32).copy()
    if screen[1] > max(screen[0], screen[2]) + 40:      # green screen
        g = out[..., 1]
        cap = (out[..., 0] + out[..., 2]) / 2.0 + 12
        fringe = (alpha > 0.02) & (alpha < 0.92)
        w = np.zeros_like(g)
        w[fringe] = 1.0 - alpha[fringe] / 0.92
        over = g > cap
        g[over] = g[over] * (1 - w[over]) + cap[over] * w[over]
    return np.clip(out, 0, 255).astype(np.uint8)

def find_cut(alpha, rgb):
    """Row where the bloom ends and the leafy stalk begins.

    Colour first: a chrysanthemum's leaves are as WIDE as its pompon, so a pure
    width profile cut below the lowest leaf (measured: y=618 of 1200, far too
    low). Petals are never green-dominant, so the last row holding a real run of
    non-green subject pixels is the true base of the flower.

    Greenery has no such colour break, so it falls back to the width collapse.
    """
    solid = alpha > 0.35
    rows_with = np.where(solid.any(axis=1))[0]
    if len(rows_with):
        # The very top of the frame is always flower, never stalk: sample its
        # colour there, then follow that colour down. A "not green" test fails
        # because woody stalks are brown (140,130,60) and read as petal.
        top = rows_with[:max(6, int(len(rows_with) * 0.08))]
        band = rgb[top][solid[top]]
        if len(band):
            bloom_rgb = np.median(band, axis=0)
            near = solid & (np.linalg.norm(rgb - bloom_rgb, axis=2) < 78)
            per_row = near.sum(axis=1)
            if per_row.max() >= 12:
                floor = max(4, per_row.max() * 0.08)
                keep = np.where(per_row >= floor)[0]
                if len(keep):
                    # stop at the first gap: petals are contiguous
                    end = keep[0]
                    for y in keep:
                        if y - end > 25:
                            break
                        end = y
                    return int(end) + 1
    width = solid.sum(axis=1).astype(float)
    peak = int(width.argmax())
    thresh = width[peak] * 0.30
    for y in range(peak, len(width)):
        if width[y] < thresh and width[y:y + 40].max() < thresh:
            return y
    return int(len(width) * 0.35)

def process(name, src, out_bloom, out_stem):
    rgb = np.asarray(Image.open(src).convert('RGB')).astype(np.int16)
    alpha, screen = key_distance(rgb)
    alpha = np.clip((alpha - 0.10) / 0.80, 0, 1)
    rgb8 = despill(rgb, screen, alpha)

    ys, xs = np.where(alpha > 0.10)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    rgb8, alpha = rgb8[y0:y1+1, x0:x1+1], alpha[y0:y1+1, x0:x1+1]

    src_im = Image.fromarray(np.dstack([rgb8, (alpha*255).astype(np.uint8)]), 'RGBA')
    s = TARGET_H / src_im.size[1]
    if s < 1:
        src_im = src_im.resize((max(1, round(src_im.size[0]*s)),
                                max(1, round(src_im.size[1]*s))), Image.LANCZOS)
    A = np.asarray(src_im)[..., 3].astype(np.float32) / 255
    W, H = src_im.size

    cut = find_cut(A, np.asarray(src_im)[..., :3].astype(np.int16))
    band = A[:cut + OVERLAP]
    bys, bxs = np.where(band > 0.10)
    bx0, bx1 = int(bxs.min()), int(bxs.max()) + 1

    bloom = src_im.crop((bx0 - PAD, -PAD, bx1 + PAD, cut + PAD))
    stem_col = A[cut:]
    sys_, sxs_ = np.where(stem_col > 0.30)
    stem_base_x = float(np.median(sxs_[sys_ > (stem_col.shape[0] - 30)])) if len(sys_) else W / 2
    last = int(np.where(A.sum(axis=1) > 0)[0].max())

    src_im.save(out_stem, 'WEBP', quality=92, method=6)
    bloom.save(out_bloom, 'WEBP', quality=92, method=6)

    return {
        'classicBloom': out_bloom, 'classicStem': out_stem,
        'bloomWidth': bloom.size[0], 'bloomHeight': bloom.size[1],
        'sourceWidth': W, 'sourceHeight': H,
        'sourceBloomBox': [bx0, 0, bx1, cut],
        'bloomCenter': [round((bx0 + bx1) / 2, 1), round(cut / 2, 1)],
        'stemBase': [round(stem_base_x, 1), last],
        'stemCutY': int(cut), 'joinOverlap': OVERLAP, 'bloomPadding': PAD,
        'classicAvailable': True,
    }

JOBS = [
    ('chrysanthemum_yellow', 'chrysanthemum_yellow-stem.jpg'),
    ('spray_rose',           'spray_rose-stem.jpg'),
    ('statice_purple',       'statice_purple-stem.jpg'),
    ('eucalyptus',           'eucalyptus-stem.jpg'),
    ('rose_cream',           'rose_cream-stem.jpg'),
    ('stock_yellow',         'stock_yellow-stem.jpg'),
]

if __name__ == '__main__':
    out = {}
    print('%-22s %10s %10s %8s %10s' % ('asset', 'source', 'bloom', 'cutY', 'stemBase'))
    for name, f in JOBS:
        r = process(name, os.path.join('incoming', f),
                    'assets/classic/%s-bloom.webp' % name,
                    'assets/classic/%s-stem.webp' % name)
        out[name] = r
        print('%-22s %10s %10s %8d %10s' % (
            name, '%dx%d' % (r['sourceWidth'], r['sourceHeight']),
            '%dx%d' % (r['bloomWidth'], r['bloomHeight']), r['stemCutY'], r['stemBase']))
    json.dump(out, open('tools/stem-report.json', 'w'), indent=1)
