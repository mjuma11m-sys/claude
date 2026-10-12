// صور المتاجر لـ «حياتي»: أيقونات، صورة Google Play 1024×500، و5 لقطات بمقاسين
//   node store/build.js  (بعد node build.js عشان dist/Hayati.html يكون محدّث)
// كل اللقطات ببيانات تجريبية، مو بيانات أحد، ومكتوب عليها كذا.
const { chromium } = require('../node_modules/@playwright/test');
const fs = require('fs'), path = require('path');
const D = __dirname, OUT = path.join(D, 'out'), RAW = path.join(D, 'raw');
const APP = 'file://' + path.join(D, '../dist/Hayati.html');
const FONT = path.join(D, '../../videos/hayati-insta');
const ICON = fs.readFileSync(path.join(D, '../brand/icon-square.svg'), 'utf8');
const GLYPH = ICON.replace(/<\?xml[^>]*>|<svg[^>]*>|<\/svg>|<rect[^>]*\/>|<!--[^>]*-->/g, '');
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(RAW, { recursive: true });

// نفس البيانات التجريبية حق الإعلان
function seed() {
  const k = (off) => { const d = new Date(); d.setDate(d.getDate() - off); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const at = (d, h) => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), Math.max(1, n.getDate() - d), h || 12, 20).toISOString(); };
  const S = App.S;
  S.setSettings({ budget: 250, sleep_goal: 8, name: 'سارة', roles: ['student', 'athlete'], onboarded: true, prayer_method: 'gulf' });
  const tx = [['COSTA SEEF', 3.2, 1, 'قهوة'], ['Costa Coffee', 2.9, 3, 'قهوة'], ['كوستا', 3.5, 4, 'قهوة'], ['COSTA SEEF', 3.2, 6, 'قهوة'], ['Costa Coffee', 4.1, 7, 'قهوة'],
    ['Talabat', 6.8, 2, 'أكل ومطاعم'], ['TALABAT BH', 9.1, 5, 'أكل ومطاعم'], ['LULU HYPERMARKET', 24, 6, 'بقالة وتسوق'], ['Bapco Juffair', 8, 3, 'مواصلات وبنزين'],
    ['Shake Shack', 7.9, 4, 'أكل ومطاعم'], ['Batelco', 12, 1, 'فواتير واتصالات'], ['Jawad', 5.3, 0, 'بقالة وتسوق'], ['Careem', 3.4, 0, 'مواصلات وبنزين']];
  tx.forEach(([m, a, d, c], i) => S.upsert('transactions', { id: 'tx' + i, kind: 'expense', amount: a, merchant: m, category: c, occurred_at: at(d, 9 + (i % 10)) }));
  S.upsert('transactions', { id: 'inc', kind: 'income', amount: 200, merchant: 'مكافأة الجامعة', category: 'مكافأة', occurred_at: at(2, 10) });
  const today = new Date().getDay();
  S.upsert('courses', { id: 'c1', name: 'محاسبة إدارية', type: 'lecture', days: [today, (today + 2) % 7], start_time: '10:00', end_time: '11:15', room: 'S40-2050', color: '#1A8A8F' });
  S.upsert('courses', { id: 'c2', name: 'تسويق دولي', type: 'lecture', days: [today, (today + 2) % 7], start_time: '13:00', end_time: '14:15', room: 'S20-1043', color: '#8b5cf6' });
  S.upsert('courses', { id: 'c3', name: 'تمرين الفريق', type: 'gym', days: [(today + 1) % 7, (today + 3) % 7], start_time: '18:00', end_time: '20:00', room: 'ملعب النادي', color: '#10b981' });
  S.upsert('tasks', { id: 'tk1', title: 'تقرير التسويق الدولي', kind: 'homework', due_at: new Date(Date.now() + 2 * 864e5).toISOString() });
  S.upsert('tasks', { id: 'tk2', title: 'اختبار المحاسبة', kind: 'exam', due_at: new Date(Date.now() + 6 * 864e5).toISOString() });
  for (let i = 1; i <= 7; i++) S.upsert('daily', { id: 'n' + i, date: k(i), watch: true, sleep: [7.6, 7.9, 8.1, 7.4, 7.8, 8.2, 7.7][i - 1], hrv: [61, 58, 63, 57, 60, 64, 59][i - 1], rhr: 52 });
  try { localStorage.setItem('hayati-morning', JSON.stringify({ [new Date().toDateString()]: 1 })); } catch (e) { /* تجاهل */ }
}

const SHOTS = [
  ['01_today', 'يومك كله', 'بشاشة وحدة', 'محاضراتك، مهامك، وأوقات الصلاة'],
  ['02_money', 'مصاريفك', 'وميزانيتك', 'وتقدير لوين بتوصل آخر الشهر'],
  ['03_search', 'كم صرفت', 'على كوستا؟', 'بحث يجمع لك كل محل'],
  ['04_schedule', 'جدولك', 'الأسبوعي', 'محاضرة، تمرين، أو دوام'],
  ['05_welcome', 'لك أنت', 'بالذات', 'طالب، موظف، رياضي… تختار وش يطلع لك'],
];

