// لقطات حقيقية لـ DW-013 (الحلقة اليومية) من www/ مع Capacitor مزيّف — ببيانات تجريبية
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const path = require('path');
const seed = require('./seed.js');
const APP = 'file://' + path.join(__dirname, '../../../hayati-app/dist/Hayati.html');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'ar-BH', timezoneId: 'Asia/Bahrain', colorScheme: 'light' });
  await ctx.addInitScript(() => {
    window.__cap = { scheduled: [] };
    window.Capacitor = { isNativePlatform: () => true, Plugins: { LocalNotifications: { checkPermissions: async () => ({ display: 'granted' }), requestPermissions: async () => ({ display: 'granted' }), getPending: async () => ({ notifications: [] }), cancel: async () => {}, schedule: async ({ notifications }) => { window.__cap.scheduled = notifications; } }, Haptics: { impact: async () => {} } } };
    const y = new Date(); y.setDate(y.getDate() - 1); localStorage.setItem('hayati-first-day', y.toISOString());
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const shot = async (n) => { await p.waitForTimeout(700); await p.screenshot({ path: path.join(__dirname, 'shots', n + '.png') }); };
  await p.goto(APP); await p.waitForFunction(() => window.App && App.st);
  await p.addStyleTag({ content: '.morning{display:none!important}' });
  await p.evaluate(seed);
  await p.evaluate(() => { App.go('today'); const c = document.querySelector('.loop-card'); if (c) c.scrollIntoView({ block: 'center' }); });
  await shot('1-card');
  await p.click('[data-action="loop-on"]'); await p.waitForTimeout(1200);
  await p.evaluate(() => { App.ui.moneySeg = 'tx'; App.go('money'); scrollTo(0, 0); App.txForm(); });
  await shot('2-addtx');
  console.log(errs.length ? errs : 'ok', await p.evaluate(() => window.__cap.scheduled.filter((n) => /سكّر|صباح/.test(n.title)).slice(0, 3).map((n) => [n.title, n.body])));
  await b.close();
})();
