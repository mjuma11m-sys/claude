// لقطات حقيقية لـ DW-019 («جديد بحياتي») من dist/Hayati.html ببيانات تجريبية
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const path = require('path');
const seed = require('../../hayati-ad/seed.js');
const APP = 'file://' + path.join(__dirname, '../../../hayati-app/dist/Hayati.html');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'ar-BH', timezoneId: 'Asia/Bahrain', colorScheme: 'light' });
  await ctx.addInitScript(() => { localStorage.setItem('hayati-loop-ask', 'yes'); });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const shot = async (n) => { await p.waitForTimeout(700); await p.screenshot({ path: path.join(__dirname, 'shots', n + '.png') }); };
  await p.goto(APP); await p.waitForFunction(() => window.App && App.st);
  await p.addStyleTag({ content: '.morning{display:none!important}' });
  await p.evaluate(seed);
  await p.evaluate(() => { App.go('today'); scrollTo(0, 0); });
  await shot('1-today');
  await p.evaluate(() => localStorage.setItem('hayati-seen-version', 'v21'));
  await p.evaluate(() => window.Extras.WhatsNew.check());
  await shot('2-news');
  await p.click('#sheetCancel'); await p.waitForTimeout(300);
  await p.click('#toolsBtn'); await shot('3-tools');
  console.log(errs.length ? errs : 'ok');
  await b.close();
})();
