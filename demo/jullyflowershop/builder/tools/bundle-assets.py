#!/usr/bin/env python3
"""Fully decode all runtime WebPs, then rebuild the offline/canvas-safe bundle."""
from pathlib import Path
from PIL import Image
import argparse,base64,json,hashlib
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);r=p.parse_args().root.resolve()
assets={};manifest=[]
for file in sorted((r/'assets').rglob('*.webp')):
 with Image.open(file) as im:
  im.load()
  if im.mode!='RGBA': raise ValueError(f'Expected RGBA: {file}')
  dims=list(im.size)
 rel=file.relative_to(r).as_posix();data=file.read_bytes()
 assets[rel]='data:image/webp;base64,'+base64.b64encode(data).decode()
 manifest.append({'path':rel,'size':len(data),'dimensions':dims,'sha256':hashlib.sha256(data).hexdigest()})
if not assets: raise ValueError('No runtime images found')
(r/'assets-bundle.js').write_text('/* Exact embedded runtime images for offline canvas-safe use. */\nwindow.NEBULA_EMBED='+json.dumps(assets,separators=(',',':'))+';\n')
(r/'artwork/runtime-manifest.json').write_text(json.dumps(manifest,indent=2))
print(f'Validated and embedded {len(assets)} RGBA WebPs.')
