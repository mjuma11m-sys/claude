// الكفر (المهم داخل مربع 1:1 بالنص) + ستوري «جديد بحياتي» — 1080×1920
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const fs = require('fs'), path = require('path');
const U = (f) => 'file://' + path.join(__dirname, f);
const css = `@font-face{font-family:P;src:url(${U('IBMPlexSansArabic-Bold.ttf')});font-weight:700}@font-face{font-family:P;src:url(${U('IBMPlexSansArabic-Regular.ttf')});font-weight:400}
*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;overflow:hidden;font-family:P;font-weight:700;color:#E8DCC4;direction:rtl;background:radial-gradient(110% 70% at 50% 35%,#155c64 0%,#0E3B43 45%,#0A1A1E 100%)}
.a{position:absolute;left:0;right:0;text-align:center}.c{color:#FF6B4A}
.days{display:flex;justify-content:center;gap:20px;direction:ltr}.days span{width:104px;height:104px;border-radius:50%;display:grid;place-items:center;font-size:46px;background:rgba(232,220,196,.1)}.days span.on{background:#FF6B4A;color:#2A0E07;transform:scale(1.18)}
.pill{display:inline-block;padding:14px 36px;border-radius:999px;background:rgba(232,220,196,.12);border:2px solid rgba(232,220,196,.25);font:400 36px P}
.ph{position:absolute;width:300px;height:650px;border-radius:44px;background:#0b1416;padding:9px;box-shadow:0 40px 70px -30px #000c,inset 0 0 0 2px #2a4a50;overflow:hidden}.ph img{width:100%;height:100%;object-fit:cover;object-position:top;border-radius:36px;display:block}
.lab{position:absolute;width:300px;text-align:center;font-size:36px}`;
const days = '<div class="days">' + [22, 23, 24, 25, 26, 27, 28].map((d) => '<span' + (d === 25 ? ' class="on"' : '') + '>' + d + '</span>').join('') + '</div>';
const PAGES = {
  'cover.jpg': `<div class="a" style="top:470px;font:400 46px P;opacity:.8">جديد بـ «حياتي»</div>
<div class="a" style="top:560px;font-size:132px;line-height:1.1">من <span class="c">راتب</span><br>لراتب</div>
<div class="a" style="top:900px">${days}</div>
<div class="a" style="top:1090px;font:400 50px/1.5 P">وين راح راتبك؟ · الزكاة والخُمس</div>
<div class="a" style="top:1260px"><span class="pill">قيد التطوير · نسخة تجريبية</span></div>`,
  'story.jpg': `<div class="a" style="top:270px;font:400 44px P;opacity:.85">جديد بالنسخة التجريبية ✨</div>
<div class="a" style="top:340px;font-size:96px;line-height:1.12">من <span class="c">راتب</span> لراتب</div>
${[['2-money', 'يوم الراتب', 45], ['4-summary', 'وين راح راتبك؟', 390], ['5-zakat', 'الزكاة والخُمس', 735]].map(([s, l, x], i) =>
  `<div class="ph" style="left:${x}px;top:${560 + (i === 1 ? -30 : 20)}px"><img src="${U('shots/' + s + '.png')}"></div><div class="lab" style="left:${x}px;top:${1250 + (i === 1 ? -30 : 20)}px">${l}</div>`).join('')}
<div class="a" style="top:1360px"><span class="pill">قيد التطوير · نسخة تجريبية</span></div>
<div class="a" style="top:1450px;font:400 40px P">تبي تجربه؟ أرسل <span class="c">«حياتي»</span> بالخاص</div>
<div class="a" style="top:1530px;font:400 30px P;opacity:.7">* لقطات ببيانات تجريبية · الزكاة والخُمس تقدير مو فتوى</div>`,
};
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const tmp = path.join(__dirname, '.tmp.html');
  for (const [f, body] of Object.entries(PAGES)) {
    fs.writeFileSync(tmp, `<!doctype html><meta charset=utf-8><style>${css}</style>${body}`);
    await p.goto('file://' + tmp, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(__dirname, f), type: 'jpeg', quality: 92 });
  }
  fs.unlinkSync(tmp); await b.close();
})();
