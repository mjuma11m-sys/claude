// DW-109: عدّاد الاستخدام بدون هوية — مرة باليوم الجهاز يقول للسيرفر «+1»، ومرة بالشهر «+1 لهالشهر».
// الجهاز يتذكر آخر يوم وآخر شهر أرسل فيه (hayati-usage). ما نرسل أي معرّف ولا حساب، والسيرفر يحفظ أرقام مجمّعة بس.
// تقدر تطفيه من الإعدادات («📊 إحصائيات بدون هوية»).
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const KEY = 'hayati-usage';
  const pad = (n) => String(n).padStart(2, '0');
  const read = () => { try { return Object.assign({ off: false, day: '', month: '' }, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return { off: false, day: '', month: '' }; } };
  const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* تجاهل */ } };
  const platform = () => { const p = window.Capacitor && window.Capacitor.getPlatform ? window.Capacitor.getPlatform() : 'web'; return p === 'ios' || p === 'android' ? p : 'web'; };

  async function ping(now) {
    now = now || new Date();
    const v = read(); if (v.off || !navigator.onLine) return false;
    const day = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()), month = day.slice(0, 7);
    if (v.day === day) return false;
    const ok = await A.S.pingActive(v.month !== month, platform(), A.APP_VERSION).catch(() => false);
    if (ok) { v.day = day; v.month = month; write(v); }
    return ok;
  }
  setTimeout(ping, 5000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) ping(); });
  E.Usage = { ping, read, write, KEY };
})();
