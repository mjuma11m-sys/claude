const { chromium } = require('/home/user/claude/sports-hub-app/node_modules/playwright');
const fs = require('fs'), path = require('path');
const B = '/home/user/claude/sports-hub-app/brand/', F = '/home/user/claude/sports-hub-app/node_modules/@fontsource/tajawal/files/';
const word = fs.readFileSync(B + 'logo-horizontal.svg', 'utf8').match(/<path transform="translate\(([\d.]+) 42\)" d="([^"]+)"/);
const wx = +word[1], wd = word[2]; const wW = +fs.readFileSync(B + 'logo-horizontal.svg', 'utf8').match(/viewBox="0 0 ([\d.]+)/)[1] - wx;
const svg = (n) => fs.readFileSync(B + n, 'utf8').replace('<svg ', '<svg width="100%" height="100%" ');
const html = `<style>
@font-face{font-family:T;font-weight:800;src:url(file://${F}tajawal-arabic-800-normal.woff2);unicode-range:U+0600-06FF,U+FB50-FEFF,U+200C-200F}
@font-face{font-family:T;font-weight:800;src:url(file://${F}tajawal-latin-800-normal.woff2);unicode-range:U+0000-00FF,U+2000-206F}
*{box-sizing:border-box;margin:0}body{width:540px;height:960px;overflow:hidden;background:#05080F;font-family:T;font-weight:800;color:#EAF6FF;position:relative}
#glow{position:absolute;inset:0;background:radial-gradient(circle at 50% 42%,#00e5ff33,#00e5ff0a 45%,transparent 70%)}
.abs{position:absolute}
#mark{left:70px;top:230px;width:400px;height:400px}
#cap{left:0;right:0;text-align:center;font-size:25px;direction:rtl}
#word{left:0;right:0;top:660px;display:flex;justify-content:center}
#tiles{left:0;right:0;top:300px;display:flex;flex-direction:column;align-items:center;gap:26px}
.tile{border-radius:34px;display:flex;align-items:center;justify-content:center}
#bar{left:0;right:0;bottom:60px;text-align:center;font-size:20px;color:#93a7bb;direction:rtl}
#foot{left:0;right:0;bottom:30px;text-align:center;font-size:14px;color:#93a7bb;font-weight:800;direction:rtl}
</style><div id=glow></div>
<svg id=mark class=abs viewBox="0 0 64 64"><circle id=ring cx=32 cy=32 r=19 fill=none stroke="#EAF6FF" stroke-width=4.5 stroke-linecap=butt transform="rotate(-90 32 32)"/>
<g id=nodes></g><g id=ball><circle cx=32 cy=32 r=7.2 fill="#CE1126"/><path d="M32 28.7 L35.1 30.95 L33.9 34.6 L30.1 34.6 L28.9 30.95Z" fill="#05080F"/></g></svg>
<div id=word class=abs><svg width=330 viewBox="0 0 ${wW} 36" ><defs><clipPath id=cp><rect id=cr x=0 y=0 width=0 height=40 /></clipPath></defs><g clip-path="url(#cp)"><path transform="translate(0 30)" d="${wd}" fill="#EAF6FF"/></g></svg></div>
<div id=cap class=abs></div>
<div id=tiles class=abs>
 <div class=tile id=t1 style="width:230px;height:230px;background:#0A1220;overflow:hidden">${svg('icon-full.svg')}</div>
 <div class=tile id=t2 style="width:340px;height:110px;background:#F4F8FB;padding:20px">${svg('logo-horizontal-light.svg')}</div>
 <div class=tile id=t3 style="width:110px;height:110px;background:#00E5FF;color:#05080F;padding:18px">${svg('mark-mono.svg')}</div>
</div>
<div id=bar class=abs></div><div id=foot class=abs></div>
<script>
const N=[[45.43,18.57],[45.43,45.43],[18.57,45.43],[18.57,18.57]];
document.getElementById('nodes').innerHTML=N.map((p,i)=>'<g id=n'+i+' transform="translate('+p+')"><circle r=5.4 fill="#00E5FF" stroke="#05080F" stroke-width=2.6 /></g>').join('');
const $=id=>document.getElementById(id), cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)), seg=(t,a,b)=>cl((t-a)/(b-a));
const ease=x=>1-Math.pow(1-x,3), back=x=>{const c=1.9;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
const C=2*Math.PI*19, wW=${wW};
function caption(t){const c=$('cap');let s='',a=0;
 if(t>=1.4&&t<3.4){s='الحلقة: مركز';a=seg(t,1.4,1.9)*(1-seg(t,3.1,3.4))}
 else if(t>=3.4&&t<5.6){s='والعقد: أندية';a=seg(t,3.4,3.9)*(1-seg(t,5.3,5.6))}
 else if(t>=5.6&&t<7.4){s='والكرة: اللعبة بالمنتصف';a=seg(t,5.6,6.1)*(1-seg(t,7.1,7.4))}
 c.textContent=s;c.style.opacity=a;c.style.transform='translateY('+(1-a)*10+'px)'}
function render(t){
 $('glow').style.opacity=seg(t,0,1);
 const toTiles=seg(t,9.2,10.0), fromTiles=seg(t,13.0,13.6);
 // phase A: build (0-9.2); mark moves up while word reveals
 const up=ease(seg(t,7.6,8.6)); const m=$('mark');
 const sc=1-0.28*up; m.style.transform='translateY('+(-20*up)+'px) scale('+sc+')';
 const ring=$('ring'); ring.style.strokeDasharray=C; ring.style.strokeDashoffset=C*(1-ease(seg(t,0.6,2.4)));
 N.forEach((p,i)=>{const k=back(seg(t,3.4+i*0.35,3.9+i*0.35));$('n'+i).setAttribute('transform','translate('+p+') scale('+Math.max(0,k)+')')});
 const bs=back(seg(t,5.6,6.3)); $('ball').setAttribute('transform','translate(32 '+(32-(1-seg(t,5.6,6.3))*10)+') scale('+Math.max(0,bs)+') translate(-32 -32)');
 $('ball').style.opacity=seg(t,5.6,5.9);
 $('cr').setAttribute('width',wW*ease(seg(t,7.8,9.0)));
 caption(t);
 const vis=1-toTiles; m.style.opacity=vis*(t<13?1:0)+ (t>=13.0?fromTiles:0);
 $('word').style.opacity=vis*(t<13?1:0)+(t>=13.0?fromTiles:0);
 $('word').style.top=(t>=13?640:(660-12*up))+'px';
 // phase B: tiles
 const tt=$('tiles'); tt.style.opacity=toTiles*(1-fromTiles);
 ['t1','t2','t3'].forEach((id,i)=>{const k=ease(seg(t,9.4+i*0.3,10.1+i*0.3));$(id).style.transform='translateY('+(1-k)*40+'px) scale('+(0.92+0.08*k)+')';$(id).style.opacity=k});
 // bar
 const b=$('bar'); b.textContent=(t>=9.2&&t<13)?'الهوية الجديدة · نسخة داكنة، فاتحة، وأحادية':''; b.style.opacity=seg(t,10.2,10.7)*(1-fromTiles);
 const f=$('foot'); f.textContent=t>=13.0?'قيد التطوير · نسخة تجريبية':''; f.style.opacity=fromTiles;
 // ending caption in place of cap
 if(t>=13.0){const c=$('cap');c.textContent='فكرة الشعار: مركز تلتقي عنده الأندية';c.style.top='735px';c.style.opacity=fromTiles;c.style.transform='none'}
 else $('cap').style.top='690px';
}
window.render=render;render(0);
</script>`;
(async () => {
  const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
  await p.setContent(html); await p.evaluate(() => document.fonts.ready);
  const FPS = 30, D = 14.6;
  for (let i = +(process.argv[3]||0); i < FPS * D; i++) { await p.evaluate((t) => render(t), i / FPS); await p.screenshot({ path: path.join(out, 'f' + String(i).padStart(4, '0') + '.png') }); }
  await b.close();
})();
