const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + path.join(__dirname, 'cover.html')); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(__dirname, 'cover.jpg'), type: 'jpeg', quality: 92 });
  await p.screenshot({ path: path.join(__dirname, 'cover-grid.jpg'), type: 'jpeg', quality: 92, clip: { x: 0, y: 420, width: 1080, height: 1080 } });
  await b.close();
})();
