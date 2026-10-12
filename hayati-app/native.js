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

  let busy = false, again = false;
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
      if (pending.notifications.length) await LN.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
      if (list.length) await LN.schedule({ notifications: list });
    } catch (e) { /* التنبيهات ميزة إضافية، ما نكسر التطبيق عشانها */ }
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

  window.HayatiNative = { saveFile, shareText, reschedule, upcoming };
})();
