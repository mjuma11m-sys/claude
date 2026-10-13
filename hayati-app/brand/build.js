// هوية «حياتي»: يطلّع نسخ الشعار (SVG + PNG) والشعار مع الاسم من mark.svg
//   node brand/build.js → brand/out/
const fs = require('fs'), path = require('path');
const { chromium } = require('../node_modules/@playwright/test');
const D = __dirname, OUT = path.join(D, 'out');
fs.mkdirSync(OUT, { recursive: true });

const C = { sea: '#0E3B43', pearl: '#E8DCC4', coral: '#FF6B4A', white: '#FFFFFF' };
const ARC = 'M 383.3 172.7 A 160 160 0 1 1 300 102.2';
const HA = 'M 304 166 L 196 166 L 264 222 C 204 222 168 254 168 292 C 168 336 206 360 256 360 C 292 360 318 348 338 332';
// الشعار بدون المربع: القوس (مسار اليوم) + «ح» + النقطة (أنت الحين)
const glyph = (ink, dot) => `<path d="${ARC}" fill="none" stroke="${ink}" stroke-opacity=".28" stroke-width="22" stroke-linecap="round"/>` +
  `<path d="${HA}" fill="none" stroke="${ink}" stroke-width="38" stroke-linecap="round" stroke-linejoin="round"/>` +
  `<circle cx="352" cy="128" r="30" fill="${dot}"/>`;
const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${inner}</svg>\n`;

const MARKS = {
  'mark-app-icon': svg(`<rect width="512" height="512" rx="116" fill="${C.sea}"/>` + glyph(C.pearl, C.coral)),  // الأساسي = أيقونة التطبيق
  'mark-on-light': svg(glyph(C.sea, C.coral)),        // على خلفية فاتحة (أبيض، لؤلؤي، ورق)
  'mark-on-dark': svg(glyph(C.pearl, C.coral)),       // على خلفية غامقة أو صورة
  'mark-mono-sea': svg(glyph(C.sea, C.sea)),          // لون واحد: طباعة، ختم
  'mark-mono-white': svg(glyph(C.white, C.white)),    // لون واحد على صورة أو فيديو
};
for (const [n, s] of Object.entries(MARKS)) fs.writeFileSync(path.join(OUT, n + '.svg'), s);

// الشعار مع الاسم: «حياتي» Bold وتحته «Hayati» SemiBold بمسافة 0.08em
const FONT = path.join(D, '../../videos/hayati-insta');
const page = (w, h, bg, body) => `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>
@font-face{font-family:Plex;src:url(file://${FONT}/IBMPlexSansArabic-Bold.ttf);font-weight:700}
@font-face{font-family:Plex;src:url(file://${FONT}/IBMPlexSansArabic-Regular.ttf);font-weight:400}
html,body{margin:0;width:${w}px;height:${h}px;background:${bg};font-family:Plex}
.l{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
</style></head><body>${body}</body></html>`;
const words = (ink, sub, ar, en, align) => `<div style="text-align:${align};line-height:1"><div style="font-weight:700;font-size:${ar}px;color:${ink}">حياتي</div>` +
  `<div style="font-weight:700;font-size:${en}px;letter-spacing:.08em;color:${sub};margin-top:${en * 1.15}px;direction:ltr">HAYATI</div></div>`;
const LOCKUPS = [];
for (const [tone, bg, ink, sub, mk] of [['light', 'transparent', C.sea, '#13636B', MARKS['mark-on-light']], ['dark', 'transparent', C.pearl, 'rgba(232,220,196,.7)', MARKS['mark-on-dark']]]) {
  LOCKUPS.push([`lockup-horizontal-${tone}.png`, 1600, 560, page(1600, 560, bg, `<div class="l" style="gap:56px">${mk.replace('<svg ', '<svg width="380" height="380" ')}${words(ink, sub, 230, 64, 'right')}</div>`)]);
  LOCKUPS.push([`lockup-stacked-${tone}.png`, 1000, 1100, page(1000, 1100, bg, `<div class="l" style="flex-direction:column;gap:40px">${mk.replace('<svg ', '<svg width="460" height="460" ')}${words(ink, sub, 220, 60, 'center')}</div>`)]);
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const shot = async (name, w, h, html) => {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    const f = path.join(OUT, '.tmp.html'); fs.writeFileSync(f, html);
    await p.goto('file://' + f); await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(OUT, name), omitBackground: true });
    await p.close(); fs.unlinkSync(f); console.log(name);
  };
  for (const [n, s] of Object.entries(MARKS)) await shot(n + '-1024.png', 1024, 1024, page(1024, 1024, 'transparent', s.replace('<svg ', '<svg width="1024" height="1024" ')));
  for (const [n, w, h, html] of LOCKUPS) await shot(n, w, h, html);
  await b.close();
})();
