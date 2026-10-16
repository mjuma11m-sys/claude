// بيانات تجريبية «طبيعية» للإعلان: أرقام غير مدوّرة، راتب يوم 25، وشهرين كاملين من المصاريف
// (تظل تجريبية، والفيديو مكتوب عليه «* لقطات ببيانات تجريبية»)
module.exports = function seed() {
  const day = (off, h, m) => { const d = new Date(); d.setDate(d.getDate() - off); d.setHours(h || 12, m || 20, 0, 0); return d.toISOString(); };
  const k = (off) => { const d = new Date(); d.setDate(d.getDate() - off); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const S = App.S;
  S.setSettings({ budget: 380, sleep_goal: 8, name: 'سارة', roles: ['student'], onboarded: true, prayer_method: 'gulf', payday: 25 });
  // الراتب (دوام جزئي) يوم 25 من كل شهر
  const back25 = (n) => { const d = new Date(); d.setMonth(d.getMonth() - n, 25); d.setHours(9, 5, 0, 0); return d.toISOString(); };
  [0, 1, 2].forEach((n) => { if (new Date(back25(n)) <= new Date()) S.upsert('transactions', { id: 'sal' + n, kind: 'income', amount: 485.750, merchant: 'الراتب', category: 'راتب', occurred_at: back25(n) }); });
  // [التاجر، المبلغ، قبل كم يوم، الفئة]
  const tx = [
    ['Costa Coffee', 2.300, 0, 'قهوة'], ['Careem', 3.150, 0, 'مواصلات وبنزين'], ['Jawad', 4.875, 1, 'بقالة وتسوق'], ['Talabat', 6.950, 1, 'أكل ومطاعم'],
    ['Caribou Coffee', 2.600, 2, 'قهوة'], ['Bapco Seef', 7.000, 3, 'مواصلات وبنزين'], ['LuLu Hypermarket', 18.640, 4, 'بقالة وتسوق'], ['Costa Coffee', 2.300, 4, 'قهوة'],
    ['Shake Shack', 6.450, 5, 'أكل ومطاعم'], ['Batelco', 15.750, 6, 'فواتير واتصالات'], ['Talabat', 11.200, 7, 'أكل ومطاعم'], ['Al Osra', 9.315, 8, 'بقالة وتسوق'],
    ['Caribou Coffee', 1.900, 9, 'قهوة'], ['Bapco Juffair', 6.500, 10, 'مواصلات وبنزين'], ['Max Fashion', 13.900, 11, 'ملابس'], ['Talabat', 5.400, 12, 'أكل ومطاعم'],
    ['Costa Coffee', 2.300, 13, 'قهوة'], ['Fitness Time', 25.000, 14, 'صحة ورياضة'], ['LuLu Hypermarket', 22.480, 15, 'بقالة وتسوق'], ['Careem', 2.850, 16, 'مواصلات وبنزين'],
    ['Haji Gahwa', 3.500, 17, 'قهوة'], ['Netflix', 3.900, 18, 'اشتراكات'],
    // الدورة اللي قبل
    ['Talabat', 8.650, 21, 'أكل ومطاعم'], ['LuLu Hypermarket', 27.330, 23, 'بقالة وتسوق'], ['Bapco Seef', 7.000, 24, 'مواصلات وبنزين'], ['Costa Coffee', 2.300, 25, 'قهوة'],
    ['Batelco', 15.750, 36, 'فواتير واتصالات'], ['Shake Shack', 7.900, 27, 'أكل ومطاعم'], ['Jawad', 6.120, 28, 'بقالة وتسوق'], ['Fitness Time', 25.000, 44, 'صحة ورياضة'],
    ['Talabat', 12.300, 30, 'أكل ومطاعم'], ['Caribou Coffee', 2.600, 31, 'قهوة'], ['Bapco Juffair', 6.500, 33, 'مواصلات وبنزين'], ['City Centre', 21.500, 35, 'ملابس'],
    ['Talabat', 9.850, 37, 'أكل ومطاعم'], ['Al Osra', 14.205, 38, 'بقالة وتسوق'], ['Costa Coffee', 2.300, 40, 'قهوة'], ['Careem', 4.100, 41, 'مواصلات وبنزين'],
    ['Netflix', 3.900, 48, 'اشتراكات'], ['LuLu Hypermarket', 19.760, 42, 'بقالة وتسوق'],
    ['Talabat', 10.450, 46, 'أكل ومطاعم'], ['LuLu Hypermarket', 24.910, 50, 'بقالة وتسوق'], ['Bapco Seef', 7.000, 52, 'مواصلات وبنزين'], ['Costa Coffee', 2.300, 53, 'قهوة'],
    ['Jawad', 8.735, 55, 'بقالة وتسوق'], ['Shake Shack', 6.450, 56, 'أكل ومطاعم'], ['Talabat', 7.600, 57, 'أكل ومطاعم'], ['Al Osra', 11.840, 58, 'بقالة وتسوق'],
    ['Caribou Coffee', 2.600, 59, 'قهوة'], ['Careem', 3.400, 60, 'مواصلات وبنزين'],
  ];
  tx.forEach(([m, a, d, c], i) => S.upsert('transactions', { id: 'tx' + i, kind: 'expense', amount: a, merchant: m, category: c, occurred_at: day(d, 8 + (i % 12), (i * 7) % 60) }));
  const today = new Date().getDay();
  S.upsert('courses', { id: 'c1', name: 'محاسبة إدارية', type: 'lecture', days: [today, (today + 2) % 7], start_time: '17:00', end_time: '18:15', room: 'S40-2050', color: '#1A8A8F' });
  S.upsert('courses', { id: 'c2', name: 'تسويق دولي', type: 'lecture', days: [today, (today + 2) % 7], start_time: '18:30', end_time: '19:45', room: 'S20-1043', color: '#8b5cf6' });
  S.upsert('tasks', { id: 'tk1', title: 'تقرير التسويق الدولي', kind: 'homework', due_at: new Date(Date.now() + 2 * 864e5).toISOString() });
  S.upsert('tasks', { id: 'tk2', title: 'اختبار المحاسبة', kind: 'exam', due_at: new Date(Date.now() + 6 * 864e5).toISOString() });
  for (let i = 1; i <= 7; i++) S.upsert('daily', { id: 'n' + i, date: k(i), watch: true, sleep: [7.2, 6.8, 7.5, 7.1, 6.9, 7.8, 7.3][i - 1], hrv: [54, 51, 58, 55, 50, 60, 56][i - 1], rhr: 61 });
  try { localStorage.setItem('hayati-morning', JSON.stringify({ [new Date().toDateString()]: 1 })); } catch (e) { /* تجاهل */ }
};
