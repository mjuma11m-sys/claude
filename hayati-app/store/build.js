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

// نفس البيانات التجريبية «الطبيعية» حق الإعلان (videos/hayati-ad/seed.js)
const seed = require('../../videos/hayati-ad/seed.js');

const SHOTS = [
  ['01_today', 'يومك كله', 'بشاشة وحدة', 'محاضراتك، مهامك، وأوقات الصلاة'],
  ['02_money', 'من راتب', 'لراتب', 'تختار يوم راتبك، وتقدير لوين بتوصل'],
  ['03_summary', 'راتبك', 'وين راح؟', 'أكثر 3 أشياء صرفت عليها'],
  ['04_search', 'كم صرفت', 'على كوستا؟', 'بحث يجمع لك كل محل'],
  ['05_zakat', 'الزكاة', 'والخُمس', 'حاسبة تقدير · سني / شيعي'],
  ['06_ibada', 'عبادتي', '', 'الهجري، الصلاة الجاية، والمناسبات'],
  ['07_tools', 'كل شي', 'بمكان واحد', 'الفلوس · يومك · الدراسة والصحة · العبادة'],
];

async function raw(b) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'ar-BH', timezoneId: 'Asia/Bahrain', colorScheme: 'light' });
  // نسخة المتجر أندرويد أصلية: Capacitor مزيّف عشان تطلع أزرارها (التنبيهات)
  await ctx.addInitScript(() => {
    window.Capacitor = { isNativePlatform: () => true, Plugins: { LocalNotifications: { checkPermissions: async () => ({ display: 'granted' }), getPending: async () => ({ notifications: [] }), cancel: async () => {}, schedule: async () => {} }, Haptics: { impact: async () => {} } } };
    localStorage.setItem('hayati-loop-ask', 'yes');
  });
  const p = await ctx.newPage();
  const shot = async (n) => { await p.waitForTimeout(700); await p.screenshot({ path: path.join(RAW, n + '.png') }); };
  await p.goto(APP); await p.waitForFunction(() => window.App && App.st);
  await p.addStyleTag({ content: '.morning{display:none!important}' });
  await p.evaluate(seed);
  await p.evaluate(() => { App.ui.month = App.monthKey(new Date()); App.S.setSettings({ prayer_on: true }); App.go('today'); scrollTo(0, 0); }); await shot('01_today');
  await p.evaluate(() => { App.ui.moneySeg = 'tx'; App.go('money'); scrollTo(0, 0); }); await shot('02_money');
  await p.click('#findBtn'); await p.fill('#findQ', 'كوستا'); await p.waitForTimeout(400); await p.evaluate(() => document.activeElement.blur()); await shot('04_search');
  await p.evaluate(() => App.closeSheet()); await p.waitForTimeout(300);
  await p.evaluate(() => { const d = new Date().getDate(); App.S.setSettings({ payday: d === 1 ? 1 : Math.min(28, d) }); App.ui.month = App.monthKey(new Date()); App.go('today'); });
  await p.click('[data-action="payday-summary"]'); await shot('03_summary');
  await p.click('#sheetCancel');
  await p.evaluate(() => { App.S.setSettings({ payday: 25, madhhab: 'sunni' }); App.ui.month = App.monthKey(new Date()); App.go('money'); });
  await p.click('[data-action="zakat"]');
  await p.fill('[name=zk_cash]', '4860.250'); await p.fill('[name=zk_gold]', '38.900'); await p.dispatchEvent('[name=zk_gold]', 'input'); await shot('05_zakat');
  await p.click('#sheetCancel'); await p.waitForTimeout(300);
  await p.evaluate(() => App.go('today')); await p.click('[data-action="ibada"]'); await shot('06_ibada');
  await p.click('#sheetCancel'); await p.waitForTimeout(300);
  await p.click('#toolsBtn'); await shot('07_tools');
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
<div style="font-size:${hs}px;white-space:nowrap">${a}${c ? ' <b>' + c + '</b>' : ''}</div>
<div style="font-size:${Math.round(60 * s)}px;font-weight:400;margin-top:${Math.round(28 * s)}px;opacity:.9">${sub}</div></div>
<div style="position:absolute;left:50%;top:${top}px;width:${phoneW}px;margin-left:${-phoneW / 2}px;padding:${Math.round(22 * s)}px;border-radius:${Math.round(120 * s)}px;background:#0b1416;box-shadow:0 40px 120px -30px rgba(0,0,0,.8),inset 0 0 0 ${Math.max(2, Math.round(4 * s))}px #2a4a50">
<img src="file://${RAW}/${n}.png" style="width:100%;display:block;border-radius:${Math.round(100 * s)}px"></div>
<div style="position:absolute;right:${Math.round(60 * s)}px;bottom:${Math.round(50 * s)}px;font-size:${Math.round(34 * s)}px;font-weight:400;padding:${Math.round(10 * s)}px ${Math.round(22 * s)}px;border-radius:${Math.round(14 * s)}px;background:rgba(10,26,30,.85)">* لقطات ببيانات تجريبية</div></body></html>`;
}

const iconPage = (size, pad, bg = true) => `<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;overflow:hidden;background:#0E3B43">
<svg viewBox="0 0 512 512" style="position:absolute;left:${pad}px;top:${pad}px;width:${size - 2 * pad}px;height:${size - 2 * pad}px">${GLYPH}</svg></body></html>`;

const feature = head(1024, 500) + `<svg viewBox="0 0 512 512" style="position:absolute;right:70px;top:110px;width:280px;height:280px">${GLYPH}</svg>
<div style="position:absolute;right:390px;top:120px;line-height:1.15"><div style="font-size:96px">«<b>حياتي</b>»</div>
<div style="font-size:40px;font-weight:400;margin-top:14px">يومك كله بتطبيق واحد</div>
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
