// لقطات حقيقية من «حياتي» (dist/Hayati.html) لريل DW-012 — ببيانات تجريبية
//   node shots.js → shots/*.png  (390×844 ×3)
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const path = require('path');
const seed = require('./seed.js');
const APP = 'file://' + path.join(__dirname, '../../hayati-app/dist/Hayati.html');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'ar-BH', timezoneId: 'Asia/Bahrain', colorScheme: 'light' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const shot = async (n) => { await p.waitForTimeout(700); await p.screenshot({ path: path.join(__dirname, 'shots', n + '.png') }); };
  await p.goto(APP); await p.waitForFunction(() => window.App && App.st);
  await p.addStyleTag({ content: '.morning{display:none!important}' });
  await p.evaluate(seed);
  // 1) يوم الراتب
  await p.evaluate(() => { App.ui.moneySeg = 'tx'; App.go('money'); scrollTo(0, 0); });
  await p.click('[data-action="payday"]'); await p.click('#pdDays [data-d="25"]'); await shot('1-picker');
  await p.click('#sheetSave'); await p.waitForTimeout(200); await p.evaluate(() => scrollTo(0, 0)); await shot('2-money');
  await p.evaluate(() => { const el = document.querySelector('[data-action="zakat"]'); el.scrollIntoView({ block: 'center' }); }); await shot('2b-buttons');
  // 2) نزل الراتب: اليوم = يوم الراتب، والبيانات بالدورة اللي قبله
  await p.evaluate(() => {
    const d = new Date().getDate(); App.S.setSettings({ payday: d === 1 ? 1 : Math.min(28, d) }); localStorage.removeItem('hayati-payday-seen');
    App.S.upsert('transactions', { id: 'sal', kind: 'income', amount: 650, merchant: 'الراتب', category: 'راتب', occurred_at: new Date(Date.now() - 27 * 864e5).toISOString() });
    App.ui.month = App.monthKey(new Date()); App.go('today'); scrollTo(0, 0);
  });
  await shot('3-card');
  await p.click('[data-action="payday-summary"]'); await shot('4-summary');
  await p.click('#sheetCancel');
  // 3) الزكاة والخُمس
  await p.evaluate(() => { App.S.setSettings({ madhhab: 'sunni' }); App.go('money'); });
  await p.click('[data-action="zakat"]');
  await p.fill('[name=zk_cash]', '5000'); await p.fill('[name=zk_gold]', '40'); await p.dispatchEvent('[name=zk_gold]', 'input'); await shot('5-zakat');
  await p.click('#zkTool [data-t="khums"]'); await p.click('#mdh [data-m="jafari"]');
  await p.fill('[name=kh_inc]', '7800'); await p.fill('[name=kh_exp]', '6200'); await p.dispatchEvent('[name=kh_exp]', 'input'); await shot('6-khums');
  console.log(errs.length ? errs : 'ok');
  await b.close();
})();
