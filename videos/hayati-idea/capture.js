// لقطات فيديو «فكرة حياتي»: بيانات تجريبية بحجم آيفون ×3
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const path = require('path');
const APP = 'file:///home/user/claude/hayati-app/dist/Hayati.html';
const OUT = (n) => path.join(__dirname, 'shots', n + '.png');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'ar-BH', timezoneId: 'Asia/Bahrain', colorScheme: 'dark' });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('hayati-account-step', 'skip'); localStorage.setItem('hayati-first-step', 'done'); localStorage.setItem('hayati-start-here', 'done'); localStorage.setItem('hayati-seen-version', '999'); } catch (e) {} });
  await p.goto(APP); await p.waitForFunction(() => window.App && App.st && window.Extras && Extras.localSkill);
  await p.evaluate(() => {
    const S = App.S, d = (n, h) => { const x = new Date(Date.now() - n * 864e5); x.setHours(h || 12, 10); return x.toISOString(); };
    S.setSettings({ onboarded: true, name: 'سارة', budget: 250, roles: ['student'], sms_consent_at: new Date().toISOString() });
    const C = [['محاسبة إدارية', [0, 2], '10:00', '11:15', 'S40-2050', '#1A8A8F'], ['تسويق دولي', [1, 3], '13:00', '14:15', 'S20-1043', '#8b5cf6'], ['إحصاء', [0, 2], '08:00', '09:15', 'S1A-12', '#f59e0b'], ['اقتصاد كلي', [1, 3], '11:00', '12:15', 'S40-021', '#ef4444']];
    C.forEach(([n, dd, s, e, r, c], i) => S.upsert('courses', { id: 'c' + i, name: n, type: 'lecture', days: dd, start_time: s, end_time: e, room: r, color: c }));
    [[3.2, 'Costa', 'قهوة', 0, 9], [12.5, 'Lulu', 'بقالة', 1, 19], [4.75, 'Talabat', 'أكل ومطاعم', 1, 21], [8, 'Bapco', 'مواصلات', 2, 8], [2.1, 'Starbucks', 'قهوة', 3, 10]].forEach(([a, m, c, n, h], i) => S.upsert('transactions', { id: 't' + i, kind: 'expense', amount: a, merchant: m, category: c, occurred_at: d(n, h) }));
  });
  await p.addStyleTag({ content: 'html body header.top{padding-top:54px !important} #sb{position:fixed;top:0;left:0;right:0;height:50px;z-index:30;display:flex;justify-content:space-between;align-items:center;padding:14px 34px 0;font:600 16px -apple-system,Helvetica,Arial;color:#E8DCC4;direction:ltr;pointer-events:none} .morning{display:none!important}' });
  await p.evaluate(() => { const x = document.createElement('div'); x.id = 'sb'; x.innerHTML = '<span>9:41</span><span>●●●● ᯤ ▮▮▮▯</span>'; document.body.appendChild(x); });
  const shot = async (n) => { await p.waitForTimeout(900); await p.screenshot({ path: OUT(n) }); };
  await p.evaluate(() => { App.go('money'); scrollTo(0, 0); }); await shot('01_money');
  await p.evaluate(() => App.pasteSmsForm('Purchase of BHD 3.200 at COSTA SEEF using card XXXX4821')); await shot('02_sms');
  await p.evaluate(() => App.closeSheet()); await p.waitForTimeout(400);
  await p.evaluate(() => { App.go('schedule'); scrollTo(0, 0); }); await shot('03_week');
  await p.evaluate(() => Extras.footballImport('برنامج الفريق الأول\nالأربعاء (21/10/2026) تمرين 5:45\nالخميس (22/10/2026) تمرين 5:45\nالسبت (24/10/2026) تمرين 5:45\nالأحد (25/10/2026) مباراة رسمية 5:00'));
  await p.waitForSelector('#impRows li'); await p.evaluate(() => { const t = document.querySelector('[name=txt]'); if (t) t.closest('.field').style.display = 'none'; }); await shot('04_team');
  await p.evaluate(() => App.closeSheet()); await p.waitForTimeout(400);
  await p.evaluate(() => Extras.openAssistant()); await p.waitForTimeout(500);
  for (const q of ['صرفت 1.5 قهوة', 'كم صرفت هالشهر؟']) { await p.fill('#chatForm [name=q]', q); await p.click('#chatForm [type=submit]'); await p.waitForTimeout(250); if (q.startsWith('صرفت')) { await p.click('#chat [data-do]'); await p.waitForTimeout(200); } }
  await shot('05_assistant');
  if (errs.length) console.log('ERRORS', errs);
  await b.close();
})();
