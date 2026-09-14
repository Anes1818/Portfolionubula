"""
Split one wrap photo into the back/front pair the Classic renderer stacks.

Automatic lip detection was tried and abandoned: kraft paper is so uniform that
the fold has almost no contrast. Probing five columns for the strongest vertical
gradient returned rows 354, 542, 1102, 407 and 909 - no consistent edge.

So the shipped ivory FRONT layer is reused as a shape template instead. Its mask
is a measured, working mouth; scaled into the new paper's bounding box and
intersected with the new paper's own alpha, it yields a front panel that hugs
the new wrap and can never spill outside it.
"""
import io, json, re, os
import numpy as np
from PIL import Image

CANVAS = (896, 1200)

def alpha_box(a, thr=0.08):
    ys, xs = np.nonzero(a > thr)
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())

def key_paper(path):
    """Paper on white: flood fill the background in from the border.

    Keyed on CHROMA, not brightness. The studio ground is not pure white (244)
    and its soft shadow ramps 235 down to 120, so no luminance cut separates the
    shadow from the paper. Chroma does: measured, the ground reads 0, the shadow
    6, and the kraft paper 75-77.
    """
    rgb = np.asarray(Image.open(path).convert('RGB')).astype(np.int16)
    h, w, _ = rgb.shape
    near_white = (rgb.max(axis=2) - rgb.min(axis=2)) < 30
    bg = np.zeros((h, w), bool)
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
            ny, nx = y+dy, x+dx
            if 0 <= ny < h and 0 <= nx < w and near_white[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True; stack.append((ny, nx))
    a = np.clip((1.0 - bg.astype(np.float32) - 0.10) / 0.80, 0, 1)
    return rgb.astype(np.uint8), a

def main(src, out_back, out_front, ivory_front, ivory_back):
    rgb, a = key_paper(src)
    if (rgb.shape[1], rgb.shape[0]) != CANVAS:
        raise SystemExit('expected %dx%d, got %dx%d' % (*CANVAS, rgb.shape[1], rgb.shape[0]))

    # template: the ivory front mask, positioned inside the ivory paper box
    iv_f = np.asarray(Image.open(ivory_front).convert('RGBA'))[..., 3] / 255.0
    iv_b = np.asarray(Image.open(ivory_back).convert('RGBA'))[..., 3] / 255.0
    ibx0, iby0, ibx1, iby1 = alpha_box(iv_b)
    tmpl = Image.fromarray((iv_f * 255).astype(np.uint8)).crop((ibx0, iby0, ibx1 + 1, iby1 + 1))

    # stretch that template across the new paper's own box
    nbx0, nby0, nbx1, nby1 = alpha_box(a)
    tmpl = tmpl.resize((nbx1 - nbx0 + 1, nby1 - nby0 + 1), Image.BILINEAR)
    mask = np.zeros(a.shape, np.float32)
    mask[nby0:nby1 + 1, nbx0:nbx1 + 1] = np.asarray(tmpl).astype(np.float32) / 255.0

    front = a * mask                      # never outside the new paper

    # Register the new paper onto the ivory's box so it is a drop-in swap.
    # classicFrame() hardcodes the ivory geometry (waist 448,850 / rim 449,600);
    # rather than thread a wrap through that measured code, resample the photo so
    # its paper box lands exactly where the ivory's does. The paper is a soft
    # object with no rigid features, so the ~11% aspect nudge this costs is
    # invisible, and every downstream constant keeps working untouched.
    def register(chan):
        im = Image.fromarray(np.dstack([rgb, (chan * 255).astype(np.uint8)]), 'RGBA')
        crop = im.crop((nbx0, nby0, nbx1 + 1, nby1 + 1))
        crop = crop.resize((ibx1 - ibx0 + 1, iby1 - iby0 + 1), Image.LANCZOS)
        canvas = Image.new('RGBA', CANVAS, (0, 0, 0, 0))
        canvas.paste(crop, (ibx0, iby0))
        return canvas

    register(a).save(out_back, 'WEBP', quality=92, method=6)
    register(front).save(out_front, 'WEBP', quality=92, method=6)

    fb = alpha_box(front)
    print('paper box  x[%d..%d] y[%d..%d]  (%dx%d)' % (nbx0, nbx1, nby0, nby1,
                                                       nbx1-nbx0+1, nby1-nby0+1))
    print('front box  x[%d..%d] y[%d..%d]' % (fb[0],fb[2],fb[1],fb[3]))
    print('back  %5.1f KB   front %5.1f KB' % (os.path.getsize(out_back)/1024,
                                               os.path.getsize(out_front)/1024))
    # geometry keys, mapped from ivory by the same box-to-box transform
    meta = json.loads(re.sub(r'^[^{]*', '', io.open('asset-meta.js', encoding='utf-8').read())
                      .rstrip().rstrip(';'))
    W = meta['wrap']
    def remap(pt):
        u = (pt[0] - ibx0) / (ibx1 - ibx0); v = (pt[1] - iby0) / (iby1 - iby0)
        return [round(nbx0 + u * (nbx1 - nbx0), 1), round(nby0 + v * (nby1 - nby0), 1)]
    print('waist     %s -> %s' % (W['waist'], remap(W['waist'])))
    print('rimCenter %s -> %s' % (W['rimCenter'], remap(W['rimCenter'])))
    json.dump({'waist': remap(W['waist']), 'rimCenter': remap(W['rimCenter']),
               'width': CANVAS[0], 'height': CANVAS[1],
               'back': out_back, 'front': out_front},
              open('tools/wrap-kraft.json', 'w'), indent=1)

if __name__ == '__main__':
    main('incoming/wrap-kraft.jpg',
         'assets/classic/wrap-kraft-back.webp',
         'assets/classic/wrap-kraft-front.webp',
         'assets/classic/wrap-ivory-front.webp',
         'assets/classic/wrap-ivory-back.webp')
