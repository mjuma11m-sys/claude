"""Regenerates every logo/icon file in brand/ and public/ from one definition.
   python3 brand/build.py   (needs: pip install fonttools brotli; then node brand/render.cjs for PNGs)"""
import math, pathlib
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = pathlib.Path(__file__).resolve().parent
FONT = ROOT.parent / "node_modules/@fontsource/tajawal/files/tajawal-latin-800-normal.woff2"

C = dict(night="#05080F", deep="#0A1220", ink="#EAF6FF", pulse="#00E5FF", crimson="#CE1126",
         light_ink="#0A1220", light_pulse="#00788A")  # light_* = the same marks on white paper

def lum(h):
    r, g, b = [int(h[i:i+2], 16) / 255 for i in (1, 3, 5)]
    f = lambda c: c / 12.92 if c <= .03928 else ((c + .055) / 1.055) ** 2.4
    return .2126 * f(r) + .7152 * f(g) + .0722 * f(b)
def contrast(a, b):
    x, y = sorted([lum(a), lum(b)], reverse=True); return (x + .05) / (y + .05)

def pentagon(cx, cy, r):
    p = [(cx + r * math.sin(math.radians(a)), cy - r * math.cos(math.radians(a))) for a in range(0, 360, 72)]
    return "M" + " L".join(f"{x:.2f} {y:.2f}" for x, y in p) + "Z"

def mark(posts, bar, ball, patch, detail=True, ox=0, oy=0, k=1.0):
    """The mark in a 64x64 box. detail=False is the small-size cut: thicker bar, no ball patch."""
    bar_h, ball_r = (8, 8) if not detail else (7, 7.5)
    inner = (f'<rect x="12" y="10" width="10" height="44" rx="3" fill="{posts}"/>'
             f'<rect x="42" y="10" width="10" height="44" rx="3" fill="{posts}"/>'
             f'<rect x="22" y="{22 if detail else 21.5}" width="20" height="{bar_h}" fill="{bar}"/>'
             f'<circle cx="32" cy="43" r="{ball_r}" fill="{ball}"/>')
    if detail: inner += f'<path d="{pentagon(32, 43, 3.4)}" fill="{patch}"/>'
    return f'<g transform="translate({ox} {oy}) scale({k})">{inner}</g>'

def text_path(text, size, tracking_em, x0=0, base=0):
    f = TTFont(FONT); gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f["head"].unitsPerEm
    s = size / upm; x = x0; out = []
    for ch in text:
        g = cmap[ord(ch)]; pen = SVGPathPen(gs)
        gs[g].draw(TransformPen(pen, (s, 0, 0, -s, x, base))); out.append(pen.getCommands())
        x += gs[g].width * s + tracking_em * size
    return " ".join(out), x - tracking_em * size - x0

def svg(w, h, body, label="Sports Hub", bg=None):
    r = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-label="{label}">{r}{body}</svg>\n'

def write(name, content, where=ROOT): (where / name).write_text(content)

# --- marks
write("mark.svg", svg(64, 64, mark(C["ink"], C["pulse"], C["crimson"], C["night"])))
write("mark-small.svg", svg(64, 64, mark(C["ink"], C["pulse"], C["crimson"], C["night"], detail=False)))
mono = (f'<path fill="currentColor" fill-rule="evenodd" d="M15 10h4a3 3 0 0 1 3 3v38a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3zM45 10h4a3 3 0 0 1 3 3v38a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3zM22 22h20v7H22zM32 35.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15z{pentagon(32, 43, 3.4)}"/>')
write("mark-mono.svg", svg(64, 64, mono))

# --- horizontal lockup: mark + SPORTS HUB (outlined, Tajawal ExtraBold, +10% tracking)
def lockup(posts, bar, ball, patch, word, bg=None):
    d, tw = text_path("SPORTS HUB", 30, 0.10, base=0)
    h, gap = 64, 18
    body = (mark(posts, bar, ball, patch) +
            f'<path transform="translate({64 + gap} 42)" d="{d}" fill="{word}"/>')
    return svg(round(64 + gap + tw), h, body, bg=bg)
write("logo-horizontal.svg", lockup(C["ink"], C["pulse"], C["crimson"], C["night"], C["ink"]))
write("logo-horizontal-light.svg", lockup(C["light_ink"], C["light_pulse"], C["crimson"], "#FFFFFF", C["light_ink"]))

# --- app icons: dark squircle with a soft pulse glow; mark sits inside the 80% safe zone
def icon(size, rounded, mark_scale, detail=True):
    k = size / 512; m = size * mark_scale; off = (size - m) / 2   # m = mark box in px
    rx = 112 * k if rounded else 0
    defs = (f'<defs><radialGradient id="g" cx=".5" cy=".0" r="1"><stop offset="0" stop-color="{C["pulse"]}" stop-opacity=".22"/>'
            f'<stop offset=".7" stop-color="{C["pulse"]}" stop-opacity="0"/></radialGradient>'
            f'<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{C["deep"]}"/><stop offset="1" stop-color="{C["night"]}"/></linearGradient></defs>')
    body = (defs + f'<rect width="{size}" height="{size}" rx="{rx}" fill="url(#b)"/>'
            f'<rect width="{size}" height="{size}" rx="{rx}" fill="url(#g)"/>'
            + mark(C["ink"], C["pulse"], C["crimson"], C["night"], detail, off, off, m / 64))
    return svg(size, size, body)
write("icon.svg", icon(512, True, 0.62), ROOT.parent / "public")            # favicon + manifest "any"
write("icon-full.svg", icon(512, False, 0.62))                               # square: apple-touch, store art
write("icon-maskable.svg", icon(512, False, 0.46))                           # Android masks to circle/squircle: keep the mark inside 40%
write("icon-small.svg", icon(512, True, 0.74, detail=False))                 # 16/32px favicon cut

for name, a, b in [("ink on night", C["ink"], C["night"]), ("pulse on night", C["pulse"], C["night"]),
                   ("crimson on night", C["crimson"], C["night"]), ("light_pulse on white", C["light_pulse"], "#FFFFFF"),
                   ("light_ink on white", C["light_ink"], "#FFFFFF")]:
    print(f"contrast {name:22} {contrast(a, b):5.1f}:1")
print("built", sorted(p.name for p in ROOT.glob("*.svg")))
