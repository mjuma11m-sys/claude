"""Zainab birth-anniversary tag: SVG art (mm units) -> A4 imposition HTML (print/cut) -> PDF via headless Chromium."""
import math, subprocess, sys, pathlib
HW, HH = 35.0, 40.5          # finished half-size (70 x 81 mm)
BLEED = 3.0
GOLD, GOLD2, TEAL, PINK, SHADOW, PAPER = "#E6CF8A", "#EFE0AE", "#8FCDC1", "#F0A3A3", "#6E6E6E", "#F8F6F1"

def lerp(a, b, t): return (a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t)

def outline(sx=1.0):
    V = [(0, -HH-3.5), (HW+3.5, 0), (0, HH+3.5), (-HW-3.5, 0)]
    cuts = [0, .13, .43, .73, 1.0]
    bulge = [-1.2, 4.6, 4.6, -1.2]
    d = f"M{V[0][0]*sx:.3f},{V[0][1]*sx:.3f} "
    for i in range(4):
        P, Q = V[i], V[(i+1) % 4]
        dx, dy = Q[0]-P[0], Q[1]-P[1]
        L = math.hypot(dx, dy); nx, ny = dy/L, -dx/L      # outward normal (clockwise path)
        for k in range(4):
            a, b = lerp(P, Q, cuts[k]), lerp(P, Q, cuts[k+1])
            h = bulge[k]*1.33
            sd = (b[0]-a[0], b[1]-a[1])
            c1 = (a[0]+sd[0]*.05+nx*h, a[1]+sd[1]*.05+ny*h)
            c2 = (b[0]-sd[0]*.05+nx*h, b[1]-sd[1]*.05+ny*h)
            f = lambda p: f"{p[0]*sx:.3f},{p[1]*sx:.3f}"
            d += f"C{f(c1)} {f(c2)} {f(b)} "
    return d + "Z"

def spiral(cx, cy, r, turns=2.2, flip=1, rot=0):
    pts = []
    n = 60
    for i in range(n+1):
        t = i/n; ang = rot + flip*t*turns*2*math.pi; rad = r*(1-0.92*t)
        pts.append((cx+rad*math.cos(ang), cy+rad*math.sin(ang)))
    return "M" + " L".join(f"{x:.2f},{y:.2f}" for x, y in pts)

def quadrant():
    s = ""
    for (x, y, r, fl, rot) in [(13, -27, 4.6, 1, 0), (24, -15.5, 4.2, -1, 1.2), (9, -15, 3.2, -1, 3), (27, -4, 3.4, 1, 2), (17, -21, 2.4, 1, 4), (5, -32, 2.6, 1, 2)]:
        s += f'<path d="{spiral(x,y,r,flip=fl,rot=rot)}"/>'
    s += '<path d="M3,-24 C9,-23 12,-19 16,-15 S25,-9 30,-8"/><path d="M6,-37 C12,-34 17,-33 22,-27 S29,-22 31,-14"/>'
    for (x, y) in [(18, -29), (28, -22), (10, -21), (21, -9), (31, -3), (4, -28)]:
        s += f'<ellipse cx="{x}" cy="{y}" rx="1.2" ry=".6" transform="rotate(35 {x} {y})"/>'
    return s

def flower(x, y, rot):
    petals = "".join(f'<ellipse cx="0" cy="-2.1" rx="1.15" ry="2" transform="rotate({a})" fill="{PINK}" stroke="#C86E7A" stroke-width=".18"/>' for a in (-60, -30, 0, 30, 60))
    leaves = f'<path d="M-.2,1.2 C-3.6,.8 -4.8,2.6 -5,3.8 C-3,3.8 -.8,3.2 -.2,1.2Z M.2,1.2 C3.6,.8 4.8,2.6 5,3.8 C3,3.8 .8,3.2 .2,1.2Z" fill="{TEAL}" stroke="#5FA79B" stroke-width=".18"/>'
    return f'<g transform="translate({x} {y}) rotate({rot})">{leaves}{petals}<circle r=".7" fill="#C86E7A"/></g>'

TEXT = [("سَمَّاهَا", -9.6, 14.5), ("الرَّحْمَنُ", 5.2, 14.5), ("زَيْنَبَ", 20.0, 16.5)]
DOTS = [(-18, -19, 1.1), (19, -17, 1.0), (-21, 9, 1.0), (20, 8, 1.1), (15, 27, 1.2), (-12.5, 27.5, 1.3), (-8.8, 27.8, 1.3), (22, -3, .8)]

