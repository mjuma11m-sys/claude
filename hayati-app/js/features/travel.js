// «تخطيط السفر» (DW-028): أكثر من رحلة، كل رحلة لها ميزانية بنود مقابل المصروف، قائمة أغراض مقسّمة عشان ما تنسى شي، وعداد للسفر.
// «مخطط العمرة» (DW-027) صار نوع رحلة من هني، وبياناته القديمة تنتقل بروحها.
// DW-035: الرحلات تتزامن مع حسابك (جدول trips) عشان توصل لكل أجهزتك. رحلات العمرة تظل على الجهاز بس (معلومة دينية، قاعدة المالك).
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
  // 💱 العملات (DW-032): [الرمز، الاسم، كم وحدة تساوي 1 د.ب (0 = المستخدم يكتبه)]. المربوطة بالدولار لها سعر جاهز (الدينار نفسه مربوط: 1 د.ب = 2.6596 $)،
  //   والباقي يتغيّر كل يوم فالمستخدم يكتب السعر من بنكه أو الصرّاف. كلها تقدير: البنك ياخذ عمولة فوق.
  const CUR = [
    ['SAR', 'ريال سعودي', 9.9734], ['AED', 'درهم إماراتي', 9.7672], ['QAR', 'ريال قطري', 9.6809], ['OMR', 'ريال عماني', 1.0226],
    ['USD', 'دولار أمريكي', 2.6596], ['KWD', 'دينار كويتي', 0], ['EUR', 'يورو', 0], ['GBP', 'جنيه إسترليني', 0],
    ['TRY', 'ليرة تركية', 0], ['EGP', 'جنيه مصري', 0], ['JOD', 'دينار أردني', 1.8857], ['INR', 'روبية هندية', 0],
    ['THB', 'بات تايلندي', 0], ['MYR', 'رينغيت ماليزي', 0], ['GEL', 'لاري جورجي', 0], ['AZN', 'مانات أذربيجاني', 4.5213],
  ];
  const curOf = (t) => (t.cur && t.cur.code && t.cur.rate > 0 ? t.cur : null);
  const curName = (code) => (CUR.find((c) => c[0] === code) || [code, code, code])[1];
  const toBHD = (t, v) => { const c = curOf(t); return c ? Math.round((v / c.rate) * 1000) / 1000 : v; };
  const inCur = (t, bhd) => { const c = curOf(t); return c ? (Math.round(bhd * c.rate * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ' + c.code : ''; };

  const packFor = (kind) => PACK.base.concat(PACK[kind] || []).map(([g, t]) => ({ g, t, on: false }));

  // ================= التخزين =================
  const isLocal = (t) => t.kind === 'umrah';
  const readLocal = () => { try { const l = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } };
  // التعديل على الجهاز ما يمر على Store، فنعيد جدولة تنبيهات السفر بأنفسنا
  const writeLocal = (l) => {
    try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) { A.toast('ما قدرنا نحفظ على هالجهاز'); }
    if (window.HayatiNative && typeof HayatiNative.reschedule === 'function') { clearTimeout(writeLocal.t); writeLocal.t = setTimeout(() => HayatiNative.reschedule(), 800); }
  };
  // رحلات من قبل DW-035 كانت كلها على الجهاز: غير العمرة تنتقل للحساب مرة وحدة
  function adopt() {
    const list = readLocal(), moving = list.filter((t) => t && t.id && !isLocal(t));
    if (!moving.length) return;
    // نشيلها من الجهاز أول: upsert يعيد رسم الشاشة ويقرا الرحلات مرة ثانية
    writeLocal(list.filter((t) => t && isLocal(t)));
    moving.forEach((t) => S.upsert('trips', t));
  }
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
    adopt();
    const synced = (S.state.trips || []).map((t) => Object.assign({ plan: {}, costs: [], check: [] }, t, { plan: Object.assign({}, t.plan), costs: (t.costs || []).slice(), check: (t.check || []).map((c) => Object.assign({}, c)) }));
    return migrate(readLocal()).concat(synced);
  }
  function put(t) {
    if (!isLocal(t)) { S.upsert('trips', t); return; }
    const list = readLocal(), i = list.findIndex((x) => x.id === t.id);
    if (i >= 0) list[i] = t; else list.push(t);
    writeLocal(list);
  }
  function drop(t) {
    if (isLocal(t)) writeLocal(readLocal().filter((x) => x.id !== t.id)); else S.remove('trips', t.id);
  }
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
  // ⏰ تذكير قبل السفر (DW-033): قبله بـ 3 أيام والليلة اللي قبله، الساعة 8 الليل، مع كم غرض باقي
  const nItems = (n) => (n === 1 ? 'غرض واحد' : n === 2 ? 'غرضين' : n <= 10 ? n + ' أغراض' : n + ' غرض');
  function leftLine(t) {
    const left = t.check.filter((c) => !c.on);
    return left.length ? 'باقي ' + nItems(left.length) + ': ' + left.slice(0, 3).map((c) => c.t).join('، ') + (left.length > 3 ? '…' : '') : 'كل أغراضك جاهزة ✓';
  }
  function reminders() {
    const out = [];
    for (const t of all()) {
      const go = day(t.go);
      if (!go) continue;
      const at = (before) => new Date(go.getFullYear(), go.getMonth(), go.getDate() - before, 20, 0, 0, 0);
      const extra = { kind: 'trip', id: t.id }, icon = (KINDS[t.kind] || KINDS.leisure)[1];
      out.push({ key: 'trip3:' + t.id + ':' + t.go, at: at(3), title: icon + ' باقي 3 أيام على ' + t.name, body: leftLine(t), extra });
      out.push({ key: 'trip1:' + t.id + ':' + t.go, at: at(1), title: '✈️ بكرة السفر: ' + t.name, body: leftLine(t), extra });
    }
    return out;
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
      curCard(t, p, sp) +
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
        curMount(root, t);
        root.querySelector('#tvAdd').onclick = () => costSheet(t);
        root.querySelector('#tvDel').onclick = async () => {
          if (!(await A.ask('تحذف هالرحلة من جوالك؟\n' + t.name))) return;
          drop(t); A.render(); listSheet();
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

  function curCard(t, p, sp) {
    const c = curOf(t), code = (t.cur && t.cur.code) || '';
    return A.secHead('💱 العملة', '') + '<div class="card">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div class="field" style="margin:0;min-width:0"><label for="tvCur">عملة البلد</label><select id="tvCur" style="width:100%"><option value="">الدينار بس</option>' +
        CUR.map(([k, n]) => '<option value="' + k + '"' + (k === code ? ' selected' : '') + '>' + k + ' · ' + n + '</option>').join('') + '</select></div>' +
      '<div class="field" style="margin:0;min-width:0"><label for="tvRate">1 د.ب = ؟' + (code ? ' ' + code : '') + '</label><input id="tvRate" inputmode="decimal" dir="ltr" placeholder="' + (code ? 'من البنك أو الصرّاف' : '—') + '" value="' + (t.cur && t.cur.rate > 0 ? t.cur.rate : '') + '"' + (code ? '' : ' disabled') + ' style="width:100%;min-width:0;box-sizing:border-box"></div></div>' +
      (c ? '<div style="display:grid;grid-template-columns:1fr auto 1fr;gap:6px;align-items:end;margin-top:10px">' +
          '<div class="field" style="margin:0;min-width:0"><label for="tvFx">' + c.code + '</label><input id="tvFx" inputmode="decimal" dir="ltr" placeholder="0" style="width:100%;min-width:0;box-sizing:border-box"></div>' +
          '<span style="padding:0 0 12px">⇄</span>' +
          '<div class="field" style="margin:0;min-width:0"><label for="tvFxB">د.ب</label><input id="tvFxB" inputmode="decimal" dir="ltr" placeholder="0.000" style="width:100%;min-width:0;box-sizing:border-box"></div></div>' +
          (p ? '<p class="small muted num" style="margin:8px 4px 0">' + (sp > p ? 'تعدّيت بـ ' : 'باقي ≈ ') + '<bdi dir="ltr">' + inCur(t, Math.abs(p - sp)) + '</bdi>' + '</p>' : '') : '') +
      '<p class="small muted" style="margin:8px 4px 0" id="tvCurNote">' + (code && !c ? 'اكتب سعر الصرف من بنكك أو الصرّاف، لأن هالعملة سعرها يتغيّر.' : c ? 'الأسعار <b>تقدير</b>: البنك أو الصرّاف ياخذ عمولة فوقها.' : 'اختار عملة البلد عشان تحوّل وتسجّل المصاريف بعملته.') + '</p></div>';
  }
  function curMount(root, t) {
    const sel = root.querySelector('#tvCur'), rate = root.querySelector('#tvRate');
    sel.onchange = () => {
      const k = sel.value, d = CUR.find((c) => c[0] === k);
      t.cur = k ? { code: k, rate: d && d[2] ? d[2] : 0 } : null;
      put(t); tripSheet(t.id);
    };
    rate.onchange = () => {
      const v = A.parseAmount(rate.value);
      if (!t.cur) return;
      t.cur.rate = v > 0 ? v : 0; put(t); tripSheet(t.id);
    };
    const fx = root.querySelector('#tvFx'), fb = root.querySelector('#tvFxB');
    if (fx && fb) {
      const c = curOf(t);
      fx.oninput = () => { const v = A.parseAmount(fx.value); fb.value = v > 0 ? (v / c.rate).toFixed(3) : ''; };
      fb.oninput = () => { const v = A.parseAmount(fb.value); fx.value = v > 0 ? String(Math.round(v * c.rate * 100) / 100) : ''; };
    }
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
        (curOf(t) ? '<div class="seg" id="tvIn" role="group" aria-label="العملة" style="margin-bottom:8px"><button type="button" class="on" data-in="cur">' + curOf(t).code + '</button><button type="button" data-in="bhd">د.ب</button></div>' : '') +
        '<div class="field"><label for="tvA" id="tvAL">المبلغ (' + (curOf(t) ? curOf(t).code : 'د.ب') + ')</label><input id="tvA" inputmode="decimal" placeholder="0.000"><small class="muted num" id="tvAB"></small></div>' +
        '<div class="field"><label for="tvN">ملاحظة (اختياري)</label><input id="tvN" maxlength="80" placeholder="مثلاً: عربون الفندق"></div>' +
        '<label class="small" style="display:flex;gap:8px;align-items:center;margin:4px 4px 0"><input type="checkbox" id="tvTx"> سجّلها بالمصاريف بعد (تنكتب «سفر» بس)</label>',
      mount(root) {
        const seg = root.querySelector('#tvIn'), inp = root.querySelector('#tvA'), hint = root.querySelector('#tvAB');
        if (!seg) return;
        const show = () => { const v = A.parseAmount(inp.value), cur = seg.querySelector('.on').dataset.in === 'cur'; hint.textContent = v > 0 && cur ? '≈ ' + A.fmt(toBHD(t, v)) + ' د.ب' : ''; };
        seg.onclick = (e) => {
          const b = e.target.closest('[data-in]'); if (!b) return;
          seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
          root.querySelector('#tvAL').textContent = 'المبلغ (' + (b.dataset.in === 'cur' ? curOf(t).code : 'د.ب') + ')'; show();
        };
        inp.oninput = show;
      },
      onSave(root) {
        const raw = A.parseAmount(root.querySelector('#tvA').value);
        if (!(raw > 0)) throw new Error('اكتب المبلغ');
        const seg = root.querySelector('#tvIn'), foreign = !!(seg && seg.querySelector('.on').dataset.in === 'cur');
        const amount = foreign ? toBHD(t, raw) : raw;
        const cat = root.querySelector('#tvC').value, note = root.querySelector('#tvN').value.trim().slice(0, 80);
        const cost = { id: S.uuid(), cat, amount, note, at: new Date().toISOString() };
        if (foreign) cost.orig = { code: curOf(t).code, value: raw, rate: curOf(t).rate };
        t.costs.push(cost);
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
    return '<button class="cta" data-action="trip" data-id="' + t.id + '" style="margin-top:10px"><div class="ico">' + (KINDS[t.kind] || KINDS.leisure)[1] + '</div><div style="flex:1;min-width:0"><b>' + h(t.name) + ': ' + cd.text + '</b><small>' + (cd.phase === 'before' && cd.n <= 3 && done < t.check.length ? 'باقي ' + nItems(t.check.length - done) : 'الأغراض ' + done + '/' + t.check.length) + '</small></div>' + I('chevL') + '</button>';
  }

  // ================= الربط =================
  wrap('todayMid', (prev) => prev() + todayRow());
  wrap('action', (prev, name, el, e) => {
    if (name === 'travel') { listSheet(); return; }
    if (name === 'trip') { tripSheet(el && el.dataset.id); return; }
    if (name === 'umrah') { umrah(); return; }
    return prev(name, el, e);
  });
  E.Travel = { CUR, toBHD, inCur, reminders, leftLine, KEY, KINDS, CATS, GROUPS, PACK, all, get, countdown, spentOf, planned, listSheet, tripSheet, newSheet, umrah };
  E.Umrah = { sheet: umrah, countdown };
})();
