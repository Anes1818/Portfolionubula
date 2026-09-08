#!/usr/bin/env python3
"""Final deterministic DERIVATIVE matte cleanup. Run after prepare-assets.py."""
from pathlib import Path
from PIL import Image
import cv2,numpy as np,argparse
cv2.setNumThreads(1)
p=argparse.ArgumentParser(description=__doc__);p.add_argument("--root",type=Path,default=Path(__file__).resolve().parents[1]);r=p.parse_args().root.resolve()
# Deterministic derivative cleanup: purge disconnected JPEG/cutout crumbs, not violet flower color.
for p in (r/'assets/classic').glob('*-bloom.webp'):
 if p.stem.startswith(('eucalyptus','babys_breath','limonium','alstroemeria')):continue
 im=Image.open(p).convert('RGBA');a=np.asarray(im).copy();rgb=a[:,:,:3].astype(float)
 if p.name.startswith('lily-'):
  yy,xx=np.indices(a.shape[:2]);low=yy>a.shape[0]*.52
  green=(rgb[:,:,1]>rgb[:,:,0]*.85)&(rgb[:,:,1]>rgb[:,:,2]*1.06)&(rgb.sum(axis=2)<650)
  a[green&low,3]=0
 elif p.name.startswith('gerbera_daisy-'):
  yy,xx=np.indices(a.shape[:2]);low=yy>a.shape[0]*.62
  green=(rgb[:,:,1]>rgb[:,:,0]*.85)&(rgb[:,:,1]>rgb[:,:,2]*1.10)&(rgb.sum(axis=2)<500)
  a[green&low,3]=0
 # Alpha topology removes isolated bits without changing the photographic petals.
 num,labels,stats,_=cv2.connectedComponentsWithStats((a[:,:,3]>48).astype('uint8'),8)
 if num>1:
  largest=max(stats[1:,4]);good=[i for i in range(1,num) if stats[i,4]>=max(30,largest*.0007)]
  keep=np.isin(labels,good).astype('uint8');keep=cv2.dilate(keep,np.ones((3,3),'uint8'))
  a[:,:,3]*=keep
 a[a[:,:,3]==0,:3]=0
 Image.fromarray(a,'RGBA').save(p,'WEBP',lossless=True,method=2)
# White/ivory supplied wrap contains no blue material; neutralize any residual chroma spill.
for p in list((r/'assets/classic').glob('wrap-ivory-*.webp'))+[r/'artwork/working-png/classic_wrap_ivory_master.png',r/'artwork/working-png/classic_wrap_ivory_front.png']:
 im=Image.open(p).convert('RGBA');a=np.asarray(im).copy();a[:,:,2]=np.minimum(a[:,:,2],np.maximum(a[:,:,0],a[:,:,1]));im=Image.fromarray(a,'RGBA')
 if p.suffix=='.webp':im.save(p,'WEBP',lossless=True,method=2)
 else:im.save(p)

print("Refined the derived bloom and ivory-paper mattes. Originals unchanged.")
