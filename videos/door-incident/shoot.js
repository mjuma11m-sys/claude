const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(__dirname, 'shots.html'));
  await p.evaluate(() => window.READY);
  for (const n of ['house', 'interior', 'golden', 'aftermath']) {
    await p.evaluate(n => draw(n), n);
    await p.locator('#c').screenshot({ path: `assets/${n}.png` });
  }
  console.log(errs.length ? 'ERRORS ' + errs : 'ok');
  await b.close();
})();
