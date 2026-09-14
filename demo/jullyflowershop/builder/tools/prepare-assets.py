#!/usr/bin/env python3
"""Rebuild derived art from the extracted original handoff. Never changes source images."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np, cv2, json, shutil, hashlib, gc
cv2.setNumThreads(1)

import argparse
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source',type=Path,required=True,help='Extracted original handoff folder')
parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1],help='Output project folder')
parser.add_argument('--archive',type=Path,help='Exact original ZIP; defaults to the project archival copy')
parser.add_argument('--overwrite',action='store_true',help='Rebuild derived files only')
args=parser.parse_args()
SRC=args.source.resolve(); ROOT=args.root.resolve()
ARCHIVE=(args.archive or ROOT/'originals/nebula-handoff-unchanged.zip').resolve()
if not (SRC/'assets/new-originals/classic_wrap_ivory_master.jpg').is_file(): parser.error('Source must be the extracted handoff, not the website folder.')
if not ARCHIVE.is_file(): parser.error('Original archive is missing; provide --archive.')
ART=ROOT/'assets'
WORK=ROOT/'artwork/working-png'
for p in [ROOT, ART/'classic', ART/'heads', ART/'finishes', WORK, ROOT/'docs', ROOT/'tests', ROOT/'tools', ROOT/'originals']:
    p.mkdir(parents=True,exist_ok=True)
# The exact supplied handoff remains untouched, including all previous source and all originals.
if ARCHIVE != (ROOT/'originals/nebula-handoff-unchanged.zip').resolve():
    shutil.copy2(ARCHIVE,ROOT/'originals/nebula-handoff-unchanged.zip')
for name in ['00-START-HERE.md','01-NEW-CONVERSATION-PROMPT.txt','02-DESIGN-BRIEF.md','03-ASSET-STATUS.md','04-REMAINING-IMAGE-PROMPTS.md','05-IMPLEMENTATION-AND-QA.md']:
    shutil.copy2(SRC/name,ROOT/'originals'/name)

report=[]
def key_blue(image):
    a=np.asarray(image.convert('RGBA')).copy()
    rgb=a[:,:,:3].astype(np.float32)
    prior=a[:,:,3].astype(np.float32)/255
    excess=rgb[:,:,2]-np.maximum(rgb[:,:,0],rgb[:,:,1])
    # Chroma blue only. Green foliage is not keyed. JPEG transition pixels retain soft alpha.
    alpha=prior*np.clip(1-(excess-8)/200,0,1)
    alpha[(excess>150)&(rgb[:,:,0]<80)&(rgb[:,:,1]<100)]=0
    # Remove background compression specks; keep the main connected photographic object.
    _, labels, stats, _=cv2.connectedComponentsWithStats((alpha>.28).astype('uint8'),8)
    if len(stats)>1:
        main=1+np.argmax(stats[1:,4])
        keep=cv2.dilate((labels==main).astype('uint8'),np.ones((5,5),'uint8'))
        alpha*=keep
    # Propagate neighboring foreground colors into the narrow matte edge to prevent blue fringes.
    solid=(alpha>.98)&(excess<5)
    if solid.any():
        _, near=cv2.distanceTransformWithLabels((~solid).astype('uint8'),cv2.DIST_L2,5,labelType=cv2.DIST_LABEL_PIXEL)
        palette=rgb[solid]
        edge=(alpha>0)&((alpha<.98)|(excess>5))
        rgb[edge]=palette[np.clip(near[edge]-1,0,len(palette)-1)]
    rgb[alpha==0]=0
    out=np.dstack([np.uint8(np.clip(rgb,0,255)),np.uint8(np.clip(alpha*255,0,255))])
    return Image.fromarray(out,'RGBA')

def existing(image):
    # Trust the supplied alpha. Purple/violet petals are NOT a blue screen.
    a=np.asarray(image.convert('RGBA')).copy()
    a[a[:,:,3]<4]=0
    return Image.fromarray(a,'RGBA')

def save(im,path,lossless=False):
    if path.exists() and not args.overwrite:
        try:
            with Image.open(path) as check: check.load()
            return
        except (OSError,ValueError): pass  # Rebuild a broken DERIVATIVE; never touch source.
    if path.suffix=='.webp': im.save(path,'WEBP',quality=94,method=4,lossless=lossless)
    else: im.save(path)

def bounds(im): return list(im.getchannel('A').point(lambda x:255 if x>16 else 0).getbbox() or (0,0,0,0))

def crop_pad(im,box,pad=5):
    out=im.crop(box); dst=Image.new('RGBA',(out.width+pad*2,out.height+pad*2))
    dst.paste(out,(pad,pad)); return dst

# Selected new photographs: all originals remain in the exact handoff archive.
new={}
for stem in ['classic_lily_pink','classic_gerbera_white','classic_wrap_ivory_master']:
    im=key_blue(Image.open(SRC/'assets/new-originals'/f'{stem}.jpg'))
    if stem=='classic_gerbera_white':
        # Its original stem reaches the image edge; a transparent margin is added, not invented stem pixels.
        padded=Image.new('RGBA',(im.width,im.height+20));padded.paste(im,(0,0));im=padded
    save(im,WORK/f'{stem}.png');new[stem]=im
    report.append({'source':f'assets/new-originals/{stem}.jpg','sourceSHA256':hashlib.sha256((SRC/'assets/new-originals'/f'{stem}.jpg').read_bytes()).hexdigest(),'working':f'artwork/working-png/{stem}.png','size':list(im.size),'alphaBounds':bounds(im),'matting':'blue-only key, connected-background removal, neighboring-color edge decontamination'})

wrap=new['classic_wrap_ivory_master']
w,h=wrap.size
# Bezier-traced occlusion contour of the SAME photographic front cup and side folds.
# Pixel origin and full canvas are deliberately identical for both runtime layers.
def bez(p0,p1,p2,p3,n=36):
    return [tuple((1-t)**3*p0[j]+3*(1-t)**2*t*p1[j]+3*(1-t)*t*t*p2[j]+t**3*p3[j] for j in (0,1)) for t in np.linspace(0,1,n)]
pts=[(0,1200),(0,440),(38,439)]
pts+=bez((38,439),(92,409),(149,399),(175,405))
pts +=[(257,543)]
pts+=bez((257,543),(247,578),(344,599),(449,600))
pts+=bez((449,600),(554,601),(643,575),(641,546))
pts +=[(722,406)]
pts+=bez((722,406),(757,403),(817,412),(859,439))
pts +=[(896,440),(896,1200)]
mask=Image.new('L',wrap.size);ImageDraw.Draw(mask).polygon(pts,fill=255)
mask=mask.filter(ImageFilter.GaussianBlur(.45))
front=wrap.copy();front.putalpha(Image.fromarray((np.asarray(wrap.getchannel('A'),dtype=float)*np.asarray(mask)/255).astype('uint8')))
save(wrap,ART/'classic/wrap-ivory-back.webp',True)
save(front,ART/'classic/wrap-ivory-front.webp',True)
save(front,WORK/'classic_wrap_ivory_front.png')
meta={'wrap':{'width':w,'height':h,'waist':[448,850],'rimCenter':[449,600],'sharedOrigin':[0,0],'back':'assets/classic/wrap-ivory-back.webp','front':'assets/classic/wrap-ivory-front.webp','frontContour':[[round(x,2),round(y,2)] for x,y in pts]},'flowers':{},'finishes':{}}
lib=SRC/'assets/existing-library'
# Crop by measured flower region, independent of full-stem padding/length.
for path in sorted(lib.glob('head_*.webp')):
    print('Processing', path.name, flush=True)
    gc.collect()
    ident=path.stem[5:]
    im=existing(Image.open(path))
    box=bounds(im); head=crop_pad(im,box)
    save(head,ART/'heads'/f'{ident}.webp')
    source=Image.open(lib/f'{ident}.webp').convert('RGBA')
    if ident=='lily':source=new['classic_lily_pink'].copy();cut=611
    elif ident=='gerbera_daisy':source=new['classic_gerbera_white'].copy();cut=641
    else:
        source=existing(source)
        if ident.startswith('rose_'): frac=.244 if ident!='rose_orange' else .265
        elif ident.startswith('carnation_'):frac=.245 if ident=='carnation_orange' else .236
        elif ident.startswith('tulip_'):frac=.236
        else:frac={'sunflower':.365,'ranunculus':.285,'alstroemeria':.30,'babys_breath':.44,'eucalyptus':.47,'limonium':.49}.get(ident,.30)
        cut=round(source.height*frac)
    roi=source.crop((0,0,source.width,cut))
    if ident not in ['eucalyptus','babys_breath','limonium']:
        ar=np.asarray(roi).copy();rgb=ar[:,:,:3].astype(float)
        green=(rgb[:,:,1]>rgb[:,:,0]*1.055)&(rgb[:,:,1]>rgb[:,:,2]*1.13)&(rgb.sum(axis=2)<610)
        # Remove only low foliage/cut stem from the head overlay; paper occlusion owns these pixels.
        green[:round(cut*.54)]=False
        ar[green,3]=0
        roi=Image.fromarray(ar,'RGBA')
    bloom_box=bounds(roi)
    if ident in ['lily','gerbera_daisy']:
        # Keep the complete lower petals; leaves within this crop are botanical source pixels.
        pass
    flower=crop_pad(roi,bloom_box)
    save(flower,ART/'classic'/f'{ident}-bloom.webp')
    stem=source.copy();aa=np.asarray(stem.getchannel('A')).copy()
    aa[:cut-2,:]=0
    aa[cut-2:cut+2,:]=(aa[cut-2:cut+2,:]*np.linspace(0,1,4)[:,None]).astype('uint8')
    stem.putalpha(Image.fromarray(aa))
    save(stem,ART/'classic'/f'{ident}-stem.webp')
    bx,by,br,bb=bloom_box
    # Source-axis measured from the bottom alpha silhouette (one cut stem).
    ar=np.asarray(source.getchannel('A'))
    yy=np.flatnonzero((ar>120).any(axis=1))
    bottom=int(yy[-1]) if len(yy) else source.height-1
    low=np.where(ar[max(cut,bottom-14):bottom+1]>100)
    baseX=float(np.median(low[1])) if len(low[1]) else source.width/2
    meta['flowers'][ident]={'head':f'assets/heads/{ident}.webp','headWidth':head.width,'headHeight':head.height,'headAlphaBounds':bounds(head),'classicBloom':f'assets/classic/{ident}-bloom.webp','classicStem':f'assets/classic/{ident}-stem.webp','bloomWidth':flower.width,'bloomHeight':flower.height,'sourceWidth':source.width,'sourceHeight':source.height,'sourceBloomBox':bloom_box,'bloomCenter':[(bx+br)/2,(by+bb)/2],'stemBase':[round(baseX,2),bottom],'stemCutY':cut,'classicAvailable':ident!='ranunculus','identityNote':('Classic cream full-stem image missing; coral original is NOT substituted.' if ident=='ranunculus' else 'Matched pink source, not the old white lily.' if ident=='lily' else 'Matched white source, not the old peach gerbera.' if ident=='gerbera_daisy' else '')}

for name in ['ribbon_blush','ribbon_burgundy','ribbon_sage','sash_love','sash_bday','sash_wed','diamond_pin','extra_butterfly_gold','extra_chocolate_gold']:
    im=existing(Image.open(lib/f'{name}.webp'));im=crop_pad(im,bounds(im));save(im,ART/'finishes'/f'{name}.webp')
    meta['finishes'][name]={'url':f'assets/finishes/{name}.webp','width':im.width,'height':im.height}
# Chocolate is a separately priced explicit item, never a layout repair.
f=meta['finishes']['extra_chocolate_gold']
meta['flowers']['__choc']={'head':f['url'],'headWidth':f['width'],'headHeight':f['height'],'classicAvailable':False,'identityNote':'Loose foil chocolate has no supplied Classic support/stick photo.'}
(ROOT/'asset-meta.js').write_text('/* Measured source coordinates. Rebuild using tools/prepare-assets.py. */\nwindow.NEBULA_META='+json.dumps(meta,separators=(',',':'))+';\n')
(ROOT/'artwork/asset-preparation.json').write_text(json.dumps(report,indent=2))
(ROOT/'artwork/asset-metadata.json').write_text(json.dumps(meta,indent=2))
# Diagnostics on light / dark / checkerboard; these are opened and inspected individually during QA.
for key,im in new.items():
    thumb=im.copy();thumb.thumbnail((470,620))
    for name,col in [('light',(249,247,241)),('dark',(30,34,37)),('checker',None)]:
        bg=Image.new('RGB',(thumb.width+40,thumb.height+40),col or (224,224,224))
        if col is None:
            d=ImageDraw.Draw(bg)
            for y in range(0,bg.height,16):
                for x in range(0,bg.width,16):
                    if (x//16+y//16)%2: d.rectangle((x,y,x+15,y+15),fill=(175,175,175))
        bg.paste(thumb,(20,20),thumb)
        out=ROOT/'tests/previews/asset-mattes';out.mkdir(parents=True,exist_ok=True)
        bg.save(out/f'{key}-{name}.png')
print('Prepared photographic assets:',len(meta['flowers']),'catalogue mappings;',len(list(ART.rglob('*.webp'))),'runtime files')
print('Wrap layer canvases:',wrap.size,front.size,'shared origin [0,0]')
print('Original handoff SHA-256:',hashlib.sha256(ARCHIVE.read_bytes()).hexdigest())
