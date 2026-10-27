// لقطات ريل «رسالة البنك»: بيانات تجريبية (مو بيانات أبو جعفر) بحجم آيفون ×3
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const path = require('path');
const APP = 'file:///home/user/claude/hayati-app/dist/Hayati.html';
const OUT = (n) => path.join(__dirname, 'shots', n + '.png');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'ar-BH', timezoneId: 'Asia/Bahrain', colorScheme: 'light' });
  await p.addInitScript(() => { try { localStorage.setItem('hayati-seen-version', 'v27'); } catch (e) {} });
  await p.goto(APP); await p.waitForFunction(() => window.App);
  await p.evaluate(() => {
    const k = (off) => { const d = new Date(); d.setDate(d.getDate() - off); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    const at = (d, h) => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), d, h || 12, 20).toISOString(); };
    const S = App.S;
    S.setSettings({ budget: 250, sleep_goal: 8, roles: ['student'], prior_gpa: 3.2, prior_credits: 45 });
    const tx = [['COSTA SEEF', 3.2, 1, 'قهوة'], ['Costa Coffee', 2.9, 3, 'قهوة'], ['كوستا', 3.5, 4, 'قهوة'], ['COSTA SEEF', 3.2, 6, 'قهوة'], ['Costa Coffee', 4.1, 7, 'قهوة'], ['كوستا', 3.5, 9, 'قهوة'], ['COSTA CITY CENTRE', 3.6, 10, 'قهوة'], ['Costa Coffee', 2.9, 11, 'قهوة'],
      ['Talabat', 6.8, 2, 'أكل ومطاعم'], ['TALABAT BH', 9.1, 5, 'أكل ومطاعم'], ['Talabat', 7.4, 8, 'أكل ومطاعم'], ['LULU HYPERMARKET', 24, 6, 'بقالة وتسوق'], ['Bapco Juffair', 8, 3, 'مواصلات وبنزين'], ['Bapco', 8, 10, 'مواصلات وبنزين'],
      ['Shake Shack', 7.9, 4, 'أكل ومطاعم'], ['Batelco', 12, 1, 'فواتير واتصالات'], ['Jawad', 5.3, 9, 'بقالة وتسوق'], ['Nike Store', 38, 7, 'أخرى'], ['Tim Hortons', 2.6, 11, 'قهوة'], ['Careem', 3.4, 11, 'مواصلات وبنزين']];
    tx.forEach(([m, a, d, c], i) => S.upsert('transactions', { id: 'tx' + i, kind: 'expense', amount: a, merchant: m, category: c, occurred_at: at(d, 9 + (i % 10)) }));
    const lm = (d, h) => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth() - 1, d, h || 12, 20).toISOString(); };
    tx.forEach(([m, a, d, c], i) => S.upsert('transactions', { id: 'lm' + i, kind: 'expense', amount: +(a * 1.15).toFixed(3), merchant: m, category: c, occurred_at: lm(d + 12, 9 + (i % 10)) }));
    S.upsert('transactions', { id: 'lminc', kind: 'income', amount: 300, merchant: 'الراتب', category: 'راتب', occurred_at: lm(25, 10) });
    S.upsert('transactions', { id: 'inc', kind: 'income', amount: 200, merchant: 'مكافأة الجامعة', category: 'مكافأة', occurred_at: at(1, 10) });
    const today = new Date().getDay(), yest = (today + 6) % 7;
    S.upsert('courses', { id: 'c1', name: 'محاسبة إدارية', type: 'lecture', days: [today], start_time: '10:00', end_time: '11:15', room: 'S40-2050', color: '#1A8A8F' });
    S.upsert('courses', { id: 'c2', name: 'تسويق دولي', type: 'lecture', days: [today], start_time: '13:00', end_time: '14:15', room: 'S20-1043', color: '#8b5cf6' });
    S.upsert('courses', { id: 'c3', name: 'تمرين الفريق', type: 'activity', days: [yest, (today + 2) % 7], start_time: '18:00', end_time: '20:00', room: 'ملعب النادي', color: '#10b981' });
    for (let i = 1; i <= 7; i++) S.upsert('daily', { id: 'n' + i, date: k(i), watch: true, sleep: [7.6, 7.9, 8.1, 7.4, 7.8, 8.2, 7.7][i - 1], hrv: [61, 58, 63, 57, 60, 64, 59][i - 1], rhr: 52 });
    S.upsert('daily', { id: 'n0', date: k(0), watch: true, sleep: 6.1, hrv: 46, rhr: 57, sleep_deep: 0.9, sleep_rem: 1.2, sleep_core: 4.0, steps: 3200 });
    S.upsert('matches', { id: 'm1', date: k(1), opponent: 'نادي المحرق', comp: 'league', for: 2, against: 1, saves: 6, minutes: 90, rating: 8 });
    S.upsert('tasks', { id: 'tk1', title: 'تقرير التسويق الدولي', kind: 'homework', due_at: new Date(Date.now() + 2 * 864e5).toISOString() });
    S.upsert('tasks', { id: 'tk2', title: 'اختبار المحاسبة', kind: 'exam', due_at: new Date(Date.now() + 6 * 864e5).toISOString() });
    try { localStorage.setItem('hayati-morning', JSON.stringify({ [new Date().toDateString()]: 1 })); } catch (e) {}
  });
  // شريط حالة آيفون فوق (الجزيرة تتحط بالفيديو)
  await p.addStyleTag({ content: 'html body header.top{padding-top:54px !important} #sb{position:fixed;top:0;left:0;right:0;height:50px;z-index:30;display:flex;justify-content:space-between;align-items:center;padding:14px 34px 0;font:600 16px -apple-system,Helvetica,Arial;color:#0B2328;direction:ltr;pointer-events:none} .morning{display:none!important}' });
  await p.evaluate(() => { const d = document.createElement('div'); d.id = 'sb'; d.innerHTML = '<span>9:41</span><span>●●●● ᯤ ▮▮▮▯</span>'; document.body.appendChild(d); });

  await p.evaluate(() => {
    const S = App.S; const d = (o) => new Date(Date.now() + o * 864e5).toISOString().slice(0, 10);
    [['Netflix', 3.5, 5, 'ترفيه'], ['Spotify', 2.4, 12, 'ترفيه'], ['iCloud 200GB', 1.1, 18, 'فواتير واتصالات'], ['النادي الرياضي', 25, 1, 'رياضة'], ['ChatGPT Plus', 7.6, 22, 'أخرى']].forEach(([name, amount, day, category], i) =>
      S.upsert('subscriptions', { id: 'sb' + i, name, amount, cycle: 'monthly', day, category, remind_days: 1, active: true, start_date: d(-90) }));
    S.upsert('goals', { id: 'g1', name: 'لابتوب جديد', emoji: '💻', target: 450, saved: 310, deadline: d(60), color: '#1A8A8F', done: false });
    S.upsert('goals', { id: 'g2', name: 'عمرة', emoji: '🕋', target: 600, saved: 180, deadline: d(150), color: '#8b5cf6', done: false });
    S.upsert('goals', { id: 'g3', name: 'تذاكر مباراة', emoji: '⚽', target: 40, saved: 40, color: '#10b981', done: true });
    [['أحمد', 12.5, 'lent', 'عشا كرك ومشاوي'], ['علي', 6, 'lent', 'تذكرة سينما'], ['حسين', 20, 'borrowed', 'بنزين الرحلة'], ['يوسف', 3.75, 'lent', 'قهوة']].forEach(([person, amount, direction, note], i) =>
      S.upsert('debts', { id: 'db' + i, person, amount, direction, note, occurred_at: new Date(Date.now() - (i + 1) * 864e5).toISOString(), settled: false }));
    [['محاسبة إدارية', 3, 'A'], ['تسويق دولي', 3, 'B+'], ['إحصاء', 3, 'A-'], ['لغة إنجليزية', 2, 'B']].forEach(([course_name, credits, grade], i) =>
      S.upsert('grades', { id: 'gr' + i, semester: 'خريف 2026', course_name, credits, grade }));
    ['حليب', 'خبز صمون', 'دجاج', 'رز بسمتي', 'بصل', 'طماط', 'لبن'].forEach((name, i) => S.upsert('shopping', { id: 'sh' + i, name, qty: null, done: i < 2 }));
  });
  const shot = async (n) => { await p.waitForTimeout(1000); await p.screenshot({ path: OUT(n) }); };
  const seg = async (t) => { await p.click('.seg >> text=' + t).catch(async () => { await p.click('text=' + t); }); await p.waitForTimeout(700); };
  await p.evaluate(() => App.go('money')); await p.waitForTimeout(600);
  await seg('اشتراكات'); await shot('subs');
  await seg('أهداف'); await shot('goals');
  await seg('لي وعلي'); await shot('debts');
  await seg('العمليات');
  await p.evaluate(() => App.go('tasks')); await shot('tasks');
  for (const tab of ['schedule', 'study']) { try { await p.evaluate((t) => App.go(t), tab); await p.waitForTimeout(500); } catch (e) {} }
  try { await seg('المعدل'); await shot('gpa'); } catch (e) { console.log('gpa', e.message); }
  try { await seg('المذاكرة'); await shot('focus'); } catch (e) { console.log('focus', e.message); }
  await b.close();
})();
