#!/usr/bin/env python3
"""Petal Press - ink sticker pack generator.

Every doodle is built from the same three primitives (petal, wobbly circle,
bowed stem) driven by a *seeded* random jitter. Two consequences that matter:

  1. The whole pack shares one hand, so nothing looks copy-pasted.
  2. Changing one seed regenerates a whole fresh pack in under a second.
     That is the real "AI graphics for your brand" promise, delivered
     deterministically instead of at runtime.

Output: assets/ink/stickers.svg  - an SVG <symbol> sprite using currentColor,
so CSS (and seasons.js) can recolour any sticker without a second file.
"""

import json
import math
import os
import random

OUT_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "assets", "ink"))
BOX = 48
STROKE = 2.2


# ---------- helpers ------------------------------------------------------

def f(v):
    return f"{v:.1f}"


def P(*pts):
    return " ".join(f"{f(x)},{f(y)}" for x, y in pts)


def smooth_open(pts):
    """Catmull-Rom through points -> cubic beziers. Open curve."""
    n = len(pts)
    d = f"M{f(pts[0][0])},{f(pts[0][1])}"
    for i in range(n - 1):
        p0 = pts[max(i - 1, 0)]
        p1, p2 = pts[i], pts[i + 1]
        p3 = pts[min(i + 2, n - 1)]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f"C{P(c1, c2)} {f(p2[0])},{f(p2[1])}"
    return d


def wobble_circle(cx, cy, rad, r, n=7, amp=0.13):
    """A closed circle whose radius drifts - a hand-drawn O."""
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        rr = rad * (1 + r.uniform(-amp, amp))
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    d = f"M{f(pts[0][0])},{f(pts[0][1])}"
    for i in range(n):
        p0, p1 = pts[(i - 1) % n], pts[i]
        p2, p3 = pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f"C{P(c1, c2)} {f(p2[0])},{f(p2[1])}"
    return d + "Z"


def petal(cx, cy, ang_deg, length, width, r):
    """One closed teardrop from (cx,cy) pointing at ang_deg."""
    a = math.radians(ang_deg)
    dx, dy = math.cos(a), math.sin(a)
    px, py = -dy, dx
    L = length * (1 + r.uniform(-0.10, 0.10))
    wd = width * (1 + r.uniform(-0.16, 0.16))
    bx, by = cx + r.uniform(-0.7, 0.7), cy + r.uniform(-0.7, 0.7)
    tx = cx + dx * L + r.uniform(-0.9, 0.9)
    ty = cy + dy * L + r.uniform(-0.9, 0.9)
    c1 = (bx + dx * L * 0.28 + px * wd, by + dy * L * 0.28 + py * wd)
    c2 = (tx - dx * L * 0.20 + px * wd * 0.70, ty - dy * L * 0.20 + py * wd * 0.70)
    c3 = (tx - dx * L * 0.20 - px * wd * 0.70, ty - dy * L * 0.20 - py * wd * 0.70)
    c4 = (bx + dx * L * 0.28 - px * wd, by + dy * L * 0.28 - py * wd)
    return (f"M{f(bx)},{f(by)}C{P(c1, c2)} {f(tx)},{f(ty)}"
            f"C{P(c3, c4)} {f(bx)},{f(by)}")


def stem(x0, y0, x1, y1, r, bow=3.0):
    mx = (x0 + x1) / 2 + r.uniform(-bow, bow)
    my = (y0 + y1) / 2 + r.uniform(-bow * 0.4, bow * 0.4)
    return f"M{f(x0)},{f(y0)}Q{f(mx)},{f(my)} {f(x1)},{f(y1)}"


# ---------- the pack -----------------------------------------------------

def s_daisy(r):
    d = [petal(24, 19, -90 + i * 45, 11.5, 4.6, r) for i in range(8)]
    d.append(wobble_circle(24, 19, 3.6, r, 6, 0.15))
    d.append(stem(24, 23, 25, 44, r, 2.5))
    d.append(petal(25, 36, -18, 9.0, 3.4, r))
    return d


