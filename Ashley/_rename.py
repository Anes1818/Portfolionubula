"""Mechanical rename pass for the Ashley's demo pages.

Handles the substitutions that are pure find/replace. Two files are excluded and
rewritten by hand instead: index.html (full redesign) and builder-i18n.js (its
Spanish table has to be re-authored, not substituted).

Apostrophe note: the shop name is written with the typographic apostrophe U+2019
throughout. "Ashley's" with a straight quote would terminate the single-quoted
JS string literals this codebase uses in several places; the curly mark is safe
everywhere and is the correct glyph for a possessive in display copy.
"""
import io, re, os

SHOP = 'Ashley’s Floral Boutique'
FILES = ['weddings.html', 'bouquet.html', 'builder.html', 'thanks.html',
         'admin.html', 'import.html']

WORDMARK = ('<a class="logo" href="index.html"><span>'
            '<span class="t">Ashley’s</span>'
            '<small>FLORAL BOUTIQUE</small></span></a>')

SUBS = [
    # ---- identity ----
    ('Flowers Pavon', SHOP),
    ('Flowers <em>Pavon</em>', 'Ashley’s'),
    ('flowerspavon.com', 'ashleys.floral.boutique'),
    ('pavonflowers.com', 'ashleys.floral.boutique'),
    ('instagram.com/flowerspavon', 'instagram.com/ashleys.floral.boutique'),
    ('@flowerspavon', '@ashleys.floral.boutique'),
    ('HANDCRAFTED FLORAL ARTISTRY', 'FLORAL BOUTIQUE'),
    # ---- place ----
    ('Northern Virginia', 'Oklahoma City'),
    ('northern Virginia', 'Oklahoma City'),
    ('the DMV', 'OKC'),
    ('Woodbridge, VA', 'Oklahoma City, OK'),
    ('Dale City, VA', 'Moore, OK'),
    ('Manassas, VA', 'Norman, OK'),
    ('Lake Ridge, VA', 'Yukon, OK'),
    ('Woodbridge', 'south OKC'), ('Manassas', 'Norman'),
    ('Dale City', 'Moore'), ('Lorton', 'Yukon'),
    # ---- contact / channels ----
    ('17039534542', '14058626632'),
    ('+1 703 ••• 4412', '+1 405 ••• 4412'),
    ('+1 571 ••• 8830', '+1 405 ••• 8830'),
    ('+1 703 ••• 2219', '+1 405 ••• 2219'),
    ('+1 703 ••• 9084', '+1 405 ••• 9084'),
    # ---- storage keys: /demo/* share one origin, so namespace per shop ----
    ("'pavonLang'", "'ashleysLang'"),
    ('"pavonLang"', '"ashleysLang"'),
    ("pavAdminDemo", "ashleysAdminDemo"),
    ("'pavonEventDemo'", "'ashleysEventDemo'"),
    ("'nbGate'", "'abGate'"),
    ("KEY='pavon-demo-2026'", "KEY='ashleys-demo-2026'"),
    # ---- order refs ----
    ('PAV-', 'AB-'),
    ('"AB-"+ref', '"AB-"+ref'),
    # ---- fonts: add the script face used for the wordmark ----
    ('&family=Inter:wght@400;600;700;800&display=swap',
     '&family=Great+Vibes&family=Inter:wght@400;600;700;800&display=swap'),
]

logo_re = re.compile(r'<a class="logo"[^>]*>.*?</a>', re.S)
robots_re = re.compile(r'<meta name="robots"[^>]*>')

report = []
for fn in FILES:
    if not os.path.exists(fn):
        report.append((fn, 'MISSING')); continue
    s = io.open(fn, encoding='utf-8').read()
    before = s
    for a, b in SUBS:
        s = s.replace(a, b)
    # one wordmark markup, no tulip canvas
    s, n = logo_re.subn(WORDMARK, s)
    # noindex on every page, normalised to one form
    s = robots_re.sub('<meta name="robots" content="noindex, nofollow">', s)
    if '<meta name="robots"' not in s:
        s = s.replace('<meta charset', '<meta name="robots" content="noindex, nofollow">\n<meta charset', 1)
    io.open(fn, 'w', encoding='utf-8', newline='').write(s)
    report.append((fn, 'logo x%d, %s' % (n, 'changed' if s != before else 'no change')))

for fn, msg in report:
    print('%-18s %s' % (fn, msg))
