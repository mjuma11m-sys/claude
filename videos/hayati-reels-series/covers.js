// أغلفة الريلز: كل المهم بالمربع الأوسط عشان شبكة البروفايل (3:4) ما تقصّه
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const path = require('path');
const C = [
  ['1', 'كم صرفت على', 'كوستا؟', '☕'], ['2', 'وصلتك', 'رسالة البنك؟', '📩'], ['3', 'راتبك', 'وين راح؟', '💸'],
  ['4', 'جدولك الجامعي', 'PDF؟', '📄'], ['5', 'بتكفيك', 'الميزانية؟', '📈'], ['6', 'كم صرفت على', 'القهوة؟', '☕'],
  ['7', 'راتبك ينزل', 'يوم 25؟', '💰'], ['8', 'وش نطبخ', 'اليوم؟', '🍲'], ['9', 'كم', 'زكاتك؟', '🧮'],
];
const F = 'file://' + __dirname + '/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const [n, a, c, e] of C) {
    await p.setContent(`<html dir="rtl"><style>
@font-face{font-family:P;src:url(${F}IBMPlexSansArabic-Bold.ttf);font-weight:700}
body{margin:0;width:1080px;height:1920px;font-family:P,'Helvetica Neue',Arial,sans-serif;color:#E8DCC4;background:radial-gradient(110% 60% at 50% 50%,#145a62 0%,#0E3B43 45%,#0A1A1E 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.e{font-size:150px;margin-bottom:30px}.a{font-size:120px;font-weight:700;line-height:1.1}.c{font-size:160px;font-weight:700;color:#FF6B4A;line-height:1.15}
.w{margin-top:60px;font-size:44px;font-weight:700;opacity:.75}.w i{display:inline-block;width:22px;height:22px;border-radius:50%;background:#FF6B4A;margin-left:12px}
</style><div class="e">${e}</div><div class="a">${a}</div><div class="c">${c}</div><div class="w"><i></i>حياتي</div></html>`);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(__dirname, 'covers', n + '.jpg'), type: 'jpeg', quality: 92 });
  }
  await b.close();
})();
