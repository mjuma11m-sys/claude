// لقطات «أمورك» (DW-101) ببيانات تجريبية — node shots2.js
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const path = require('path');
const OUT = path.join(__dirname, 'shots');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  await ctx.addInitScript(() => { localStorage.setItem('hayati-account-step', 'skip'); localStorage.setItem('hayati-first-step', 'done'); localStorage.setItem('hayati-seen-version', 'v29'); localStorage.setItem('hayati-tour', 'done'); });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file:///home/user/claude/hayati-app/dist/Hayati.html'); await p.waitForFunction(() => window.Extras && Extras.Life);
  await p.evaluate(() => {
    App.S.setSettings({ onboarded: true });
    const d = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
    const now = new Date(), ym = (k) => { const x = new Date(now.getFullYear(), now.getMonth() + k, 1); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0'); };
    localStorage.setItem('hayati-life', JSON.stringify({
      papers: [{ id: 'p1', type: 'license', exp: d(9) }, { id: 'p2', type: 'cpr', exp: d(64) }, { id: 'p3', type: 'passport', exp: d(410) }, { id: 'p4', type: 'ins', exp: d(120) }],
      bills: [{ id: 'b1', type: 'ewa', day: ((now.getDate() + 1) % 28) + 1, paid: { [ym(-1)]: 28.5 } }, { id: 'b2', type: 'net', day: 5, paid: { [ym(-1)]: 20, [ym(0)]: 20 } }, { id: 'b3', type: 'mobile', day: 12, paid: { [ym(-1)]: 9, [ym(0)]: 11 } }],
      jamiya: [{ id: 'j1', name: 'جمعية الدوام', amount: 100, members: 10, start: ym(-2), turn: 5, day: 1, paid: {} }, { id: 'j2', name: 'جمعية الأهل', amount: 50, members: 6, start: ym(-1), turn: 2, day: 25, paid: { [ym(-1)]: true } }],
      car: { km: '', items: [] }, eid: [], qada: {} }));
  });
  for (const s of ['papers', 'bills', 'jamiya']) {
    await p.evaluate((s) => Extras.Life[s](), s); await p.waitForTimeout(1000);
    await p.screenshot({ path: path.join(OUT, s + '.png') });
    await p.locator('#sheet[open]').screenshot({ path: path.join(OUT, s + '-s.png') });
    await p.evaluate(() => App.closeSheet()); await p.waitForTimeout(400);
  }
  if (errs.length) console.log('ERRORS', errs);
  await b.close();
})();
