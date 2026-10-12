// أغلفة تيك توك «حياتي»: 9 أغلفة 1080×1920 + معاينة شبكة البروفايل
//   node build.js → cover-01…09.jpg + grid-preview.jpg
// تيك توك يقص الغلاف 3:4 بالشبكة (y 240–1680)، فكل الكلام بين 300 و 1560، وتحت يسار فاضي لعدد المشاهدات.
// الشطرنج: الفردي غامق والزوجي فاتح، فالشبكة (3 أعمدة) تظل شطرنج مع أي فيديو جديد.
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const D = __dirname, V = path.join(D, '../..');
const FONT = path.join(D, '../series');
const img = (p) => 'file://' + path.join(V, p);

// لقطة الديوانية من الفيديو نفسه (لوحة الجلسة بس)
const DIW = path.join(D, 'src/diwaniya-panel.png');
if (!fs.existsSync(DIW)) {
  fs.mkdirSync(path.join(D, 'src'), { recursive: true });
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', '12', '-i', path.join(D, '../tiktok-diwaniya.mp4'), '-frames:v', '1', '-vf', 'crop=640:1140:150:400', DIW]);
}

// الهوك = نفس الجملة اللي بأول الفيديو بالحرف
const COVERS = [
  { file: 'tiktok-promo.mp4', tag: 'حياتي', hook: 'كم صرفت على<br><b>كوستا؟</b>', size: 150, shot: 'hayati-promo-v2/shots/03_search.png' },
  { file: 'series/ep1.mp4', ep: 1, hook: 'كم صرفت على<br><b>محل واحد؟</b>', size: 150, shot: 'hayati-tiktok/series/shots/01_search.png' },
  { file: 'series/ep2.mp4', ep: 2, hook: 'حذفت شي<br><b>بالغلط؟</b>', size: 180, shot: 'hayati-tiktok/series/shots/02_undo.png' },
  { file: 'tiktok-diwaniya.mp4', tag: 'الديوانية 🏛️', hook: 'قبل كل ميزة:<br><b>جلسة نقاش</b>', sub: 'بالذكاء الاصطناعي', size: 160, shot: 'hayati-tiktok/covers/src/diwaniya-panel.png', panel: true, real: true },
  { file: 'series/ep3.mp4', ep: 3, hook: 'بتتعدى<br><b>الميزانية؟</b>', size: 180, shot: 'hayati-tiktok/series/shots/03_money.png' },
  { file: 'tiktok-bank-sms.mp4', tag: 'حياتي', hook: 'الصق رسالة البنك…<br><b>وتنسجل</b>', size: 108, shot: 'hayati-reel-sms/shots/03_masked.png' },
  { file: 'series/ep4.mp4', ep: 4, hook: 'تتمرن قوي اليوم<br><b>أو ترتاح؟</b>', size: 132, shot: 'hayati-tiktok/series/shots/04_today.png' },
  { file: 'series/ep5.mp4', ep: 5, hook: 'رقم بطاقتك<br><b>ينحفظ؟</b>', size: 176, shot: 'hayati-tiktok/series/shots/05_masked.png' },
  { file: 'series/ep6.mp4', ep: 6, hook: 'التطبيق لي<br><b>بس؟</b>', size: 180, shot: 'hayati-tiktok/series/shots/06_welcome.png' },
];
const MARK = '<path d="M 383.3 172.7 A 160 160 0 1 1 300 102.2" fill="none" stroke="currentColor" stroke-opacity=".28" stroke-width="22" stroke-linecap="round"/><path d="M 304 166 L 196 166 L 264 222 C 204 222 168 254 168 292 C 168 336 206 360 256 360 C 292 360 318 348 338 332" fill="none" stroke="currentColor" stroke-width="38" stroke-linecap="round" stroke-linejoin="round"/><circle cx="352" cy="128" r="30" fill="#FF6B4A"/>';

