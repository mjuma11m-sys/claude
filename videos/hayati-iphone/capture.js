// لقطات «حياتي على الآيفون»: بيانات تجريبية بحجم آيفون ×3
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const path = require('path');
const APP = 'file:///home/user/claude/hayati-app/dist/Hayati.html';
const OUT = (n) => path.join(__dirname, 'shots', n + '.png');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'ar-BH', timezoneId: 'Asia/Bahrain', colorScheme: 'dark' });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('hayati-account-step', 'skip'); localStorage.setItem('hayati-first-step', 'done'); } catch (e) {} });
  await p.goto(APP); await p.waitForFunction(() => window.App && App.st);
  await p.evaluate(() => {
    const at = (d, h) => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), Math.max(1, n.getDate() - d), h || 12, 20).toISOString(); };
    const S = App.S;
    S.setSettings({ onboarded: true, name: 'سارة', budget: 250, sms_consent_at: new Date().toISOString() });
    const tx = [['COSTA SEEF', 3.2, 1, 'قهوة'], ['Talabat', 6.8, 2, 'أكل ومطاعم'], ['LULU HYPERMARKET', 24, 3, 'بقالة وتسوق'], ['Bapco Juffair', 8, 3, 'مواصلات وبنزين'], ['Batelco', 12, 4, 'فواتير واتصالات'], ['Shake Shack', 7.9, 4, 'أكل ومطاعم'], ['Careem', 3.4, 5, 'مواصلات وبنزين']];
    tx.forEach(([m, a, d, c], i) => S.upsert('transactions', { id: 'tx' + i, kind: 'expense', amount: a, merchant: m, category: c, occurred_at: at(d, 9 + i) }));
    S.upsert('transactions', { id: 'dinner', kind: 'expense', amount: 24, merchant: 'Bushido', category: 'أكل ومطاعم', occurred_at: at(0, 21) });
    const today = new Date().getDay();
    S.upsert('courses', { id: 'c1', name: 'محاسبة إدارية', type: 'lecture', days: [today], start_time: '10:00', end_time: '11:15', room: 'S40-2050', color: '#1A8A8F' });
    S.upsert('courses', { id: 'c2', name: 'تسويق دولي', type: 'lecture', days: [today], start_time: '13:00', end_time: '14:15', room: 'S20-1043', color: '#8b5cf6' });
    S.upsert('tasks', { id: 'tk1', title: 'تقرير التسويق الدولي', kind: 'homework', due_at: new Date(Date.now() + 2 * 864e5).toISOString() });
    try { localStorage.setItem('hayati-morning', JSON.stringify({ [new Date().toDateString()]: 1 })); } catch (e) {}
  });
  await p.addStyleTag({ content: 'html body header.top{padding-top:54px !important} #sb{position:fixed;top:0;left:0;right:0;height:50px;z-index:30;display:flex;justify-content:space-between;align-items:center;padding:14px 34px 0;font:600 16px -apple-system,Helvetica,Arial;color:#E8DCC4;direction:ltr;pointer-events:none} .morning{display:none!important}' });
  await p.evaluate(() => { const d = document.createElement('div'); d.id = 'sb'; d.innerHTML = '<span>9:41</span><span>●●●● ᯤ ▮▮▮▯</span>'; document.body.appendChild(d); });
  const shot = async (n) => { await p.waitForTimeout(900); await p.screenshot({ path: OUT(n) }); };
  await p.evaluate(() => { App.go('today'); scrollTo(0, 0); }); await shot('01_today');
  // رسالة بنك وصلت من «شارك ← حياتي»
  await p.evaluate(() => App.pasteSmsForm('Purchase of BHD 3.200 at COSTA SEEF using card XXXX4821'));
  await p.waitForTimeout(700); await shot('02_sms');
  await p.evaluate(() => App.closeSheet()); await p.waitForTimeout(400);
  // قسّم العشا
  await p.evaluate(() => App.txForm(App.st.transactions.find((t) => t.id === 'dinner')));
  await p.waitForTimeout(600); await p.click('[data-split]'); await p.waitForTimeout(700);
  await p.fill('#sheetBody input:not([type=checkbox]):not([type=hidden])', 'أحمد، علي، يوسف');
  await p.evaluate(() => document.activeElement.blur());
  await shot('03_split');
  console.log(await p.evaluate(() => document.getElementById('sheetBody').innerText.slice(0, 400)));
  if (errs.length) console.log('ERRORS', errs);
  await b.close();
})();
