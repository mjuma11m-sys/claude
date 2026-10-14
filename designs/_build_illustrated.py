import math, random
random.seed(7)
def branch(x0,y0,x1,y1,bend,n,col1,col2,size=26,flip=1):
    # quadratic curve stem with leaves along it
    cx=(x0+x1)/2+bend; cy=(y0+y1)/2-bend*0.4
    out=[f'<path d="M{x0} {y0} Q{cx} {cy} {x1} {y1}" stroke="#8a6a2a" stroke-width="3" fill="none" stroke-linecap="round"/>']
    for i in range(1,n+1):
        t=i/(n+1)
        x=(1-t)**2*x0+2*(1-t)*t*cx+t*t*x1; y=(1-t)**2*y0+2*(1-t)*t*cy+t*t*y1
        dx=2*(1-t)*(cx-x0)+2*t*(x1-cx); dy=2*(1-t)*(cy-y0)+2*t*(y1-cy)
        a=math.degrees(math.atan2(dy,dx))
        for side in (-1,1):
            ang=a+side*(48+random.randint(-8,8))
            s=size*(0.8+0.4*random.random())
            col=col1 if (i+side)%2 else col2
            out.append(f'<g transform="translate({x:.1f} {y:.1f}) rotate({ang:.1f})"><path d="M0 0C{s*.3:.1f} {-s*.45:.1f} {s*.8:.1f} {-s*.45:.1f} {s:.1f} 0C{s*.8:.1f} {s*.45:.1f} {s*.3:.1f} {s*.45:.1f} 0 0Z" fill="{col}" opacity=".9"/><path d="M0 0L{s*.85:.1f} 0" stroke="rgba(255,255,255,.45)" stroke-width="1.2"/></g>')
    # end flower
    out.append(f'<g transform="translate({x1} {y1})">'+''.join(f'<ellipse rx="7" ry="14" cy="-12" fill="#f2a98a" opacity=".92" transform="rotate({k*72})"/>' for k in range(5))+'<circle r="6" fill="#e9c15f"/></g>')
    return ''.join(out)

def lantern(x,y,sc=1):
    return f'''<g transform="translate({x} {y}) scale({sc})">
<path d="M0 -150V-20" stroke="#b8892f" stroke-width="2.5"/>
<circle cx="0" cy="-22" r="7" fill="#e9c15f"/>
<path d="M-30 -14H30L22 4H-22Z" fill="url(#gold)"/>
<path d="M-34 4H34L44 70Q0 92 -44 70Z" fill="url(#teal)" opacity=".95"/>
<path d="M-34 4L-44 70M34 4L44 70M0 4V82M-17 4L-22 78M17 4L22 78" stroke="#e9c15f" stroke-width="2.2" fill="none"/>
<path d="M-44 70Q0 92 44 70L30 96H-30Z" fill="url(#gold)"/>
<path d="M0 96V116" stroke="#b8892f" stroke-width="3"/><circle cy="122" r="7" fill="#e9c15f"/>
<ellipse cx="0" cy="40" rx="14" ry="22" fill="#fff3c4" opacity=".55"/></g>'''

def arches(x0,x1,y0,y1,n,fill,stroke):
    w=(x1-x0)/n; o=[]
    for i in range(n):
        a=x0+i*w+w*.18; b=x0+(i+1)*w-w*.18; m=(a+b)/2
        o.append(f'<path d="M{a:.1f} {y1}V{y0+22}Q{a:.1f} {y0+6} {m:.1f} {y0}Q{b:.1f} {y0+6} {b:.1f} {y0+22}V{y1}Z" fill="{fill}" stroke="{stroke}" stroke-width="2"/>')
    return ''.join(o)

def minaret(x):
    return f'''<g transform="translate({x} 0)">
<rect x="-17" y="215" width="34" height="290" fill="url(#cream)"/>
<rect x="-17" y="215" width="12" height="290" fill="rgba(180,140,90,.18)"/>
<rect x="-27" y="270" width="54" height="12" rx="3" fill="url(#gold)"/>
<rect x="-23" y="330" width="46" height="10" rx="3" fill="url(#gold)"/>
<path d="M-17 215C-17 180 -8 160 0 128C8 160 17 180 17 215Z" fill="url(#teal)"/>
<path d="M0 128V108" stroke="#b8892f" stroke-width="3"/><circle cy="104" r="5" fill="#e9c15f"/>
<path d="M-6 300v22a6 6 0 0 0 12 0v-22a6 6 0 0 0 -12 0z" fill="#7bb8b0" opacity=".7"/>
</g>'''

