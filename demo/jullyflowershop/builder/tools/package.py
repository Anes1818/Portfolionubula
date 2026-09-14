from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
from urllib.parse import urlsplit
from PIL import Image
import json,re,base64,hashlib,subprocess,argparse
R=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--output',default=str(R.parent/'nebula-bouquet-builder-v6.zip'));a=p.parse_args()
# Check JavaScript and every local script/style/image reference in the entry page.
for f in R.glob('*.js'):subprocess.run(['node','--check',str(f)],check=True,capture_output=True)
for ref in re.findall(r'(?:src|href)="([^"#]+)"',(R/'index.html').read_text()):
 u=urlsplit(ref)
 if not u.scheme and u.path:assert (R/u.path).is_file(),f'Missing local reference: {ref}'
m=re.search(r'window.NEBULA_EMBED\s*=\s*(\{.*\})\s*;', (R/'assets-bundle.js').read_text(),re.S);assert m
emb=json.loads(m.group(1));assets=sorted((R/'assets').rglob('*.webp'));assert len(assets)==96
for f in assets:
 im=Image.open(f);im.load();assert im.mode=='RGBA',(f,im.mode)
 key=f.relative_to(R).as_posix();assert key in emb;data=base64.b64decode(emb[key].split(',')[-1]);assert data==f.read_bytes(),f'Embedded/file mismatch: {key}'
for name in ['functional','native','edge']:
 d=json.loads((R/f'tests/v6/{name}-results.json').read_text());assert d['failed']==0 and d['passed']>0,(name,d)
for f in (R/'tests/v6').glob('accessibility-*.json'):
 d=json.loads(f.read_text())['data'];assert not d.get('violations') and not d.get('incomplete'),f.name
clean_path=R/'tests/v6/clean-smoke.json'
if clean_path.exists():
 d=json.loads(clean_path.read_text());assert d['failed']==0
 for name,h in d['runtimeHashes'].items():assert hashlib.sha256((R/name).read_bytes()).hexdigest()==h, f'Runtime changed after clean smoke: {name}'
exclude={'SHA256SUMS.txt','native-failure.png','debug-x.png','first-classic.png'}
files=[f for f in R.rglob('*') if f.is_file() and f.name not in exclude and '__pycache__' not in f.parts and '.git' not in f.parts and not f.suffix in ['.pyc','.zip','.log'] and not (f.relative_to(R).parts[:2]==('tests','v5'))]
files.sort();manifest=''.join(hashlib.sha256(f.read_bytes()).hexdigest()+'  '+f.relative_to(R).as_posix()+'\n' for f in files);(R/'SHA256SUMS.txt').write_text(manifest);files.append(R/'SHA256SUMS.txt')
out=Path(a.output);out.parent.mkdir(parents=True,exist_ok=True)
with ZipFile(out,'w',ZIP_DEFLATED,compresslevel=6) as z:
 for f in files:z.write(f,f.relative_to(R))
with ZipFile(out) as z:assert z.testzip() is None;assert z.read('index.html')==(R/'index.html').read_bytes()
print(json.dumps({'zip':str(out),'bytes':out.stat().st_size,'files':len(files),'RGBAWebP':len(assets),'embeddedBytesMatch':True,'CRC':'pass','sha256':hashlib.sha256(out.read_bytes()).hexdigest()}))
