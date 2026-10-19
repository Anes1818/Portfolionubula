from pathlib import Path
from PIL import Image, ImageChops
import hashlib, json, shutil
root=Path('clients/la-flor-eterna/assets/sunflower-family')
(root/'masters').mkdir(parents=True,exist_ok=True)
source=Path('C:/Users/laptops zone/Downloads/Telegram Desktop')
mapping={'185246_575':'wrap-yellow-back','185254_522':'wrap-yellow-front','185301_011':'sunflower-oblique-a','185306_650':'sunflower-front-a','185306_455':'sunflower-front-b','185258_931':'sunflower-oblique-b','185247_005':'sunflower-leaf-stem'}
assets=[]
for suffix,name in mapping.items():
 src=source/('IMG_20261018_'+suffix+'.png')
 master=root/'masters'/(name+'.png');shutil.copy2(src,master)
 im=Image.open(src).convert('RGBA');target=root/(name+'.webp')
 assert im.getchannel('A').getextrema()==(0,255)
 im.save(target,'WEBP',lossless=True,method=6,exact=True)
 assert ImageChops.difference(im,Image.open(target).convert('RGBA')).getextrema()==((0,0),)*4
 assets.append(dict(file=target.name,width=im.width,height=im.height,source=str(src),sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
(root/'manifest.json').write_text(json.dumps({'conversion':'lossless RGBA verified; no retouching','assets':assets},indent=2)+'\n')
print(json.dumps(assets))
