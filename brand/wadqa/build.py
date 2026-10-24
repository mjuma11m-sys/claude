"""Regenerates every WADQA logo file from one definition.
   python3 brand/wadqa/build.py   (needs fonttools + brotli and the Tajawal files from sports-hub-app/node_modules)
   then: node brand/wadqa/render.cjs  for PNGs and the board."""
import pathlib
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = pathlib.Path(__file__).resolve().parent
FONTS = ROOT.parents[1] / "sports-hub-app/node_modules/@fontsource/tajawal/files"
C = dict(night="#05080F", ink="#EAF6FF", pulse="#00E5FF", light_ink="#0A1220", light_pulse="#00788A")

def lum(h):
    r, g, b = [int(h[i:i+2], 16) / 255 for i in (1, 3, 5)]
    f = lambda c: c / 12.92 if c <= .03928 else ((c + .055) / 1.055) ** 2.4
    return .2126 * f(r) + .7152 * f(g) + .0722 * f(b)
def contrast(a, b):
    x, y = sorted([lum(a), lum(b)], reverse=True); return (x + .05) / (y + .05)

# the drop: apex up, a centre circle with the spot inside = a drop that aims (precision); no halfway line, it read as a pokeball
DROP = "M32 5 C32 5 11 27 11 40 A21 21 0 0 0 53 40 C53 27 32 5 32 5Z"
def mark(col, sw=4.5, detail=True, ox=0, oy=0, k=1.0):
    t = f' transform="translate({ox} {oy}) scale({k})"' if (ox or oy or k != 1) else ""
    d = ""
    return (f'<g{t}><path d="{DROP}" fill="none" stroke="{col}" stroke-width="{sw}" stroke-linejoin="miter" stroke-miterlimit="8"/>'
            f'{d}<circle cx="32" cy="41" r="{8 if detail else 9}" fill="none" stroke="{col}" stroke-width="{sw*.7 if detail else sw*.8:.2f}"/>'
            f'<circle cx="32" cy="41" r="2.6" fill="{col}"/></g>')

def svg(w, h, body, bg=None, label="WADQA"):
    r = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-label="{label}">{r}{body}</svg>\n'

def glyph_paths(fontfile, names, size, x, y, tracking=0, rtl=False):
    f = TTFont(FONTS / fontfile); gs = f.getGlyphSet(); s = size / f["head"].unitsPerEm
    out, cur = [], x
    for n in names:
        adv = f["hmtx"][n][0] * s
        if rtl: cur -= adv
        pen = SVGPathPen(gs); gs[n].draw(TransformPen(pen, (s, 0, 0, -s, cur, y)))
        out.append(pen.getCommands())
        cur = cur if rtl else cur + adv + tracking
    return " ".join(out), cur

def latin(text, size, x, y, tracking):
    f = TTFont(FONTS / "tajawal-latin-800-normal.woff2"); cm = f.getBestCmap()
    return glyph_paths("tajawal-latin-800-normal.woff2", [cm[ord(c)] for c in text], size, x, y, tracking)

AR = ["uni0648", "uni062F", "uniFED7", "uniFE94"]  # و د ق(initial) ة(final): shaped by hand, no harfbuzz needed

def lockup(ink, pulse, bg, ar=False):
    if ar:   # RTL: mark on the right, Arabic word large, WADQA small beneath
        d, left = glyph_paths("tajawal-arabic-800-normal.woff2", AR, 64, 232, 56, rtl=True)
        l, _ = latin("WADQA", 15, left + 4, 80, 6)
        return svg(340, 96, mark(pulse, 4.5, True, 252, 8, 1.2) + f'<path d="{d}" fill="{ink}"/>'
                   f'<path d="{l}" fill="{pulse}" transform="translate(0 0)"/>', bg, "ودقة WADQA")
    d, _ = latin("WADQA", 44, 96, 62, 7)
    return svg(340, 96, mark(pulse, 4.5, True, 8, 8, 1.2) + f'<path d="{d}" fill="{ink}"/>', bg, "WADQA")

def write(name, s): (ROOT / name).write_text(s)

write("mark.svg", svg(64, 64, mark(C["pulse"])))
write("mark-light.svg", svg(64, 64, mark(C["light_pulse"])))
write("mark-mono.svg", svg(64, 64, mark("currentColor")))
write("mark-small.svg", svg(64, 64, mark(C["pulse"], 6.5, False)))
write("logo-horizontal.svg", lockup(C["ink"], C["pulse"], None))
write("logo-horizontal-light.svg", lockup(C["light_ink"], C["light_pulse"], None))
write("logo-arabic.svg", lockup(C["ink"], C["pulse"], None, ar=True))
write("logo-arabic-light.svg", lockup(C["light_ink"], C["light_pulse"], None, ar=True))
write("icon-512.svg", svg(512, 512, mark(C["pulse"], 4.5, True, 96, 90, 5.0), C["night"]))
write("icon-maskable-512.svg", svg(512, 512, mark(C["pulse"], 4.5, True, 128, 118, 4.0), C["night"]))

for a, b, need in [(C["pulse"], C["night"], 7), (C["ink"], C["night"], 7), (C["light_pulse"], "#FFFFFF", 4.5), (C["light_ink"], "#FFFFFF", 7)]:
    r = contrast(a, b); print(f"{a} on {b}: {r:.1f}:1", "OK" if r >= need else "FAIL")
