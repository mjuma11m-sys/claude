// DW-061: «حساباتي» — حساب بنك أو بطاقة أو كاش أو محفظة: رصيده، صرف الشهر، وميزانيته
// الحسابات بالإعدادات (settings.accounts)، وكل عملية فيها account_id. الرسائل تنربط بالبطاقة من آخر رقمين لحالها.
// الرصيد = رصيد تعرفه بتاريخ معيّن (اللي تكتبه أو آخر رصيد بكشف الحساب) + العمليات بعده.
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, st, I, h, tint } = A;
  const wrap = (name, fn) => { const prev = E[name]; E[name] = (...a) => fn(prev ? prev : () => '', ...a); };

  const KINDS = { bank: ['حساب بنك', 'banknote'], card: ['بطاقة', 'wallet'], cash: ['كاش', 'coins'], wallet: ['محفظة إلكترونية', 'phone'] };
  const COLORS = ['#1A8A8F', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ec4899', '#10b981', '#64748b'];
  const list = () => (Array.isArray(st.settings.accounts) ? st.settings.accounts : []);
  const save = (arr) => S.setSettings({ accounts: arr });
  const byId = (id) => list().find((a) => a.id === id);

  function balance(a) {
    if (a.balance == null || a.balance === '') return null;
    const from = a.balance_at ? new Date(a.balance_at) : new Date(0);
    let b = Number(a.balance);
    for (const t of st.transactions) {
      if (t.account_id !== a.id || new Date(t.occurred_at) <= from) continue;
      b += t.kind === 'income' ? Number(t.amount) : -Number(t.amount);
    }
    return Math.round(b * 1000) / 1000;
  }
  function monthSpend(a) {
    const r = A.monthRange(A.monthKey(new Date()));
    return st.transactions.filter((t) => t.account_id === a.id && t.kind === 'expense' && new Date(t.occurred_at) >= r.start && new Date(t.occurred_at) < r.end)
      .reduce((s, t) => s + Number(t.amount), 0);
  }

  // ---------- الصفحة ----------
  function view() {
    const accs = list();
    let out = '<div class="actions" style="margin-top:4px"><button class="action" data-action="acc-add"><div class="ico" style="' + tint('#1A8A8F') + '">' + I('plus') + '</div>أضف حساب أو بطاقة</button>' +
      '<button class="action" data-action="bankfile"><div class="ico" style="' + tint('#0d9488') + '">' + I('download') + '</div>استيراد كشف</button></div>';
    if (!accs.length) {
      return out + '<div class="card" style="margin-top:12px">' + A.empty('wallet', 'فرّق بين حساباتك', 'أضف حساب البنك والبطاقة والكاش، وكل واحد يطلع له رصيده وصرفه بالشهر. رسائل البنك تنربط بالبطاقة من آخر رقمين لحالها.') + '</div>';
    }
    const unassigned = st.transactions.filter((t) => !t.account_id).length;
    const total = accs.map(balance).filter((b) => b != null);
    if (total.length) out += '<div class="hero" style="margin-top:12px"><span class="eyebrow">' + I('wallet') + 'مجموع الأرصدة</span><div class="amount-big">' + A.money(total.reduce((s, b) => s + b, 0)) + '</div></div>';
    out += '<div class="card flush" style="margin-top:12px"><ul class="list">' + accs.map((a) => {
      const b = balance(a), sp = monthSpend(a), k = KINDS[a.kind] || KINDS.bank;
      const pct = a.budget ? Math.min(100, Math.round((sp / a.budget) * 100)) : null;
      return '<li class="row" data-action="acc-edit" data-id="' + a.id + '"><div class="ico" style="' + tint(a.color || COLORS[0]) + '">' + I(k[1]) + '</div>' +
        '<div class="main"><div class="title"><span class="t">' + h(a.name) + '</span>' + (a.last2 ? ' <small class="muted" data-noi18n>••' + h(a.last2) + '</small>' : '') + '</div>' +
        '<div class="sub">صرف الشهر ' + A.fmt(sp) + (a.budget ? ' من ' + A.fmt(a.budget) : '') + '</div>' +
        (pct != null ? '<div class="bar" style="height:5px;border-radius:3px;background:var(--surface-2);margin-top:6px;overflow:hidden"><i style="display:block;height:100%;width:' + pct + '%;background:' + (pct >= 100 ? 'var(--expense)' : pct >= 80 ? '#f59e0b' : 'var(--income)') + '"></i></div>' : '') +
        '</div><div style="text-align:end">' + (b != null ? '<div class="amount"><span class="num">' + A.fmt(b) + '</span></div><small class="muted">الرصيد</small>' : '<small class="muted">حط رصيده</small>') + '</div></li>';
    }).join('') + '</ul></div>';
    if (unassigned) out += '<p class="small muted" style="margin:10px 6px">' + unassigned + ' عملية بدون حساب. افتح أي عملية واختار حسابها، أو استخدم «اربط القديمة» بالحساب.</p>';
    return out;
  }

  // ---------- إضافة / تعديل ----------
  function form(acc) {
    const a = Object.assign({ id: S.uuid(), name: '', kind: 'card', last2: '', balance: '', budget: '', color: COLORS[list().length % COLORS.length] }, acc || {});
    const n = acc ? st.transactions.filter((t) => t.account_id === a.id).length : 0;
    const loose = acc && a.last2 ? st.transactions.filter((t) => !t.account_id && t.raw && t.raw.includes('••' + a.last2)).length : 0;
    A.openSheet({
      title: acc ? a.name : 'حساب أو بطاقة جديدة',
      body: '<div class="seg" id="akSeg">' + Object.entries(KINDS).map(([k, x]) => '<button type="button" data-k="' + k + '" class="' + (a.kind === k ? 'on' : '') + '">' + x[0] + '</button>').join('') + '</div>' +
        '<div class="field"><label>الاسم</label><input name="ac_name" maxlength="30" value="' + h(a.name) + '" placeholder="مثلاً: بطاقة بنك البحرين الوطني، حساب الراتب، الكاش"></div>' +
        '<div class="field"><label>آخر رقمين من البطاقة أو الحساب (اختياري)</label><input name="ac_last2" inputmode="numeric" maxlength="2" value="' + h(a.last2 || '') + '" placeholder="مثلاً 21"><p class="small muted" style="margin:4px 4px 0">رسائل البنك اللي فيها «XX…21» تنربط بهالحساب لحالها. ما نحتاج الرقم كامل.</p></div>' +
        '<div class="field"><label>رصيده الحين (اختياري)</label><input name="ac_balance" inputmode="decimal" value="' + (acc && balance(a) != null ? balance(a) : '') + '" placeholder="0.000"></div>' +
        '<div class="field"><label>ميزانية الشهر لهالحساب (اختياري)</label><input name="ac_budget" inputmode="decimal" value="' + h(a.budget || '') + '" placeholder="مثلاً 150"></div>' +
        (acc ? '<p class="small muted" style="margin:0 4px 10px">' + n + ' عملية مربوطة بهالحساب.</p>' : '') +
        (loose ? '<button type="button" class="btn block" id="acLink">' + I('repeat') + 'اربط القديمة (' + loose + ' رسالة فيها ••' + h(a.last2) + ')</button>' : '') +
        (acc ? '<button type="button" class="btn danger block" id="acDel" style="margin-top:10px">' + I('trash') + 'احذف الحساب (العمليات تظل)</button>' : ''),
      mount(root) {
        root.dataset.kind = a.kind;
        A.segPick(root, '#akSeg', (k) => { root.dataset.kind = k; });
        const link = root.querySelector('#acLink');
        if (link) link.onclick = () => {
          let c = 0;
          for (const t of st.transactions) if (!t.account_id && t.raw && t.raw.includes('••' + a.last2)) { S.upsert('transactions', Object.assign({}, t, { account_id: a.id })); c++; }
          link.remove(); A.toast('انربطت ' + c + ' عملية ✓');
        };
        const del = root.querySelector('#acDel');
        if (del) del.onclick = async () => {
          if (!(await A.ask('تحذف «' + a.name + '»؟ العمليات تظل بدون حساب.'))) return;
          for (const t of st.transactions) if (t.account_id === a.id) S.upsert('transactions', Object.assign({}, t, { account_id: null }));
          save(list().filter((x) => x.id !== a.id)); A.closeSheet(); A.toast('انحذف');
        };
      },
      onSave(root) {
        const name = A.val(root, 'ac_name');
        if (!name) throw new Error('اكتب اسم الحساب');
        const last2 = A.val(root, 'ac_last2').replace(/\D/g, '');
        if (last2 && last2.length !== 2) throw new Error('آخر رقمين بس');
        if (last2 && list().some((x) => x.id !== a.id && x.last2 === last2)) throw new Error('فيه حساب ثاني بنفس الرقمين');
        const next = Object.assign({}, a, { name: name.slice(0, 30), kind: root.dataset.kind, last2: last2 || null, budget: A.parseAmount(A.val(root, 'ac_budget')) || null });
        const bal = A.val(root, 'ac_balance');
        if (bal !== '') {
          const v = A.parseAmount(bal);
          if (!isFinite(v)) throw new Error('الرصيد مو رقم');
          if (!acc || balance(a) == null || Math.abs(v - balance(a)) > 0.0005) { next.balance = v; next.balance_at = new Date().toISOString(); }
        } else { next.balance = null; next.balance_at = null; }
        const arr = list().filter((x) => x.id !== a.id).concat([next]);
        save(arr);
        A.ui.moneySeg = 'accounts';
        A.toast(acc ? 'تم التعديل' : 'انضاف ✓');
      },
    });
  }

  // ---------- بنموذج العملية ----------
  function txField(t) {
    const accs = list();
    if (!accs.length) return '';
    const cur = t && t.account_id ? t.account_id : (accs.length === 1 ? accs[0].id : '');
    return '<div class="field"><label>الحساب</label><select name="account_id"><option value="">بدون</option>' +
      accs.map((a) => '<option data-noi18n value="' + a.id + '"' + (a.id === cur ? ' selected' : '') + '>' + h(a.name) + (a.last2 ? ' ••' + h(a.last2) : '') + '</option>').join('') + '</select></div>';
  }

  // ================= الربط =================
  E.viewAccounts = view;
  E.txAccountField = txField;
  E.accounts = { list, balance, monthSpend, form, byId };
  wrap('action', (prev, name, el, e) => {
    if (name === 'acc-add') { form(); return; }
    if (name === 'acc-edit') { form(byId(el.dataset.id)); return; }
    return prev(name, el, e);
  });
})();
