// شهر الراتب + «راتبك وين راح؟» + حاسبة الزكاة والخُمس (DW-012)
// كل الإعدادات هني على الجهاز بس (ما تروح لجدول settings بالسيرفر)
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, st, I, h, fmt, money, tint } = A;
  const wrap = (name, fn) => { const prev = E[name]; E[name] = (...a) => fn(prev ? prev : () => '', ...a); };
  function lsGet(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* تجاهل */ } }
  const r3 = (n) => Math.round(n * 1000) / 1000;
  const SEEN = 'hayati-payday-seen';

  // ================= يوم الراتب =================
  function paydaySheet() {
    const cur = Number(st.settings.payday) || 0;
    const days = Array.from({ length: 28 }, (_, i) => i + 1);
    A.openSheet({
      title: 'يوم نزول الراتب',
      body: '<p class="small muted" style="margin:0 4px 12px;text-align:center">الميزانية والتقرير يحسبون من راتب لراتب بدال 1–30.<br>مثلاً 25: الشهر من 25 لين 24 الشهر الجاي.</p>' +
        '<div class="chips" id="pdDays" style="justify-content:center;gap:6px">' + days.map((d) => '<button type="button" class="chip' + (d === cur ? ' on' : '') + '" data-d="' + d + '">' + d + '</button>').join('') + '</div>' +
        '<p class="small muted" style="margin:12px 4px 0;text-align:center">1 = بداية الشهر الميلادي</p>',
      mount(root) {
        root.querySelector('#pdDays').onclick = (e) => {
          const b = e.target.closest('[data-d]'); if (!b) return;
          root.querySelectorAll('#pdDays .chip').forEach((c) => c.classList.toggle('on', c === b));
        };
      },
      onSave(root) {
        const b = root.querySelector('#pdDays .chip.on');
        if (!b) throw new Error('اختار يوم');
        const d = Number(b.dataset.d);
        S.setSettings({ payday: d > 1 ? d : null });
        A.ui.month = A.monthKey(new Date());
        lsSet(SEEN, A.monthKey(new Date()));   // ملخص الشهر الحالي ما يطلع فجأة أول ما تحدده
        A.toast(d > 1 ? 'الشهر صار من ' + d + ' لين ' + (d - 1) + ' ✓' : 'رجع للشهر الميلادي ✓');
      },
    });
  }

  // ================= «راتبك وين راح؟» =================
  function topCats(list) {
    const o = {};
    for (const t of list) if (t.kind !== 'income') o[t.category || 'أخرى'] = (o[t.category || 'أخرى'] || 0) + (Number(t.amount) || 0);
    return Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }
  function summary() {
    const key = A.shiftKey(A.monthKey(new Date()), -1);
    const list = A.txInMonth(key), before = A.txInMonth(A.shiftKey(key, -1));
    const a = A.sums(list), b = A.sums(before);
    return { key, a, b, top: topCats(list), diff: b.exp ? ((a.exp - b.exp) / b.exp) * 100 : null };
  }
  // بطاقة باليوم أول 5 أيام من الدورة، لين تنفتح (نفس نمط تقرير الأسبوع)
  function paydayCard() {
    if (!(Number(st.settings.payday) >= 1)) return '';
    const now = new Date(), cur = A.monthKey(now);
    if (A.daysBetween(A.monthRange(cur).start, now) > 4 || lsGet(SEEN, '') === cur) return '';
    const s = summary();
    if (!s.a.exp) return '';
    return '<button class="cta" data-action="payday-summary"><div class="ico">' + I('wallet') + '</div><div style="flex:1;min-width:0">' +
      '<b>نزل الراتب؟ شوف وين راح اللي قبله 💸</b><small>صرفت ' + fmt(s.a.exp) + ' د.ب' + (s.top[0] ? ' · أكثره ' + h(s.top[0][0]) : '') + '</small></div>' + I('chevL') + '</button>';
  }
  function summarySheet() {
    const s = summary();
    lsSet(SEEN, A.monthKey(new Date()));
    const max = s.top.length ? s.top[0][1] : 1;
    let body = '<div class="hero dark" style="margin-top:4px"><span class="eyebrow">' + I('wallet') + A.monthLabel(s.key) + '</span>' +
      '<div class="amount-big">' + money(s.a.exp) + '</div><div class="meta"><span>' +
      (s.diff == null ? 'ما فيه بيانات للشهر اللي قبله' : Math.round(s.diff) === 0 ? 'نفس الشهر اللي قبله' : (s.diff > 0 ? '▲ أكثر بـ ' : '▼ أقل بـ ') + Math.abs(Math.round(s.diff)) + '% من اللي قبله (' + fmt(s.b.exp) + ')') + '</span></div>' +
      '<div class="split"><div><small>الدخل</small><b>' + money(s.a.inc) + '</b></div><div><small>الباقي</small><b>' + money(s.a.inc - s.a.exp) + '</b></div></div></div>';
    body += A.secHead('أكثر 3 أشياء صرفت عليها') + '<div class="card">' + (s.top.length ? s.top.map(([c, v]) => {
      const [ic, col] = A.catMeta(c);
      return '<div class="cat"><div class="ico" style="' + tint(col) + '">' + I(ic) + '</div><div class="body"><div class="line"><span>' + h(c) + '</span><b>' + money(v) + '</b></div>' +
        '<div class="meter"><span style="width:' + Math.round((v / max) * 100) + '%;background:' + col + '"></span></div></div></div>';
    }).join('') : '<p class="muted">—</p>') + '</div>';
    body += '<p class="small muted" style="margin:10px 6px;text-align:center">من بياناتك على جهازك بس.</p>';
    A.openSheet({ title: 'راتبك وين راح؟', cancelLabel: 'تم', body });
  }

  // ================= الزكاة والخُمس =================
  // أداة حساب تقديرية، مو فتوى. ما ناخذ أسعار ولا أحكام من النت: المستخدم يدخل الأرقام ويقدر يعدّلها
  // النصاب بالغرام: 85 غرام عند السنة، و15 مثقال صيرفي (≈ 69.6 غرام) عند الشيعة
  const NISAB = { sunni: 85, jafari: 69.6 };
  function defaultMadhhab() { return (st.settings.prayer_method || 'jafari') === 'jafari' ? 'jafari' : 'sunni'; }
  function zakatOf(cash, goldPrice, heldYear, madhhab) {
    const nisab = (NISAB[madhhab] || NISAB.sunni) * goldPrice;
    if (!(goldPrice > 0)) return { nisab: 0, due: null };
    return { nisab: r3(nisab), due: cash >= nisab && heldYear ? r3(cash * 0.025) : 0 };
  }
  function khumsOf(income, expenses, extra) { const surplus = Math.max(0, income - expenses) + Math.max(0, extra || 0); return { surplus: r3(surplus), due: r3(surplus * 0.2) }; }
  function since(startKey) {
    const start = new Date(startKey + 'T00:00:00');
    const list = st.transactions.filter((t) => t.occurred_at && new Date(t.occurred_at) >= start);
    return A.sums(list);
  }
  function savedInGoals() { return r3((st.goals || []).reduce((a, g) => a + (Number(g.saved) || 0), 0)); }
  function lastYear() { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().slice(0, 10); }

  // الأداتين (الزكاة والخُمس) مفتوحة للكل بنفس الشكل؛ المذهب يغيّر النصاب والملاحظات بس
  function zakatSheet(tool, madhhab) {
    const k = tool || 'zakat', m = madhhab || st.settings.madhhab || defaultMadhhab();
    const segOf = (id, items, cur, attr) => '<div class="seg" id="' + id + '" style="margin-bottom:10px">' + items.map(([v, l]) => '<button type="button" data-' + attr + '="' + v + '" class="' + (v === cur ? 'on' : '') + '">' + l + '</button>').join('') + '</div>';
    let body = segOf('zkTool', [['zakat', 'الزكاة'], ['khums', 'الخُمس']], k, 't') +
      '<div class="small muted" style="margin:0 4px 6px">مذهبك:</div>' + segOf('mdh', [['sunni', 'سني'], ['jafari', 'شيعي']], m, 'm');
    if (k === 'zakat') {
      body += '<p class="small muted" style="margin:0 4px 10px">الزكاة <b>2.5%</b> إذا وصل المال <b>النصاب</b> (قيمة ' + NISAB[m] + ' غرام ذهب' + (m === 'jafari' ? '، 15 مثقال صيرفي' : '') + ') ومر عليه <b>سنة</b>.</p>' +
        '<div class="field"><label>' + (m === 'jafari' ? 'قيمة الذهب والفضة المسكوكين (د.ب)' : 'نقدك ومدخراتك (د.ب)') + '</label><input name="zk_cash" inputmode="decimal" placeholder="0.000" value="' + (m === 'jafari' ? '' : savedInGoals() || '') + '"></div>' +
        '<div class="field"><label>سعر غرام الذهب اليوم (د.ب)</label><input name="zk_gold" inputmode="decimal" placeholder="مثلاً 40.000" value="' + (st.settings.gold_price || '') + '"></div>' +
        '<label style="display:flex;gap:8px;align-items:center;margin:6px 4px"><input type="checkbox" name="zk_year" checked> مرت عليه سنة وهو فوق النصاب</label>' +
        '<div class="hero" id="zkOut" style="margin-top:12px"></div>' +
        '<p class="small muted" style="margin:10px 6px 0">' + (m === 'jafari' ? 'عند أغلب مراجع الشيعة الزكاة على الذهب والفضة المسكوكين (وغيرها مثل الأنعام والغلات)، والنقد والمدخرات عليها الخُمس.' : 'عند السنة الزكاة على النقد والمدخرات والذهب والفضة وعروض التجارة.') + '</p>';
    } else {
      const start = st.settings.khums_start || lastYear();
      const s = since(start);
      body += '<p class="small muted" style="margin:0 4px 10px">الخُمس <b>20%</b> من اللي يتبقى من أرباح السنة بعد مصاريفها، من <b>رأس سنتك</b>.</p>' +
        '<div class="field"><label>رأس السنة</label><input name="kh_start" type="date" value="' + start + '"></div>' +
        '<div class="field"><label>الدخل من ذاك اليوم (د.ب)</label><input name="kh_inc" inputmode="decimal" value="' + r3(s.inc) + '"></div>' +
        '<div class="field"><label>المصاريف من ذاك اليوم (د.ب)</label><input name="kh_exp" inputmode="decimal" value="' + r3(s.exp) + '"></div>' +
        '<div class="field"><label>مدخرات ثانية ما خمّستها (اختياري)</label><input name="kh_extra" inputmode="decimal" placeholder="0.000"></div>' +
        '<p class="small muted" style="margin:0 4px">الدخل والمصاريف من اللي مسجله بالتطبيق، وتقدر تعدّلهم.</p>' +
        '<div class="hero" id="zkOut" style="margin-top:12px"></div>' +
        '<p class="small muted" style="margin:10px 6px 0">' + (m === 'jafari' ? 'عند الشيعة الخُمس واجب على فائض أرباح السنة.' : 'عند السنة الخُمس يكون بالركاز (الكنز والمعادن) والغنائم، والحاسبة موجودة لو حبيت تستخدمها.') + '</p>';
    }
    body += '<p class="small muted" style="margin:12px 6px 0;text-align:center">⚠️ <b>تقدير</b> يساعدك تحسب، مو فتوى. راجع مرجعك أو عالِم قبل ما تدفع.</p>';
    A.openSheet({
      title: 'الزكاة والخُمس',
      cancelLabel: 'تم',
      body,
      mount(root) {
        const out = root.querySelector('#zkOut');
        const num = (n) => { const v = A.parseAmount(A.val(root, n)); return v > 0 ? v : 0; };
        const calc = () => {
          if (k === 'zakat') {
            const gold = num('zk_gold');
            if (gold) S.setSettings({ gold_price: r3(gold) });
            const z = zakatOf(num('zk_cash'), gold, root.querySelector('[name=zk_year]').checked, m);
            out.innerHTML = z.due == null ? '<span class="eyebrow">اكتب سعر غرام الذهب عشان نحسب النصاب</span>' :
              '<span class="eyebrow">' + I('target') + 'النصاب ≈ ' + fmt(z.nisab) + ' د.ب</span><div class="amount-big">' + money(z.due) + '</div>' +
              '<div class="meta"><span>' + (z.due ? 'الزكاة التقديرية (2.5%)' : num('zk_cash') < z.nisab ? 'تحت النصاب: ما عليك زكاة' : 'ما مرت عليه سنة') + '</span></div>';
          } else {
            const startV = A.val(root, 'kh_start');
            if (startV) S.setSettings({ khums_start: startV });
            const x = khumsOf(num('kh_inc'), num('kh_exp'), num('kh_extra'));
            out.innerHTML = '<span class="eyebrow">' + I('target') + 'الفائض ' + fmt(x.surplus) + ' د.ب</span><div class="amount-big">' + money(x.due) + '</div>' +
              '<div class="meta"><span>' + (x.due ? 'الخُمس التقديري (20%)' : 'ما فيه فائض: ما عليك خُمس من هالأرقام') + '</span></div>';
          }
        };
        root.oninput = calc;
        root.onchange = (e) => {
          if (e.target.name === 'kh_start' && e.target.value) {
            const x = since(e.target.value);
            root.querySelector('[name=kh_inc]').value = r3(x.inc); root.querySelector('[name=kh_exp]').value = r3(x.exp);
          }
          calc();
        };
        root.querySelector('#zkTool').onclick = (e) => { const b = e.target.closest('[data-t]'); if (b && b.dataset.t !== k) zakatSheet(b.dataset.t, m); };
        root.querySelector('#mdh').onclick = (e) => {
          const b = e.target.closest('[data-m]'); if (!b || b.dataset.m === m) return;
          S.setSettings({ madhhab: b.dataset.m });
          zakatSheet(k, b.dataset.m);
        };
        calc();
      },
    });
  }

  // ================= الربط =================
  wrap('todayTop', (prev) => paydayCard() + prev());
  wrap('moneyActions', (prev) => prev() +
    '<div class="actions" style="margin-top:6px"><button class="action" data-action="payday"><div class="ico" style="' + tint('#1A8A8F') + '">' + I('calendar') + '</div>' +
    (Number(st.settings.payday) > 1 ? 'الراتب يوم ' + Number(st.settings.payday) : 'يوم الراتب') + '</button>' +
    '<button class="action" data-action="zakat"><div class="ico" style="' + tint('#b45309') + '">' + I('target') + '</div>الزكاة والخُمس</button></div>');
  wrap('action', (prev, name, el, e) => {
    switch (name) {
      case 'payday': paydaySheet(); return;
      case 'payday-summary': summarySheet(); return;
      case 'zakat': zakatSheet(); return;
      default: return prev(name, el, e);
    }
  });
  // للاختبارات
  E.Payday = { zakatOf, khumsOf, NISAB };
})();