async function raw(b) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'ar-BH', timezoneId: 'Asia/Bahrain', colorScheme: 'light' });
  const p = await ctx.newPage();
  const shot = async (n) => { await p.waitForTimeout(700); await p.screenshot({ path: path.join(RAW, n + '.png') }); };
  // 5) مستخدم جديد أول ما يفتح
  await p.goto(APP); await p.waitForFunction(() => window.App && App.st);
  await p.addStyleTag({ content: '.morning{display:none!important}' });
  await shot('05_welcome');
  await p.evaluate(seed);
  await p.evaluate(() => { App.go('today'); scrollTo(0, 0); }); await shot('01_today');
  await p.evaluate(() => { App.ui.moneySeg = 'tx'; App.go('money'); scrollTo(0, 0); }); await shot('02_money');
  await p.click('#findBtn'); await p.fill('#findQ', 'كوستا'); await p.waitForTimeout(400); await p.evaluate(() => document.activeElement.blur()); await shot('03_search');
  await p.evaluate(() => App.closeSheet());
  await p.evaluate(() => { App.ui.studySeg = 'schedule'; App.go('schedule'); scrollTo(0, 0); }); await shot('04_schedule');
  await ctx.close();
}

const head = (w, h) => `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>
@font-face{font-family:P;src:url(file://${FONT}/IBMPlexSansArabic-Bold.ttf);font-weight:700}
@font-face{font-family:P;src:url(file://${FONT}/IBMPlexSansArabic-Regular.ttf);font-weight:400}
*{box-sizing:border-box}html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;font-family:P;font-weight:700;color:#E8DCC4}
.bg{position:absolute;inset:0;background:radial-gradient(110% 70% at 50% 30%,#155c64 0%,#0E3B43 45%,#0A1A1E 100%)}
b{color:#FF6B4A}</style></head><body><div class="bg"></div>`;

// لقطة متجر: عنوان فوق، الشاشة تحت داخل إطار
function storeShot([n, a, c, sub], w, h) {
  const tall = h / w > 2, s = w / 1290, phoneW = Math.round((tall ? 900 : 760) * s), top = Math.round((tall ? 600 : 600) * s), hs = Math.round(120 * s);
  return head(w, h) + `<div style="position:absolute;left:0;right:0;top:${Math.round(170 * s)}px;text-align:center;line-height:1.1">
<div style="font-size:${hs}px;white-space:nowrap">${a} <b>${c}</b></div>
<div style="font-size:${Math.round(60 * s)}px;font-weight:400;margin-top:${Math.round(28 * s)}px;opacity:.9">${sub}</div></div>
<div style="position:absolute;left:50%;top:${top}px;width:${phoneW}px;margin-left:${-phoneW / 2}px;padding:${Math.round(22 * s)}px;border-radius:${Math.round(120 * s)}px;background:#0b1416;box-shadow:0 40px 120px -30px rgba(0,0,0,.8),inset 0 0 0 ${Math.max(2, Math.round(4 * s))}px #2a4a50">
<img src="file://${RAW}/${n}.png" style="width:100%;display:block;border-radius:${Math.round(100 * s)}px"></div>
<div style="position:absolute;right:${Math.round(60 * s)}px;bottom:${Math.round(50 * s)}px;font-size:${Math.round(34 * s)}px;font-weight:400;padding:${Math.round(10 * s)}px ${Math.round(22 * s)}px;border-radius:${Math.round(14 * s)}px;background:rgba(10,26,30,.85)">* لقطات ببيانات تجريبية</div></body></html>`;
}

const iconPage = (size, pad, bg = true) => `<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;overflow:hidden;background:#0E3B43">
<svg viewBox="0 0 512 512" style="position:absolute;left:${pad}px;top:${pad}px;width:${size - 2 * pad}px;height:${size - 2 * pad}px">${GLYPH}</svg></body></html>`;

const feature = head(1024, 500) + `<svg viewBox="0 0 512 512" style="position:absolute;right:70px;top:110px;width:280px;height:280px">${GLYPH}</svg>
<div style="position:absolute;right:390px;top:120px;line-height:1.15"><div style="font-size:96px">«<b>حياتي</b>»</div>
<div style="font-size:40px;font-weight:400;margin-top:14px">مصاريفك، دراستك، وصلاتك بمكان واحد</div>
<div style="font-size:30px;font-weight:400;margin-top:22px;opacity:.75">تطبيق بحريني · نسخة تجريبية</div></div></body></html>`;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium' });
  await raw(b);
  const p = await b.newPage();
  const tmp = path.join(D, '_page.html');
  const render = async (html, w, h, file, type = 'png') => {
    fs.writeFileSync(tmp, html);
    await p.setViewportSize({ width: w, height: h });
    await p.goto('file://' + tmp); await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(OUT, file), type, ...(type === 'jpeg' ? { quality: 92 } : {}) });
    console.log(file);
  };
  for (const s of SHOTS) {
    await render(storeShot(s, 1290, 2796), 1290, 2796, 'ios-' + s[0] + '.png');
    await render(storeShot(s, 1080, 1920), 1080, 1920, 'android-' + s[0] + '.png');
  }
  await render(iconPage(1024, 0), 1024, 1024, 'icon-ios-1024.png');
  await render(iconPage(512, 0), 512, 512, 'icon-play-512.png');
  // maskable: أندرويد يقص لدائرة 80%، فالشعار بهامش 20% من كل جهة
  await render(iconPage(512, 72), 512, 512, '../../icons/maskable-512.png');
  await render(feature, 1024, 500, 'play-feature-1024x500.png');
  fs.unlinkSync(tmp);
  await b.close();
})();
