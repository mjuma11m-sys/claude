// لقطات «قريباً 👀»: بيانات تجريبية بحجم آيفون ×3 (الجدول، رسالة البنك بتاريخها، المطبخ)
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const path = require('path');
const APP = 'file:///home/user/claude/hayati-app/dist/Hayati.html';
const OUT = (n) => path.join(__dirname, 'shots', n + '.png');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'ar-BH', timezoneId: 'Asia/Bahrain', colorScheme: 'dark' });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('hayati-account-step', 'skip'); localStorage.setItem('hayati-first-step', 'done'); localStorage.setItem('hayati-start-here', 'done'); localStorage.setItem('hayati-seen-version', '999'); } catch (e) {} });
  await p.goto(APP); await p.waitForFunction(() => window.App && App.st);
  await p.evaluate(() => {
    const S = App.S;
    S.setSettings({ onboarded: true, name: 'سارة', budget: 250, roles: ['student'], sms_consent_at: new Date().toISOString() });
    const C = [['محاسبة إدارية', [0, 2], '10:00', '11:15', 'S40-2050', '#1A8A8F'], ['تسويق دولي', [1, 3], '13:00', '14:15', 'S20-1043', '#8b5cf6'], ['إحصاء', [0, 2], '08:00', '09:15', 'S1A-12', '#f59e0b'], ['اقتصاد كلي', [1, 3], '11:00', '12:15', 'S40-021', '#ef4444']];
    C.forEach(([n, d, s, e, r, c], i) => S.upsert('courses', { id: 'c' + i, name: n, type: 'lecture', days: d, start_time: s, end_time: e, room: r, color: c }));
  });
  await p.addStyleTag({ content: 'html body header.top{padding-top:54px !important} #sb{position:fixed;top:0;left:0;right:0;height:50px;z-index:30;display:flex;justify-content:space-between;align-items:center;padding:14px 34px 0;font:600 16px -apple-system,Helvetica,Arial;color:#E8DCC4;direction:ltr;pointer-events:none} .morning{display:none!important}' });
  await p.evaluate(() => { const d = document.createElement('div'); d.id = 'sb'; d.innerHTML = '<span>9:41</span><span>●●●● ᯤ ▮▮▮▯</span>'; document.body.appendChild(d); });
  const shot = async (n) => { await p.waitForTimeout(900); await p.screenshot({ path: OUT(n) }); };
  await p.evaluate(() => { App.go('schedule'); scrollTo(0, 0); }); await shot('01_week');
  // رسالة بنك قديمة (من 3 أيام) تنحفظ بتاريخها
  await p.evaluate(() => { const d = new Date(Date.now() - 3 * 864e5); const ds = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
    App.pasteSmsForm('Purchase of BHD 3.200 at COSTA SEEF using card XXXX4821 on ' + ds); });
  await shot('02_sms');
  await p.evaluate(() => App.closeSheet()); await p.waitForTimeout(400);
  await p.evaluate(() => { const b = document.createElement('button'); b.dataset.action = 'kitchen'; b.hidden = true; document.getElementById('view').appendChild(b); b.click(); b.remove(); });
  await p.waitForTimeout(700);
  const ok = await p.evaluate(() => { const r = [...document.querySelectorAll('[data-recipe]')].find((x) => /مجبوس/.test(x.textContent)); if (r) r.click(); return !!r; });
  await p.waitForTimeout(900); await shot('03_kitchen');
  console.log('recipe', ok);
  if (errs.length) console.log('ERRORS', errs);
  await b.close();
})();
