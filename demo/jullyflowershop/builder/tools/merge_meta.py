"""
Fold the freshly extracted artwork into asset-meta.js.

headRadius is measured, not guessed: it is the furthest opaque pixel from the
image centre as a fraction of the longest side. Calibrated against the eight
shipped heads, that reproduces their stored values to within 0.004, so the same
+0.004 offset is applied here for consistency with the existing catalogue.
"""
import json, re, io, os
import numpy as np
from PIL import Image

META = 'asset-meta.js'
RADIUS_OFFSET = 0.004

def head_stats(path):
    a = np.asarray(Image.open(path).convert('RGBA'))
    al = a[..., 3].astype(np.float32) / 255
    h, w = al.shape
    m = al > 0.02
    ys, xs = np.nonzero(m)
    cy, cx = (h - 1) / 2, (w - 1) / 2
    r = float(np.hypot(xs - cx, ys - cy).max()) / max(w, h)
    return {
        'headWidth': w, 'headHeight': h,
        'headAlphaBounds': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
        'headRadius': round(r + RADIUS_OFFSET, 5),
    }

NEW = {
    'chrysanthemum_yellow': {'note': 'Yellow pompon chrysanthemum for the yellow-day palette.'},
    'spray_rose':           {'note': 'Clustered spray rose; several small blooms on one stem.'},
    'stock_yellow':         {'note': 'Yellow stock (Matthiola); tall ruffled spike.'},
    'rose_cream':           {'note': 'Cream champagne rose. The pale foil that makes the yellow palette read.'},
    'statice_purple':       {'note': 'Purple statice; replaces limonium as the violet filler.'},
    'babys_breath':         {'note': 'Re-shot straight down so it reads in Dome and Heart too.'},
    'eucalyptus':           {'note': 'Rounder, fuller sprig. Aspect 0.598 -> 1.003; the old narrow tip read as a thorn.'},
}

def main():
    raw = io.open(META, encoding='utf-8').read()
    i = raw.index('window.NEBULA_META=')
    head = raw[:i + len('window.NEBULA_META=')]
    meta = json.loads(raw[i + len('window.NEBULA_META='):].rstrip().rstrip(';'))

    stems = json.load(open('tools/stem-report.json'))

    for name, info in NEW.items():
        entry = dict(meta['flowers'].get(name, {}))
        hp = 'assets/heads/%s.webp' % name
        if not os.path.exists(hp):
            raise SystemExit('missing head: ' + hp)
        entry['head'] = hp
        entry.update(head_stats(hp))
        if name in stems:
            s = stems[name]
            for k in ('classicBloom', 'classicStem', 'bloomWidth', 'bloomHeight',
                      'sourceWidth', 'sourceHeight', 'sourceBloomBox', 'bloomCenter',
                      'stemBase', 'stemCutY', 'joinOverlap', 'bloomPadding',
                      'classicAvailable'):
                entry[k] = s[k]
        elif 'classicBloom' not in entry:
            entry['classicAvailable'] = False
        entry['identityNote'] = info['note']
        meta['flowers'][name] = entry

    io.open(META, 'w', encoding='utf-8').write(
        head + json.dumps(meta, separators=(',', ':'), ensure_ascii=False) + ';\n')

    print('%-24s %10s %8s %10s %s' % ('asset', 'head', 'radius', 'classic', 'stem source'))
    for name in NEW:
        v = meta['flowers'][name]
        print('%-24s %10s %8.5f %10s %s' % (
            name, '%dx%d' % (v['headWidth'], v['headHeight']), v['headRadius'],
            'yes' if v.get('classicAvailable') else 'head only',
            '%dx%d' % (v['sourceWidth'], v['sourceHeight']) if v.get('sourceWidth') else '-'))

if __name__ == '__main__':
    main()
