// سطر «* لقطات ببيانات تجريبية» شفاف يتركّب على الفيديو (قاعدة الصراحة)
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const font = 'file:///home/user/claude/videos/hayati-iphone/IBMPlexSansArabic-Regular.ttf';
  await p.setContent(`<html dir="rtl"><style>@font-face{font-family:P;src:url(${font})}html,body{margin:0;background:transparent}
  div{position:absolute;left:0;right:0;top:1800px;text-align:center;font:400 30px P;color:#E8DCC4;opacity:.75}</style><div>* لقطات ببيانات تجريبية</div></html>`);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(__dirname, 'label.png'), omitBackground: true });
  await b.close();
})();
