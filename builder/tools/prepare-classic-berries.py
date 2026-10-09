"""Prepare the supplied white-background photos for the existing WebP pipeline.

No generative artwork: retain coloured pixels, remove neutral ground/shadows,
feather the matte, crop and register variants into common transparent boxes.
Run from any directory, then run bundle-assets.py.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

ROOT = Path(__file__).resolve().parents[1]

def cutout(name, size):
    im = Image.open(ROOT / 'incoming' / (name + '.jpg')).convert('RGB')
    rgb = np.array(im).astype(float)
    saturation = (rgb.max(2) - rgb.min(2)) / np.maximum(rgb.max(2), 1)
    # These sources have neutral white ground, including the cast shadow.
    alpha = np.clip((saturation - .055) / .075, 0, 1)
    # Keep enclosed pale highlights in the fruit; only neutral ground is removed.
    if name.startswith('strawberry'):
        holes = Image.fromarray(((alpha > .7) * 255).astype('uint8')).copy()
        ImageDraw.floodfill(holes, (0, 0), 128)
        alpha = np.maximum(alpha, (np.array(holes) != 128).astype(float))
    matte = Image.fromarray((alpha * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(.45))
    assert .03 < np.mean(alpha > .5) < .70, 'Matte lost the subject or retained the white ground'
    im = im.convert('RGBA'); im.putalpha(matte)
    im = im.crop(matte.getbbox())
    im.thumbnail((size[0]-12, size[1]-12), Image.Resampling.LANCZOS)
    out = Image.new('RGBA', size)
    out.alpha_composite(im, ((size[0]-im.width)//2, (size[1]-im.height)//2))
    dest = ROOT / 'assets' / 'classic' / (name + '.webp')
    out.save(dest, quality=90, method=6)
    return dest.relative_to(ROOT).as_posix()

berries = [cutout('strawberry-new-'+str(i), (420, 500)) for i in (2, 3)]
herbs = [cutout('rosemary-'+str(i), (300, 620)) for i in (1, 2, 3)]
meta_path = ROOT / 'asset-meta.js'
meta = json.loads(meta_path.read_text().split('=', 1)[1].strip().rstrip(';'))
meta['flowers']['__berry'].update(classicAvailable=True, classicBloom=berries[0],
    classicBlooms=berries, classicStem=None, bloomWidth=420, bloomHeight=500,
    bloomCenter=[210,250], stemBase=[210,500])
meta['flowers']['rosemary'] = dict(head=herbs[2], headWidth=300, headHeight=620,
    headRadius=.5, classicAvailable=True, classicBloom=herbs[2], classicBlooms=herbs,
    classicStem=None, bloomWidth=300, bloomHeight=620, bloomCenter=[150,310], stemBase=[150,620])
meta_path.write_text('window.NEBULA_META='+json.dumps(meta,separators=(',',':'))+';\n')
print('Prepared', len(berries)+len(herbs), 'Classic assets; old berry heads retained.')
