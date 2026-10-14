// حياتي — الواجهة
(function () {
  'use strict';

  const S = window.Store;
  const st = S.state;
  const I = window.icon;
  const APP_VERSION = 'v21';   // نفس رقم sw.js (فيه اختبار يتأكد)

  // ---------- ثوابت ----------
  const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const DAYS_SHORT = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const CATS = {
    'أكل ومطاعم': ['utensils', '#f97316'],
    'قهوة': ['coffee', '#b45309'],
    'بقالة وتسوق': ['cart', '#16a34a'],
    'مواصلات وبنزين': ['fuel', '#0ea5e9'],
    'فواتير واتصالات': ['receipt', '#8b5cf6'],
    'جامعة ودراسة': ['graduation', '#1A8A8F'],
    'صحة': ['heart', '#e11d48'],
    'ترفيه': ['gamepad', '#db2777'],
    'تحويلات': ['repeat', '#0d9488'],
    'سحب نقدي': ['banknote', '#65a30d'],
    'أخرى': ['dots', '#64748b'],
    'راتب': ['briefcase', '#059669'],
    'مكافأة': ['gift', '#7c3aed'],
    'تحويل وارد': ['incoming', '#0891b2'],
    'استرجاع': ['undo', '#2563eb'],
    'دخل آخر': ['coins', '#ca8a04'],
  };
  const EXPENSE_CATS = ['أكل ومطاعم', 'قهوة', 'بقالة وتسوق', 'مواصلات وبنزين', 'فواتير واتصالات', 'جامعة ودراسة', 'صحة', 'ترفيه', 'تحويلات', 'سحب نقدي', 'أخرى'];
  const INCOME_CATS = ['راتب', 'مكافأة', 'تحويل وارد', 'استرجاع', 'دخل آخر'];
  const TASK_KINDS = {
    homework: { label: 'واجب', icon: 'book', color: '#2563eb' },
    exam: { label: 'اختبار', icon: 'pen', color: '#e11d48' },
    personal: { label: 'شخصي', icon: 'user', color: '#0d9488' },
    appointment: { label: 'موعد', icon: 'clock', color: '#f59e0b' },
    study: { label: 'مراجعة', icon: 'book', color: '#8b5cf6' },
    other: { label: 'أخرى', icon: 'pin', color: '#64748b' },
  };
  // أنواع الأنشطة بالجدول الأسبوعي
  const ACT_TYPES = {
    lecture: { label: 'محاضرة', icon: 'book', now: 'الحين وقت محاضرة', next: 'المحاضرة الجاية' },
    gym: { label: 'تمرين', icon: 'dumbbell', now: 'الحين وقت التمرين 💪', next: 'التمرين بعد' },
    activity: { label: 'نشاط', icon: 'sparkle', now: 'الحين وقت', next: 'الجاي' },
    appointment: { label: 'موعد', icon: 'clock', now: 'الحين موعدك', next: 'موعدك الجاي' },
    prayer: { label: 'صلاة', icon: 'moon', now: 'الحين وقت', next: 'الصلاة الجاية' },
  };
  const COLORS = ['#1A8A8F', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#64748b'];
  const TABS = [
    ['today', 'اليوم', 'sun'],
    ['money', 'المصاريف', 'wallet'],
    ['schedule', 'الدراسة', 'graduation'],
    ['tasks', 'المهام', 'tasks'],
  ];

  const GRADE_POINTS = { 'A': 4, 'A-': 3.67, 'B+': 3.33, 'B': 3, 'B-': 2.67, 'C+': 2.33, 'C': 2, 'C-': 1.67, 'D+': 1.33, 'D': 1, 'F': 0 };
  const MONEY_SEGS = [['tx', 'العمليات'], ['subs', 'اشتراكات'], ['goals', 'أهداف'], ['debts', 'لي وعلي']];
  const STUDY_SEGS = [['schedule', 'الجدول'], ['focus', 'المذاكرة'], ['gpa', 'المعدل'], ['health', 'صحتي']];
  const SUB_PRESETS = [
    ['نتفليكس', 'ترفيه'], ['شاهد', 'ترفيه'], ['سبوتيفاي', 'ترفيه'], ['iCloud', 'فواتير واتصالات'],
    ['باقة الجوال', 'فواتير واتصالات'], ['الإنترنت', 'فواتير واتصالات'], ['النادي الرياضي', 'صحة'], ['ChatGPT', 'جامعة ودراسة'],
  ];

  const ui = {
    moneySeg: readPref('moneySeg', 'tx'),
    studySeg: readPref('studySeg', 'schedule'),
    focusCourse: readPref('focusCourse', ''),
    showSettled: false,
    tab: readPref('tab', 'today'),
    month: monthKey(new Date()),
    day: new Date().getDay(),
    taskFilter: 'all',
    showDone: false,
  };
  if (!TABS.some((t) => t[0] === ui.tab)) ui.tab = 'today';
  if (!MONEY_SEGS.some((t) => t[0] === ui.moneySeg)) ui.moneySeg = 'tx';
  if (!STUDY_SEGS.some((t) => t[0] === ui.studySeg)) ui.studySeg = 'schedule';

  // نقاط ربط الإضافات (extras.js)
  const X = (name, ...a) => (window.Extras && typeof window.Extras[name] === 'function' ? window.Extras[name](...a) : '');

  // ---------- أدوات ----------
  function readPref(k, d) { try { return localStorage.getItem('hayati-ui-' + k) || d; } catch (e) { return d; } }
  function writePref(k, v) { try { localStorage.setItem('hayati-ui-' + k, v); } catch (e) { /* تجاهل */ } }
  // 🍎 / G : أيقونات أزرار الدخول (Apple بلون النص، وGoogle بألوانه الرسمية)
  const SSO_ICON = {
    apple: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M16.37 12.62c-.03-2.68 2.19-3.97 2.29-4.03-1.25-1.82-3.19-2.07-3.88-2.1-1.65-.17-3.22.97-4.06.97-.84 0-2.13-.95-3.5-.92-1.8.03-3.46 1.05-4.39 2.66-1.87 3.24-.48 8.04 1.34 10.67.89 1.29 1.95 2.73 3.34 2.68 1.34-.05 1.85-.87 3.47-.87 1.62 0 2.08.87 3.5.84 1.44-.02 2.36-1.31 3.24-2.6 1.02-1.49 1.44-2.94 1.47-3.01-.03-.01-2.82-1.08-2.85-4.29zM13.7 4.74c.74-.9 1.24-2.14 1.1-3.38-1.07.04-2.36.71-3.12 1.6-.69.79-1.29 2.06-1.13 3.27 1.19.09 2.41-.61 3.15-1.49z"/></svg>',
    google: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.27c0-.82-.07-1.6-.21-2.36H12v4.47h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.73z"/><path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.87-3A7.2 7.2 0 0 1 12 19.3a7.16 7.16 0 0 1-6.73-4.95h-4v3.09A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.27 14.35a7.2 7.2 0 0 1 0-4.6V6.66h-4a12 12 0 0 0 0 10.78l4-3.09z"/><path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.43-3.43A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.27 6.66l4 3.09A7.16 7.16 0 0 1 12 4.77z"/></svg>',
  };
  // أول دخول وعلى الجهاز بيانات «بدون حساب»: نسأل مرة كل فتحة، و«بعدين» تخليها للمرة الجاية
  let mergeAsked = false, recoveryAsked = false;
  function mergeSheet(n) {
    openSheet({
      title: 'بيانات هالجهاز', cancelLabel: 'بعدين',
      body: '<p style="margin:4px 4px 14px;line-height:1.8">عندك <b class="num">' + n + '</b> سجل على هالجهاز من قبل ما تسجّل دخول.<br>نضيفها لحسابك؟</p>' +
        '<button class="btn primary block" id="mgKeep">' + I('check') + 'ضيفها لحسابي</button>' +
        '<button class="btn block" id="mgDrop" style="margin-top:10px">لا، ابدأ من حسابي</button>' +
        '<p class="small muted" style="margin:10px 4px 0">«لا» تمسحها من هالجهاز. نزّل نسخة احتياطية أول لو تبيها.</p>',
      mount(root) {
        root.querySelector('#mgKeep').onclick = () => { S.resolveMerge(true); closeSheet(); toast('انضافت لحسابك ✓'); };
        root.querySelector('#mgDrop').onclick = async () => {
          if (!(await ask('بيانات هالجهاز بتنمسح. أكيد؟'))) return;
          S.resolveMerge(false); closeSheet(); toast('بدأنا من حسابك');
        };
      },
    });
  }
  function recoverySheet() {
    openSheet({
      title: 'كلمة مرور جديدة', saveLabel: 'حفظ',
      body: '<div class="field"><label>كلمة المرور الجديدة</label><input name="newpw" type="password" class="ltr" autocomplete="new-password"></div>',
      async onSave(root) {
        const pw = root.querySelector('[name=newpw]').value;
        if (pw.length < 6) throw new Error('كلمة المرور لازم ٦ أحرف أو أكثر');
        await S.updatePassword(pw);
        toast('تغيّرت كلمة المرور ✓');
      },
    });
  }
  S.subscribe((_st, s) => {
    if (s.needsMerge && !mergeAsked) { mergeAsked = true; setTimeout(() => mergeSheet(s.needsMerge), 300); }
    if (s.recovery && !recoveryAsked) { recoveryAsked = true; setTimeout(recoverySheet, 300); }
  });

  // 💾 آخر نسخة احتياطية: بياناتك على هالجهاز بس، فنذكّرك (privacy.js يعرض البطاقة)
  const LAST_BACKUP = 'hayati-last-backup';
  function lastBackup() { try { const v = localStorage.getItem(LAST_BACKUP); return v ? new Date(v) : null; } catch (e) { return null; } }
  function markBackup() { try { localStorage.setItem(LAST_BACKUP, new Date().toISOString()); } catch (e) { /* تجاهل */ } }
  async function backupNow() {
    const ok = await saveFile('hayati-backup-' + new Date().toISOString().slice(0, 10) + '.json', S.exportJSON(), 'application/json');
    if (ok) { markBackup(); render(); }
    return ok;
  }

  function h(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function fmt(n) {
    const v = Number(n) || 0;
    const [a, b] = Math.abs(v).toFixed(3).split('.');
    return (v < 0 ? '−' : '') + a.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + b;
  }
  function money(n) { return '<span class="num">' + fmt(n) + '</span><span class="cur">د.ب</span>'; }
  function short(n) {
    const v = Number(n) || 0;
    if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    if (v >= 100) return Math.round(v).toString();
    return v.toFixed(v < 10 ? 1 : 0).replace(/\.0$/, '');
  }
  function catMeta(c, kind) { return CATS[c] || (kind === 'income' ? CATS['دخل آخر'] : CATS['أخرى']); }
  function tint(color) { return 'background:color-mix(in srgb,' + color + ' 14%,transparent);color:' + color; }
  function catIcon(c, kind) { const [ic, col] = catMeta(c, kind); return '<div class="ico" style="' + tint(col) + '">' + I(ic) + '</div>'; }

  function pad(n) { return String(n).padStart(2, '0'); }
  // «شهر الراتب» (DW-012): لو المستخدم حدد يوم الراتب (2–28)، الشهر يبدأ منه لين اليوم اللي قبله بالشهر الجاي،
  // ومفتاحه شهر البداية (25 أكتوبر – 24 نوفمبر = 2026-10). بدونه = الشهر الميلادي
  function payday() { const p = Math.round(Number(st.settings && st.settings.payday) || 1); return p >= 2 && p <= 28 ? p : 1; }
  function monthKey(d) {
    const x = d.getDate() < payday() ? new Date(d.getFullYear(), d.getMonth() - 1, 1) : d;
    return x.getFullYear() + '-' + pad(x.getMonth() + 1);
  }
  function shiftKey(key, n) { const [y, m] = key.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  // من بداية الدورة لين بداية اللي بعدها (end ما ينحسب)
  function monthRange(key) { const [y, m] = key.split('-').map(Number), p = payday(); return { start: new Date(y, m - 1, p), end: new Date(y, m, p) }; }
  function monthLabel(key) {
    const [y, m] = key.split('-').map(Number), p = payday();
    return p === 1 ? MONTHS[m - 1] + ' ' + y : p + ' ' + MONTHS[m - 1] + ' – ' + (p - 1) + ' ' + MONTHS[m % 12];
  }
  function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function daysBetween(a, b) { return Math.round((startOfDay(b) - startOfDay(a)) / 86400000); }

  function time12(hhmm) {
    if (!hhmm) return '';
    let [hr, mn] = hhmm.split(':').map(Number);
    const suf = hr < 12 ? 'ص' : 'م';
    hr = hr % 12 || 12;
    return hr + ':' + pad(mn) + ' ' + suf;
  }
  function timeOf(d) { return time12(pad(d.getHours()) + ':' + pad(d.getMinutes())); }
  function minutesOf(hhmm) { const [a, b] = String(hhmm || '0:0').split(':').map(Number); return a * 60 + (b || 0); }
  function nowMinutes() { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); }
  function toLocalInput(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function dayLabel(d) {
    const diff = daysBetween(new Date(), d);
    if (diff === 0) return 'اليوم';
    if (diff === -1) return 'أمس';
    if (diff === 1) return 'بكرة';
    return DAYS[d.getDay()] + '، ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
  }
  function nDays(n) { return n === 1 ? 'يوم' : n === 2 ? 'يومين' : n + ' أيام'; }
  function relDue(d) {
    const diff = daysBetween(new Date(), d);
    if (diff < 0) return 'متأخر ' + nDays(-diff);
    if (diff === 0) return 'اليوم، ' + timeOf(d);
    if (diff === 1) return 'بكرة، ' + timeOf(d);
    if (diff < 7) return DAYS[d.getDay()] + '، ' + timeOf(d);
    return d.getDate() + ' ' + MONTHS[d.getMonth()];
  }
  function inMinutes(m) {
    if (m < 60) return m + ' دقيقة';
    const hr = Math.floor(m / 60), r = m % 60;
    return (hr === 1 ? 'ساعة' : hr === 2 ? 'ساعتين' : hr + ' ساعات') + (r ? ' و' + r + ' دقيقة' : '');
  }

  const toastEl = document.getElementById('toast');
  let toastTimer;
  function toast(msg) {
    // الورقة (dialog) تطلع فوق الصفحة كلها، فالرسالة تنحط داخلها عشان تبين (مثلاً «اكتب الاسم»)
    const host = document.querySelector('dialog[open]') || document.body;
    if (toastEl.parentNode !== host) {
      host.appendChild(toastEl);
      // لما تتسكر الورقة، الرسالة ترجع للصفحة وتكمّل («انضاف للجدول ✓»)
      if (host !== document.body) host.addEventListener('close', () => { if (toastEl.parentNode === host) document.body.appendChild(toastEl); }, { once: true });
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
  }

  // تركيز تلقائي على أول حقل، إلا بنسخة الآيفون (الكيبورد يدف الورقة وزر «حفظ» يختفي تحت الساعة)
  function autoFocus(el) { if (el && !window.HayatiNative) el.focus(); }

  // نافذة تأكيد داخل الصفحة (confirm() ما يشتغل داخل claude.ai)
  function ask(message, okLabel) {
    return new Promise((resolve) => {
      const dlg = document.getElementById('askDlg');
      dlg.querySelector('p').textContent = message;
      const ok = dlg.querySelector('[data-ok]');
      ok.textContent = okLabel || 'حذف';
      const finish = (v) => { dlg.close(); resolve(v); };
      ok.onclick = () => finish(true);
      dlg.querySelector('[data-cancel]').onclick = () => finish(false);
      dlg.oncancel = (e) => { e.preventDefault(); finish(false); };
      dlg.showModal();
    });
  }

  // حفظ ملف: داخل claude.ai عن طريق صلاحية التنزيل، وبرّا عن طريق رابط عادي
  async function saveFile(filename, text, mime) {
    if (window.HayatiNative) return window.HayatiNative.saveFile(filename, text, mime);
    if (window.claude && typeof window.claude.use === 'function') {
      const dl = await window.claude.use('downloads');
      if (dl) {
        try { await dl.save({ filename, data: text }); return true; }
        catch (e) { if (e && e.code !== 'declined') toast('ما قدرت أحفظ الملف هنا'); return false; }
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: mime }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  }
  const inClaude = () => !!(window.claude && typeof window.claude.use === 'function');

  function courseById(id) { return st.courses.find((c) => c.id === id); }
  function lecturesOn(day) {
    return st.courses.filter((c) => (c.days || []).includes(day)).sort((a, b) => minutesOf(a.start_time) - minutesOf(b.start_time));
  }
  function lectureEnd(c) { return c.end_time ? minutesOf(c.end_time) : minutesOf(c.start_time) + 50; }
  function isLecture(c) { return !c.type || c.type === 'lecture'; }
  function lectures() { return st.courses.filter(isLecture); }

  // كل اللي عندك بيوم معيّن: محاضرات + تمرين + أنشطة + مواعيد
  function agendaOn(date) {
    const items = lecturesOn(date.getDay()).map((c) => ({
      src: 'course', id: c.id, type: c.type || 'lecture', name: c.name, room: c.room, color: c.color || COLORS[0], workout: c.workout || null,
      start: minutesOf(c.start_time), end: lectureEnd(c),
    }));
    for (const t of st.tasks) {
      if (t.kind !== 'appointment' || t.done || !t.due_at) continue;
      const d = new Date(t.due_at);
      if (!sameDay(d, date)) continue;
      const s = d.getHours() * 60 + d.getMinutes();
      items.push({ src: 'task', id: t.id, type: 'appointment', name: t.title, room: t.place || '', color: TASK_KINDS.appointment.color, start: s, end: s + (Number(t.duration) || 60) });
    }
    const extra = X('agenda', date);
    if (Array.isArray(extra)) items.push(...extra);
    return items.sort((a, b) => a.start - b.start);
  }
  function hhmm(m) { return pad(Math.floor(m / 60) % 24) + ':' + pad(m % 60); }
  function txInMonth(key) {
    return st.transactions.filter((t) => monthKey(new Date(t.occurred_at)) === key).sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));
  }
  function sums(list) {
    let exp = 0, inc = 0;
    for (const t of list) { if (t.kind === 'income') inc += Number(t.amount) || 0; else exp += Number(t.amount) || 0; }
    return { exp, inc };
  }

  function empty(icon, title, text) {
    return '<div class="empty"><div class="ico">' + I(icon) + '</div><b>' + title + '</b><p>' + (text || '') + '</p></div>';
  }
  function secHead(title, extra) { return '<div class="sec-head"><h2>' + title + '</h2>' + (extra || '') + '</div>'; }

  // ---------- مكونات ----------
  function txRow(t) {
    const d = new Date(t.occurred_at);
    return '<li class="row" data-action="edit-tx" data-id="' + t.id + '">' + catIcon(t.category, t.kind) +
      '<div class="main"><div class="title"><span class="t">' + h(t.merchant || t.category || (t.kind === 'income' ? 'دخل' : 'مصروف')) + '</span>' +
      (t.needs_review ? '<span class="tag warn">' + I('alert') + 'راجعها</span>' : '') + '</div>' +
      '<div class="sub">' + h(t.category || '') + ' · ' + timeOf(d) + (t.source === 'sms' ? ' · من رسالة' : '') + (t.note ? ' · ' + h(t.note) : '') + '</div></div>' +
      '<div class="amount ' + t.kind + '">' + (t.kind === 'income' ? '+' : '') + money(t.amount) + '</div></li>';
  }

  function slot(c, state, progress) {
    const ty = ACT_TYPES[c.type] || ACT_TYPES.lecture;
    const wk = c.workout && Array.isArray(c.workout.exercises) ? c.workout : null;
    return '<div class="slot ' + (state || '') + '" style="--c:' + h(c.color) + '" data-action="' + (c.src === 'task' ? 'edit-task' : c.src === 'prayer' ? 'noop' : wk ? 'open-workout' : c.type === 'lecture' ? 'open-course' : 'edit-course') + '" data-id="' + c.id + '">' +
      '<div class="when"><b>' + time12(hhmm(c.start)) + '</b><small>حتى ' + time12(hhmm(c.end)) + '</small></div>' +
      '<div class="box"><div class="name"><span class="type-ico">' + I(ty.icon) + '</span><bdi>' + h(c.name) + '</bdi>' + (state === 'now' ? '<span class="tag brand"><span class="pulse"></span>الحين</span>' : '') + '</div>' +
      '<div class="where">' + (wk ? h(wk.focus || ty.label) + ' · ' + workoutProgress(c.id, wk) : ty.label + (c.room ? ' · ' + I('pin') + h(c.room) : '')) + '</div>' +
      (state === 'now' ? '<div class="prog"><span style="width:' + progress + '%"></span></div>' : '') + '</div></div>';
  }

  function taskRow(t) {
    const due = t.due_at ? new Date(t.due_at) : null;
    const late = due && !t.done && due < new Date();
    const course = t.course_id && courseById(t.course_id);
    const k = TASK_KINDS[t.kind] || TASK_KINDS.other;
    let badge = '';
    if (t.kind === 'exam' && due && !t.done) {
      const d = daysBetween(new Date(), due);
      if (d === 0) badge = '<span class="tag danger">' + I('flame') + 'اليوم</span>';
      else if (d > 0) badge = '<span class="tag danger">باقي ' + nDays(d) + '</span>';
    }
    return '<li class="row' + (t.done ? ' done' : '') + '" data-action="edit-task" data-id="' + t.id + '">' +
      '<button class="check' + (t.done ? ' on' : '') + '" data-action="toggle-task" data-id="' + t.id + '" aria-label="إنجاز">' + I('check') + '</button>' +
      '<div class="main"><div class="title"><span class="t">' + h(t.title) + '</span>' + badge + '</div>' +
      '<div class="sub' + (late ? ' late' : '') + '">' + (due ? relDue(due) : 'بدون موعد') + (course ? ' · ' + h(course.name) : '') + '</div></div>' +
      '<div class="ico" style="width:32px;height:32px;border-radius:10px;' + tint(k.color) + '">' + I(k.icon) + '</div></li>';
  }

  function ring(pct, over) {
    const r = 28, c = 2 * Math.PI * r;
    const p = Math.max(0, Math.min(100, pct));
    return '<div class="ring"><svg viewBox="0 0 68 68"><circle cx="34" cy="34" r="' + r + '" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="7"/>' +
      '<circle cx="34" cy="34" r="' + r + '" fill="none" stroke="' + (over ? '#fecdd3' : '#fff') + '" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + (c * p / 100) + ' ' + c + '"/></svg>' +
      '<b class="num">' + Math.round(pct) + '%</b></div>';
  }

  // ---------- الشاشات ----------
  function viewToday() {
    const now = new Date();
    const nm = nowMinutes();
    const today = agendaOn(now);
    const current = today.find((c) => c.type === 'prayer' && c.start <= nm && nm < c.end) || today.find((c) => c.start <= nm && nm < c.end);
    const next = today.find((c) => c.start > nm);
    let out = '';

    // البطاقة الرئيسية: وش وقته الحين؟
    if (current) {
      const ty = ACT_TYPES[current.type] || ACT_TYPES.lecture;
      const pct = ((nm - current.start) / (current.end - current.start)) * 100;
      out += '<div class="hero"><span class="eyebrow"><span class="pulse"></span>' + ty.now + '</span>' +
        '<div class="big"><span class="hero-ico">' + I(ty.icon) + '</span>' + '<bdi>' + h(current.name) + '</bdi>' + '</div><div class="meta">' +
        (current.room ? '<span>' + I('pin') + h(current.room) + '</span>' : '') +
        '<span>' + I('clock') + 'يخلص بعد ' + inMinutes(current.end - nm) + '</span></div>' +
        '<div class="track"><span style="width:' + pct + '%"></span></div>' +
        (current.workout ? '<div class="meta" style="margin-top:10px"><span>' + I('dumbbell') + h(current.workout.focus || '') + '</span></div>' +
          '<button class="hero-btn" style="margin-top:12px;padding:8px 14px;font-size:14px" data-action="open-workout" data-id="' + current.id + '">' + I('tasks') + 'شوف التمارين · ' + workoutProgress(current.id, current.workout) + '</button>' : '') +
        (next ? '<div class="meta" style="margin-top:12px">بعده: ' + '<bdi>' + h(next.name) + '</bdi>' + ' · ' + time12(hhmm(next.start)) + '</div>' : '') + '</div>';
    } else if (next) {
      const ty = ACT_TYPES[next.type] || ACT_TYPES.lecture;
      out += '<div class="hero"><span class="eyebrow">' + I('clock') + ty.next + ' بعد ' + inMinutes(next.start - nm) + '</span>' +
        '<div class="big"><span class="hero-ico">' + I(ty.icon) + '</span>' + '<bdi>' + h(next.name) + '</bdi>' + '</div><div class="meta"><span>' + I('calendar') + time12(hhmm(next.start)) + ' — ' + time12(hhmm(next.end)) + '</span>' +
        (next.room ? '<span>' + I('pin') + h(next.room) + '</span>' : '') + '</div></div>';
    } else {
      const open = st.tasks.filter((t) => !t.done && t.due_at && sameDay(new Date(t.due_at), now)).length;
      out += '<div class="hero"><span class="eyebrow">' + I('sparkle') + (today.length ? 'خلص جدول اليوم' : 'جدولك اليوم فاضي') + '</span>' +
        '<div class="big">' + (open ? 'باقي عليك ' + open + (open === 1 ? ' مهمة' : ' مهام') + ' اليوم' : 'يومك رايق 👌') + '</div>' +
        '<div class="meta"><span>' + (open ? 'خلّصها وارتاح' : 'استغل الوقت بمذاكرة خفيفة أو راحة') + '</span></div></div>';
    }

    out += seedCard();
    out += X('todayTop');

    // تجديدات قريبة
    const renewals = st.subscriptions.filter((x) => x.active !== false).map((x) => ({ x, d: nextRenewal(x) }))
      .filter((r) => r.d && daysBetween(now, r.d) <= Math.max(1, Number(r.x.remind_days) || 0)).sort((a, b) => a.d - b.d);
    if (renewals.length) {
      out += '<div class="card notice">' + renewals.map((r) => '<div class="row" data-action="edit-sub" data-id="' + r.x.id + '">' +
        '<div class="ico" style="' + tint('#f59e0b') + '">' + I('repeat') + '</div><div class="main"><div class="title"><span class="t">' + h(r.x.name) + '</span></div>' +
        '<div class="sub">يتجدد ' + renewWhen(r.d) + '</div></div><div class="amount">' + money(r.x.amount) + '</div></div>').join('') + '</div>';
    }

    // بلاطات سريعة
    const month = sums(txInMonth(monthKey(now)));
    const todaySpend = sums(st.transactions.filter((t) => sameDay(new Date(t.occurred_at), now))).exp;
    const budget = Number(st.settings.budget) || 0;
    const dueToday = st.tasks.filter((t) => !t.done && t.due_at && daysBetween(now, new Date(t.due_at)) <= 0).length;
    out += '<div class="tiles">' +
      '<button class="tile" data-action="go" data-tab="money"><div class="ti" style="' + tint('#e11d48') + '">' + I('down') + '</div><div class="lbl">صرفت اليوم</div><div class="val">' + money(todaySpend) + '</div></button>' +
      '<button class="tile" data-action="' + (budget ? 'go' : 'budget') + '" data-tab="money"><div class="ti" style="' + tint('#1A8A8F') + '">' + I('target') + '</div><div class="lbl">' + (budget ? 'باقي بالميزانية' : 'الميزانية') + '</div><div class="val">' + (budget ? money(budget - month.exp) : '<span style="font-size:13px;color:var(--brand)">حدّدها</span>') + '</div></button>' +
      '<button class="tile" data-action="go" data-tab="tasks"><div class="ti" style="' + tint('#0d9488') + '">' + I('tasks') + '</div><div class="lbl">مهام اليوم</div><div class="val num">' + dueToday + '</div></button></div>';

    // جدول اليوم (كل قسم بـ data-tk عشان «رتّب اليوم» يقدر يخفيه)
    out += '<section data-tk="schedule">' + secHead('جدول اليوم', '<span class="count">' + today.length + '</span><button class="link" data-action="go" data-tab="schedule">الجدول</button>');
    if (today.length) {
      out += '<div class="timeline">' + today.map((c) => slot(c, nm >= c.end ? 'past' : nm >= c.start ? 'now' : '', ((nm - c.start) / (c.end - c.start)) * 100)).join('') + '</div>';
    } else {
      out += '<div class="card">' + (st.courses.length ? empty('sparkle', 'ما فيه شي بجدولك اليوم', 'استمتع بيومك') :
        empty('calendar', 'رتّب أسبوعك', '<button class="link" data-action="add-course">أضف محاضرة أو تمرين</button> عشان يقولك «الحين وقت…»')) + '</div>';
    }
    out += '</section>';

    out += X('todayMid');

    // المهام
    const soon = st.tasks.filter((t) => !t.done && t.due_at && daysBetween(now, new Date(t.due_at)) <= 3)
      .sort((a, b) => new Date(a.due_at) - new Date(b.due_at));
    out += '<section data-tk="tasks">' + secHead('مهام قريبة', '<span class="count">' + soon.length + '</span><button class="link" data-action="go" data-tab="tasks">الكل</button>');
    out += '<div class="card flush">' + (soon.length ? '<ul class="list">' + soon.map(taskRow).join('') + '</ul>' : empty('check', 'ما فيه شي مستعجل', 'لا مهام خلال ٣ أيام')) + '</div></section>';

    // آخر العمليات
    const recent = st.transactions.slice().sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at)).slice(0, 4);
    const review = st.transactions.filter((t) => t.needs_review).length;
    out += '<section data-tk="recent">' + secHead('آخر العمليات', (review ? '<span class="tag warn">' + review + ' تحتاج مراجعة</span>' : '') + '<button class="link" data-action="go" data-tab="money">الكل</button>');
    out += '<div class="card flush">' + (recent.length ? '<ul class="list">' + recent.map(txRow).join('') + '</ul>' : empty('wallet', 'ما فيه عمليات', 'سجّل أول مصروف من زر +')) + '</div></section>';
    return out;
  }

  function viewMoneyTx() {
    const [y, m] = ui.month.split('-').map(Number);
    const list = txInMonth(ui.month);
    const { exp, inc } = sums(list);
    const budget = Number(st.settings.budget) || 0;
    const isThisMonth = ui.month === monthKey(new Date());

    let out = '<div class="month-nav"><button class="icon-btn" data-action="month" data-d="-1" aria-label="الشهر السابق">' + I('chevR') + '</button>' +
      '<b>' + monthLabel(ui.month) + '</b>' +
      '<button class="icon-btn" data-action="month" data-d="1" aria-label="الشهر الجاي"' + (isThisMonth ? ' disabled' : '') + '>' + I('chevL') + '</button></div>';

    // البطاقة الرئيسية
    out += '<div class="hero dark"><div style="display:flex;align-items:center;gap:14px"><div style="flex:1;min-width:0">' +
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="eyebrow">' + I('wallet') + 'مصروف ' + MONTHS[m - 1] + '</span>' +
      (list.length ? '<button class="hero-btn" data-action="report">' + I('chart') + 'تقرير الشهر</button>' : '') + '</div>' +
      '<div class="amount-big">' + money(exp) + '</div>' +
      (budget ? '<div class="meta"><span>' + (exp > budget ? 'تعدّيت الميزانية بـ ' + fmt(exp - budget) : 'باقي ' + fmt(budget - exp) + ' من ' + fmt(budget)) + '</span></div>' + (isThisMonth ? X('allowance', exp, budget) : '') :
        '<div class="meta"><button data-action="budget" style="all:unset;cursor:pointer;text-decoration:underline">حدّد ميزانية شهرية</button></div>') +
      '</div>' + (budget ? ring((exp / budget) * 100, exp > budget) : '') + '</div>' +
      '<div class="split"><div><small>الدخل</small><b>' + money(inc) + '</b></div><div><small>الصافي</small><b>' + money(inc - exp) + '</b></div></div></div>';

    out += '<div class="actions"><button class="action" data-action="paste-sms"><div class="ico" style="' + tint('#0d9488') + '">' + I('message') + '</div>لصق رسالة بنك</button>' +
      '<button class="action" data-action="add-tx"><div class="ico" style="' + tint('#1A8A8F') + '">' + I('plus') + '</div>عملية جديدة</button></div>' + X('moneyActions');

    // آخر ٧ أيام
    if (isThisMonth || list.length) {
      const end = isThisMonth ? new Date() : new Date(y, m, 0);
      const days = [];
      for (let i = 6; i >= 0; i--) { const d = new Date(end); d.setDate(end.getDate() - i); days.push(d); }
      const vals = days.map((d) => sums(st.transactions.filter((t) => sameDay(new Date(t.occurred_at), d))).exp);
      const max = Math.max(...vals, 1);
      const total = vals.reduce((a, b) => a + b, 0);
      out += secHead('آخر ٧ أيام', '<span class="small muted">المجموع ' + money(total) + '</span>');
      out += '<div class="card"><div class="chart">' + days.map((d, i) =>
        '<div class="col' + (sameDay(d, new Date()) ? ' today' : '') + '"><span class="v num">' + (vals[i] ? short(vals[i]) : '') + '</span>' +
        '<div class="bar" style="height:' + Math.max(4, (vals[i] / max) * 92) + 'px"></div><span class="lbl">' + DAYS_SHORT[d.getDay()] + '</span></div>').join('') + '</div></div>';
    }

    // حسب التصنيف
    const byCat = {};
    for (const t of list) if (t.kind === 'expense') byCat[t.category || 'أخرى'] = (byCat[t.category || 'أخرى'] || 0) + Number(t.amount);
    const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    if (cats.length) {
      out += secHead('وين راحت فلوسك', '<button class="link" data-action="cat-budgets">ميزانية التصنيفات</button>');
      out += '<div class="card">' + cats.map(([c, v]) => {
        const [ic, col] = catMeta(c);
        return '<div class="cat"><div class="ico" style="' + tint(col) + '">' + I(ic) + '</div><div class="body">' +
          '<div class="line"><span>' + h(c) + '</span><b>' + money(v) + ' <span class="small muted num">' + Math.round((v / exp) * 100) + '%</span></b></div>' +
          (X('catBudget', c, v) || '<div class="meter"><span style="width:' + (v / cats[0][1]) * 100 + '%;background:' + col + '"></span></div>') + '</div></div>';
      }).join('') + '</div>';
    }

    // العمليات حسب اليوم
    out += secHead('العمليات', '<span class="count">' + list.length + '</span>');
    if (!list.length) {
      out += '<div class="card">' + empty('inbox', 'ما فيه عمليات بهالشهر', 'اضغط + عشان تضيف، أو اربط رسايل البنك من الإعدادات') + '</div>';
    } else {
      const groups = new Map();
      for (const t of list) {
        const d = startOfDay(new Date(t.occurred_at)).getTime();
        if (!groups.has(d)) groups.set(d, []);
        groups.get(d).push(t);
      }
      for (const [d, items] of groups) {
        const s = sums(items);
        out += '<div class="day-head"><span>' + dayLabel(new Date(d)) + '</span>' + (s.exp ? '<span>' + money(s.exp) + '</span>' : '') + '</div>';
        out += '<div class="card flush"><ul class="list">' + items.map(txRow).join('') + '</ul></div>';
      }
    }
    return out;
  }

  // ================= برنامج التمرين =================
  function wkKey(courseId) { const d = new Date(); return 'hayati-wk-' + d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate() + '-' + courseId; }
  function wkDone(courseId) { try { return JSON.parse(localStorage.getItem(wkKey(courseId)) || '[]'); } catch (e) { return []; } }
  function workoutProgress(courseId, wk) { return wkDone(courseId).length + ' / ' + wk.exercises.length + ' تمارين'; }
  // فيديو المدرب لو موجود، وإلا بحث يوتيوب عن طريقة الأداء الصحيحة
  function exerciseVideo(x) {
    if (x.video && /^https:\/\//.test(x.video)) return x.video;
    return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(x.name + ' exercise proper form');
  }
  function restLabel(sec) { return !sec ? '' : sec < 60 ? sec + ' ثانية' : sec === 60 ? 'دقيقة' : sec === 120 ? 'دقيقتين' : Math.round(sec / 60) + ' دقايق'; }

  function workoutSheet(c) {
    const wk = c.workout;
    const draw = () => {
      const done = wkDone(c.id);
      return '<div class="hero" style="margin-top:4px;padding:16px 18px"><span class="eyebrow">' + I('dumbbell') + (wk.focus || 'تمرين') + '</span>' +
        '<div class="big" style="font-size:22px;margin:8px 0 2px">' + h(c.name) + '</div>' +
        '<div class="meta"><span>' + I('clock') + time12(c.start_time) + ' — ' + time12(c.end_time) + '</span><span>' + done.length + ' من ' + wk.exercises.length + ' خلصت</span></div>' +
        '<div class="track"><span style="width:' + (done.length / wk.exercises.length) * 100 + '%"></span></div></div>' +
        '<div class="card flush"><ul class="list">' + wk.exercises.map((x, i) =>
          '<li class="row ex-row' + (done.includes(i) ? ' done' : '') + '" data-ex="' + i + '">' +
          '<button class="check' + (done.includes(i) ? ' on' : '') + '" aria-label="خلصت التمرين">' + I('check') + '</button>' +
          '<div class="main"><div class="title"><span class="t ex-name">' + (i + 1) + '. ' + h(x.name) + '</span></div>' +
          '<div class="sets">' + x.sets.map((r, j) => '<span class="set"><small>' + (j + 1) + '</small>' + h(r) + '</span>').join('') + '</div>' +
          (x.rest ? '<div class="sub">' + I('timer') + ' راحة ' + restLabel(x.rest) + ' بين الجولات</div>' : '') + X('exExtra', c, x, i) +
          '<a class="ex-video" href="' + h(exerciseVideo(x)) + '" target="_blank" rel="noopener">' + I('play') + (x.video ? 'فيديو المدرب' : 'شوف طريقة الأداء') + '</a></div></li>').join('') + '</ul></div>' +
        '<p class="small muted" style="margin:10px 6px">الأرقام = عدد التكرارات في كل جولة. علامة الإنجاز تنحفظ لليوم على هذا الجهاز.</p>' +
        '<button class="btn ghost block" type="button" data-edit>' + I('settings') + 'تعديل الوقت والأيام</button>';
    };
    openSheet({
      title: 'برنامج التمرين',
      cancelLabel: 'تم',
      body: draw(),
      mount(root) {
        X('wkMount', root, c);
        root.onclick = (e) => {
          if (e.target.closest('[data-edit]')) { courseForm(c); return; }
          if (X('wkClick', e, c, root)) return;
          if (e.target.closest('a')) return;
          const row = e.target.closest('.ex-row');
          if (!row) return;
          const i = Number(row.dataset.ex);
          let done = wkDone(c.id);
          done = done.includes(i) ? done.filter((x) => x !== i) : done.concat(i);
          try { localStorage.setItem(wkKey(c.id), JSON.stringify(done)); } catch (err) { /* تجاهل */ }
          root.innerHTML = draw();
          if (done.length === wk.exercises.length) toast('عاش! خلّصت تمرين اليوم 💪');
        };
      },
    });
  }

  // بطاقة استيراد الجدول الجامعي الجاهز
  function seedCard() {
    const list = ui.seed && Array.isArray(ui.seed.courses) ? ui.seed.courses : [];
    const missing = list.filter((c) => !st.courses.some((x) => x.id === c.id));
    if (!missing.length) return '';
    return '<button class="cta" data-action="import-seed"><div class="ico">' + I('graduation') + '</div><div style="flex:1"><b>أضف جدولي الجامعي</b><small>' +
      h(ui.seed.title || 'جدولك') + ' · ' + missing.length + ' مواد جاهزة، بضغطة وحدة</small></div>' + I('plus') + '</button>';
  }

  function segBar(segs, cur, action) {
    return '<div class="seg">' + segs.map(([k, l]) => '<button class="' + (cur === k ? 'on' : '') + '" data-action="' + action + '" data-k="' + k + '">' + l + '</button>').join('') + '</div>';
  }

  // ================= المصاريف (حاوية الأقسام) =================
  function viewMoney() {
    return segBar(MONEY_SEGS, ui.moneySeg, 'money-seg') + ({ tx: viewMoneyTx, subs: viewSubs, goals: () => X('goalsTop') + viewGoals(), debts: viewDebts })[ui.moneySeg]();
  }

  // ================= الاشتراكات =================
  function subDueDate(sub, y, m) {
    const last = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(Number(sub.day) || 1, last), 9, 0, 0);
  }
  function nextRenewal(sub, from) {
    const base = from || new Date();
    const start = startOfDay(base);
    for (let i = 0; i <= 24; i++) {
      const d = subDueDate(sub, base.getFullYear(), base.getMonth() + i);
      if (sub.cycle === 'yearly' && d.getMonth() + 1 !== (Number(sub.month) || 1)) continue;
      if (d >= start) return d;
    }
    return null;
  }
  function renewWhen(d) {
    const n = daysBetween(new Date(), d);
    return n === 0 ? 'اليوم' : n === 1 ? 'بكرة' : 'بعد ' + nDays(n);
  }
  // 📊 «صدّر مصاريفك»: CSV للـ Excel (حق نقل البيانات). بدون نص رسالة البنك، ومحمي من حقن الصيغ
  function csvCell(v) {
    let s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;   // =HYPERLINK(...) ما تشتغل كصيغة
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function expensesCSV() {
    const list = st.transactions.slice().sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at));
    if (!list.length) return '';
    const rows = [['التاريخ', 'الوقت', 'النوع', 'المبلغ (د.ب)', 'المحل', 'الفئة', 'ملاحظة']];
    for (const t of list) {
      const d = new Date(t.occurred_at);
      rows.push([
        d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()), pad(d.getHours()) + ':' + pad(d.getMinutes()),
        t.kind === 'income' ? 'دخل' : 'صرف', (Number(t.amount) || 0).toFixed(3), t.merchant || '', t.category || '', t.note || '',
      ]);
    }
    // BOM عشان Excel يقرأ العربي، و CRLF مثل ما يتوقع
    return '\uFEFF' + rows.map((r, ri) => r.map((c, i) => (ri && i === 3 ? c : csvCell(c))).join(',')).join('\r\n') + '\r\n';   // المبلغ رقم بدون تنصيص عشان Excel يجمعه
  }
  function monthlyCost(sub) { return sub.cycle === 'yearly' ? (Number(sub.amount) || 0) / 12 : Number(sub.amount) || 0; }

  // يسجّل الاشتراكات المستحقة كمصاريف (مرة وحدة لكل فترة)
  function postSubscriptions() {
    const now = new Date();
    let n = 0;
    for (const sub of st.subscriptions.slice()) {
      if (sub.active === false) continue;
      const start = sub.start_date ? new Date(sub.start_date + 'T00:00:00') : startOfDay(now);
      let posted = sub.last_posted || null;
      for (let i = 0; i < 36; i++) {
        const d = subDueDate(sub, start.getFullYear(), start.getMonth() + i);
        if (d > now) break;
        if (d < start) continue;
        if (sub.cycle === 'yearly' && d.getMonth() + 1 !== (Number(sub.month) || 1)) continue;
        const key = d.getFullYear() + '-' + pad(d.getMonth() + 1);
        if (posted && key <= posted) continue;
        S.upsert('transactions', {
          id: S.stableId('sub:' + sub.id + ':' + key), kind: 'expense', amount: Number(sub.amount) || 0,
          category: sub.category || 'فواتير واتصالات', merchant: sub.name, note: 'اشتراك تلقائي',
          occurred_at: d.toISOString(), source: 'subscription', needs_review: false,
        });
        posted = key;
        n++;
      }
      if (posted !== (sub.last_posted || null)) S.upsert('subscriptions', Object.assign({}, sub, { last_posted: posted }));
    }
    if (n) toast('انسجّل ' + n + ' اشتراك تلقائياً');
    return n;
  }

  function viewSubs() {
    const subs = st.subscriptions.slice().sort((a, b) => (nextRenewal(a) || 0) - (nextRenewal(b) || 0));
    const active = subs.filter((x) => x.active !== false);
    const total = active.reduce((a, x) => a + monthlyCost(x), 0);
    const next = active.map((x) => ({ x, d: nextRenewal(x) })).filter((r) => r.d).sort((a, b) => a.d - b.d)[0];
    let out = '<div class="hero dark"><span class="eyebrow">' + I('repeat') + 'اشتراكاتك والمصاريف الثابتة</span>' +
      '<div class="amount-big">' + money(total) + '</div><div class="meta"><span>بالشهر · ' + money(total * 12) + ' بالسنة</span></div>' +
      '<div class="split"><div><small>فعّالة</small><b class="num">' + active.length + '</b></div><div><small>أقرب تجديد</small><b>' + (next ? h(next.x.name) + ' · ' + renewWhen(next.d) : '—') + '</b></div></div></div>';
    out += '<p class="small muted" style="margin:0 6px 4px">تنضاف تلقائياً للمصاريف يوم التجديد، وتطلع لك تنبيه بشاشة «اليوم» قبلها.</p>';
    out += secHead('الكل', '<span class="count">' + subs.length + '</span><button class="link" data-action="add-sub">إضافة</button>');
    if (!subs.length) return out + '<div class="card">' + empty('repeat', 'ما فيه اشتراكات', 'أضف نتفليكس، باقة الجوال، الجيم… <button class="link" data-action="add-sub">أضف أول اشتراك</button>') + '</div>';
    out += '<div class="card flush"><ul class="list">' + subs.map((x) => {
      const d = nextRenewal(x);
      return '<li class="row' + (x.active === false ? ' dim' : '') + '" data-action="edit-sub" data-id="' + x.id + '">' + catIcon(x.category) +
        '<div class="main"><div class="title"><span class="t">' + h(x.name) + '</span>' + (x.active === false ? '<span class="tag">موقوف</span>' : '') + '</div>' +
        '<div class="sub">' + (x.cycle === 'yearly' ? 'سنوي' : 'شهري') + (x.active !== false && d ? ' · يتجدد ' + renewWhen(d) : '') + '</div></div>' +
        '<div class="amount">' + money(x.amount) + '</div></li>';
    }).join('') + '</ul></div>';
    return out;
  }

  // ================= أهداف التوفير =================
  function viewGoals() {
    const goals = st.goals.slice().sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0));
    const saved = goals.reduce((a, g) => a + (Number(g.saved) || 0), 0);
    const target = goals.reduce((a, g) => a + (Number(g.target) || 0), 0);
    let out = '<div class="hero"><div style="display:flex;align-items:center;gap:14px"><div style="flex:1;min-width:0">' +
      '<span class="eyebrow">' + I('piggy') + 'مجموع اللي وفّرته</span><div class="amount-big">' + money(saved) + '</div>' +
      '<div class="meta"><span>' + (target ? 'من أصل ' + fmt(target) + ' د.ب' : 'حط هدف وابدأ') + '</span></div></div>' +
      (target ? ring((saved / target) * 100) : '') + '</div></div>';
    out += secHead('أهدافك', '<span class="count">' + goals.length + '</span><button class="link" data-action="add-goal">هدف جديد</button>');
    if (!goals.length) return out + '<div class="card">' + empty('piggy', 'ما فيه أهداف', 'مثلاً: «لابتوب جديد ٣٠٠ د.ب». <button class="link" data-action="add-goal">أضف هدف</button>') + '</div>';
    for (const g of goals) {
      const t = Number(g.target) || 0, sv = Number(g.saved) || 0;
      const pct = t ? Math.min(100, (sv / t) * 100) : 0;
      const left = Math.max(0, t - sv);
      let hint = '';
      if (!g.done && left > 0 && g.deadline) {
        const dl = new Date(g.deadline + 'T00:00:00');
        const months = Math.max(1, (dl.getFullYear() - new Date().getFullYear()) * 12 + dl.getMonth() - new Date().getMonth());
        hint = daysBetween(new Date(), dl) < 0 ? '<span class="late">فات الموعد</span>' : 'وفّر ' + money(left / months) + ' بالشهر عشان توصل قبل ' + dl.getDate() + ' ' + MONTHS[dl.getMonth()];
      }
      const col = g.color || COLORS[0];
      out += '<div class="card goal" data-action="edit-goal" data-id="' + g.id + '">' +
        '<div class="goal-top"><div class="ico" style="' + tint(col) + (g.emoji ? ';font-size:20px' : '') + '">' + (g.emoji ? h(g.emoji) : I(g.done ? 'award' : 'piggy')) + '</div><div style="flex:1;min-width:0"><b>' + h(g.name) + '</b>' +
        '<div class="small muted">' + (g.done || sv >= t ? '🎉 تحقق الهدف' : 'باقي ' + money(left)) + '</div></div>' +
        '<div style="text-align:left"><b>' + money(sv) + '</b><div class="small muted num">' + Math.round(pct) + '%</div></div></div>' +
        '<div class="meter" style="height:10px;margin:12px 0 10px"><span style="width:' + pct + '%;background:' + col + '"></span></div>' +
        (hint ? '<div class="small muted" style="margin-bottom:10px">' + hint + '</div>' : '') +
        goalItems(g) +
        '<div class="btn-row"><button class="btn ghost" data-action="goal-money" data-sign="1" data-id="' + g.id + '">' + I('plus') + 'أضف</button>' +
        '<button class="btn ghost" data-action="goal-money" data-sign="-1" data-id="' + g.id + '">' + I('minus') + 'اسحب</button></div></div>';
    }
    return out;
  }

  // بنود الهدف: التوفير يغطي البنود بالترتيب
  function goalItems(g) {
    const items = Array.isArray(g.items) ? g.items : [];
    if (!items.length) return '';
    let left = Number(g.saved) || 0;
    return '<div class="items-list">' + items.map((it) => {
      const a = Number(it.amount) || 0;
      const cov = Math.min(a, Math.max(0, left));
      left -= a;
      const full = a > 0 && cov >= a;
      return '<div class="item-line' + (full ? ' full' : '') + '"><span class="it-dot">' + (full ? I('check') : '') + '</span><span class="it-n">' + h(it.name) + '</span>' +
        '<span class="it-a">' + (full || !cov ? money(a) : '<span class="num">' + fmt(cov) + '</span> من ' + money(a)) + '</span></div>';
    }).join('') + '</div>';
  }

  // ================= لي وعلي =================
  function viewDebts() {
    const open = st.debts.filter((d) => !d.settled);
    const lent = open.filter((d) => d.direction === 'lent').reduce((a, d) => a + Number(d.amount), 0);
    const borrowed = open.filter((d) => d.direction === 'borrowed').reduce((a, d) => a + Number(d.amount), 0);
    let out = '<div class="duo"><div class="tile"><div class="ti" style="' + tint('#059669') + '">' + I('arrowDown') + '</div><div class="lbl">لي (عند الناس)</div><div class="val" style="color:var(--income)">' + money(lent) + '</div></div>' +
      '<div class="tile"><div class="ti" style="' + tint('#e11d48') + '">' + I('arrowUp') + '</div><div class="lbl">علي (للناس)</div><div class="val" style="color:var(--expense)">' + money(borrowed) + '</div></div></div>';

    // الصافي لكل شخص
    const people = {};
    for (const d of open) {
      people[d.person] = people[d.person] || { net: 0, items: [] };
      people[d.person].net += (d.direction === 'lent' ? 1 : -1) * Number(d.amount);
      people[d.person].items.push(d);
    }
    const names = Object.keys(people).sort((a, b) => Math.abs(people[b].net) - Math.abs(people[a].net));
    out += secHead('مفتوحة', '<span class="count">' + open.length + '</span><button class="link" data-action="add-debt">إضافة</button>');
    if (!names.length) {
      out += '<div class="card">' + empty('users', 'كل الحسابات صافية 👌', 'سلّفت أحد أو استلفت؟ <button class="link" data-action="add-debt">سجّلها</button>') + '</div>';
    }
    for (const n of names) {
      const p = people[n];
      out += '<div class="card flush"><div class="person-head"><div class="avatar">' + h(n.trim().charAt(0)) + '</div><b style="flex:1">' + h(n) + '</b>' +
        '<span class="small ' + (p.net >= 0 ? 'pos' : 'neg') + '">' + (p.net >= 0 ? 'لك ' : 'عليك ') + money(Math.abs(p.net)) + '</span></div><ul class="list">' +
        p.items.sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at)).map(debtRow).join('') + '</ul></div>';
    }
    const settled = st.debts.filter((d) => d.settled);
    if (settled.length) {
      out += '<button class="btn ghost block" style="margin-top:4px" data-action="show-settled">' + I('check') + (ui.showSettled ? 'خبّي المسدّدة' : 'المسدّدة (' + settled.length + ')') + '</button>';
      if (ui.showSettled) out += '<div class="card flush" style="margin-top:12px"><ul class="list">' + settled.slice(-30).reverse().map(debtRow).join('') + '</ul></div>';
    }
    return out;
  }
  function debtRow(d) {
    const lent = d.direction === 'lent';
    return '<li class="row' + (d.settled ? ' done' : '') + '" data-action="edit-debt" data-id="' + d.id + '">' +
      '<button class="check' + (d.settled ? ' on' : '') + '" data-action="toggle-debt" data-id="' + d.id + '" aria-label="تم السداد">' + I('check') + '</button>' +
      '<div class="main"><div class="title"><span class="t">' + (lent ? 'سلّفت ' : 'استلفت من ') + h(d.person) + '</span></div>' +
      '<div class="sub">' + dayLabel(new Date(d.occurred_at)) + (d.note ? ' · ' + h(d.note) : '') + '</div></div>' +
      '<div class="amount ' + (lent ? 'income' : '') + '" style="' + (lent ? '' : 'color:var(--expense)') + '">' + money(d.amount) + '</div></li>';
  }

  // ================= الجدول/المذاكرة/المعدل =================
  function viewStudy() {
    const segs = has('student') ? STUDY_SEGS : STUDY_SEGS.filter((x) => x[0] !== 'gpa');
    if (!segs.some((x) => x[0] === ui.studySeg)) ui.studySeg = 'schedule';
    return segBar(segs, ui.studySeg, 'study-seg') + ({ schedule: viewSchedule, focus: viewFocus, gpa: viewGpa, health: () => X('viewHealth') })[ui.studySeg]();
  }

  // جدول فاضي = بداية: كل عميل يبني أسبوعه، والأزرار على حسب ملفه
  function buildScheduleCard() {
    const types = (has('student') ? [['lecture', 'محاضرة']] : []).concat([['gym', 'تمرين'], ['activity', has('employee') ? 'دوام أو نشاط' : 'نشاط']]);
    return '<div class="card build-week"><b>ابنِ جدولك</b><p class="small muted">أضف أسبوعك مرة وحدة: الأيام والوقت والمكان. وبعدها يقولك «الحين وقت…».</p>' +
      '<div class="build-btns">' + types.map(([k, l]) => '<button class="btn" data-action="add-course" data-type="' + k + '">' + I(ACT_TYPES[k].icon) + l + '</button>').join('') + '</div></div>';
  }

  function viewSchedule() {
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
    const dates = DAYS_SHORT.map((_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d; });
    let out = seedCard() + '<div class="week">' + DAYS_SHORT.map((d, i) => {
      const cls = ['wd', ui.day === i ? 'on' : '', i === now.getDay() ? 'is-today' : '', agendaOn(dates[i]).length ? 'has' : ''].join(' ');
      return '<button class="' + cls + '" data-action="day" data-d="' + i + '"><small>' + d + '</small><b class="num">' + dates[i].getDate() + '</b><i></i></button>';
    }).join('') + '</div>';

    const items = agendaOn(dates[ui.day]);
    const isToday = ui.day === now.getDay();
    const nm = nowMinutes();
    out += secHead(DAYS[ui.day] + (isToday ? ' · اليوم' : ''), '<span class="count">' + items.length + '</span>');
    if (items.length) {
      out += '<div class="timeline">' + items.map((c) => isToday ? slot(c, nm >= c.end ? 'past' : nm >= c.start ? 'now' : '', ((nm - c.start) / (c.end - c.start)) * 100) : slot(c)).join('') + '</div>';
    } else {
      out += '<div class="card">' + empty('sparkle', 'يوم فاضي', 'ما فيه محاضرات ولا تمرين ولا مواعيد') + '</div>';
    }

    out += '<button class="cta" data-action="calendar"><div class="ico">' + I('bell') + '</div><div style="flex:1"><b>التنبيهات</b><small>أضف جدولك لتقويم الآيفون عشان ينبّهك «الحين وقت…» حتى لو التطبيق مسكّر</small></div>' + I('chevL') + '</button>';

    const groups = [['lecture', 'المحاضرات'], ['gym', 'التمرين'], ['activity', 'أنشطة ثانية']];
    out += secHead('جدولك الأسبوعي', '<button class="link" data-action="add-course">إضافة</button>');
    if (!st.courses.length) {
      out += buildScheduleCard();
    }
    for (const [type, label] of groups) {
      const list = st.courses.filter((c) => (c.type || 'lecture') === type);
      if (!list.length) continue;
      out += '<div class="group-title">' + I(ACT_TYPES[type].icon) + label + ' · ' + list.length + '</div><div class="card flush"><ul class="list">' +
        list.sort((a, b) => a.name.localeCompare(b.name, 'ar')).map((c) =>
          '<li class="row" data-action="' + (c.workout ? 'open-workout' : 'edit-course') + '" data-id="' + c.id + '"><div class="ico" style="' + tint(c.color || COLORS[0]) + '">' + I(ACT_TYPES[type].icon) + '</div>' +
          '<div class="main"><div class="title"><span class="t">' + h(c.name) + '</span></div><div class="sub">' + (c.days || []).slice().sort().map((d) => DAYS_SHORT[d]).join('، ') +
          ' · ' + time12(c.start_time) + ' – ' + time12(c.end_time) + (c.room ? ' · ' + h(c.room) : '') + '</div></div><span class="muted">' + I('chevL') + '</span></li>').join('') + '</ul></div>';
    }
    const appts = st.tasks.filter((t) => t.kind === 'appointment' && !t.done && t.due_at && new Date(t.due_at) >= startOfDay(now)).sort((a, b) => new Date(a.due_at) - new Date(b.due_at));
    if (appts.length) {
      out += '<div class="group-title">' + I('clock') + 'المواعيد الجاية · ' + appts.length + '</div><div class="card flush"><ul class="list">' + appts.slice(0, 8).map(taskRow).join('') + '</ul></div>';
    }
    return out;
  }

  // ---------- مؤقت المذاكرة ----------
  const TKEY = 'hayati-timer';
  function getTimer() { try { return JSON.parse(localStorage.getItem(TKEY) || 'null'); } catch (e) { return null; } }
  function setTimer(t) { try { if (t) localStorage.setItem(TKEY, JSON.stringify(t)); else localStorage.removeItem(TKEY); } catch (e) { /* تجاهل */ } }
  function timerLeft(t) { return t.ends_at ? Math.max(0, t.ends_at - Date.now()) : t.remaining; }
  function logSession(courseId, startedAt, minutes) {
    if (minutes < 1) return;
    S.upsert('study_sessions', { course_id: courseId || null, started_at: new Date(startedAt).toISOString(), minutes: Math.round(minutes) });
  }
  function timerStart() {
    const mins = Number(st.settings.focus_minutes) || 25;
    setTimer({ phase: 'focus', course_id: ui.focusCourse || null, duration: mins, started_at: Date.now(), ends_at: Date.now() + mins * 60000, remaining: null });
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  }
  function timerPause() { const t = getTimer(); if (t && t.ends_at) { t.remaining = timerLeft(t); t.ends_at = null; setTimer(t); } }
  function timerResume() { const t = getTimer(); if (t && !t.ends_at) { t.ends_at = Date.now() + t.remaining; t.remaining = null; setTimer(t); } }
  function timerStop() {
    const t = getTimer();
    if (t && t.phase === 'focus') {
      const done = (t.duration * 60000 - timerLeft(t)) / 60000;
      if (done >= 1) { logSession(t.course_id, t.started_at, done); toast('انحفظت ' + Math.round(done) + ' دقيقة مذاكرة ✓'); }
    }
    setTimer(null);
  }
  function timerCheck() {
    const t = getTimer();
    if (!t || !t.ends_at || Date.now() < t.ends_at) return false;
    if (t.phase === 'focus') {
      logSession(t.course_id, t.started_at, t.duration);
      const course = t.course_id && courseById(t.course_id);
      notify('خلصت جلسة المذاكرة 🎉', (course ? course.name + ' · ' : '') + t.duration + ' دقيقة. خذ استراحة ٥ دقايق');
      const breakEnd = t.ends_at + 5 * 60000;
      setTimer(breakEnd > Date.now() ? { phase: 'break', course_id: t.course_id, duration: 5, started_at: t.ends_at, ends_at: breakEnd, remaining: null } : null);
    } else {
      notify('خلصت الاستراحة', 'يلا نرجع نذاكر 💪');
      setTimer(null);
    }
    return true;
  }
  function mmss(ms) { const s = Math.ceil(ms / 1000); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); }
  function timerRing(t) {
    const r = 92, c = 2 * Math.PI * r;
    const total = t ? t.duration * 60000 : (Number(st.settings.focus_minutes) || 25) * 60000;
    const left = t ? timerLeft(t) : total;
    const p = 1 - left / total;
    return '<svg viewBox="0 0 220 220"><circle cx="110" cy="110" r="' + r + '" fill="none" stroke="var(--surface-2)" stroke-width="14"/>' +
      '<circle id="tArc" cx="110" cy="110" r="' + r + '" fill="none" stroke="' + (t && t.phase === 'break' ? 'var(--income)' : 'url(#tg)') + '" stroke-width="14" stroke-linecap="round" stroke-dasharray="' + (c * p) + ' ' + c + '" data-c="' + c + '" data-total="' + total + '"/>' +
      '<defs><linearGradient id="tg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#0E3B43"/><stop offset="1" stop-color="#1A8A8F"/></linearGradient></defs></svg>' +
      '<div class="timer-center"><b class="num" id="tTime">' + mmss(left) + '</b><small>' + (!t ? 'جاهز' : t.phase === 'break' ? 'استراحة' : t.ends_at ? 'تركيز' : 'متوقف') + '</small></div>';
  }
  function weekStartDate() { const d = startOfDay(new Date()); d.setDate(d.getDate() - d.getDay()); return d; }

  function viewFocus() {
    const t = getTimer();
    const lec = lectures();
    const mins = Number(st.settings.focus_minutes) || 25;
    let out = '';
    if (!t) {
      out += '<div class="chips" style="margin-bottom:12px;flex-wrap:nowrap;overflow-x:auto">' +
        '<button class="chip' + (!ui.focusCourse ? ' on' : '') + '" data-action="focus-course" data-id="">عام</button>' +
        lec.map((c) => '<button class="chip' + (ui.focusCourse === c.id ? ' on' : '') + '" data-action="focus-course" data-id="' + c.id + '">' + h(c.name) + '</button>').join('') + '</div>';
    }
    const course = t ? (t.course_id && courseById(t.course_id)) : (ui.focusCourse && courseById(ui.focusCourse));
    out += '<div class="card timer-card"><div class="small muted" style="text-align:center;margin-bottom:6px">' + (course ? h(course.name) : 'مذاكرة عامة') + '</div>' +
      '<div class="timer">' + timerRing(t) + '</div><div class="btn-row" style="margin-top:16px">';
    if (!t) out += '<button class="btn primary" data-action="timer-start">' + I('play') + 'ابدأ ' + mins + ' دقيقة</button>';
    else if (t.ends_at) out += '<button class="btn" data-action="timer-pause">' + I('pause') + 'إيقاف مؤقت</button><button class="btn danger" data-action="timer-stop">' + I('stop') + 'إنهاء</button>';
    else out += '<button class="btn primary" data-action="timer-resume">' + I('play') + 'كمّل</button><button class="btn danger" data-action="timer-stop">' + I('stop') + 'إنهاء</button>';
    out += '</div>';
    if (!t) out += '<div class="seg" style="margin:14px 0 0">' + [25, 45, 60].map((m) => '<button class="' + (mins === m ? 'on' : '') + '" data-action="focus-len" data-k="' + m + '">' + m + ' دقيقة</button>').join('') + '</div>';
    out += '</div>';

    // إحصائيات الأسبوع
    const ws = weekStartDate();
    const week = st.study_sessions.filter((x) => new Date(x.started_at) >= ws);
    const total = week.reduce((a, x) => a + Number(x.minutes), 0);
    const todayMin = st.study_sessions.filter((x) => sameDay(new Date(x.started_at), new Date())).reduce((a, x) => a + Number(x.minutes), 0);
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      if (st.study_sessions.some((x) => sameDay(new Date(x.started_at), d))) streak++;
      else if (i > 0) break;
    }
    out += '<div class="tiles"><div class="tile"><div class="ti" style="' + tint('#1A8A8F') + '">' + I('timer') + '</div><div class="lbl">اليوم</div><div class="val">' + hrs(todayMin) + '</div></div>' +
      '<div class="tile"><div class="ti" style="' + tint('#0d9488') + '">' + I('calendar') + '</div><div class="lbl">هالأسبوع</div><div class="val">' + hrs(total) + '</div></div>' +
      '<div class="tile"><div class="ti" style="' + tint('#f97316') + '">' + I('flame') + '</div><div class="lbl">أيام متتالية</div><div class="val num">' + streak + '</div></div></div>';

    const by = {};
    for (const x of week) by[x.course_id || ''] = (by[x.course_id || ''] || 0) + Number(x.minutes);
    const rows = Object.entries(by).sort((a, b) => b[1] - a[1]);
    out += secHead('ساعات المذاكرة هالأسبوع', '<button class="link" data-action="add-session">تسجيل يدوي</button>');
    if (!rows.length) out += '<div class="card">' + empty('timer', 'ما ذاكرت هالأسبوع للحين', 'اختر مادة واضغط «ابدأ»') + '</div>';
    else out += '<div class="card">' + rows.map(([id, m]) => {
      const c = id && courseById(id);
      const col = c ? c.color || COLORS[0] : '#64748b';
      return '<div class="cat"><div class="ico" style="' + tint(col) + '">' + I('book') + '</div><div class="body"><div class="line"><span>' + h(c ? c.name : 'عام') + '</span><b>' + hrs(m) + '</b></div>' +
        '<div class="meter"><span style="width:' + (m / rows[0][1]) * 100 + '%;background:' + col + '"></span></div></div></div>';
    }).join('') + '</div>';

    out += X('focusExtra');
    const recent = st.study_sessions.slice().sort((a, b) => new Date(b.started_at) - new Date(a.started_at)).slice(0, 6);
    if (recent.length) {
      out += secHead('آخر الجلسات') + '<div class="card flush"><ul class="list">' + recent.map((x) => {
        const c = x.course_id && courseById(x.course_id);
        return '<li class="row" data-action="del-session" data-id="' + x.id + '"><div class="ico" style="' + tint(c ? c.color || COLORS[0] : '#64748b') + '">' + I('timer') + '</div>' +
          '<div class="main"><div class="title"><span class="t">' + h(c ? c.name : 'مذاكرة عامة') + '</span></div><div class="sub">' + dayLabel(new Date(x.started_at)) + ' · ' + timeOf(new Date(x.started_at)) + '</div></div>' +
          '<b class="num">' + x.minutes + ' د</b></li>';
      }).join('') + '</ul></div>';
    }
    return out;
  }
  function hrs(m) {
    m = Math.round(Number(m) || 0);
    if (m < 60) return '<span class="num">' + m + '</span><span class="cur">د</span>';
    return '<span class="num">' + (m / 60).toFixed(1).replace(/\.0$/, '') + '</span><span class="cur">ساعة</span>';
  }
  // تحديث العدّاد كل ثانية بدون إعادة رسم الصفحة
  function timerTickUI() {
    if (timerCheck()) { render(); return; }
    const el = document.getElementById('tTime');
    const t = getTimer();
    if (!el || !t) return;
    const left = timerLeft(t);
    el.textContent = mmss(left);
    const arc = document.getElementById('tArc');
    if (arc) { const c = Number(arc.dataset.c); arc.setAttribute('stroke-dasharray', (c * (1 - left / Number(arc.dataset.total))) + ' ' + c); }
  }

  // ---------- المعدل ----------
  function gpaOf(rows) {
    let pts = 0, cr = 0;
    for (const r of rows) {
      if (!(r.grade in GRADE_POINTS)) continue;
      pts += GRADE_POINTS[r.grade] * Number(r.credits);
      cr += Number(r.credits);
    }
    return { gpa: cr ? pts / cr : null, credits: cr, points: pts };
  }
  function standing(g) {
    if (g == null) return '';
    if (g >= 3.67) return 'امتياز 🏆';
    if (g >= 3) return 'جيد جداً';
    if (g >= 2.33) return 'جيد';
    if (g >= 2) return 'مقبول';
    return 'تحت الملاحظة ⚠️';
  }
  function semesterOrder() {
    const seen = [];
    for (const g of st.grades) if (!seen.includes(g.semester)) seen.push(g.semester);
    return seen.reverse();
  }
  function cumulative() {
    const all = gpaOf(st.grades);
    const pg = Number(st.settings.prior_gpa), pc = Number(st.settings.prior_credits);
    const extraPts = pg && pc ? pg * pc : 0, extraCr = pg && pc ? pc : 0;
    const cr = all.credits + extraCr;
    return { gpa: cr ? (all.points + extraPts) / cr : null, credits: cr };
  }
  function gradeColor(g) { return g.startsWith('A') ? '#059669' : g.startsWith('B') ? '#2563eb' : g.startsWith('C') ? '#d97706' : '#e11d48'; }

  function viewGpa() {
    const cum = cumulative();
    const sems = semesterOrder();
    const cur = sems[0] ? gpaOf(st.grades.filter((g) => g.semester === sems[0])) : null;
    let out = '<div class="hero"><div style="display:flex;align-items:center;gap:14px"><div style="flex:1;min-width:0">' +
      '<span class="eyebrow">' + I('award') + 'المعدل التراكمي</span><div class="amount-big"><span class="num">' + (cum.gpa != null ? cum.gpa.toFixed(2) : '—') + '</span><span class="cur">/ 4.00</span></div>' +
      '<div class="meta"><span>' + (standing(cum.gpa) || 'أضف درجاتك عشان أحسب معدلك') + '</span></div></div>' +
      (cum.gpa != null ? ring((cum.gpa / 4) * 100) : '') + '</div>' +
      '<div class="split"><div><small>معدل ' + h(sems[0] || 'الفصل') + '</small><b class="num">' + (cur && cur.gpa != null ? cur.gpa.toFixed(2) : '—') + '</b></div>' +
      '<div><small>الساعات المحتسبة</small><b class="num">' + (cum.credits || 0) + '</b></div></div></div>';

    out += '<div class="actions"><button class="action" data-action="add-grade"><div class="ico" style="' + tint('#1A8A8F') + '">' + I('plus') + '</div>أضف درجة</button>' +
      '<button class="action" data-action="prior-gpa"><div class="ico" style="' + tint('#0d9488') + '">' + I('chart') + '</div>' + (st.settings.prior_gpa ? 'المعدل السابق ' + Number(st.settings.prior_gpa).toFixed(2) : 'معدلك السابق') + '</button></div>';

    out += X('gpaNeed');
    if (!sems.length) return out + '<div class="card" style="margin-top:14px">' + empty('award', 'ما فيه درجات', 'أضف موادك ودرجاتها (A، B+…) وأحسب لك المعدل الفصلي والتراكمي. إذا عندك معدل قديم حطه من «معدلك السابق».') + '</div>';
    for (const sem of sems) {
      const rows = st.grades.filter((g) => g.semester === sem);
      const g = gpaOf(rows);
      out += '<div class="sec-head"><h2>' + h(sem) + '</h2><span class="tag brand num">' + (g.gpa != null ? g.gpa.toFixed(2) : '—') + '</span><span class="count">' + g.credits + ' ساعة</span></div>' +
        '<div class="card flush"><ul class="list">' + rows.map((r) =>
          '<li class="row" data-action="edit-grade" data-id="' + r.id + '"><div class="grade-badge" style="' + tint(gradeColor(r.grade)) + '">' + h(r.grade) + '</div>' +
          '<div class="main"><div class="title"><span class="t">' + h(r.course_name) + '</span></div><div class="sub">' + r.credits + ' ساعات · ' + (GRADE_POINTS[r.grade] || 0).toFixed(2) + ' نقطة</div></div></li>').join('') + '</ul></div>';
    }
    out += '<p class="small muted" style="margin:10px 6px">النظام: 4.00 (A=4، A-=3.67، B+=3.33…). إذا جامعتك تستخدم نظام مختلف قلّي.</p>';
    return out;
  }

  // ================= تقرير الشهر =================
  function reportSheet() {
    const [y, m] = ui.month.split('-').map(Number);
    const prevKey = shiftKey(ui.month, -1), rg = monthRange(ui.month);
    const cur = txInMonth(ui.month), prev = txInMonth(prevKey);
    const a = sums(cur), b = sums(prev);
    const diff = b.exp ? ((a.exp - b.exp) / b.exp) * 100 : null;
    const isNow = ui.month === monthKey(new Date());
    const daysCount = Math.max(1, daysBetween(rg.start, isNow ? new Date() : new Date(rg.end - 1)) + 1);
    const exps = cur.filter((t) => t.kind === 'expense');
    // «COSTA SEEF» و «Costa Coffee» = محل واحد
    const topM = window.SmsParser.groupByBrand(exps).slice(0, 3).map((g) => [g.label, g]);
    const biggest = exps.slice().sort((p, q) => q.amount - p.amount)[0];
    let noSpend = 0;
    for (let i = 0; i < daysCount; i++) { const d = new Date(rg.start.getFullYear(), rg.start.getMonth(), rg.start.getDate() + i); if (!exps.some((t) => sameDay(new Date(t.occurred_at), d))) noSpend++; }
    const catOf = (list) => { const o = {}; for (const t of list) if (t.kind === 'expense') o[t.category || 'أخرى'] = (o[t.category || 'أخرى'] || 0) + Number(t.amount); return o; };
    const ca = catOf(cur), cb = catOf(prev);
    const cats = Object.keys(Object.assign({}, ca, cb)).sort((p, q) => (ca[q] || 0) - (ca[p] || 0)).slice(0, 7);
    const subsTotal = cur.filter((t) => t.source === 'subscription').reduce((s2, t) => s2 + Number(t.amount), 0);

    let body = '<div class="hero dark" style="margin-top:4px"><span class="eyebrow">' + I('chart') + monthLabel(ui.month) + '</span>' +
      '<div class="amount-big">' + money(a.exp) + '</div><div class="meta"><span>' +
      (diff == null ? 'ما فيه بيانات للشهر اللي قبله' : (diff > 0 ? '▲ أكثر بـ ' : '▼ أقل بـ ') + Math.abs(Math.round(diff)) + '% من ' + MONTHS[(m + 10) % 12] + ' (' + fmt(b.exp) + ')') + '</span></div>' +
      '<div class="split"><div><small>متوسط اليوم</small><b>' + money(a.exp / daysCount) + '</b></div><div><small>أيام بدون صرف</small><b class="num">' + noSpend + ' / ' + daysCount + '</b></div></div></div>';

    body += '<div class="group-title">' + I('store') + 'أكثر مكان صرفت فيه</div><div class="card flush"><ul class="list">' +
      (topM.length ? topM.map(([k, v], i) => '<li class="row" style="cursor:default"><div class="rank">' + (i + 1) + '</div><div class="main"><div class="title"><span class="t">' + h(k) + '</span></div><div class="sub">' + (v.n === 1 ? 'مرة وحدة' : v.n === 2 ? 'مرتين' : v.n + ' مرات') + '</div></div><div class="amount">' + money(v.sum) + '</div></li>').join('') : '<li class="row">—</li>') + '</ul></div>';

    body += '<div class="group-title">' + I('chart') + 'مقارنة بالشهر اللي قبله</div><div class="card">' + cats.map((c) => {
      const va = ca[c] || 0, vb = cb[c] || 0;
      const d = vb ? Math.round(((va - vb) / vb) * 100) : null;
      const [ic, col] = catMeta(c);
      return '<div class="cat"><div class="ico" style="' + tint(col) + '">' + I(ic) + '</div><div class="body"><div class="line"><span>' + h(c) + '</span><b>' + money(va) + '</b></div>' +
        '<div class="small ' + (d == null ? 'muted' : d > 0 ? 'neg' : 'pos') + '">' + (d == null ? 'جديد هالشهر' : d === 0 ? 'نفس الشهر اللي قبله' : (d > 0 ? '▲ ' : '▼ ') + Math.abs(d) + '% (كان ' + fmt(vb) + ')') + '</div></div></div>';
    }).join('') + '</div>';

    body += '<div class="group-title">' + I('sparkle') + 'ملخص</div><div class="card"><ul class="list">' +
      '<li class="row" style="cursor:default"><div class="main">الدخل</div><b class="amount income">' + money(a.inc) + '</b></li>' +
      '<li class="row" style="cursor:default"><div class="main">الصافي</div><b>' + money(a.inc - a.exp) + '</b></li>' +
      (biggest ? '<li class="row" style="cursor:default"><div class="main">أكبر عملية<div class="sub">' + h(biggest.merchant || biggest.category) + ' · ' + dayLabel(new Date(biggest.occurred_at)) + '</div></div><b>' + money(biggest.amount) + '</b></li>' : '') +
      (subsTotal ? '<li class="row" style="cursor:default"><div class="main">الاشتراكات</div><b>' + money(subsTotal) + '</b></li>' : '') +
      (st.settings.budget ? '<li class="row" style="cursor:default"><div class="main">الميزانية</div><b class="' + (a.exp > st.settings.budget ? 'neg' : 'pos') + '">' + (a.exp > st.settings.budget ? 'تعدّيت بـ ' + fmt(a.exp - st.settings.budget) : 'باقي ' + fmt(st.settings.budget - a.exp)) + '</b></li>' : '') +
      '</ul></div>';
    // بالآيفون: ملخص نصي يروح لقائمة المشاركة (واتساب، ملاحظات…)
    const share = window.HayatiNative && window.HayatiNative.shareText;
    if (share) body += '<button class="btn block" type="button" id="shareReport">' + I('upload') + 'شارك الملخص</button>';
    openSheet({
      title: 'تقرير الشهر', cancelLabel: 'تم', body,
      mount(root) {
        const b = root.querySelector('#shareReport');
        if (b) b.onclick = () => share('تقرير ' + monthLabel(ui.month) + ' · «حياتي»\n' +
          'الصرف: ' + fmt(a.exp) + ' د.ب\nالدخل: ' + fmt(a.inc) + ' د.ب\n' +
          (topM.length ? 'أكثر مكان: ' + topM.map(([k, v]) => k + ' (' + fmt(v.sum) + ')').join('، ') + '\n' : '') +
          'أيام بدون صرف: ' + noSpend + ' / ' + daysCount);
      },
    });
  }

  function viewTasks() {
    const top = X('tasksTop');
    if (top && top.full) return top.html;
    return (top || '') + viewTaskList();
  }
  function viewTaskList() {
    const filters = [['all', 'الكل'], ['homework', 'واجبات'], ['exam', 'اختبارات'], ['appointment', 'مواعيد'], ['personal', 'شخصي']];
    let out = '<div class="seg">' + filters.map(([k, l]) => '<button class="' + (ui.taskFilter === k ? 'on' : '') + '" data-action="task-filter" data-k="' + k + '">' + l + '</button>').join('') + '</div>';
    const now = new Date();
    const list = st.tasks.filter((t) => ui.taskFilter === 'all' || t.kind === ui.taskFilter);
    const open = list.filter((t) => !t.done);
    const groups = [['متأخرة', 'alert', []], ['اليوم', 'sun', []], ['هالأسبوع', 'calendar', []], ['لاحقاً', 'clock', []], ['بدون موعد', 'pin', []]];
    for (const t of open) {
      if (!t.due_at) { groups[4][2].push(t); continue; }
      const d = new Date(t.due_at);
      const diff = daysBetween(now, d);
      if (diff < 0) groups[0][2].push(t);
      else if (diff === 0) groups[1][2].push(t);
      else if (diff <= 7) groups[2][2].push(t);
      else groups[3][2].push(t);
    }

    const exams = open.filter((t) => t.kind === 'exam' && t.due_at && new Date(t.due_at) >= now).sort((a, b) => new Date(a.due_at) - new Date(b.due_at));
    out += '<div class="summary">' +
      '<span class="pill">' + I('tasks') + '<span class="num">' + open.length + '</span> مفتوحة</span>' +
      (groups[0][2].length ? '<span class="pill late">' + I('alert') + '<span class="num">' + groups[0][2].length + '</span> متأخرة</span>' : '') +
      (exams[0] ? '<span class="pill" style="color:#e11d48">' + I('pen') + 'أقرب اختبار ' + (daysBetween(now, new Date(exams[0].due_at)) === 0 ? 'اليوم' : 'بعد ' + nDays(daysBetween(now, new Date(exams[0].due_at)))) + '</span>' : '') +
      '</div>';

    let any = false;
    for (const [label, icon, items] of groups) {
      if (!items.length) continue;
      any = true;
      items.sort((a, b) => new Date(a.due_at || 0) - new Date(b.due_at || 0));
      out += '<div class="group-title' + (icon === 'alert' ? ' late' : '') + '">' + I(icon) + label + ' · ' + items.length + '</div>' +
        '<div class="card flush"><ul class="list">' + items.map(taskRow).join('') + '</ul></div>';
    }
    if (!any) out += '<div class="card" style="margin-top:14px">' + empty('check', 'ما عندك مهام مفتوحة', 'اضغط + وأضف واجب أو اختبار أو أي شي تبي تتذكره') + '</div>';
    const done = list.filter((t) => t.done);
    if (done.length) {
      out += '<button class="btn ghost block" style="margin-top:8px" data-action="show-done">' + I('check') + (ui.showDone ? 'خبّي المنجزة' : 'المنجزة (' + done.length + ')') + '</button>';
      if (ui.showDone) out += '<div class="card flush" style="margin-top:12px"><ul class="list">' + done.slice(-30).reverse().map(taskRow).join('') + '</ul></div>';
    }
    return out;
  }

  // ---------- العرض ----------
  const view = document.getElementById('view');
  const tabbar = document.getElementById('tabbar');
  document.getElementById('settingsIcon').innerHTML = I('settings');

  // مين يستخدم التطبيق: roles فاضية = الكل (المستخدمين القدامى يشوفون كل شي)
  const has = (r) => !Array.isArray(st.settings.roles) || !st.settings.roles.length || st.settings.roles.includes(r);
  const tabOf = (x) => (x[0] === 'schedule' && !has('student') ? ['schedule', 'جدولي', 'calendar'] : x);
  function renderTabbar() {
    const t = (x) => { x = tabOf(x); return '<button class="tab' + (ui.tab === x[0] ? ' on' : '') + '" data-tab="' + x[0] + '">' + I(x[2]) + x[1] + '</button>'; };
    tabbar.innerHTML = t(TABS[0]) + t(TABS[1]) + '<button class="add" id="addBtn" aria-label="إضافة">' + I('plus') + '</button>' + t(TABS[2]) + t(TABS[3]);
  }

  function subtitle() {
    const n = new Date();
    if (ui.tab === 'today') {
      const hr = n.getHours();
      const nm = (st.settings.name || '').trim();
      return (hr < 12 ? 'صباح الخير' : 'مساء الخير') + (nm ? ' يا ' + nm : '') + ' · ' + DAYS[n.getDay()] + ' ' + n.getDate() + ' ' + MONTHS[n.getMonth()];
    }
    if (ui.tab === 'money') return { tx: 'تتبّع صرفك ودخلك', subs: 'اشتراكاتك ومصاريفك الثابتة', goals: 'وفّر لأحلامك', debts: 'الفلوس اللي لك واللي عليك' }[ui.moneySeg];
    if (ui.tab === 'schedule') return { schedule: has('student') ? 'محاضراتك وتمرينك ومواعيدك' : 'شغلك وتمرينك ومواعيدك', focus: 'ركّز وذاكر', gpa: 'معدلك الفصلي والتراكمي' }[ui.studySeg];
    return 'واجبات واختبارات ومشاوير';
  }

  let lastTab = null;
  function render() {
    const tabInfo = tabOf(TABS.find((t) => t[0] === ui.tab));
    document.getElementById('title').textContent = tabInfo[1];
    document.getElementById('subtitle').textContent = subtitle();
    renderTabbar();
    const y = window.scrollY;
    view.innerHTML = { today: viewToday, money: viewMoney, schedule: viewStudy, tasks: viewTasks }[ui.tab]();
    if (lastTab === ui.tab) { view.style.animation = 'none'; window.scrollTo(0, y); }
    else { view.style.animation = ''; void view.offsetWidth; }
    lastTab = ui.tab;
    const dot = document.getElementById('syncDot');
    const s = S.status;
    dot.className = 'sync-dot ' + (!s.signedIn ? '' : s.error ? 'err' : s.syncing || st.pending.length ? 'busy' : 'ok');
    dot.title = !s.configured ? 'غير مربوط — البيانات على هذا الجهاز فقط' : !s.signedIn ? 'سجّل دخول للمزامنة' : s.error || 'متزامن';
  }

  function go(tab) {
    ui.tab = tab;
    writePref('tab', tab);
    render();
    window.scrollTo(0, 0);
  }

  // ---------- النوافذ ----------
  const sheet = document.getElementById('sheet');
  const sheetBody = document.getElementById('sheetBody');
  const sheetSave = document.getElementById('sheetSave');
  let sheetHandler = null;

  function openSheet({ title, body, onSave, saveLabel, cancelLabel, mount }) {
    document.getElementById('sheetTitle').textContent = title;
    document.getElementById('sheetCancel').textContent = cancelLabel || 'إلغاء';
    sheetBody.innerHTML = body;
    sheetBody.onclick = null;
    sheetBody.onchange = null;
    sheetBody.oninput = null;
    sheetHandler = onSave || null;
    sheetSave.textContent = saveLabel || 'حفظ';
    sheetSave.classList.toggle('hidden', !onSave);
    if (!sheet.open) sheet.showModal();
    sheetBody.scrollTop = 0;
    if (mount) mount(sheetBody);
  }
  function closeSheet() { sheet.close(); sheetHandler = null; }
  document.getElementById('sheetCancel').onclick = closeSheet;
  sheetSave.onclick = async () => {
    if (!sheetHandler) return;
    try {
      const keep = await sheetHandler(sheetBody);
      if (keep !== false) closeSheet();
    } catch (e) { toast(e.message || 'صار خطأ'); }
  };
  sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });

  function val(root, name) { const el = root.querySelector('[name="' + name + '"]'); return el ? el.value.trim() : ''; }
  function parseAmount(s) { return parseFloat(String(s).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٫,]/g, '.')); }

  // --- عملية مالية ---
  function txForm(tx) {
    const t = tx || { kind: 'expense', amount: '', category: 'أكل ومطاعم', occurred_at: new Date().toISOString() };
    const catGrid = (k, sel) => {
      const list = (k === 'income' ? INCOME_CATS : EXPENSE_CATS).slice();
      if (sel && !list.includes(sel)) list.push(sel);
      return list.map((c) => {
        const [ic, col] = catMeta(c, k);
        return '<button type="button" class="cat-pick' + (c === sel ? ' on' : '') + '" data-c="' + h(c) + '"><div class="ico" style="' + tint(col) + '">' + I(ic) + '</div>' + h(c) + '</button>';
      }).join('');
    };
    openSheet({
      title: tx ? 'تعديل العملية' : 'عملية جديدة',
      body:
        '<div class="seg" id="kindSeg"><button type="button" data-k="expense" class="expense' + (t.kind === 'expense' ? ' on' : '') + '">صرف</button>' +
        '<button type="button" data-k="income" class="income' + (t.kind === 'income' ? ' on' : '') + '">دخل</button></div>' +
        '<div class="amount-box"><input name="amount" inputmode="decimal" placeholder="0.000" value="' + (t.amount !== '' ? Number(t.amount).toFixed(3) : '') + '"><small>دينار بحريني</small></div>' +
        '<div class="field"><label>التصنيف</label><div class="cat-grid" id="catGrid">' + catGrid(t.kind, t.category) + '</div></div>' +
        '<div class="field"><label>المحل / الوصف</label><input name="merchant" value="' + h(t.merchant || '') + '" placeholder="مثلاً: طلبات، كوستا، راتب"></div>' +
        '<div class="field"><label>الوقت</label><input type="datetime-local" name="occurred_at" value="' + toLocalInput(new Date(t.occurred_at)) + '"></div>' +
        '<div class="field"><label>ملاحظة</label><input name="note" value="' + h(t.note || '') + '" placeholder="اختياري"></div>' +
        (t.raw ? '<div class="field"><label>نص الرسالة</label><div class="raw">' + h(t.raw) + '</div></div>' : '') +
        X('txExtra', tx) + (tx ? '<button class="btn danger block" type="button" id="delTx">' + I('trash') + 'حذف العملية</button>' : ''),
      mount(root) {
        root.dataset.kind = t.kind;
        root.dataset.cat = t.category || '';
        root.querySelector('#kindSeg').onclick = (e) => {
          const b = e.target.closest('button');
          if (!b) return;
          root.dataset.kind = b.dataset.k;
          root.dataset.cat = b.dataset.k === 'income' ? 'تحويل وارد' : 'أخرى';
          root.querySelectorAll('#kindSeg button').forEach((x) => x.classList.toggle('on', x === b));
          root.querySelector('#catGrid').innerHTML = catGrid(root.dataset.kind, root.dataset.cat);
        };
        root.querySelector('#catGrid').onclick = (e) => {
          const b = e.target.closest('.cat-pick');
          if (!b) return;
          root.dataset.cat = b.dataset.c;
          root.querySelectorAll('.cat-pick').forEach((x) => x.classList.toggle('on', x === b));
        };
        const del = root.querySelector('#delTx');
        X('txMount', root, tx);
        if (del) del.onclick = async () => { if (await ask('تحذف هالعملية؟')) { S.remove('transactions', tx.id); closeSheet(); toast('انحذفت'); } };
        if (!tx) setTimeout(() => autoFocus(root.querySelector('[name=amount]')), 300);
      },
      onSave(root) {
        const amount = parseAmount(val(root, 'amount'));
        if (!(amount > 0)) throw new Error('اكتب المبلغ');
        const when = val(root, 'occurred_at');
        const savedTx = S.upsert('transactions', Object.assign({}, tx || {}, {
          kind: root.dataset.kind,
          amount: Math.round(amount * 1000) / 1000,
          category: root.dataset.cat || (root.dataset.kind === 'income' ? 'دخل آخر' : 'أخرى'),
          merchant: val(root, 'merchant') || null,
          note: val(root, 'note') || null,
          occurred_at: when ? new Date(when).toISOString() : new Date().toISOString(),
          source: (tx && tx.source) || 'manual',
          needs_review: false,
        }));
        toast(tx ? 'تم التعديل' : 'انضافت ✓');
        if (!tx) setTimeout(() => X('afterTx', savedTx), 450);
      },
    });
  }

  // --- لصق رسالة ---
  // موافقة صريحة مرة وحدة قبل أول رسالة بنك (بيانات مالية حساسة — قانون حماية البيانات الشخصية البحريني).
  function smsConsentForm(prefill) {
    openSheet({
      title: 'قبل أول رسالة بنك',
      saveLabel: 'أوافق وأكمل',
      cancelLabel: 'مو الحين',
      body: '<div id="smsConsent"><p class="small" style="margin:0 4px 10px">رسايل البنك فيها معلومات مالية، فنبي موافقتك قبل ما نقراها:</p>' +
        '<ul class="small" style="margin:0 18px 12px;padding:0;line-height:1.9">' +
        '<li>نحفظ المبلغ والمحل والتاريخ، والرسالة نفسها بعد إخفاء أرقام البطاقة والحساب.</li>' +
        '<li>البيانات على جهازك، وتنرفع لحسابك بس لو فعّلت المزامنة.</li>' +
        '<li>ما نبيع بياناتك ولا نعرض إعلانات، وتقدر تمسح كل شي من الإعدادات ← «احذف كل بياناتي».</li></ul>' +
        '<a class="small" href="privacy.html" target="_blank" rel="noopener" style="margin:0 4px">اقرأ سياسة الخصوصية كاملة</a></div>',
      onSave() {
        S.setSettings({ sms_consent_at: new Date().toISOString() });
        setTimeout(() => pasteSmsForm(prefill), 350);
      },
    });
  }

  // prefill: نص وصل من «شارك ← حياتي» (أندرويد أو نسخة الويب المثبّتة). ما ينحفظ شي إلا بـ «إضافة».
  function pasteSmsForm(prefill) {
    const shared = typeof prefill === 'string' && prefill.trim() ? prefill.trim().slice(0, SHARE_MAX) : '';
    if (!st.settings.sms_consent_at) return smsConsentForm(shared);
    openSheet({
      title: 'لصق رسالة بنك',
      saveLabel: 'إضافة',
      body: (shared ? '<p class="small muted" id="smsShared" style="margin:0 4px 12px">وصلت من المشاركة. راجع المبلغ والمحل، وبعدين اضغط «إضافة».</p>'
        : '<p class="small muted" style="margin:0 4px 12px">انسخ رسالة البنك أو BenefitPay والصقها هنا، والتطبيق يطلّع المبلغ والمحل لحاله.</p>') +
        '<div class="field"><textarea name="sms" placeholder="مثال: Purchase of BHD 3.500 at TALABAT using card XXXX1234"></textarea></div>' +
        '<div id="smsPreview"></div>',
      mount(root) {
        const ta = root.querySelector('textarea');
        const pv = root.querySelector('#smsPreview');
        const update = () => {
          const p = ta.value.trim() ? window.SmsParser.parse(ta.value) : null;
          if (!ta.value.trim()) { pv.innerHTML = ''; return; }
          if (!p) { pv.innerHTML = '<div class="card">' + empty('alert', 'ما لقيت مبلغ', 'تأكد إنها رسالة عملية مالية') + '</div>'; return; }
          pv.innerHTML = '<div class="card"><div class="row" style="cursor:default">' + catIcon(p.category, p.kind) +
            '<div class="main"><div class="title"><span class="t">' + h(p.merchant || p.category) + '</span></div><div class="sub">' + h(p.category) + ' · ' + (p.kind === 'income' ? 'دخل' : 'صرف') + '</div></div>' +
            '<div class="amount ' + p.kind + '"><span class="num">' + fmt(p.amount) + '</span><span class="cur">' + p.currency + '</span></div></div>' +
            (p.needs_review ? '<p class="small" style="color:var(--warn);margin:4px 0 0">مو متأكد ١٠٠٪، بتنضاف وعليها علامة «راجعها»</p>' : '<p class="small" style="color:var(--income);margin:4px 0 0">' + I('check') + ' فهمتها</p>') + '</div>';
        };
        ta.addEventListener('input', update);
        if (shared) { ta.value = shared; update(); } else setTimeout(() => autoFocus(ta), 300);
      },
      onSave(root) {
        const tx = S.smsToTransaction(val(root, 'sms'), new Date().toISOString());
        if (!tx) throw new Error('ما قدرت أقرأ مبلغ من الرسالة');
        const savedSms = S.upsert('transactions', tx);
        setTimeout(() => X('afterTx', savedSms), 450);
        toast('انضافت ✓');
      },
    });
  }

  // «شارك ← حياتي»: يستنى لين تنقرا البيانات (عشان نعرف هل وافق قبل)، ويسكّر أي نافذة مفتوحة
  const SHARE_MAX = 2000;
  let booted = null;
  function sharedSms(text) {
    const t = String(text == null ? '' : text).trim();
    if (!t) return Promise.resolve(null);
    return (booted || Promise.resolve()).catch(() => {}).then(whenUnlocked).then(() => {
      if (document.querySelector('#sheet[open]')) closeSheet();
      return new Promise((done) => setTimeout(() => {
        const kind = st.settings.sms_consent_at ? 'form' : 'consent';
        pasteSmsForm(t);
        done(kind);
      }, 60));
    });
  }
  // التطبيق مقفول برمز؟ النافذة ما تنفتح فوق القفل، تستنى لين يفتح
  function whenUnlocked() {
    if (!document.body.classList.contains('locked')) return Promise.resolve();
    return new Promise((done) => {
      const mo = new MutationObserver(() => { if (!document.body.classList.contains('locked')) { mo.disconnect(); done(); } });
      mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    });
  }
  // نسخة الويب المثبّتة: manifest share_target يفتح ./?share_text=…
  function sharedFromUrl() {
    let q;
    try { q = new URLSearchParams(location.search); } catch (e) { return; }
    const t = [q.get('share_title'), q.get('share_text'), q.get('share_url')].filter(Boolean).join('\n');
    if (!q.has('share_text') && !q.has('share_title')) return;
    try { history.replaceState(null, '', location.pathname); } catch (e) { /* تجاهل */ }
    if (t) sharedSms(t);
  }

  function budgetForm() {
    openSheet({
      title: 'الميزانية الشهرية',
      body: '<p class="small muted" style="margin:0 4px 4px;text-align:center">كم تبي تصرف بالشهر بالحد الأقصى؟</p>' +
        '<div class="amount-box"><input name="budget" inputmode="decimal" placeholder="0.000" value="' + (st.settings.budget ? Number(st.settings.budget).toFixed(3) : '') + '"><small>دينار بحريني</small></div>' +
        '<div class="chips" style="justify-content:center;margin:12px 0 18px">' + [100, 150, 200, 300].map((n) => '<button type="button" class="chip" data-v="' + n + '">' + n + '</button>').join('') + '</div>' +
        (st.settings.budget ? '<button class="btn danger block" type="button" id="rmBudget">' + I('trash') + 'إلغاء الميزانية</button>' : ''),
      mount(root) {
        root.querySelector('.chips').onclick = (e) => { const b = e.target.closest('[data-v]'); if (b) root.querySelector('[name=budget]').value = Number(b.dataset.v).toFixed(3); };
        const b = root.querySelector('#rmBudget');
        if (b) b.onclick = () => { S.setSettings({ budget: null }); closeSheet(); };
      },
      onSave(root) {
        const n = parseAmount(val(root, 'budget'));
        if (!(n > 0)) throw new Error('اكتب مبلغ صحيح');
        S.setSettings({ budget: Math.round(n * 1000) / 1000 });
        toast('تم ✓');
      },
    });
  }

  // --- مادة ---
  function courseForm(c, presetType) {
    const x = c || { name: '', type: presetType || (has('student') ? 'lecture' : 'activity'), days: [ui.day], start_time: presetType === 'gym' ? '18:00' : '08:00', end_time: presetType === 'gym' ? '19:00' : '09:15', room: '', color: presetType === 'gym' ? '#10b981' : COLORS[st.courses.length % COLORS.length] };
    const ph = { lecture: 'مثلاً: رياضيات ١٠١', gym: 'مثلاً: جيم — صدر وتراي', activity: 'مثلاً: دورة إنجليزي' };
    openSheet({
      title: c ? 'تعديل' : 'إضافة للجدول',
      body:
        '<div class="seg" id="typeSeg">' + ['lecture', 'gym', 'activity'].map((k) => '<button type="button" data-k="' + k + '" class="' + ((x.type || 'lecture') === k ? 'on' : '') + '">' + ACT_TYPES[k].label + '</button>').join('') + '</div>' +
        '<div class="field"><label>الاسم</label><input name="name" value="' + h(x.name) + '" placeholder="' + ph[x.type || 'lecture'] + '"></div>' +
        '<div class="field"><label>الأيام</label><div class="chips" id="daysPick">' + DAYS.map((d, i) =>
          '<button type="button" class="chip' + (x.days.includes(i) ? ' on' : '') + '" data-d="' + i + '">' + d + '</button>').join('') + '</div></div>' +
        '<div class="two"><div class="field"><label>تبدأ</label><input type="time" name="start_time" value="' + h(x.start_time) + '"></div>' +
        '<div class="field"><label>تخلص</label><input type="time" name="end_time" value="' + h(x.end_time) + '"></div></div>' +
        '<div class="field"><label>المكان</label><input name="room" value="' + h(x.room || '') + '" placeholder="القاعة، المبنى، اسم الجيم… (اختياري)"></div>' +
        '<div class="field"><label>اللون</label><div class="colors" id="colorPick">' + COLORS.map((col) =>
          '<button type="button" style="background:' + col + '" data-c="' + col + '" class="' + (col === x.color ? 'on' : '') + '" aria-label="لون"></button>').join('') + '</div></div>' +
        (c ? '<button class="btn danger block" type="button" id="delCourse">' + I('trash') + 'حذف</button>' :
          '<button class="btn block" type="button" id="saveNext">' + I('plus') + 'احفظ وأضف ثاني</button>'),
      mount(root) {
        root.dataset.type = x.type || 'lecture';
        segPick(root, '#typeSeg', (k) => { root.dataset.type = k; root.querySelector('[name=name]').placeholder = ph[k]; });
        root.querySelector('#daysPick').onclick = (e) => { const b = e.target.closest('button'); if (b) b.classList.toggle('on'); };
        root.querySelector('#colorPick').onclick = (e) => {
          const b = e.target.closest('button');
          if (!b) return;
          root.querySelectorAll('#colorPick button').forEach((y) => y.classList.toggle('on', y === b));
        };
        const del = root.querySelector('#delCourse');
        if (del) del.onclick = async () => { if (await ask('تحذفها من الجدول؟')) { S.remove('courses', c.id); closeSheet(); toast('انحذفت'); } };
        if (!c) setTimeout(() => autoFocus(root.querySelector('[name=name]')), 300);
        // يحفظ ويخلي النوع والأيام والوقت مثل ما هي، ويفضي الاسم والمكان بس
        const next = root.querySelector('#saveNext');
        if (next) next.onclick = () => {
          try { save(root); } catch (e) { toast(e.message); return; }
          root.querySelector('[name=name]').value = '';
          root.querySelector('[name=room]').value = '';
          const cols = [...root.querySelectorAll('#colorPick button')];
          const on = cols.findIndex((b) => b.classList.contains('on'));
          cols.forEach((b, i) => b.classList.toggle('on', i === (on + 1) % cols.length));
          toast('انضافت ✓ · اكتب اللي بعدها');
          autoFocus(root.querySelector('[name=name]'));
        };
      },
      onSave(root) {
        save(root);
        toast(c ? 'تم التعديل' : 'انضاف للجدول ✓ — لا تنسى تحدّث التقويم');
      },
    });
    function save(root) {
        const name = val(root, 'name');
        if (!name) throw new Error('اكتب الاسم');
        const days = [...root.querySelectorAll('#daysPick .on')].map((b) => Number(b.dataset.d));
        if (!days.length) throw new Error('اختر يوم واحد على الأقل');
        const start = val(root, 'start_time'), end = val(root, 'end_time');
        if (end && minutesOf(end) <= minutesOf(start)) throw new Error('وقت النهاية لازم بعد البداية');
        const col = root.querySelector('#colorPick .on');
        S.upsert('courses', Object.assign({}, c || {}, { name, type: root.dataset.type, days, start_time: start, end_time: end, room: val(root, 'room') || null, color: col ? col.dataset.c : COLORS[0] }));
    }
  }

  // --- مهمة ---
  function taskForm(t, presetKind) {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(9, 0, 0, 0);
    const x = t || { title: '', kind: presetKind || (ui.taskFilter !== 'all' ? ui.taskFilter : 'homework'), due_at: tomorrow.toISOString(), course_id: null, notes: '', duration: 60, place: '' };
    openSheet({
      title: t ? 'تعديل المهمة' : 'مهمة جديدة',
      body:
        '<div class="seg" id="tkSeg">' + Object.entries(TASK_KINDS).map(([k, v]) => '<button type="button" data-k="' + k + '" class="' + (x.kind === k ? 'on' : '') + '">' + v.label + '</button>').join('') + '</div>' +
        '<div class="field"><label>العنوان</label><input name="title" value="' + h(x.title) + '" placeholder="مثلاً: تسليم تقرير الفيزياء، موعد الطبيب"></div>' +
        '<div class="field"><label>الموعد</label><input type="datetime-local" name="due_at" value="' + (x.due_at ? toLocalInput(new Date(x.due_at)) : '') + '"></div>' +
        '<div id="apptFields"' + (x.kind === 'appointment' ? '' : ' style="display:none"') + '><div class="field"><label>المدة</label><div class="seg" id="durSeg">' +
          [30, 60, 90, 120].map((m) => '<button type="button" data-k="' + m + '" class="' + ((Number(x.duration) || 60) === m ? 'on' : '') + '">' + (m < 60 ? m + ' د' : m / 60 + ' س') + '</button>').join('') + '</div></div>' +
        '<div class="field"><label>المكان</label><input name="place" value="' + h(x.place || '') + '" placeholder="اختياري"></div></div>' +
        (st.courses.length ? '<div class="field"><label>المادة (اختياري)</label><select name="course_id"><option value="">—</option>' +
          st.courses.map((c) => '<option value="' + c.id + '"' + (c.id === x.course_id ? ' selected' : '') + '>' + h(c.name) + '</option>').join('') + '</select></div>' : '') +
        '<div class="field"><label>ملاحظات</label><textarea name="notes" placeholder="اختياري">' + h(x.notes || '') + '</textarea></div>' +
        (t ? '<button class="btn danger block" type="button" id="delTask">' + I('trash') + 'حذف المهمة</button>' : ''),
      mount(root) {
        root.dataset.kind = x.kind;
        root.dataset.dur = Number(x.duration) || 60;
        segPick(root, '#tkSeg', (k) => { root.dataset.kind = k; root.querySelector('#apptFields').style.display = k === 'appointment' ? '' : 'none'; });
        segPick(root, '#durSeg', (k) => { root.dataset.dur = k; });
        const del = root.querySelector('#delTask');
        X('taskMount', root, t);
        if (del) del.onclick = async () => { if (await ask('تحذف المهمة؟')) { S.remove('tasks', t.id); closeSheet(); toast('انحذفت'); } };
        if (!t) setTimeout(() => autoFocus(root.querySelector('[name=title]')), 300);
      },
      onSave(root) {
        const title = val(root, 'title');
        if (!title) throw new Error('اكتب عنوان المهمة');
        const due = val(root, 'due_at');
        S.upsert('tasks', Object.assign({}, t || { done: false }, {
          title, kind: root.dataset.kind, due_at: due ? new Date(due).toISOString() : null,
          course_id: val(root, 'course_id') || null, notes: val(root, 'notes') || null,
          duration: root.dataset.kind === 'appointment' ? Number(root.dataset.dur) : null,
          place: root.dataset.kind === 'appointment' ? val(root, 'place') || null : null,
        }));
        toast(t ? 'تم التعديل' : 'انضافت ✓');
      },
    });
  }

  function addChooser() {
    const item = (k, icon, color, title, sub) => '<button data-pick="' + k + '"><div class="ico" style="' + tint(color) + '">' + I(icon) + '</div><div style="flex:1"><b>' + title + '</b><small>' + sub + '</small></div></button>';
    openSheet({
      title: 'إضافة',
      body: '<div class="menu">' +
        item('tx', 'wallet', '#1A8A8F', 'مصروف أو دخل', 'سجّل عملية بيدك') +
        item('sms', 'message', '#0d9488', 'لصق رسالة بنك', 'يقرأ المبلغ والمحل تلقائياً') +
        item('task', 'tasks', '#e11d48', 'مهمة / واجب / اختبار', 'مع موعد وتذكير') +
        item('appt', 'clock', '#f59e0b', 'موعد', 'طبيب، مشوار، اجتماع…') +
        item('course', 'graduation', '#1A8A8F', 'محاضرة للجدول', 'تتكرر كل أسبوع') +
        item('gym', 'dumbbell', '#10b981', 'تمرين / جيم', 'يقولك «الحين وقت التمرين»') +
        item('sub', 'repeat', '#8b5cf6', 'اشتراك ثابت', 'نتفليكس، باقة الجوال…') +
        item('debt', 'users', '#0891b2', 'لي وعلي', 'سلّفت أحد أو استلفت') + X('chooserItems', item) + '</div>',
      mount(root) {
        root.onclick = (e) => {
          const b = e.target.closest('[data-pick]');
          if (!b) return;
          const picks = { tx: () => txForm(), sms: pasteSmsForm, task: () => taskForm(), appt: () => taskForm(null, 'appointment'), course: () => courseForm(null, 'lecture'), gym: () => courseForm(null, 'gym'), sub: () => subForm(), debt: () => debtForm() };
          if (picks[b.dataset.pick]) picks[b.dataset.pick](); else X('pick', b.dataset.pick);
        };
      },
    });
  }

  // --- اشتراك ---
  function subForm(x) {
    const today = new Date();
    const v = x || { name: '', amount: '', cycle: 'monthly', day: today.getDate(), month: today.getMonth() + 1, category: 'فواتير واتصالات', remind_days: 2, active: true };
    openSheet({
      title: x ? 'تعديل الاشتراك' : 'اشتراك جديد',
      body:
        (x ? '' : '<div class="chips" id="subPresets" style="margin-bottom:14px">' + SUB_PRESETS.map(([n]) => '<button type="button" class="chip" data-n="' + h(n) + '">' + h(n) + '</button>').join('') + '</div>') +
        '<div class="field"><label>الاسم</label><input name="name" value="' + h(v.name) + '" placeholder="مثلاً: نتفليكس"></div>' +
        '<div class="amount-box"><input name="amount" inputmode="decimal" placeholder="0.000" value="' + (v.amount !== '' ? Number(v.amount).toFixed(3) : '') + '"><small>دينار بحريني</small></div>' +
        '<div class="seg" id="cycleSeg"><button type="button" data-k="monthly" class="' + (v.cycle !== 'yearly' ? 'on' : '') + '">شهري</button><button type="button" data-k="yearly" class="' + (v.cycle === 'yearly' ? 'on' : '') + '">سنوي</button></div>' +
        '<div class="two"><div class="field"><label>يوم التجديد</label><input name="day" type="number" min="1" max="31" inputmode="numeric" value="' + (v.day || 1) + '"></div>' +
        '<div class="field" id="monthField"' + (v.cycle === 'yearly' ? '' : ' style="display:none"') + '><label>الشهر</label><select name="month">' + MONTHS.map((mn, i) => '<option value="' + (i + 1) + '"' + (Number(v.month) === i + 1 ? ' selected' : '') + '>' + mn + '</option>').join('') + '</select></div></div>' +
        '<div class="field"><label>التصنيف</label><select name="category">' + EXPENSE_CATS.map((c) => '<option' + (c === v.category ? ' selected' : '') + '>' + c + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>نبّهني قبلها بـ</label><div class="seg" id="remindSeg">' + [0, 1, 2, 3, 7].map((d) => '<button type="button" data-k="' + d + '" class="' + (Number(v.remind_days) === d ? 'on' : '') + '">' + (d === 0 ? 'يومها' : nDays(d)) + '</button>').join('') + '</div></div>' +
        (x ? '<label class="switch" style="margin-bottom:14px"><input type="checkbox" name="active"' + (v.active !== false ? ' checked' : '') + '> الاشتراك فعّال</label>' +
          '<button class="btn danger block" type="button" id="delSub">' + I('trash') + 'حذف الاشتراك</button>' : ''),
      mount(root) {
        root.dataset.cycle = v.cycle || 'monthly';
        root.dataset.remind = v.remind_days != null ? v.remind_days : 2;
        const presets = root.querySelector('#subPresets');
        if (presets) presets.onclick = (e) => {
          const b = e.target.closest('[data-n]');
          if (!b) return;
          const p = SUB_PRESETS.find((q) => q[0] === b.dataset.n);
          root.querySelector('[name=name]').value = p[0];
          root.querySelector('[name=category]').value = p[1];
          root.querySelectorAll('#subPresets .chip').forEach((c) => c.classList.toggle('on', c === b));
        };
        segPick(root, '#cycleSeg', (k) => { root.dataset.cycle = k; root.querySelector('#monthField').style.display = k === 'yearly' ? '' : 'none'; });
        segPick(root, '#remindSeg', (k) => { root.dataset.remind = k; });
        const del = root.querySelector('#delSub');
        if (del) del.onclick = async () => { if (await ask('تحذف الاشتراك؟ (المصاريف اللي انسجلت قبل تبقى)')) { S.remove('subscriptions', x.id); closeSheet(); toast('انحذف'); } };
      },
      onSave(root) {
        const name = val(root, 'name');
        if (!name) throw new Error('اكتب اسم الاشتراك');
        const amount = parseAmount(val(root, 'amount'));
        if (!(amount > 0)) throw new Error('اكتب المبلغ');
        const day = Math.min(31, Math.max(1, parseInt(val(root, 'day'), 10) || 1));
        const active = root.querySelector('[name=active]');
        const startDate = x && x.start_date ? x.start_date : today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate());
        S.upsert('subscriptions', Object.assign({}, x || {}, {
          name, amount: Math.round(amount * 1000) / 1000, cycle: root.dataset.cycle, day,
          month: root.dataset.cycle === 'yearly' ? Number(val(root, 'month')) : null,
          category: val(root, 'category'), remind_days: Number(root.dataset.remind), active: active ? active.checked : true,
          start_date: startDate, last_posted: x ? x.last_posted || null : null,
        }));
        postSubscriptions();
        toast(x ? 'تم التعديل' : 'انضاف ✓ وبينسجّل تلقائياً يوم التجديد');
      },
    });
  }

  function segPick(root, sel, fn) {
    root.querySelector(sel).onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      root.querySelectorAll(sel + ' button').forEach((y) => y.classList.toggle('on', y === b));
      fn(b.dataset.k);
    };
  }

  // --- هدف توفير ---
  // قوالب جاهزة للأهداف (مع بنود التكلفة)
  const GOAL_PRESETS = [
    { name: 'الزواج', emoji: '💍', color: '#ec4899', items: ['المهر', 'الشبكة والذهب', 'القاعة والعشاء', 'الأثاث', 'شهر العسل', 'الملابس والتجهيزات'] },
    { name: 'سيارة', emoji: '🚗', color: '#0ea5e9', items: ['الدفعة الأولى', 'التأمين والتسجيل'] },
    { name: 'لابتوب', emoji: '💻', color: '#1A8A8F', items: [] },
    { name: 'سفر', emoji: '✈️', color: '#f59e0b', items: ['التذاكر', 'الفندق', 'المصروف'] },
    { name: 'عمرة', emoji: '🕋', color: '#10b981', items: [] },
    { name: 'صندوق طوارئ', emoji: '🛟', color: '#64748b', items: [] },
  ];

  function goalForm(g) {
    const v = g || { name: '', emoji: '', target: '', saved: 0, deadline: '', color: COLORS[st.goals.length % COLORS.length], items: [] };
    const itemRow = (it) => '<div class="item-row"><input class="it-name" value="' + h(it.name || '') + '" placeholder="البند">' +
      '<input class="it-amt" inputmode="decimal" value="' + (it.amount ? Number(it.amount).toFixed(3) : '') + '" placeholder="0.000">' +
      '<button type="button" class="it-del" aria-label="حذف البند">' + I('minus') + '</button></div>';
    openSheet({
      title: g ? 'تعديل الهدف' : 'هدف جديد',
      body:
        (g ? '' : '<div class="chips" id="goalPresets" style="margin-bottom:14px">' + GOAL_PRESETS.map((p, i) => '<button type="button" class="chip" data-i="' + i + '">' + p.emoji + ' ' + p.name + '</button>').join('') + '</div>') +
        '<div class="field"><label>وش تبي توفّر له؟</label><input name="name" value="' + h(v.name) + '" placeholder="مثلاً: الزواج، سيارة، لابتوب"></div>' +
        '<div class="field"><label>بنود التكلفة (اختياري — المجموع يصير هو الهدف)</label><div id="items">' + (v.items || []).map(itemRow).join('') + '</div>' +
        '<button type="button" class="btn ghost block" id="addItem" style="margin-top:6px">' + I('plus') + 'إضافة بند</button></div>' +
        '<div class="amount-box"><input name="target" inputmode="decimal" placeholder="0.000" value="' + (v.target !== '' ? Number(v.target).toFixed(3) : '') + '"><small id="targetHint">المبلغ المطلوب (د.ب)</small></div>' +
        (g ? '' : '<div class="field"><label>وفّرت منه للحين (اختياري)</label><input name="saved" inputmode="decimal" placeholder="0.000"></div>') +
        '<div class="field"><label>متى تبي توصل له؟ (اختياري)</label><input type="date" name="deadline" value="' + h(v.deadline || '') + '"></div>' +
        '<div class="field"><label>اللون</label><div class="colors" id="colorPick">' + COLORS.concat(['#ec4899']).filter((c, i, a) => a.indexOf(c) === i).map((col) =>
          '<button type="button" style="background:' + col + '" data-c="' + col + '" class="' + (col === v.color ? 'on' : '') + '" aria-label="لون"></button>').join('') + '</div></div>' +
        (g ? '<button class="btn danger block" type="button" id="delGoal">' + I('trash') + 'حذف الهدف</button>' : ''),
      mount(root) {
        root.dataset.emoji = v.emoji || '';
        const itemsEl = root.querySelector('#items');
        const targetEl = root.querySelector('[name=target]');
        const hint = root.querySelector('#targetHint');
        const sync = () => {
          const amts = [...itemsEl.querySelectorAll('.it-amt')].map((x) => parseAmount(x.value) || 0);
          const has = itemsEl.children.length > 0;
          targetEl.readOnly = has;
          if (has) targetEl.value = amts.reduce((a, b) => a + b, 0).toFixed(3);
          hint.textContent = has ? 'المجموع من البنود (د.ب)' : 'المبلغ المطلوب (د.ب)';
        };
        itemsEl.addEventListener('input', sync);
        itemsEl.onclick = (e) => { const d = e.target.closest('.it-del'); if (d) { d.parentElement.remove(); sync(); } };
        root.querySelector('#addItem').onclick = () => { itemsEl.insertAdjacentHTML('beforeend', itemRow({})); itemsEl.lastElementChild.querySelector('.it-name').focus(); sync(); };
        const presets = root.querySelector('#goalPresets');
        if (presets) presets.onclick = (e) => {
          const b = e.target.closest('[data-i]');
          if (!b) return;
          const p = GOAL_PRESETS[Number(b.dataset.i)];
          root.querySelectorAll('#goalPresets .chip').forEach((c) => c.classList.toggle('on', c === b));
          root.querySelector('[name=name]').value = p.name;
          root.dataset.emoji = p.emoji;
          itemsEl.innerHTML = p.items.map((n) => itemRow({ name: n })).join('');
          root.querySelectorAll('#colorPick button').forEach((y) => y.classList.toggle('on', y.dataset.c === p.color));
          sync();
          const first = itemsEl.querySelector('.it-amt');
          if (first) first.focus();
        };
        root.querySelector('#colorPick').onclick = (e) => {
          const b = e.target.closest('button');
          if (b) root.querySelectorAll('#colorPick button').forEach((y) => y.classList.toggle('on', y === b));
        };
        const del = root.querySelector('#delGoal');
        if (del) del.onclick = async () => { if (await ask('تحذف الهدف؟')) { S.remove('goals', g.id); closeSheet(); toast('انحذف'); } };
        sync();
      },
      onSave(root) {
        const name = val(root, 'name');
        if (!name) throw new Error('اكتب اسم الهدف');
        const items = [...root.querySelectorAll('#items .item-row')].map((r) => ({
          name: r.querySelector('.it-name').value.trim(), amount: Math.round((parseAmount(r.querySelector('.it-amt').value) || 0) * 1000) / 1000,
        })).filter((it) => it.name || it.amount);
        const target = items.length ? items.reduce((a, it) => a + it.amount, 0) : parseAmount(val(root, 'target'));
        if (!(target > 0)) throw new Error(items.length ? 'اكتب مبالغ البنود' : 'اكتب المبلغ المطلوب');
        const col = root.querySelector('#colorPick .on');
        const saved = g ? Number(g.saved) || 0 : parseAmount(val(root, 'saved')) || 0;
        S.upsert('goals', Object.assign({}, g || {}, {
          name, emoji: root.dataset.emoji || null, items, target: Math.round(target * 1000) / 1000, saved,
          deadline: val(root, 'deadline') || null, color: col ? col.dataset.c : COLORS[0], done: saved >= target,
        }));
        toast(g ? 'تم التعديل' : 'انضاف الهدف 🎯 بالتوفيق!');
      },
    });
  }

  function goalMoneyForm(g, sign) {
    openSheet({
      title: sign > 0 ? 'أضف لـ ' + g.name : 'اسحب من ' + g.name,
      saveLabel: sign > 0 ? 'أضف' : 'اسحب',
      body: '<div class="amount-box"><input name="amt" inputmode="decimal" placeholder="0.000"><small>دينار بحريني · وفّرت ' + fmt(g.saved) + ' من ' + fmt(g.target) + '</small></div>' +
        '<div class="chips" style="justify-content:center;margin:12px 0">' + [5, 10, 20, 50].map((n) => '<button type="button" class="chip" data-v="' + n + '">' + n + '</button>').join('') + '</div>',
      mount(root) {
        root.querySelector('.chips').onclick = (e) => { const b = e.target.closest('[data-v]'); if (b) root.querySelector('[name=amt]').value = Number(b.dataset.v).toFixed(3); };
        setTimeout(() => autoFocus(root.querySelector('[name=amt]')), 300);
      },
      onSave(root) {
        const a = parseAmount(val(root, 'amt'));
        if (!(a > 0)) throw new Error('اكتب المبلغ');
        const saved = Math.max(0, Math.round(((Number(g.saved) || 0) + sign * a) * 1000) / 1000);
        const done = saved >= Number(g.target);
        S.upsert('goals', Object.assign({}, g, { saved, done }));
        toast(done && !g.done ? '🎉 مبروك! حققت هدف ' + g.name : sign > 0 ? 'انضاف ✓' : 'انسحب');
      },
    });
  }

  // --- لي وعلي ---
  function debtForm(d) {
    const v = d || { person: '', amount: '', direction: 'lent', note: '', occurred_at: new Date().toISOString(), settled: false };
    const people = [...new Set(st.debts.map((x) => x.person))];
    openSheet({
      title: d ? 'تعديل' : 'لي وعلي',
      body:
        '<div class="seg" id="dirSeg"><button type="button" data-k="lent" class="income' + (v.direction === 'lent' ? ' on' : '') + '">لي (سلّفت)</button>' +
        '<button type="button" data-k="borrowed" class="expense' + (v.direction === 'borrowed' ? ' on' : '') + '">علي (استلفت)</button></div>' +
        '<div class="amount-box"><input name="amount" inputmode="decimal" placeholder="0.000" value="' + (v.amount !== '' ? Number(v.amount).toFixed(3) : '') + '"><small>دينار بحريني</small></div>' +
        '<div class="field"><label>الشخص</label><input name="person" list="peopleList" value="' + h(v.person) + '" placeholder="مثلاً: أحمد"><datalist id="peopleList">' + people.map((p) => '<option value="' + h(p) + '">').join('') + '</datalist></div>' +
        '<div class="field"><label>ملاحظة</label><input name="note" value="' + h(v.note || '') + '" placeholder="مثلاً: غدا يوم الخميس"></div>' +
        '<div class="field"><label>التاريخ</label><input type="datetime-local" name="occurred_at" value="' + toLocalInput(new Date(v.occurred_at)) + '"></div>' +
        (d ? '<label class="switch" style="margin-bottom:14px"><input type="checkbox" name="settled"' + (v.settled ? ' checked' : '') + '> تم السداد</label>' +
          '<button class="btn danger block" type="button" id="delDebt">' + I('trash') + 'حذف</button>' : ''),
      mount(root) {
        root.dataset.dir = v.direction;
        segPick(root, '#dirSeg', (k) => { root.dataset.dir = k; });
        const del = root.querySelector('#delDebt');
        if (del) del.onclick = async () => { if (await ask('تحذفها؟')) { S.remove('debts', d.id); closeSheet(); toast('انحذفت'); } };
        if (!d) setTimeout(() => autoFocus(root.querySelector('[name=amount]')), 300);
      },
      onSave(root) {
        const amount = parseAmount(val(root, 'amount'));
        if (!(amount > 0)) throw new Error('اكتب المبلغ');
        const person = val(root, 'person');
        if (!person) throw new Error('اكتب اسم الشخص');
        const when = val(root, 'occurred_at');
        const settled = root.querySelector('[name=settled]');
        S.upsert('debts', Object.assign({}, d || {}, {
          person, amount: Math.round(amount * 1000) / 1000, direction: root.dataset.dir, note: val(root, 'note') || null,
          occurred_at: when ? new Date(when).toISOString() : new Date().toISOString(), settled: settled ? settled.checked : false,
        }));
        toast(d ? 'تم التعديل' : 'انسجلت ✓');
      },
    });
  }

  // --- درجة مادة ---
  function currentSemester() {
    const n = new Date(), m = n.getMonth() + 1;
    if (m >= 9) return 'خريف ' + n.getFullYear();
    if (m === 1) return 'خريف ' + (n.getFullYear() - 1);
    if (m <= 5) return 'ربيع ' + n.getFullYear();
    return 'صيف ' + n.getFullYear();
  }
  function gradeForm(g) {
    const sems = semesterOrder();
    const v = g || { semester: sems[0] || currentSemester(), course_name: '', credits: 3, grade: 'A' };
    const names = [...new Set(lectures().map((c) => c.name).concat(st.grades.map((x) => x.course_name)))];
    openSheet({
      title: g ? 'تعديل الدرجة' : 'درجة جديدة',
      body:
        '<div class="field"><label>الفصل</label><input name="semester" list="semList" value="' + h(v.semester) + '"><datalist id="semList">' +
          [...new Set(sems.concat([currentSemester()]))].map((x) => '<option value="' + h(x) + '">').join('') + '</datalist></div>' +
        '<div class="field"><label>المادة</label><input name="course_name" list="crsList" value="' + h(v.course_name) + '" placeholder="اسم المادة"><datalist id="crsList">' +
          names.map((x) => '<option value="' + h(x) + '">').join('') + '</datalist></div>' +
        '<div class="field"><label>الساعات</label><div class="seg" id="crSeg">' + [1, 2, 3, 4, 6].map((c) => '<button type="button" data-k="' + c + '" class="' + (Number(v.credits) === c ? 'on' : '') + '">' + c + '</button>').join('') + '</div></div>' +
        '<div class="field"><label>الدرجة</label><div class="grade-grid" id="grSeg">' + Object.keys(GRADE_POINTS).map((k) =>
          '<button type="button" data-k="' + k + '" class="' + (v.grade === k ? 'on' : '') + '">' + k + '<small>' + GRADE_POINTS[k].toFixed(2) + '</small></button>').join('') + '</div></div>' +
        (g ? '<button class="btn danger block" type="button" id="delGrade">' + I('trash') + 'حذف</button>' : ''),
      mount(root) {
        root.dataset.cr = v.credits;
        root.dataset.gr = v.grade;
        segPick(root, '#crSeg', (k) => { root.dataset.cr = k; });
        segPick(root, '#grSeg', (k) => { root.dataset.gr = k; });
        const del = root.querySelector('#delGrade');
        if (del) del.onclick = async () => { if (await ask('تحذفها؟')) { S.remove('grades', g.id); closeSheet(); } };
      },
      onSave(root) {
        const semester = val(root, 'semester'), course = val(root, 'course_name');
        if (!semester) throw new Error('اكتب الفصل');
        if (!course) throw new Error('اكتب اسم المادة');
        S.upsert('grades', Object.assign({}, g || {}, { semester, course_name: course, credits: Number(root.dataset.cr), grade: root.dataset.gr }));
        const c = cumulative();
        toast('المعدل التراكمي: ' + (c.gpa != null ? c.gpa.toFixed(2) : '—'));
      },
    });
  }

  function priorGpaForm() {
    openSheet({
      title: 'معدلك السابق',
      body: '<p class="small muted" style="margin:0 4px 12px">إذا ما تبي تدخّل كل موادك القديمة، حط معدلك التراكمي وساعاتك قبل الفصول اللي بتضيفها هنا.</p>' +
        '<div class="two"><div class="field"><label>المعدل التراكمي</label><input name="gpa" inputmode="decimal" placeholder="3.20" value="' + (st.settings.prior_gpa != null ? st.settings.prior_gpa : '') + '"></div>' +
        '<div class="field"><label>الساعات المجتازة</label><input name="cr" inputmode="numeric" placeholder="45" value="' + (st.settings.prior_credits != null ? st.settings.prior_credits : '') + '"></div></div>' +
        (st.settings.prior_gpa != null ? '<button class="btn danger block" type="button" id="rmPrior">' + I('trash') + 'إزالة</button>' : ''),
      mount(root) {
        const b = root.querySelector('#rmPrior');
        if (b) b.onclick = () => { S.setSettings({ prior_gpa: null, prior_credits: null }); closeSheet(); };
      },
      onSave(root) {
        const gpa = parseAmount(val(root, 'gpa')), cr = parseAmount(val(root, 'cr'));
        if (!(gpa >= 0 && gpa <= 4)) throw new Error('المعدل لازم بين 0 و 4');
        if (!(cr > 0)) throw new Error('اكتب عدد الساعات');
        S.setSettings({ prior_gpa: Math.round(gpa * 100) / 100, prior_credits: cr });
      },
    });
  }

  function sessionForm() {
    const lec = lectures();
    openSheet({
      title: 'تسجيل مذاكرة',
      body: '<div class="field"><label>المادة</label><select name="course"><option value="">عام</option>' + lec.map((c) => '<option value="' + c.id + '"' + (ui.focusCourse === c.id ? ' selected' : '') + '>' + h(c.name) + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>كم دقيقة ذاكرت؟</label><div class="seg" id="minSeg">' + [15, 30, 45, 60, 90, 120].map((m) => '<button type="button" data-k="' + m + '" class="' + (m === 60 ? 'on' : '') + '">' + m + '</button>').join('') + '</div></div>' +
        '<div class="field"><label>متى؟</label><input type="datetime-local" name="when" value="' + toLocalInput(new Date(Date.now() - 3600000)) + '"></div>',
      mount(root) { root.dataset.min = 60; segPick(root, '#minSeg', (k) => { root.dataset.min = k; }); },
      onSave(root) {
        const when = val(root, 'when');
        logSession(val(root, 'course'), when ? new Date(when) : new Date(), Number(root.dataset.min));
        toast('انسجلت ✓');
      },
    });
  }

  // --- التقويم ---
  function prayerDays(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const d = startOfDay(new Date()); d.setDate(d.getDate() + i);
      for (const x of X('agenda', d) || []) if (x.type === 'prayer') out.push({ key: x.id.replace('prayer-', ''), name: x.name, date: d, start: x.start, dur: x.end - x.start });
    }
    return out;
  }
  function calendarForm() {
    const saved = (() => { try { return JSON.parse(localStorage.getItem('hayati-cal') || '{}'); } catch (e) { return {}; } })();
    openSheet({
      title: 'التنبيهات',
      saveLabel: 'تصدير',
      body:
        '<div class="card" style="display:flex;gap:12px;align-items:center"><div class="ico" style="' + tint('#1A8A8F') + '">' + I('bell') + '</div>' +
        '<p class="small" style="margin:0;color:var(--text-2)">محاضراتك وتمرينك ومواعيدك والصلاة تنضاف لتقويم آبل مع تنبيه قبلها وتنبيه «الحين وقت…». ينبّهك على الآيفون والماك حتى لو التطبيق مسكّر.</p></div>' +
        '<div class="field"><label>نبّهني قبل المحاضرة بـ</label><div class="seg" id="beforeSeg">' + [5, 10, 15, 30].map((m) =>
          '<button type="button" data-m="' + m + '" class="' + ((saved.before || 10) === m ? 'on' : '') + '">' + m + ' د</button>').join('') + '</div></div>' +
        '<div class="field"><label>نهاية الفصل الدراسي (تتوقف المواعيد بعدها)</label><input type="date" name="end" value="' + h(saved.end || '') + '"></div>' +
        '<label class="switch"><input type="checkbox" name="tasks"' + (saved.tasks === false ? '' : ' checked') + '> الواجبات والاختبارات والمواعيد الجاية</label>' +
        '<label class="switch" style="margin-top:8px"><input type="checkbox" name="subs"' + (saved.subs === false ? '' : ' checked') + '> تذكير تجديد الاشتراكات</label>' +
        ((X('agenda', new Date()) || []).some((x) => x.type === 'prayer') ? '<label class="switch" style="margin-top:8px"><input type="checkbox" name="prayers"' + (saved.prayers === false ? '' : ' checked') + '> أوقات الصلاة لـ 30 يوم (صدّر من جديد كل شهر)</label>' : '') +
        '<div class="group-title">بعد الضغط على «تصدير»</div><ol class="steps">' +
        (inClaude() ? '<li><b>من رابط claude.ai:</b> ينحفظ ملف <code>hayati-calendar.txt</code>. على الماك غيّر اسمه إلى <code>hayati.ics</code> وافتحه، واختر تقويم <b>iCloud</b> عشان يوصل للآيفون.</li>' :
          '<li><b>على الماك (الأسهل):</b> ينزل ملف <code>hayati.ics</code>، افتحه واختر تقويم <b>iCloud</b> عشان يوصل للآيفون.</li>') +
        '<li><b>على الآيفون:</b> يطلع لك «إضافة الكل» وتختار التقويم.</li>' +
        '<li>إذا عدّلت جدولك، احذف التقويم القديم وصدّر من جديد. الأسهل تسوي تقويم اسمه «الجامعة» وتختاره كل مرة.</li></ol>',
      mount(root) {
        root.dataset.before = saved.before || 10;
        root.querySelector('#beforeSeg').onclick = (e) => {
          const b = e.target.closest('button');
          if (!b) return;
          root.dataset.before = b.dataset.m;
          root.querySelectorAll('#beforeSeg button').forEach((y) => y.classList.toggle('on', y === b));
        };
      },
      onSave(root) {
        const pr = root.querySelector('[name=prayers]');
        const opts = { before: Number(root.dataset.before), end: val(root, 'end'), tasks: root.querySelector('[name=tasks]').checked, subs: root.querySelector('[name=subs]').checked, prayers: pr ? pr.checked : false };
        try { localStorage.setItem('hayati-cal', JSON.stringify(opts)); } catch (e) { /* تجاهل */ }
        const { text, count } = window.CalendarExport.build({ courses: st.courses, tasks: st.tasks, subscriptions: opts.subs ? st.subscriptions : [], remindBefore: opts.before, semesterEnd: opts.end, includeTasks: opts.tasks, prayers: opts.prayers ? prayerDays(30) : [] });
        if (!count) throw new Error('ما فيه شي أصدّره، أضف موادك أول');
        if (inClaude()) saveFile('hayati-calendar.txt', text, 'text/plain').then((ok) => { if (ok) toast('غيّر امتداد الملف إلى ‎.ics‎ وافتحه بالتقويم'); });
        else if (window.HayatiNative) window.HayatiNative.saveFile('hayati.ics', text, 'text/calendar');
        else window.CalendarExport.download(text, 'hayati.ics');
        toast('تم تجهيز ' + count + ' موعد');
      },
    });
  }

  // --- الإعدادات ---
  function settingsSheet() {
    const s = S.status;
    const cfg = S.getConfig();
    let body = '';

    body += '<div class="group-title">' + I('user') + 'حسابك</div><div class="card account-card">';
    if (s.mode === 'artifact') {
      body += '<div class="status-line"><div class="ico">' + I('check') + '</div><div style="flex:1;min-width:0"><b style="display:block">محفوظ في حسابك على Claude</b>' +
        '<span class="small ' + (s.error ? 'late' : 'muted') + '">' + (s.error ? h(s.error) : 'افتح نفس الرابط من الجوال أو الماك وتلقى نفس بياناتك' + (s.lastSync ? ' · آخر تحديث ' + timeOf(s.lastSync) : '')) +
        (st.pending.length ? ' · ' + st.pending.length + ' بانتظار الحفظ' : '') + '</span></div></div>';
    } else if (!s.configured) {
      body += '<p class="small muted" style="margin:0 0 12px">البيانات الحين على هذا الجهاز بس. اربط التطبيق بـ Supabase عشان تتزامن (الخطوات في ملف «طريقة التشغيل»).</p>' +
        '<div class="field"><label>Project URL</label><input name="sb_url" class="ltr" placeholder="https://xxxx.supabase.co" autocapitalize="off" autocorrect="off"></div>' +
        '<div class="field"><label>anon public key</label><input name="sb_key" class="ltr" placeholder="eyJhbGciOi…" autocapitalize="off" autocorrect="off"></div>' +
        '<button class="btn primary block" data-set="connect">' + I('link') + 'ربط</button>';
    } else if (!s.signedIn) {
      const prov = S.providers();
      body += '<p class="small muted" style="margin:0 0 12px">بياناتك لك بروحك، وتتزامن بين جوالك والماك.</p>' +
        (prov.includes('apple') ? '<button class="btn block sso apple" data-set="sso" data-p="apple">' + SSO_ICON.apple + 'تابع مع Apple</button>' : '') +
        (prov.includes('google') ? '<button class="btn block sso google" data-set="sso" data-p="google">' + SSO_ICON.google + 'تابع مع Google</button>' : '') +
        (prov.length ? '<div class="or-line"><span>أو بالإيميل</span></div>' : '') +
        '<div class="field"><label>الإيميل</label><input name="email" type="email" class="ltr" autocomplete="username" autocapitalize="off"></div>' +
        '<div class="field"><label>كلمة المرور</label><input name="password" type="password" class="ltr" autocomplete="current-password"></div>' +
        '<div class="btn-row"><button class="btn primary" data-set="signin">دخول</button><button class="btn" data-set="signup">حساب جديد</button></div>' +
        '<button class="btn ghost block" style="margin-top:6px" data-set="forgot">نسيت كلمة المرور؟</button>' +
        '<p class="small muted" style="margin:10px 2px 0">بدون حساب؟ التطبيق يشتغل عادي، وبياناتك على جهازك بس.</p>' +
        (cfg && !cfg.fromFile ? '<button class="btn ghost block" style="margin-top:10px" data-set="disconnect">تغيير بيانات Supabase</button>' : '');
    } else {
      const via = { apple: 'Apple', google: 'Google' }[s.provider];
      body += '<div class="status-line"><div class="ico">' + I('user') + '</div><div style="flex:1;min-width:0"><b style="display:block;overflow:hidden;text-overflow:ellipsis">' + h(s.email || 'حسابك') + '</b>' +
        (via ? '<span class="small muted" style="display:block">مسجّل بـ ' + via + '</span>' : '') +
        '<span class="small ' + (s.error ? 'late' : 'muted') + '">' + (s.error ? h(s.error) : s.lastSync ? 'آخر مزامنة ' + timeOf(s.lastSync) : 'جاري المزامنة…') +
        (st.pending.length ? ' · ' + st.pending.length + ' بانتظار الرفع' : '') + '</span></div></div>' +
        '<div class="btn-row" style="margin-top:14px"><button class="btn" data-set="sync">' + I('refresh') + 'زامن</button><button class="btn" data-set="signout">' + I('logout') + 'خروج</button></div>';
    }
    body += '</div>';

    body += '<div class="group-title">' + I('message') + 'تسجيل رسايل البنك تلقائياً</div><div class="card">';
    if (s.mode === 'artifact') {
      body += '<p class="small muted" style="margin:0 0 12px">التسجيل التلقائي من الاختصارات يحتاج قاعدة بيانات Supabase (الخطوات في ملف «طريقة التشغيل»). للحين: انسخ رسالة البنك والصقها، والتطبيق يقرأها لحاله.</p>' +
        '<button class="btn primary block" data-set="paste">' + I('message') + 'لصق رسالة بنك</button>';
    } else if (!s.signedIn) {
      body += '<p class="small muted" style="margin:0">تحتاج تربط المزامنة وتسجّل دخول أول. للحين تقدر تلصق الرسالة يدوياً من قسم المصاريف.</p>';
    } else {
      const token = S.ensureIngestToken();
      const url = cfg.url + '/rest/v1/rpc/ingest_sms';
      const copy = (label, value) => '<div class="copy-box"><code>' + h(label) + '</code><button data-copy="' + h(value) + '">' + I('copy') + 'نسخ</button></div>';
      body += '<p class="small muted" style="margin:0 0 8px">نسوي أتمتة في تطبيق <b>الاختصارات</b>، وكل ما توصلك رسالة من البنك أو Benefit تنرسل للتطبيق.</p>' +
        '<ol class="steps">' +
        '<li>افتح <b>الاختصارات</b> ← <b>الأتمتة</b> ← <b>+</b> ← <b>الرسائل</b>.</li>' +
        '<li><b>المرسل:</b> اسم البنك أو BenefitPay (أو «الرسالة تحتوي على» <code>BHD</code>)، واختر <b>تشغيل فوراً</b>.</li>' +
        '<li>أضف إجراء <b>«الحصول على محتويات URL»</b> بهذا الرابط:</li></ol>' + copy(url, url) +
        '<ol class="steps" start="4"><li>غيّر <b>الطريقة</b> إلى <b>POST</b>، وأضف في <b>الترويسات</b> <code>apikey</code> بهذي القيمة:</li></ol>' + copy(cfg.key.slice(0, 22) + '…', cfg.key) +
        '<ol class="steps" start="5"><li><b>نص الطلب: JSON</b>، حقل <code>token</code> بهذي القيمة:</li></ol>' + copy(token.slice(0, 16) + '…', token) +
        '<ol class="steps" start="6"><li>وحقل <code>body</code> قيمته <b>«مُدخل الاختصار»</b> أو <b>«المحتوى»</b>.</li>' +
        '<li>خلاص ✓ الرسايل الجديدة تطلع في المصاريف لما تفتح التطبيق.</li></ol>' +
        '<p class="small muted" style="margin:4px 0 10px">الرمز السري مثل المفتاح، لا تشاركه مع أحد.</p>' +
        '<button class="btn ghost block" data-set="rotate">' + I('key') + 'تغيير الرمز السري</button>';
    }
    body += '</div>';

    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    body += '<div class="group-title">' + I('bell') + 'التنبيهات</div><div class="card">' +
      '<p class="small muted" style="margin:0 0 12px">أضمن طريقة إنك تضيف الجدول للتقويم، فينبّهك حتى لو التطبيق مسكّر.</p>' +
      '<button class="btn primary block" data-set="calendar">' + I('calendar') + 'أضف الجدول للتقويم</button>' +
      (perm === 'default' ? '<button class="btn ghost block" style="margin-top:10px" data-set="notify">' + I('bell') + 'تنبيهات التطبيق (لما يكون مفتوح)</button>' :
        perm === 'granted' ? '<p class="small muted" style="margin:10px 0 0">تنبيهات التطبيق مفعّلة ✓</p>' : '') + '</div>';

    body += X('settingsExtra');
    body += '<div class="group-title">' + I('settings') + 'عام</div><div class="menu">' +
      '<button data-set="budget"><div class="ico" style="' + tint('#1A8A8F') + '">' + I('target') + '</div><div style="flex:1"><b>الميزانية الشهرية</b><small>' + (st.settings.budget ? fmt(st.settings.budget) + ' د.ب' : 'غير محددة') + '</small></div>' + I('chevL') + '</button>' +
      '<button data-set="export"><div class="ico" style="' + tint('#0d9488') + '">' + I('download') + '</div><div style="flex:1"><b>نسخة احتياطية</b><small>' + (lastBackup() ? 'آخر نسخة: ' + (daysBetween(lastBackup(), new Date()) === 0 ? 'اليوم' : 'قبل ' + nDays(daysBetween(lastBackup(), new Date()))) : 'تصدير كل بياناتك كملف') + '</small></div>' + I('chevL') + '</button>' +
      '<button data-set="export-csv"><div class="ico" style="' + tint('#16a34a') + '">' + I('download') + '</div><div style="flex:1"><b>صدّر مصاريفك (Excel)</b><small>كل العمليات بملف ينفتح بـ Excel وNumbers</small></div>' + I('chevL') + '</button>' +
      '<label style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:16px;border:1px solid var(--border);background:var(--surface);cursor:pointer"><div class="ico" style="' + tint('#f59e0b') + '">' + I('upload') + '</div><div style="flex:1"><b style="display:block">استيراد نسخة</b><small class="muted">من ملف نسخة احتياطية</small></div><input type="file" accept="application/json,.json" data-set="import" hidden></label>' +
      '</div>';

    body += '<div class="group-title">' + I('phone') + 'ثبّت التطبيق</div><div class="card"><p class="small" style="margin:0;color:var(--text-2)"><b>آيفون:</b> افتح الرابط في Safari ← زر المشاركة ← <b>إضافة إلى الشاشة الرئيسية</b>.<br>' +
      '<b>ماك:</b> Safari ← ملف ← <b>إضافة إلى Dock</b>.</p></div>';

    openSheet({
      title: 'الإعدادات',
      cancelLabel: 'تم',
      body,
      mount(root) {
        root.onclick = onSettingsClick;
        const imp = root.querySelector('[data-set=import]');
        if (imp) imp.onchange = async () => {
          const f = imp.files[0];
          if (!f) return;
          try { const n = S.importJSON(await f.text()); toast('استوردت ' + n + ' عنصر'); render(); } catch (e) { toast('الملف غير صالح'); }
        };
      },
    });
  }

  async function onSettingsClick(e) {
    const cp = e.target.closest('[data-copy]');
    if (cp) {
      try { await navigator.clipboard.writeText(cp.dataset.copy); toast('انسخ ✓'); } catch (err) { prompt('انسخ من هنا:', cp.dataset.copy); }
      return;
    }
    const b = e.target.closest('button[data-set]');
    if (!b) return;
    const root = sheetBody;
    const act = b.dataset.set;
    try {
      if (window.Extras && window.Extras.settingsAction && await window.Extras.settingsAction(act, root, b)) return;
      if (act === 'connect') {
        const url = val(root, 'sb_url'), key = val(root, 'sb_key');
        if (!/^https:\/\/.+\.supabase\.(co|in)\/?$/.test(url)) throw new Error('الرابط لازم يكون مثل https://xxxx.supabase.co');
        if (key.length < 30) throw new Error('المفتاح ناقص');
        await S.saveConfig(url, key);
        toast('انربط ✓ سجّل دخول الحين');
        settingsSheet();
      } else if (act === 'signin' || act === 'signup') {
        const email = val(root, 'email'), pw = root.querySelector('[name=password]').value;
        if (!email || !pw) throw new Error('اكتب الإيميل وكلمة المرور');
        b.disabled = true;
        if (act === 'signin') { await S.signIn(email, pw); toast('أهلاً 👋'); }
        else {
          const confirmNeeded = await S.signUp(email, pw);
          toast(confirmNeeded ? 'أرسلنا لك إيميل تأكيد، أكّده وارجع سجّل دخول' : 'تم إنشاء الحساب ✓');
        }
        setTimeout(settingsSheet, 300);
      } else if (act === 'sso') {
        b.disabled = true;
        // بالآيفون: متصفح النظام (Google يمنع الدخول من داخل التطبيق). بالمتصفح: تحويل ورجوع
        if (window.HayatiNative && window.HayatiNative.oauth) { await window.HayatiNative.oauth(b.dataset.p); setTimeout(settingsSheet, 300); }
        else await S.signInWithProvider(b.dataset.p);
      } else if (act === 'forgot') {
        const email = val(root, 'email');
        if (!email) throw new Error('اكتب إيميلك فوق أول');
        await S.resetPassword(email);
        toast('أرسلنا رابط تغيير كلمة المرور لإيميلك');
      } else if (act === 'signout') {
        if (!(await ask('تطلع؟ بياناتك محفوظة بحسابك، وبتنمسح من هالجهاز.'))) return;
        try { await S.signOut(); }
        catch (err) {
          if (err.code !== 'PENDING') throw err;
          if (!(await ask('فيه ' + err.count + ' تعديل ما انرفع (يمكن ما فيه نت). لو طلعت الحين تضيع. تطلع؟'))) return;
          await S.signOut({ force: true });
        }
        toast('طلعت ✓'); settingsSheet();
      } else if (act === 'disconnect') {
        S.clearConfig(); settingsSheet();
      } else if (act === 'sync') {
        await S.sync(); toast(S.status.error || 'تمت المزامنة ✓'); settingsSheet();
      } else if (act === 'rotate') {
        if (await ask('بعد التغيير لازم تحدّث الرمز في الاختصار. أكمل؟')) { S.rotateIngestToken(); settingsSheet(); toast('تغيّر الرمز'); }
      } else if (act === 'notify') {
        const p = await Notification.requestPermission();
        toast(p === 'granted' ? 'تم التفعيل ✓' : 'ما انسمح بالتنبيهات');
        settingsSheet();
      } else if (act === 'calendar') {
        calendarForm();
      } else if (act === 'paste') {
        pasteSmsForm();
      } else if (act === 'budget') {
        budgetForm();
      } else if (act === 'export') {
        await backupNow();
      } else if (act === 'export-csv') {
        const csv = expensesCSV();
        if (!csv) toast('ما فيه عمليات للتصدير');
        else await saveFile('hayati-expenses-' + new Date().toISOString().slice(0, 10) + '.csv', csv, 'text/csv');
      }
    } catch (err) {
      toast(err.message || 'صار خطأ');
    } finally {
      b.disabled = false;
    }
  }

  // ---------- الأحداث ----------
  tabbar.onclick = (e) => {
    if (e.target.closest('#addBtn')) {
      if (ui.tab === 'money') ({ tx: () => txForm(), subs: () => subForm(), goals: () => goalForm(), debts: () => debtForm() })[ui.moneySeg]();
      else if (ui.tab === 'schedule') ({ schedule: () => courseForm(), focus: sessionForm, gpa: () => gradeForm() })[ui.studySeg]();
      else if (ui.tab === 'tasks' && X('tasksFab')) return;
      else ({ today: addChooser, tasks: () => taskForm() })[ui.tab]();
      return;
    }
    const b = e.target.closest('button.tab');
    if (b) go(b.dataset.tab);
  };
  document.getElementById('settingsBtn').onclick = settingsSheet;

  view.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    e.preventDefault();
    const id = el.dataset.id;
    switch (el.dataset.action) {
      case 'go': go(el.dataset.tab); break;
      case 'edit-tx': txForm(st.transactions.find((t) => t.id === id)); break;
      case 'add-tx': txForm(); break;
      case 'add-course': courseForm(null, el.dataset.type); break;
      case 'paste-sms': pasteSmsForm(); break;
      case 'budget': budgetForm(); break;
      case 'edit-course': courseForm(courseById(id)); break;
      case 'open-workout': { const c = courseById(id); if (c && c.workout) workoutSheet(c); else courseForm(c); break; }
      case 'edit-task': taskForm(st.tasks.find((t) => t.id === id)); break;
      case 'toggle-task': {
        e.stopPropagation();
        const t = st.tasks.find((x) => x.id === id);
        if (t) { S.upsert('tasks', Object.assign({}, t, { done: !t.done })); if (!t.done) toast('أحسنت 💪'); }
        break;
      }
      case 'calendar': calendarForm(); break;
      case 'month': {
        const k = shiftKey(ui.month, Number(el.dataset.d));
        if (k <= monthKey(new Date())) { ui.month = k; render(); }
        break;
      }
      case 'day': ui.day = Number(el.dataset.d); render(); break;
      case 'task-filter': ui.taskFilter = el.dataset.k; render(); break;
      case 'show-done': ui.showDone = !ui.showDone; render(); break;
      case 'money-seg': ui.moneySeg = el.dataset.k; writePref('moneySeg', ui.moneySeg); render(); break;
      case 'study-seg': ui.studySeg = el.dataset.k; writePref('studySeg', ui.studySeg); render(); break;
      case 'report': reportSheet(); break;
      case 'import-seed': {
        const list = (ui.seed && ui.seed.courses) || [];
        let n = 0;
        for (const c of list) if (!st.courses.some((x) => x.id === c.id)) { S.upsert('courses', c); n++; }
        toast('انضاف ' + n + ' مواد لجدولك ✓');
        break;
      }
      case 'add-sub': subForm(); break;
      case 'edit-sub': subForm(st.subscriptions.find((x) => x.id === id)); break;
      case 'add-goal': goalForm(); break;
      case 'edit-goal': goalForm(st.goals.find((x) => x.id === id)); break;
      case 'goal-money': { e.stopPropagation(); goalMoneyForm(st.goals.find((x) => x.id === id), Number(el.dataset.sign)); break; }
      case 'add-debt': debtForm(); break;
      case 'edit-debt': debtForm(st.debts.find((x) => x.id === id)); break;
      case 'toggle-debt': {
        e.stopPropagation();
        const d = st.debts.find((x) => x.id === id);
        if (d) { S.upsert('debts', Object.assign({}, d, { settled: !d.settled })); if (!d.settled) toast('انسدّت ✓'); }
        break;
      }
      case 'show-settled': ui.showSettled = !ui.showSettled; render(); break;
      case 'add-grade': gradeForm(); break;
      case 'edit-grade': gradeForm(st.grades.find((x) => x.id === id)); break;
      case 'prior-gpa': priorGpaForm(); break;
      case 'focus-course': ui.focusCourse = el.dataset.id; writePref('focusCourse', ui.focusCourse); render(); break;
      case 'focus-len': S.setSettings({ focus_minutes: Number(el.dataset.k) }); break;
      case 'timer-start': timerStart(); render(); break;
      case 'timer-pause': timerPause(); render(); break;
      case 'timer-resume': timerResume(); render(); break;
      case 'timer-stop': timerStop(); render(); break;
      case 'add-session': sessionForm(); break;
      case 'noop': break;
      case 'open-course': if (window.Extras && window.Extras.courseSheet) window.Extras.courseSheet(courseById(id)); else courseForm(courseById(id)); break;
      case 'cat-budgets': X('catBudgetsForm'); break;
      default: X('action', el.dataset.action, el, e); break;
      case 'del-session': ask('تحذف هالجلسة؟').then((ok) => { if (ok) S.remove('study_sessions', id); }); break;
    }
  });

  // ---------- تنبيهات داخل التطبيق (لما يكون مفتوح) ----------
  const fired = new Set();
  async function notify(title, body) {
    toast(title + (body ? ' — ' + body : ''));
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const reg = navigator.serviceWorker && (await navigator.serviceWorker.getRegistration());
      if (reg) reg.showNotification(title, { body, icon: 'icons/icon-192.png', lang: 'ar', dir: 'rtl' });
      else new Notification(title, { body });
    } catch (e) { /* تجاهل */ }
  }
  function tick() {
    const now = new Date();
    const nm = nowMinutes();
    const before = (() => { try { return JSON.parse(localStorage.getItem('hayati-cal') || '{}').before || 10; } catch (e) { return 10; } })();
    const dayKey = now.toDateString();
    for (const c of agendaOn(now)) {
      const ty = ACT_TYPES[c.type] || ACT_TYPES.lecture;
      const k1 = c.id + dayKey + 'pre', k2 = c.id + dayKey + 'now';
      if (nm === c.start - before && !fired.has(k1)) { fired.add(k1); notify('باقي ' + before + ' دقايق', ty.label + ': ' + c.name + (c.room ? ' — ' + c.room : '')); }
      if (nm === c.start && !fired.has(k2)) { fired.add(k2); notify(ty.now + (c.type === 'gym' ? '' : ': ' + c.name), c.type === 'gym' ? c.name : c.room ? '📍 ' + c.room : ''); }
    }
    postSubscriptions();
    X('tick');
    const typing = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if ((ui.tab === 'today' || ui.tab === 'schedule') && !sheet.open && !typing) render();
  }
  setInterval(tick, 30000);

  // ---------- البداية ----------
  S.subscribe(() => { if (!sheet.open) render(); });
  sheet.addEventListener('close', render);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  // واجهة للإضافات
  window.App = {
    S, st, I, ui, h, fmt, money, tint, catMeta, catIcon, pad, monthKey, shiftKey, monthRange, monthLabel, payday, sameDay, startOfDay, daysBetween, time12, timeOf, minutesOf,
    nowMinutes, toLocalInput, dayLabel, nDays, toast, ask, courseById, lectures, lecturesOn, agendaOn, empty, secHead, ring, openSheet,
    closeSheet, val, parseAmount, segPick, render, go, txForm, txInMonth, sums, mmss, hhmm, gpaOf, cumulative, semesterOrder, courseForm, taskForm,
    notify, has, nextRenewal, sharedSms, expensesCSV, lastBackup, markBackup, backupNow, APP_VERSION, DAYS, DAYS_SHORT, MONTHS, EXPENSE_CATS, COLORS, GRADE_POINTS, TASK_KINDS, ACT_TYPES, saveFile,
  };
  setInterval(timerTickUI, 1000);
  timerCheck();
  postSubscriptions();
  render();
  booted = S.init().then(async () => {
    ui.month = monthKey(new Date());   // يوم الراتب ما كان محمّل لما انحسب أول مرة
    postSubscriptions();
    render();
    ui.seed = await S.getSeed();
    if (ui.seed) render();
  });
  sharedFromUrl();
})();
