// 📈 توقع آخر الشهر + 🧤 جاهزية اليوم (نوم + HRV + نبض + حِمل أمس)
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { st, h, fmt } = A;
  const wrap = (name, fn) => { const prev = E[name]; E[name] = (...a) => fn(prev ? prev : () => '', ...a); };
  const pad = (n) => String(n).padStart(2, '0');
  const dateKey = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const median = (xs) => { const s = xs.slice().sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

  // ================= توقع آخر الشهر =================
  // المعدل اليومي من المصاريف «العادية» بس: الاشتراكات ثابتة (انحسبت)، وأي عملية فوق ربع الميزانية مرة وحدة (رسوم، قطعة غالية) ما تتكرر
  function forecast(now) {
    now = now || new Date();
    const budget = Number(st.settings.budget) || 0;
    const day = now.getDate();
    const daysIn = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    if (day < 5) return null; // أول الشهر الأرقام تكذب
    const list = A.txInMonth(A.monthKey(now)).filter((t) => t.kind !== 'income');
    const spent = list.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const oneOff = budget ? budget * 0.25 : Infinity;
    const regular = list.filter((t) => t.source !== 'subscription' && Number(t.amount) < oneOff).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const pace = regular / day;
    const end = spent + pace * (daysIn - day);
    return { spent, pace, end, budget, over: budget ? end - budget : null, daysLeft: daysIn - day };
  }
  function forecastLine() {
    const f = forecast();
    if (!f || !f.budget) return '';
    const bad = f.over > 0;
    return '<div class="meta forecast" style="margin-top:4px;display:block"><span style="display:block">📈 توقع آخر الشهر: <b class="num">' + fmt(f.end) + '</b></span>' +
      '<span style="display:block;' + (bad ? 'color:#FFB4A6;font-weight:600' : '') + '">' + (bad ? 'فوق الميزانية بـ ' + fmt(f.over) : 'تحت الميزانية بـ ' + fmt(-f.over)) + '</span></div>';
  }
  wrap('allowance', (prev, exp, budget) => prev(exp, budget) + forecastLine());

  // ================= جاهزية اليوم =================
  function readiness(now) {
    now = now || new Date();
    const today = dateKey(now);
    const doc = st.daily.find((d) => d.date === today && d.watch);
    if (!doc || doc.sleep == null) return null;
    const goal = Number(st.settings.sleep_goal) || 8;
    // خط الأساس = آخر 14 ليلة قبل اليوم (يحتاج 3 على الأقل)
    const past = st.daily.filter((d) => d.watch && d.date < today).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 14);
    const base = (k) => { const xs = past.map((d) => d[k]).filter((x) => x != null); return xs.length >= 3 ? median(xs) : null; };
    const parts = [];
    // النوم (40)
    parts.push({ w: 40, s: clamp((doc.sleep - (goal - 2.5)) / 2.5, 0, 1), chip: 'نوم ' + doc.sleep + ' من ' + goal, bad: doc.sleep < goal - 1 });
    // HRV مقارنة بنفسك (30): أقل من المعتاد بـ 25% = صفر
    const bh = base('hrv');
    if (doc.hrv != null && bh) {
      const r = doc.hrv / bh;
      parts.push({ w: 30, s: clamp((r - 0.75) / 0.25, 0, 1), chip: 'HRV ' + (r >= 1 ? '+' : '−') + Math.abs(Math.round((r - 1) * 100)) + '%', bad: r < 0.9 });
    }
    // نبض الراحة (15): أعلى من المعتاد بـ 7 = صفر
    const br = base('rhr');
    if (doc.rhr != null && br) {
      const d = doc.rhr - br;
      parts.push({ w: 15, s: clamp(1 - d / 7, 0, 1), chip: 'نبض ' + (d > 0 ? '+' : '') + Math.round(d), bad: d >= 4 });
    }
    // حِمل أمس (15): مباراة = ثقيل، تمرين = متوسط
    const y = new Date(now); y.setDate(y.getDate() - 1);
    const match = (st.matches || []).find((m) => m.date === dateKey(y));
    const sessions = A.agendaOn(y).filter((x) => x.type === 'gym' || x.type === 'activity').length;
    const load = match ? clamp((Number(match.minutes) || 90) / 90, 0.5, 1) : sessions ? 0.5 : 0;
    parts.push({ w: 15, s: 1 - load, chip: match ? 'مباراة أمس' : sessions ? 'تمرين أمس' : 'راحة أمس', bad: load >= 1 });
    const W = parts.reduce((s, p) => s + p.w, 0);
    const score = Math.round(parts.reduce((s, p) => s + p.w * p.s, 0) / W * 100);
    const zone = score >= 75 ? 'green' : score >= 55 ? 'yellow' : 'red';
    return { score, zone, parts, hasBaseline: !!(bh || br) };
  }
  const ZONES = {
    green: ['🟢', 'جاهز لتمرين قوي', 'قفز وارتماءات وسرعة ردة فعل — يومك تضغط فيه.', '#2F9E7A'],
    yellow: ['🟡', 'تمرين متوسط', 'مسك كرة وتمركز وتوزيع. خفّف القفز المتكرر.', '#B45309'],
    red: ['🔴', 'يوم استشفاء', 'إطالة ومرونة ومشي خفيف. لا ارتماءات اليوم.', '#D63A3A'],
  };
  function readinessCard() {
    const r = readiness();
    if (!r) return '';
    const [emo, title, tip, col] = ZONES[r.zone];
    return '<div class="card readiness" style="--z:' + col + '"><div class="rd-head"><span class="rd-emo">' + emo + '</span><div style="flex:1;min-width:0">' +
      '<small class="muted">🧤 جاهزيتك اليوم</small><b>' + title + '</b></div><b class="num rd-score">' + r.score + '</b></div>' +
      '<p class="small" style="margin:6px 0 8px;color:var(--text-2)">' + tip + '</p>' +
      '<div class="rd-chips">' + r.parts.map((p) => '<span class="' + (p.bad ? 'bad' : '') + '">' + h(p.chip) + '</span>').join('') + '</div>' +
      (r.hasBaseline ? '' : '<p class="small muted" style="margin:8px 0 0">بعد 3 ليالي من الساعة تصير المقارنة بمعدلك أنت.</p>') +
      '<p class="small muted" style="margin:6px 0 0">تقدير من بياناتك، مو تشخيص طبي.</p></div>';
  }
  wrap('todayTop', (prev) => readinessCard() + prev());

  window.HayatiInsights = { forecast, readiness };
  A.render();
})();
