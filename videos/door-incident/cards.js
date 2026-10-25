const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const A = p => 'file://' + path.join(__dirname, 'assets', p);
const css = `
@font-face{font-family:P;src:url(${A('IBMPlexSansArabic-Bold.ttf')});font-weight:700}
@font-face{font-family:P;src:url(${A('IBMPlexSansArabic-Regular.ttf')});font-weight:400}
*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;font-family:P;direction:rtl}
.cap{position:absolute;left:70px;right:70px;bottom:230px;padding:36px 44px;border-radius:30px;background:rgba(0,0,0,.62);color:#f5ecd9;font-size:58px;line-height:1.55;font-weight:700;text-align:center;border:1px solid rgba(232,190,110,.35)}
.gold{color:#e8be6e}
.title{background:#050403;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px;text-align:center}
.title h1{margin:0;font-size:190px;color:#e8be6e;font-weight:700;letter-spacing:0;text-shadow:0 0 60px rgba(232,190,110,.35)}
.title p{margin:0;font-size:54px;color:#cfc4ac;font-weight:400}
.line{width:260px;height:3px;background:#e8be6e;opacity:.7}
.nar{background:#07060a;overflow:hidden}
.nar .bg{position:absolute;inset:-60px;background:url(${A('narrator-sheet.jpg')}) -190px -60px/auto 2400px;filter:blur(40px) brightness(.12)}
.nar .p{position:absolute;left:70px;top:140px;width:940px;height:1280px;border-radius:36px;border:2px solid rgba(232,190,110,.4);background:url(${A('narrator-sheet.jpg')});background-size:auto 1480px;background-position:-170px -90px;box-shadow:0 0 80px rgba(0,0,0,.8)}
.end{background:#050403;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:50px;text-align:center;padding:0 90px}
.end h2{margin:0;font-size:84px;line-height:1.5;color:#e8be6e}
.end p{margin:0;font-size:46px;line-height:1.7;color:#cfc4ac;font-weight:400}
`;
const caps = {
  c2: 'قبل أن نبدأ: ما يُعرض هنا <span class="gold">رواية</span> منسوبة لمصادرها، وليس حكماً على أحد',
  c3: 'المدينة المنورة، بعد وفاة النبي <span class="gold">صلى الله عليه وآله</span>',
  c4: 'تذكر المصادر الشيعية أن بيت <span class="gold">السيدة الزهراء عليها السلام</span> حوصر',
  c5: 'وأنها كانت <span class="gold">خلف الباب</span>',
  c6: 'وتروي أن جمعاً من الناس جاؤوا إلى البيت',
  c7: 'وتروي أن الباب <span class="gold">دُفع</span> وهي وراءه',
  c8: 'وتذكر أنها أُصيبت، ويُحيي الشيعة ذكرى ذلك حزناً كل عام',
};
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const shot = async (html, out, transparent) => {
    fs.writeFileSync('assets/_t.html',`<meta charset=utf-8><style>${css}</style>${html}`); await p.goto('file://'+path.join(__dirname,'assets/_t.html')); await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: `assets/${out}.png`, omitBackground: !!transparent });
  };
  await shot(`<div class="title" style="width:1080px;height:1920px"><div class="line"></div><h1>حادثة الباب</h1><div class="line"></div><p>رواية من المصادر الشيعية</p></div>`, 'title');
  await shot(`<div class="nar" style="width:1080px;height:1920px"><div class="bg"></div><div class="p"></div></div>`, 'narrator');
  await shot(`<div class="end" style="width:1080px;height:1920px"><div class="line"></div><h2>هذه رواية المصادر الشيعية<br>وهي محل خلاف بين المذاهب</h2><p>تُراجَع المصادر الأصلية قبل النقل<br>لقطات الفيديو رسوم رمزية ومولّدة بالذكاء الاصطناعي<br>بلا تمثيل لوجوه أهل البيت أو الصحابة</p><div class="line"></div></div>`, 'end');
  for (const [k, v] of Object.entries(caps)) {
    fs.writeFileSync('assets/_t.html',`<meta charset=utf-8><style>${css}html,body{background:transparent}</style><div class="cap">${v}</div>`); await p.goto('file://'+path.join(__dirname,'assets/_t.html')); await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: `assets/${k}.png`, omitBackground: true });
  }
  await b.close(); console.log('ok');
})();
