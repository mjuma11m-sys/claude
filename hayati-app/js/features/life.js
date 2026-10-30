// DW-101: «أموري» — أوراقك وانتهاؤها، فواتير البيت، الجمعية، صيانة السيارة، صندوق الطوارئ، العيدية، وعداد القضاء.
// كله على الجهاز بس (hayati-life) ويدخل بالنسخة الاحتياطية المشفّرة: تواريخ ومبالغ بس، بدون أرقام وثائق ولا صور.
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, st, h, fmt, tint } = A;
  const KEY = 'hayati-life';
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const ym = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1);
  const parse = (s) => { if (!s) return null; const [y, m, d] = String(s).split('-').map(Number); return y ? new Date(y, (m || 1) - 1, d || 1) : null; };
  const day0 = (d) => { const x = new Date(d || Date.now()); x.setHours(0, 0, 0, 0); return x; };
  const left = (s, now) => { const d = parse(s); return d ? A.daysBetween(day0(now), d) : null; };
  const addM = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
  const monthsBetween = (a, b) => (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth();
  const monthName = (d) => A.MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  const num = (v) => { const n = parseFloat(String(v || '').replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(',', '.')); return isNaN(n) ? 0 : n; };
  const r3 = (n) => Math.round(n * 1000) / 1000;
  const val = (root, n) => { const el = root.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; };

  function load() {
    let v = {};
    try { v = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { v = {}; }
    return Object.assign({ papers: [], bills: [], jamiya: [], car: { km: '', items: [] }, eid: [], qada: {} }, v);
  }
  function save(v) {
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { A.toast('ما قدرنا نحفظ على هالجهاز'); }
    if (window.HayatiNative && typeof HayatiNative.reschedule === 'function') { clearTimeout(save.t); save.t = setTimeout(() => HayatiNative.reschedule(), 800); }
    A.render();
  }
  const edit = (fn) => { const v = load(); fn(v); save(v); return v; };
  const leftText = (n) => (n < 0 ? 'انتهت من ' + A.nDays(-n) : n === 0 ? 'تنتهي اليوم' : 'باقي ' + A.nDays(n));
  const tone = (n, warn) => (n <= 0 ? 'var(--expense)' : n <= warn ? 'var(--warn)' : 'var(--muted)');
  const row = (ico, title, sub, color, attrs, side) => '<li class="row" ' + (attrs || 'style="cursor:default"') + '><div class="ico">' + ico + '</div><div class="main"><div class="title"><span>' + title + '</span></div>' +
    '<div class="sub" style="white-space:normal' + (color ? ';color:' + color : '') + '">' + sub + '</div></div>' + (side || '') + '</li>';
  const list = (rows, empty) => (rows.length ? '<div class="card flush"><ul class="list">' + rows.join('') + '</ul></div>' : '<p class="small muted" style="margin:8px 4px 14px">' + empty + '</p>');
  const reopen = (fn) => { A.closeSheet(); setTimeout(fn, 300); };

  // ================= 🪪 أوراقك =================
  const PAPERS = [['cpr', 'البطاقة الذكية', '🪪'], ['passport', 'الجواز', '🛂'], ['license', 'رخصة السياقة', '🚗'], ['reg', 'استمارة السيارة', '📄'],
    ['ins', 'تأمين السيارة', '🛡️'], ['visa', 'الإقامة أو التأشيرة', '🧾'], ['other', 'ورقة ثانية', '📁']];
  const paperOf = (p) => PAPERS.find((x) => x[0] === p.type) || PAPERS[PAPERS.length - 1];
  const paperName = (p) => (p.label ? '<bdi>' + h(p.label) + '</bdi>' : paperOf(p)[1]);
  function papers() {
    const ps = load().papers.slice().sort((a, b) => (left(a.exp) ?? 1e9) - (left(b.exp) ?? 1e9));
    A.openSheet({
      title: '🪪 أوراقك', cancelLabel: 'تم',
      body: '<p class="small muted" style="margin:0 4px 12px">نذكّرك قبل الانتهاء بشهر وبأسبوع. نحفظ التاريخ بس، بدون أرقام ولا صور.</p>' +
        list(ps.map((p) => { const n = left(p.exp); return row(paperOf(p)[2], paperName(p), '<bdi>' + h(p.exp) + '</bdi> · ' + leftText(n), tone(n, 30), 'data-paper="' + p.id + '"'); }), 'ما أضفت ولا ورقة للحين.') +
        '<button type="button" class="btn primary block" id="lfAdd">＋ أضف ورقة</button>',
      mount(root) {
        root.querySelector('#lfAdd').onclick = () => reopen(() => paperForm());
        root.querySelectorAll('[data-paper]').forEach((b) => { b.onclick = () => reopen(() => paperForm(load().papers.find((x) => x.id === b.dataset.paper))); });
      },
    });
  }
  function paperForm(p) {
    A.openSheet({
      title: p ? 'عدّل الورقة' : 'ورقة جديدة', saveLabel: 'حفظ',
      body: '<div class="field"><label>النوع</label><select name="type">' + PAPERS.map(([k, l, i]) => '<option value="' + k + '"' + (p && p.type === k ? ' selected' : '') + '>' + i + ' ' + l + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>اسم يميّزها (اختياري)</label><input name="label" placeholder="مثلاً: جواز الوالدة" value="' + h((p && p.label) || '') + '"></div>' +
        '<div class="field"><label>تاريخ الانتهاء</label><input name="exp" type="date" value="' + h((p && p.exp) || '') + '"></div>' +
        (p ? '<button type="button" class="btn danger block" id="lfDel">حذف</button>' : ''),
      mount(root) { const d = root.querySelector('#lfDel'); if (d) d.onclick = async () => { if (await A.ask('تحذف هالورقة؟')) { edit((v) => { v.papers = v.papers.filter((x) => x.id !== p.id); }); reopen(papers); } }; },
      onSave(root) {
        const exp = val(root, 'exp');
        if (!exp) throw new Error('اختر تاريخ الانتهاء');
        const it = { id: (p && p.id) || S.uuid(), type: val(root, 'type'), label: val(root, 'label'), exp };
        edit((v) => { v.papers = v.papers.filter((x) => x.id !== it.id).concat(it); });
        A.toast('انحفظت ✓'); setTimeout(papers, 300);
      },
    });
  }

  // ================= 💡 فواتير البيت =================
  const BILLS = [['ewa', 'الكهرباء والماء', '💡'], ['net', 'النت', '📶'], ['mobile', 'الجوال', '📱'], ['rent', 'الإيجار', '🏠'], ['other', 'فاتورة ثانية', '🧾']];
  const billOf = (b) => BILLS.find((x) => x[0] === b.type) || BILLS[BILLS.length - 1];
  const billName = (b) => (b.label ? '<bdi>' + h(b.label) + '</bdi>' : billOf(b)[1]);
  const dueIn = (b, m) => { const last = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate(); return new Date(m.getFullYear(), m.getMonth(), Math.min(Number(b.day) || 1, last)); };
  function billLine(b, now) {
    now = now || new Date();
    const k = ym(now), prev = (b.paid || {})[ym(addM(now, -1))], cur = (b.paid || {})[k];
    if (cur != null) {
      const p = prev ? Math.round(((cur - prev) / prev) * 100) : 0;
      return { ok: true, text: 'دفعتها هالشهر: ' + fmt(cur) + ' د.ب' + (prev && p ? ' · ' + (p > 0 ? 'زادت ' : 'نقصت ') + Math.abs(p) + '% عن الشهر اللي طاف' : ''), n: null };
    }
    let n = A.daysBetween(day0(now), dueIn(b, now));
    if (n < -5) n = A.daysBetween(day0(now), dueIn(b, addM(now, 1)));   // موعدها طاف من زمان (أو توها انضافت): نحسب للشهر الجاي
    return { ok: false, n, text: n < 0 ? 'متأخرة ' + A.nDays(-n) : n === 0 ? 'تستحق اليوم' : n === 1 ? 'تستحق بكرة' : 'تستحق بعد ' + A.nDays(n) };
  }
  function bills() {
    const bs = load().bills;
    A.openSheet({
      title: '💡 فواتير البيت', cancelLabel: 'تم',
      body: '<p class="small muted" style="margin:0 4px 12px">نذكّرك قبل موعد كل فاتورة بيومين، ونقارن المبلغ بالشهر اللي قبله.</p>' +
        list(bs.map((b) => { const l = billLine(b); return row(billOf(b)[2], billName(b), l.text, l.ok ? 'var(--income)' : tone(l.n, 2), 'data-bill="' + b.id + '"',
          l.ok ? '' : '<button type="button" class="btn primary" data-pay="' + b.id + '">دفعتها</button>'); }), 'أضف فواتيرك الشهرية: الكهرباء، النت، الجوال، الإيجار.') +
        '<button type="button" class="btn primary block" id="lfAdd">＋ أضف فاتورة</button>',
      mount(root) {
        root.querySelector('#lfAdd').onclick = () => reopen(() => billForm());
        root.querySelectorAll('[data-bill]').forEach((r) => { r.onclick = (e) => { if (e.target.closest('[data-pay]')) return; reopen(() => billForm(load().bills.find((x) => x.id === r.dataset.bill))); }; });
        root.querySelectorAll('[data-pay]').forEach((b) => { b.onclick = () => reopen(() => payForm(load().bills.find((x) => x.id === b.dataset.pay))); });
      },
    });
  }
  function billForm(b) {
    A.openSheet({
      title: b ? 'عدّل الفاتورة' : 'فاتورة جديدة', saveLabel: 'حفظ',
      body: '<div class="field"><label>الفاتورة</label><select name="type">' + BILLS.map(([k, l, i]) => '<option value="' + k + '"' + (b && b.type === k ? ' selected' : '') + '>' + i + ' ' + l + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>اسم يميّزها (اختياري)</label><input name="label" placeholder="مثلاً: نت البيت" value="' + h((b && b.label) || '') + '"></div>' +
        '<div class="field"><label>تستحق يوم كم بالشهر؟</label><input name="day" inputmode="numeric" class="ltr" value="' + h(String((b && b.day) || '')) + '" placeholder="1–31"></div>' +
        (b ? '<button type="button" class="btn danger block" id="lfDel">حذف</button>' : ''),
      mount(root) { const d = root.querySelector('#lfDel'); if (d) d.onclick = async () => { if (await A.ask('تحذف هالفاتورة؟')) { edit((v) => { v.bills = v.bills.filter((x) => x.id !== b.id); }); reopen(bills); } }; },
      onSave(root) {
        const day = Math.round(num(val(root, 'day')));
        if (!(day >= 1 && day <= 31)) throw new Error('اكتب يوم بين 1 و31');
        const it = Object.assign({ paid: {} }, b || {}, { id: (b && b.id) || S.uuid(), type: val(root, 'type'), label: val(root, 'label'), day });
        edit((v) => { v.bills = v.bills.filter((x) => x.id !== it.id).concat(it); });
        A.toast('انحفظت ✓'); setTimeout(bills, 300);
      },
    });
  }
  function payForm(b) {
    if (!b) return;
    const prev = (b.paid || {})[ym(addM(new Date(), -1))];
    A.openSheet({
      title: 'دفعت: ' + billOf(b)[1], saveLabel: 'حفظ',
      body: '<div class="field"><label>كم دفعت؟ (د.ب)</label><input name="amount" inputmode="decimal" class="ltr" value="' + (prev ? fmt(prev) : '') + '"></div>' +
        '<label class="switch"><input type="checkbox" name="tx" checked> سجّلها بالمصاريف</label>',
      onSave(root) {
        const amount = r3(num(val(root, 'amount')));
        if (!(amount > 0)) throw new Error('اكتب المبلغ');
        edit((v) => { const x = v.bills.find((y) => y.id === b.id); if (x) { x.paid = x.paid || {}; x.paid[ym(new Date())] = amount; } });
        if (root.querySelector('[name=tx]').checked) S.upsert('transactions', { id: S.uuid(), kind: 'expense', amount, category: b.type === 'rent' ? 'أخرى' : 'فواتير واتصالات', merchant: b.label || billOf(b)[1], occurred_at: new Date().toISOString() });
        A.toast('انسجلت ✓'); setTimeout(bills, 300);
      },
    });
  }

  // ================= 🤝 الجمعية =================
  // كل شهر الكل يدفع القسط، وواحد بالدور يقبض الكل (القسط × عدد الأعضاء)
  function jamState(j, now) {
    now = now || new Date();
    const start = parse(j.start), k = monthsBetween(start, now) + 1, n = Number(j.members) || 1, turn = Number(j.turn) || 1;
    const myMonth = addM(start, turn - 1), pot = r3((Number(j.amount) || 0) * n);
    const paidCount = Object.keys(j.paid || {}).length;
    return { k, n, turn, myMonth, pot, done: k > n, mine: k === turn, before: k < turn, paidNow: !!(j.paid || {})[ym(now)], paidCount };
  }
  function jamLine(j) {
    const s = jamState(j);
    if (s.done) return 'خلصت الجمعية ✓';
    return 'الدور <bdi>' + s.k + ' / ' + s.n + '</bdi> · ' + (s.mine ? '🎉 هالشهر دورك تقبض ' + fmt(s.pot) + ' د.ب' : s.before ? 'دورك تقبض ' + fmt(s.pot) + ' د.ب: ' + monthName(s.myMonth) : 'قبضت دورك ✓') +
      ' · ' + (s.paidNow ? 'دفعت قسط هالشهر ✓' : 'قسط هالشهر ' + fmt(Number(j.amount) || 0) + ' د.ب · يوم القسط ' + (Number(j.day) || 1));
  }
  function jamiya() {
    const js = load().jamiya;
    A.openSheet({
      title: '🤝 الجمعية', cancelLabel: 'تم',
      body: '<p class="small muted" style="margin:0 4px 12px">نذكّرك يوم القسط، ونقول لك متى دورك تقبض.</p>' +
        list(js.map((j) => { const s = jamState(j); return row('🤝', '<bdi>' + h(j.name) + '</bdi>', jamLine(j), s.mine ? 'var(--income)' : '', 'data-jam="' + j.id + '"',
          s.done || s.paidNow ? '' : '<button type="button" class="btn primary" data-jpay="' + j.id + '">دفعت</button>'); }), 'ما عندك جمعية مسجّلة.') +
        '<button type="button" class="btn primary block" id="lfAdd">＋ أضف جمعية</button>',
      mount(root) {
        root.querySelector('#lfAdd').onclick = () => reopen(() => jamForm());
        root.querySelectorAll('[data-jam]').forEach((r) => { r.onclick = (e) => { if (e.target.closest('[data-jpay]')) return; reopen(() => jamForm(load().jamiya.find((x) => x.id === r.dataset.jam))); }; });
        root.querySelectorAll('[data-jpay]').forEach((b) => { b.onclick = () => { edit((v) => { const x = v.jamiya.find((y) => y.id === b.dataset.jpay); if (x) { x.paid = x.paid || {}; x.paid[ym(new Date())] = true; } }); A.toast('انسجل القسط ✓'); reopen(jamiya); }; });
      },
    });
  }
  function jamForm(j) {
    const m = ym(new Date());
    A.openSheet({
      title: j ? 'عدّل الجمعية' : 'جمعية جديدة', saveLabel: 'حفظ',
      body: '<div class="field"><label>اسمها</label><input name="name" placeholder="مثلاً: جمعية الدوام" value="' + h((j && j.name) || '') + '"></div>' +
        '<div class="field"><label>القسط الشهري (د.ب)</label><input name="amount" inputmode="decimal" class="ltr" value="' + h(j ? String(j.amount) : '') + '"></div>' +
        '<div class="field"><label>كم عضو؟</label><input name="members" inputmode="numeric" class="ltr" value="' + h(j ? String(j.members) : '') + '"></div>' +
        '<div class="field"><label>بدت شهر</label><input name="start" type="month" value="' + h((j && j.start) || m) + '"></div>' +
        '<div class="field"><label>دورك رقم كم؟</label><input name="turn" inputmode="numeric" class="ltr" value="' + h(j ? String(j.turn) : '') + '"></div>' +
        '<div class="field"><label>يوم القسط بالشهر</label><input name="day" inputmode="numeric" class="ltr" value="' + h(j ? String(j.day) : '1') + '"></div>' +
        (j ? '<button type="button" class="btn danger block" id="lfDel">حذف</button>' : ''),
      mount(root) { const d = root.querySelector('#lfDel'); if (d) d.onclick = async () => { if (await A.ask('تحذف الجمعية؟')) { edit((v) => { v.jamiya = v.jamiya.filter((x) => x.id !== j.id); }); reopen(jamiya); } }; },
      onSave(root) {
        const name = val(root, 'name'), amount = r3(num(val(root, 'amount'))), members = Math.round(num(val(root, 'members'))), turn = Math.round(num(val(root, 'turn'))), day = Math.round(num(val(root, 'day'))) || 1;
        if (!name) throw new Error('اكتب اسم الجمعية');
        if (!(amount > 0)) throw new Error('اكتب القسط');
        if (!(members >= 2)) throw new Error('عدد الأعضاء 2 أو أكثر');
        if (!(turn >= 1 && turn <= members)) throw new Error('دورك بين 1 و' + members);
        const it = Object.assign({ paid: {} }, j || {}, { id: (j && j.id) || S.uuid(), name, amount, members, turn, day: Math.min(31, day), start: val(root, 'start') || m });
        edit((v) => { v.jamiya = v.jamiya.filter((x) => x.id !== it.id).concat(it); });
        A.toast('انحفظت ✓'); setTimeout(jamiya, 300);
      },
    });
  }

  // ================= 🔧 صيانة السيارة =================
  const CAR = [['oil', 'زيت المكينة', 90, 5000], ['tires', 'تدوير الكفرات', 180, 10000], ['air', 'فلتر الهوا', 365, 15000], ['battery', 'فحص البطارية', 365, 0], ['ac', 'تنظيف المكيف', 365, 0]];
  function carItems(v) {
    const have = v.car.items || [];
    return CAR.map(([k, l, d, km]) => Object.assign({ id: k, label: l, days: d, km }, have.find((x) => x.id === k) || {}));
  }
  function carDue(it, kmNow, now) {
    if (!it.last) return { n: null, text: 'متى آخر مرة؟ اضغط وحدد' };
    const n = A.daysBetween(day0(now), new Date(parse(it.last).getTime() + it.days * 864e5));
    const kmLeft = it.km && it.lastKm && kmNow ? Number(it.lastKm) + Number(it.km) - Number(kmNow) : null;
    const due = n <= 0 || (kmLeft != null && kmLeft <= 0);
    return { n: due ? 0 : n, kmLeft, text: due ? 'حان وقته 🔧' : 'باقي ' + A.nDays(n) + (kmLeft != null ? ' · ' + Math.round(kmLeft) + ' كيلو' : '') };
  }
  function car() {
    const v = load(), items = carItems(v);
    A.openSheet({
      title: '🔧 صيانة السيارة', cancelLabel: 'تم',
      body: '<div class="field"><label>العداد الحين (كم)</label><input name="km" inputmode="numeric" class="ltr" value="' + h(String(v.car.km || '')) + '" placeholder="مثلاً 84500"></div>' +
        list(items.map((it) => { const d = carDue(it, v.car.km); return row('🔧', it.label, d.text, d.n == null ? '' : tone(d.n, 7), 'data-car="' + it.id + '"', '<button type="button" class="btn ghost" data-done="' + it.id + '">سويته اليوم</button>'); }), '') +
        '<p class="small muted" style="margin:10px 4px 0">المدد تقريبية. شوف دليل سيارتك أو الوكالة لو تبي الدقيق.</p>',
      mount(root) {
        const km = root.querySelector('[name=km]');
        km.onchange = () => { edit((x) => { x.car.km = Math.round(num(km.value)) || ''; }); };
        root.querySelectorAll('[data-done]').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); edit((x) => { const its = carItems(x), it = its.find((y) => y.id === b.dataset.done); it.last = ymd(new Date()); it.lastKm = x.car.km || ''; x.car.items = its; }); A.toast('انسجلت ✓'); reopen(car); }; });
        root.querySelectorAll('[data-car]').forEach((r) => { r.onclick = () => reopen(() => carForm(carItems(load()).find((x) => x.id === r.dataset.car))); });
      },
    });
  }
  function carForm(it) {
    A.openSheet({
      title: it.label, saveLabel: 'حفظ',
      body: '<div class="field"><label>آخر مرة</label><input name="last" type="date" value="' + h(it.last || '') + '"></div>' +
        '<div class="field"><label>العداد وقتها (كم، اختياري)</label><input name="lastKm" inputmode="numeric" class="ltr" value="' + h(String(it.lastKm || '')) + '"></div>' +
        '<div class="field"><label>كل كم يوم؟</label><input name="days" inputmode="numeric" class="ltr" value="' + it.days + '"></div>' +
        '<div class="field"><label>أو كل كم كيلو؟ (0 = بالأيام بس)</label><input name="kmEvery" inputmode="numeric" class="ltr" value="' + (it.km || 0) + '"></div>',
      onSave(root) {
        const days = Math.round(num(val(root, 'days')));
        if (!(days >= 7)) throw new Error('المدة أسبوع أو أكثر');
        edit((x) => { const its = carItems(x), y = its.find((z) => z.id === it.id); Object.assign(y, { last: val(root, 'last'), lastKm: Math.round(num(val(root, 'lastKm'))) || '', days, km: Math.round(num(val(root, 'kmEvery'))) }); x.car.items = its; });
        A.toast('انحفظ ✓'); setTimeout(car, 300);
      },
    });
  }

  // ================= 🛟 صندوق الطوارئ =================
  // متوسط مصروفك آخر 3 شهور كاملة × 3 = يغطيك 3 شهور لو صار شي
  function avgMonth(now) {
    now = now || new Date();
    const from = addM(now, -3), to = addM(now, 0);
    const sum = (st.transactions || []).filter((t) => t.kind === 'expense' && new Date(t.occurred_at) >= from && new Date(t.occurred_at) < to).reduce((a, t) => a + (Number(t.amount) || 0), 0);
    return r3(sum / 3);
  }
  const fundGoal = () => (st.goals || []).find((g) => g.emoji === '🛟');
  function fund() {
    const avg = avgMonth(), target = Math.ceil(avg * 3), g = fundGoal();
    const pct = g && g.target ? Math.min(100, Math.round(((Number(g.saved) || 0) / g.target) * 100)) : 0;
    A.openSheet({
      title: '🛟 صندوق الطوارئ', cancelLabel: 'تم',
      body: (avg > 0
        ? '<div class="hero dark" style="text-align:center"><span class="eyebrow">تحتاج تقريباً</span><div class="big"><bdi>' + fmt(target) + '</bdi> د.ب</div><div class="meta"><span>3 أشهر × متوسط مصروفك ' + fmt(avg) + ' د.ب</span></div></div>' +
          (g ? '<div class="card" style="margin-top:12px"><b>جمعت ' + fmt(Number(g.saved) || 0) + ' من ' + fmt(g.target) + ' د.ب</b><div class="meter" style="margin-top:8px"><span style="width:' + pct + '%;background:var(--brand)"></span></div></div>'
            : '<button type="button" class="btn primary block" id="lfGoal" style="margin-top:12px">🎯 سوّه هدف ادخار</button>')
        : '<p class="small muted" style="margin:0 4px 12px">سجّل مصاريفك شهر على الأقل عشان نحسب لك كم تحتاج.</p>') +
        '<p class="small muted" style="margin:12px 4px 0">صندوق للطوارئ بس: مرض، تصليح سيارة، أو انقطاع دخل. الرقم تقدير من مصاريفك المسجّلة.</p>',
      mount(root) {
        const b = root.querySelector('#lfGoal');
        if (b) b.onclick = () => { S.upsert('goals', { id: S.uuid(), name: 'صندوق الطوارئ', emoji: '🛟', items: [], target, saved: 0, deadline: null, color: A.COLORS[2], done: false }); A.toast('انضاف الهدف 🎯'); A.closeSheet(); A.ui.moneySeg = 'goals'; A.go('money'); };
      },
    });
  }

  // ================= 🎁 العيدية =================
  function eidName(e) { return (e.eid === 'adha' ? 'عيد الأضحى' : 'عيد الفطر') + ' ' + e.year; }
  function eidiya() {
    const es = load().eid, groups = {};
    es.forEach((e) => { const k = e.eid + e.year; (groups[k] = groups[k] || { name: eidName(e), year: e.year, list: [] }).list.push(e); });
    const gs = Object.values(groups).sort((a, b) => b.year - a.year);
    A.openSheet({
      title: '🎁 العيدية', cancelLabel: 'تم',
      body: (gs.length ? gs.map((g) => {
        const out = g.list.filter((e) => e.dir === 'out').reduce((a, e) => a + e.amount, 0), inn = g.list.filter((e) => e.dir === 'in').reduce((a, e) => a + e.amount, 0);
        return '<div class="group-title">' + g.name + '</div><p class="small" style="margin:0 4px 8px">عطيت ' + fmt(out) + ' د.ب · استلمت ' + fmt(inn) + ' د.ب</p>' +
          list(g.list.map((e) => row(e.dir === 'out' ? '🎁' : '💝', '<bdi>' + h(e.who) + '</bdi>', (e.dir === 'out' ? 'عطيته ' : 'عطاني ') + fmt(e.amount) + ' د.ب', '', 'data-eid="' + e.id + '"')), '');
      }).join('') : '<p class="small muted" style="margin:0 4px 12px">سجّل مين عطيته عيدية ومين عطاك، عشان العيد الجاي تعرف.</p>') +
        '<button type="button" class="btn primary block" id="lfAdd" style="margin-top:12px">＋ أضف عيدية</button>',
      mount(root) {
        root.querySelector('#lfAdd').onclick = () => reopen(() => eidForm());
        root.querySelectorAll('[data-eid]').forEach((r) => { r.onclick = async () => { if (await A.ask('تحذف هالعيدية؟')) { edit((v) => { v.eid = v.eid.filter((x) => x.id !== r.dataset.eid); }); reopen(eidiya); } }; });
      },
    });
  }
  function eidForm() {
    const y = new Date().getFullYear();
    A.openSheet({
      title: 'عيدية جديدة', saveLabel: 'حفظ',
      body: '<div class="field"><label>العيد</label><select name="eid"><option value="fitr">عيد الفطر</option><option value="adha">عيد الأضحى</option></select></div>' +
        '<div class="field"><label>السنة</label><input name="year" inputmode="numeric" class="ltr" value="' + y + '"></div>' +
        '<div class="field"><label>عطيت ولا استلمت؟</label><select name="dir"><option value="out">عطيت</option><option value="in">استلمت</option></select></div>' +
        '<div class="field"><label>مين؟</label><input name="who" placeholder="مثلاً: ولد أخوي"></div>' +
        '<div class="field"><label>المبلغ (د.ب)</label><input name="amount" inputmode="decimal" class="ltr"></div>',
      onSave(root) {
        const who = val(root, 'who'), amount = r3(num(val(root, 'amount'))), year = Math.round(num(val(root, 'year'))) || y;
        if (!who) throw new Error('اكتب الاسم');
        if (!(amount > 0)) throw new Error('اكتب المبلغ');
        edit((v) => { v.eid.push({ id: S.uuid(), eid: val(root, 'eid'), year, dir: val(root, 'dir'), who, amount }); });
        A.toast('انسجلت ✓'); setTimeout(eidiya, 300);
      },
    });
  }

  // ================= 🕌 عداد القضاء (على الجهاز بس) =================
  const QADA = [['fajr', 'الصبح'], ['dhuhr', 'الظهر'], ['asr', 'العصر'], ['maghrib', 'المغرب'], ['isha', 'العشاء'], ['fast', 'الصيام (أيام)']];
  function qada() {
    const q = load().qada;
    const total = QADA.reduce((a, [k]) => a + (Number(q[k]) || 0), 0);
    A.openSheet({
      title: '🕌 القضاء', cancelLabel: 'تم',
      body: '<p class="small muted" style="margin:0 4px 12px">اكتب اللي عليك، وكل ما قضيت وحدة اضغط «−». يبقى على جهازك بس.</p>' +
        '<div class="card flush"><ul class="list">' + QADA.map(([k, l]) => '<li class="row" style="cursor:default"><div class="main"><div class="title"><span>' + l + '</span></div></div>' +
          '<div style="display:flex;align-items:center;gap:10px"><button type="button" class="btn ghost" data-q="' + k + '" data-d="-1" aria-label="قضيت وحدة">−</button><b class="num" style="min-width:42px;text-align:center" data-qv="' + k + '">' + (Number(q[k]) || 0) + '</b>' +
          '<button type="button" class="btn ghost" data-q="' + k + '" data-d="1" aria-label="زيد">＋</button></div></li>').join('') + '</ul></div>' +
        (total === 0 ? '<p class="small" style="margin:10px 4px 0;color:var(--income)">ما عليك شي مسجّل ✓</p>' : ''),
      mount(root) {
        root.querySelectorAll('[data-q]').forEach((b) => { b.onclick = () => {
          const k = b.dataset.q, d = Number(b.dataset.d);
          const v = load(); v.qada[k] = Math.max(0, (Number(v.qada[k]) || 0) + d);
          try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* تجاهل */ }
          root.querySelector('[data-qv="' + k + '"]').textContent = v.qada[k];
          if (d < 0) A.toast('تقبّل الله 🤍');
        }; });
      },
    });
  }

  // ================= اليوم + التنبيهات =================
  // أهم شي قريب: ورقة تنتهي خلال شهر، فاتورة خلال يومين، قسط أو دور الجمعية، صيانة حان وقتها
  function urgent(now) {
    now = now || new Date();
    const v = load(), out = [];
    for (const p of v.papers) { const n = left(p.exp, now); if (n != null && n <= 30) out.push({ n, sec: 'papers', ico: paperOf(p)[2], t: paperName(p) + ': ' + leftText(n) }); }
    for (const b of v.bills) { const l = billLine(b, now); if (!l.ok && l.n <= 2) out.push({ n: l.n, sec: 'bills', ico: billOf(b)[2], t: billName(b) + ': ' + l.text }); }
    for (const j of v.jamiya) {
      const s = jamState(j, now); if (s.done) continue;
      if (s.mine) out.push({ n: 0, sec: 'jamiya', ico: '🎉', t: 'هالشهر دورك تقبض الجمعية: ' + fmt(s.pot) + ' د.ب' });
      const n = A.daysBetween(day0(now), dueIn(j, now));
      if (!s.paidNow && n >= 0 && n <= 1) out.push({ n, sec: 'jamiya', ico: '🤝', t: 'قسط <bdi>' + h(j.name) + '</bdi>: ' + (n === 0 ? 'اليوم' : 'بكرة') });
    }
    for (const it of carItems(v)) { const d = carDue(it, v.car.km, now); if (d.n != null && d.n <= 7) out.push({ n: d.n, sec: 'car', ico: '🔧', t: it.label + ': ' + d.text }); }
    return out.sort((a, b) => a.n - b.n);
  }
  function todayRows() {
    return urgent().slice(0, 2).map((x) => '<button class="cta" data-action="life" data-sec="' + x.sec + '" style="margin-top:10px"><div class="ico">' + x.ico + '</div><div style="flex:1;min-width:0"><b>' + x.t + '</b></div>' + A.I('chevL') + '</button>').join('');
  }
  function reminders(now) {
    now = now || new Date();
    const v = load(), out = [], at = (d, hh) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, 0, 0, 0);
    const push = (key, when, title, body, sec) => { if (when > now) out.push({ key, at: when, title, body, extra: { kind: 'life', sec } }); };
    for (const p of v.papers) {
      const d = parse(p.exp); if (!d) continue;
      const nm = p.label || paperOf(p)[1];
      push('paper:' + p.id + ':30', at(new Date(d.getTime() - 30 * 864e5), 9), paperOf(p)[2] + ' ' + nm + ': باقي شهر', 'جدّدها قبل لا تنتهي', 'papers');
      push('paper:' + p.id + ':7', at(new Date(d.getTime() - 7 * 864e5), 9), paperOf(p)[2] + ' ' + nm + ': باقي أسبوع', 'جدّدها قبل لا تنتهي', 'papers');
      push('paper:' + p.id + ':0', at(d, 9), paperOf(p)[2] + ' ' + nm + ': تنتهي اليوم', 'جدّدها اليوم', 'papers');
    }
    for (const m of [now, addM(now, 1)]) {
      for (const b of v.bills) {
        if ((b.paid || {})[ym(m)] != null) continue;
        const due = dueIn(b, m);
        push('bill:' + b.id + ':' + ym(m), at(new Date(due.getTime() - 2 * 864e5), 20), billOf(b)[2] + ' ' + (b.label || billOf(b)[1]) + ': تستحق بعد يومين', 'اضغط «دفعتها» لما تدفع', 'bills');
      }
      for (const j of v.jamiya) {
        const s = jamState(j, m); if (s.done || (j.paid || {})[ym(m)]) continue;
        push('jam:' + j.id + ':' + ym(m), at(dueIn(j, m), 9), '🤝 قسط ' + j.name + ' اليوم', fmt(Number(j.amount) || 0) + ' د.ب' + (s.mine ? ' · وهالشهر دورك تقبض 🎉' : ''), 'jamiya');
      }
    }
    for (const it of carItems(v)) {
      if (!it.last) continue;
      push('car:' + it.id + ':' + it.last, at(new Date(parse(it.last).getTime() + it.days * 864e5), 9), '🔧 ' + it.label + ': حان وقته', 'سجّلها من «صيانة السيارة» بعد ما تسويها', 'car');
    }
    return out;
  }

  const SECS = { papers, bills, jamiya, car, fund, eidiya, qada };
  const prevAct = E.action;
  E.action = (name, el, e) => {
    if (name === 'life') { const f = SECS[el && el.dataset.sec]; if (f) f(); return; }
    return prevAct ? prevAct(name, el, e) : undefined;
  };
  const prevMid = E.todayMid;
  E.todayMid = (...a) => (prevMid ? prevMid(...a) : '') + todayRows();
  const prevMoney = E.moneyActions;
  E.moneyActions = (...a) => (prevMoney ? prevMoney(...a) : '') + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 4px"><button class="btn ghost" data-action="life" data-sec="bills">💡 فواتير البيت</button><button class="btn ghost" data-action="life" data-sec="jamiya">🤝 الجمعية</button></div>';
  // «كل شي بحياتي»
  if (E.Tools && E.Tools.GROUPS) {
    const g = (t) => E.Tools.GROUPS.find((x) => x[0].indexOf(t) >= 0);
    const go = (k) => () => SECS[k]();
    const money = g('الفلوس'), life = g('يومك'), ibada = g('العبادة');
    if (money) money[1].push(['bills', 'receipt', '#f59e0b', 'فواتير البيت', go('bills')], ['jamiya', 'users', '#0d9488', 'الجمعية', go('jamiya')], ['fund', 'piggy', '#10b981', 'صندوق الطوارئ', go('fund')], ['eidiya', 'gift', '#ec4899', 'العيدية', go('eidiya')]);
    if (life) life[1].push(['papers', 'key', '#13636B', 'أوراقك', go('papers')], ['car', 'fuel', '#64748b', 'صيانة السيارة', go('car')]);
    if (ibada) ibada[1].push(['qada', 'moon', '#0d9488', 'القضاء', go('qada')]);
  }
  E.Life = { load, papers, bills, jamiya, car, fund, eidiya, qada, urgent, reminders, jamState, billLine, carDue, avgMonth, KEY };
})();
