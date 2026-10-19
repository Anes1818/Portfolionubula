"""Preserve user-supplied PNG masters and record measured alpha; no pixel edits."""
import hashlib, json, shutil
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[2] / 'assets/pink-family'
path = root / 'asset-manifest.json'
data = json.loads(path.read_text(encoding='utf-8'))
for name, source, view in [
    ('rose-salmon-reference-center-b-v1', 'IMG_20261018_072010_608.png', 'central-flower-face'),
    ('wrap-gingham-ivory-reference-v1', 'IMG_20261018_074000_255.png', 'reference-paper-backing'),
    ('breath-compact-reference-v1', 'IMG_20261018_075829_729.png', 'compact-flower-tuft'),
]:
    src = Path('C:/Users/laptops zone/Downloads') / source
    im = Image.open(src)
    alpha = im.getchannel('A')
    x, y, right, bottom = alpha.getbbox()
    target = root / 'masters' / (name + '.png')
    digest = hashlib.sha256(src.read_bytes()).hexdigest()
    if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() != digest:
        raise RuntimeError('Do not overwrite a different master')
    shutil.copyfile(src, target)
    entry = dict(id=name, status='accepted-for-proof', filename=target.name,
        master='masters/' + target.name, source=str(src), sha256=digest,
        width=im.width, height=im.height, alphaBounds=[x,y,right-x,bottom-y],
        crop=[0,0,im.width,im.height], pivot=[im.width/2,im.height/2],
        attachmentAnchor=[im.width/2,im.height*.75], flowerCenter=[im.width/2,im.height/2],
        view=view, inspection=dict(hasAlpha=True,
            edgeNote='Tight low-alpha source boundary; scene reserves exterior margin.',
            visualNote='User supplied; accepted for assembled local proof, not final owner approval.'))
    data['assets'] = [a for a in data['assets'] if a['id'] != name] + [entry]
data['pending'] = dict(status='compact-filler-local-composition-review', nextAction='Review reference-v2 in existing studio. Large satin bow still pending.')
path.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
