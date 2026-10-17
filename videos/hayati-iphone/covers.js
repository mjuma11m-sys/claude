const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + path.join(__dirname, 'covers.html')); await p.evaluate(() => document.fonts.ready);
  for (const v of ['A', 'B', 'C']) {
    await p.evaluate((x) => { document.body.className = x; }, v); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(__dirname, 'cover-' + v + '.jpg'), type: 'jpeg', quality: 92 });
  }
  await b.close();
})();
