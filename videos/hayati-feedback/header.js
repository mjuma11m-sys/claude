// هيدر فورم Google لـ «حياتي»: 1600×400 (4:1)، نطلعه 3200×800 عشان يطلع حاد بالجوال
//   node header.js → form-header.png + form-header-1600.png
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const fs = require('fs'), path = require('path'), vm = require('vm');
const D = __dirname, F = path.join(D, '../hayati-insta');
const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync('/home/user/claude/hayati-app/icons.js', 'utf8'), ctx);
const I = (n, w) => ctx.window.icon(n).replace('class="i"', 'width="' + w + '" height="' + w + '"');
const MARK = '<path d="M 383.3 172.7 A 160 160 0 1 1 300 102.2" fill="none" stroke="#E8DCC4" stroke-opacity=".28" stroke-width="22" stroke-linecap="round"/><path d="M 304 166 L 196 166 L 264 222 C 204 222 168 254 168 292 C 168 336 206 360 256 360 C 292 360 318 348 338 332" fill="none" stroke="#E8DCC4" stroke-width="38" stroke-linecap="round" stroke-linejoin="round"/><circle cx="352" cy="128" r="30" fill="#FF6B4A"/>';
const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>
@font-face{font-family:P;src:url(file://${F}/IBMPlexSansArabic-Bold.ttf);font-weight:700}
@font-face{font-family:P;src:url(file://${F}/IBMPlexSansArabic-Regular.ttf);font-weight:400}
html,body{margin:0;width:1600px;height:400px;overflow:hidden;font-family:P;color:#E8DCC4}
.bg{position:absolute;inset:0;background:radial-gradient(70% 140% at 78% 50%,#16606a 0%,#0E3B43 55%,#0A1A1E 100%)}
.grain{position:absolute;inset:0;opacity:.05;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.mark{position:absolute;right:96px;top:72px;width:256px;height:256px}
.txt{position:absolute;right:390px;top:84px}
h1{margin:0;font-size:108px;line-height:1.1;font-weight:700;white-space:nowrap}
h1 b{color:#FF6B4A}
.sub{margin-top:18px;display:inline-flex;align-items:center;gap:14px;font-size:36px;font-weight:400;padding:8px 24px 8px 20px;border-radius:999px;background:rgba(232,220,196,.1);border:2px solid rgba(232,220,196,.18)}
.sub svg{color:#FF6B4A}
.icons{position:absolute;left:90px;top:60px;width:300px;height:280px;opacity:.16;color:#E8DCC4}
.icons span{position:absolute}
</style></head><body><div class="bg"></div>
<svg class="mark" viewBox="0 0 512 512">${MARK}</svg>
<div class="txt"><h1>رأيك بـ <b>«حياتي»</b></h1><div class="sub">${I('settings', 34)}قيد التطوير · نسخة تجريبية</div></div>
<div class="icons">${[['wallet', 0, 10, 92, -8], ['calendar', 170, 0, 84, 6], ['moon', 40, 160, 80, 4], ['dumbbell', 190, 150, 96, -6]].map(([n, x, y, w, r]) => `<span style="left:${x}px;top:${y}px;transform:rotate(${r}deg)">${I(n, w)}</span>`).join('')}</div>
<div class="grain"></div></body></html>`;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium' });
  for (const [scale, name] of [[2, 'form-header.png'], [1, 'form-header-1600.png']]) {
    const p = await b.newPage({ viewport: { width: 1600, height: 400 }, deviceScaleFactor: scale });
    const tmp = path.join(D, '_header.html'); fs.writeFileSync(tmp, html);
    await p.goto('file://' + tmp); await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(D, name) });
    fs.unlinkSync(tmp);
  }
  await b.close();
})();
