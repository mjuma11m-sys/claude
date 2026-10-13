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

# --- app icons
def icon_flat(size, rounded, mark_scale):
    """Simple cut for 16/32px: solid bar, no ball patch, no effects."""
    k = size / 512; m = size * mark_scale; off = (size - m) / 2; rx = 112 * k if rounded else 0
    body = (f'<rect width="{size}" height="{size}" rx="{rx}" fill="{C["deep"]}"/>'
            + mark(C["ink"], C["pulse"], C["crimson"], C["night"], False, off, off, m / 64))
    return svg(size, size, body)

def icon_rich(size, rounded, mark_scale, ring=True):
    """Store-grade icon: lit background, centre-circle motif, mark with depth, glowing bar, shaded ball."""
    k = size / 512; m = size * mark_scale; off = (size - m) / 2; rx = 112 * k if rounded else 0
    u = m / 64                                           # one mark unit in px
    X = lambda v: off + v * u                            # mark coords -> icon px
    pent = pentagon(32, 44, 3.3)
    seams = "".join(
        f'<line x1="{32 + 3.3 * math.sin(math.radians(a)):.2f}" y1="{44 - 3.3 * math.cos(math.radians(a)):.2f}" '
        f'x2="{32 + 7.6 * math.sin(math.radians(a)):.2f}" y2="{44 - 7.6 * math.cos(math.radians(a)):.2f}" '
        f'stroke="#6E0816" stroke-opacity=".55" stroke-width=".45" stroke-linecap="round"/>' for a in range(0, 360, 72))
    defs = f"""<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10213A"/><stop offset=".55" stop-color="#08111F"/><stop offset="1" stop-color="#03060C"/></linearGradient>
  <radialGradient id="glow" cx=".5" cy=".42" r=".55"><stop offset="0" stop-color="{C['pulse']}" stop-opacity=".30"/><stop offset=".6" stop-color="{C['pulse']}" stop-opacity=".05"/><stop offset="1" stop-color="{C['pulse']}" stop-opacity="0"/></radialGradient>
  <linearGradient id="post" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="#E4F3FC"/><stop offset="1" stop-color="#A9CDE3"/></linearGradient>
  <linearGradient id="bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8DF6FF"/><stop offset="1" stop-color="#00C2DA"/></linearGradient>
  <radialGradient id="ball" cx=".34" cy=".28" r=".85"><stop offset="0" stop-color="#FF6B79"/><stop offset=".45" stop-color="{C['crimson']}"/><stop offset="1" stop-color="#7E0A19"/></radialGradient>
  <filter id="blur" x="-100%" y="-400%" width="300%" height="900%"><feGaussianBlur stdDeviation="{2.2 * u:.2f}"/></filter>
  <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="{1.4 * u:.2f}"/></filter>
</defs>"""
    ring_el = (f'<circle cx="{size / 2}" cy="{size / 2}" r="{size * .385:.1f}" fill="none" stroke="{C["pulse"]}" stroke-opacity=".13" stroke-width="{size * .008:.2f}"/>') if ring else ""
    body = (defs
        + f'<rect width="{size}" height="{size}" rx="{rx}" fill="url(#bg)"/>'
        + f'<rect width="{size}" height="{size}" rx="{rx}" fill="url(#glow)"/>' + ring_el
        # shadow under the mark
        + f'<g filter="url(#soft)" opacity=".55" transform="translate({X(0)} {X(0) + 1.6 * u}) scale({u})"><rect x="12" y="10" width="10" height="44" rx="3" fill="#000"/><rect x="42" y="10" width="10" height="44" rx="3" fill="#000"/></g>'
        # bar glow, then the mark
        + f'<rect x="{X(22)}" y="{X(22)}" width="{20 * u}" height="{7 * u}" fill="{C["pulse"]}" opacity=".85" filter="url(#blur)"/>'
        + f'<g transform="translate({off} {off}) scale({u})">'
          '<rect x="12" y="10" width="10" height="44" rx="3" fill="url(#post)"/>'
          '<rect x="42" y="10" width="10" height="44" rx="3" fill="url(#post)"/>'
          '<rect x="22" y="22" width="20" height="7" fill="url(#bar)"/>'
          '<rect x="22" y="22" width="20" height="1.4" fill="#FFFFFF" opacity=".55"/>'
          '<circle cx="32" cy="44" r="7.6" fill="url(#ball)"/>'
          f'{seams}<path d="{pent}" fill="{C["night"]}"/>'
          '<ellipse cx="29.3" cy="39.6" rx="2.6" ry="1.5" fill="#fff" opacity=".35" transform="rotate(-30 29.3 39.6)"/>'
          '</g>'
        + (f'<rect x=".5" y=".5" width="{size - 1}" height="{size - 1}" rx="{rx}" fill="none" stroke="#FFFFFF" stroke-opacity=".10"/>' if rounded else ""))
    return svg(size, size, body)

write("icon.svg", icon_rich(512, True, 0.66), ROOT.parent / "public")      # favicon + manifest "any"
write("icon-full.svg", icon_rich(512, False, 0.66))                          # square: apple-touch, store art
write("icon-maskable.svg", icon_rich(512, False, 0.50, ring=False))          # Android masks to circle/squircle: mark inside the safe zone
write("icon-small.svg", icon_flat(512, True, 0.76))                          # 16/32px favicon cut

for name, a, b in [("ink on night", C["ink"], C["night"]), ("pulse on night", C["pulse"], C["night"]),
                   ("crimson on night", C["crimson"], C["night"]), ("light_pulse on white", C["light_pulse"], "#FFFFFF"),
                   ("light_ink on white", C["light_ink"], "#FFFFFF")]:
    print(f"contrast {name:22} {contrast(a, b):5.1f}:1")
print("built", sorted(p.name for p in ROOT.glob("*.svg")))
