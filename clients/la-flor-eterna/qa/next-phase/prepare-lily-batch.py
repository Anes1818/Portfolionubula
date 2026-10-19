"""Lossless conversion of the user-supplied batch; masters remain untouched."""
from pathlib import Path
from PIL import Image, ImageChops
import hashlib, json, shutil
root=Path(__file__).resolve().parents[2]/'assets/lily-family'
source=Path('C:/Users/laptops zone/Downloads/Telegram Desktop')
mapping={
 'white-flower-spray':'IMG_20261018_154233_794.png',
 'lily-pink-oblique-left':'IMG_20261018_154225_785.png',
 'bow-blush-long-tails':'IMG_20261018_154240_200.png',
 'rose-ivory-open-a':'IMG_20261018_154233_102.png',
 'eucalyptus-edge':'IMG_20261018_154233_612.png',
 'wrap-peach-blush':'IMG_20261018_154233_895.png',
 'rose-ivory-open-b':'IMG_20261018_154234_001.png',
 'lily-pink-open-a':'IMG_20261018_130715_676.png',
}
assets=[]
for name,file in mapping.items():
 src=source/file; master=root/'masters'/(name+'.png'); master.parent.mkdir(parents=True,exist_ok=True)
 if master.exists() and master.read_bytes()!=src.read_bytes():
  # Keep the previously accepted original lily when Telegram changes encoding.
  if name!='lily-pink-open-a':raise RuntimeError('Different master: '+name)
 else:shutil.copyfile(src,master)
 im=Image.open(master).convert('RGBA');assert im.getchannel('A').getextrema()==(0,255)
 target=root/(name+'.webp');im.save(target,'WEBP',lossless=True,method=6,exact=True)
 assert ImageChops.difference(im,Image.open(target).convert('RGBA')).getextrema()==((0,0),)*4
 assets.append(dict(id=name,file=target.name,width=im.width,height=im.height,source=str(src),master='masters/'+master.name,alphaBounds=im.getchannel('A').getbbox(),sha256=hashlib.sha256(target.read_bytes()).hexdigest(),sourceBytes=master.stat().st_size,runtimeBytes=target.stat().st_size))
(root/'batch-manifest.json').write_text(json.dumps({'conversion':'lossless; decoded RGBA exactly equal; no resizing or retouching','assets':assets},indent=2)+'\n',encoding='utf-8')
print(json.dumps(assets))
