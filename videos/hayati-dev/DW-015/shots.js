// لقطات حقيقية لـ DW-015 (عبادتي) من dist/Hayati.html مع Capacitor مزيّف — ببيانات تجريبية
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
  await p.evaluate(() => { App.S.setSettings({ prayer_method: 'jafari', prayer_on: true }); App.go('today'); document.querySelector('.ibada-row').scrollIntoView({ block: 'center' }); });
  await shot('1-row');
  await p.click('[data-action="ibada"]'); await shot('2-page');
  await p.click('#ibTsb'); await p.waitForTimeout(300);
  for (let i = 0; i < 12; i++) await p.click('#tsbBtn');
  await shot('3-tasbih');
  await p.evaluate(() => document.querySelector('#sheetBody').scrollTo(0, 0));
  await p.click('#sheetCancel'); await p.waitForTimeout(300);
  await p.click('[data-action="ibada"]'); await p.evaluate(() => { const l = [...document.querySelectorAll('#sheetBody .group-title, #sheetBody .sec-head, #sheetBody h3')].pop(); const c = document.querySelector('#sheetBody .card.flush'); (c || l).scrollIntoView({ block: 'start' }); });
  await shot('4-occasions');
  console.log(errs.length ? errs : 'ok');
  await b.close();
})();
