// طقم السوشال + معاينة الموقع وقالب الفاتورة:  PW=<playwright> node company-brand/kit.js → out/social/
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const OUT = path.join(__dirname, 'out/social'); fs.mkdirSync(OUT, { recursive: true });
const font = (w, f) => `@font-face{font-family:P;font-weight:${w};src:url(data:font/ttf;base64,${fs.readFileSync(path.join(__dirname, 'fonts', f)).toString('base64')})}`;
const css = font(700, 'IBMPlexSansArabic-Bold.ttf') + font(400, 'IBMPlexSansArabic-Regular.ttf') + '*{margin:0;box-sizing:border-box}body{font-family:P;direction:rtl}';
const mark = fs.readFileSync(path.join(__dirname, 'out/mark-on-dark.svg'), 'utf8').replace('<svg ', '<svg style="width:100%;height:100%;display:block" ');
// banner: المحتوى داخل المنطقة الآمنة (safe) بالنص، لأن الصورة الشخصية والقص يغطون الأطراف
const banner = (w, h, safeW, safeH) => `<style>${css}</style><body style="width:${w}px;height:${h}px;background:radial-gradient(90% 120% at 50% 50%,#16302d,#0B1514 70%);color:#F2EBDD;display:grid;place-items:center">
<div style="width:${safeW}px;height:${safeH}px;display:flex;align-items:center;justify-content:center;gap:${safeH * 0.12}px;direction:ltr">
<div style="width:${safeH * 0.5}px;height:${safeH * 0.5}px">${mark}</div>
<div style="direction:rtl;text-align:right"><div style="font-weight:700;font-size:${safeH * 0.3}px;line-height:1.05">ودقة</div>
<div style="font-weight:700;font-size:${safeH * 0.075}px;letter-spacing:.2em;color:#C8A04A;direction:ltr;text-align:right">WADQA STUDIO</div>
<div style="font-size:${safeH * 0.085}px;color:#D9D2C2;margin-top:${safeH * 0.03}px">صافية مثل المطر · استوديو برمجيات من البحرين</div></div></div></body>`;
const story = `<style>${css}</style><body style="width:1080px;height:1920px;background:#0B1514;color:#F2EBDD;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px">
<div style="width:300px;height:300px">${mark}</div><div style="font-weight:700;font-size:150px;line-height:1">ودقة</div>
<div style="font-weight:700;font-size:40px;letter-spacing:.2em;color:#C8A04A;direction:ltr">WADQA STUDIO</div>
<div style="font-size:50px;margin-top:40px">شفافة · صادقة · أمينة</div><div style="font-size:34px;color:#8FA09C;margin-top:160px">قيد التطوير · نسخة تجريبية</div></body>`;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const shot = async (html, name, w, h) => { const p = await b.newPage({ viewport: { width: w, height: h } }); await p.setContent(html); await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: path.join(OUT, name) }); await p.close(); };
  await shot(banner(1500, 500, 1100, 360), 'x-header-1500x500.png', 1500, 500);
  await shot(banner(1584, 396, 1100, 300), 'linkedin-banner-1584x396.png', 1584, 396);
  await shot(banner(2560, 1440, 1546, 423), 'youtube-banner-2560x1440.png', 2560, 1440);
  await shot(story, 'story-1080x1920.png', 1080, 1920);
  fs.copyFileSync(path.join(__dirname, 'out/mark-app-icon-1024.png'), path.join(OUT, 'avatar-1024.png'));
  // معاينات: الموقع (ديسكتوب + جوال) والفاتورة بمثال
  for (const [w, h, n] of [[1280, 900, 'site-desktop.png'], [390, 844, 'site-mobile.png']]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); await p.goto('file://' + path.join(__dirname, 'site/index.html')); await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(OUT, n), fullPage: true }); await p.close();
  }
  const p = await b.newPage(); await p.goto('file://' + path.join(__dirname, 'templates/invoice.html')); await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => { document.querySelector('#rows td').textContent = 'مثال: تطوير صفحة هبوط (بيانات تجريبية)'; document.querySelector('.p').textContent = '120.000'; window.addRow(); const r = document.querySelectorAll('#rows tr')[1]; r.querySelector('td').textContent = 'مثال: تعديلات إضافية (ساعة)'; r.querySelector('.q').textContent = '3'; r.querySelector('.p').textContent = '8.500'; document.dispatchEvent(new Event('input')); });
  await p.pdf({ path: path.join(OUT, 'invoice-example.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  console.log('total', await p.textContent('#total'));
  await b.close();
})();
