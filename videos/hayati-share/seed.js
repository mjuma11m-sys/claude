// نفس البيانات التجريبية حق صور المتجر (hayati-app/store/build.js)
module.exports = function seed() {
  const k = (off) => { const d = new Date(); d.setDate(d.getDate() - off); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const at = (d, h) => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), Math.max(1, n.getDate() - d), h || 12, 20).toISOString(); };
  const S = App.S;
  S.setSettings({ budget: 250, sleep_goal: 8, name: 'سارة', roles: ['student', 'athlete'], onboarded: true, prayer_method: 'gulf' });
  const tx = [['COSTA SEEF', 3.2, 1, 'قهوة'], ['Costa Coffee', 2.9, 3, 'قهوة'], ['كوستا', 3.5, 4, 'قهوة'], ['COSTA SEEF', 3.2, 6, 'قهوة'], ['Costa Coffee', 4.1, 7, 'قهوة'],
    ['Talabat', 6.8, 2, 'أكل ومطاعم'], ['TALABAT BH', 9.1, 5, 'أكل ومطاعم'], ['LULU HYPERMARKET', 24, 6, 'بقالة وتسوق'], ['Bapco Juffair', 8, 3, 'مواصلات وبنزين'],
    ['Shake Shack', 7.9, 4, 'أكل ومطاعم'], ['Batelco', 12, 1, 'فواتير واتصالات'], ['Jawad', 5.3, 0, 'بقالة وتسوق'], ['Careem', 3.4, 0, 'مواصلات وبنزين']];
  tx.forEach(([m, a, d, c], i) => S.upsert('transactions', { id: 'tx' + i, kind: 'expense', amount: a, merchant: m, category: c, occurred_at: at(d, 9 + (i % 10)) }));
  S.upsert('transactions', { id: 'inc', kind: 'income', amount: 200, merchant: 'مكافأة الجامعة', category: 'مكافأة', occurred_at: at(2, 10) });
  const today = new Date().getDay();
  S.upsert('courses', { id: 'c1', name: 'محاسبة إدارية', type: 'lecture', days: [today, (today + 2) % 7], start_time: '10:00', end_time: '11:15', room: 'S40-2050', color: '#1A8A8F' });
  S.upsert('courses', { id: 'c2', name: 'تسويق دولي', type: 'lecture', days: [today, (today + 2) % 7], start_time: '13:00', end_time: '14:15', room: 'S20-1043', color: '#8b5cf6' });
  S.upsert('courses', { id: 'c3', name: 'تمرين الفريق', type: 'gym', days: [(today + 1) % 7, (today + 3) % 7], start_time: '18:00', end_time: '20:00', room: 'ملعب النادي', color: '#10b981' });
  S.upsert('tasks', { id: 'tk1', title: 'تقرير التسويق الدولي', kind: 'homework', due_at: new Date(Date.now() + 2 * 864e5).toISOString() });
  S.upsert('tasks', { id: 'tk2', title: 'اختبار المحاسبة', kind: 'exam', due_at: new Date(Date.now() + 6 * 864e5).toISOString() });
  for (let i = 1; i <= 7; i++) S.upsert('daily', { id: 'n' + i, date: k(i), watch: true, sleep: [7.6, 7.9, 8.1, 7.4, 7.8, 8.2, 7.7][i - 1], hrv: [61, 58, 63, 57, 60, 64, 59][i - 1], rhr: 52 });
  try { localStorage.setItem('hayati-morning', JSON.stringify({ [new Date().toDateString()]: 1 })); } catch (e) { /* تجاهل */ }
};
