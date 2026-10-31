// profile.html → hayati-partners.pdf (+ صور للمعاينة)
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
  await p.goto('file://' + path.join(__dirname, 'profile.html'));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);
  await p.pdf({ path: path.join(__dirname, 'hayati-partners.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  const pages = await p.$$('.page');
  for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: path.join(__dirname, 'page-' + (i + 1) + '.jpg'), type: 'jpeg', quality: 88 });
  await b.close();
})();
