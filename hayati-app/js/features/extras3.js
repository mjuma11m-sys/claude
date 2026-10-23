// تقرير الأسبوع + وضع الحارس ⚽🧤
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, st, I, h, fmt, money, tint } = A;
  const wrap = (name, fn) => { const prev = E[name]; E[name] = (...a) => fn(prev ? prev : () => '', ...a); };
  const pad = (n) => String(n).padStart(2, '0');
  const dateKey = (d) => { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  function lsGet(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* تجاهل */ } }
  const r1 = (n) => Math.round(n * 10) / 10;

  // ================= تقرير الأسبوع =================
  // آخر 7 أيام (اليوم منها) مقابل الـ7 اللي قبلها
  function range(offsetWeeks) {
    const end = new Date(); end.setHours(23, 59, 59, 999); end.setDate(end.getDate() - 7 * offsetWeeks);
    const start = new Date(end); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
    const keys = []; for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) keys.push(dateKey(d));
    return { start, end, keys, has: (t) => { const x = new Date(t); return x >= start && x <= end; } };
  }

  function stats(w) {
    const tx = st.transactions.filter((t) => t.occurred_at && w.has(t.occurred_at));
    const exp = tx.filter((t) => t.kind === 'expense');
    const spend = exp.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const income = tx.filter((t) => t.kind === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const byCat = {};
    for (const t of exp) byCat[t.category || 'أخرى'] = (byCat[t.category || 'أخرى'] || 0) + (Number(t.amount) || 0);
    const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0] || null;
    const biggest = exp.slice().sort((a, b) => b.amount - a.amount)[0] || null;
    const study = st.study_sessions.filter((s) => s.started_at && w.has(s.started_at)).reduce((s, x) => s + (Number(x.minutes) || 0), 0);
    const gymDays = new Set(st.lifts.filter((l) => w.keys.includes(l.date)).map((l) => l.date)).size;
    const daily = st.daily.filter((d) => w.keys.includes(d.date));
    const sleeps = daily.map((d) => d.sleep).filter((x) => x != null);
    const waters = daily.map((d) => d.water).filter((x) => x != null);
    const habits = st.habits.filter((x) => x.active !== false);
    const habitDone = daily.reduce((s, d) => s + habits.filter((x) => d.habits && d.habits[x.id]).length, 0);
    const habitPct = habits.length ? Math.round((habitDone / (habits.length * 7)) * 100) : null;
    const moods = st.journal.filter((j) => w.keys.includes(j.date) && j.mood).map((j) => j.mood);
    const matches = (st.matches || []).filter((m) => w.keys.includes(m.date));
    return {
      spend, income, topCat, biggest, study, gymDays, habitPct, matches,
      sleep: sleeps.length ? r1(sleeps.reduce((a, b) => a + b, 0) / sleeps.length) : null,
      water: waters.length ? r1(waters.reduce((a, b) => a + b, 0) / waters.length) : null,
      mood: moods.length ? r1(moods.reduce((a, b) => a + b, 0) / moods.length) : null,
    };
  }

  const MOOD_FACE = ['', '😞', '😕', '😐', '🙂', '😄'];
  function delta(now, before, lowerIsBetter) {
    if (!before) return '';
    const p = Math.round(((now - before) / before) * 100);
    if (!p) return '<span class="tag">مثل الأسبوع اللي طاف</span>';
    const good = lowerIsBetter ? p < 0 : p > 0;
    return '<span class="tag ' + (good ? 'brand' : 'danger') + '">' + (p > 0 ? '▲ ' : '▼ ') + Math.abs(p) + '%</span>';
  }

  function insights(a, b) {
    const set = st.settings || {};
    const out = [];
    if (b.spend && a.spend > b.spend * 1.2) out.push('💸 صرفك زاد ' + Math.round(((a.spend - b.spend) / b.spend) * 100) + '% — أكثر شي على «' + h(a.topCat ? a.topCat[0] : '') + '».');
    else if (b.spend && a.spend < b.spend * 0.85) out.push('👏 صرفت أقل من الأسبوع اللي طاف بـ ' + fmt(b.spend - a.spend) + ' د.ب.');
    if (set.budget) {
      const perWeek = (Number(set.budget) * 12) / 52;
      if (a.spend > perWeek) out.push('⚠️ تعدّيت حصة الأسبوع من ميزانيتك (' + fmt(perWeek) + ' د.ب).');
    }
    const sleepGoal = Number(set.sleep_goal) || 8;
    if (a.sleep != null && a.sleep < sleepGoal - 1) out.push('😴 متوسط نومك ' + a.sleep + ' ساعات — أقل من هدفك بساعة وأكثر.' + (!A.has || A.has('keeper') ? ' النوم أهم شي لردة فعل الحارس.' : ''));
    if (!a.study) out.push('📚 ما سجّلت ولا جلسة مذاكرة هالأسبوع — جرّب 25 دقيقة بس من «المذاكرة».');
    if (a.gymDays >= 3) out.push('💪 ' + a.gymDays + ' أيام تمرين — التزام ممتاز.');
    else if (a.gymDays === 0) out.push('🏋️ ولا تمرين هالأسبوع — رجّع الجدول على الأحد.');
    if (a.matches.length) {
      const cs = a.matches.filter((m) => Number(m.against) === 0).length;
      out.push('🧤 ' + a.matches.length + ' ' + (a.matches.length === 1 ? 'مباراة' : 'مباريات') + (cs ? '، منها ' + cs + ' كلين شيت' : '') + '.');
    }
    return out.length ? out : ['✅ أسبوع متوازن — كمّل على نفس الريتم.'];
  }

  function row(icon, color, label, value, extra) {
    return '<div class="cb-row"><div class="ico" style="' + tint(color) + '">' + icon + '</div><span>' + label + '</span><b dir="rtl" style="font-variant-numeric:tabular-nums">' + value + '</b>' + (extra || '') + '</div>';
  }
  // 85 → «ساعة و25 د» · 120 → «ساعتين»
  function hrs(min) {
    const H = Math.floor(min / 60), M = min % 60;
    const hs = H === 0 ? '' : H === 1 ? 'ساعة' : H === 2 ? 'ساعتين' : H + ' ساعات';
    return hs ? hs + (M ? ' و' + M + ' د' : '') : M + ' دقيقة';
  }

  function weeklySheet() {
    const a = stats(range(0)), b = stats(range(1));
    const w = range(0);
    const fmtD = (d) => d.getDate() + '/' + (d.getMonth() + 1);
    let body = '<p class="small muted" style="margin:0 0 12px;text-align:center">' + fmtD(w.start) + ' — ' + fmtD(w.end) + ' · مقارنة بالأسبوع اللي قبله</p>';
    body += '<div class="hero" style="margin-bottom:14px"><span class="eyebrow">' + I('wallet') + 'صرفت هالأسبوع</span>' +
      '<div class="amount-big">' + money(a.spend) + '</div><div class="meta"><span>' + delta(a.spend, b.spend, true) + '</span>' +
      (a.topCat ? '<span>أكثر شي: ' + h(a.topCat[0]) + ' · ' + fmt(a.topCat[1]) + '</span>' : '') + '</div>' +
      (a.biggest ? '<div class="split"><div><small>أكبر مصروف</small><b>' + h(a.biggest.merchant || a.biggest.category || '') + '</b></div><div><small>المبلغ</small><b class="num">' + fmt(a.biggest.amount) + '</b></div></div>' : '') + '</div>';
    body += '<div class="card">' +
      row('📚', '#0ea5e9', 'مذاكرة', a.study ? hrs(a.study) : '—', delta(a.study, b.study)) +
      row('💪', '#10b981', 'أيام تمرين', a.gymDays + ' من 7', delta(a.gymDays, b.gymDays)) +
      row('😴', '#8b5cf6', 'متوسط النوم', a.sleep != null ? a.sleep + ' س' : '—', a.sleep != null && b.sleep != null ? delta(a.sleep, b.sleep) : '') +
      row('💧', '#0ea5e9', 'متوسط الماي', a.water != null ? a.water + ' أكواب' : '—', '') +
      row('✅', '#f59e0b', 'العادات', a.habitPct != null ? a.habitPct + '%' : '—', '') +
      row(a.mood ? MOOD_FACE[Math.round(a.mood)] : '🙂', '#ec4899', 'مزاجك', a.mood != null ? a.mood + ' من 5' : '—', '') +
      (a.matches.length ? row('🧤', '#13636B', 'مباريات', String(a.matches.length), '') : '') +
      '</div>';
    body += A.secHead('الخلاصة') + '<div class="card">' + insights(a, b).map((x) => '<p style="margin:6px 0">' + x + '</p>').join('') + '</div>';
    lsSet('hayati-weekly-seen', thursdayKey());
    A.openSheet({ title: 'تقرير أسبوعك', cancelLabel: 'تم', body });
  }

  // مفتاح الأسبوع = آخر خميس
  function thursdayKey() { const t = new Date(); t.setDate(t.getDate() - ((t.getDay() - 4 + 7) % 7)); return dateKey(t); }

  // يطلع من الخميس 6 المسا لين السبت، ومرة وحدة بالأسبوع
  function weeklyCard() {
    const n = new Date(), d = n.getDay();
    const inWindow = (d === 4 && n.getHours() >= 18) || d === 5 || d === 6;
    if (!inWindow || lsGet('hayati-weekly-seen', '') === thursdayKey()) return '';
    const a = stats(range(0));
    return '<button class="cta" data-action="weekly">' +
      '<div class="ico">' + I('chart') + '</div><div style="flex:1;min-width:0"><b>تقرير أسبوعك جاهز 📊</b><small>صرفت ' + fmt(a.spend) + ' د.ب · ' + a.gymDays + ' أيام تمرين · ' +
      (a.study ? hrs(a.study) + ' مذاكرة' : 'شوف وين وصلت') + '</small></div>' + I('chevL') + '</button>';
  }

  // ================= وضع الحارس =================
  const COMPS = [['league', 'دوري'], ['cup', 'كأس'], ['friendly', 'ودية'], ['training', 'تقسيمة']];
  const DRILLS = [
    ['ردة الفعل', 'Reaction ball ضد الجدار — 3 × 45 ثانية، راحة 30 ثانية'],
    ['الارتماء', 'Collapse dive يمين/يسار 2 × 8 لكل جهة، ثم Extension dive 2 × 6 لكل جهة'],
    ['التحرك الجانبي', 'Shuffle + set position على سلّم الرشاقة — 4 × 20 ثانية'],
    ['الكرات العالية', 'استلام عرضيات تحت ضغط (أو رمي عالي من زميل) — 3 × 8'],
    ['واحد ضد واحد', 'Spread / K-barrier — 3 × 5 مواجهات، تطلع وتسكّر الزاوية'],
    ['التوزيع', 'رمية بيد واحدة + ركلة من اليد لهدف على بعد 30م — 2 × 10'],
  ];

  function season() {
    const list = (st.matches || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    const n = list.length;
    const sum = (k) => list.reduce((s, m) => s + (Number(m[k]) || 0), 0);
    const cs = list.filter((m) => Number(m.against) === 0).length;
    const shots = sum('saves') + sum('against');
    const rated = list.filter((m) => m.rating);
    return {
      list, n, cs, saves: sum('saves'), against: sum('against'), pens: sum('pens_saved'),
      savePct: shots ? Math.round((sum('saves') / shots) * 100) : null,
      rating: rated.length ? r1(rated.reduce((s, m) => s + Number(m.rating), 0) / rated.length) : null,
    };
  }

  const WDL = (window.HayatiLang && HayatiLang.lang === 'en') ? ['W', 'L', 'D'] : ['ف', 'خ', 'ت'];
  const resultOf = (m) => (Number(m.for) > Number(m.against) ? [WDL[0], '#2F9E7A'] : Number(m.for) < Number(m.against) ? [WDL[1], '#D63A3A'] : [WDL[2], '#8A9A9B']);

  function keeperSection() {
    if (A.has && !A.has('keeper')) return '';
    const s = season();
    let out = A.secHead('🧤 الحارس', '<button class="link" data-action="gk-drills">تمارين الحراسة</button>');
    if (!s.n) {
      return out + '<div class="card"><div class="empty"><div class="ico">⚽</div><b>سجّل أول مباراة</b><p>التصديات، الأهداف عليك، الكلين شيت، وتقييمك — وتشوف فورمتك على طول الموسم.</p></div>' +
        '<button class="btn primary block" data-action="gk-add">' + I('plus') + 'سجّل مباراة</button></div>';
    }
    const tile = (lbl, val, color) => '<div class="tile"><div class="lbl">' + lbl + '</div><div class="val num" style="color:' + color + '">' + val + '</div></div>';
    out += '<div class="tiles">' + tile('مباريات', s.n, 'var(--text)') + tile('كلين شيت', s.cs, 'var(--income)') + tile('نسبة التصدي', s.savePct != null ? s.savePct + '%' : '—', 'var(--brand)') + '</div>';
    out += '<div class="card" style="margin-top:10px">';
    // الفورمة: آخر 5
    out += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><b style="flex:1">آخر المباريات</b>' +
      s.list.slice(0, 5).map((m) => { const [l, c] = resultOf(m); return '<span style="width:26px;height:26px;border-radius:8px;display:grid;place-items:center;font-weight:700;font-size:13px;color:#fff;background:' + c + '">' + l + '</span>'; }).join('') + '</div>';
    // التقييم عبر الوقت
    const last = s.list.slice(0, 10).reverse().filter((m) => m.rating);
    if (last.length >= 2) {
      out += '<div class="mini-chart"><b>تقييمك (آخر ' + last.length + ')</b><div class="mini-bars" style="grid-template-columns:repeat(' + last.length + ',1fr)">' +
        last.map((m) => '<div><small class="num">' + m.rating + '</small><i style="height:' + (Number(m.rating) * 10) + '%;background:' + (Number(m.rating) >= 7 ? 'var(--income)' : Number(m.rating) >= 5 ? '#f59e0b' : 'var(--expense)') + '"></i></div>').join('') + '</div></div>';
    }
    out += '<div class="small muted" style="display:flex;flex-wrap:wrap;gap:4px 14px">' +
      '<span>تصديات: <b class="num">' + s.saves + '</b></span><span>أهداف عليك: <b class="num">' + s.against + '</b></span>' +
      (s.pens ? '<span>بلنتيات صدّيتها: <b class="num">' + s.pens + '</b></span>' : '') +
      (s.rating != null ? '<span>متوسط تقييمك: <b class="num">' + s.rating + '</b></span>' : '') + '</div>';
    out += '<ul class="list" style="margin-top:8px">' + s.list.slice(0, 5).map((m) => {
      const [l, c] = resultOf(m);
      return '<li class="row" data-action="gk-edit" data-id="' + m.id + '"><div class="ico" style="' + tint(c) + ';font-weight:700">' + l + '</div><div class="main"><div class="title"><span class="t">' +
        h(m.opponent || 'مباراة') + '</span><span class="tag">' + h((COMPS.find((x) => x[0] === m.comp) || COMPS[0])[1]) + '</span></div><div class="sub">' + h(m.date) + ' · ' +
        (Number(m.saves) || 0) + ' تصديات' + (Number(m.against) === 0 ? ' · 🧤 كلين شيت' : '') + '</div></div><div class="amount num">' + (Number(m.for) || 0) + ' - ' + (Number(m.against) || 0) + '</div></li>';
    }).join('') + '</ul>';
    out += '<button class="btn primary block" style="margin-top:10px" data-action="gk-add">' + I('plus') + 'سجّل مباراة</button></div>';
    return out;
  }

  function matchForm(m) {
    const isNew = !m;
    m = m || { date: dateKey(), comp: 'league', for: 0, against: 0, saves: 0, pens_saved: 0, minutes: 90, rating: '' };
    const num = (name, label, v, step) => '<div class="field"><label>' + label + '</label><input name="' + name + '" class="ltr" type="number" inputmode="' + (step ? 'decimal' : 'numeric') + '" min="0" ' + (step ? 'step="' + step + '" max="10"' : '') + ' value="' + h(v == null ? '' : v) + '"></div>';
    A.openSheet({
      title: isNew ? 'مباراة جديدة' : 'تعديل المباراة',
      body:
        '<div class="field"><label>الخصم</label><input name="opponent" value="' + h(m.opponent || '') + '" placeholder="مثلاً: نادي المحرق"></div>' +
        '<div class="two"><div class="field"><label>التاريخ</label><input name="date" type="date" class="ltr" value="' + h(m.date) + '"></div>' +
        '<div class="field"><label>البطولة</label><select name="comp">' + COMPS.map(([k, l]) => '<option value="' + k + '"' + (m.comp === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></div></div>' +
        '<div class="two">' + num('for', 'أهدافنا', m.for) + num('against', 'أهداف علينا', m.against) + '</div>' +
        '<div class="two">' + num('saves', 'تصدياتك', m.saves) + num('pens_saved', 'بلنتيات صدّيتها', m.pens_saved) + '</div>' +
        '<div class="two">' + num('minutes', 'الدقايق', m.minutes) + num('rating', 'تقييمك لنفسك (1-10)', m.rating, '0.5') + '</div>' +
        '<div class="field"><label>ملاحظات (شنو زين؟ شنو تحسّنه؟)</label><textarea name="notes">' + h(m.notes || '') + '</textarea></div>' +
        (isNew ? '' : '<button class="btn danger block" data-gk-del type="button">' + I('trash') + 'حذف المباراة</button>'),
      mount(root) {
        const del = root.querySelector('[data-gk-del]');
        if (del) del.onclick = async () => { if (await A.ask('تحذف المباراة؟')) { S.remove('matches', m.id); A.closeSheet(); A.toast('انحذفت'); } };
      },
      onSave(root) {
        const v = (n) => A.val(root, n);
        const int = (n) => Math.max(0, Math.round(Number(v(n)) || 0));
        const rating = v('rating') === '' ? null : Math.min(10, Math.max(1, Number(v('rating'))));
        if (!v('date')) { A.toast('اختار التاريخ'); return false; }
        const rec = Object.assign({}, m, {
          opponent: v('opponent'), date: v('date'), comp: v('comp'), for: int('for'), against: int('against'),
          saves: int('saves'), pens_saved: int('pens_saved'), minutes: int('minutes'), rating, notes: v('notes'),
        });
        S.upsert('matches', rec);
        A.toast(rec.against === 0 ? 'كلين شيت 🧤🔥' : 'انسجلت ✓');
      },
    });
  }

  function drillsSheet() {
    A.openSheet({
      title: 'تمارين الحراسة',
      cancelLabel: 'تم',
      body: '<p class="small muted" style="margin:0 0 10px">جلسة 35–40 دقيقة. سخّن 10 دقايق قبلها (حركة + كرات خفيفة باليد)، وخلّها يومين بالأسبوع بعيد عن يوم المباراة.</p>' +
        '<div class="card">' + DRILLS.map(([t, d], i) => '<div class="cb-row" style="align-items:flex-start"><div class="rank">' + (i + 1) + '</div><div style="flex:1"><b>' + t + '</b><div class="small muted">' + d + '</div></div></div>').join('') + '</div>' +
        '<p class="small muted" style="margin:10px 4px 0">قبل المباراة بيوم: لا ارتماءات كثيرة — ردة فعل خفيفة وتوزيع بس.</p>',
    });
  }

  // ================= الربط =================
  wrap('todayTop', (prev) => weeklyCard() + prev());
  wrap('viewHealth', (prev) => prev() + keeperSection() +
    '<button class="btn ghost block" style="margin:14px 0 4px" data-action="weekly">' + I('chart') + 'تقرير الأسبوع</button>');
  wrap('action', (prev, name, el, e) => {
    switch (name) {
      case 'weekly': weeklySheet(); return;
      case 'gk-add': matchForm(); return;
      case 'gk-edit': matchForm((st.matches || []).find((m) => m.id === el.dataset.id)); return;
      case 'gk-drills': drillsSheet(); return;
      default: return prev(name, el, e);
    }
  });
  A.render();
})();