function page(c, i) {
  const dark = i % 2 === 0;
  const fg = dark ? '#E8DCC4' : '#0E3B43', acc = dark ? '#FF6B4A' : '#E0502C';
  const tag = c.ep ? `أبني «حياتي» قدامكم · <span style="color:${acc}">الحلقة ${c.ep}</span>` : c.tag;
  const tilt = i % 2 === 0 ? -4 : 4;
  return `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>
@font-face{font-family:P;src:url(file://${FONT}/IBMPlexSansArabic-Bold.ttf);font-weight:700}
@font-face{font-family:P;src:url(file://${FONT}/IBMPlexSansArabic-Regular.ttf);font-weight:400}
*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;overflow:hidden;font-family:P;font-weight:700;color:${fg}}
.bg{position:absolute;inset:0;background:${dark ? 'radial-gradient(110% 70% at 50% 40%,#155c64 0%,#0E3B43 45%,#0A1A1E 100%)' : 'radial-gradient(120% 70% at 50% 35%,#FFFFFF 0%,#F7F4EE 50%,#ECE5D8 100%)'}}
.grain{position:absolute;inset:0;opacity:${dark ? .05 : .035};background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.tag{position:absolute;left:50%;top:318px;transform:translateX(-50%);display:flex;align-items:center;gap:18px;white-space:nowrap;padding:14px 34px 14px 26px;border-radius:999px;font-size:44px;background:${dark ? 'rgba(232,220,196,.1)' : 'rgba(14,59,67,.07)'};border:2px solid ${dark ? 'rgba(232,220,196,.2)' : 'rgba(14,59,67,.14)'}}
.tag svg{width:58px;height:58px;color:${fg}}
.hook{position:absolute;left:40px;right:40px;top:440px;text-align:center;line-height:1.12;font-size:${c.size}px;letter-spacing:-1px}
.hook b{color:${acc}}
.sub{font-size:64px;margin-top:10px;font-weight:700;opacity:.9}
.phone{position:absolute;left:50%;top:${c.sub ? 960 : 900}px;width:560px;height:1212px;margin-left:-280px;transform:rotate(${tilt}deg);border-radius:86px;background:#0b1416;padding:16px;box-shadow:0 -30px 90px -30px rgba(0,0,0,${dark ? .7 : .35}),inset 0 0 0 3px #2a4a50}
.phone img{width:100%;height:100%;border-radius:72px;object-fit:cover;object-position:top;display:block}
.panel{position:absolute;left:50%;top:960px;width:600px;margin-left:-300px;transform:rotate(${tilt}deg);border-radius:40px;overflow:hidden;box-shadow:0 30px 90px -30px rgba(0,0,0,.8),0 0 0 3px rgba(232,220,196,.18)}
.panel img{width:100%;display:block}
.demo{position:absolute;right:56px;top:1586px;font-size:28px;font-weight:400;padding:8px 18px;border-radius:12px;background:${dark ? 'rgba(10,26,30,.82)' : 'rgba(255,255,255,.9)'};color:${fg}}
</style></head><body><div class="bg"></div>
<div class="tag"><svg viewBox="0 0 512 512">${MARK}</svg><span>${tag}</span></div>
<div class="hook">${c.hook}${c.sub ? `<div class="sub">${c.sub}</div>` : ''}</div>
${c.panel ? `<div class="panel"><img src="${img(c.shot)}"></div>` : `<div class="phone"><img src="${img(c.shot)}"></div>`}
<div class="demo">${c.real ? 'جلسة حقيقية' : '* لقطات ببيانات تجريبية'} · قيد التطوير</div>
<div class="grain"></div></body></html>`;
}

// file:// للصور يشتغل بس لو الصفحة نفسها ملف
const TMP = path.join(D, 'src/_page.html');
async function show(p, html) { fs.writeFileSync(TMP, html); await p.goto('file://' + TMP, { waitUntil: 'load' }); }

(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  for (let i = 0; i < COVERS.length; i++) {
    await show(p, page(COVERS[i], i));
    await p.evaluate(() => document.fonts.ready);
    const f = path.join(D, `cover-${String(i + 1).padStart(2, '0')}.jpg`);
    await p.screenshot({ path: f, type: 'jpeg', quality: 90 });
    console.log(f);
  }
  // معاينة البروفايل: الأحدث فوق يمين (واجهة عربي)، كل غلاف مقصوص 3:4
  const cells = COVERS.map((_, i) => i).reverse().map((i) => `<div style="aspect-ratio:3/4;background:url(file://${D}/cover-${String(i + 1).padStart(2, '0')}.jpg) center/100% auto no-repeat;position:relative"><span style="position:absolute;left:10px;bottom:8px;color:#fff;font:600 22px system-ui;text-shadow:0 1px 3px #000">▷ ${i + 1}</span></div>`).join('');
  await p.setViewportSize({ width: 1080, height: 1440 + 6 });
  await show(p, `<html dir="rtl"><body style="margin:0;background:#000"><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px">${cells}</div></body></html>`);
  await p.screenshot({ path: path.join(D, 'grid-preview.jpg'), type: 'jpeg', quality: 88 });
  await b.close();
  fs.unlinkSync(TMP);
})();
