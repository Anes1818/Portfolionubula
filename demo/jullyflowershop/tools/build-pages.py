#!/usr/bin/env python3
"""Petal Press - tiny include resolver.  *.src.html -> *.html

Why this exists instead of shipping an external SVG sprite:

  An external reference like <use href="assets/ink/stickers.svg#st-rose">
  does NOT inherit CSS from the host page, so `currentColor` resolves against
  the sprite file's own (empty) context. Every sticker would come out black
  and seasons.js could never recolour anything.

  Inlining the sprite once per page keeps currentColor working, removes an
  HTTP request, and costs ~3 KB gzipped.

Directives:
  <!--@include path -->   paste the whole file
  <!--@inner   path -->   paste only the inside of the root <svg>, minus <title>
"""

import os
import re
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))


def inner_svg(text):
    open_tag_end = text.index(">", text.index("<svg")) + 1
    body = text[open_tag_end:text.rindex("</svg>")]
    body = re.sub(r"<title.*?</title>", "", body, flags=re.S)
    return body.strip()


def build(src_path):
    with open(src_path, encoding="utf-8") as fh:
        html = fh.read()

    def repl(match):
        kind, rel = match.group(1), match.group(2).strip()
        target = os.path.join(ROOT, rel)
        with open(target, encoding="utf-8") as fh:
            raw = fh.read()
        return inner_svg(raw) if kind == "inner" else raw.strip()

    html, n = re.subn(r"<!--@(include|inner)\s+([^>]+?)-->", repl, html)
    out_path = src_path.replace(".src.html", ".html")
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write(html)
    print(f"{os.path.basename(out_path):<22} {len(html):>7} bytes  ({n} includes)")
    return out_path


def main():
    names = sys.argv[1:]
    if not names:
        names = sorted(f for f in os.listdir(ROOT) if f.endswith(".src.html"))
    if not names:
        print("no *.src.html found")
        return
    for name in names:
        build(os.path.join(ROOT, name))


if __name__ == "__main__":
    main()