def tag_defs():
    o = outline(); oi = outline(.9); oi2 = outline(.86)
    return f'''
<clipPath id="shape"><path d="{o}"/></clipPath>
<g id="art">
  <path d="{o}" fill="{PAPER}" stroke="{PAPER}" stroke-width="{BLEED*2}" stroke-linejoin="round"/>
  <g clip-path="url(#shape)" fill="none" stroke="{GOLD}" stroke-opacity=".55" stroke-width=".22" stroke-linecap="round">
    <g>{quadrant()}</g><g transform="scale(-1 1)">{quadrant()}</g>
    <g transform="scale(1 -1)">{quadrant()}</g><g transform="scale(-1 -1)">{quadrant()}</g>
  </g>
  <path d="{o}" fill="none" stroke="#7A7A7A" stroke-width="1.0" transform="translate(.45 .55)" stroke-linejoin="round" opacity=".55"/>
  <path d="{o}" fill="none" stroke="{GOLD}" stroke-width="1.0" stroke-linejoin="round"/>
  <path d="{oi}" fill="none" stroke="{GOLD}" stroke-width=".32" stroke-linejoin="round"/>
  <path d="{oi2}" fill="none" stroke="{GOLD2}" stroke-width=".18" stroke-linejoin="round"/>
  {flower(0,-33,0)}{flower(0,33,180)}{flower(-27.5,0,-90)}{flower(27.5,0,90)}
  <g font-family="KatibehAr" font-size="1" text-anchor="middle">
    {"".join(f'<text x="0.55" y="{y+.75}" font-size="{fs}" fill="{SHADOW}" stroke="{SHADOW}" stroke-width=".55" stroke-linejoin="round">{t}</text>' for t,y,fs in TEXT)}
    {"".join(f'<text x="0" y="{y}" font-size="{fs}" fill="{TEAL}" stroke="{TEAL}" stroke-width=".55" stroke-linejoin="round">{t}</text>' for t,y,fs in TEXT)}
  </g>
  {"".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{PINK}"/>' for x,y,r in DOTS)}
</g>
<path id="cut" d="{o}" fill="none"/>'''

def svg_single(cut=False):
    w, h = 2*(HW+3.5+BLEED), 2*(HH+3.5+BLEED)
    body = f'<use href="#cut" stroke="#FF00FF" stroke-width=".25"/>' if cut else '<use href="#art"/>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{w}mm" height="{h}mm" viewBox="{-w/2} {-h/2} {w} {h}"><defs>{tag_defs()}</defs>{body}</svg>'

def sheet_html(cut):
    CW, CH = 2*(HW+3.5)+2*BLEED+2, 2*(HH+3.5)+2*BLEED+2   # cell incl. 2mm gutter
    cols, rows = 2, 3
    ox, oy = (210-cols*CW)/2, (297-rows*CH)/2
    uses, marks = "", ""
    for r in range(rows):
        for c in range(cols):
            cx, cy = ox+CW*(c+.5), oy+CH*(r+.5)
            uses += f'<use href="#{"cut" if cut else "art"}" x="{cx:.3f}" y="{cy:.3f}"' + (' stroke="#FF00FF" stroke-width=".25"' if cut else '') + '/>'
    if not cut:   # crop-style registration ticks outside the outermost tags
        for c in range(cols):
            x = ox+CW*(c+.5)
            for y0, y1 in [(4, 9), (288, 293)]:
                marks += f'<path d="M{x},{y0} V{y1}" stroke="#000" stroke-width=".15"/>'
        for r in range(rows):
            y = oy+CH*(r+.5)
            for x0, x1 in [(4, 9), (201, 206)]:
                marks += f'<path d="M{x0},{y} H{x1}" stroke="#000" stroke-width=".15"/>'
    font = pathlib.Path("fonts/katibeh-arabic-400-normal.woff2").resolve()
    return f'''<!doctype html><meta charset="utf-8"><style>
@font-face{{font-family:KatibehAr;src:url("file://{font}")}}
@page{{size:210mm 297mm;margin:0}}html,body{{margin:0;padding:0;background:#fff}}svg{{display:block}}</style>
<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297"><defs>{tag_defs()}</defs>{uses}{marks}</svg>'''

def pdf(html_path, out):
    chrome = next(pathlib.Path("/opt/pw-browsers").glob("chromium-*/chrome-linux*/chrome"))
    subprocess.run([str(chrome), "--headless=new", "--no-sandbox", "--disable-gpu", "--allow-file-access-from-files", "--no-pdf-header-footer", f"--print-to-pdf={out}", f"file://{html_path.resolve()}"], check=True, capture_output=True)

if __name__ == "__main__":
    out = pathlib.Path("out"); out.mkdir(exist_ok=True)
    for name, cut in (("print_A4_x6", False), ("cutline_A4_x6", True)):
        h = out / f"zainab-tag_{name}.html"; h.write_text(sheet_html(cut)); pdf(h, out / f"zainab-tag_{name}.pdf"); h.unlink()
    (out / "zainab-tag_single_art.svg").write_text(svg_single())
    h = out / "single.html"
    font = pathlib.Path("fonts/katibeh-arabic-400-normal.woff2").resolve()
    h.write_text(f'<!doctype html><style>@font-face{{font-family:KatibehAr;src:url("file://{font}")}}@page{{size:84mm 95mm;margin:0}}body{{margin:0}}</style>{svg_single()}')
    pdf(h, out / "zainab-tag_single.pdf"); h.unlink()
