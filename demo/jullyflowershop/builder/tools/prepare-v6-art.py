from pathlib import Path
from PIL import Image
import numpy as np,json,hashlib
R=Path(__file__).resolve().parents[1];V=R;lib=R/'originals/existing-library'
mdata=json.loads((V/'asset-meta.js').read_text().split('window.NEBULA_META=',1)[1].rsplit(';',1)[0]);report=[]
new={'lily':'classic_lily_pink','gerbera_daisy':'classic_gerbera_white','ranunculus':'classic_ranunculus_cream','hydrangea':'classic_hydrangea_white'}
for id,m in mdata['flowers'].items():
 im=Image.open(R/m['head']).convert('RGBA');ar=np.asarray(im);yy,xx=np.nonzero(ar[:,:,3]>4);m['headRadius']=round(float(np.max(np.hypot(xx+.5-im.width/2,yy+.5-im.height/2)))/max(im.size)+.004,5)
 if not m.get('classicStem'):continue
 source=R/'artwork/working-png'/(new[id]+'.png') if id in new else lib/(id+'.webp');im=Image.open(source).convert('RGBA');ar=np.asarray(im).copy();box=m['sourceBloomBox'];pad=(m['bloomWidth']-(box[2]-box[0]))//2
 crop=im.crop(box);bloom=Image.new('RGBA',(m['bloomWidth'],m['bloomHeight']));bloom.paste(crop,(pad,pad));bloom.save(R/m['classicBloom'],'WEBP',lossless=True,method=2)
 start=max(0,box[3]-8);ar[:start,:,3]=0;ar[ar[:,:,3]==0,:3]=0;Image.fromarray(ar).save(R/m['classicStem'],'WEBP',lossless=True,method=2)
 m['joinOverlap']=8;m['bloomPadding']=pad;m['identityNote']=m['identityNote'].split(' v6:')[0]+' v6: one source transform for flower and neck.'
 report.append({'id':id,'sourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),'bloomBox':box,'stemBeginsAt':start,'bloomEndsAt':box[3],'sharedTransform':True})
(R/'asset-meta.js').write_text('/* Actual alpha radius and same-source Classic joins. */\nwindow.NEBULA_META='+json.dumps(mdata,separators=(',',':'))+';\n');(R/'artwork/asset-metadata.json').write_text(json.dumps(mdata,indent=2));(R/'artwork/v6-connections.json').write_text(json.dumps(report,indent=2))
print('Connected Classic pairs:',len(report),'Head alpha bounds:',len(mdata['flowers']),flush=True)
