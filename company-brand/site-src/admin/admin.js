/* لوحة إدارة ودقة (DW-052). الحماية الحقيقية بالقاعدة (RLS: بس wadqa.admins)، والصفحة نفسها ثابتة.
   ?demo=1 ← بيانات تجريبية بالذاكرة بدون أي اتصال (للعرض والاختبار). */
(function () {
  'use strict';
  const L = window.AdminLogic;
  const $ = (s, r = document) => r.querySelector(s);
  const app = $('#app');
  const h = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => new Date();
  const isoDay = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const monthName = (m) => { const [y, mo] = m.split('-').map(Number); return MONTHS[mo - 1] + ' ' + y; };
  const prodName = (k) => (L.PRODUCTS.find((p) => p[0] === k) || [k, k])[1];
  const periodName = (k) => (L.PERIODS.find((p) => p[0] === k) || [k, k])[1];
  const money = (f, cls = '') => '<span class="num ' + cls + '">' + L.fmt(f) + '</span>';
  const TABS = [['summary', 'الملخص'], ['ledger', 'الدفتر'], ['budget', 'الميزانية'], ['recurring', 'الاشتراكات'], ['leads', 'الطلبات'], ['visits', 'الزيارات'], ['files', 'الملفات']];
  // أسعار تقديرية تعبّي النموذج بس — المالك يتأكد من السعر قبل الحفظ
  const PRESETS = [
    ['Apple Developer Program', 9900, 'USD', 'year', 'رسوم المتاجر', 'hayati'],
    ['Google Play (تسجيل)', 2500, 'USD', 'once', 'رسوم المتاجر', 'hayati'],
    ['Supabase Pro', 2500, 'USD', 'month', 'استضافة وسحابة', 'general'],
    ['Vercel Pro', 2000, 'USD', 'month', 'استضافة وسحابة', 'general'],
    ['دومين wadqa', 1500, 'USD', 'year', 'دومين وإيميل', 'wadqa-site'],
  ];

  const S = { demo: /[?&]demo=1\b/.test(location.search), sb: null, email: '', entries: [], budgets: [], recurring: [], leads: [], visits: [], docs: [], docBody: {}, month: L.ymOf(today()), edit: null, form: null, kind: 'expense', q: '', leadProduct: '' };

  // ———— البيانات ————
  function demoData() {
    const m = L.ymOf(today()), p = L.shiftYm(m, -1), pp = L.shiftYm(m, -2);
    const id = () => Math.random().toString(36).slice(2);
    S.entries = [
      [m + '-02', 'income', 300000, L.OWNER_CAPITAL, 'general', 'تحويل'],
      [m + '-05', 'expense', 37224, 'رسوم المتاجر', 'hayati', 'بطاقة', 'Apple Developer'],
      [m + '-08', 'expense', 9400, 'استضافة وسحابة', 'general', 'بطاقة', 'Supabase'],
      [m + '-11', 'expense', 7520, 'ذكاء اصطناعي', 'hayati', 'بطاقة'],
      [m + '-14', 'income', 45000, 'خدمات وعمل حر', 'general', 'BenefitPay', 'تصميم شعار'],
      [p + '-03', 'expense', 9400, 'استضافة وسحابة', 'general', 'بطاقة'],
      [p + '-19', 'expense', 25000, 'إعلانات وتسويق', 'hayati', 'بطاقة'],
      [p + '-22', 'income', 60000, 'خدمات وعمل حر', 'general', 'تحويل'],
      [pp + '-06', 'expense', 9400, 'استضافة وسحابة', 'general', 'بطاقة'],
      [pp + '-10', 'expense', 9400, 'رسوم المتاجر', 'hayati', 'بطاقة', 'Google Play'],
    ].map(([d, kind, amount_fils, category, product, method, note]) => ({ id: id(), occurred_on: d, kind, amount_fils, category, product, method, note: note || null }));
    S.budgets = [{ category: 'استضافة وسحابة', monthly_fils: 10000 }, { category: 'ذكاء اصطناعي', monthly_fils: 5000 }, { category: 'إعلانات وتسويق', monthly_fils: 30000 }];
    S.recurring = [
      { id: id(), name: 'Apple Developer Program', amount_minor: 9900, currency: 'USD', period: 'year', category: 'رسوم المتاجر', product: 'hayati', active: true, next_due: L.shiftYm(m, 11) + '-05' },
      { id: id(), name: 'Supabase Pro', amount_minor: 2500, currency: 'USD', period: 'month', category: 'استضافة وسحابة', product: 'general', active: true, next_due: L.shiftYm(m, 1) + '-08' },
    ];
    S.visits = [['/', 14], ['/hayati.html', 9], ['/idarati.html', 4], ['/en/', 3]].flatMap(([path, n], k) => [0, 3, 12].map((ago) => ({ day: new Date(Date.now() - ago * 864e5).toISOString().slice(0, 10), path, n: Math.max(1, n - ago - k) })));
    S.leads = [
      { id: 1, created_at: new Date().toISOString(), kind: 'waitlist', product: 'hayati', name: 'مختبر تجريبي', email: 'tester@example.com', message: 'أندرويد · Samsung', lang: 'ar' },
      { id: 3, created_at: new Date().toISOString(), kind: 'tester', product: 'hayati', name: 'مختبر تجريبي ٢', email: 'tester2@example.com', message: 'أندرويد · Samsung A54', lang: 'ar' },
      { id: 2, created_at: new Date(Date.now() - 864e5).toISOString(), kind: 'contact', product: 'general', name: null, email: 'hello@example.com', message: 'أبي تطبيق لمحلي', lang: 'ar' },
    ];
  }

  async function q(p) { const { data, error } = await p; if (error) throw error; return data; }
  const store = {
    async load() {
      if (S.demo) return;
      const [e, b, r, l, d, v] = await Promise.all([
        q(S.sb.from('wadqa_entries').select('*').order('occurred_on', { ascending: false }).order('created_at', { ascending: false }).limit(5000)),
        q(S.sb.from('wadqa_budgets').select('*')),
        q(S.sb.from('wadqa_recurring').select('*').order('created_at')),
        q(S.sb.rpc('wadqa_admin_leads')),
        q(S.sb.from('wadqa_docs').select('slug,title,updated_at').order('sort')),
        q(S.sb.rpc('wadqa_admin_views')).catch(() => []),
      ]);
      S.entries = e; S.budgets = b; S.recurring = r; S.leads = l || []; S.docs = d || []; S.visits = v || [];
    },
    async saveEntry(row) {
      if (S.demo) { if (row.id) Object.assign(S.entries.find((x) => x.id === row.id), row); else S.entries.unshift({ ...row, id: Math.random().toString(36).slice(2) }); return; }
      if (row.id) { const { id, ...rest } = row; await q(S.sb.from('wadqa_entries').update(rest).eq('id', id)); } else await q(S.sb.from('wadqa_entries').insert(row));
    },
    // نص الملف ينحمّل لما ينفتح بس (القائمة خفيفة)
    async doc(slug) {
      if (S.docBody[slug] != null) return S.docBody[slug];
      if (S.demo) return '';
      const row = await q(S.sb.from('wadqa_docs').select('body').eq('slug', slug).single());
      return (S.docBody[slug] = row.body);
    },
    async removeEntry(id) { if (S.demo) { S.entries = S.entries.filter((x) => x.id !== id); return; } await q(S.sb.from('wadqa_entries').delete().eq('id', id)); },
    async saveBudget(category, monthly_fils) {
      if (S.demo) { S.budgets = S.budgets.filter((b) => b.category !== category); if (monthly_fils) S.budgets.push({ category, monthly_fils }); return; }
      if (monthly_fils) await q(S.sb.from('wadqa_budgets').upsert({ category, monthly_fils, updated_at: new Date().toISOString() }));
      else await q(S.sb.from('wadqa_budgets').delete().eq('category', category));
    },
    async saveRec(row) {
      if (S.demo) { if (row.id) Object.assign(S.recurring.find((x) => x.id === row.id), row); else S.recurring.push({ ...row, id: Math.random().toString(36).slice(2) }); return; }
      if (row.id) { const { id, ...rest } = row; await q(S.sb.from('wadqa_recurring').update(rest).eq('id', id)); } else await q(S.sb.from('wadqa_recurring').insert(row));
    },
    async removeRec(id) { if (S.demo) { S.recurring = S.recurring.filter((x) => x.id !== id); return; } await q(S.sb.from('wadqa_recurring').delete().eq('id', id)); },
  };

  // ———— أدوات ————
  let toastT;
  function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 2400); }
  const errText = (e) => {
    const m = String((e && (e.message || e.error_description)) || e);
    if (/Invalid login credentials/i.test(m)) return 'الإيميل أو كلمة السر غلط';
    if (/Email not confirmed/i.test(m)) return 'الإيميل ما تأكد للحين';
    if (/row-level security|not allowed|permission denied/i.test(m)) return 'هالحساب ما عنده صلاحية';
    if (/Failed to fetch|NetworkError|network/i.test(m)) return 'ما قدرنا نوصل. تأكد من الإنترنت';
    if (/mfa.*(disabled|not enabled)|enroll.*disabled/i.test(m)) return 'التحقق بخطوتين مقفل بالمشروع: Supabase ← Authentication ← Multi-Factor ← فعّل TOTP';
    return m;
  };
  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  // CSP ما يسمح style="" بالـ HTML، فالعرض والارتفاع ينحطون من JS بعد الرسم
  function paintBars() {
    app.querySelectorAll('[data-w]').forEach((el) => { el.style.width = Math.max(0, Math.min(100, Number(el.dataset.w))) + '%'; });
    app.querySelectorAll('[data-hh]').forEach((el) => { el.style.height = Math.max(0, Math.min(100, Number(el.dataset.hh))) + '%'; });
  }
  const options = (list, cur) => list.map((x) => { const [v, t] = Array.isArray(x) ? x : [x, x]; return '<option value="' + h(v) + '"' + (v === cur ? ' selected' : '') + '>' + h(t) + '</option>'; }).join('');

  // ———— الدخول ————
  function loginView(msg) {
    $('#who').hidden = true;
    app.innerHTML = '<form class="card login" id="loginForm" novalidate>' +
      '<h1>إدارة ودقة</h1><p class="muted">للمالك بس. نفس حسابك بحياتي.</p>' +
      '<div class="field"><label for="em">الإيميل</label><input id="em" name="email" type="email" autocomplete="username" dir="ltr" required></div>' +
      '<div class="field"><label for="pw">كلمة السر</label><input id="pw" name="password" type="password" autocomplete="current-password" dir="ltr" required></div>' +
      '<p class="err" id="loginErr">' + h(msg || '') + '</p>' +
      '<button class="btn solid block" type="submit">دخول</button>' +
      // حساب المالك انسوّى بـ Google (بدون كلمة سر)، فالدخول بـ Google لازم يكون هني
      '<div class="or"><span>أو</span></div><button class="btn block" type="button" data-act="google">الدخول بـ Google</button>' +
      '<p class="note">نسيت كلمة السر؟ غيّرها من «حياتي» ← حسابك. <a href="?demo=1">جرّب ببيانات تجريبية</a></p></form>';
  }
  async function afterLogin() {
    const { data } = await S.sb.auth.getSession();
    if (!data.session) return loginView();
    // رجعنا من Google بـ ?code=…: الجلسة انحفظت، فننظف الرابط
    if (/[?&]code=/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash);
    S.email = data.session.user.email || '';
    $('#whoEmail').textContent = S.email; $('#who').hidden = false;
    const { data: ok, error } = await S.sb.rpc('wadqa_is_admin');
    if (error || !ok) { app.innerHTML = '<div class="card login"><h1>ما عندك صلاحية</h1><p class="muted">الحساب <b dir="ltr">' + h(S.email) + '</b> مو مسجّل كإدارة لودقة.</p><p class="note">لو هذا حسابك، تأكد إنك دخلت بالإيميل الصح.</p></div>'; return; }
    try { if (!(await mfaGate())) return; } catch (e) { app.innerHTML = '<div class="card login"><h1>التحقق بخطوتين</h1><p class="err">' + h(errText(e)) + '</p></div>'; return; }
    app.innerHTML = '<p class="muted center">يحمّل البيانات…</p>';
    try { await store.load(); } catch (e) { app.innerHTML = '<div class="card login"><h1>صار خطأ</h1><p class="err">' + h(errText(e)) + '</p></div>'; return; }
    render();
  }

  // ———— التحقق بخطوتين (TOTP) ————
  // القاعدة ما تعطي ولا صف بدون aal2 (wadqa_admin_ok)، فهذي البوابة مو بس شكل: بدونها اللوحة فاضية.
  async function mfaGate() {
    const { data: aal, error: aErr } = await S.sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aErr) throw aErr;
    if (aal && aal.currentLevel === 'aal2') return true;
    const { data: f, error } = await S.sb.auth.mfa.listFactors();
    if (error) throw error;
    const verified = (f.totp || []).filter((x) => x.status === 'verified');
    if (verified.length) { mfaView(verified[0].id); return false; }
    // محاولة ربط سابقة ما كملت (سكّر الصفحة قبل الرمز): نشيلها ونبدأ من جديد
    for (const x of (f.all || []).filter((x) => x.factor_type === 'totp' && x.status !== 'verified')) await S.sb.auth.mfa.unenroll({ factorId: x.id });
    const { data: en, error: eErr } = await S.sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'إدارة ودقة' });
    if (eErr) throw eErr;
    mfaView(en.id, en.totp);
    return false;
  }
  function mfaView(factorId, totp) {
    app.innerHTML = '<form class="card login" id="mfaForm" data-factor="' + h(factorId) + '" novalidate>' +
      '<h1>التحقق بخطوتين</h1>' +
      (totp
        ? '<p class="muted">أول مرة: امسح الرمز بتطبيق المصادقة بجوالك (Google Authenticator أو Microsoft Authenticator أو 1Password)، واكتب الرقم اللي يطلع.</p>' +
          '<img class="qr" src="' + h(totp.qr_code) + '" alt="رمز QR للتحقق بخطوتين" width="200" height="200">' +
          '<p class="note">ما تقدر تمسح؟ أضف الحساب يدوياً بهالمفتاح:</p><code class="secret" dir="ltr">' + h(totp.secret) + '</code>'
        : '<p class="muted">اكتب الرقم من تطبيق المصادقة بجوالك (6 أرقام).</p>') +
      '<div class="field"><label for="otp">الرمز</label><input id="otp" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" dir="ltr" required></div>' +
      '<p class="err" id="mfaErr"></p><button class="btn solid block" type="submit">تحقق</button>' +
      '<p class="note">ضيّعت الجوال؟ Supabase ← Authentication ← Users ← حسابك ← احذف عامل MFA، وبعدها اربط من جديد.</p></form>';
    $('#otp').focus();
  }

  // ———— الشاشات ————
  const tab = () => { const t = location.hash.slice(1).split('/')[0]; return TABS.some((x) => x[0] === t) ? t : 'summary'; };
  const docSlug = () => decodeURIComponent(location.hash.slice(1).split('/')[1] || '');
  function nav() {
    const t = tab();
    return '<nav class="tabs" aria-label="أقسام اللوحة">' + TABS.map(([k, n]) => '<a href="#' + k + '"' + (k === t ? ' aria-current="page"' : '') + '>' + n + (k === 'leads' && S.leads.length ? '<span class="count num">' + S.leads.length + '</span>' : '') + '</a>').join('') + '</nav>';
  }
  function monthNav() {
    const now = L.ymOf(today());
    return '<div class="month"><button class="icon-btn" type="button" data-act="month" data-by="-1" aria-label="الشهر اللي قبل">›</button><b>' + monthName(S.month) + '</b>' +
      '<button class="icon-btn" type="button" data-act="month" data-by="1" aria-label="الشهر اللي بعد"' + (S.month >= now ? ' disabled' : '') + '>‹</button></div>';
  }
  const stat = (label, f, cls, sub) => '<div class="card stat"><small>' + label + '</small><b class="' + (cls || '') + '">' + money(f) + '<span class="cur">د.ب</span></b>' + (sub ? '<em>' + sub + '</em>' : '') + '</div>';

  function summaryView() {
    const s = L.monthSummary(S.entries, S.month), b = L.budgetStatus(S.budgets, S.entries, S.month), v = L.vatStatus(S.entries, today());
    const commit = S.recurring.reduce((t, r) => t + L.recMonthly(r), 0);
    const bal = L.balance(S.entries), chart = L.lastMonths(S.entries, 6, today());
    const max = Math.max(1, ...chart.map((c) => Math.max(c.income, c.expense)));
    const prod = Object.entries(s.byProduct).sort((a, c) => c[1] - a[1]);
    const due = S.recurring.filter((r) => r.active && r.next_due).sort((a, c) => String(a.next_due).localeCompare(String(c.next_due))).slice(0, 4);
    const vatMsg = v.level === 'must' ? '<span class="tag err">لازم تسجّل بالضريبة</span>' : v.level === 'may' ? '<span class="tag warn">تقدر تسجّل اختيارياً</span>' : '<span class="tag">تحت الحد</span>';
    return monthNav() +
      '<div class="grid">' +
      stat('دخل الشهر', s.income, 'pos') + stat('مصروف الشهر', s.expense) +
      stat('الصافي', s.net, s.net < 0 ? 'neg' : 'pos') +
      stat('باقي الميزانية', b.left, b.left < 0 ? 'neg' : '', b.totalBudget ? 'من ' + L.fmt(b.totalBudget) : 'ما فيه ميزانية') + '</div>' +
      '<div class="grid">' +
      stat('الرصيد من البداية', bal, bal < 0 ? 'neg' : '', 'كل الدخل ناقص كل المصروف') +
      stat('التزامات شهرية', commit, '', S.recurring.filter((r) => r.active).length + ' اشتراك فعّال') + '</div>' +
      '<section class="card"><h2>آخر 6 شهور</h2><div class="chart" role="img" aria-label="الدخل والمصروف آخر 6 شهور">' +
      chart.map((c) => '<div class="col"><div class="pair"><i class="in" data-hh="' + Math.round((c.income / max) * 100) + '"></i><i class="out" data-hh="' + Math.round((c.expense / max) * 100) + '"></i></div><small>' + MONTHS[Number(c.m.slice(5)) - 1].slice(0, 5) + '</small></div>').join('') +
      '</div><div class="legend"><span><i class="in"></i>دخل</span><span><i class="out"></i>مصروف</span></div></section>' +
      '<section class="card"><h2>حد التسجيل بضريبة القيمة المضافة</h2>' +
      '<div class="row-line"><span>مبيعات آخر 12 شهر: ' + money(v.sales) + ' د.ب</span>' + vatMsg + '</div>' +
      '<div class="bar' + (v.level === 'must' ? ' over' : '') + '"><i data-w="' + v.pct + '"></i></div>' +
      '<p class="note">الحد الإلزامي ' + L.fmt(v.mandatory) + ' والاختياري ' + L.fmt(v.voluntary) + ' د.ب. «' + L.OWNER_CAPITAL + '» ما ينحسب مبيعات. تقدير للمتابعة، والقرار مع محاسب أو الجهاز الوطني للإيرادات.</p></section>' +
      '<section class="card"><h2>مصروف الشهر حسب التطبيق</h2>' + (prod.length ? '<div class="rows">' + prod.map(([k, f]) => '<div><div class="row-line"><span>' + h(prodName(k)) + '</span>' + money(f) + '</div><div class="bar"><i data-w="' + Math.round((f / s.expense) * 100) + '"></i></div></div>').join('') + '</div>' : '<p class="muted">ما فيه مصروف بهالشهر.</p>') + '</section>' +
      '<section class="card"><h2>مواعيد الدفع الجاية</h2>' + (due.length ? '<div class="rows">' + due.map((r) => '<div><div class="row-line"><span>' + h(r.name) + ' <span class="tag">' + h(periodName(r.period)) + '</span></span>' + money(L.recFils(r)) + '</div><small class="note">الجاي <span class="num">' + h(r.next_due) + '</span></small></div>').join('') + '</div>' : '<p class="muted">حط تاريخ الدفع الجاي بالاشتراكات عشان يطلع هني.</p>') + '</section>';
  }

  function entryForm() {
    const e = S.edit ? S.entries.find((x) => x.id === S.edit) : null, kind = S.kind;
    const cats = kind === 'income' ? L.INCOME_CATS : L.EXPENSE_CATS;
    return '<form class="card" id="entryForm" novalidate><h2>' + (e ? 'تعديل عملية' : 'عملية جديدة') + '</h2>' +
      '<div class="seg" role="group" aria-label="النوع"><button type="button" class="expense' + (kind === 'expense' ? ' on' : '') + '" data-act="kind" data-k="expense">مصروف</button><button type="button" class="income' + (kind === 'income' ? ' on' : '') + '" data-act="kind" data-k="income">دخل</button></div>' +
      '<div class="two"><div class="field"><label for="f_amount">المبلغ (د.ب)</label><input id="f_amount" name="amount" inputmode="decimal" dir="ltr" placeholder="0.000" value="' + (e ? L.fmt(e.amount_fils).replace(/,/g, '') : '') + '" required></div>' +
      '<div class="field"><label for="f_date">التاريخ</label><input id="f_date" name="date" type="date" dir="ltr" value="' + h(e ? e.occurred_on : isoDay(today())) + '" required></div></div>' +
      '<div class="two"><div class="field"><label for="f_cat">البند</label><select id="f_cat" name="category">' + options(cats, e ? e.category : cats[0]) + '</select></div>' +
      '<div class="field"><label for="f_prod">التطبيق</label><select id="f_prod" name="product">' + options(L.PRODUCTS, e ? e.product : 'general') + '</select></div></div>' +
      '<div class="two"><div class="field"><label for="f_method">طريقة الدفع (اختياري)</label><input id="f_method" name="method" maxlength="30" list="methods" value="' + h(e && e.method) + '"><datalist id="methods"><option value="بطاقة"><option value="BenefitPay"><option value="تحويل"><option value="كاش"></datalist></div>' +
      '<div class="field"><label for="f_note">ملاحظة (اختياري)</label><input id="f_note" name="note" maxlength="500" value="' + h(e && e.note) + '"></div></div>' +
      '<p class="err" id="formErr"></p><div class="toolbar"><button class="btn solid" type="submit">' + (e ? 'حفظ التعديل' : 'أضف') + '</button><button class="btn" type="button" data-act="close-form">إلغاء</button></div></form>';
  }

  function ledgerView() {
    const qq = S.q.trim().toLowerCase();
    const rows = S.entries.filter((e) => L.ym(e.occurred_on) === S.month && (!qq || [e.category, e.note, e.method, prodName(e.product)].join(' ').toLowerCase().includes(qq)));
    const s = L.monthSummary(S.entries, S.month);
    return monthNav() +
      '<div class="toolbar"><button class="btn solid" type="button" data-act="new-entry">+ عملية</button>' +
      '<input class="grow field-search" type="search" id="search" aria-label="بحث" placeholder="بحث بالبند أو الملاحظة" value="' + h(S.q) + '">' +
      '<button class="btn" type="button" data-act="csv-ledger">تصدير CSV</button></div>' +
      (S.form === 'entry' ? '<section>' + entryForm() + '</section>' : '') +
      '<p class="note">' + s.count + ' عملية · دخل ' + L.fmt(s.income) + ' · مصروف ' + L.fmt(s.expense) + ' د.ب</p>' +
      (rows.length ? '<ul class="list">' + rows.map((e) => '<li><div class="main"><b>' + h(e.category) + '</b><small>' + h(e.occurred_on) + ' · ' + h(prodName(e.product)) + (e.method ? ' · ' + h(e.method) : '') + (e.note ? ' · ' + h(e.note) : '') + '</small></div>' +
        '<span class="amt ' + (e.kind === 'income' ? 'pos' : '') + '">' + (e.kind === 'income' ? '+' : '−') + money(e.amount_fils) + '</span>' +
        '<span class="acts"><button class="mini" type="button" data-act="edit-entry" data-id="' + h(e.id) + '">تعديل</button><button class="mini danger" type="button" data-act="del-entry" data-id="' + h(e.id) + '">حذف</button></span></li>').join('') + '</ul>'
        : '<div class="empty">' + (qq ? 'ما فيه نتائج للبحث.' : 'ما فيه عمليات بهالشهر. أضف أول عملية.') + '</div>');
  }

  function budgetView() {
    const b = L.budgetStatus(S.budgets, S.entries, S.month);
    const byCat = Object.fromEntries(b.rows.map((r) => [r.category, r]));
    return monthNav() +
      '<div class="grid">' + stat('الميزانية', b.totalBudget) + stat('المصروف', b.totalSpent) + stat('الباقي', b.left, b.left < 0 ? 'neg' : 'pos') + '</div>' +
      '<h2 class="sec">ميزانية كل بند (شهرياً)</h2><form class="card" id="budgetForm" novalidate><div class="rows">' +
      L.EXPENSE_CATS.map((c) => { const r = byCat[c] || { budget: 0, spent: 0, pct: null }; const cls = r.over ? ' over' : r.pct !== null && r.pct < 80 ? ' ok' : '';
        return '<div><div class="row-line"><label for="b_' + h(c) + '">' + h(c) + (r.over ? ' <span class="tag err">تعدّيت</span>' : r.unplanned ? ' <span class="tag warn">بدون ميزانية</span>' : '') + '</label>' +
          '<span class="muted">صرفت ' + money(r.spent) + '</span></div>' +
          '<div class="two"><input class="field-input" id="b_' + h(c) + '" name="' + h(c) + '" inputmode="decimal" dir="ltr" placeholder="بدون" aria-label="ميزانية ' + h(c) + '" value="' + (r.budget ? L.fmt(r.budget).replace(/,/g, '') : '') + '">' +
          '<div class="bar' + cls + '"><i data-w="' + (r.budget ? Math.min(100, r.pct) : 0) + '"></i></div></div></div>'; }).join('') +
      '</div><p class="err" id="budgetErr"></p><button class="btn solid" type="submit">حفظ الميزانية</button><p class="note">فاضي = بدون ميزانية للبند. نفس الميزانية لكل شهر.</p></form>';
  }

  function recForm() {
    const r = S.edit ? S.recurring.find((x) => x.id === S.edit) : null;
    const amt = r ? (r.currency === 'USD' ? (r.amount_minor / 100).toFixed(2) : L.fmt(r.amount_minor).replace(/,/g, '')) : '';
    return '<form class="card" id="recForm" novalidate><h2>' + (r ? 'تعديل اشتراك' : 'اشتراك جديد') + '</h2>' +
      (r ? '' : '<div class="chips" aria-label="تعبئة سريعة (أسعار تقديرية)">' + PRESETS.map((p, i) => '<button type="button" data-act="preset" data-i="' + i + '">' + h(p[0]) + '</button>').join('') + '</div><p class="note">التعبئة السريعة بأسعار تقديرية. تأكد من السعر قبل الحفظ.</p>') +
      '<div class="field"><label for="r_name">الاسم</label><input id="r_name" name="name" maxlength="60" value="' + h(r && r.name) + '" required></div>' +
      '<div class="two"><div class="field"><label for="r_amount">المبلغ</label><input id="r_amount" name="amount" inputmode="decimal" dir="ltr" value="' + h(amt) + '" required></div>' +
      '<div class="field"><label for="r_cur">العملة</label><select id="r_cur" name="currency">' + options([['BHD', 'دينار (د.ب)'], ['USD', 'دولار ($) × 0.376']], r ? r.currency : 'USD') + '</select></div></div>' +
      '<div class="two"><div class="field"><label for="r_period">كل</label><select id="r_period" name="period">' + options(L.PERIODS, r ? r.period : 'month') + '</select></div>' +
      '<div class="field"><label for="r_due">الدفع الجاي (اختياري)</label><input id="r_due" name="next_due" type="date" dir="ltr" value="' + h(r && r.next_due) + '"></div></div>' +
      '<div class="two"><div class="field"><label for="r_cat">البند</label><select id="r_cat" name="category">' + options(L.EXPENSE_CATS, r ? r.category : 'أدوات وبرامج') + '</select></div>' +
      '<div class="field"><label for="r_prod">التطبيق</label><select id="r_prod" name="product">' + options(L.PRODUCTS, r ? r.product : 'general') + '</select></div></div>' +
      '<p class="err" id="recErr"></p><div class="toolbar"><button class="btn solid" type="submit">' + (r ? 'حفظ التعديل' : 'أضف') + '</button><button class="btn" type="button" data-act="close-form">إلغاء</button></div></form>';
  }

  function recurringView() {
    const active = S.recurring.filter((r) => r.active), monthly = active.reduce((t, r) => t + L.recMonthly(r), 0);
    return '<div class="grid">' + stat('بالشهر', monthly, '', active.length + ' فعّال') + stat('بالسنة', monthly * 12, '', 'بدون اللي مرة وحدة') + '</div>' +
      '<div class="toolbar" id="recBar"><button class="btn solid" type="button" data-act="new-rec">+ اشتراك</button></div>' +
      (S.form === 'rec' ? '<section>' + recForm() + '</section>' : '') +
      (S.recurring.length ? '<ul class="list">' + S.recurring.map((r) => '<li><div class="main"><b>' + h(r.name) + (r.active ? '' : ' <span class="tag">موقّف</span>') + '</b><small>' + h(periodName(r.period)) + ' · ' + h(r.category) + ' · ' + h(prodName(r.product)) +
        (r.currency === 'USD' ? ' · <span class="num">$' + (r.amount_minor / 100).toFixed(2) + '</span>' : '') + (r.next_due ? ' · الجاي <span class="num">' + h(r.next_due) + '</span>' : '') + '</small></div>' +
        '<span class="amt">' + money(L.recFils(r)) + '</span>' +
        '<span class="acts"><button class="mini" type="button" data-act="rec-pay" data-id="' + h(r.id) + '" title="سجّله مصروف اليوم">دفعته</button>' +
        '<button class="mini" type="button" data-act="rec-toggle" data-id="' + h(r.id) + '">' + (r.active ? 'وقّف' : 'شغّل') + '</button>' +
        '<button class="mini" type="button" data-act="edit-rec" data-id="' + h(r.id) + '">تعديل</button>' +
        '<button class="mini danger" type="button" data-act="del-rec" data-id="' + h(r.id) + '">حذف</button></span></li>').join('') + '</ul>'
        : '<div class="empty">ما فيه اشتراكات. أضف Apple Developer وSupabase وغيرها عشان تعرف كلفتك الثابتة.</div>');
  }

  function leadsView() {
    const rows = S.leads.filter((l) => !S.leadProduct || l.product === S.leadProduct);
    const counts = {}; S.leads.forEach((l) => { counts[l.product] = (counts[l.product] || 0) + 1; });
    return '<div class="toolbar"><select id="leadProduct" aria-label="التطبيق"><option value="">كل التطبيقات (' + S.leads.length + ')</option>' +
      Object.keys(counts).map((k) => '<option value="' + h(k) + '"' + (k === S.leadProduct ? ' selected' : '') + '>' + h(prodName(k)) + ' (' + counts[k] + ')</option>').join('') + '</select>' +
      '<span class="grow"></span><button class="btn" type="button" data-act="csv-leads">تصدير CSV</button></div>' +
      '<p class="note"><b>مختبرين حياتي: <span class="num">' + S.leads.filter((l) => l.kind === 'tester').length + '</span> من 12</b> (شرط Google: 12 × 14 يوم).</p>' +
      '<p class="note">من نماذج موقع ودقة (تواصل وقوائم انتظار). نحتفظ فيها 24 شهر بحد أقصى. لو أحد طلب حذف بياناته: Supabase ← Table Editor ← wadqa.leads.</p>' +
      (rows.length ? '<ul class="list">' + rows.map((l) => '<li><div class="main"><b>' + h(l.name || l.email) + ' <span class="tag">' + ({ waitlist: 'انتظار', tester: 'مختبر' }[l.kind] || 'تواصل') + ' · ' + h(prodName(l.product)) + '</span></b><small dir="auto">' + h(l.message || '—') + '</small><small><span dir="ltr">' + h(l.email) + '</span> · ' + h(String(l.created_at).slice(0, 10)) + '</small></div>' +
        '<a class="mini" href="mailto:' + encodeURIComponent(l.email) + '">رد</a></li>').join('') + '</ul>'
        : '<div class="empty">ما وصلت طلبات للحين.</div>');
  }

  // «الزيارات» (DW-058): عدّ بدون كوكيز ولا IP، لكل صفحة باليوم
  function visitsView() {
    const w = L.views(S.visits, today(), 7), m = L.views(S.visits, today(), 30);
    const num = (label, n, sub) => '<div class="card stat"><small>' + label + '</small><b class="num">' + n.toLocaleString('en') + '</b>' + (sub ? '<em>' + sub + '</em>' : '') + '</div>';
    return '<div class="grid">' + num('آخر 7 أيام', w.total, 'زيارة صفحة') + num('آخر 30 يوم', m.total, m.pages.length + ' صفحة') + '</div>' +
      '<p class="note">نعدّ فتح الصفحة بس: بدون كوكيز ولا IP ولا هوية، وما نعدّ اللي مفعّل «عدم التتبع». الرقم تقريبي (أي أحد يقدر يزيده)، فهو مؤشر مو حقيقة.</p>' +
      (m.pages.length ? '<ul class="list">' + m.pages.map((p) => '<li><div class="main"><b dir="ltr">' + h(p.path) + '</b><small>آخر 30 يوم</small></div><span class="amt num">' + p.n.toLocaleString('en') + '</span></li>').join('') + '</ul>'
        : '<div class="empty">ما فيه زيارات مسجلة للحين.</div>');
  }

  // «الملفات»: شرح تقني لكل تطبيق (DW-053). النص من القاعدة بنفس قفل aal2، والعرض بعارض آمن (docs.js)
  function filesView() {
    const slug = docSlug();
    if (S.demo) return '<div class="empty">الملفات التقنية تنقرا من القاعدة بعد الدخول بكلمة السر ورمز الجوال، فما تطلع بالوضع التجريبي.</div>';
    if (slug) {
      const d = S.docs.find((x) => x.slug === slug);
      const body = S.docBody[slug];
      return '<div class="toolbar"><a class="btn" href="#files">→ كل الملفات</a>' + (d ? '<span class="note">آخر تحديث <span class="num">' + h(String(d.updated_at).slice(0, 10)) + '</span></span>' : '') + '</div>' +
        (body == null ? '<p class="muted center">يحمّل…</p>' : '<article class="card doc">' + window.AdminDocs.render(body) + '</article>');
    }
    return '<p class="note">ملف لكل تطبيق: الفكرة، التقنيات، الهيكل، البيانات والأمان، أمثلة من الكود، والتشغيل والنشر.</p>' +
      (S.docs.length ? '<ul class="list">' + S.docs.map((d) => '<li><div class="main"><b>' + h(d.title) + '</b><small>آخر تحديث <span class="num">' + h(String(d.updated_at).slice(0, 10)) + '</span></small></div><a class="btn" href="#files/' + encodeURIComponent(d.slug) + '">افتح</a></li>').join('') + '</ul>'
        : '<div class="empty">ما فيه ملفات للحين.</div>');
  }

  function render() {
    const t = tab(), views = { summary: summaryView, ledger: ledgerView, budget: budgetView, recurring: recurringView, leads: leadsView, visits: visitsView, files: filesView };
    const slug = t === 'files' && docSlug();
    if (slug && !S.demo && S.docBody[slug] == null) store.doc(slug).then(() => { if (docSlug() === slug) render(); }).catch((e) => toast(errText(e)));
    app.innerHTML = nav() + '<div id="view">' + views[t]() + '</div>';
    paintBars();
    const sr = $('#search'); if (sr) sr.oninput = () => { S.q = sr.value; const pos = sr.selectionStart; render(); const n = $('#search'); n.focus(); n.setSelectionRange(pos, pos); };
    const lp = $('#leadProduct'); if (lp) lp.onchange = () => { S.leadProduct = lp.value; render(); };
  }

  // ———— الأحداث ————
  async function act(btn) {
    const a = btn.dataset.act, id = btn.dataset.id;
    try {
      if (a === 'google') {
        btn.disabled = true;
        const { error } = await S.sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
        if (error) { btn.disabled = false; toast(errText(error)); }
        return;
      }
      if (a === 'month') { S.month = L.shiftYm(S.month, Number(btn.dataset.by)); return render(); }
      if (a === 'new-entry') { S.form = 'entry'; S.edit = null; S.kind = 'expense'; render(); return $('#f_amount').focus(); }
      if (a === 'edit-entry') { S.form = 'entry'; S.edit = id; S.kind = S.entries.find((x) => x.id === id).kind; render(); return $('#f_amount').focus(); }
      if (a === 'kind') { const keep = new FormData($('#entryForm')); S.kind = btn.dataset.k; render(); $('#f_amount').value = keep.get('amount'); $('#f_date').value = keep.get('date'); return; }
      if (a === 'close-form') { S.form = null; S.edit = null; return render(); }
      if (a === 'del-entry') { const e = S.entries.find((x) => x.id === id); if (!confirm('تحذف «' + e.category + '» ' + L.fmt(e.amount_fils) + ' د.ب؟')) return; await store.removeEntry(id); await store.load(); toast('انحذفت'); return render(); }
      if (a === 'csv-ledger') {
        const rows = S.entries.filter((e) => L.ym(e.occurred_on) === S.month);
        return download('wadqa-' + S.month + '.csv', L.csv(rows, [['occurred_on', 'التاريخ'], [(e) => (e.kind === 'income' ? 'دخل' : 'مصروف'), 'النوع'], [(e) => L.fmt(e.amount_fils).replace(/,/g, ''), 'المبلغ د.ب'], ['category', 'البند'], [(e) => prodName(e.product), 'التطبيق'], ['method', 'طريقة الدفع'], ['note', 'ملاحظة']]));
      }
      if (a === 'csv-leads') return download('wadqa-leads.csv', L.csv(S.leads, [['created_at', 'الوقت'], ['kind', 'النوع'], [(l) => prodName(l.product), 'التطبيق'], ['name', 'الاسم'], ['email', 'الإيميل'], ['message', 'الرسالة'], ['lang', 'اللغة']]));
      if (a === 'new-rec') { S.form = 'rec'; S.edit = null; render(); return $('#r_name').focus(); }
      if (a === 'edit-rec') { S.form = 'rec'; S.edit = id; render(); return $('#r_name').focus(); }
      if (a === 'preset') { const [n, amt, cur, per, cat, prod] = PRESETS[Number(btn.dataset.i)]; $('#r_name').value = n; $('#r_amount').value = cur === 'USD' ? (amt / 100).toFixed(2) : L.fmt(amt); $('#r_cur').value = cur; $('#r_period').value = per; $('#r_cat').value = cat; $('#r_prod').value = prod; return $('#r_amount').focus(); }
      if (a === 'rec-toggle') { const r = S.recurring.find((x) => x.id === id); await store.saveRec({ id, active: !r.active }); await store.load(); return render(); }
      if (a === 'del-rec') { const r = S.recurring.find((x) => x.id === id); if (!confirm('تحذف «' + r.name + '»؟')) return; await store.removeRec(id); await store.load(); toast('انحذف'); return render(); }
      if (a === 'rec-pay') {
        const r = S.recurring.find((x) => x.id === id);
        await store.saveEntry({ kind: 'expense', occurred_on: isoDay(today()), amount_fils: L.recFils(r), category: r.category, product: r.product, method: null, note: r.name + (r.currency === 'USD' ? ' ($' + (r.amount_minor / 100).toFixed(2) + ')' : '') });
        await store.load(); S.month = L.ymOf(today()); toast('انسجّل مصروف بالدفتر (' + monthName(S.month) + ')'); return render();
      }
    } catch (e) { toast(errText(e)); }
  }

  async function submit(form) {
    try {
      if (form.id === 'loginForm') {
        const err = $('#loginErr'), btn = form.querySelector('button[type=submit]');
        err.textContent = ''; btn.disabled = true;
        const { error } = await S.sb.auth.signInWithPassword({ email: form.email.value.trim(), password: form.password.value });
        btn.disabled = false;
        if (error) { err.textContent = errText(error); return; }
        return afterLogin();
      }
      if (form.id === 'mfaForm') {
        const code = String(form.code.value || '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '');
        const err = $('#mfaErr'), btn = form.querySelector('button[type=submit]');
        if (code.length !== 6) { err.textContent = 'الرمز 6 أرقام'; return; }
        err.textContent = ''; btn.disabled = true;
        const { error } = await S.sb.auth.mfa.challengeAndVerify({ factorId: form.dataset.factor, code });
        btn.disabled = false;
        if (error) { err.textContent = /invalid|expired/i.test(error.message || '') ? 'الرمز غلط أو انتهى. جرّب الرقم الجديد' : errText(error); form.code.value = ''; form.code.focus(); return; }
        return afterLogin();
      }
      if (form.id === 'entryForm') {
        const fd = new FormData(form), fils = L.parseFils(fd.get('amount')), date = fd.get('date');
        if (!fils) { $('#formErr').textContent = 'المبلغ لازم يكون رقم أكبر من صفر، بحد أقصى 3 خانات بعد الفاصلة'; return; }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { $('#formErr').textContent = 'اختار التاريخ'; return; }
        const row = { kind: S.kind, occurred_on: date, amount_fils: fils, category: fd.get('category'), product: fd.get('product'), method: (fd.get('method') || '').trim() || null, note: (fd.get('note') || '').trim() || null };
        if (S.edit) row.id = S.edit;
        await store.saveEntry(row); await store.load();
        S.month = L.ym(date); S.form = null; S.edit = null; toast(row.id ? 'انحفظ التعديل' : 'انضافت'); return render();
      }
      if (form.id === 'budgetForm') {
        const fd = new FormData(form), changes = [];
        for (const c of L.EXPENSE_CATS) {
          const raw = String(fd.get(c) || '').trim(), fils = raw ? L.parseFils(raw) : 0;
          if (raw && fils === null) { $('#budgetErr').textContent = 'رقم غير صالح بـ «' + c + '»'; return; }
          const cur = (S.budgets.find((b) => b.category === c) || { monthly_fils: 0 }).monthly_fils;
          if (Number(cur) !== fils) changes.push([c, fils]);
        }
        for (const [c, f] of changes) await store.saveBudget(c, f);
        await store.load(); toast(changes.length ? 'انحفظت الميزانية' : 'ما فيه تغيير'); return render();
      }
      if (form.id === 'recForm') {
        const fd = new FormData(form), cur = fd.get('currency'), raw = String(fd.get('amount') || '').trim();
        const minor = cur === 'USD' ? (/^\d+(\.\d{1,2})?$/.test(raw.replace(',', '.')) ? Math.round(Number(raw.replace(',', '.')) * 100) : null) : L.parseFils(raw);
        if (!String(fd.get('name') || '').trim()) { $('#recErr').textContent = 'اكتب الاسم'; return; }
        if (minor === null || minor < 0) { $('#recErr').textContent = cur === 'USD' ? 'المبلغ بالدولار بحد أقصى خانتين بعد الفاصلة' : 'المبلغ بالدينار بحد أقصى 3 خانات'; return; }
        const row = { name: fd.get('name').trim(), amount_minor: minor, currency: cur, period: fd.get('period'), category: fd.get('category'), product: fd.get('product'), next_due: fd.get('next_due') || null };
        if (S.edit) row.id = S.edit; else row.active = true;
        await store.saveRec(row); await store.load(); S.form = null; S.edit = null; toast('انحفظ'); return render();
      }
    } catch (e) {
      const el = form.querySelector('.err'); if (el) el.textContent = errText(e); else toast(errText(e));
    }
  }

  app.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b && !b.disabled) act(b); });
  app.addEventListener('submit', (e) => { e.preventDefault(); submit(e.target); });
  window.addEventListener('hashchange', () => { S.form = null; S.edit = null; if (S.demo || S.email) render(); });

  // ———— البداية ————
  async function start() {
    if (S.demo) { $('#demoBar').hidden = false; demoData(); return render(); }
    if (!window.supabase || !window.WADQA) { app.innerHTML = '<p class="err center">ما قدرنا نحمّل الإعدادات.</p>'; return; }
    S.sb = window.supabase.createClient(window.WADQA.url, window.WADQA.key, { auth: { persistSession: true, storageKey: 'wadqa-admin', autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } });
    $('#signOut').onclick = async () => { await S.sb.auth.signOut(); S.email = ''; S.entries = S.budgets = S.recurring = S.leads = S.visits = []; loginView(); };
    S.sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') { S.email = ''; loginView(); } });
    afterLogin();
  }
  start();
})();
