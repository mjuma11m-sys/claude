// DW-089: «عاجبك حياتي؟» — طلب تقييم مؤدب، مرة وحدة، للي يستخدم التطبيق فعلاً
// بالآيفون بس (التطبيق من App Store). بعد 5 أيام استخدام مختلفة و10 عمليات أو مهام على الأقل.
// «لاحقاً» = نسأل مرة ثانية بعد 60 يوم بس. بدون مقابل وبدون طلب نجوم معيّنة (إرشادات Apple).
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { st } = A;
  const KEY = 'hayati-rate';
  const DAY = 864e5;
  const STORE = (window.HAYATI_CONFIG || {}).APP_STORE_URL || '';

  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* تجاهل */ } };
  const today = () => new Date().toISOString().slice(0, 10);
  const native = () => { try { const C = window.Capacitor; return !!(C && C.isNativePlatform && C.isNativePlatform() && C.getPlatform && C.getPlatform() === 'ios'); } catch (e) { return false; } };

  function due(r, now) {
    if (!STORE || r.done) return false;
    if (r.later && now - r.later < 60 * DAY) return false;
    if ((r.days || []).length < 5) return false;
    const used = (st.transactions || []).length + (st.tasks || []).length;
    return used >= 10;
  }

  function ask() {
    A.openSheet({
      title: 'عاجبك حياتي؟ ⭐',
      saveLabel: 'قيّمه بـ App Store',
      cancelLabel: 'لاحقاً',
      body: '<p style="margin:0 4px 10px">نبني «حياتي» بروحنا من البحرين. لو مرة وحدة كتبت رأيك بـ App Store، يساعد غيرك يلقاه.</p>' +
        '<p class="small muted" style="margin:0 4px">ما بنسألك مرة ثانية. وعندك ملاحظة؟ «الإعدادات ← رأيك بالتطبيق».</p>',
      onSave() {
        write(Object.assign(read(), { done: true }));
        const N = window.HayatiNative;
        if (N && N.openLink) N.openLink(STORE + '?action=write-review'); else window.open(STORE + '?action=write-review', '_blank', 'noopener');
      },
    });
    // «لاحقاً» أو سكّرها: نرجع بعد 60 يوم
    const sh = document.getElementById('sheet');
    if (sh) sh.addEventListener('close', () => { const r = read(); if (!r.done) write(Object.assign(r, { later: Date.now() })); }, { once: true });
  }

  function check(force) {
    if (!force && !native()) return;
    const r = read(), d = today();
    r.days = Array.from(new Set((r.days || []).concat(d))).slice(-30);
    write(r);
    if (!due(r, Date.now())) return;
    // بعد ما يستقر التطبيق، وبس لو ما فيه نافذة ثانية مفتوحة أو قفل أو رمز تحقق
    setTimeout(() => {
      const busy = document.querySelector('#sheet[open]') || (A.S.status && A.S.status.mfaNeeded) || document.querySelector('.lock[open], #lock:not([hidden])');
      if (!busy) ask();
    }, 4000);
  }

  E._ratePrompt = { check, due, read, KEY };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => check(), { once: true }); else check();
})();
