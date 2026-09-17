"""Normalise every colour literal in the Ashley's CSS onto the 10 brand tokens.

The inherited Pavon stylesheet carries ~120 unique hex values and ~180 rgba
variants (boho beige, kraft brown, gold, sage green) spread across a dozen
historical "version" blocks. Patching rule-by-rule would certainly miss some,
so every literal is mapped explicitly here instead. Run once, then verify with
grep that no unmapped literal survives.

Only UI chrome is in scope: this touches site.css / style.css only. The pixel-art
flower palette in pixel.js and the bouquet photographs keep their natural colours.
"""
import io, re, sys

BLACK, INK, MUTED = '#0D0C0F', '#1A1418', '#8A7580'
PAPER, PORCELAIN, BLUSH = '#FFFFFF', '#FFF7FA', '#FBE3EC'
PINK, ROSE, ROSE_DEEP, LINE = '#E85C8C', '#C22B5C', '#8E1D43', '#F1DCE4'

HEX = {
    # ---- darks -> black (surfaces) / ink (text) ----
    '#000': BLACK, '#0a090c': BLACK, '#0b0a0d': BLACK, '#100e13': BLACK,
    '#17131a': BLACK, '#17141a': BLACK, '#0b0b0f': BLACK, '#0e0e13': BLACK,
    '#141216': INK, '#1c141a': INK, '#211d24': INK, '#2a1f26': INK,
    '#1c1c22': INK, '#33333a': INK, '#3c3c44': INK,
    # kraft soil under the pixel garden sits inside a black band
    '#3d2a1e': BLACK, '#4a3325': INK, '#4c4234': INK,
    # ---- greens purged (the WhatsApp/green buttons are removed outright) ----
    '#0c3512': BLACK, '#2e7d36': ROSE_DEEP, '#57c15e': ROSE, '#1faf53': ROSE,
    '#a9bb97': BLUSH, '#dfe9d2': BLUSH, '#eef3e4': PORCELAIN,
    # ---- muted / body greys ----
    '#5d5257': INK, '#5d525a': INK, '#6b6557': MUTED, '#6b675c': MUTED,
    '#8b8290': MUTED, '#9a8f79': MUTED, '#bac': MUTED,
    # ---- text that sits on blush/pink chips -> rose-deep (contrast rule) ----
    '#6d4c58': ROSE_DEEP, '#7c5560': ROSE_DEEP, '#7c5563': ROSE_DEEP,
    # ---- pinks / roses retuned ----
    '#92374e': ROSE_DEEP, '#b8536f': ROSE_DEEP, '#bd6a86': ROSE,
    '#c9556f': ROSE, '#d4738f': ROSE, '#e2919f': PINK, '#f2b0ca': PINK,
    '#f4b8ce': PINK, '#f0c3d3': BLUSH, '#f5cdd8': BLUSH, '#efc9d8': BLUSH,
    '#fadfe9': BLUSH, '#f5eaef': BLUSH, '#f6dbe6': BLUSH,
    '#f9e9f0': BLUSH, '#f9eaf0': BLUSH, '#f9ebf1': BLUSH,
    # ---- gold accents -> pink ----
    '#ffd98a': PINK, '#d9bd7f': PINK, '#c9a24b': PINK, '#e8c987': PINK,
    '#f0e2be': BLUSH, '#eed9a0': BLUSH,
    # ---- lines / hairlines ----
    '#e0d3ba': LINE, '#eadfca': LINE, '#eadfce': LINE, '#eddfe6': LINE,
    '#e5d9c4': LINE, '#e7dcc8': LINE, '#eee': LINE, '#eee3cf': LINE,
    # ---- light text sitting on black bands -> white ----
    '#e9e2c8': PAPER, '#efe6d2': PAPER, '#efe8d2': PAPER, '#f3e4ea': PAPER,
    '#f4e9ee': PAPER, '#bdb494': PAPER, '#c9c0a4': PAPER,
    # ---- cream / beige surfaces -> porcelain ----
    '#f6eddd': PORCELAIN, '#f7ecf1': PORCELAIN, '#f7eddc': PORCELAIN,
    '#f7ede1': PORCELAIN, '#f8eee2': PORCELAIN, '#fbeef0': PORCELAIN,
    '#fbf1f1': PORCELAIN, '#fbf8f9': PORCELAIN, '#fdeef1': PORCELAIN,
    '#fdeff4': PORCELAIN, '#fdf1f4': PORCELAIN, '#fdf1f5': PORCELAIN,
    '#fdf7fa': PORCELAIN, '#fdf8ec': PORCELAIN, '#fff6f2': PORCELAIN,
    '#fff8ed': PORCELAIN, '#fffaf1': PORCELAIN, '#f9edf1': PORCELAIN,
    '#fbedf2': PORCELAIN, '#fbf2e8': PORCELAIN, '#fdf0f4': PORCELAIN,
    '#fdf9fa': PORCELAIN, '#ffeef5': PORCELAIN,
    # ---- near-whites -> paper ----
    '#fffdf6': PAPER, '#fffdf7': PAPER, '#fffdfb': PAPER, '#fffdfe': PAPER,
    '#fffafb': PAPER, '#fffdf2': PAPER,
    # ---- already-correct ----
    '#fff': PAPER, '#ffffff': PAPER,
}

