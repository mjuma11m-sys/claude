// DW-112: «🍽️ سجّل أكلتك» — يكمّل «احسب احتياجك» و«سعرات الوصفات» (DW-086/087): سجل يومي بسيط للسعرات والبروتين
// مقابل احتياجك. تسجّل من: أكلات جاهزة (تقدير)، وجباتك المحفوظة، وصفة من المطبخ، أو **مصروف اليوم** (كوفي أو مطعم دفعت فيه).
// كله على الجهاز (hayati-food) وبالنسخة المشفّرة. الأرقام تقدير، مو نصيحة طبية.
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, st, h } = A;
  const KEY = 'hayati-food', KEEP_DAYS = 60;
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const hm = (d) => pad(d.getHours()) + ':' + pad(d.getMinutes());
  const MEALS = [['breakfast', 'فطور', '🌅'], ['lunch', 'غدا', '☀️'], ['dinner', 'عشا', '🌙'], ['snack', 'سناك', '🍪']];
  const mealNow = (d) => { const x = d.getHours(); return x < 11 ? 'breakfast' : x < 16 ? 'lunch' : x < 22 ? 'dinner' : 'snack'; };

  // أكلات جاهزة: [الاسم، الحصة، سعرات، بروتين غم] — تقديرات تقريبية للحصة المكتوبة
  const BASE = [
    ['قهوة عربية', 'فنجان', 5, 0], ['شاي بالحليب', 'كوب', 90, 3], ['كرك', 'كوب', 150, 4], ['لاتيه', 'كوب وسط', 190, 10], ['سبانش لاتيه', 'كوب وسط', 260, 9],
    ['كابتشينو', 'كوب وسط', 130, 7], ['أمريكانو', 'كوب', 10, 0], ['عصير برتقال', 'كوب', 110, 2], ['حليب', 'كوب', 120, 8], ['زبادي', 'علبة', 150, 8],
    ['خبز تنور', 'رغيف', 250, 8], ['خبز عربي', 'رغيف', 170, 6], ['صمونة', 'حبة', 200, 7], ['بيض مسلوق', 'حبة', 75, 6], ['بيض مقلي', 'حبة', 90, 6],
    ['جبن أبيض', '30 غم', 80, 4], ['لبنة', 'ملعقة كبيرة', 50, 2], ['فول', 'صحن', 300, 16], ['فلافل', 'حبة', 60, 2], ['حمص', 'صحن صغير', 250, 8],
    ['شاورما دجاج', 'ساندويتش', 450, 25], ['شاورما لحم', 'ساندويتش', 500, 24], ['برجر', 'ساندويتش', 550, 28], ['وجبة برجر مع بطاطس', 'وجبة', 950, 32], ['بيتزا', 'شريحة', 285, 12],
    ['رز أبيض مطبوخ', 'كوب', 205, 4], ['مجبوس دجاج', 'صحن', 650, 35], ['برياني دجاج', 'صحن', 700, 35], ['هريس', 'صحن', 400, 20], ['بلاليط', 'صحن', 450, 10],
    ['ثريد', 'صحن', 500, 25], ['دجاج مشوي', '150 غم', 250, 40], ['سمك مشوي', '150 غم', 210, 35], ['صدر دجاج', '100 غم', 165, 31], ['سلطة خضار', 'صحن', 50, 2],
    ['تمر', 'حبة', 23, 0], ['لقيمات', '5 حبات', 250, 3], ['سمبوسة', 'حبة', 120, 3], ['موز', 'حبة', 105, 1], ['تفاح', 'حبة', 95, 0],
    ['بروتين شيك', 'سكوب مع ماي', 120, 24], ['شيبس', 'كيس صغير', 160, 2], ['شوكولاتة', '50 غم', 270, 3], ['كيك', 'شريحة', 350, 4], ['آيس كريم', 'كرة', 140, 2],
  ];
  // مصروف اليوم ← اقتراح: من اسم المحل أو الفئة
  const SHOPS = [[/costa|starbucks|caribou|tim ?hortons|coffee|كافي|كوفي|قهوة/i, 'سبانش لاتيه'], [/karak|كرك|chai|شاي/i, 'كرك'], [/shawarma|شاورما/i, 'شاورما دجاج'],
    [/mcdonald|burger|hardee|five guys|shake shack|برجر|ماكدونالدز|هارديز/i, 'وجبة برجر مع بطاطس'], [/pizza|بيتزا|domino|papa john/i, 'بيتزا'], [/jasmi|جاسمي|مجبوس|machboos/i, 'مجبوس دجاج']];

  function load() {
    let v = {};
    try { v = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { v = {}; }
    return Object.assign({ days: {}, saved: [], linked: [] }, v);
  }
  function save(v) {
    const keys = Object.keys(v.days).sort(); while (keys.length > KEEP_DAYS) delete v.days[keys.shift()];
    v.linked = (v.linked || []).slice(-200);
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { A.toast('ما قدرنا نحفظ على هالجهاز'); }
    A.render();
  }
  function add(item, now) {
    now = now || new Date();
    const v = load(), k = ymd(now);
    const it = { id: S.uuid(), t: hm(now), meal: item.meal || mealNow(now), name: String(item.name || '').slice(0, 60), kcal: Math.max(0, Math.round(Number(item.kcal) || 0)),
      p: item.p == null || item.p === '' ? null : Math.max(0, Math.round(Number(item.p) || 0)), src: item.src || 'manual' };
    (v.days[k] = v.days[k] || []).push(it);
    if (item.tx) v.linked.push(item.tx);
    save(v);
    A.toast('انسجلت ✓ ' + it.kcal + ' سعرة');
    return it;
  }
  function totals(k) {
    const list = load().days[k || ymd(new Date())] || [];
    return { kcal: list.reduce((s, x) => s + (x.kcal || 0), 0), p: list.reduce((s, x) => s + (x.p || 0), 0), list };
  }
  const needs = () => (E._needsCalc && st.settings ? E._needsCalc(st.settings.body_needs) : null);
  // مصروفات اليوم بالكوفي والمطاعم اللي ما انسجلت أكل للحين
  function suggestions(now) {
    now = now || new Date();
    const k = ymd(now), linked = new Set(load().linked || []);
    return (st.transactions || []).filter((t) => t.kind === 'expense' && ['قهوة', 'أكل ومطاعم'].includes(t.category) && ymd(new Date(t.occurred_at)) === k && !linked.has(t.id))
      .slice(0, 3).map((t) => {
        const who = String(t.merchant || t.note || ''), hit = SHOPS.find(([re]) => re.test(who));
        const b = BASE.find((x) => x[0] === (hit ? hit[1] : t.category === 'قهوة' ? 'لاتيه' : '')) || null;
        return { tx: t.id, who: who || t.category, name: b ? b[0] : 'وجبة مطعم', kcal: b ? b[2] : 700, p: b ? b[3] : 30 };
      });
  }
  const enabled = () => !!(st.settings && st.settings.body_needs) || Object.keys(load().days).length > 0;

  // ================= الرئيسية =================
  function ring(val, goal) {
    const pct = goal ? Math.min(1, val / goal) : 0, R = 26, C = 2 * Math.PI * R;
    return '<svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="' + R + '" fill="none" stroke="var(--surface-2,#eee)" stroke-width="7"/>' +
      '<circle cx="32" cy="32" r="' + R + '" fill="none" stroke="' + (val > goal && goal ? 'var(--warn)' : 'var(--brand)') + '" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + (C * pct).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 32 32)"/></svg>';
  }
  function todayCard() {
    if (!enabled()) return '';
    const t = totals(), n = needs(), sg = suggestions();
    return '<section data-tk="food"><div class="card"><div style="display:flex;align-items:center;gap:12px">' + ring(t.kcal, n ? n.kcal : 0) +
      '<div style="flex:1;min-width:0"><b>🍽️ <span>أكلك اليوم</span></b><div class="small"><bdi class="num">' + t.kcal.toLocaleString('en') + '</bdi>' + (n ? ' / <bdi class="num">' + n.kcal.toLocaleString('en') + '</bdi>' : '') + ' <span>سعرة</span>' +
      (t.p ? ' · <bdi class="num">' + t.p + '</bdi>' + (n ? ' / <bdi class="num">' + n.protein + '</bdi>' : '') + ' <span>غم بروتين</span>' : '') + '</div></div>' +
      '<button class="btn primary" data-action="food">＋ سجّل</button></div>' +
      (sg.length ? '<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">' + sg.map((x) => '<button class="chip" data-action="food-sug" data-tx="' + h(x.tx) + '">💳 <bdi>' + h(x.who) + '</bdi> ← <span>' + h(x.name) + '</span>؟</button>').join('') + '</div>' : '') +
      '</div></section>';
  }

  // ================= النافذة =================
  function sheet() {
    const v = load(), t = totals(), n = needs(), k = ymd(new Date());
    const saved = v.saved.map((x) => ({ name: x.name, unit: 'محفوظة', kcal: x.kcal, p: x.p, saved: x.id }));
    const all = saved.concat(BASE.map(([name, unit, kcal, p]) => ({ name, unit, kcal, p })));
    A.openSheet({
      title: '🍽️ سجّل أكلتك', cancelLabel: 'تم',
      body: '<div class="card" style="display:flex;align-items:center;gap:12px">' + ring(t.kcal, n ? n.kcal : 0) + '<div style="flex:1"><b><bdi class="num">' + t.kcal.toLocaleString('en') + '</bdi>' + (n ? ' / <bdi class="num">' + n.kcal.toLocaleString('en') + '</bdi>' : '') + ' <span>سعرة اليوم</span></b>' +
        '<div class="small muted">' + (t.p ? '<bdi class="num">' + t.p + '</bdi>' + (n ? ' / <bdi class="num">' + n.protein + '</bdi>' : '') + ' <span>غم بروتين</span>' : '') + (n ? '' : ' <button class="link" data-act="needs">احسب احتياجك</button>') + '</div></div></div>' +
        (t.list.length ? MEALS.map(([m, l, ic]) => { const xs = t.list.filter((x) => x.meal === m); return xs.length ? '<div class="group-title">' + ic + ' ' + l + '</div><div class="card flush"><ul class="list">' +
          xs.map((x) => '<li class="row" style="cursor:default"><div class="main"><div class="title"><bdi>' + h(x.name) + '</bdi></div><div class="sub"><bdi class="num">' + x.kcal + '</bdi> <span>سعرة</span>' + (x.p != null ? ' · <bdi class="num">' + x.p + '</bdi> <span>غم بروتين</span>' : '') + '</div></div>' +
            '<button type="button" class="icon-x" data-del="' + x.id + '" aria-label="حذف">✕</button></li>').join('') + '</ul></div>' : ''; }).join('') : '') +
        '<div class="group-title">＋ أضف</div><div class="field" style="margin-bottom:8px"><input id="fdQ" type="search" placeholder="دوّر: كرك، مجبوس، شاورما…"></div>' +
        '<div class="card flush"><ul class="list" id="fdList">' + all.map((x, i) => '<li class="row" data-pick="' + i + '" data-name="' + h(x.name) + '"><div class="main"><div class="title"><bdi>' + h(x.name) + '</bdi>' + (x.saved ? ' ⭐' : '') + '</div><div class="sub"><bdi>' + h(x.unit) + '</bdi> · <bdi class="num">' + x.kcal + '</bdi> <span>سعرة</span>' + (x.p != null ? ' · <bdi class="num">' + x.p + '</bdi> <span>غم بروتين</span>' : '') + '</div></div><b>＋</b></li>').join('') + '</ul></div>' +
        '<button type="button" class="btn ghost block" id="fdManual" style="margin-top:10px">✏️ أكلة مو موجودة؟ اكتبها</button>' +
        '<p class="small muted" style="margin:10px 4px 0">الأرقام تقدير للحصة المكتوبة، مو نصيحة طبية. وصفات «المطبخ» تقدر تسجّلها من صفحة الوصفة. يبقى على جهازك بس.</p>',
      mount(root) {
        const qi = root.querySelector('#fdQ');
        qi.oninput = () => { const q = qi.value.trim(); root.querySelectorAll('[data-pick]').forEach((li) => { li.hidden = !!q && li.dataset.name.indexOf(q) < 0; }); };
        root.querySelectorAll('[data-pick]').forEach((li) => { li.onclick = () => { const x = all[Number(li.dataset.pick)]; add({ name: x.name, kcal: x.kcal, p: x.p, src: x.saved ? 'saved' : 'base' }); A.closeSheet(); setTimeout(() => sheet(), 280); }; });
        root.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => { const x = load(); x.days[k] = (x.days[k] || []).filter((y) => y.id !== b.dataset.del); save(x); A.closeSheet(); setTimeout(() => sheet(), 280); }; });
        root.querySelector('#fdManual').onclick = () => { A.closeSheet(); setTimeout(() => manual(), 280); };
        const nd = root.querySelector('[data-act="needs"]'); if (nd) nd.onclick = () => { A.closeSheet(); setTimeout(() => E.action('needs'), 280); };
      },
    });
  }
  function manual(pre) {
    pre = pre || {};
    A.openSheet({
      title: '✏️ أكلة جديدة', saveLabel: 'سجّل',
      body: '<div class="field"><label>وش أكلت؟</label><input name="name" value="' + h(pre.name || '') + '" placeholder="مثلاً: صحن مكرونة"></div>' +
        '<div class="field"><label>السعرات (تقدير)</label><input name="kcal" inputmode="numeric" class="ltr" value="' + h(pre.kcal != null ? String(pre.kcal) : '') + '"></div>' +
        '<div class="field"><label>البروتين بالغرام (اختياري)</label><input name="p" inputmode="numeric" class="ltr" value="' + h(pre.p != null ? String(pre.p) : '') + '"></div>' +
        '<div class="field"><label>الوجبة</label><select name="meal">' + MEALS.map(([m, l]) => '<option value="' + m + '"' + (m === mealNow(new Date()) ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></div>' +
        '<label class="switch"><input type="checkbox" name="fav"' + (pre.tx ? '' : ' checked') + '> احفظها عشان أسجّلها بسرعة المرة الجاية</label>',
      onSave(root) {
        const val = (n) => root.querySelector('[name=' + n + ']').value.trim();
        const name = val('name'), kcal = Number(val('kcal'));
        if (!name) throw new Error('اكتب وش أكلت');
        if (!(kcal >= 0 && kcal <= 5000)) throw new Error('اكتب السعرات (رقم)');
        add({ name, kcal, p: val('p'), meal: val('meal'), src: pre.tx ? 'sms' : 'manual', tx: pre.tx });
        if (root.querySelector('[name=fav]').checked) { const v = load(); if (!v.saved.some((x) => x.name === name)) { v.saved.unshift({ id: S.uuid(), name, kcal: Math.round(kcal), p: val('p') === '' ? null : Math.round(Number(val('p'))) }); v.saved = v.saved.slice(0, 50); save(v); } }
      },
    });
  }

  // ================= الربط =================
  const prevMid = E.todayMid;
  E.todayMid = (...a) => todayCard() + (prevMid ? prevMid(...a) : '');
  const prevAct = E.action;
  E.action = (name, el, e) => {
    if (name === 'food') { sheet(); return; }
    if (name === 'food-sug') { const x = suggestions().find((y) => y.tx === el.dataset.tx); if (x) manual({ name: x.name, kcal: x.kcal, p: x.p, tx: x.tx }); return; }
    return prevAct ? prevAct(name, el, e) : undefined;
  };
  // «صحتي»: بطاقة بعد «احتياجك»
  const prevHealth = E.viewHealth;
  E.viewHealth = (...a) => '<button class="btn primary block" data-action="food" style="margin:0 0 12px">🍽️ سجّل أكلتك</button>' + (prevHealth ? prevHealth(...a) : '');
  if (E.Tools && E.Tools.GROUPS) { const g = E.Tools.GROUPS.find((x) => x[0].indexOf('الصحة') >= 0); if (g) g[1].push(['food', 'utensils', '#ea580c', 'سجّل أكلتك', () => sheet()]); }
  if (E.View && E.View.KEEP && !E.View.KEEP.includes('food')) { E.View.KEEP.push('food'); E.View.apply(); }
  E.Food = { load, add, totals, suggestions, sheet, manual, BASE, KEY };
})();
