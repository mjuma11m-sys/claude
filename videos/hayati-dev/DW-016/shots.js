// لقطات حقيقية لـ DW-016 (كل شي بحياتي) من dist/Hayati.html مع Capacitor مزيّف — ببيانات تجريبية
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
  await p.evaluate(() => { App.S.setSettings({ prayer_method: 'jafari', prayer_on: true }); App.go('today'); scrollTo(0, 0); });
  await shot('1-today');
  await p.click('#toolsBtn'); await shot('2-tools');
  await p.click('#tkOpen'); await p.waitForTimeout(300);
  await p.uncheck('[data-tk-on="recent"]'); await p.uncheck('[data-tk-on="health"]'); await p.uncheck('[data-tk-on="journal"]');
  await shot('3-arrange');
  await p.click('#sheetSave'); await p.waitForTimeout(400); await p.evaluate(() => scrollTo(0, 0));
  await shot('4-clean');
  console.log(errs.length ? errs : 'ok');
  await b.close();
})();
