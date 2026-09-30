#!/usr/bin/env python3
"""Fully decode all runtime WebPs, then rebuild the offline/canvas-safe bundle."""
from pathlib import Path
from PIL import Image
import argparse,base64,json,hashlib,io
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1])
p.add_argument('--update',nargs='+',help='Update only these relative asset paths; preserve all other reviewed embedded bytes (disk may contain older/uncompressed art).')
args=p.parse_args();r=args.root.resolve()
assets={};manifest=[]
if args.update:
 assets=json.loads((r/'assets-bundle.js').read_text().split('window.NEBULA_EMBED=',1)[1].strip().rstrip(';'))
files=[r/name for name in args.update] if args.update else sorted((r/'assets').rglob('*.webp'))
for file in files:
 with Image.open(file) as im:
  im.load()
  if im.mode!='RGBA': raise ValueError(f'Expected RGBA: {file}')
  dims=list(im.size)
 rel=file.relative_to(r).as_posix();data=file.read_bytes()
 assets[rel]='data:image/webp;base64,'+base64.b64encode(data).decode()
for rel,encoded in sorted(assets.items()):
 data=base64.b64decode(encoded.split(',',1)[1])
 with Image.open(io.BytesIO(data)) as im:
  im.load();dims=list(im.size)
  if im.mode!='RGBA': raise ValueError(f'Expected RGBA: {rel}')
 manifest.append({'path':rel,'size':len(data),'dimensions':dims,'sha256':hashlib.sha256(data).hexdigest()})
if not assets: raise ValueError('No runtime images found')
meta=json.loads((r/'asset-meta.js').read_text().split('=',1)[1].strip().rstrip(';'))
def references(value):
 if isinstance(value,str) and value.startswith('assets/') and value.endswith('.webp'): yield value
 elif isinstance(value,dict):
  for v in value.values(): yield from references(v)
 elif isinstance(value,list):
  for v in value: yield from references(v)
missing=set(references(meta))-assets.keys()
if missing: raise ValueError(f'Metadata assets missing from disk; recover before rebundling: {sorted(missing)}')
(r/'assets-bundle.js').write_text('/* Exact embedded runtime images for offline canvas-safe use. */\nwindow.NEBULA_EMBED='+json.dumps(assets,separators=(',',':'))+';\n')
(r/'artwork/runtime-manifest.json').write_text(json.dumps(manifest,indent=2))
print(f'Validated and embedded {len(assets)} RGBA WebPs.')
