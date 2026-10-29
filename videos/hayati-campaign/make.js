// مواد حملة «حياتي»: بوستر QR (ستوري + A4) وكاروسيل 5 شرائح — node make.js
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const path = require('path');
const F = 'file://' + __dirname + '/';
const CSS = `
@font-face{font-family:P;src:url(${F}IBMPlexSansArabic-Bold.ttf);font-weight:700}
@font-face{font-family:P;src:url(${F}IBMPlexSansArabic-Regular.ttf);font-weight:400}
*{box-sizing:border-box}
body{margin:0;font-family:P,'Helvetica Neue',Arial,sans-serif;color:#E8DCC4;background:radial-gradient(120% 75% at 50% 38%,#145a62 0%,#0E3B43 42%,#0A1A1E 100%);overflow:hidden;direction:rtl}
.c{color:#FF6B4A}.ltr{direction:ltr;unicode-bidi:embed}
.pill{display:inline-block;padding:10px 26px;border-radius:999px;background:rgba(255,107,74,.16);border:2px solid rgba(255,107,74,.5)}
.demo{position:absolute;left:0;right:0;bottom:26px;text-align:center;font-size:26px;opacity:.7}
.brand{display:flex;align-items:center;gap:14px;font-weight:700}
.brand img{border-radius:22%}
.phone{border-radius:70px;background:#0b1416;padding:14px;box-shadow:0 50px 100px -40px rgba(0,0,0,.8),inset 0 0 0 3px #2a4a50}
.phone div{border-radius:58px;overflow:hidden;background:#F7F4EE;height:100%}
.phone img{width:100%;display:block}`;

const poster = (w, h, big) => `<html><style>${CSS}
body{width:${w}px;height:${h}px;display:flex;flex-direction:column;align-items:center;text-align:center;padding:${big ? 90 : 120}px 70px 0}
.brand{font-size:${big ? 64 : 70}px}.brand img{width:${big ? 110 : 120}px}
h1{font-size:${big ? 120 : 130}px;line-height:1.15;margin:${big ? 40 : 70}px 0 20px}
.sub{font-size:${big ? 44 : 50}px;opacity:.9;margin-bottom:${big ? 40 : 60}px}
.list{font-size:${big ? 44 : 48}px;line-height:1.75;margin-bottom:${big ? 46 : 70}px}
.qr{background:#fff;border-radius:40px;padding:26px;width:${big ? 420 : 470}px}
.qr img{width:100%;display:block}
.scan{font-size:${big ? 46 : 50}px;font-weight:700;margin-top:30px}
.and{font-size:${big ? 32 : 36}px;opacity:.8;margin-top:22px}
</style><body>
<div class="brand"><img src="${F}icon.png">حياتي</div>
<h1>يومك كله<br><span class="c">بتطبيق واحد</span></h1>
<div class="sub">تطبيق بحريني مجاني للطلاب والموظفين</div>
<div class="list">💸 مصاريفك ورسالة البنك<br>📚 جدولك الجامعي من PDF<br>🕌 أوقات الصلاة والزكاة (تقدير)<br>🍲 166 وصفة حلال</div>
<div class="qr"><img src="${F}qr.svg"></div>
<div class="scan">📱 امسح وحمّله من App Store</div>
<div class="and">أندرويد قريباً 👀 · بدون إعلانات · بياناتك على جهازك</div>
</body></html>`;

const SLIDES = [
  { h: '5 أشياء يسويها<br><span class="c">حياتي</span> بدقيقة 👇', s: 'تطبيق بحريني مجاني', cover: true },
  { n: 1, h: 'الصق <span class="c">رسالة البنك</span>', s: 'المبلغ والمحل ينقرون لحالهم، وتراجعها قبل ما تنضاف', img: 'bank' },
  { n: 2, h: 'جدولك الجامعي <span class="c">من PDF</span>', s: 'ارفعه، والمواد تنضاف بأيامها ووقتها', img: 'timetable' },
  { n: 3, h: 'كم <span class="c">باقي</span> من راتبك؟', s: 'كم تقدر تصرف باليوم لين آخر الشهر', img: 'money' },
  { n: 4, h: 'كل <span class="c">اشتراكاتك</span> بمكان', s: 'Netflix والنادي وغيرها، وتذكير قبل التجديد', img: 'subs' },
  { n: 5, h: '166 <span class="c">وصفة حلال</span>', s: 'والمقادير والسعرات تتغير حسب عدد الأشخاص', img: 'kitchen' },
  { end: true },
];
const slide = (x) => `<html><style>${CSS}
body{width:1080px;height:1350px}
.top{position:absolute;top:56px;right:64px;left:64px;display:flex;justify-content:space-between;align-items:center}
.brand{font-size:40px}.brand img{width:66px}
.num{font-size:34px;opacity:.75}
h1{position:absolute;top:150px;left:60px;right:60px;margin:0;text-align:center;font-size:84px;line-height:1.2}
.s{position:absolute;top:${x.cover ? 600 : 270}px;left:80px;right:80px;text-align:center;font-size:42px;opacity:.9}
.phone{position:absolute;left:50%;top:380px;width:470px;height:1020px;margin-left:-235px}
.cov{position:absolute;top:720px;left:0;right:0;text-align:center;font-size:40px}
.swipe{position:absolute;bottom:90px;left:0;right:0;text-align:center;font-size:44px;font-weight:700}
.end{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center}
.end img.i{width:200px;border-radius:44px}
.end h2{font-size:110px;margin:30px 0 10px}
.end p{font-size:44px;margin:6px 0}
.end .qr{background:#fff;border-radius:30px;padding:18px;width:300px;margin-top:30px}
.end .qr img{width:100%;display:block}
</style><body>
${x.end ? `<div class="end"><img class="i" src="${F}icon.png"><h2>حياتي</h2><p>مجاني على <b class="c">App Store</b></p><p style="opacity:.8">الرابط بالبايو · أندرويد قريباً 👀</p><div class="qr"><img src="${F}qr.svg"></div></div>` : `
<div class="top"><div class="brand"><img src="${F}icon.png">حياتي</div><div class="num">${x.n ? x.n + ' / 5' : ''}</div></div>
<h1 style="${x.cover ? 'top:300px;font-size:110px' : ''}">${x.h}</h1>
<div class="s">${x.s}</div>
${x.img ? `<div class="phone"><div><img src="${F}${x.img}.png"></div></div>` : ''}
${x.cover ? '<div class="cov"><span class="pill">💸 · 📚 · 🕌 · 🍲</span></div><div class="swipe">← اسحب</div>' : ''}`}
${x.img ? '<div class="demo">* لقطات ببيانات تجريبية</div>' : ''}
</body></html>`;

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const fs = require('fs');
  const shot = async (html, w, h, out) => { const p = await b.newPage({ viewport: { width: w, height: h } }); const tmp = path.join(__dirname, '.tmp.html'); fs.writeFileSync(tmp, html); await p.goto('file://' + tmp); await p.waitForLoadState('load'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300); await p.screenshot({ path: path.join(__dirname, out), type: 'png' }); await p.close(); };
  await shot(poster(1080, 1920, false), 1080, 1920, 'poster-story.png');
  await shot(poster(1240, 1754, true), 1240, 1754, 'poster-a4.png');   // A4 بدقة 150 dpi
  for (let i = 0; i < SLIDES.length; i++) await shot(slide(SLIDES[i]), 1080, 1350, `carousel-${i + 1}.png`);
  await b.close();
  fs.unlinkSync(path.join(__dirname, '.tmp.html'));
})();