RGB = {
    (0, 0, 0): (13, 12, 15), (13, 12, 15): (13, 12, 15),
    (255, 255, 255): (255, 255, 255),
    # boho browns / greens / golds -> black or pink
    (20, 16, 12): (13, 12, 15), (28, 64, 36): (13, 12, 15),
    (30, 10, 20): (13, 12, 15), (40, 25, 20): (13, 12, 15),
    (48, 43, 32): (13, 12, 15), (51, 49, 42): (13, 12, 15),
    (60, 50, 30): (13, 12, 15), (62, 43, 31): (13, 12, 15),
    (82, 38, 52): (13, 12, 15), (120, 40, 70): (13, 12, 15),
    (20, 20, 40): (13, 12, 15), (41, 20, 34): (13, 12, 15),
    (60, 20, 40): (13, 12, 15), (70, 20, 40): (13, 12, 15),
    (70, 30, 50): (13, 12, 15), (70, 48, 25): (13, 12, 15),
    (92, 35, 57): (13, 12, 15),
    (38, 64, 31): (142, 29, 67), (53, 98, 62): (194, 43, 92),
    (120, 90, 30): (142, 29, 67), (140, 40, 75): (142, 29, 67),
    (160, 120, 40): (232, 92, 140), (201, 162, 75): (232, 92, 140),
    (120, 90, 20): (142, 29, 67),
    (169, 187, 151): (251, 227, 236),
    # pinks
    (176, 126, 134): (194, 43, 92), (184, 83, 111): (142, 29, 67),
    (200, 80, 110): (194, 43, 92), (201, 85, 111): (194, 43, 92),
    (212, 115, 143): (194, 43, 92), (214, 51, 108): (194, 43, 92),
    (238, 183, 197): (232, 92, 140), (244, 184, 206): (232, 92, 140),
    (246, 230, 236): (251, 227, 236), (255, 243, 210): (251, 227, 236),
    (253, 214, 204): (251, 227, 236),
    # THE CREAM HEADER/MBAR BACKGROUNDS -> black (header must be black always)
    (250, 245, 234): (13, 12, 15),
    # cream veils -> porcelain
    (250, 246, 238): (255, 247, 250), (251, 248, 249): (255, 247, 250),
    (253, 241, 245): (255, 247, 250), (253, 247, 250): (255, 247, 250),
    (255, 240, 246): (255, 247, 250), (255, 244, 226): (255, 247, 250),
    (255, 246, 242): (255, 247, 250),
    (255, 253, 246): (255, 255, 255), (255, 253, 249): (255, 255, 255),
    (255, 253, 254): (255, 255, 255),
}

hex_re = re.compile(r'#[0-9a-fA-F]{3,8}\b')
rgb_re = re.compile(r'(rgba?)\(\s*(\d+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)')

unmapped_hex, unmapped_rgb = set(), set()


def fix_hex(m):
    v = m.group(0)
    low = v.lower()
    if low in HEX:
        return HEX[low]
    unmapped_hex.add(low)
    return v


def fix_rgb(m):
    fn, r, g, b, a = m.group(1), int(m.group(2)), float(m.group(3)), float(m.group(4)), m.group(5)
    key = (r, int(g), int(b))
    if key not in RGB:
        unmapped_rgb.add(key)
        return m.group(0)
    nr, ng, nb = RGB[key]
    return ('rgba(%d,%d,%d,%s)' % (nr, ng, nb, a)) if a is not None else ('rgb(%d,%d,%d)' % (nr, ng, nb))


for path in ('site.css', 'style.css'):
    s = io.open(path, encoding='utf-8').read()
    s = rgb_re.sub(fix_rgb, s)
    s = hex_re.sub(fix_hex, s)
    io.open(path, 'w', encoding='utf-8', newline='').write(s)
    print('normalised', path)

print('\nunmapped hex :', sorted(unmapped_hex) or 'none')
print('unmapped rgb :', sorted(unmapped_rgb) or 'none')
if unmapped_hex or unmapped_rgb:
    sys.exit(1)
