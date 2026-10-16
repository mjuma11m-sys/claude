// لقطات الإعلان من «حياتي» (dist/Hayati.html) ببيانات تجريبية طبيعية — node shots.js → shots/*.png
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const path = require('path');
const seed = require('./seed.js');
const APP = 'file://' + path.join(__dirname, '../../hayati-app/dist/Hayati.html');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'ar-BH', timezoneId: 'Asia/Bahrain', colorScheme: 'light' });
  await ctx.addInitScript(() => {
    window.Capacitor = { isNativePlatform: () => true, Plugins: { LocalNotifications: { checkPermissions: async () => ({ display: 'granted' }), getPending: async () => ({ notifications: [] }), cancel: async () => {}, schedule: async () => {} }, Haptics: { impact: async () => {} } } };
    localStorage.setItem('hayati-loop-ask', 'yes');
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const shot = async (n) => { await p.waitForTimeout(700); await p.screenshot({ path: path.join(__dirname, 'shots', n + '.png') }); };
  await p.goto(APP); await p.waitForFunction(() => window.App && App.st);
  await p.addStyleTag({ content: '.morning{display:none!important}' });
  await p.evaluate(seed);
  await p.evaluate(() => { App.ui.month = App.monthKey(new Date()); App.S.setSettings({ prayer_on: true }); App.go('today'); scrollTo(0, 0); });
  await shot('1-today');
  await p.evaluate(() => { App.ui.moneySeg = 'tx'; App.go('money'); scrollTo(0, 0); }); await shot('2-money');
  // «راتبك وين راح؟»: نفتح ملخص الدورة اللي خلصت (اليوم = يوم الراتب)
  await p.evaluate(() => { const d = new Date().getDate(); App.S.setSettings({ payday: d === 1 ? 1 : Math.min(28, d) }); App.ui.month = App.monthKey(new Date()); App.go('today'); });
  await p.click('[data-action="payday-summary"]'); await shot('3-summary');
  await p.click('#sheetCancel');
  await p.evaluate(() => { App.S.setSettings({ payday: 25, madhhab: 'sunni' }); App.ui.month = App.monthKey(new Date()); App.go('money'); });
  await p.click('[data-action="zakat"]');
  await p.fill('[name=zk_cash]', '4860.250'); await p.fill('[name=zk_gold]', '38.900'); await p.dispatchEvent('[name=zk_gold]', 'input'); await shot('4-zakat');
  await p.click('#sheetCancel'); await p.waitForTimeout(300);
  await p.evaluate(() => { App.go('today'); }); await p.click('[data-action="ibada"]'); await shot('5-ibada');
  await p.click('#sheetCancel'); await p.waitForTimeout(300);
  await p.click('#toolsBtn'); await shot('6-tools');
  console.log(errs.length ? errs : 'ok');
  await b.close();
})();
