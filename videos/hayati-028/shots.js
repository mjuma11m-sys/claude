// لقطات ميزات 0.28 من التطبيق نفسه (بيانات تجريبية) — node shots.js
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const path = require('path');
const OUT = path.join(__dirname, 'shots');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  await ctx.addInitScript(() => { localStorage.setItem('hayati-account-step', 'skip'); localStorage.setItem('hayati-first-step', 'done'); localStorage.setItem('hayati-seen-version', 'v28'); });
  const p = await ctx.newPage();
  const open = async () => { await p.goto('file:///home/user/claude/hayati-app/dist/Hayati.html'); await p.waitForFunction(() => window.App && App.st); await p.evaluate(() => { App.S.setSettings({ onboarded: true, budget: 300, payday: 1 }); }); };
  const shot = async (n) => { await p.waitForTimeout(900); await p.screenshot({ path: path.join(OUT, n + '.png') }); };
  // 1 سعرات الوصفات
  await open(); await p.evaluate(() => Extras.kitchen()); await p.waitForTimeout(600);
  await p.locator('#sheetBody [data-recipe]').first().click(); await shot('calories');
  // 2 احسب احتياجك
  await open(); await p.evaluate(() => { const b = document.createElement('button'); b.dataset.action = 'needs'; document.body.appendChild(b); b.click(); });
  await p.waitForTimeout(500);
  await p.evaluate(() => { const f = (n, v) => { const el = document.querySelector('#sheetBody [name="' + n + '"]'); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } }; f('age', 22); f('h', 175); f('w', 72); f('height', 175); f('weight', 72); });
  await shot('needs');
  // 3 Apple Pay
  await open(); await p.evaluate(() => Extras.payFromShortcut({ amount: 'BHD 3.750', merchant: 'COSTA COFFEE', card: 'Visa' })); await shot('applepay');
  // 4 سنتك بصورة
  await open(); await p.evaluate(() => { const y = new Date().getFullYear(); for (let i = 0; i < 70; i++) App.S.upsert('transactions', { kind: 'expense', amount: 1 + (i % 7) * 2.3, merchant: ['COSTA', 'LULU', 'ZAIN', 'TALABAT'][i % 4], category: ['قهوة', 'بقالة', 'فواتير', 'مطاعم'][i % 4], occurred_at: new Date(y, i % 10, 1 + (i * 3) % 27, 12).toISOString() }); Extras.Wrapped.sheet(); });
  await p.waitForTimeout(1500); await shot('wrapped');
  await b.close();
})();
