// ستوريات أبرز القصص «حياتي» — node build.js → out/*.jpg (1080×1920)
// مرقّمة بترتيب النشر: إنستقرام يحط آخر هايلايت انضاف له أول، فننشر «الجديد» آخر شي
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const path = require('path'), fs = require('fs');
const U = (p) => 'file://' + path.resolve(__dirname, p);
const SH = '../../hayati-share/shots/', RAW = '../../../hayati-app/store/raw/';
const ICON = fs.readFileSync(path.resolve(__dirname, '../../../hayati-app/brand/icon-square.svg'), 'utf8');
const S = [
  // [ملف، هايلايت، عنوان، سطر، صورة، ملاحظة]
  ['01-اقتراحاتكم-1', 'اقتراحاتكم 💬', 'وش الميزة <b>اللي تبيها؟</b>', 'حط ملصق «أسئلة» هني، وكل اقتراح ينقرا', null, 'ask'],
  ['02-اقتراحاتكم-2', 'اقتراحاتكم 💬', 'وش تنساه <b>أكثر؟</b>', 'حط ملصق «تصويت» هني: الاختبارات · الاشتراكات · الصلاة', null, 'poll'],
  ['03-الميزات-1', 'الميزات ✨', 'يومك <b>بشاشة وحدة</b>', 'المحاضرات، الصلاة، المهام، ومصروف اليوم', RAW + '01_today.png'],
  ['04-الميزات-2', 'الميزات ✨', 'مصاريفك <b>وميزانيتك</b>', '«تقدير» لوين بتوصل آخر الشهر', RAW + '02_money.png'],
  ['05-الميزات-3', 'الميزات ✨', 'كم صرفت <b>على كوستا؟</b>', 'اكتب اسم المحل، ويطلع لك المجموع', RAW + '03_search.png'],
  ['06-الميزات-4', 'الميزات ✨', 'جدولك <b>الأسبوعي</b>', 'محاضرة، تمرين، أو دوام', RAW + '04_schedule.png'],
  ['07-الجديد-1', 'الجديد 🆕', 'شارك رسالة البنك <b>لحياتي</b>', 'اضغط مطوّل ← مشاركة ← حياتي ← «إضافة»', SH + 'shared.png', null, 'على أندرويد · نسخة أندرويد قيد التجربة'],
  ['08-الجديد-2', 'الجديد 🆕', '<b>انضافت</b> ✓', 'وما نقرا رسايلك: أنت اللي تشارك', SH + 'added.png'],
];
const css = `@font-face{font-family:P;src:url(${U('../IBMPlexSansArabic-Bold.ttf')});font-weight:700}@font-face{font-family:P;src:url(${U('../IBMPlexSansArabic-Regular.ttf')});font-weight:400}
*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;overflow:hidden;font-family:P;font-weight:700;color:#E8DCC4}
.bg{position:absolute;inset:0;background:radial-gradient(110% 70% at 50% 30%,#155c64 0%,#0E3B43 45%,#0A1A1E 100%)}
.chip{position:absolute;top:260px;left:0;right:0;text-align:center}.chip span{display:inline-block;padding:12px 34px;border-radius:999px;background:rgba(232,220,196,.12);font:400 36px P}
h1{position:absolute;top:350px;left:60px;right:60px;margin:0;text-align:center;font-size:96px;line-height:1.12}h1 b{color:#FF6B4A}
p{position:absolute;top:580px;left:90px;right:90px;margin:0;text-align:center;font:400 44px/1.45 P;color:rgba(232,220,196,.85)}
.ph{position:absolute;left:290px;top:770px;width:500px;height:900px;border-radius:64px;background:#0b1416;padding:12px;box-shadow:0 50px 90px -40px rgba(0,0,0,.7),inset 0 0 0 3px #2a4a50;overflow:hidden}
.ph img{width:100%;height:100%;object-fit:cover;object-position:top;border-radius:52px;display:block}
.fade{position:absolute;left:290px;width:500px;top:1520px;height:150px;border-radius:0 0 64px 64px;background:linear-gradient(transparent,rgba(10,26,30,.92))}
.tag{position:absolute;top:690px;z-index:2;left:0;right:0;text-align:center}.tag span{display:inline-block;padding:8px 24px;border-radius:999px;background:#FF6B4A;color:#2A0E07;font:400 30px P}
.demo{position:absolute;top:1700px;left:0;right:0;text-align:center;font:400 30px P;color:rgba(232,220,196,.7)}
.h{position:absolute;top:1755px;left:0;right:0;text-align:center;font:400 32px P;direction:ltr}
.box{position:absolute;left:150px;right:150px;top:780px;height:560px;border:4px dashed rgba(232,220,196,.35);border-radius:48px;display:grid;place-items:center;text-align:center;font:400 40px/1.5 P;color:rgba(232,220,196,.6)}
.logo{position:absolute;left:465px;top:1450px;width:150px;height:150px;border-radius:36px;overflow:hidden}.logo svg{width:100%;height:100%}`;
const page = ([, hl, h, sub, img, sticker, tag]) => `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>${css}</style></head><body><div class="bg"></div>
<div class="chip"><span>${hl}</span></div><h1>${h}</h1><p>${sub}</p>
${img ? `<div class="ph"><img src="${U(img)}"></div><div class="fade"></div>` : `<div class="box">${sticker === 'poll' ? 'ملصق التصويت هني 👆' : 'ملصق «اسألني» هني 👆'}</div><div class="logo">${ICON}</div>`}
${tag ? `<div class="tag"><span>${tag}</span></div>` : ''}
${img ? '<div class="demo">* لقطات ببيانات تجريبية · قيد التطوير</div>' : '<div class="demo">قيد التطوير · نسخة تجريبية</div>'}<div class="h">@hayati.bh</div></body></html>`;
(async () => {
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const tmp = path.join(__dirname, '.tmp.html');
  for (const s of S) {
    fs.writeFileSync(tmp, page(s)); await p.goto('file://' + tmp, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(__dirname, 'out', s[0] + '.jpg'), type: 'jpeg', quality: 92 });
  }
  fs.unlinkSync(tmp); await b.close(); console.log(S.length);
})();
