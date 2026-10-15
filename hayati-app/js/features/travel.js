// «تخطيط السفر» (DW-028): أكثر من رحلة، كل رحلة لها ميزانية بنود مقابل المصروف، قائمة أغراض مقسّمة عشان ما تنسى شي، وعداد للسفر.
// «مخطط العمرة» (DW-027) صار نوع رحلة من هني، وبياناته القديمة تنتقل بروحها.
// كل الرحلات على الجهاز بس (localStorage) وما تتزامن: الوجهة والتواريخ خاصة، والعمرة معلومة دينية.
// «سجّلها بالمصاريف» اختياري، والعملية تنكتب «سفر · البند» بكلمة محايدة.
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, I, h, tint } = A;
  const wrap = (name, fn) => { const prev = E[name]; E[name] = (...a) => fn(prev ? prev : () => '', ...a); };
  const KEY = 'hayati-trips', OLD = 'hayati-umrah';

  const KINDS = { leisure: ['سياحة', '🏖️'], umrah: ['عمرة', '🕋'], work: ['عمل', '💼'], study: ['دراسة', '🎓'], family: ['زيارة أهل', '🏡'] };
  // [المفتاح، الاسم، الأيقونة، فئة المصاريف لو انسجّلت]
  const CATS = [
    ['flight', 'الطيران', '✈️', 'أخرى'],
    ['hotel', 'السكن', '🏨', 'أخرى'],
    ['visa', 'التأشيرة / الباقة', '🧾', 'أخرى'],
    ['transport', 'المواصلات', '🚕', 'مواصلات وبنزين'],
    ['food', 'الأكل', '🍽️', 'أكل ومطاعم'],
    ['fun', 'الأنشطة', '🎟️', 'ترفيه'],
    ['shopping', 'التسوق والهدايا', '🛍️', 'بقالة وتسوق'],
    ['other', 'أخرى', '💳', 'أخرى'],
  ];
  const GROUPS = ['أوراق', 'فلوس', 'ملابس', 'إلكترونيات', 'صحة', 'أغراض'];
  const PACK = {
    base: [['أوراق', 'جواز السفر (صالح 6 أشهر على الأقل)'], ['أوراق', 'التأشيرة أو التصريح'], ['أوراق', 'تذاكر الطيران'], ['أوراق', 'حجز السكن'], ['أوراق', 'صورة من الجواز بالجوال'], ['أوراق', 'تأمين السفر'],
      ['فلوس', 'بطاقة تشتغل برا + شوية كاش بعملة البلد'], ['ملابس', 'ملابس على عدد الأيام'], ['ملابس', 'نعال وأحذية مريحة'], ['ملابس', 'أغراض الحمام والنوم'],
      ['إلكترونيات', 'شاحن ووصلة وباور بانك'], ['إلكترونيات', 'محوّل كهرباء (فيش)'], ['صحة', 'أدويتك الشخصية'], ['صحة', 'معقم وكمامات']],
    umrah: [['ملابس', 'ملابس الإحرام'], ['أوراق', 'حزام أو محفظة للأوراق']],
    leisure: [['ملابس', 'نظارة شمس وواقي شمس'], ['ملابس', 'ملابس سباحة']],
    work: [['إلكترونيات', 'اللابتوب وشاحنه'], ['ملابس', 'ملابس رسمية'], ['أوراق', 'أوراق الاجتماعات وكروت العمل']],
    study: [['أوراق', 'القبول والشهادات'], ['إلكترونيات', 'اللابتوب وشاحنه']],
    family: [['أغراض', 'هدايا الأهل']],
  };
  const packFor = (kind) => PACK.base.concat(PACK[kind] || []).map(([g, t]) => ({ g, t, on: false }));

  // ================= التخزين (على الجهاز) =================
  function migrate(list) {
    let old = null;
    try { old = JSON.parse(localStorage.getItem(OLD) || 'null'); } catch (e) { old = null; }
    if (!old || typeof old !== 'object') return list;
    const plan = Object.assign({}, old.plan); if (plan.package) { plan.visa = plan.package; delete plan.package; }
    list.push({ id: S.uuid(), name: 'العمرة', kind: 'umrah', go: old.go || '', back: old.back || '', plan,
      costs: (old.costs || []).map((c) => Object.assign({}, c, { cat: c.cat === 'package' ? 'visa' : c.cat })),
      check: (old.check || []).map((c) => ({ g: c.g || 'أغراض', t: c.t, on: !!c.on })) });
    try { localStorage.setItem(KEY, JSON.stringify(list)); localStorage.removeItem(OLD); } catch (e) { /* يحاول مرة ثانية */ }
    return list;
  }
  function all() {
    let list = [];
    try { list = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { list = []; }
    if (!Array.isArray(list)) list = [];
    return migrate(list);
  }
  const saveAll = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { A.toast('ما قدرنا نحفظ على هالجهاز'); } };
  const put = (t) => { const list = all(), i = list.findIndex((x) => x.id === t.id); if (i >= 0) list[i] = t; else list.push(t); saveAll(list); };
  const get = (id) => all().find((x) => x.id === id) || null;

  const sum = (arr) => arr.reduce((a, x) => a + (Number(x) || 0), 0);
  const spentOf = (t, k) => sum(t.costs.filter((c) => !k || c.cat === k).map((c) => c.amount));
  const planned = (t) => sum(CATS.map(([k]) => t.plan[k]));
  const day = (s) => (s ? new Date(s + 'T00:00:00') : null);
  const human = (s) => { const d = day(s); return d ? d.getDate() + ' ' + A.MONTHS[d.getMonth()] : ''; };
  const nights = (t) => (t.go && t.back ? Math.max(0, A.daysBetween(day(t.go), day(t.back))) : 0);

  // العداد: قبل السفر / يوم السفر / خلال الرحلة / بعد الرجعة
  function countdown(t, now) {
    now = now || new Date();
    const go = day(t.go), back = day(t.back);
    if (!go) return { text: 'حدد تاريخ السفر', n: null, phase: 'none' };
    const d = A.daysBetween(now, go);
    if (d > 0) return { text: 'باقي ' + A.nDays(d) + ' على السفر', n: d, phase: 'before' };
    if (d === 0) return { text: 'السفر اليوم ✈️', n: 0, phase: 'today' };
    if (back && A.daysBetween(now, back) >= 0) return { text: 'رحلة موفقة 🤍', n: 0, phase: 'during' };
    return { text: 'ترجع بالسلامة 🤍', n: 0, phase: 'after' };
  }
  const order = (list) => list.slice().sort((a, b) => {
    const pa = ['during', 'today', 'before', 'none', 'after'].indexOf(countdown(a).phase), pb = ['during', 'today', 'before', 'none', 'after'].indexOf(countdown(b).phase);
    return pa - pb || String(a.go || '9').localeCompare(String(b.go || '9'));
  });

  // ================= قائمة الرحلات =================
  function listSheet() {
    const list = order(all());
    const row = (t) => {
      const cd = countdown(t), p = planned(t), sp = spentOf(t), done = t.check.filter((c) => c.on).length;
      return '<li class="row" data-trip="' + t.id + '" style="cursor:pointer"><div class="ico" style="' + tint('#0d9488') + ';font-size:20px">' + (KINDS[t.kind] || KINDS.leisure)[1] + '</div>' +
        '<div class="main"><div class="title"><span class="t">' + h(t.name) + '</span></div><div class="sub" style="white-space:normal">' + cd.text + ' · التجهيز ' + done + '/' + t.check.length + (p ? ' · صرفت ' + A.fmt(sp) + ' من ' + A.fmt(p) : '') + '</div></div>' + I('chevL') + '</li>';
    };
    A.openSheet({
      title: '🧳 تخطيط السفر',
      cancelLabel: 'تم',
      body: (list.length ? '<div class="card flush"><ul class="list" id="tvTrips">' + list.map(row).join('') + '</ul></div>'
        : '<div class="card">' + A.empty('briefcase', 'ما فيه رحلات', 'خطط لرحلتك: الميزانية، والأغراض عشان ما تنسى شي، وكم باقي على السفر.') + '</div>') +
        '<button type="button" class="btn primary block" id="tvNew" style="margin-top:12px">' + I('plus') + 'رحلة جديدة</button>' +
        '<p class="small muted" style="margin:12px 4px 0">كل الرحلات على جوالك بس، وما تتزامن مع حسابك.</p>',
      mount(root) {
        root.querySelector('#tvNew').onclick = () => newSheet();
        const ul = root.querySelector('#tvTrips');
        if (ul) ul.onclick = (e) => { const r = e.target.closest('[data-trip]'); if (r) tripSheet(r.dataset.trip); };
      },
    });
  }

  function newSheet(kind) {
    A.openSheet({
      title: 'رحلة جديدة',
      saveLabel: 'يلا',
      body: '<div class="field"><label for="tvName">وين؟</label><input id="tvName" maxlength="40" placeholder="مثلاً: إسطنبول"></div>' +
        '<div class="field"><label for="tvKind">نوع الرحلة</label><select id="tvKind">' + Object.entries(KINDS).map(([k, [n, e]]) => '<option value="' + k + '"' + (k === (kind || 'leisure') ? ' selected' : '') + '>' + e + ' ' + n + '</option>').join('') + '</select></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div class="field" style="min-width:0"><label for="tvGo0">السفر</label><input type="date" id="tvGo0" style="width:100%;min-width:0;box-sizing:border-box"></div><div class="field" style="min-width:0"><label for="tvBack0">الرجعة</label><input type="date" id="tvBack0" style="width:100%;min-width:0;box-sizing:border-box"></div></div>' +
        '<p class="small muted" style="margin:0 4px">قائمة الأغراض تنعبّى بروحها حسب نوع الرحلة، وتقدر تعدّلها.</p>',
      onSave(root) {
        const k = root.querySelector('#tvKind').value, name = root.querySelector('#tvName').value.trim() || (KINDS[k] || KINDS.leisure)[0];
        let go = root.querySelector('#tvGo0').value, back = root.querySelector('#tvBack0').value;
        if (go && back && back < go) back = go;
        const t = { id: S.uuid(), name: name.slice(0, 40), kind: k, go, back, plan: {}, costs: [], check: packFor(k) };
        put(t);
        setTimeout(() => tripSheet(t.id), 280);
      },
    });
  }

  // ================= الرحلة =================
  function tripSheet(id) {
    const t = get(id);
    if (!t) { listSheet(); return; }
    const cd = countdown(t), p = planned(t), sp = spentOf(t), n = nights(t), done = t.check.filter((c) => c.on).length;
    const kind = KINDS[t.kind] || KINDS.leisure;
    const body =
      '<button type="button" class="link" id="tvAll" style="margin:0 4px 8px;background:none;border:0;padding:4px 0;color:var(--brand);font:inherit;font-weight:600;display:inline-flex;align-items:center;gap:4px">' + I('chevR') + 'كل الرحلات</button>' +
      '<div class="hero dark"><span class="eyebrow">' + kind[1] + ' ' + h(t.name) + '</span>' +
        '<div class="big" id="tvCount">' + cd.text + '</div>' +
        '<div class="meta"><span>' + (t.go ? 'السفر ' + human(t.go) + (t.back ? ' · الرجعة ' + human(t.back) + (n ? ' · ' + A.nDays(n) : '') : '') : 'حدد التواريخ تحت') + '</span></div></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px"><div class="field" style="min-width:0;margin:0"><label for="tvGo">السفر</label><input type="date" id="tvGo" style="width:100%;min-width:0;box-sizing:border-box" value="' + h(t.go) + '"></div><div class="field" style="min-width:0;margin:0"><label for="tvBack">الرجعة</label><input type="date" id="tvBack" style="width:100%;min-width:0;box-sizing:border-box" value="' + h(t.back) + '"></div></div>' +
      A.secHead('الميزانية', '<button class="link" type="button" id="tvPlan">عدّل</button>') +
      '<div class="card"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><b>صرفت <span class="num" id="tvSpent">' + A.money(sp) + '</span></b><span class="small muted">' + (p ? 'من ' + A.money(p) : 'ما حددت ميزانية') + '</span></div>' +
        (p ? '<div class="meter" style="height:10px;margin:10px 0 4px"><span style="width:' + Math.min(100, (sp / p) * 100) + '%;background:' + (sp > p ? 'var(--expense)' : 'var(--brand)') + '"></span></div>' +
          '<p class="small ' + (sp > p ? '' : 'muted') + '" style="margin:4px 0 0' + (sp > p ? ';color:var(--expense)' : '') + '">' + (sp > p ? 'تعدّيت الميزانية بـ ' + A.money(sp - p) : 'باقي ' + A.money(p - sp)) + (n ? ' · تقريباً ' + A.money(p / n) + ' بالليلة' : '') + '</p>' : '') +
      '</div>' +
      '<div class="card flush"><ul class="list">' + CATS.map(([k, nm, e]) => {
        const s = spentOf(t, k), pl = Number(t.plan[k]) || 0;
        if (!s && !pl && ['fun', 'shopping', 'visa'].includes(k) && t.kind !== 'leisure') return '';
        return '<li class="row" style="cursor:default"><div class="ico" style="' + tint('#0d9488') + '">' + e + '</div><div class="main"><div class="title"><span class="t">' + nm + '</span></div>' +
          '<div class="sub">' + (pl ? 'من ' + A.fmt(pl) + ' د.ب' : 'بدون ميزانية') + '</div></div><div class="amount fit">' + A.money(s) + '</div></li>';
      }).join('') + '</ul></div>' +
      '<button type="button" class="btn block" id="tvAdd" style="margin-top:10px">' + I('plus') + 'أضف مصروف للرحلة</button>' +
      A.secHead('الأغراض', '<span class="count" id="tvDone">' + done + '/' + t.check.length + '</span>') +
      '<div id="tvList">' + packList(t) + '</div>' +
      '<div class="field" style="display:flex;gap:8px;margin-top:10px"><select id="tvGroup" aria-label="المجموعة" style="flex:none;width:auto">' + GROUPS.map((g) => '<option>' + g + '</option>').join('') + '</select><input id="tvItem" maxlength="80" placeholder="أضف غرض" aria-label="أضف غرض" style="flex:1;min-width:0"><button type="button" class="btn" id="tvItemAdd">أضف</button></div>' +
      '<p class="small muted" style="margin:12px 4px 0">بيانات الرحلة على جوالك بس، وما تتزامن مع حسابك.</p>' +
      '<button type="button" class="btn ghost block" id="tvDel" style="margin-top:12px;color:var(--expense)">احذف الرحلة</button>';

    A.openSheet({
      title: '🧳 ' + h(t.name),
      cancelLabel: 'تم',
      body,
      mount(root) {
        const persist = () => put(t);
        const refreshList = () => { root.querySelector('#tvList').innerHTML = packList(t); root.querySelector('#tvDone').textContent = t.check.filter((c) => c.on).length + '/' + t.check.length; };
        const onDate = () => {
          t.go = root.querySelector('#tvGo').value; t.back = root.querySelector('#tvBack').value;
          if (t.go && t.back && t.back < t.go) { t.back = t.go; root.querySelector('#tvBack').value = t.go; }
          persist(); root.querySelector('#tvCount').textContent = countdown(t).text;
        };
        root.querySelector('#tvGo').onchange = onDate; root.querySelector('#tvBack').onchange = onDate;
        root.querySelector('#tvAll').onclick = () => listSheet();
        root.querySelector('#tvList').onclick = (e) => {
          const b = e.target.closest('[data-tv]'); if (!b) return;
          const i = Number(b.dataset.tv);
          if (b.dataset.del != null) t.check.splice(i, 1); else t.check[i].on = !t.check[i].on;
          persist(); refreshList();
        };
        root.querySelector('#tvItemAdd').onclick = () => {
          const inp = root.querySelector('#tvItem'), v = inp.value.trim();
          if (!v) return;
          t.check.push({ g: root.querySelector('#tvGroup').value, t: v.slice(0, 80), on: false }); inp.value = ''; persist(); refreshList();
        };
        root.querySelector('#tvPlan').onclick = () => planSheet(t);
        root.querySelector('#tvAdd').onclick = () => costSheet(t);
        root.querySelector('#tvDel').onclick = async () => {
          if (!(await A.ask('تحذف «' + t.name + '» من جوالك؟'))) return;
          saveAll(all().filter((x) => x.id !== t.id)); A.render(); listSheet();
        };
      },
    });
  }
  // الأغراض مقسّمة بالمجموعات، وكل غرض يحتفظ برقمه الأصلي عشان الحذف والتعليم
  function packList(t) {
    const idx = t.check.map((c, i) => [c, i]);
    return GROUPS.concat([...new Set(t.check.map((c) => c.g))].filter((g) => !GROUPS.includes(g))).map((g) => {
      const items = idx.filter(([c]) => (c.g || 'أغراض') === g);
      if (!items.length) return '';
      const ok = items.filter(([c]) => c.on).length;
      return '<div class="group-title" style="display:flex;justify-content:space-between"><span>' + h(g) + '</span><span class="small muted num">' + ok + '/' + items.length + '</span></div>' +
        '<div class="card flush"><ul class="list">' + items.map(([c, i]) => '<li class="row' + (c.on ? ' done' : '') + '" style="cursor:default"><button type="button" class="check' + (c.on ? ' on' : '') + '" data-tv="' + i + '" aria-label="' + (c.on ? 'جاهز: ' : 'مو جاهز: ') + h(c.t) + '" aria-pressed="' + c.on + '">' + I('check') + '</button>' +
          '<div class="main"><div class="title"><span class="t" style="white-space:normal">' + h(c.t) + '</span></div></div>' +
          '<button type="button" class="icon-x" data-tv="' + i + '" data-del aria-label="احذف ' + h(c.t) + '">✕</button></li>').join('') + '</ul></div>';
    }).join('');
  }

  function planSheet(t) {
    A.openSheet({
      title: 'ميزانية ' + h(t.name),
      body: '<p class="small muted" style="margin:0 4px 10px">اكتب تقديرك لكل بند (اختياري).</p>' +
        CATS.map(([k, n, e]) => '<div class="field"><label for="tvP_' + k + '">' + e + ' ' + n + '</label><input id="tvP_' + k + '" inputmode="decimal" placeholder="0.000" value="' + (t.plan[k] ? A.fmt(t.plan[k]) : '') + '"></div>').join(''),
      onSave(root) {
        CATS.forEach(([k]) => { const v = A.parseAmount(root.querySelector('#tvP_' + k).value); if (v > 0) t.plan[k] = v; else delete t.plan[k]; });
        put(t); setTimeout(() => tripSheet(t.id), 280);
      },
    });
  }

  function costSheet(t) {
    A.openSheet({
      title: 'مصروف للرحلة',
      saveLabel: 'أضف',
      body: '<div class="field"><label for="tvC">البند</label><select id="tvC">' + CATS.map(([k, n, e]) => '<option value="' + k + '">' + e + ' ' + n + '</option>').join('') + '</select></div>' +
        '<div class="field"><label for="tvA">المبلغ (د.ب)</label><input id="tvA" inputmode="decimal" placeholder="0.000"></div>' +
        '<div class="field"><label for="tvN">ملاحظة (اختياري)</label><input id="tvN" maxlength="80" placeholder="مثلاً: عربون الفندق"></div>' +
        '<label class="small" style="display:flex;gap:8px;align-items:center;margin:4px 4px 0"><input type="checkbox" id="tvTx"> سجّلها بالمصاريف بعد (تنكتب «سفر» بس)</label>',
      onSave(root) {
        const amount = A.parseAmount(root.querySelector('#tvA').value);
        if (!(amount > 0)) throw new Error('اكتب المبلغ');
        const cat = root.querySelector('#tvC').value, note = root.querySelector('#tvN').value.trim().slice(0, 80);
        t.costs.push({ id: S.uuid(), cat, amount, note, at: new Date().toISOString() });
        put(t);
        if (root.querySelector('#tvTx').checked) {
          const c = CATS.find((x) => x[0] === cat);
          S.upsert('transactions', { id: S.uuid(), kind: 'expense', amount, category: c[3], note: 'سفر · ' + c[1], occurred_at: new Date().toISOString() });
        }
        A.toast('انضاف ✓');
        setTimeout(() => tripSheet(t.id), 280);
      },
    });
  }

  // من «عبادتي»: يفتح رحلة العمرة لو فيه، وإلا يسوي وحدة
  function umrah() {
    const u = order(all()).find((x) => x.kind === 'umrah' && countdown(x).phase !== 'after');
    if (u) { tripSheet(u.id); return; }
    const t = { id: S.uuid(), name: 'العمرة', kind: 'umrah', go: '', back: '', plan: {}, costs: [], check: packFor('umrah') };
    put(t); tripSheet(t.id);
  }

  // سطر باليوم لأقرب رحلة (خلال 30 يوم أو الحين)
  function todayRow() {
    const t = order(all()).find((x) => { const c = countdown(x); return c.phase === 'today' || c.phase === 'during' || (c.phase === 'before' && c.n <= 30); });
    if (!t) return '';
    const cd = countdown(t), done = t.check.filter((c) => c.on).length;
    return '<button class="cta" data-action="trip" data-id="' + t.id + '" style="margin-top:10px"><div class="ico">' + (KINDS[t.kind] || KINDS.leisure)[1] + '</div><div style="flex:1;min-width:0"><b>' + h(t.name) + ': ' + cd.text + '</b><small>الأغراض ' + done + '/' + t.check.length + '</small></div>' + I('chevL') + '</button>';
  }

  // ================= الربط =================
  wrap('todayMid', (prev) => prev() + todayRow());
  wrap('action', (prev, name, el, e) => {
    if (name === 'travel') { listSheet(); return; }
    if (name === 'trip') { tripSheet(el && el.dataset.id); return; }
    if (name === 'umrah') { umrah(); return; }
    return prev(name, el, e);
  });
  E.Travel = { KEY, KINDS, CATS, GROUPS, PACK, all, get, countdown, spentOf, planned, listSheet, tripSheet, newSheet, umrah };
  E.Umrah = { sheet: umrah, countdown };
})();