ill=f'''
<svg class="ill" viewBox="0 0 1080 640" xmlns="http://www.w3.org/2000/svg">
<defs>
 <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".4" stop-color="#e2b24f"/><stop offset=".75" stop-color="#b8862b"/><stop offset="1" stop-color="#f1d37f"/></linearGradient>
 <linearGradient id="teal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2fc9b6"/><stop offset="1" stop-color="#0a7a72"/></linearGradient>
 <linearGradient id="cream" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#f3e3c4"/></linearGradient>
 <radialGradient id="sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe2a8" stop-opacity=".9"/><stop offset=".6" stop-color="#f6b494" stop-opacity=".45"/><stop offset="1" stop-color="#f6b494" stop-opacity="0"/></radialGradient>
 <filter id="paint" x="-5%" y="-5%" width="110%" height="110%">
  <feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="3" seed="4" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="7"/>
 </filter>
 <filter id="blur"><feGaussianBlur stdDeviation="18"/></filter>
 <filter id="soft"><feGaussianBlur stdDeviation="6"/></filter>
</defs>
<!-- sky washes -->
<ellipse cx="540" cy="300" rx="470" ry="280" fill="url(#sun)"/>
<g filter="url(#blur)" opacity=".75">
 <ellipse cx="190" cy="130" rx="150" ry="75" fill="#7fd6c9"/><ellipse cx="890" cy="140" rx="150" ry="75" fill="#7fd6c9"/>
 <ellipse cx="540" cy="470" rx="420" ry="60" fill="#f6b494"/>
</g>
<g filter="url(#soft)" fill="#fff" opacity=".85">
 <ellipse cx="170" cy="330" rx="110" ry="22"/><ellipse cx="230" cy="312" rx="70" ry="22"/>
 <ellipse cx="900" cy="300" rx="120" ry="22"/><ellipse cx="840" cy="283" rx="64" ry="20"/>
</g>
<g filter="url(#paint)">
 <!-- ground wash -->
 <g filter="url(#soft)"><path d="M120 508Q540 478 960 508V545H120Z" fill="#cfeee8" opacity=".7"/></g>
 <!-- minarets -->
 {minaret(230)}{minaret(850)}
 <!-- main hall -->
 <rect x="285" y="372" width="510" height="134" fill="url(#cream)"/>
 <rect x="285" y="372" width="510" height="14" fill="url(#gold)"/>
 <rect x="285" y="372" width="60" height="134" fill="rgba(180,140,90,.14)"/>
 {arches(300,780,410,505,7,'#f4b392','#c99a3b')}
 <!-- side domes -->
 <g><path d="M325 372C325 336 345 320 365 304C385 320 405 336 405 372Z" fill="url(#gold)"/><path d="M365 304V290" stroke="#b8892f" stroke-width="3"/><circle cx="365" cy="286" r="5" fill="#e9c15f"/></g>
 <g><path d="M675 372C675 336 695 320 715 304C735 320 755 336 755 372Z" fill="url(#gold)"/><path d="M715 304V290" stroke="#b8892f" stroke-width="3"/><circle cx="715" cy="286" r="5" fill="#e9c15f"/></g>
 <!-- drum -->
 <rect x="410" y="322" width="260" height="50" fill="url(#teal)"/>
 <g stroke="#e9c15f" stroke-width="2" fill="#bff1e9">
  {''.join(f'<path d="M{x} 366v-22a8 8 0 0 1 16 0v22z"/>' for x in range(424,660,34))}
 </g>
 <!-- main dome -->
 <path d="M410 322C410 220 465 160 540 112C615 160 670 220 670 322Z" fill="url(#gold)"/>
 <path d="M540 112C500 160 484 240 484 322" stroke="rgba(255,255,255,.5)" stroke-width="5" fill="none"/>
 <path d="M540 112C580 160 596 240 596 322" stroke="rgba(120,80,10,.35)" stroke-width="4" fill="none"/>
 <path d="M540 112V322" stroke="rgba(120,80,10,.25)" stroke-width="3"/>
 <path d="M540 112V70" stroke="#b8892f" stroke-width="4"/>
 <circle cx="540" cy="60" r="9" fill="#e9c15f"/>
 <path d="M548 36a22 22 0 1 0 0 40a17 17 0 1 1 0-40z" fill="url(#gold)" transform="translate(-8 -18) scale(.9)"/>
</g>
<!-- branches -->
<g filter="url(#paint)">
 {branch(90,590,430,545,-40,9,'#1fae9f','#0d7f78',24)}
 {branch(990,590,650,545,40,9,'#1fae9f','#0d7f78',24)}
</g>
<!-- sparkles -->
<g fill="#e9c15f">
 <path d="M300 120l5 14 14 5-14 5-5 14-5-14-14-5 14-5z"/><path d="M780 90l4 11 11 4-11 4-4 11-4-11-11-4 11-4z"/>
 <path d="M660 210l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/><path d="M420 190l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/>
</g>
{lantern(110,0,1)}{lantern(970,0,1)}
</svg>'''

