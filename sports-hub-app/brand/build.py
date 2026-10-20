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

NODES = [(45.43, 18.57), (45.43, 45.43), (18.57, 45.43), (18.57, 18.57)]   # four clubs on the centre circle (45, 135, 225, 315 deg); three read as a trefoil warning sign
def mark(ring, node, ball, patch, detail=True, ox=0, oy=0, k=1.0):
    """The mark in a 64x64 box: a hub. Centre circle of a pitch, four club nodes on it, the ball in the middle.
    detail=False is the small-size cut: thicker ring, bigger nodes, no ball patch."""
    sw, nr, br = (4.5, 5.4, 7.2) if detail else (6, 7, 8.5)
    inner = f'<circle cx="32" cy="32" r="19" fill="none" stroke="{ring}" stroke-width="{sw}"/>'
    inner += "".join(f'<circle cx="{x}" cy="{y}" r="{nr}" fill="{node}" stroke="{patch}" stroke-width="2.6"/>' for x, y in NODES)
    inner += f'<circle cx="32" cy="32" r="{br}" fill="{ball}"/>'
    if detail: inner += f'<path d="{pentagon(32, 32, 3.3)}" fill="{patch}"/>'
    return f'<g transform="translate({ox} {oy}) scale({k})">{inner}</g>'

def text_path(text, size, tracking_em, x0=0, base=0):
    f = TTFont(FONT); gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f["head"].unitsPerEm
    s = size / upm; x = x0; out = []
    for ch in text:
        g = cmap[ord(ch)]; pen = SVGPathPen(gs)
        gs[g].draw(TransformPen(pen, (s, 0, 0, -s, x, base))); out.append(pen.getCommands())
        x += gs[g].width * s + tracking_em * size
    return " ".join(out), x - tracking_em * size - x0

def svg(w, h, body, label="WADQA Hub", bg=None):
    r = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" aria-label="{label}">{r}{body}</svg>\n'

def write(name, content, where=ROOT): (where / name).write_text(content)

# --- marks
write("mark.svg", svg(64, 64, mark(C["ink"], C["pulse"], C["crimson"], C["night"])))
write("mark-small.svg", svg(64, 64, mark(C["ink"], C["pulse"], C["crimson"], C["night"], detail=False)))
cuts = "".join(f'<circle cx="{x}" cy="{y}" r="8" fill="#000"/>' for x, y in NODES)
mono = ('<defs><mask id="m"><rect width="64" height="64" fill="#fff"/>' + cuts + '</mask></defs>'
        '<circle cx="32" cy="32" r="19" fill="none" stroke="currentColor" stroke-width="4.5" mask="url(#m)"/>'
        + "".join(f'<circle cx="{x}" cy="{y}" r="5.4" fill="currentColor"/>' for x, y in NODES)
        + f'<path fill="currentColor" fill-rule="evenodd" d="M32 24.8a7.2 7.2 0 1 0 0 14.4 7.2 7.2 0 0 0 0-14.4z{pentagon(32, 32, 3.3)}"/>')
write("mark-mono.svg", svg(64, 64, mono))

# --- horizontal lockup: mark + WADQA HUB (outlined, Tajawal ExtraBold, +10% tracking)
def lockup(posts, bar, ball, patch, word, bg=None):
    d, tw = text_path("WADQA HUB", 30, 0.10, base=0)
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
    """Store-grade icon: lit night background, soft glow behind the hub, shaded ball, glowing nodes."""
    k = size / 512; m = size * mark_scale; off = (size - m) / 2; rx = 112 * k if rounded else 0
    u = m / 64
    pent = pentagon(32, 32, 3.3)
    defs = f"""<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10213A"/><stop offset=".55" stop-color="#08111F"/><stop offset="1" stop-color="#03060C"/></linearGradient>
  <radialGradient id="glow" cx=".5" cy=".5" r=".55"><stop offset="0" stop-color="{C['pulse']}" stop-opacity=".28"/><stop offset=".6" stop-color="{C['pulse']}" stop-opacity=".05"/><stop offset="1" stop-color="{C['pulse']}" stop-opacity="0"/></radialGradient>
  <linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#A9CDE3"/></linearGradient>
  <radialGradient id="ng" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#8DF6FF"/><stop offset="1" stop-color="#00C2DA"/></radialGradient>
  <radialGradient id="ball" cx=".34" cy=".28" r=".85"><stop offset="0" stop-color="#FF6B79"/><stop offset=".45" stop-color="{C['crimson']}"/><stop offset="1" stop-color="#7E0A19"/></radialGradient>
  <filter id="blur" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="2.4"/></filter>
</defs>"""
    nodes = "".join(f'<circle cx="{x}" cy="{y}" r="5.4" fill="url(#ng)" stroke="#08111F" stroke-width="2.6"/>' for x, y in NODES)
    halo = "".join(f'<circle cx="{x}" cy="{y}" r="6" fill="{C["pulse"]}" opacity=".7" filter="url(#blur)"/>' for x, y in NODES)
    body = (defs + f'<rect width="{size}" height="{size}" rx="{rx}" fill="url(#bg)"/>'
        + f'<rect width="{size}" height="{size}" rx="{rx}" fill="url(#glow)"/>'
        + f'<g transform="translate({off} {off}) scale({u})">{halo}'
          '<circle cx="32" cy="32" r="19" fill="none" stroke="url(#rg)" stroke-width="4.5"/>' + nodes
        + '<circle cx="32" cy="32" r="7.2" fill="url(#ball)"/>'
          f'<path d="{pent}" fill="#08111F"/><ellipse cx="29.6" cy="28.6" rx="2.4" ry="1.4" fill="#fff" opacity=".35" transform="rotate(-30 29.6 28.6)"/></g>'
        + (f'<rect x=".5" y=".5" width="{size - 1}" height="{size - 1}" rx="{rx}" fill="none" stroke="#FFFFFF" stroke-opacity=".10"/>' if rounded else ""))
    return svg(size, size, body)

write("icon.svg", icon_rich(512, True, 0.70), ROOT.parent / "public")      # favicon + manifest "any"
write("icon-full.svg", icon_rich(512, False, 0.70))                          # square: apple-touch, store art
write("icon-maskable.svg", icon_rich(512, False, 0.50, ring=False))          # Android masks to circle/squircle: mark inside the safe zone
write("icon-small.svg", icon_flat(512, True, 0.76))                          # 16/32px favicon cut

for name, a, b in [("ink on night", C["ink"], C["night"]), ("pulse on night", C["pulse"], C["night"]),
                   ("crimson on night", C["crimson"], C["night"]), ("light_pulse on white", C["light_pulse"], "#FFFFFF"),
                   ("light_ink on white", C["light_ink"], "#FFFFFF")]:
    print(f"contrast {name:22} {contrast(a, b):5.1f}:1")
print("built", sorted(p.name for p in ROOT.glob("*.svg")))
