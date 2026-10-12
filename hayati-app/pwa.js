// 🔴 رقم على أيقونة التطبيق = مهام اليوم + المتأخرة اللي ما خلصت (iOS 16.4+ بعد ما تثبّته وتسمح بالتنبيهات)
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, st } = A;
  const KEY = 'hayati-badge';
  const on = () => { try { return localStorage.getItem(KEY) !== 'off'; } catch (e) { return true; } };
  const supported = 'setAppBadge' in navigator;

  // المواعيد تطلع بجدول اليوم، فالرقم للمهام والواجبات والاختبارات بس
  function pending(now) {
    const end = new Date(now || Date.now()); end.setHours(23, 59, 59, 999);
    return st.tasks.filter((t) => !t.done && t.due_at && t.kind !== 'appointment' && new Date(t.due_at) <= end).length;
  }
  let last = -1;
  function update() {
    if (!supported) return;
    const allowed = on() && (!('Notification' in window) || Notification.permission === 'granted');
    const n = allowed ? pending() : 0;
    if (n === last) return;
    last = n;
    (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {});
  }

  const prevExtra = E.settingsExtra;
  E.settingsExtra = function () {
    if (!supported) return prevExtra ? prevExtra.apply(this, arguments) : '';
    return (prevExtra ? prevExtra.apply(this, arguments) : '') +
      '<div class="group-title">' + A.I('bell') + 'رقم على الأيقونة</div><div class="card">' +
      '<label class="switch"><input type="checkbox" data-set="badge"' + (on() ? ' checked' : '') + '> عدد مهام اليوم والمتأخرة على أيقونة التطبيق</label>' +
      '<p class="small muted" style="margin:8px 0 0">يطلع بس لما يكون التطبيق مثبّت والتنبيهات مسموحة. اليوم: <b class="num">' + pending() + '</b></p></div>';
  };
  document.addEventListener('change', (e) => {
    const b = e.target.closest('[data-set="badge"]');
    if (!b) return;
    try { localStorage.setItem(KEY, b.checked ? 'on' : 'off'); } catch (err) { /* تجاهل */ }
    last = -1; update();
  });

  S.subscribe(update);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') update(); });
  setInterval(update, 60000);
  update();
  window.HayatiPWA = { pending, update };
})();
