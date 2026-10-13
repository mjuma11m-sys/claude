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

  const DAYS = 7;      // iOS يسمح بـ 64 تنبيه مجدول بالكثير، فنجدول أسبوع بس
  const MAX = 60;
  const BEFORE = 10;   // دقايق قبل المحاضرة/التمرين/الموعد
  const ASKED = 'hayati-notif-asked';
  const TEST_ID = 990001;
  // ⚙️ التنبيهات: كل نوع له مفتاح، وملخص الصباح مقفل افتراضياً (ما نزعج)
  const PREFS = 'hayati-notif-prefs';
  const DEF = { lectures: true, exams: true, homework: true, subs: true, brief: false, briefAt: '07:00' };
  function prefs() {
    try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem(PREFS) || '{}')); } catch (e) { return Object.assign({}, DEF); }
  }
  function savePrefs(p) { try { localStorage.setItem(PREFS, JSON.stringify(p)); } catch (e) { /* تجاهل */ } }
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
    const add = (key, when, title, body) => { if (when > now) out.push({ id: nid(key), title, body: body || '', schedule: { at: when, allowWhileIdle: true } }); };
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
            prayer ? '' : [t.label, it.room].filter(Boolean).join(' · '));
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
      add('task-eve:' + tk.id, at(eve, EVENING), (exam ? 'بكرة اختبار: ' : 'بكرة تسليم: ') + tk.title, exam ? 'راجع وارتاح زين 🤍' : '');
      if (exam) {
        const mins = due.getHours() * 60 + due.getMinutes();
        // اختبار قبل 9:30 الصبح: التذكير 7:30، مو بنص الليل
        const when = mins < 9 * 60 + 30 ? at(dueDay, 7 * 60 + 30) : new Date(due.getTime() - 2 * 3600e3);
        add('task-day:' + tk.id, when, (mins < 9 * 60 + 30 ? 'اليوم' : 'بعد ساعتين') + ': اختبار ' + tk.title, tk.place || '');
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
          dayWord(before) + ' يتجدد: ' + sub.name, A.fmt(sub.amount) + ' د.ب');
      }
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

  async function shareText(text) {
    if (!Share) return;
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
  const TYPES = [['lectures', '📅 الجدول والصلاة', 'قبل المحاضرة بـ 10 دقايق، والصلاة بوقتها'], ['exams', '📝 الاختبارات', 'الليلة اللي قبلها، وقبل الاختبار بساعتين'],
    ['homework', '📚 الواجبات', 'الليلة اللي قبل التسليم'], ['subs', '💳 تجديد الاشتراكات', 'قبل التجديد بالأيام اللي تحددها بالاشتراك'], ['brief', '☀️ ملخص الصباح', 'جدولك واختباراتك اليوم، والأيام الفاضية ما فيها']];
  function prefsSheet() {
    const p = prefs();
    A.openSheet({
      title: 'التنبيهات',
      body: '<div class="card flush"><ul class="list notif-prefs">' + TYPES.map(([k, l, sub]) =>
        '<li class="row" style="cursor:default"><label style="display:flex;align-items:center;gap:12px;width:100%;cursor:pointer"><div class="main"><div class="title"><span class="t">' + l + '</span></div><div class="sub">' + sub + '</div></div>' +
        '<input type="checkbox" data-np="' + k + '"' + (p[k] ? ' checked' : '') + ' style="width:22px;height:22px;accent-color:var(--brand)"></label></li>').join('') + '</ul></div>' +
        '<div class="field" id="briefAtF"' + (p.brief ? '' : ' hidden') + '><label>وقت ملخص الصباح</label><input type="time" name="briefAt" value="' + A.h(p.briefAt) + '"></div>' +
        '<button class="btn block" type="button" id="npTest">' + A.I('bell') + 'جرّب التنبيه</button>',
      mount(root) {
        root.querySelector('[data-np="brief"]').onchange = (e) => { root.querySelector('#briefAtF').hidden = !e.target.checked; };
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

  window.HayatiNative = { saveFile, shareText, reschedule, upcoming, testNotification, prefs, savePrefs };
})();