css='''
:root{--teal:#0d7f78;--gold:#b8862b}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1920px;background:#fbf6e8}
.card{position:relative;width:1080px;height:1920px;overflow:hidden;font-family:'Amiri',serif;color:var(--teal);
 background:
  radial-gradient(ellipse 700px 500px at 50% 22%,rgba(246,180,148,.30),transparent 70%),
  radial-gradient(ellipse 600px 600px at 0% 100%,rgba(47,201,182,.18),transparent 70%),
  radial-gradient(ellipse 600px 600px at 100% 100%,rgba(233,193,95,.22),transparent 70%),
  #fbf6e8}
.grain{position:absolute;inset:0;opacity:.35;mix-blend-mode:multiply;pointer-events:none}
.frame{position:absolute;inset:40px;border:2px solid #d6b061;border-radius:30px}
.frame::before{content:"";position:absolute;inset:10px;border:1px dashed rgba(214,176,97,.75);border-radius:22px}
.ill{position:absolute;left:0;top:22px;width:1080px;height:640px}
.title{position:absolute;top:468px;left:0;right:0;text-align:center;padding:20px 0 60px;
 font-family:'Aref Ruqaa',serif;font-weight:700;font-size:250px;line-height:1.5;
 background:linear-gradient(180deg,#38d0be,#12a396 55%,#0b7f76);-webkit-background-clip:text;background-clip:text;color:transparent;
 filter:drop-shadow(6px 7px 0 rgba(214,170,80,.6)) drop-shadow(0 10px 20px rgba(13,127,120,.2))}
.salam{position:absolute;top:860px;left:60px;right:60px;text-align:center;font-weight:700;font-size:50px;color:var(--gold)}
.intro{position:absolute;top:955px;left:90px;right:90px;text-align:center;font-size:40px;line-height:1.8}
.hl{display:inline-block;padding:0 40px 8px;font-family:'Aref Ruqaa',serif;font-size:72px;line-height:1.3;color:#c99a3b}
.dua{position:absolute;top:1235px;left:80px;right:80px;text-align:center;font-size:38px;line-height:1.85}
.dua b{color:var(--gold)}
.dua .mid{color:#d6b061;font-size:24px;margin:6px 0}
.foot{position:absolute;left:90px;right:90px;bottom:120px;text-align:center}
.when{margin-top:20px;font-weight:700;font-size:54px;line-height:1.4;color:var(--teal)}
.where{margin-top:8px;font-size:40px;color:var(--teal)}
.where span,.when i{color:var(--gold);font-style:normal}
svg.orn{width:340px;height:24px;display:block;margin:0 auto}
.sprig{position:absolute;width:260px}
'''
orn='<svg class="orn" viewBox="0 0 420 30" fill="none" stroke="#d6b061" stroke-width="2" stroke-linecap="round"><path d="M0 15H170M250 15H420"/><path d="M210 2l13 13-13 13-13-13z" fill="#d6b061" stroke="none"/><circle cx="180" cy="15" r="3" fill="#d6b061" stroke="none"/><circle cx="240" cy="15" r="3" fill="#d6b061" stroke="none"/></svg>'
grain='<svg class="grain" width="1080" height="1920"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .45  0 0 0 0 .3  0 0 0 .5 0"/></filter><rect width="100%" height="100%" filter="url(#g)"/></svg>'
html=f'''<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>دعوة</title>
<link href="https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@700&family=Amiri:wght@400;700&display=swap" rel="stylesheet">
<style>{css}</style></head><body><div class="card">
<div class="frame"></div>{ill}
<div class="title">يا زينب</div>
<div class="salam">السَّلامُ عَلَيْكِ يا بِنْتَ سَيِّدِ الأَوْصِيَاءِ</div>
<div class="intro">الحمد لله حمداً لمن أغرقنا بلطفه و غمرنا بخيره و بركاته<br>بفضل من الله و كرمه انتقلنا إلى<br><span class="hl">منزلنا الجديد</span></div>
<div class="dua"><div>اللهم اجعله منزلاً عامراً بذكر الله و أهل البيت<br>مباركاً ببركة <b>محمد و آل محمد عليهم السلام</b></div><div class="mid">✦</div><div>و نسأل الله تعالى أن تكون بركة ميلاد <b>السيدة زينب</b><br>حاضرة في منزلنا و محيطة بعائلتنا</div></div>
<div class="foot">{orn}<div class="when">ليلة الأحد <i>·</i> السابعة و النصف مساءً</div><div class="where">منزل <span>٣٣٨٨</span> <i>·</i> طريق <span>٣٢٤٠</span> <i>·</i> مجمع <span>١٠٣٢</span></div></div>
{grain}</div></body></html>'''
open('card_art.html','w').write(html)
