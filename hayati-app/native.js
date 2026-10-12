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

  // رقم ثابت لكل تنبيه (iOS يبي int)
  function nid(key) {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
    return Math.abs(h) % 2000000000 + 1;
  }

  // التنبيهات الجاية: كل اللي بـ agendaOn (محاضرات، تمرين، مواعيد، وصلاة لو مفعّلة)
  function upcoming(now) {
    const out = [];
    for (let d = 0; d < DAYS; d++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
      for (const it of A.agendaOn(day)) {
        const prayer = it.type === 'prayer';
        const lead = prayer ? 0 : BEFORE;
        const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, it.start - lead);
        if (at <= now) continue;
        const t = A.ACT_TYPES[it.type] || A.ACT_TYPES.activity;
        out.push({
          id: nid(it.src + ':' + it.id + ':' + day.toDateString()),
          title: prayer ? t.now + ' ' + it.name : 'بعد ' + BEFORE + ' دقايق: ' + it.name,
          body: prayer ? '' : [t.label, it.room].filter(Boolean).join(' · '),
          schedule: { at, allowWhileIdle: true },
        });
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

  // زر بالإعدادات (نسخة الآيفون بس)
  const E = window.Extras;
  if (E) {
    const prevExtra = E.settingsExtra;
    E.settingsExtra = function () {
      return '<div class="group-title">' + A.I('bell') + 'التنبيهات</div><div class="menu"><button data-set="test-notif"><div class="ico" style="' + A.tint('#13636B') + '">' + A.I('bell') + '</div><div style="flex:1;min-width:0"><b>جرّب التنبيه</b><small>يوصلك تنبيه تجربة بعد 10 ثواني</small></div>' + A.I('chevL') + '</button></div>' +
        (prevExtra ? prevExtra.apply(this, arguments) : '');
    };
    const prevSet = E.settingsAction;
    E.settingsAction = async function (act) {
      if (act === 'test-notif') {
        A.closeSheet();
        const rows = await testNotification();
        setTimeout(() => A.openSheet({ title: 'حالة التنبيهات', cancelLabel: 'تم', body: '<ul class="notif-test" style="margin:0;padding:0 4px;list-style:none;line-height:2">' + rows.map((r) => '<li>' + A.h(r) + '</li>').join('') + '</ul>' }), 280);
        return true;
      }
      return prevSet ? prevSet.apply(this, arguments) : false;
    };
  }

  window.HayatiNative = { saveFile, shareText, reschedule, upcoming, testNotification };
})();
