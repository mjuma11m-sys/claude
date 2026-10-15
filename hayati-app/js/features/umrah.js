// «مخطط العمرة» (DW-027 · بند 9): ميزانية الرحلة، قائمة تجهيز، وعداد للسفر. أدوات تنظيم وفلوس بس، بدون شرح مناسك.
// كل شي على الجهاز (localStorage) وما يتزامن: السفر للعمرة معلومة دينية حساسة.
// «سجّلها بالمصاريف» اختياري، والعملية تنكتب بكلمة محايدة («سفر · طيران») بدون ذكر العمرة.
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, I, h, tint } = A;
  const wrap = (name, fn) => { const prev = E[name]; E[name] = (...a) => fn(prev ? prev : () => '', ...a); };
  const KEY = 'hayati-umrah';

  // [المفتاح، الاسم، الأيقونة، فئة المصاريف لو انسجّلت]
  const CATS = [
    ['flight', 'الطيران', '✈️', 'أخرى'],
    ['hotel', 'الفندق', '🏨', 'أخرى'],
    ['package', 'الباقة / التأشيرة', '🧾', 'أخرى'],
    ['transport', 'المواصلات', '🚌', 'مواصلات وبنزين'],
    ['food', 'الأكل', '🍽️', 'أكل ومطاعم'],
    ['other', 'أخرى', '🛍️', 'أخرى'],
  ];
  const CHECK = ['جواز السفر (صالح 6 أشهر على الأقل)', 'التأشيرة أو التصريح', 'تذاكر الطيران', 'حجز الفندق', 'ملابس الإحرام', 'حزام أو محفظة للأوراق', 'نعال وأحذية مريحة', 'أدويتك الشخصية', 'شاحن ووصلة وباور بانك', 'صورة من الجواز بالجوال', 'ريال سعودي أو بطاقة تشتغل هناك', 'معقم وكمامات'];

  const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && typeof v === 'object' ? v : null; } catch (e) { return null; } };
  const save = (t) => { try { localStorage.setItem(KEY, JSON.stringify(t)); } catch (e) { A.toast('ما قدرنا نحفظ على هالجهاز'); } };
  const fresh = () => ({ go: '', back: '', plan: {}, costs: [], check: CHECK.map((t) => ({ t, on: false })) });
  const sum = (arr) => arr.reduce((a, x) => a + (Number(x) || 0), 0);
  const spentOf = (t, k) => sum(t.costs.filter((c) => !k || c.cat === k).map((c) => c.amount));
  const planned = (t) => sum(CATS.map(([k]) => t.plan[k]));
  const day = (s) => (s ? new Date(s + 'T00:00:00') : null);
  const human = (s) => { const d = day(s); return d ? d.getDate() + ' ' + A.MONTHS[d.getMonth()] : ''; };

  // العداد: قبل السفر / خلال الرحلة / بعد الرجعة
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

  // ================= الورقة الرئيسية =================
  function sheet() {
    const t = load() || fresh();
    const cd = countdown(t), p = planned(t), sp = spentOf(t), done = t.check.filter((c) => c.on).length;
    const body =
      '<div class="hero dark" style="margin-top:4px"><span class="eyebrow">🕋 رحلة العمرة</span>' +
        '<div class="big" id="umCount">' + cd.text + '</div>' +
        '<div class="meta"><span>' + (t.go ? 'السفر ' + human(t.go) + (t.back ? ' · الرجعة ' + human(t.back) : '') : 'كل شي على جوالك بس') + '</span></div></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px"><div class="field" style="min-width:0;margin:0"><label for="umGo">السفر</label><input type="date" id="umGo" style="width:100%;min-width:0;box-sizing:border-box" value="' + h(t.go) + '"></div><div class="field" style="min-width:0;margin:0"><label for="umBack">الرجعة</label><input type="date" id="umBack" style="width:100%;min-width:0;box-sizing:border-box" value="' + h(t.back) + '"></div></div>' +
      A.secHead('الميزانية', '<button class="link" type="button" id="umPlan">عدّل</button>') +
      '<div class="card"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><b>صرفت <span class="num" id="umSpent">' + A.money(sp) + '</span></b><span class="small muted">' + (p ? 'من ' + A.money(p) : 'ما حددت ميزانية') + '</span></div>' +
        (p ? '<div class="meter" style="height:10px;margin:10px 0 4px"><span style="width:' + Math.min(100, (sp / p) * 100) + '%;background:' + (sp > p ? 'var(--expense)' : 'var(--brand)') + '"></span></div>' + (sp > p ? '<p class="small" style="color:var(--expense);margin:4px 0 0">تعدّيت الميزانية بـ ' + A.money(sp - p) + '</p>' : '<p class="small muted" style="margin:4px 0 0">باقي ' + A.money(p - sp) + '</p>') : '') +
      '</div>' +
      '<div class="card flush"><ul class="list">' + CATS.map(([k, n, e]) => {
        const s = spentOf(t, k), pl = Number(t.plan[k]) || 0;
        return '<li class="row" style="cursor:default"><div class="ico" style="' + tint('#0d9488') + '">' + e + '</div><div class="main"><div class="title"><span class="t">' + n + '</span></div>' +
          '<div class="sub">' + (pl ? 'من ' + A.fmt(pl) + ' د.ب' : 'بدون ميزانية') + '</div></div><div class="amount fit">' + A.money(s) + '</div></li>';
      }).join('') + '</ul></div>' +
      '<button type="button" class="btn block" id="umAdd" style="margin-top:10px">' + I('plus') + 'أضف مصروف للرحلة</button>' +
      A.secHead('التجهيز', '<span class="count" id="umDone">' + done + '/' + t.check.length + '</span>') +
      '<div class="card flush"><ul class="list" id="umList">' + checkList(t) + '</ul></div>' +
      '<div class="field" style="display:flex;gap:8px;margin-top:10px"><input id="umItem" maxlength="80" placeholder="أضف شي للقائمة" aria-label="أضف شي للقائمة" style="flex:1"><button type="button" class="btn" id="umItemAdd">أضف</button></div>' +
      '<p class="small muted" style="margin:12px 4px 0">أداة تنظيم وفلوس بس. بياناتها على جوالك وما تتزامن مع حسابك.</p>' +
      (load() ? '<button type="button" class="btn ghost block" id="umReset" style="margin-top:12px;color:var(--expense)">امسح الرحلة</button>' : '');

    A.openSheet({
      title: '🕋 مخطط العمرة',
      cancelLabel: 'تم',
      body,
      mount(root) {
        const persist = () => { save(t); };
        const onDate = () => {
          t.go = root.querySelector('#umGo').value; t.back = root.querySelector('#umBack').value;
          if (t.go && t.back && t.back < t.go) { t.back = t.go; root.querySelector('#umBack').value = t.go; }
          persist(); root.querySelector('#umCount').textContent = countdown(t).text;
        };
        root.querySelector('#umGo').onchange = onDate; root.querySelector('#umBack').onchange = onDate;
        root.querySelector('#umList').onclick = (e) => {
          const b = e.target.closest('[data-um]'); if (!b) return;
          const i = Number(b.dataset.um);
          if (b.dataset.del != null) t.check.splice(i, 1); else t.check[i].on = !t.check[i].on;
          persist(); root.querySelector('#umList').innerHTML = checkList(t);
          root.querySelector('#umDone').textContent = t.check.filter((c) => c.on).length + '/' + t.check.length;
        };
        root.querySelector('#umItemAdd').onclick = () => {
          const inp = root.querySelector('#umItem'), v = inp.value.trim();
          if (!v) return;
          t.check.push({ t: v.slice(0, 80), on: false }); inp.value = ''; persist();
          root.querySelector('#umList').innerHTML = checkList(t);
          root.querySelector('#umDone').textContent = t.check.filter((c) => c.on).length + '/' + t.check.length;
        };
        root.querySelector('#umPlan').onclick = () => { persist(); planSheet(t); };
        root.querySelector('#umAdd').onclick = () => { persist(); costSheet(t); };
        const rs = root.querySelector('#umReset');
        if (rs) rs.onclick = async () => { if (await A.ask('تمسح الرحلة كلها من جوالك؟')) { try { localStorage.removeItem(KEY); } catch (e) { /* تجاهل */ } A.closeSheet(); A.render(); } };
        persist();
      },
    });
  }
  function checkList(t) {
    return t.check.map((c, i) => '<li class="row' + (c.on ? ' done' : '') + '" style="cursor:default"><button type="button" class="check' + (c.on ? ' on' : '') + '" data-um="' + i + '" aria-label="' + (c.on ? 'جاهز: ' : 'مو جاهز: ') + h(c.t) + '" aria-pressed="' + c.on + '">' + I('check') + '</button>' +
      '<div class="main"><div class="title"><span class="t" style="white-space:normal">' + h(c.t) + '</span></div></div>' +
      '<button type="button" class="icon-x" data-um="' + i + '" data-del aria-label="احذف ' + h(c.t) + '">✕</button></li>').join('');
  }

  // ميزانية كل بند
  function planSheet(t) {
    A.openSheet({
      title: 'ميزانية الرحلة',
      body: '<p class="small muted" style="margin:0 4px 10px">اكتب تقديرك لكل بند (اختياري).</p>' +
        CATS.map(([k, n, e]) => '<div class="field"><label for="umP_' + k + '">' + e + ' ' + n + '</label><input id="umP_' + k + '" inputmode="decimal" placeholder="0.000" value="' + (t.plan[k] ? A.fmt(t.plan[k]) : '') + '"></div>').join(''),
      onSave(root) {
        CATS.forEach(([k]) => { const v = A.parseAmount(root.querySelector('#umP_' + k).value); if (v > 0) t.plan[k] = v; else delete t.plan[k]; });
        save(t); setTimeout(sheet, 280);
      },
    });
  }

  // مصروف للرحلة (واختياري بالمصاريف بكلمة محايدة)
  function costSheet(t) {
    A.openSheet({
      title: 'مصروف للرحلة',
      saveLabel: 'أضف',
      body: '<div class="field"><label for="umC">البند</label><select id="umC">' + CATS.map(([k, n, e]) => '<option value="' + k + '">' + e + ' ' + n + '</option>').join('') + '</select></div>' +
        '<div class="field"><label for="umA">المبلغ (د.ب)</label><input id="umA" inputmode="decimal" placeholder="0.000"></div>' +
        '<div class="field"><label for="umN">ملاحظة (اختياري)</label><input id="umN" maxlength="80" placeholder="مثلاً: عربون الباقة"></div>' +
        '<label class="small" style="display:flex;gap:8px;align-items:center;margin:4px 4px 0"><input type="checkbox" id="umTx"> سجّلها بالمصاريف بعد (تنكتب «سفر» بدون ذكر العمرة)</label>',
      onSave(root) {
        const amount = A.parseAmount(root.querySelector('#umA').value);
        if (!(amount > 0)) throw new Error('اكتب المبلغ');
        const cat = root.querySelector('#umC').value, note = root.querySelector('#umN').value.trim().slice(0, 80);
        t.costs.push({ id: S.uuid(), cat, amount, note, at: new Date().toISOString() });
        save(t);
        if (root.querySelector('#umTx').checked) {
          const c = CATS.find((x) => x[0] === cat);
          S.upsert('transactions', { id: S.uuid(), kind: 'expense', amount, category: c[3], note: 'سفر · ' + c[1], occurred_at: new Date().toISOString() });
        }
        A.toast('انضاف ✓');
        setTimeout(sheet, 280);
      },
    });
  }

  // سطر باليوم لما السفر قريب (30 يوم)
  function todayRow() {
    const t = load(); if (!t) return '';
    const cd = countdown(t);
    if (!(cd.phase === 'today' || cd.phase === 'during' || (cd.phase === 'before' && cd.n <= 30))) return '';
    const done = t.check.filter((c) => c.on).length;
    return '<button class="cta" data-action="umrah" style="margin-top:10px"><div class="ico">🕋</div><div style="flex:1;min-width:0"><b>' + cd.text + '</b><small>التجهيز ' + done + '/' + t.check.length + '</small></div>' + I('chevL') + '</button>';
  }

  // ================= الربط =================
  wrap('todayMid', (prev) => prev() + todayRow());
  wrap('action', (prev, name, el, e) => (name === 'umrah' ? sheet() : prev(name, el, e)));
  E.Umrah = { KEY, CATS, CHECK, load, countdown, spentOf, planned, sheet };
})();
