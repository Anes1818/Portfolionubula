#!/usr/bin/env python3
"""Prepare the seven September 7 source photographs; existing v4 Classic assets stay untouched."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps
import numpy as np, cv2, json, shutil, hashlib
cv2.setNumThreads(1)
r=Path(__file__).resolve().parents[1]
src=r.parent/'new-art'
mapping={'8_59PM':'classic_ranunculus_cream','9_00PM':'classic_hydrangea_white','9_01PM':'head_hydrangea_white','9_02PM':'filler_babys_breath_compact','9_03PM':'filler_babys_breath_medium','9_04PM':'wrap_dome_black_top','9_06PM':'wrap_heart_black_top'}
meta=json.loads((r/'artwork/asset-metadata.json').read_text());report=[];ims={}
def bounds(im):return im.getchannel('A').point(lambda v:255 if v>24 else 0).getbbox()
def trim(im,pad=8):
 b=bounds(im);a=im.crop(b);out=Image.new('RGBA',(a.width+pad*2,a.height+pad*2));out.paste(a,(pad,pad));return out

def matte(im):
 a=np.array(im.convert('RGB')).astype(np.float32);ex=a[:,:,2]-np.maximum(a[:,:,0],a[:,:,1]);alpha=np.clip(1-(ex-7)/205,0,1)
 alpha[(ex>140)&(a[:,:,0]<95)&(a[:,:,1]<120)]=0
 n,lab,stats,_=cv2.connectedComponentsWithStats((alpha>.32).astype('uint8'),8)
 good=[i for i in range(1,n) if stats[i,4]>=7]
 keep=cv2.dilate(np.isin(lab,good).astype('uint8'),np.ones((3,3),'uint8'));alpha*=keep
 solid=(alpha>.98)&(ex<6)
 if solid.any():
  _,near=cv2.distanceTransformWithLabels((~solid).astype('uint8'),cv2.DIST_L2,5,labelType=cv2.DIST_LABEL_PIXEL)
  pal=a[solid];edge=(alpha>0)&((alpha<.98)|(ex>6));a[edge]=pal[np.clip(near[edge]-1,0,len(pal)-1)]
 a[:,:,2]=np.minimum(a[:,:,2],np.maximum(a[:,:,0],a[:,:,1])+3)
 a[alpha==0]=0
 return Image.fromarray(np.dstack((np.uint8(np.clip(a,0,255)),np.uint8(alpha*255))))
def save(im,rel):
 p=r/rel;p.parent.mkdir(parents=True,exist_ok=True)
 if p.suffix=='.webp':im.save(p,'WEBP',lossless=True,method=3)
 else:im.save(p)
for stamp,name in mapping.items():
 p=next(src.glob('*'+stamp+'.jpg'));shutil.copy2(p,r/'originals/new-assets'/f'{name}.jpg')
 im=matte(Image.open(p));ims[name]=im;save(im,f'artwork/working-png/{name}.png')
 report.append({'source':f'originals/new-assets/{name}.jpg','originalFilename':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'size':list(im.size),'alphaBounds':list(bounds(im)),'alphaFraction':round(float((np.asarray(im.getchannel('A'))>24).mean()),4)})
for ident,key,cut in [('ranunculus','classic_ranunculus_cream',691),('hydrangea','classic_hydrangea_white',790)]:
 im=ims[key];roi=im.crop((0,0,im.width,cut));ar=np.array(roi);rgb=ar[:,:,:3].astype(float);yy=np.indices(ar.shape[:2])[0]
 green=(rgb[:,:,1]>rgb[:,:,0]*1.03)&(rgb[:,:,1]>rgb[:,:,2]*1.08)&(rgb.sum(2)<520)&(yy>cut*.70)
 ar[green,3]=0;roi=Image.fromarray(ar);box=bounds(roi);bloom=trim(roi)
 # Stem layer retains original photographic green structure; source head pixels are excluded.
 st=im.copy();a=np.array(st.getchannel('A'));a[:cut-2]=0;st.putalpha(Image.fromarray(a))
 save(bloom,f'assets/classic/{ident}-bloom.webp');save(st,f'assets/classic/{ident}-stem.webp')
 old=meta['flowers'].get(ident,{})
 if ident=='hydrangea':
  hd=trim(ims['head_hydrangea_white']);save(hd,'assets/heads/hydrangea.webp');old.update(head='assets/heads/hydrangea.webp',headWidth=hd.width,headHeight=hd.height,headAlphaBounds=list(bounds(hd)))
 a=np.array(im.getchannel('A'));ys=np.where((a>120).any(1))[0];bot=int(ys[-1]);xx=np.where(a[bot-14:bot+1]>100)[1]
 old.update(classicBloom=f'assets/classic/{ident}-bloom.webp',classicStem=f'assets/classic/{ident}-stem.webp',bloomWidth=bloom.width,bloomHeight=bloom.height,sourceWidth=im.width,sourceHeight=im.height,sourceBloomBox=list(box),bloomCenter=[(box[0]+box[2])/2,(box[1]+box[3])/2],stemBase=[float(np.median(xx)),bot],stemCutY=cut,classicAvailable=True,identityNote='Matching new supplied photographic source; original preserved.')
 meta['flowers'][ident]=old
for ident,key in [('babys_compact','filler_babys_breath_compact'),('babys_medium','filler_babys_breath_medium')]:
 im=trim(ims[key]);save(im,f'assets/heads/{ident}.webp')
 meta['flowers'][ident]={'head':f'assets/heads/{ident}.webp','headWidth':im.width,'headHeight':im.height,'headAlphaBounds':list(bounds(im)),'classicAvailable':True,'classicBloom':f'assets/heads/{ident}.webp','classicStem':None,'bloomWidth':im.width,'bloomHeight':im.height,'bloomCenter':[im.width/2,im.height/2],'stemBase':[im.width/2,im.height],'identityNote':'Explicit small filler cluster tucked among heads; no invented long stem.'}
meta['collars']={}
for mode in ['dome','heart']:
 key=f'wrap_{mode}_black_top';im=trim(ims[key]);save(im,f'assets/wrapping/{mode}-black.webp')
 a=np.array(im.getchannel('A'));num,lab,stats,cents=cv2.connectedComponentsWithStats((a<24).astype('uint8'),8)
 holes=[i for i in range(1,num) if stats[i,0]>0 and stats[i,1]>0 and stats[i,0]+stats[i,2]<im.width and stats[i,1]+stats[i,3]<im.height]
 hole=max(holes,key=lambda i:stats[i,4]);cnts,_=cv2.findContours((lab==hole).astype('uint8'),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE);cnt=max(cnts,key=cv2.contourArea);poly=cv2.approxPolyDP(cnt,2,True).reshape(-1,2).tolist()
 meta['collars'][mode]={'url':f'assets/wrapping/{mode}-black.webp','width':im.width,'height':im.height,'alphaBounds':list(bounds(im)),'openingBounds':stats[hole,:4].tolist(),'openingCenter':cents[hole].tolist(),'openingPolygon':poly,'source':f'originals/new-assets/{key}.jpg'}
(r/'artwork/asset-metadata.json').write_text(json.dumps(meta,indent=2))
(r/'asset-meta.js').write_text('/* Measured v4 assets plus seven prepared v5 source photos. */\nwindow.NEBULA_META='+json.dumps(meta,separators=(',',':'))+';\n')
(r/'artwork/v5-preparation.json').write_text(json.dumps(report,indent=2))
can=Image.new('RGB',(1400,1000),'#dedbd3');draw=ImageDraw.Draw(can)
for i,(name,im) in enumerate(ims.items()):
 thumb=ImageOps.contain(im,(325,410));x=(i%4)*350+(350-thumb.width)//2;y=(i//4)*500+20
 can.paste(thumb,(x,y),thumb);draw.text(((i%4)*350+8,y+430),name,fill='black')
can.save(r/'tests/v5/prepared-art-contact.jpg')
print(json.dumps({'prepared':report,'collars':meta['collars']},indent=2))
