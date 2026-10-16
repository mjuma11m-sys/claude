// لقطات حقيقية لفيديو التحديث v24 من dist/Hayati.html ببيانات تجريبية
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const path = require('path'), fs = require('fs');
const seed = require('../../hayati-ad/seed.js');
const APP = 'file://' + path.join(__dirname, '../../../hayati-app/dist/Hayati.html');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'ar-BH', timezoneId: 'Asia/Bahrain', colorScheme: 'light' });
  await ctx.addInitScript(() => { localStorage.setItem('hayati-loop-ask', 'yes'); localStorage.setItem('hayati-seen-version', 'v22'); localStorage.setItem('hayati-first-step', 'done'); });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(APP); await p.waitForFunction(() => window.App && App.st);
  await p.addStyleTag({ content: '.morning{display:none!important}' });
  await p.evaluate(seed);
  const shot = async (n) => { await p.waitForTimeout(700); await p.evaluate(() => document.activeElement && document.activeElement.blur()); await p.screenshot({ path: path.join(__dirname, 'shots', n + '.png') }); };
  await p.evaluate(() => { App.go('today'); scrollTo(0, 0); });
  await p.evaluate(() => App.closeSheet()); await p.waitForTimeout(400);
  await shot('0-today');

  // ✨ اسأل حياتي: المسجّل (السيرفر مقلّد)، الجواب «مثال» من أرقام البيانات التجريبية نفسها
  const coffee = await p.evaluate(() => App.txInMonth(App.monthKey(new Date())).filter((t) => t.category === 'قهوة').reduce((s, t) => s + t.amount, 0));
  await p.evaluate((c) => {
    App.S.status.signedIn = true;
    App.S.invokeFn = async () => ({ text: 'صرفت على القهوة هالشهر ' + App.fmt(c) + ' د.ب ☕\nأغلبها من كوستا وكاريبو.\nلو تخففها لمرتين بالأسبوع توفّر تقريباً نصها.' });
    App.S.setSettings({});
  }, coffee);
  await p.waitForTimeout(400);
  await p.evaluate(() => App.closeSheet()); await p.waitForTimeout(400);
  await p.click('#assistBtn'); await p.waitForTimeout(500);
  await p.fill('#chatForm [name=q]', 'كم صرفت على القهوة هالشهر؟'); await p.press('#chatForm [name=q]', 'Enter'); await p.waitForTimeout(900);
  await shot('1-ask'); await p.click('#sheetCancel'); await p.waitForTimeout(400);

  // 🎯 هدف بصورة: سيارة مرسومة (بلا أشخاص)
  await p.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 800; c.height = 450; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 450); g.addColorStop(0, '#9fd3e6'); g.addColorStop(.62, '#e9f4f7'); g.addColorStop(.62, '#cfc6b4'); g.addColorStop(1, '#b9ae98'); x.fillStyle = g; x.fillRect(0, 0, 800, 450);
    x.fillStyle = '#e4572e'; x.beginPath(); x.roundRect(170, 200, 460, 110, 40); x.fill(); x.beginPath(); x.roundRect(270, 140, 250, 100, 46); x.fill();
    x.fillStyle = '#cfe8f2'; x.beginPath(); x.roundRect(300, 160, 90, 62, 16); x.fill(); x.beginPath(); x.roundRect(400, 160, 92, 62, 16); x.fill();
    x.fillStyle = '#222'; [[270, 312], [530, 312]].forEach(([a, bb]) => { x.beginPath(); x.arc(a, bb, 44, 0, 7); x.fill(); x.fillStyle = '#999'; x.beginPath(); x.arc(a, bb, 18, 0, 7); x.fill(); x.fillStyle = '#222'; });
    const S = App.S; const gl = S.upsert('goals', { id: 'g-car', name: 'سيارة', target: 3000, saved: 1240, color: '#e4572e', items: [] });
    await window.Extras.GoalPhoto.put(gl.id, c.toDataURL('image/jpeg', .85));
    App.ui.moneySeg = 'goals'; App.go('money');
  });
  await p.waitForTimeout(800);
  await p.evaluate(() => { const el = document.querySelector('.goal-photo'); if (el) el.closest('.card').scrollIntoView({ block: 'center' }); });
  await shot('2-goal');

  // 🖼️ تقرير الشهر كصورة (المبالغ مخفية)
  const rep = await p.evaluate(async () => (await window.Extras.ReportImage.draw(App.monthKey(new Date()), false)).toDataURL('image/png'));
  fs.writeFileSync(path.join(__dirname, 'shots', '3-report.png'), Buffer.from(rep.split(',')[1], 'base64'));

  // 🏷️ يتعلّم تصنيفاتك: محل تجريبي بثلاث عمليات «أخرى»
  await p.evaluate(() => {
    const d = new Date().toISOString();
    [['al1', 'ALDANA STORE SEEF'], ['al2', 'ALDANA STORE MANAMA'], ['al3', 'ALDANA STORE']].forEach(([id, m]) => App.S.upsert('transactions', { id, kind: 'expense', amount: 4.25, merchant: m, category: 'أخرى', occurred_at: d, source: 'sms' }));
    App.ui.month = App.monthKey(new Date()); App.ui.moneySeg = 'tx'; App.go('money'); scrollTo(0, 0);
  });
  await p.waitForTimeout(500);
  await p.evaluate(() => App.txForm(App.st.transactions.find((t) => t.id === 'al1'))); await p.waitForTimeout(600);
  await p.click('#sheetBody .cat-pick[data-c="بقالة وتسوق"]'); await p.click('#sheetSave');
  await p.waitForSelector('#askDlg[open]'); await shot('4-learn');
  await p.click('#askDlg [data-ok]');

  const wg = await p.evaluate(() => { const n = new Date(); n.setHours(9, 0, 0, 0); return window.Extras.Widget.snapshot(n); });
  fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify({ coffee, small: wg.small }, null, 1));
  console.log(JSON.stringify({ coffee, small: wg.small }), errs.length ? errs : 'ok');
  await b.close();
})();
