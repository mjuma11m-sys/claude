// حياتي — الإضافات: الصلاة، العادات، الماء والنوم، ملخص الصباح، تنبيه الميزانية، ميزانية التصنيفات،
// التوفير من الدخل، صورة الفاتورة، الغياب والملاحظات، «كم أحتاج»، خطة المراجعة، أوزان الجيم، مؤقت الراحة،
// وزن الجسم، والوضع الغامق اليدوي.
(function () {
  'use strict';
  const A = window.App;
  if (!A) return;
  const { S, st, I, h, fmt, money, tint, pad } = A;
  const set = () => st.settings;

  function dateKey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function lsGet(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* تجاهل */ } }

  // ================= الوضع الغامق اليدوي (لكل جهاز) =================
  function applyTheme() {
    const t = lsGet('hayati-theme', 'auto');
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }
  applyTheme();

  // ================= أوقات الصلاة (حساب فلكي محلي — المنامة) =================
  const LAT = 26.2235, LNG = 50.5876, TZ = 3;
  const METHODS = {
    gulf: { label: 'أم القرى / الخليج', fajr: 18.5, isha: { min: 90 }, maghrib: 0 },
    jafari: { label: 'جعفري', fajr: 16, isha: { deg: 14 }, maghrib: 4 },
  };
  const rad = (d) => d * Math.PI / 180, deg = (r) => r * 180 / Math.PI;
  const fixH = (x) => ((x % 24) + 24) % 24;
  function sun(jd) {
    const D = jd - 2451545.0;
    const g = rad((357.529 + 0.98560028 * D) % 360), q = (280.459 + 0.98564736 * D) % 360;
    const L = rad((q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) % 360), e = rad(23.439 - 0.00000036 * D);
    const RA = fixH(deg(Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L))) / 15);
    return { decl: Math.asin(Math.sin(e) * Math.sin(L)), eqt: q / 15 - RA };
  }
  function julian(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    const A0 = Math.floor(y / 100), B = 2 - A0 + Math.floor(A0 / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }
  function prayerTimes(date, methodKey) {
    const M = METHODS[methodKey] || METHODS.gulf;
    const jd = julian(date.getFullYear(), date.getMonth() + 1, date.getDate()) - LNG / (15 * 24);
    const lat = rad(LAT);
    const noonAt = (t) => fixH(12 - sun(jd + t / 24).eqt);
    const angleTime = (angle, t, ccw) => {
      const { decl } = sun(jd + t / 24);
      const T = deg(Math.acos((-Math.sin(rad(angle)) - Math.sin(decl) * Math.sin(lat)) / (Math.cos(decl) * Math.cos(lat)))) / 15;
      return noonAt(t) + (ccw ? -T : T);
    };
    const asrTime = (t) => {
      const { decl } = sun(jd + t / 24);
      const angle = -deg(Math.atan(1 / (1 + Math.tan(Math.abs(lat - decl)))));
      return angleTime(angle, t, false);
    };
    const local = (x) => x + TZ - LNG / 15;
    const dhuhr = local(noonAt(12)) + 1 / 60;
    const fajr = local(angleTime(M.fajr, 5, true));
    const sunrise = local(angleTime(0.833, 6, true));
    const asr = local(asrTime(13));
    const sunset = local(angleTime(0.833, 18, false));
    const maghrib = M.maghrib ? local(angleTime(M.maghrib, 18, false)) : sunset;
    const isha = M.isha.min ? maghrib + M.isha.min / 60 : local(angleTime(M.isha.deg, 18, false));
    const toMin = (x) => Math.round(x * 60);
    return { fajr: toMin(fajr), sunrise: toMin(sunrise), dhuhr: toMin(dhuhr), asr: toMin(asr), maghrib: toMin(maghrib), isha: toMin(isha) };
  }
  const PRAYER_NAMES = [['fajr', 'الفجر'], ['dhuhr', 'الظهر'], ['asr', 'العصر'], ['maghrib', 'المغرب'], ['isha', 'العشاء']];
  function prayersOn(date) {
    if (set().prayer_on === false) return [];
    const t = prayerTimes(date, set().prayer_method || 'gulf');
    return PRAYER_NAMES.map(([k, name]) => ({ src: 'prayer', id: 'prayer-' + k, type: 'prayer', name: 'صلاة ' + name, room: '', color: '#0d9488', start: t[k], end: t[k] + 20 }));
  }

  // ================= العادات والماء والنوم =================
  function todayDoc() { const k = dateKey(); return st.daily.find((d) => d.date === k) || null; }
  function saveToday(patch) {
    const k = dateKey();
    const cur = todayDoc() || { id: S.stableId('daily:' + k), date: k, water: 0, sleep: null, habits: {} };
    S.upsert('daily', Object.assign({}, cur, patch));
  }
  function habitStreak(hid) {
    let n = 0;
    for (let i = 0; i < 366; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const doc = st.daily.find((x) => x.date === dateKey(d));
      if (doc && doc.habits && doc.habits[hid]) n++;
      else if (i > 0) break;
    }
    return n;
  }
  function dailyCard() {
    const doc = todayDoc() || { water: 0, sleep: null, habits: {} };
    const goalW = Number(set().water_goal) || 8, goalS = Number(set().sleep_goal) || 8;
    const habits = st.habits.filter((x) => x.active !== false);
    let out = A.secHead('يومك الصحي', '<button class="link" data-action="go-health">التفاصيل</button>');
    out += '<div class="card">';
    // الماء
    out += '<div class="dh-row"><div class="ico" style="' + tint('#0ea5e9') + '">💧</div><div style="flex:1;min-width:0"><b>الماء</b><div class="cups">';
    for (let i = 0; i < goalW; i++) out += '<button class="cup' + (i < (doc.water || 0) ? ' on' : '') + '" data-action="water" data-n="' + (i + 1) + '" aria-label="كوب ' + (i + 1) + '"></button>';
    out += '</div></div><span class="small muted num">' + (doc.water || 0) + '/' + goalW + '</span></div>';
    // النوم
    out += '<div class="dh-row"><div class="ico" style="' + tint('#8b5cf6') + '">😴</div><div style="flex:1"><b>النوم البارحة</b><div class="small muted">' +
      (doc.sleep != null ? (doc.sleep >= goalS ? 'نوم كافي 👌' : 'أقل من هدفك (' + goalS + ' ساعات)') : 'كم ساعة نمت؟') + '</div></div>' +
      '<div class="stepper"><button data-action="sleep" data-d="-0.5" aria-label="أقل">−</button><b class="num">' + (doc.sleep != null ? doc.sleep : '—') + '</b><button data-action="sleep" data-d="0.5" aria-label="أكثر">+</button></div></div>';
    // العادات
    if (habits.length) {
      out += '<div class="habits">' + habits.map((x) => {
        const on = doc.habits && doc.habits[x.id];
        const sk = habitStreak(x.id);
        return '<button class="habit' + (on ? ' on' : '') + '" data-action="habit" data-id="' + x.id + '"><span>' + h(x.emoji || '✅') + '</span>' + h(x.name) +
          (sk > 1 ? '<small>🔥 ' + sk + '</small>' : '') + '</button>';
      }).join('') + '</div>';
    } else {
      out += '<button class="btn ghost block" style="margin-top:10px" data-action="habits-manage">' + I('plus') + 'أضف عادة يومية (ورد قرآن، قراءة…)</button>';
    }
    return out + '</div>';
  }

  // ================= ملخص الصباح =================
  function morningCard() {
    const now = new Date();
    if (now.getHours() < 4 || now.getHours() >= 12 || lsGet('hayati-morning', '') === dateKey()) return '';
    const items = A.agendaOn(now).filter((x) => x.type !== 'prayer');
    const lec = items.filter((x) => x.type === 'lecture');
    const gym = items.find((x) => x.type === 'gym');
    const dueToday = st.tasks.filter((t) => !t.done && t.due_at && A.sameDay(new Date(t.due_at), now));
    const exam = st.tasks.filter((t) => !t.done && t.kind === 'exam' && t.due_at && new Date(t.due_at) >= now).sort((a, b) => new Date(a.due_at) - new Date(b.due_at))[0];
    const allow = dailyAllowance();
    const lines = [];
    if (lec.length) lines.push(['📚', lec.length + (lec.length === 1 ? ' محاضرة' : ' محاضرات') + '، أولها ' + A.time12(A.hhmm(lec[0].start)) + ' (' + h(lec[0].name) + ')']);
    if (gym) lines.push(['💪', 'تمرين ' + h(gym.workout ? gym.workout.focus : gym.name) + ' الساعة ' + A.time12(A.hhmm(gym.start))]);
    if (dueToday.length) lines.push(['✅', dueToday.length + (dueToday.length === 1 ? ' مهمة' : ' مهام') + ' موعدها اليوم']);
    if (exam) { const d = A.daysBetween(now, new Date(exam.due_at)); lines.push(['📝', 'أقرب اختبار: ' + h(exam.title) + (d === 0 ? ' اليوم!' : ' بعد ' + A.nDays(d))]); }
    if (allow != null) lines.push(['💸', allow > 0 ? 'تقدر تصرف اليوم ' + fmt(allow) + ' د.ب' : 'تعدّيت ميزانية الشهر، خفّف الصرف']);
    if (!lines.length) lines.push(['☀️', 'يومك فاضي، استغله صح']);
    return '<div class="card morning"><div class="m-head"><b>☀️ صباح الخير، هذا يومك</b><button class="icon-x" data-action="morning-close" aria-label="إخفاء">✕</button></div>' +
      lines.map(([e, t]) => '<div class="m-line"><span>' + e + '</span><span>' + t + '</span></div>').join('') + '</div>';
  }

  // ================= الميزانية: المسموح باليوم + التنبيه =================
  function dailyAllowance() {
    const budget = Number(set().budget) || 0;
    if (!budget) return null;
    const now = new Date();
    const exp = A.sums(A.txInMonth(A.monthKey(now))).exp;
    const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1;
    return (budget - exp) / daysLeft;
  }
  function budgetBanner() {
    const budget = Number(set().budget) || 0;
    if (!budget) return '';
    const exp = A.sums(A.txInMonth(A.monthKey(new Date()))).exp;
    const pct = exp / budget;
    if (pct < 0.8) return '';
    const over = pct >= 1;
    return '<div class="card alert-card ' + (over ? 'over' : '') + '"><div class="ico" style="' + tint(over ? '#e11d48' : '#f59e0b') + '">' + I('alert') + '</div><div style="flex:1">' +
      '<b>' + (over ? 'تعدّيت ميزانية الشهر' : 'قربت من ميزانية الشهر') + '</b><div class="small muted">صرفت ' + Math.round(pct * 100) + '% (' + fmt(exp) + ' من ' + fmt(budget) + ')' +
      (over ? '' : ' · باقي لك ' + fmt(dailyAllowance()) + ' باليوم') + '</div></div></div>';
  }
  let lastAlertCheck = '';
  function checkBudgetAlert() {
    const budget = Number(set().budget) || 0;
    if (!budget) return;
    const mk = A.monthKey(new Date());
    const exp = A.sums(A.txInMonth(mk)).exp;
    const level = exp >= budget ? 100 : exp >= 0.8 * budget ? 80 : 0;
    const sig = mk + ':' + level;
    if (!level || sig === lastAlertCheck) return;
    lastAlertCheck = sig;
    const seen = lsGet('hayati-budget-alert', {});
    if (seen[mk] >= level) return;
    seen[mk] = level; lsSet('hayati-budget-alert', seen);
    A.notify(level === 100 ? '⚠️ تعدّيت ميزانية الشهر' : '⚠️ صرفت 80% من ميزانيتك', 'صرفت ' + fmt(exp) + ' من ' + fmt(budget) + ' د.ب');
  }

  // ================= التوفير من الدخل =================
  function pendingIncome() {
    if (!st.goals.some((g) => !g.done)) return [];
    const weekAgo = Date.now() - 7 * 86400000;
    return st.transactions.filter((t) => t.kind === 'income' && !t.save_handled && new Date(t.occurred_at).getTime() > weekAgo && Number(t.amount) >= 5);
  }
  function incomeCard() {
    const list = pendingIncome();
    if (!list.length) return '';
    const t = list[0];
    const pctv = Number(set().save_pct) || 20;
    return '<div class="card save-card"><div class="ico" style="' + tint('#10b981') + '">' + I('piggy') + '</div><div style="flex:1;min-width:0"><b>نزل لك ' + money(t.amount) + '</b>' +
      '<div class="small muted">' + h(t.merchant || t.category || 'دخل') + ' · وفّر منه ' + pctv + '% (' + fmt(t.amount * pctv / 100) + ')؟</div></div>' +
      '<button class="btn primary" data-action="save-income" data-id="' + t.id + '">وفّر</button><button class="icon-x" data-action="skip-income" data-id="' + t.id + '" aria-label="تجاهل">✕</button></div>';
  }
  function saveIncomeSheet(tx) {
    const goals = st.goals.filter((g) => !g.done);
    if (!goals.length || !tx) return;
    const pct0 = Number(set().save_pct) || 20;
    A.openSheet({
      title: 'وفّر من دخلك',
      saveLabel: 'وفّر',
      body: '<p class="small muted" style="margin:0 4px 10px;text-align:center">نزل لك ' + money(tx.amount) + ' — كم تبي تحط منه بهدفك؟</p>' +
        '<div class="seg" id="pctSeg">' + [10, 20, 30, 50].map((p) => '<button type="button" data-k="' + p + '" class="' + (p === pct0 ? 'on' : '') + '">' + p + '%</button>').join('') + '</div>' +
        '<div class="amount-box"><input name="amt" inputmode="decimal" value="' + (tx.amount * pct0 / 100).toFixed(3) + '"><small>دينار بحريني</small></div>' +
        '<div class="field"><label>الهدف</label><select name="goal">' + goals.map((g) => '<option value="' + g.id + '">' + h((g.emoji ? g.emoji + ' ' : '') + g.name) + ' — باقي ' + fmt(g.target - g.saved) + '</option>').join('') + '</select></div>',
      mount(root) {
        root.dataset.pct = pct0;
        A.segPick(root, '#pctSeg', (k) => { root.dataset.pct = k; root.querySelector('[name=amt]').value = (tx.amount * Number(k) / 100).toFixed(3); });
      },
      onSave(root) {
        const a = A.parseAmount(A.val(root, 'amt'));
        if (!(a > 0)) throw new Error('اكتب المبلغ');
        const g = st.goals.find((x) => x.id === A.val(root, 'goal'));
        const saved = Math.round(((Number(g.saved) || 0) + a) * 1000) / 1000;
        S.upsert('goals', Object.assign({}, g, { saved, done: saved >= Number(g.target) }));
        S.upsert('transactions', Object.assign({}, tx, { save_handled: true }));
        S.setSettings({ save_pct: Number(root.dataset.pct) });
        A.toast('حطّيت ' + fmt(a) + ' د.ب في ' + g.name + ' 💪');
      },
    });
  }

  // ================= صورة الفاتورة =================
  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const max = 900, k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        resolve(c.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  // ================= ميزانية التصنيفات =================
  function catBudget(cat, spent) {
    const b = (set().cat_budgets || {})[cat];
    if (!b) return '';
    const pct = Math.min(100, (spent / b) * 100), over = spent > b;
    return '<div class="meter"><span style="width:' + pct + '%;background:' + (over ? '#e11d48' : pct > 80 ? '#f59e0b' : '#10b981') + '"></span></div>' +
      '<div class="small ' + (over ? 'neg' : 'muted') + '" style="margin-top:4px">' + (over ? 'تعدّيت بـ ' + fmt(spent - b) : 'باقي ' + fmt(b - spent)) + ' من ' + fmt(b) + '</div>';
  }
  function catBudgetsForm() {
    const cur = set().cat_budgets || {};
    A.openSheet({
      title: 'ميزانية التصنيفات',
      body: '<p class="small muted" style="margin:0 4px 12px">حط حد شهري لكل تصنيف (اختياري). يطلع لك شريط يوضح كم باقي.</p>' +
        A.EXPENSE_CATS.map((c) => { const [ic, col] = A.catMeta(c); return '<div class="cb-row"><div class="ico" style="' + tint(col) + '">' + I(ic) + '</div><span>' + c + '</span><input inputmode="decimal" data-cat="' + h(c) + '" placeholder="—" value="' + (cur[c] ? Number(cur[c]).toFixed(3) : '') + '"></div>'; }).join(''),
      onSave(root) {
        const out = {};
        root.querySelectorAll('[data-cat]').forEach((el) => { const v = A.parseAmount(el.value); if (v > 0) out[el.dataset.cat] = Math.round(v * 1000) / 1000; });
        S.setSettings({ cat_budgets: out });
        A.toast('تم ✓');
      },
    });
  }

  // ================= صفحة المادة: معلومات، ملاحظات، غياب =================
  function courseSheet(c) {
    if (!c) return;
    const draw = () => {
      const cc = A.courseById(c.id) || c;
      const abs = Array.isArray(cc.absences) ? cc.absences.slice().sort().reverse() : [];
      const lim = Number(cc.absence_limit) || 0;
      const warn = lim && abs.length >= lim - 1;
      return '<div class="hero" style="margin-top:4px;padding:16px 18px;background:linear-gradient(135deg,' + h(cc.color || '#1A8A8F') + ',#0E3B43)"><span class="eyebrow">' + I('book') + 'محاضرة · ' +
        (cc.days || []).slice().sort().map((d) => A.DAYS_SHORT[d]).join('، ') + '</span><div class="big" style="font-size:24px;margin:8px 0 2px">' + h(cc.name) + '</div>' +
        '<div class="meta"><span>' + I('clock') + A.time12(cc.start_time) + ' — ' + A.time12(cc.end_time) + '</span>' + (cc.room ? '<span>' + I('pin') + h(cc.room) + '</span>' : '') + '</div></div>' +
        // الغياب
        '<div class="group-title">' + I('user') + 'الغياب</div><div class="card"><div style="display:flex;align-items:center;gap:12px">' +
        '<div class="abs-count' + (warn ? ' warn' : '') + '"><b class="num">' + abs.length + '</b><small>' + (lim ? 'من ' + lim : 'غياب') + '</small></div>' +
        '<div style="flex:1" class="small ' + (warn ? 'neg' : 'muted') + '">' + (lim ? (abs.length >= lim ? 'وصلت الحد المسموح! انتبه' : warn ? 'باقي لك غياب واحد بس' : 'باقي لك ' + (lim - abs.length) + ' قبل الحد') : 'حط الحد المسموح من تحت') + '</div>' +
        '<button class="btn primary" data-x="absent">' + I('plus') + 'غبت اليوم</button></div>' +
        (abs.length ? '<div class="abs-list">' + abs.map((d) => '<span class="chip">' + d + ' <button data-x="unabsent" data-d="' + d + '" aria-label="حذف">✕</button></span>').join('') + '</div>' : '') +
        '<div class="field" style="margin:12px 0 0"><label>الحد المسموح للغياب</label><input name="absence_limit" inputmode="numeric" value="' + (lim || '') + '" placeholder="مثلاً 6"></div></div>' +
        // معلومات الدكتور
        '<div class="group-title">' + I('user') + 'الدكتور والساعات المكتبية</div><div class="card">' +
        '<div class="field"><label>إيميل الدكتور</label><input name="prof_email" class="ltr" type="email" value="' + h(cc.prof_email || '') + '" placeholder="name@university.edu"></div>' +
        '<div class="field"><label>الساعات المكتبية والمكتب</label><input name="office_hours" value="' + h(cc.office_hours || '') + '" placeholder="مثلاً: الاثنين 10–12، مبنى S40"></div>' +
        '<div class="field" style="margin:0"><label>ساعات المادة (للمعدل)</label><input name="credits" inputmode="numeric" value="' + (cc.credits || 3) + '"></div></div>' +
        (window.Extras.courseExtra ? window.Extras.courseExtra(cc) : '') +
        // الملاحظات
        '<div class="group-title">' + I('pen') + 'ملاحظات</div><div class="field"><textarea name="notes" placeholder="أي شي تبي تتذكره عن المادة…">' + h(cc.notes || '') + '</textarea></div>' +
        '<button class="btn ghost block" type="button" data-x="edit">' + I('settings') + 'تعديل الوقت والأيام</button>';
    };
    A.openSheet({
      title: 'المادة',
      saveLabel: 'حفظ',
      body: draw(),
      mount(root) {
        root.onclick = async (e) => {
          const b = e.target.closest('[data-x]');
          if (!b) return;
          const cc = A.courseById(c.id) || c;
          const abs = Array.isArray(cc.absences) ? cc.absences.slice() : [];
          if (b.dataset.x === 'edit') { A.courseForm(cc); return; }
          if (window.Extras.courseClick && window.Extras.courseClick(b, cc, root)) return;
          if (b.dataset.x === 'absent') {
            const k = dateKey();
            if (abs.includes(k)) { A.toast('مسجّل غياب اليوم من قبل'); return; }
            abs.push(k);
            S.upsert('courses', Object.assign({}, cc, { absences: abs }));
          }
          if (b.dataset.x === 'unabsent') S.upsert('courses', Object.assign({}, cc, { absences: abs.filter((d) => d !== b.dataset.d) }));
          const keep = { notes: A.val(root, 'notes'), prof_email: A.val(root, 'prof_email'), office_hours: A.val(root, 'office_hours'), absence_limit: A.val(root, 'absence_limit'), credits: A.val(root, 'credits') };
          root.innerHTML = draw();
          for (const [k, v] of Object.entries(keep)) { const el = root.querySelector('[name=' + k + ']'); if (el) el.value = v; }
        };
      },
      onSave(root) {
        const cc = A.courseById(c.id) || c;
        const lim = parseInt(A.val(root, 'absence_limit'), 10), cr = parseFloat(A.val(root, 'credits'));
        S.upsert('courses', Object.assign({}, cc, {
          notes: A.val(root, 'notes') || null, prof_email: A.val(root, 'prof_email') || null, office_hours: A.val(root, 'office_hours') || null,
          absence_limit: lim > 0 ? lim : null, credits: cr > 0 ? cr : 3,
        }));
        A.toast('انحفظ ✓');
      },
    });
  }

  // ================= «كم أحتاج» =================
  function gpaNeed() {
    const lec = A.lectures();
    if (!lec.length) return '';
    const target = lsGet('hayati-gpa-target', 3.5);
    const cum = A.cumulative();
    const semCr = lec.reduce((s, c) => s + (Number(c.credits) || 3), 0);
    const doneCr = cum.credits || 0, donePts = (cum.gpa || 0) * doneCr;
    const need = (target * (doneCr + semCr) - donePts) / semCr;
    let msg, cls = '';
    if (need > 4) { msg = 'صعب توصل ' + target.toFixed(2) + ' هالفصل (تحتاج أكثر من 4.00). جرّب هدف أقرب.'; cls = 'neg'; }
    else if (need <= 0) msg = 'هدفك مضمون حتى لو بأقل الدرجات 😄';
    else {
      const letter = Object.entries(A.GRADE_POINTS).filter(([, p]) => p >= need).sort((a, b) => a[1] - b[1])[0];
      msg = 'تحتاج معدل فصلي <b class="num">' + need.toFixed(2) + '</b> بالـ' + lec.length + ' مواد (' + semCr + ' ساعة) — يعني تقريباً <b>' + (letter ? letter[0] : 'A') + '</b> بكل مادة.';
    }
    return '<div class="card need-card"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><div class="ico" style="' + tint('#8b5cf6') + '">' + I('target') + '</div><b style="flex:1">كم أحتاج؟</b>' +
      '<div class="stepper"><button data-action="gpa-target" data-d="-0.05">−</button><b class="num">' + target.toFixed(2) + '</b><button data-action="gpa-target" data-d="0.05">+</button></div></div>' +
      '<div class="small ' + cls + '">هدفك التراكمي ' + target.toFixed(2) + ': ' + msg + '</div></div>';
  }

  // ================= خطة المراجعة قبل الاختبار =================
  function studyPlan(exam) {
    const days = Math.max(1, A.daysBetween(new Date(), new Date(exam.due_at)));
    const n0 = Math.min(7, Math.max(1, days - 1 || 1));
    A.openSheet({
      title: 'خطة مراجعة',
      saveLabel: 'سوّ الخطة',
      body: '<p class="small muted" style="margin:0 4px 12px">أقسّم لك المذاكرة على الأيام قبل «' + h(exam.title) + '» وأضيفها كمهام بمواعيدها.</p>' +
        '<div class="field"><label>كم يوم مراجعة؟</label><div class="seg" id="dSeg">' + [2, 3, 5, 7].filter((d) => d <= Math.max(2, days)).map((d) => '<button type="button" data-k="' + d + '" class="' + (d === Math.min(n0, 7) || (d === 2 && n0 < 2) ? 'on' : '') + '">' + A.nDays(d) + '</button>').join('') + '</div></div>' +
        '<div class="two"><div class="field"><label>الوقت</label><input type="time" name="time" value="20:00"></div><div class="field"><label>المدة</label><select name="dur"><option value="45">45 دقيقة</option><option value="60" selected>ساعة</option><option value="90">ساعة ونص</option></select></div></div>',
      mount(root) { root.dataset.d = Math.min(n0, 7) < 2 ? 2 : [2, 3, 5, 7].filter((d) => d <= Math.max(2, days)).reduce((a, d) => (d <= n0 ? d : a), 2); A.segPick(root, '#dSeg', (k) => { root.dataset.d = k; }); },
      onSave(root) {
        const n = Number(root.dataset.d), [hh, mm] = (A.val(root, 'time') || '20:00').split(':').map(Number);
        const examDay = new Date(exam.due_at);
        let made = 0;
        for (let i = n; i >= 1; i--) {
          const d = new Date(examDay); d.setDate(d.getDate() - i); d.setHours(hh, mm, 0, 0);
          if (d < new Date()) continue;
          made++;
          S.upsert('tasks', { title: 'مراجعة ' + exam.title + ' (' + (n - i + 1) + '/' + n + ')', kind: 'study', due_at: d.toISOString(), course_id: exam.course_id || null, notes: 'مدة ' + A.val(root, 'dur') + ' دقيقة', done: false });
        }
        A.toast(made ? 'انضافت ' + made + ' جلسات مراجعة 📚' : 'ما فيه أيام كافية قبل الاختبار');
      },
    });
  }

  // ================= أوزان الجيم + مؤقت الراحة =================
  function liftId(courseId, i, k) { return S.stableId('lift:' + courseId + ':' + i + ':' + k); }
  function lastLift(name, beforeKey) {
    return st.lifts.filter((l) => l.exercise === name && l.date < beforeKey).sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null;
  }
  function exExtra(c, x, i) {
    const k = dateKey();
    const cur = st.lifts.find((l) => l.id === liftId(c.id, i, k));
    const prev = lastLift(x.name, k);
    const best = st.lifts.filter((l) => l.exercise === x.name).reduce((m, l) => Math.max(m, ...(l.sets || []).map((s) => Number(s.weight) || 0)), 0);
    return '<div class="lift-row">' + x.sets.map((r, j) => {
      const w = cur && cur.sets && cur.sets[j] ? cur.sets[j].weight : '';
      const pw = prev && prev.sets && prev.sets[j] ? prev.sets[j].weight : '';
      return '<label class="lift"><small>' + (j + 1) + '</small><input inputmode="decimal" data-lift="' + i + '" data-set="' + j + '" value="' + (w || '') + '" placeholder="' + (pw || 'كغ') + '"></label>';
    }).join('') + '</div>' +
      '<div class="lift-meta">' + (prev ? '<span>آخر مرة ' + h(prev.date.slice(5)) + '</span>' : '<span>اكتب الوزن (كغ) لكل جولة</span>') + (best ? '<span>🏆 أعلى وزن ' + best + ' كغ</span>' : '') +
      (x.rest ? '<button class="rest-btn" data-rest="' + x.rest + '" data-name="' + h(x.name) + '">' + I('timer') + 'ابدأ الراحة</button>' : '') + '</div>';
  }
  let restTimer = null;
  function wkMount(root, c) {
    root.onchange = (e) => {
      const el = e.target.closest('[data-lift]');
      if (!el) return;
      const i = Number(el.dataset.lift), x = c.workout.exercises[i], k = dateKey();
      const id = liftId(c.id, i, k);
      const cur = st.lifts.find((l) => l.id === id);
      const sets = x.sets.map((r, j) => ({ reps: r, weight: cur && cur.sets && cur.sets[j] ? cur.sets[j].weight : null }));
      const v = A.parseAmount(el.value);
      sets[Number(el.dataset.set)].weight = v > 0 ? v : null;
      S.upsert('lifts', { id, course_id: c.id, exercise: x.name, date: k, sets });
    };
  }
  function wkClick(e, c, root) {
    if (e.target.closest('input, label.lift')) return true;
    const b = e.target.closest('.rest-btn');
    if (!b) return false;
    startRest(Number(b.dataset.rest), b.dataset.name, root);
    return true;
  }
  function startRest(sec, name, root) {
    clearInterval(restTimer);
    let bar = root.querySelector('.rest-bar');
    if (!bar) { bar = document.createElement('div'); bar.className = 'rest-bar'; root.prepend(bar); }
    const end = Date.now() + sec * 1000;
    const tick = () => {
      const left = Math.max(0, end - Date.now());
      if (!document.body.contains(bar)) { clearInterval(restTimer); return; }
      bar.innerHTML = '<span>⏱ راحة · ' + h(name) + '</span><b class="num">' + A.mmss(left) + '</b><button aria-label="إيقاف">✕</button><i style="width:' + (100 - (left / (sec * 1000)) * 100) + '%"></i>';
      bar.querySelector('button').onclick = (ev) => { ev.stopPropagation(); clearInterval(restTimer); bar.remove(); };
      if (left <= 0) {
        clearInterval(restTimer);
        bar.classList.add('done'); bar.querySelector('span').textContent = '💪 خلصت الراحة — الجولة الجاية!';
        try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (err) { /* تجاهل */ }
        setTimeout(() => bar.remove(), 4000);
      }
    };
    tick();
    restTimer = setInterval(tick, 250);
  }

  // ================= صحتي: وزن الجسم، تطوّر الأوزان، الماء والنوم =================
  function lineChart(points, unit) {
    if (points.length < 2) return '<div class="empty"><p>تحتاج قراءتين على الأقل عشان يطلع الرسم</p></div>';
    const W = 320, H = 140, P = 26;
    const ys = points.map((p) => p.v), min = Math.min(...ys), max = Math.max(...ys), span = max - min || 1;
    const x = (i) => P + (i / (points.length - 1)) * (W - 2 * P), y = (v) => H - P - ((v - min) / span) * (H - 2 * P);
    const d = points.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ');
    const area = d + ' L' + x(points.length - 1).toFixed(1) + ' ' + (H - P) + ' L' + x(0).toFixed(1) + ' ' + (H - P) + ' Z';
    const last = points[points.length - 1];
    return '<svg class="chart-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="رسم بياني">' +
      '<line x1="' + P + '" y1="' + (H - P) + '" x2="' + (W - P) + '" y2="' + (H - P) + '" stroke="var(--border)"/>' +
      '<path d="' + area + '" fill="var(--brand)" opacity=".12"/><path d="' + d + '" fill="none" stroke="var(--brand)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' +
      points.map((p, i) => '<circle cx="' + x(i) + '" cy="' + y(p.v) + '" r="' + (i === points.length - 1 ? 4.5 : 2.5) + '" fill="var(--brand)"/>').join('') +
      '<text x="' + x(points.length - 1) + '" y="' + (y(last.v) - 10) + '" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text)">' + last.v + ' ' + unit + '</text>' +
      '<text x="' + P + '" y="' + (H - 8) + '" font-size="10" fill="var(--muted)">' + h(points[0].l) + '</text>' +
      '<text x="' + (W - P) + '" y="' + (H - 8) + '" text-anchor="end" font-size="10" fill="var(--muted)">' + h(last.l) + '</text></svg>';
  }
  function viewHealth() {
    let out = '';
    // وزن الجسم
    const body = st.body.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    const lastB = body[body.length - 1], firstB = body[0];
    out += A.secHead('وزن الجسم', '<button class="link" data-action="add-body">تسجيل</button>');
    out += '<div class="card">' + (body.length ? '<div class="body-top"><div><small class="muted">آخر وزن</small><b class="num">' + lastB.weight + ' كغ</b></div>' +
      (body.length > 1 ? '<div><small class="muted">من البداية</small><b class="num ' + (lastB.weight >= firstB.weight ? 'pos' : 'neg') + '">' + (lastB.weight >= firstB.weight ? '+' : '') + (lastB.weight - firstB.weight).toFixed(1) + ' كغ</b></div>' : '') +
      (lastB.waist ? '<div><small class="muted">الخصر</small><b class="num">' + lastB.waist + ' سم</b></div>' : '') + '</div>' +
      lineChart(body.slice(-12).map((b) => ({ v: Number(b.weight), l: b.date.slice(5) })), 'كغ') :
      A.empty('heart', 'سجّل وزنك', 'برنامجك هدفه زيادة الوزن والعضل — سجّل وزنك كل أسبوع وتابع تطوّرك')) + '</div>';

    // تطوّر الأوزان بالجيم
    const names = [...new Set(st.lifts.map((l) => l.exercise))];
    out += A.secHead('تطوّر الأوزان بالجيم');
    if (!names.length) out += '<div class="card">' + A.empty('dumbbell', 'ما فيه أوزان مسجلة', 'افتح تمرين اليوم واكتب الوزن تحت كل جولة') + '</div>';
    else {
      const sel = A.ui.liftEx && names.includes(A.ui.liftEx) ? A.ui.liftEx : names[0];
      const pts = st.lifts.filter((l) => l.exercise === sel).sort((a, b) => (a.date < b.date ? -1 : 1))
        .map((l) => ({ v: Math.max(0, ...(l.sets || []).map((s) => Number(s.weight) || 0)), l: l.date.slice(5) })).filter((p) => p.v > 0);
      out += '<div class="card"><div class="chips" style="flex-wrap:nowrap;overflow-x:auto;margin-bottom:10px">' + names.map((n) => '<button class="chip' + (n === sel ? ' on' : '') + '" data-action="lift-ex" data-n="' + h(n) + '" style="direction:ltr">' + h(n) + '</button>').join('') + '</div>' +
        lineChart(pts.slice(-12), 'كغ') + '</div>';
    }

    // الماء والنوم آخر 7 أيام
    const days = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
    const goalW = Number(set().water_goal) || 8, goalS = Number(set().sleep_goal) || 8;
    const row = (label, get, goal, color) => '<div class="mini-chart"><b>' + label + '</b><div class="mini-bars">' + days.map((d) => {
      const doc = st.daily.find((x) => x.date === dateKey(d)); const v = doc ? Number(get(doc)) || 0 : 0;
      return '<div><i style="height:' + Math.min(100, (v / goal) * 100) + '%;background:' + color + '"></i><small>' + A.DAYS_SHORT[d.getDay()] + '</small></div>';
    }).join('') + '</div></div>';
    out += A.secHead('الماء والنوم · آخر 7 أيام') + '<div class="card">' + row('💧 الماء', (d) => d.water, goalW, '#0ea5e9') + row('😴 النوم', (d) => d.sleep, goalS, '#8b5cf6') + '</div>';

    // العادات
    out += A.secHead('عاداتك اليومية', '<button class="link" data-action="habits-manage">تعديل</button>');
    const habits = st.habits.filter((x) => x.active !== false);
    out += '<div class="card flush">' + (habits.length ? '<ul class="list">' + habits.map((x) => '<li class="row" style="cursor:default"><div class="ico" style="' + tint('#f59e0b') + ';font-size:20px">' + h(x.emoji || '✅') + '</div><div class="main"><div class="title"><span class="t">' + h(x.name) + '</span></div><div class="sub">🔥 ' + habitStreak(x.id) + ' أيام متتالية</div></div></li>').join('') + '</ul>' :
      A.empty('sparkle', 'ما فيه عادات', 'أضف عادة مثل ورد القرآن أو القراءة')) + '</div>';
    return out;
  }
  function bodyForm() {
    const last = st.body.slice().sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    A.openSheet({
      title: 'تسجيل الوزن',
      body: '<div class="amount-box"><input name="weight" inputmode="decimal" placeholder="' + (last ? last.weight : '70.0') + '"><small>كيلوغرام</small></div>' +
        '<div class="two"><div class="field"><label>الخصر (سم، اختياري)</label><input name="waist" inputmode="decimal" value=""></div><div class="field"><label>التاريخ</label><input type="date" name="date" value="' + dateKey() + '"></div></div>',
      onSave(root) {
        const w = A.parseAmount(A.val(root, 'weight'));
        if (!(w > 20 && w < 400)) throw new Error('اكتب وزن صحيح');
        const d = A.val(root, 'date') || dateKey(), waist = A.parseAmount(A.val(root, 'waist'));
        S.upsert('body', { id: S.stableId('body:' + d), date: d, weight: Math.round(w * 10) / 10, waist: waist > 0 ? waist : null });
        A.toast('انسجل ✓');
      },
    });
  }
  function habitsForm() {
    const PRESETS = [['ورد القرآن', '📖'], ['قراءة كتاب', '📚'], ['أذكار الصباح', '🌅'], ['أذكار المساء', '🌙'], ['رياضة/مشي', '🚶'], ['بدون سكر', '🍬']];
    const draw = () => '<div class="chips" style="margin-bottom:14px">' + PRESETS.filter(([n]) => !st.habits.some((x) => x.name === n && x.active !== false)).map(([n, e]) => '<button type="button" class="chip" data-add="' + h(n) + '" data-e="' + e + '">' + e + ' ' + n + '</button>').join('') + '</div>' +
      '<div class="two"><div class="field"><label>عادة جديدة</label><input name="hname" placeholder="مثلاً: شرب فيتامين"></div><div class="field"><label>رمز</label><input name="hemoji" placeholder="✅" maxlength="4"></div></div>' +
      '<button type="button" class="btn primary block" data-addcustom>' + I('plus') + 'أضف</button>' +
      '<div class="card flush" style="margin-top:14px"><ul class="list">' + st.habits.filter((x) => x.active !== false).map((x) => '<li class="row" style="cursor:default"><span style="font-size:22px">' + h(x.emoji || '✅') + '</span><div class="main"><div class="title"><span class="t">' + h(x.name) + '</span></div></div><button class="btn danger" data-del="' + x.id + '" style="padding:6px 12px">حذف</button></li>').join('') + '</ul></div>';
    A.openSheet({
      title: 'العادات اليومية', cancelLabel: 'تم', body: draw(),
      mount(root) {
        root.onclick = (e) => {
          const add = e.target.closest('[data-add]'), del = e.target.closest('[data-del]');
          if (add) S.upsert('habits', { name: add.dataset.add, emoji: add.dataset.e, active: true });
          else if (e.target.closest('[data-addcustom]')) { const n = A.val(root, 'hname'); if (!n) return A.toast('اكتب اسم العادة'); S.upsert('habits', { name: n, emoji: A.val(root, 'hemoji') || '✅', active: true }); }
          else if (del) { const x = st.habits.find((y) => y.id === del.dataset.del); if (x) S.upsert('habits', Object.assign({}, x, { active: false })); }
          else return;
          root.innerHTML = draw();
        };
      },
    });
  }

  // ================= الإعدادات =================
  function settingsExtra() {
    const theme = lsGet('hayati-theme', 'auto'), pm = set().prayer_method || 'gulf', pOn = set().prayer_on !== false;
    const t = prayerTimes(new Date(), pm);
    return '<div class="group-title">' + I('moon') + 'المظهر</div><div class="card"><div class="seg" style="margin:0">' +
      [['auto', 'تلقائي'], ['light', 'فاتح'], ['dark', 'غامق']].map(([k, l]) => '<button type="button" data-set="theme" data-k="' + k + '" class="' + (theme === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div></div>' +
      '<div class="group-title">' + I('moon') + 'أوقات الصلاة</div><div class="card">' +
      '<label class="switch" style="margin-bottom:12px"><input type="checkbox" data-set="prayer-on"' + (pOn ? ' checked' : '') + '> أظهر الصلاة بجدول اليوم مع «الحين وقت صلاة…»</label>' +
      '<div class="seg" style="margin-bottom:10px">' + Object.entries(METHODS).map(([k, m]) => '<button type="button" data-set="prayer-method" data-k="' + k + '" class="' + (pm === k ? 'on' : '') + '">' + m.label + '</button>').join('') + '</div>' +
      '<div class="prayer-grid">' + PRAYER_NAMES.map(([k, n]) => '<div><small>' + n + '</small><b class="num">' + A.time12(A.hhmm(t[k])) + '</b></div>').join('') + '</div>' +
      '<p class="small muted" style="margin:8px 0 0">محسوبة لتوقيت المنامة. ممكن تفرق دقيقة أو دقيقتين عن تقويم الأوقاف.</p></div>' +
      '<div class="group-title">' + I('heart') + 'أهداف يومية</div><div class="card"><div class="two">' +
      '<div class="field" style="margin:0"><label>أكواب الماء</label><input type="number" min="1" max="20" data-goal="water_goal" value="' + (set().water_goal || 8) + '"></div>' +
      '<div class="field" style="margin:0"><label>ساعات النوم</label><input type="number" min="4" max="12" step="0.5" data-goal="sleep_goal" value="' + (set().sleep_goal || 8) + '"></div></div></div>';
  }
  async function settingsAction(act, root, b) {
    if (act === 'theme') { lsSet('hayati-theme', b.dataset.k); applyTheme(); root.querySelectorAll('[data-set=theme]').forEach((x) => x.classList.toggle('on', x === b)); return true; }
    if (act === 'prayer-method') { S.setSettings({ prayer_method: b.dataset.k }); A.closeSheet(); A.toast('تم تغيير طريقة الحساب ✓'); return true; }
    return false;
  }
  document.addEventListener('change', (e) => {
    const p = e.target.closest('[data-set="prayer-on"]');
    if (p) { S.setSettings({ prayer_on: p.checked }); return; }
    const g = e.target.closest('[data-goal]');
    if (g) { const v = Number(g.value); if (v > 0) S.setSettings({ [g.dataset.goal]: v }); }
  });

  // ================= الأحداث =================
  function action(name, el) {
    if (name === 'water') { const doc = todayDoc(); const n = Number(el.dataset.n); saveToday({ water: doc && doc.water === n ? n - 1 : n }); }
    else if (name === 'sleep') { const doc = todayDoc(); const cur = doc && doc.sleep != null ? doc.sleep : 7; saveToday({ sleep: Math.max(0, Math.min(14, cur + Number(el.dataset.d))) }); }
    else if (name === 'habit') { const doc = todayDoc(); const hb = Object.assign({}, doc ? doc.habits : {}); hb[el.dataset.id] = !hb[el.dataset.id]; saveToday({ habits: hb }); if (hb[el.dataset.id]) A.toast('عاش 🔥'); }
    else if (name === 'habits-manage') habitsForm();
    else if (name === 'go-health') { A.ui.studySeg = 'health'; try { localStorage.setItem('hayati-ui-studySeg', 'health'); } catch (e) { /* تجاهل */ } A.go('schedule'); }
    else if (name === 'morning-close') { lsSet('hayati-morning', dateKey()); A.render(); }
    else if (name === 'save-income') saveIncomeSheet(st.transactions.find((t) => t.id === el.dataset.id));
    else if (name === 'skip-income') { const t = st.transactions.find((x) => x.id === el.dataset.id); if (t) S.upsert('transactions', Object.assign({}, t, { save_handled: true })); }
    else if (name === 'gpa-target') { lsSet('hayati-gpa-target', Math.max(1, Math.min(4, Math.round((lsGet('hayati-gpa-target', 3.5) + Number(el.dataset.d)) * 100) / 100))); A.render(); }
    else if (name === 'add-body') bodyForm();
    else if (name === 'lift-ex') { A.ui.liftEx = el.dataset.n; A.render(); }
  }

  window.Extras = {
    agenda: (date) => prayersOn(date),
    todayTop: () => morningCard() + budgetBanner() + incomeCard(),
    todayMid: () => dailyCard(),
    allowance: () => { const a = dailyAllowance(); return a != null && a > 0 ? '<div class="meta" style="margin-top:4px"><span>💸 تقدر تصرف ' + fmt(a) + ' باليوم لين آخر الشهر</span></div>' : ''; },
    catBudget, catBudgetsForm, courseSheet, gpaNeed, viewHealth, exExtra, wkMount, wkClick, settingsExtra, settingsAction, action,
    afterTx: (tx) => { if (tx && tx.kind === 'income' && !tx.save_handled && st.goals.some((g) => !g.done)) saveIncomeSheet(tx); },
    txExtra: (tx) => '<div class="field"><label>صورة الفاتورة (اختياري)</label><div class="receipt" id="receiptBox">' +
      (tx && tx.receipt ? '<img src="' + tx.receipt + '" alt="الفاتورة"><button type="button" class="btn danger" data-rm-receipt>حذف الصورة</button>' : '') +
      '<label class="btn ghost block" style="cursor:pointer">' + I('upload') + (tx && tx.receipt ? 'تغيير الصورة' : 'أضف صورة') + '<input type="file" accept="image/*" id="receiptInput" hidden></label></div></div>',
    txMount: (root) => {
      delete root.dataset.receipt;
      const inp = root.querySelector('#receiptInput');
      if (inp) inp.onchange = async () => {
        const f = inp.files[0]; if (!f) return;
        try { root.dataset.receipt = await compressImage(f); root.querySelector('#receiptBox').insertAdjacentHTML('afterbegin', '<img src="' + root.dataset.receipt + '" alt="الفاتورة">'); A.toast('بتنحفظ مع العملية ✓'); }
        catch (e) { A.toast('ما قدرت أقرا الصورة'); }
      };
      const rm = root.querySelector('[data-rm-receipt]');
      if (rm) rm.onclick = () => { root.dataset.receipt = 'none'; rm.previousElementSibling && rm.previousElementSibling.remove(); rm.remove(); };
    },
    taskMount: (root, t) => {
      if (!t || t.kind !== 'exam' || t.done) return;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn primary block'; b.style.marginBottom = '10px';
      b.innerHTML = I('book') + 'سوّ لي خطة مراجعة';
      b.onclick = () => studyPlan(t);
      root.insertBefore(b, root.querySelector('#delTask'));
    },
    tick: () => checkBudgetAlert(),
    prayerTimes,
  };

  // حفظ صورة الفاتورة مع العملية: نلتقط زر الحفظ قبل ما يحفظ النموذج
  document.getElementById('sheetSave').addEventListener('click', () => {
    const root = document.getElementById('sheetBody');
    if (!root.dataset.receipt) return;
    const r = root.dataset.receipt;
    delete root.dataset.receipt;
    setTimeout(() => {
      // الحفظ فشل (مثلاً المبلغ ناقص) والنافذة لسا مفتوحة: نرجّع الصورة للمحاولة الجاية
      if (document.getElementById('sheet').open) { root.dataset.receipt = r; return; }
      const t = st.transactions.slice().sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))[0];
      if (t) S.upsert('transactions', Object.assign({}, t, { receipt: r === 'none' ? null : r }));
    }, 80);
  }, true);
  // إلغاء النافذة يمسح أي صورة ما انحفظت
  document.getElementById('sheet').addEventListener('close', () => {
    setTimeout(() => { const root = document.getElementById('sheetBody'); if (!document.getElementById('sheet').open) delete root.dataset.receipt; }, 120);
  });

  A.render();
})();
