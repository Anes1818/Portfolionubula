"""User-requested format conversion; preserve the original and all visible pixels."""
from pathlib import Path
from PIL import Image, ImageChops
import hashlib, json, shutil

root = Path(__file__).resolve().parents[2] / 'assets/lily-family'
(root / 'masters').mkdir(parents=True, exist_ok=True)
source = Path('C:/Users/laptops zone/Downloads/IMG_20261018_130715_676.png')
master = root / 'masters/lily-pink-open-a.png'
if master.exists() and master.read_bytes() != source.read_bytes():
    raise RuntimeError('Refusing to overwrite a different master')
shutil.copyfile(source, master)
im = Image.open(master).convert('RGBA')
runtime = root / 'lily-pink-open-a.webp'
im.save(runtime, 'WEBP', lossless=True, method=6, exact=True)
decoded = Image.open(runtime).convert('RGBA')
assert decoded.size == im.size
assert ImageChops.difference(im, decoded).getextrema() == ((0,0),)*4
info = dict(id='lily-pink-open-a', status='accepted-for-composition-trial',
    source=str(source), master='masters/'+master.name, file=runtime.name,
    width=im.width, height=im.height, alphaBounds=im.getchannel('A').getbbox(),
    conversion='Lossless WebP; decoded RGBA matches PNG exactly; no resizing or retouching.',
    sha256=hashlib.sha256(runtime.read_bytes()).hexdigest(),
    sourceBytes=master.stat().st_size, runtimeBytes=runtime.stat().st_size)
(root/'manifest.json').write_text(json.dumps(info,indent=2)+'\n',encoding='utf-8')
print(json.dumps(info))
