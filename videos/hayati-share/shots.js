// لقطات حقيقية من «حياتي» (dist/Hayati.html) للريل — ببيانات تجريبية
//   node shots.js → shots/*.png  (390×844 ×3)
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const path = require('path');
const seed = require('./seed.js');
const APP = 'file://' + path.join(__dirname, '../../hayati-app/dist/Hayati.html');
const SMS = 'Your card XX4821 was used for BHD 3.750 at COSTA COFFEE SEEF on 13/10/26. Avl bal BHD 412.300';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'ar-BH', timezoneId: 'Asia/Bahrain', colorScheme: 'light' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const shot = async (n) => { await p.waitForTimeout(700); await p.screenshot({ path: path.join(__dirname, 'shots', n + '.png') }); };
  await p.goto(APP); await p.waitForFunction(() => window.App && App.st);
  await p.addStyleTag({ content: '.morning{display:none!important}' });
  await p.evaluate(seed);
  await p.evaluate(() => { App.go('today'); scrollTo(0, 0); }); await shot('today');
  // أول مرة: الموافقة (نفس كود DW-009)
  await p.evaluate((t) => App.sharedSms(t), SMS); await shot('consent');
  await p.click('#sheetSave');
  await p.waitForSelector('#smsShared'); await shot('shared');
  await p.click('#sheetSave');
  await p.waitForTimeout(150); await p.evaluate(() => { App.ui.moneySeg = 'tx'; App.go('money'); scrollTo(0, 0); });
  await shot('added');
  console.log(errs.length ? errs : 'ok', await p.evaluate(() => App.st.transactions.filter((t) => t.source === 'sms').map((t) => [t.amount, t.merchant, t.raw])));
  await b.close();
})();
