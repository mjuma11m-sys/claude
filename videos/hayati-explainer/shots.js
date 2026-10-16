// لقطات إضافية لفيديو الشرح: المهام والإعدادات (الخصوصية) — ببيانات تجريبية
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const path = require('path');
const seed = require('/home/user/claude/hayati-app/store/seed.js');
const APP = 'file://' + path.join(__dirname, '../../hayati-app/dist/Hayati.html');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'ar-BH', timezoneId: 'Asia/Bahrain', colorScheme: 'light' });
  await ctx.addInitScript(() => { localStorage.setItem('hayati-loop-ask', 'yes'); localStorage.setItem('hayati-seen-version', 'v22'); localStorage.setItem('hayati-first-step', 'done'); });
  const p = await ctx.newPage();
  const shot = async (n) => { await p.waitForTimeout(700); await p.evaluate(() => document.activeElement && document.activeElement.blur()); await p.screenshot({ path: path.join(__dirname, 'shots', n + '.png') }); };
  await p.goto(APP); await p.waitForFunction(() => window.App && App.st);
  await p.addStyleTag({ content: '.morning{display:none!important}' });
  await p.evaluate(seed);
  await p.evaluate(() => { App.go('tasks'); scrollTo(0, 0); });
  await shot('5-tasks');
  await p.click('#settingsBtn'); await p.waitForTimeout(500);
  await shot('8-settings');
  const t = await p.evaluate(() => document.getElementById('sheetBody').innerText.slice(0, 600));
  console.log(t);
  await b.close();
})();