def s_tulip(r):
    d = [petal(24, 27, -90, 15.5, 6.4, r),
         petal(24, 27, -120, 13.0, 5.2, r),
         petal(24, 27, -60, 13.0, 5.2, r)]
    d.append(stem(24, 28, 24.5, 45, r, 2.0))
    d.append(petal(24.6, 38, -14, 10.0, 3.2, r))
    d.append(petal(24.2, 34, -166, 10.0, 3.2, r))
    return d


def s_rose(r):
    # A spiral alone reads as a snail; a spiral inside a closed circle reads as
    # a lollipop. Two open outer petals cupping the bud is what reads as a rose.
    spiral = []
    for i in range(20):
        t = i / 19
        a = t * math.pi * 3.1
        rad = 1.6 + t * 7.2
        spiral.append((24 + rad * math.cos(a) + r.uniform(-0.25, 0.25),
                       19 + rad * math.sin(a) * 0.95 + r.uniform(-0.25, 0.25)))
    d = [smooth_open(spiral)]
    d.append(smooth_open([(14.8, 23.0), (12.4, 15.2), (17.8, 9.4), (25.4, 8.2)]))
    d.append(smooth_open([(33.6, 22.4), (36.0, 14.8), (30.8, 9.0), (25.4, 8.2)]))
    d.append(stem(24, 31, 24, 45, r, 2.0))
    d.append(petal(24, 38, -16, 9.5, 3.4, r))
    d.append(petal(24, 41, -164, 8.5, 3.0, r))
    return d

def s_eucalyptus(r):
    d = [stem(11, 43, 37, 8, r, 3.2)]
    for i in range(6):
        t = (i + 1) / 7.0
        x = 11 + (37 - 11) * t
        y = 43 + (8 - 43) * t
        side = 1 if i % 2 == 0 else -1
        d.append(wobble_circle(x + side * 4.8, y + side * 2.4,
                               4.1 - t * 1.0, r, 6, 0.17))
    return d


def s_babysbreath(r):
    # Random scatter turned into a scribble. Four named branch tips with three
    # dots each, placed on a circle, is legible at 48 px and at 24 px.
    d = [stem(24, 45, 24, 17, r, 1.6)]
    tips = [(15.2, 20.5), (32.8, 17.6), (20.2, 29.8), (30.2, 27.2)]
    for i, (bx, by) in enumerate(tips):
        d.append(stem(24, by + 6.5, bx, by, r, 1.0))
        for k in range(3):
            a = math.radians(-90 + k * 120 + i * 17)
            d.append(wobble_circle(bx + 3.4 * math.cos(a), by + 3.4 * math.sin(a),
                                   1.25, r, 5, 0.18))
    return d

def s_leaf(r):
    d = [petal(13, 39, -50, 27, 9.8, r)]
    d.append(smooth_open([(13.6, 38.2), (18, 32), (22.4, 25.4), (26.4, 19.4)]))
    return d

def s_bouquet(r):
    d = [smooth_open([(13.5, 25), (17, 34), (21, 41), (24, 45.5),
                      (27, 41), (31, 34), (34.5, 25)]),
         smooth_open([(13.5, 25), (19, 27.5), (24, 28.5), (29, 27.5), (34.5, 25)])]
    for i, (ax, ay) in enumerate([(17.5, 19), (24, 16), (30.5, 19)]):
        d.append(stem(ax + (24 - ax) * 0.6, 27, ax, ay + 3.5, r, 1.2))
        for k in range(5):
            d.append(petal(ax, ay, -90 + k * 72 + i * 13, 6.2, 2.8, r))
    return d


def s_ribbon(r):
    d = [smooth_open([(24, 24), (15, 16.5), (7.5, 21), (11, 28.5), (20, 27), (24, 24)]),
         smooth_open([(24, 24), (33, 16.5), (40.5, 21), (37, 28.5), (28, 27), (24, 24)]),
         wobble_circle(24, 24, 3.0, r, 6, 0.16),
         smooth_open([(22, 27), (18, 35), (14.5, 42)]),
         smooth_open([(26, 27), (30, 35), (33.5, 42)])]
    return d


