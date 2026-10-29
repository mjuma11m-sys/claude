// 📱 نسخة الآيفون (Capacitor): تنبيهات «الحين وقت…» والتطبيق مسكّر، اهتزاز خفيف، ومشاركة الملفات
//   بالمتصفح (Vercel وClaude) هالملف ما يسوي شي، لأن Capacitor مو موجود
(function () {
  'use strict';

  const Cap = window.Capacitor;
  if (!Cap || typeof Cap.isNativePlatform !== 'function' || !Cap.isNativePlatform()) return;
  const A = window.App, S = A && A.S;
  if (!S) return;
  // Capacitor 8: الإضافة ما تبين بـ Capacitor.Plugins إلا بعد registerPlugin (من capacitor.js اللي يحطه cap-www.js)
  const plug = (n) => (Cap.Plugins && Cap.Plugins[n]) || (typeof Cap.registerPlugin === 'function' ? Cap.registerPlugin(n) : null);
  const LN = plug('LocalNotifications'), Hap = plug('Haptics'), Share = plug('Share'), FS = plug('Filesystem');
  const Browser = plug('Browser'), AppP = plug('App'), ShareIn = plug('ShareIn');

  const DAYS = 7;      // iOS يسمح بـ 64 تنبيه مجدول بالكثير، فنجدول أسبوع بس
  const MAX = 60;
  const BEFORE = 10;   // دقايق قبل المحاضرة/التمرين/الموعد
  const ASKED = 'hayati-notif-asked';
  const TEST_ID = 990001;
  // ⚙️ التنبيهات: كل نوع له مفتاح، وملخص الصباح مقفل افتراضياً (ما نزعج)
  const PREFS = 'hayati-notif-prefs';
  const DEF = { lectures: true, attend: true, exams: true, homework: true, subs: true, trips: true, brief: false, briefAt: '07:00', checkin: false, checkinAt: '21:30', adhkar: false };
  function prefs() {
    try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem(PREFS) || '{}')); } catch (e) { return Object.assign({}, DEF); }
  }
  function savePrefs(p) { try { localStorage.setItem(PREFS, JSON.stringify(p)); } catch (e) { /* تجاهل */ } }
  const TASK_ACTIONS = 'HAYATI_TASK', ATTEND_ACTIONS = 'HAYATI_ATTEND', LOG_ACTIONS = 'HAYATI_LOG';
  const ATTEND_DAYS = 2, ATTEND_AFTER = 5;   // سؤال الحضور: يومين بس (حد iOS)، بعد المحاضرة بـ 5 دقايق
  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const SNOOZE = 'hayati-snoozes', HOUR = 3600e3;
  function snoozes() {
    let list = [];
    try { list = JSON.parse(localStorage.getItem(SNOOZE) || '[]'); } catch (e) { /* تجاهل */ }
    return Array.isArray(list) ? list.filter((z) => z && z.at > Date.now()) : [];
  }
  function saveSnoozes(list) { try { localStorage.setItem(SNOOZE, JSON.stringify(list)); } catch (e) { /* تجاهل */ } }
  const EVENING = 20 * 60;          // تذكير «بكرة…» الساعة 8 الليل
  const TASK_DAYS = 14, SUB_DAYS = 30;

  // رقم ثابت لكل تنبيه (iOS يبي int)
  function nid(key) {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
    return Math.abs(h) % 2000000000 + 1;
  }

  const at = (day, minutes) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes);
  const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayWord = (n) => (n === 0 ? 'اليوم' : n === 1 ? 'بكرة' : n === 2 ? 'بعد يومين' : 'بعد ' + n + ' أيام');

  // التنبيهات الجاية: الجدول والصلاة، الاختبارات والواجبات، تجديد الاشتراكات، وملخص الصباح
  function upcoming(now, p) {
    p = p || prefs();
    const out = [];
    const add = (key, when, title, body, extra) => {
      if (!(when > now)) return;
      // التنبيه يطلع من النظام مو من الصفحة، فنترجمه هني لو التطبيق بالإنقليزي (DW-030)
      const L = window.HayatiLang;
      if (L && L.lang === 'en' && typeof L.tr === 'function') { title = L.tr(title); body = L.tr(body || ''); }
      const n = { id: nid(key), title, body: body || '', schedule: { at: when, allowWhileIdle: true }, extra: extra || { kind: 'today' } };
      if (extra && extra.act) n.actionTypeId = extra.act === 'attend' ? ATTEND_ACTIONS : extra.act === 'log' ? LOG_ACTIONS : TASK_ACTIONS;   // «حضرت/غبت» أو «خلصته/بعد ساعة» أو «سجّل»
      out.push(n);
    };
    const today = midnight(now);

    // 📅 الجدول (محاضرات، تمرين، مواعيد) والصلاة لو مفعّلة
    if (p.lectures) {
      for (let d = 0; d < DAYS; d++) {
        const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + d);
        for (const it of A.agendaOn(day)) {
          const prayer = it.type === 'prayer';
          const t = A.ACT_TYPES[it.type] || A.ACT_TYPES.activity;
          add(it.src + ':' + it.id + ':' + day.toDateString(), at(day, it.start - (prayer ? 0 : BEFORE)),
            prayer ? t.now + ' ' + it.name : 'بعد ' + BEFORE + ' دقايق: ' + it.name,
            prayer ? '' : [t.label, it.room].filter(Boolean).join(' · '),
            it.src === 'task' ? { kind: 'task', id: it.id } : { kind: 'today' });
        }
      }
    }

    // 🎓 «حضرت X؟» بعد كل محاضرة، للطالب بس، وما يرن إذا جاوبت داخل التطبيق
    if (p.attend && (!A.has || A.has('student'))) {
      for (let d = 0; d < ATTEND_DAYS; d++) {
        const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + d), k = dayKey(day);
        for (const c of A.lecturesOn(day.getDay())) {
          if (c.type && c.type !== 'lecture') continue;
          if ([c.attended, c.absences, c.skipped].some((l) => Array.isArray(l) && l.includes(k))) continue;
          const end = c.end_time ? A.minutesOf(c.end_time) : A.minutesOf(c.start_time) + 50;
          add('attend:' + c.id + ':' + k, at(day, end + ATTEND_AFTER), 'حضرت ' + c.name + '؟',
            ['خلصت ' + A.time12(A.hhmm(end)), c.room].filter(Boolean).join(' · '), { kind: 'attend', id: c.id, day: k, act: 'attend' });
        }
      }
    }

    // 📝 الاختبارات والواجبات: الليلة اللي قبلها، والاختبار كمان قبله بساعتين
    const horizon = new Date(today.getFullYear(), today.getMonth(), today.getDate() + TASK_DAYS + 1);
    for (const tk of (A.st.tasks || [])) {
      if (tk.done || !tk.due_at) continue;
      const due = new Date(tk.due_at);
      if (!(due > now) || due > horizon) continue;
      const exam = tk.kind === 'exam', hw = tk.kind === 'homework';
      if ((exam && !p.exams) || (hw && !p.homework) || (!exam && !hw)) continue;
      const dueDay = midnight(due);
      const eve = new Date(dueDay.getFullYear(), dueDay.getMonth(), dueDay.getDate() - 1);
      const ex = { kind: 'task', id: tk.id, act: true };
      add('task-eve:' + tk.id, at(eve, EVENING), (exam ? 'بكرة اختبار: ' : 'بكرة تسليم: ') + tk.title, exam ? 'راجع وارتاح زين 🤍' : '', ex);
      if (exam) {
        const mins = due.getHours() * 60 + due.getMinutes();
        // اختبار قبل 9:30 الصبح: التذكير 7:30، مو بنص الليل
        const when = mins < 9 * 60 + 30 ? at(dueDay, 7 * 60 + 30) : new Date(due.getTime() - 2 * 3600e3);
        add('task-day:' + tk.id, when, (mins < 9 * 60 + 30 ? 'اليوم' : 'بعد ساعتين') + ': اختبار ' + tk.title, tk.place || '', ex);
      }
    }

    // 💳 تجديد الاشتراكات: قبلها بـ remind_days (افتراضي يوم) الساعة 8 الليل
    if (p.subs && A.nextRenewal) {
      const subHorizon = new Date(today.getFullYear(), today.getMonth(), today.getDate() + SUB_DAYS);
      for (const sub of (A.st.subscriptions || [])) {
        if (sub.active === false) continue;
        const ren = A.nextRenewal(sub, now);
        if (!ren || ren > subHorizon) continue;
        const rd0 = sub.remind_days === '' || sub.remind_days == null ? 2 : Number(sub.remind_days);
        const before = Math.max(0, Math.min(7, isNaN(rd0) ? 2 : rd0));
        const rd = midnight(ren);
        const day = new Date(rd.getFullYear(), rd.getMonth(), rd.getDate() - before);
        add('sub:' + sub.id + ':' + rd.toDateString(), at(day, before === 0 ? 9 * 60 : EVENING),
          dayWord(before) + ' يتجدد: ' + sub.name, A.fmt(sub.amount) + ' د.ب', { kind: 'sub', id: sub.id });
      }
    }

    // 🧳 قبل السفر بـ 3 أيام والليلة اللي قبله، مع كم غرض باقي (DW-033)
    if (p.trips && window.Extras && window.Extras.Travel && window.Extras.Travel.reminders) {
      for (const r of window.Extras.Travel.reminders()) add(r.key, r.at, r.title, r.body, r.extra);
    }

    // ☀️ ملخص الصباح (اختياري): محاضرات اليوم واختباراته وتسليماته
    if (p.brief) {
      const [bh, bm] = String(p.briefAt || '07:00').split(':').map(Number);
      for (let d = 0; d < DAYS; d++) {
        const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + d);
        const items = A.agendaOn(day).filter((it) => it.type !== 'prayer');
        const dueToday = (A.st.tasks || []).filter((tk) => !tk.done && tk.due_at && midnight(new Date(tk.due_at)).getTime() === day.getTime() && (tk.kind === 'exam' || tk.kind === 'homework'));
        if (!items.length && !dueToday.length) continue;   // يوم فاضي = ما نزعج
        const parts = [];
        if (items.length) parts.push((items.length === 1 ? 'شي واحد بجدولك' : items.length === 2 ? 'شيئين بجدولك' : items.length + ' أشياء بجدولك') + '، أولها ' + A.time12(A.hhmm(items[0].start)));
        for (const tk of dueToday) parts.push((tk.kind === 'exam' ? 'اختبار ' : 'تسليم ') + tk.title);
        add('brief:' + day.toDateString(), at(day, (bh || 0) * 60 + (bm || 0)), 'صباح الخير ☀️ هذا يومك', parts.join(' · '));
      }
    }

    // 🌙 «سكّر يومك» (اختياري، DW-013): بس لو ما سجلت ولا عملية ذاك اليوم. الأيام الجاية تنعاد جدولتها كل ما تفتح التطبيق
    if (p.checkin) {
      const [ch, cm] = String(p.checkinAt || '21:30').split(':').map(Number);
      const logged = (day) => (A.st.transactions || []).some((t) => t.occurred_at && midnight(new Date(t.occurred_at)).getTime() === day.getTime());
      for (let d = 0; d < DAYS; d++) {
        const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + d);
        if (logged(day)) continue;
        add('checkin:' + day.toDateString(), at(day, (ch || 0) * 60 + (cm || 0)), 'سكّر يومك 🌙', 'صرفت شي اليوم؟ سجّله بدقيقة عشان شهرك يطلع صح', { kind: 'checkin', act: 'log' });
      }
    }

    // 📿 تذكير الأذكار (اختياري، DW-014): بعد الفجر والعصر بنص ساعة، من أوقات الصلاة نفسها. بدون أي نص أذكار
    if (p.adhkar && window.Extras && window.Extras.prayerTimes) {
      const pm = (A.st.settings && A.st.settings.prayer_method) || 'jafari';
      for (let d = 0; d < DAYS; d++) {
        const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + d);
        const t = window.Extras.prayerTimes(day, pm);
        add('adhkar-am:' + day.toDateString(), at(day, t.fajr + 30), 'وقت أذكار الصباح ☀️', '', { kind: 'today' });
        add('adhkar-pm:' + day.toDateString(), at(day, t.asr + 30), 'وقت أذكار المساء 🌙', '', { kind: 'today' });
      }
    }

    // ⏰ «ذكّرني بعد ساعة»: محفوظة لين يجي وقتها، عشان إعادة الجدولة ما تمسحها
    for (const z of snoozes()) {
      const t = (z.extra && z.extra.kind === 'task') ? (A.st.tasks || []).find((x) => x.id === z.extra.id) : null;
      if (z.extra && z.extra.kind === 'task' && (!t || t.done)) continue;   // خلّصها أو حذفها بعد ما أجّل
      add(z.key, new Date(z.at), z.title, z.body, z.extra);
    }

    return out.sort((a, b) => a.schedule.at - b.schedule.at).slice(0, MAX);
  }

  let busy = false, again = false, lastError = '';
  async function reschedule() {
    if (!LN) return;
    if (busy) { again = true; return; }
    busy = true;
    try {
      const list = upcoming(new Date());
      let perm = await LN.checkPermissions();
      // نطلب الإذن أول ما يصير عنده شي ينبّه عليه، مو أول ما يفتح التطبيق، ومرة وحدة بس
      if (perm.display === 'prompt' && list.length) {
        let asked = false;
        try { asked = localStorage.getItem(ASKED) === '1'; localStorage.setItem(ASKED, '1'); } catch (e) { /* تجاهل */ }
        if (!asked) perm = await LN.requestPermissions();
      }
      if (perm.display !== 'granted') return;
      const pending = await LN.getPending();
      // نلغي القديم ونجدول من جديد، بس تنبيه «جرّب التنبيه» يظل
      const old = pending.notifications.filter((n) => n.id !== TEST_ID);
      if (old.length) await LN.cancel({ notifications: old.map((n) => ({ id: n.id })) });
      if (list.length) await LN.schedule({ notifications: list });
    } catch (e) { lastError = String((e && (e.message || e.code)) || e); /* ما نكسر التطبيق، بس نحفظ الخطأ لشاشة «جرّب التنبيه» */ }
    finally {
      busy = false;
      if (again) { again = false; reschedule(); }
    }
  }

  let timer = null;
  const soon = () => { clearTimeout(timer); timer = setTimeout(reschedule, 800); };
  S.subscribe(soon);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) soon(); });
  soon();

  // 👆 الضغط على التنبيه: يفتح الشي نفسه. وتنبيه الواجب والاختبار فيه زرين: «✓ خلصته» و«⏰ بعد ساعة»
  //   الزرين يفتحون التطبيق (foreground) عشان الحفظ مضمون وتشوف «انحفظ ✓»
  function openFor(extra) {
    const t = extra.kind === 'task' && (A.st.tasks || []).find((x) => x.id === extra.id);
    if (extra.kind === 'task') { A.go('tasks'); if (t) setTimeout(() => A.taskForm(t), 50); else A.toast('ما لقيت المهمة، يمكن انحذفت'); return; }
    if (extra.kind === 'sub') { A.ui.moneySeg = 'subs'; A.go('money'); return; }
    if (extra.kind === 'trip' && window.Extras && window.Extras.Travel) { window.Extras.Travel.tripSheet(extra.id); return; }
    if (extra.kind === 'checkin') { A.ui.moneySeg = 'tx'; A.go('money'); setTimeout(() => A.txForm(), 50); return; }
    A.go('today');
  }
  // ✍️ «سجّل» من تنبيه «سكّر يومك» (DW-038): تكتب «1.200 قهوة» بالتنبيه نفسه وتنحفظ. لو السطر ما فيه مبلغ واضح، يفتح النموذج
  function quickLog(text) {
    const q = window.SmsParser && window.SmsParser.quick ? window.SmsParser.quick(text) : null;
    if (!q) { A.ui.moneySeg = 'tx'; A.go('money'); setTimeout(() => A.txForm(), 50); if (String(text || '').trim()) A.toast('ما لقيت المبلغ، كمّل هني'); return; }
    S.upsert('transactions', {
      kind: q.kind, amount: q.amount, category: q.category, merchant: q.merchant || null, note: null,
      occurred_at: new Date().toISOString(), source: 'manual', needs_review: false,
    });
    A.ui.moneySeg = 'tx'; A.go('money');
    A.toast('انحفظ ✓ ' + A.fmt(q.amount) + ' د.ب · ' + q.category);
  }
  function onAction(ev) {
    const n = (ev && ev.notification) || {};
    const extra = n.extra || { kind: 'today' };
    if (ev.actionId === 'log') { quickLog(ev.inputValue); return; }
    if (ev.actionId === 'done') {
      const t = (A.st.tasks || []).find((x) => x.id === extra.id);
      if (!t) { A.toast('ما لقيت المهمة، يمكن انحذفت'); return; }
      if (!t.done) S.upsert('tasks', Object.assign({}, t, { done: true }));   // reschedule يشيل تنبيهاتها الجاية
      A.go('tasks');
      A.toast('انحفظ ✓ خلصت «' + t.title + '» 💪');
      return;
    }
    if (ev.actionId === 'present' || ev.actionId === 'absent') {
      A.go('today');
      if (!A.markAttendance || !A.markAttendance(extra.id, ev.actionId === 'present' ? 'attended' : 'absences', extra.day)) A.toast('ما لقيت المادة، يمكن انحذفت');
      return;
    }
    if (ev.actionId === 'snooze') {
      const list = snoozes();
      list.push({ key: 'snooze:' + extra.id + ':' + Date.now(), at: Date.now() + HOUR, title: n.title, body: n.body || '', extra });
      saveSnoozes(list);
      soon();
      A.toast('بذكّرك بعد ساعة ⏰');
      return;
    }
    openFor(extra);
  }
  if (LN && typeof LN.registerActionTypes === 'function') {
    try {
      // أزرار التنبيه من النظام: نترجمها مرة وحدة بلغة التطبيق وقت التشغيل
      const L = window.HayatiLang, en = L && L.lang === 'en' && typeof L.tr === 'function';
      const tr = (t) => { if (en) ['title', 'inputButtonTitle', 'inputPlaceholder'].forEach((k) => { if (t[k]) t[k] = L.tr(t[k]); }); return t; };
      Promise.resolve(LN.registerActionTypes({ types: [{ id: TASK_ACTIONS, actions: [
        { id: 'done', title: '✓ خلصته', foreground: true },
        { id: 'snooze', title: '⏰ ذكّرني بعد ساعة', foreground: true },
      ] }, { id: ATTEND_ACTIONS, actions: [
        { id: 'present', title: '✓ حضرت', foreground: true },
        { id: 'absent', title: '✗ غبت', foreground: true },
      ] }, { id: LOG_ACTIONS, actions: [
        { id: 'log', title: '✍️ سجّل مصروف', input: true, inputButtonTitle: 'سجّل', inputPlaceholder: 'مثلاً: 1.200 قهوة', foreground: true },
      ] }].map((x) => Object.assign(x, { actions: x.actions.map(tr) })) })).catch(() => {});
    } catch (e) { /* نسخة قديمة بدون أزرار: التنبيه يشتغل عادي */ }
  }
  if (LN && typeof LN.addListener === 'function') {
    try { const r = LN.addListener('localNotificationActionPerformed', onAction); if (r && r.catch) r.catch(() => {}); } catch (e) { /* تجاهل */ }
  }

  // اهتزاز خفيف عند الحفظ والحذف
  const tap = (style) => { if (Hap) Hap.impact({ style }).catch(() => {}); };
  const up = S.upsert, rm = S.remove;
  S.upsert = function () { tap('LIGHT'); return up.apply(this, arguments); };
  S.remove = function () { tap('MEDIUM'); return rm.apply(this, arguments); };

  // الملفات (نسخة احتياطية، التقويم): بالآيفون ما فيه «تنزيل»، فنكتب الملف ونفتح قائمة المشاركة
  async function saveFile(filename, text) {
    if (!FS || !Share) { A.toast('المشاركة مو متوفرة بهالنسخة'); return false; }
    try {
      const w = await FS.writeFile({ path: filename, data: text, directory: 'CACHE', encoding: 'utf8' });
      await Share.share({ title: filename, files: [w.uri] });
      return true;
    } catch (e) {
      if (!/cancel/i.test(String(e && (e.message || e)))) A.toast('ما قدرت أشارك الملف');
      return false;
    }
  }

  // صورة (تقرير الشهر DW-041): نكتبها PNG بالكاش ونفتح قائمة المشاركة (حفظ بالصور، واتساب…)
  async function saveImage(filename, b64) {
    if (!FS || !Share) { A.toast('المشاركة مو متوفرة بهالنسخة'); return false; }
    try {
      const w = await FS.writeFile({ path: filename, data: b64, directory: 'CACHE' });
      await Share.share({ title: filename, files: [w.uri] });
      return true;
    } catch (e) {
      if (!/cancel/i.test(String(e && (e.message || e)))) A.toast('ما قدرت أشارك الصورة');
      return false;
    }
  }
  async function shareText(text) {
    if (!Share) return;
    if (window.HayatiCur) text = window.HayatiCur.swap(text);
    try { await Share.share({ text }); } catch (e) { /* المستخدم سكّر القائمة */ }
  }

  // ⚙️ «جرّب التنبيه»: يطلب الإذن لو لازم، ويرسل تنبيه بعد 10 ثواني، ويعرض كل خطوة
  async function testNotification() {
    const rows = [];
    const row = (ok, t) => rows.push((ok ? '✅ ' : '❌ ') + t);
    try {
      if (!LN) { row(false, 'إضافة التنبيهات مو موجودة بهالنسخة'); return rows; }
      let perm = await LN.checkPermissions();
      if (perm.display === 'prompt' || perm.display === 'prompt-with-rationale') perm = await LN.requestPermissions();
      row(perm.display === 'granted', 'الإذن: ' + perm.display);
      if (perm.display !== 'granted') { rows.push('افتح إعدادات الآيفون ← «حياتي» ← التنبيهات ← شغّلها'); return rows; }
      await LN.schedule({ notifications: [{ id: TEST_ID, title: '🔔 تجربة من «حياتي»', body: 'التنبيهات شغّالة ✓', schedule: { at: new Date(Date.now() + 10000) } }] });
      row(true, 'تنبيه التجربة بعد 10 ثواني. روح للشاشة الرئيسية وانتظر');
      await reschedule();
      const pending = (await LN.getPending()).notifications || [];
      row(pending.length > 0, 'التنبيهات المجدولة: ' + pending.length);
      const next = upcoming(new Date())[0];
      rows.push(next ? '⏰ الجاي: «' + next.title + '» ' + next.schedule.at.toLocaleString('ar-BH', { weekday: 'long', hour: 'numeric', minute: '2-digit' }) : 'ℹ️ ما فيه شي بجدولك الأسبوع الجاي ينبَّه عليه');
      if (lastError) row(false, 'آخر خطأ: ' + lastError);
    } catch (e) { row(false, 'خطأ: ' + String((e && (e.message || e.code)) || e)); }
    return rows;
  }

  // ⚙️ الإعدادات ← التنبيهات (نسخة الآيفون بس)
  const TYPES = [['lectures', '📅 الجدول والصلاة', 'قبل المحاضرة بـ 10 دقايق، والصلاة بوقتها'], ['attend', '🎓 سؤال الحضور', 'بعد كل محاضرة: حضرت ولا غبت، من التنبيه نفسه'], ['exams', '📝 الاختبارات', 'الليلة اللي قبلها، وقبل الاختبار بساعتين'],
    ['homework', '📚 الواجبات', 'الليلة اللي قبل التسليم'], ['trips', '🧳 قبل السفر', 'قبله بـ 3 أيام والليلة اللي قبله: كم غرض باقي'], ['subs', '💳 تجديد الاشتراكات', 'قبل التجديد بالأيام اللي تحددها بالاشتراك'], ['brief', '☀️ ملخص الصباح', 'جدولك واختباراتك اليوم، والأيام الفاضية ما فيها'],
    ['checkin', '🌙 سكّر يومك', 'بالليل، بس لو ما سجلت ولا مصروف بيومك. تقدر تسجّل من التنبيه نفسه'], ['adhkar', '📿 تذكير الأذكار', 'بعد الفجر والعصر بنص ساعة']];
  function prefsSheet() {
    const p = prefs();
    A.openSheet({
      title: 'التنبيهات',
      body: '<div class="card flush"><ul class="list notif-prefs">' + TYPES.map(([k, l, sub]) =>
        '<li class="row" style="cursor:default"><label style="display:flex;align-items:center;gap:12px;width:100%;cursor:pointer"><div class="main"><div class="title"><span class="t">' + l + '</span></div><div class="sub">' + sub + '</div></div>' +
        '<input type="checkbox" data-np="' + k + '"' + (p[k] ? ' checked' : '') + ' style="width:22px;height:22px;accent-color:var(--brand)"></label></li>').join('') + '</ul></div>' +
        '<div class="field" id="briefAtF"' + (p.brief ? '' : ' hidden') + '><label>وقت ملخص الصباح</label><input type="time" name="briefAt" value="' + A.h(p.briefAt) + '"></div>' +
        '<div class="field" id="checkinAtF"' + (p.checkin ? '' : ' hidden') + '><label>وقت «سكّر يومك»</label><input type="time" name="checkinAt" value="' + A.h(p.checkinAt) + '"></div>' +
        '<button class="btn block" type="button" id="npTest">' + A.I('bell') + 'جرّب التنبيه</button>',
      mount(root) {
        root.querySelector('[data-np="brief"]').onchange = (e) => { root.querySelector('#briefAtF').hidden = !e.target.checked; };
        root.querySelector('[data-np="checkin"]').onchange = (e) => { root.querySelector('#checkinAtF').hidden = !e.target.checked; };
        root.querySelector('#npTest').onclick = async () => {
          A.closeSheet();
          const rows = await testNotification();
          setTimeout(() => A.openSheet({ title: 'حالة التنبيهات', cancelLabel: 'تم', body: '<ul class="notif-test" style="margin:0;padding:0 4px;list-style:none;line-height:2">' + rows.map((r) => '<li>' + A.h(r) + '</li>').join('') + '</ul>' }), 280);
        };
      },
      async onSave(root) {
        const np = Object.assign({}, prefs());
        root.querySelectorAll('[data-np]').forEach((c) => { np[c.dataset.np] = c.checked; });
        np.briefAt = (root.querySelector('[name=briefAt]') || {}).value || DEF.briefAt;
        np.checkinAt = (root.querySelector('[name=checkinAt]') || {}).value || DEF.checkinAt;
        savePrefs(np);
        await reschedule();
        A.toast('انحفظ ✓');
      },
    });
  }
  const E = window.Extras;
  if (E) {
    const prevExtra = E.settingsExtra;
    E.settingsExtra = function () {
      const p = prefs(), on = TYPES.filter(([k]) => p[k]).length;
      return '<div class="group-title">' + A.I('bell') + 'التنبيهات</div><div class="menu">' +
        '<button data-set="notif-prefs"><div class="ico" style="' + A.tint('#13636B') + '">' + A.I('bell') + '</div><div style="flex:1;min-width:0"><b>التنبيهات</b><small>' + on + ' من ' + TYPES.length + ' شغّالة</small></div>' + A.I('chevL') + '</button>' +
        '<button data-set="test-notif"><div class="ico" style="' + A.tint('#13636B') + '">' + A.I('bell') + '</div><div style="flex:1;min-width:0"><b>جرّب التنبيه</b><small>يوصلك تنبيه تجربة بعد 10 ثواني</small></div>' + A.I('chevL') + '</button></div>' +
        (prevExtra ? prevExtra.apply(this, arguments) : '');
    };
    const prevSet = E.settingsAction;
    E.settingsAction = async function (act) {
      if (act === 'notif-prefs') { A.closeSheet(); setTimeout(prefsSheet, 280); return true; }
      if (act === 'test-notif') {
        A.closeSheet();
        const rows = await testNotification();
        setTimeout(() => A.openSheet({ title: 'حالة التنبيهات', cancelLabel: 'تم', body: '<ul class="notif-test" style="margin:0;padding:0 4px;list-style:none;line-height:2">' + rows.map((r) => '<li>' + A.h(r) + '</li>').join('') + '</ul>' }), 280);
        return true;
      }
      return prevSet ? prevSet.apply(this, arguments) : false;
    };
  }

  // 🔁 الحلقة اليومية (DW-013): بطاقة وحدة باليوم من ثاني يوم استخدام، تشغّل ملخص الصبح + «سكّر يومك» بضغطة.
  //   «لا شكراً» تخفيها للأبد، وما تطلع لو واحد منهم شغّال أصلاً. ما فيه أي ضغط ولا عدّاد يعاقب
  const LOOP = 'hayati-loop-ask', FIRST = 'hayati-first-day';
  const lsg = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lss = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* تجاهل */ } };
  if (!lsg(FIRST)) lss(FIRST, midnight(new Date()).toISOString());
  function loopCard() {
    const p = prefs();
    if (!LN || p.brief || p.checkin || lsg(LOOP)) return '';
    if (!(midnight(new Date()) > new Date(lsg(FIRST) || Date.now()))) return '';
    return '<div class="card loop-card"><b>خل «حياتي» يرتب يومك 🔁</b>' +
      '<div class="small muted" style="margin:6px 0 10px">☀️ الصبح: ملخص جدولك واختباراتك<br>🌙 الليل: «سكّر يومك» بس لو نسيت تسجّل مصاريفك</div>' +
      '<div style="display:flex;gap:8px"><button class="btn primary" style="flex:1" data-action="loop-on">شغّلها</button><button class="btn ghost" data-action="loop-no">لا شكراً</button></div>' +
      '<div class="small muted" style="margin-top:8px">تقدر تغيّر الأوقات أو تطفيها من الإعدادات ← التنبيهات</div></div>';
  }
  if (E) {
    const prevTop = E.todayTop;
    E.todayTop = function () { return loopCard() + (prevTop ? prevTop.apply(this, arguments) : ''); };
    const prevAct = E.action;
    E.action = function (name) {
      if (name === 'loop-on') { lss(LOOP, 'yes'); savePrefs(Object.assign({}, prefs(), { brief: true, checkin: true })); reschedule(); A.toast('تمام ✓ الصبح 7:00 والليل 9:30'); A.render(); return; }
      if (name === 'loop-no') { lss(LOOP, 'no'); A.render(); return; }
      return prevAct ? prevAct.apply(this, arguments) : undefined;
    };
  }
  // اليوم ممكن انرسم قبل ما يتحمّل هالملف (آخر سكربت)، فنعيد رسمه مرة عشان البطاقة تبين
  if (loopCard() && A.ui.tab === 'today' && !document.querySelector('#sheet[open]')) A.render();

  // 🍎 / G الدخول السريع: Google يمنع الدخول من داخل WebView، فنفتح متصفح النظام،
  //   والمزود يرجّعنا بـ bh.hayati.app://auth?code=… (CFBundleURLTypes بـ Info.plist) ونبدّل الكود بجلسة (PKCE)
  const AUTH_URL = 'bh.hayati.app://auth';
  async function oauth(provider) {
    if (!Browser) throw new Error('الدخول السريع يحتاج آخر نسخة من التطبيق');
    const url = await S.signInWithProvider(provider, { redirectTo: AUTH_URL, skipBrowserRedirect: true });
    await Browser.open({ url, presentationStyle: 'fullscreen' });   // DW-081: popover بالآيباد يطلع صغير بالنص وكأن الزر ما سوّى شي
  }
  // أزرار ودجت الآيفون (DW-044): bh.hayati.app://widget/add-tx | paste-sms | open
  function onWidgetUrl(url) {
    const m = /^bh\.hayati\.app:\/\/widget\/([a-z-]+)/.exec(url || '');
    if (!m) return false;
    const W = window.Extras && window.Extras.Widget;
    if (W && W.onAction && m[1] !== 'open') W.onAction(m[1]);
    return true;
  }
  // DW-092: اختصار Apple Pay ← bh.hayati.app://pay?amount=…&merchant=…&card=…
  function onPayUrl(url) {
    if (!/^bh\.hayati\.app:\/\/pay\b/.test(url || '')) return false;
    const q = new URL(url.replace(/^bh\.hayati\.app:\/\//, 'https://pay.local/')).searchParams;
    const E = window.Extras;
    const go = () => E && E.payFromShortcut && E.payFromShortcut({ amount: q.get('amount'), merchant: q.get('merchant'), card: q.get('card') });
    setTimeout(go, 400);   // بعد ما يرجع التطبيق للواجهة
    return true;
  }
  async function onAuthUrl(url) {
    if (!url || url.indexOf(AUTH_URL) !== 0) return false;
    try { if (Browser) await Browser.close(); } catch (e) { /* انسكر */ }
    const q = new URL(url.replace(AUTH_URL, 'https://auth.local/')).searchParams;
    if (q.get('error')) { A.toast(q.get('error_description') || 'ما تم الدخول'); return true; }
    if (q.get('code')) {
      try { await S.exchangeCode(q.get('code')); A.toast('أهلاً 👋'); } catch (e) { A.toast(e.message || 'ما تم الدخول'); }
    }
    return true;
  }
  if (AppP && typeof AppP.addListener === 'function') {
    try { const r = AppP.addListener('appUrlOpen', (ev) => { const u = ev && ev.url; if (!onPayUrl(u) && !onWidgetUrl(u)) onAuthUrl(u); }); if (r && r.catch) r.catch(() => {}); } catch (e) { /* تجاهل */ }
  }

  // ◀️ زر الرجوع بأندرويد: يسكّر النافذة المفتوحة، أو يرجع لـ «اليوم»، وبعدها بس يطلع من التطبيق
  //   (بدونه الزر يسكّر التطبيق على طول حتى لو فيه نافذة مفتوحة)
  function onBack() {
    const dlg = document.querySelector('dialog[open]');
    if (dlg) { if (dlg.id === 'sheet') A.closeSheet(); else dlg.close(); return 'closed'; }
    if (A.ui && A.ui.tab !== 'today') { A.go('today'); return 'today'; }
    if (AppP && typeof AppP.minimizeApp === 'function') AppP.minimizeApp();
    else if (AppP && typeof AppP.exitApp === 'function') AppP.exitApp();
    return 'exit';
  }
  if (AppP && typeof AppP.addListener === 'function') {
    try { const r = AppP.addListener('backButton', onBack); if (r && r.catch) r.catch(() => {}); } catch (e) { /* تجاهل */ }
  }

  // «شارك ← حياتي» (أندرويد DW-009 · آيفون DW-046 عبر امتداد المشاركة): رسالة البنك توصل من تطبيق الرسائل وتفتح نافذة اللصق معبّاة
  function onShared(text, ev) {
    if (ev && ev.file && ev.data) return onSharedFile(ev.file, ev.data);
    if (!text || typeof A.sharedSms !== 'function') return Promise.resolve(null);
    return A.sharedSms(text).then((kind) => { console.info('hayati-share:' + kind); return kind; });
  }
  if (ShareIn && typeof ShareIn.take === 'function') {
    try { const r = ShareIn.addListener('shared', (ev) => onShared(ev && ev.text, ev)); if (r && r.catch) r.catch(() => {}); } catch (e) { /* تجاهل */ }
    Promise.resolve().then(() => ShareIn.take()).then((r) => onShared(r && r.text, r)).catch(() => {});
  }

  // DW-062: ملف انشارك (كشف حساب…) ← «استيراد الحساب كامل» معبّى، بعد ما يفتح القفل وتخلص البداية
  function onSharedFile(name, b64) {
    let file;
    try {
      const bin = atob(b64), u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      file = new File([u], String(name).slice(0, 120));
    } catch (e) { return Promise.resolve(null); }
    return new Promise((done) => {
      const go = () => {
        if (document.body.classList.contains('locked') || !A.st || !window.Extras || !window.Extras.bankImport) { setTimeout(go, 500); return; }
        if (document.querySelector('#sheet[open]')) A.closeSheet();
        setTimeout(() => { window.Extras.bankImport(file); console.info('hayati-share:file'); done('file'); }, 300);
      };
      setTimeout(go, 600);
    });
  }

  // رابط خارجي (زر «اقرأ»): متصفح النظام
  async function openLink(url) { if (!/^https:\/\//.test(url)) return; if (Browser) await Browser.open({ url }); else window.open(url, '_blank', 'noopener'); }
  window.HayatiNative = { haptic: () => tap('LIGHT'), openLink, saveFile, saveImage, shareText, reschedule, upcoming, testNotification, prefs, savePrefs, oauth, onAuthUrl, onBack, onShared };
})();
