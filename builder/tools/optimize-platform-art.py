"""Create delivery copies only; preserve source artwork, dimensions and alpha."""
import hashlib
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[2]
art = root / 'platform/public/studio/satin/art'
mapping = {}
before = after = 0
for source in sorted(art.glob('*.png')):
    digest = hashlib.sha256(source.read_bytes()).hexdigest()[:12]
    target = source.with_name(source.stem + '-' + digest + '.webp')
    if not target.exists():
        with Image.open(source) as im:
            im.convert('RGBA').save(target, 'WEBP', quality=88, method=6, exact=True)
    with Image.open(source) as original, Image.open(target) as optimized:
        assert original.size == optimized.size
        assert original.convert('RGBA').getchannel('A').tobytes() == optimized.convert('RGBA').getchannel('A').tobytes()
    mapping[source.name] = target.name
    before += source.stat().st_size
    after += target.stat().st_size
(art.parent / 'art-delivery.json').write_text(json.dumps(mapping), encoding='utf-8')
print(f'Satin delivery artwork: {before:,} -> {after:,} bytes ({100*(1-after/before):.1f}% smaller); dimensions and alpha verified.')
