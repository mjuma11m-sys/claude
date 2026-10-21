/* لوحة إدارة ودقة (DW-052) — الحساب بس، بدون واجهة. المبالغ كلها بالفلس (integer): 1 د.ب = 1000 فلس.
   يشتغل بالمتصفح (window.AdminLogic) وبـ node للاختبارات (module.exports). */
(function (root) {
  'use strict';

  const USD_TO_BHD = 0.376; // الدينار مربوط بالدولار
  const VAT_MANDATORY = 37500000; // حد التسجيل الإلزامي بضريبة القيمة المضافة: 37,500 د.ب سنوياً
  const VAT_VOLUNTARY = 18750000; // حد التسجيل الاختياري: 18,750 د.ب
  const OWNER_CAPITAL = 'استثمار من المالك'; // دخل بالدفتر بس مو مبيعات، فما ينحسب بحد الضريبة

  const EXPENSE_CATS = ['استضافة وسحابة', 'أدوات وبرامج', 'ذكاء اصطناعي', 'رسوم المتاجر', 'دومين وإيميل', 'تصميم ومحتوى', 'إعلانات وتسويق', 'تسجيل وقانوني', 'أجهزة', 'أخرى'];
  const INCOME_CATS = ['مبيعات تطبيقات', 'اشتراكات', 'خدمات وعمل حر', OWNER_CAPITAL, 'أخرى'];
  const PRODUCTS = [['general', 'عام'], ['hayati', 'حياتي'], ['idarati', 'إداراتي'], ['sports-hub', 'Sports Hub'], ['wadqa-site', 'موقع ودقة']];
  const PERIODS = [['month', 'شهري'], ['year', 'سنوي'], ['once', 'مرة وحدة']];

  // «12.5» ← 12500. يرفض السالب وأكثر من 3 خانات عشرية وأي شي مو رقم. يقبل الأرقام العربية والفاصلة «٫».
  function parseFils(input) {
    let s = String(input == null ? '' : input).trim()
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .replace(/[٫,]/g, '.').replace(/\s/g, '');
    if (!/^\d+(\.\d{1,3})?$/.test(s)) return null;
    const [whole, frac = ''] = s.split('.');
    const fils = Number(whole) * 1000 + Number((frac + '000').slice(0, 3));
    return Number.isSafeInteger(fils) ? fils : null;
  }

  // 12345 ← «12.345» (بفواصل الآلاف)
  function fmt(fils) {
    const n = Math.round(Number(fils) || 0), neg = n < 0, a = Math.abs(n);
    const whole = String(Math.floor(a / 1000)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + whole + '.' + String(a % 1000).padStart(3, '0');
  }

  // مبلغ الاشتراك بالفلس: الدينار كما هو، والدولار (بالسنت) × 0.376
  const recFils = (r) => (r.currency === 'USD' ? Math.round(Number(r.amount_minor) * USD_TO_BHD * 10) : Number(r.amount_minor));
  // كلفته الشهرية: السنوي ÷ 12، واللي مرة وحدة ما يدخل بالشهري
  const recMonthly = (r) => (!r.active || r.period === 'once' ? 0 : r.period === 'year' ? Math.round(recFils(r) / 12) : recFils(r));

  const ym = (d) => String(d).slice(0, 7); // «2026-10-21» ← «2026-10»
  const ymOf = (date) => date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
  function shiftYm(m, by) {
    const [y, mo] = m.split('-').map(Number);
    const d = new Date(y, mo - 1 + by, 1);
    return ymOf(d);
  }

  function monthSummary(entries, m) {
    const out = { income: 0, expense: 0, net: 0, byCategory: {}, byProduct: {}, count: 0 };
    for (const e of entries) {
      if (ym(e.occurred_on) !== m) continue;
      const v = Number(e.amount_fils);
      out.count++;
      if (e.kind === 'income') out.income += v;
      else {
        out.expense += v;
        out.byCategory[e.category] = (out.byCategory[e.category] || 0) + v;
        out.byProduct[e.product || 'general'] = (out.byProduct[e.product || 'general'] || 0) + v;
      }
    }
    out.net = out.income - out.expense;
    return out;
  }

  // الميزانية مقابل الصرف بالشهر: كل بند له ميزانية أو صرف
  function budgetStatus(budgets, entries, m) {
    const spent = monthSummary(entries, m).byCategory;
    const cats = new Set([...budgets.map((b) => b.category), ...Object.keys(spent)]);
    const rows = [...cats].map((category) => {
      const b = budgets.find((x) => x.category === category);
      const budget = b ? Number(b.monthly_fils) : 0, s = spent[category] || 0;
      return { category, budget, spent: s, left: budget - s, pct: budget ? Math.round((s / budget) * 100) : null, over: budget > 0 && s > budget, unplanned: !budget && s > 0 };
    });
    rows.sort((a, b) => (b.over - a.over) || (b.spent - a.spent));
    const totalBudget = rows.reduce((t, r) => t + r.budget, 0), totalSpent = rows.reduce((t, r) => t + r.spent, 0);
    return { rows, totalBudget, totalSpent, left: totalBudget - totalSpent };
  }

  // الرصيد من البداية: كل الدخل (مع استثمار المالك) ناقص كل المصروف
  const balance = (entries) => entries.reduce((t, e) => t + (e.kind === 'income' ? 1 : -1) * Number(e.amount_fils), 0);

  // المبيعات آخر 12 شهر (بدون استثمار المالك) مقابل حدود التسجيل الضريبي
  function vatStatus(entries, today) {
    const from = new Date(today.getFullYear(), today.getMonth() - 11, 1);
    const fromStr = from.getFullYear() + '-' + String(from.getMonth() + 1).padStart(2, '0') + '-01';
    const sales = entries.filter((e) => e.kind === 'income' && e.category !== OWNER_CAPITAL && String(e.occurred_on) >= fromStr)
      .reduce((t, e) => t + Number(e.amount_fils), 0);
    return {
      sales, mandatory: VAT_MANDATORY, voluntary: VAT_VOLUNTARY,
      pct: Math.min(100, Math.round((sales / VAT_MANDATORY) * 1000) / 10),
      level: sales >= VAT_MANDATORY ? 'must' : sales >= VAT_VOLUNTARY ? 'may' : 'no',
    };
  }

  // آخر n شهر للرسم: الأقدم أول
  function lastMonths(entries, n, today) {
    const now = ymOf(today), out = [];
    for (let i = n - 1; i >= 0; i--) {
      const m = shiftYm(now, -i), s = monthSummary(entries, m);
      out.push({ m, income: s.income, expense: s.expense });
    }
    return out;
  }

  // CSV يفتح عربي صح بـ Excel (BOM)، وأي خلية تبدأ بـ = + - @ تنحمى (حقن صيغ)
  function csv(rows, cols) {
    const cell = (v) => {
      let s = v == null ? '' : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return '﻿' + [cols.map((c) => cell(c[1])).join(',')].concat(rows.map((r) => cols.map((c) => cell(typeof c[0] === 'function' ? c[0](r) : r[c[0]])).join(','))).join('\r\n');
  }

  const api = { USD_TO_BHD, VAT_MANDATORY, VAT_VOLUNTARY, OWNER_CAPITAL, EXPENSE_CATS, INCOME_CATS, PRODUCTS, PERIODS,
    parseFils, fmt, recFils, recMonthly, ym, ymOf, shiftYm, monthSummary, budgetStatus, balance, vatStatus, lastMonths, csv };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AdminLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
