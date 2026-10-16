// لقطات حقيقية لـ DW-014 (ورد القرآن) من dist/Hayati.html مع Capacitor مزيّف — ببيانات تجريبية
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const path = require('path');
const seed = require('./seed.js');
const APP = 'file://' + path.join(__dirname, '../../../hayati-app/dist/Hayati.html');
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
  await p.evaluate(() => App.go('today'));
  await p.click('#addBtn'); await p.evaluate(() => document.querySelector('[data-pick="wird"]').scrollIntoView({ block: 'center' })); await shot('1-chooser');
  await p.click('[data-pick="wird"]'); await p.waitForTimeout(400);
  await p.check('[name=w_on]'); await p.fill('[name=w_goal]', '5'); await p.fill('[name=w_pos]', '212'); await p.check('[name=w_adhkar]'); await shot('2-setup');
  await p.click('#sheetSave'); await p.waitForTimeout(300);
  await p.evaluate(() => { App.go('today'); document.querySelector('.wird-card').scrollIntoView({ block: 'center' }); }); await shot('3-card');
  await p.click('.wird-card [data-action="wird-add"]:not([data-n="1"])'); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('.wird-card').scrollIntoView({ block: 'center' })); await shot('4-done');
  console.log(errs.length ? errs : 'ok');
  await b.close();
})();
