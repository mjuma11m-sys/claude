// node --test site-src/admin/
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./logic.js');

test('parseFils: الدينار بثلاث خانات، والأرقام العربية والفاصلة، ويرفض الغلط', () => {
  assert.equal(L.parseFils('12'), 12000);
  assert.equal(L.parseFils('12.5'), 12500);
  assert.equal(L.parseFils('0.375'), 375);
  assert.equal(L.parseFils('١٢٫٣٤٥'), 12345);
  assert.equal(L.parseFils(' 7,25 '), 7250);
  for (const bad of ['', '-3', '1.2345', 'abc', '1e3', '.5', null]) assert.equal(L.parseFils(bad), null, String(bad));
});

test('fmt: فواصل الآلاف وثلاث خانات، والسالب', () => {
  assert.equal(L.fmt(12345), '12.345');
  assert.equal(L.fmt(37500000), '37,500.000');
  assert.equal(L.fmt(-9425), '-9.425');
  assert.equal(L.fmt(0), '0.000');
});

test('الاشتراكات: الدولار × 0.376، والسنوي ÷ 12، واللي مرة وحدة ما يدخل بالشهري', () => {
  const apple = { amount_minor: 9900, currency: 'USD', period: 'year', active: true };
  assert.equal(L.recFils(apple), 37224); // 99$ = 37.224 د.ب
  assert.equal(L.recMonthly(apple), 3102);
  assert.equal(L.recMonthly({ amount_minor: 9425, currency: 'BHD', period: 'month', active: true }), 9425);
  assert.equal(L.recMonthly({ amount_minor: 2500, currency: 'USD', period: 'once', active: true }), 0);
  assert.equal(L.recMonthly({ amount_minor: 9425, currency: 'BHD', period: 'month', active: false }), 0);
});

const E = [
  { kind: 'income', occurred_on: '2026-10-02', amount_fils: 500000, category: L.OWNER_CAPITAL, product: 'general' },
  { kind: 'income', occurred_on: '2026-10-05', amount_fils: 20000, category: 'مبيعات تطبيقات', product: 'hayati' },
  { kind: 'expense', occurred_on: '2026-10-07', amount_fils: 37224, category: 'رسوم المتاجر', product: 'hayati' },
  { kind: 'expense', occurred_on: '2026-10-09', amount_fils: 9425, category: 'استضافة وسحابة', product: 'general' },
  { kind: 'expense', occurred_on: '2026-09-28', amount_fils: 9425, category: 'استضافة وسحابة', product: 'general' },
  { kind: 'income', occurred_on: '2025-09-30', amount_fils: 999000, category: 'خدمات وعمل حر', product: 'general' },
];

test('ملخص الشهر: دخل ومصروف وصافي وتوزيع حسب البند والتطبيق، وبس الشهر المطلوب', () => {
  const s = L.monthSummary(E, '2026-10');
  assert.equal(s.income, 520000);
  assert.equal(s.expense, 46649);
  assert.equal(s.net, 473351);
  assert.deepEqual(s.byProduct, { hayati: 37224, general: 9425 });
  assert.equal(s.byCategory['استضافة وسحابة'], 9425);
  assert.equal(s.count, 4);
});

test('الميزانية: المتجاوز أول، والصرف بدون ميزانية «غير مخطط»', () => {
  const b = L.budgetStatus([{ category: 'استضافة وسحابة', monthly_fils: 5000 }, { category: 'تصميم ومحتوى', monthly_fils: 10000 }], E, '2026-10');
  assert.equal(b.rows[0].category, 'استضافة وسحابة');
  assert.equal(b.rows[0].over, true);
  assert.equal(b.rows[0].pct, 189);
  assert.equal(b.rows.find((r) => r.category === 'رسوم المتاجر').unplanned, true);
  assert.equal(b.totalBudget, 15000);
  assert.equal(b.totalSpent, 46649);
});

test('حد الضريبة: آخر 12 شهر بس، واستثمار المالك ما ينحسب مبيعات', () => {
  const v = L.vatStatus(E, new Date(2026, 9, 21));
  assert.equal(v.sales, 20000); // 2025-09-30 برا الـ 12 شهر، و500 د.ب استثمار المالك ما تنحسب
  assert.equal(v.level, 'no');
  assert.equal(L.vatStatus([{ kind: 'income', occurred_on: '2026-10-01', amount_fils: 37500000, category: 'اشتراكات' }], new Date(2026, 9, 21)).level, 'must');
  assert.equal(L.vatStatus([{ kind: 'income', occurred_on: '2026-10-01', amount_fils: 20000000, category: 'اشتراكات' }], new Date(2026, 9, 21)).level, 'may');
});

test('الرصيد وآخر الشهور والانتقال بين الشهور', () => {
  assert.equal(L.balance(E), 500000 + 20000 + 999000 - 37224 - 9425 - 9425);
  const m = L.lastMonths(E, 3, new Date(2026, 9, 21));
  assert.deepEqual(m.map((x) => x.m), ['2026-08', '2026-09', '2026-10']);
  assert.equal(m[1].expense, 9425);
  assert.equal(L.shiftYm('2026-01', -1), '2025-12');
  assert.equal(L.shiftYm('2026-12', 1), '2027-01');
});

test('CSV: BOM للعربي، اقتباس الفواصل، وحماية من حقن الصيغ', () => {
  const out = L.csv([{ a: '=HYPERLINK("x")', b: 'نص, فيه فاصلة' }], [['a', 'أ'], ['b', 'ب']]);
  assert.ok(out.startsWith('﻿'));
  assert.ok(out.includes(`"'=HYPERLINK(""x"")"`));
  assert.ok(out.includes('"نص, فيه فاصلة"'));
});

test('الزيارات: آخر 7 و30 يوم، والصفحات بالترتيب', () => {
  const rows = [{ day: '2026-10-21', path: '/', n: 5 }, { day: '2026-10-15', path: '/hayati.html', n: 3 }, { day: '2026-10-14', path: '/', n: 2 }, { day: '2026-09-01', path: '/', n: 99 }];
  const now = new Date(2026, 9, 21);
  assert.deepEqual(L.views(rows, now, 7), { total: 8, pages: [{ path: '/', n: 5 }, { path: '/hayati.html', n: 3 }] });
  assert.equal(L.views(rows, now, 30).total, 10);
  assert.equal(L.views([], now, 7).total, 0);
});