def s_arrow(r):
    d = [smooth_open([(6.5, 37.5), (11.5, 22.5), (23.5, 14.5), (35.5, 17.0), (41.0, 25.0)])]
    d.append(smooth_open([(41.0, 25.0), (36.2, 23.2), (31.4, 20.8)]))
    d.append(smooth_open([(41.0, 25.0), (39.2, 30.2), (35.4, 34.6)]))
    return d

def s_star(r):
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rad = (15.8 if i % 2 == 0 else 6.7) * (1 + r.uniform(-0.07, 0.07))
        pts.append((24 + rad * math.cos(a), 24 + rad * math.sin(a)))
    d = f"M{f(pts[0][0])},{f(pts[0][1])}"
    for x, y in pts[1:]:
        d += f"L{f(x)},{f(y)}"
    return [d + "Z"]


def s_heart(r):
    return ["M24,41.5C24,41.5 9.4,31.6 9.4,21.4 9.4,15.2 14.6,11.6 19.2,13.5"
            " 21.7,14.5 23.2,16.8 24,18.9 24.8,16.8 26.3,14.5 28.8,13.5"
            " 33.4,11.6 38.6,15.2 38.6,21.4 38.6,31.6 24,41.5 24,41.5Z"]


def s_sparkle(r):
    return [smooth_open([(24, 6.5), (26.2, 20), (41.5, 24), (26.2, 28),
                         (24, 41.5), (21.8, 28), (6.5, 24), (21.8, 20), (24, 6.5)])]


def s_badge(r):
    return [wobble_circle(24, 24, 19.5, r, 9, 0.055)]


def s_tape(r):
    return [smooth_open([(5, 17), (16, 15.5), (28, 17), (43, 15)]),
            smooth_open([(5, 32), (17, 33.5), (30, 32), (43, 33.5)]),
            "M5,17L5,32", "M43,15L43,33.5"]


PACK = [
    ("st-rose", s_rose, 11),
    ("st-tulip", s_tulip, 24),
    ("st-daisy", s_daisy, 7),
    ("st-eucalyptus", s_eucalyptus, 31),
    ("st-babysbreath", s_babysbreath, 5),
    ("st-leaf", s_leaf, 18),
    ("st-bouquet", s_bouquet, 42),
    ("st-ribbon", s_ribbon, 3),
    ("st-arrow", s_arrow, 9),
    ("st-star", s_star, 15),
    ("st-heart", s_heart, 1),
    ("st-sparkle", s_sparkle, 2),
    ("st-badge", s_badge, 27),
    ("st-tape", s_tape, 6),
]


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    symbols = []
    for name, fn, seed in PACK:
        r = random.Random(seed)
        paths = "".join(f'<path vector-effect="non-scaling-stroke" d="{d}"/>' for d in fn(r))
        symbols.append(
            f'<symbol id="{name}" viewBox="0 0 {BOX} {BOX}">'
            f'<g fill="none" stroke="currentColor"'
            f' stroke-linecap="round" stroke-linejoin="round">{paths}</g></symbol>'
        )

    sprite = ('<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0"'
              ' style="position:absolute;width:0;height:0;overflow:hidden"'
              ' aria-hidden="true" focusable="false">'
              + "".join(symbols) + "</svg>")

    path = os.path.join(OUT_DIR, "stickers.svg")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(sprite)

    with open(os.path.join(OUT_DIR, "stickers.json"), "w", encoding="utf-8") as fh:
        json.dump([n for n, _, _ in PACK], fh, indent=2)

    print(f"wrote {path}")
    print(f"symbols: {len(PACK)}")
    print(f"bytes:   {len(sprite)}")


if __name__ == "__main__":
    main()
