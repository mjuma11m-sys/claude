// 👥 «حياتي» للكل: بطاقة تعارف أول مرة (الاسم، مين أنت، الصلاة، الميزانية) + «ملفك» بالإعدادات
//   roles فاضية = كل الميزات (المستخدمين القدامى ما يتغير عليهم شي)
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, st, I, h } = A;
  const wrap = (name, fn) => { const prev = E[name]; E[name] = (...a) => fn(prev ? prev : () => '', ...a); };

  const ROLES = [
    ['student', '🎓', 'طالب'], ['employee', '💼', 'موظف'], ['athlete', '🏃', 'رياضي'],
    ['keeper', '🧤', 'حارس مرمى'], ['home', '🏠', 'شؤون البيت'],
  ];
  const PRAYER = [['gulf', 'أهل السنة (5 أوقات)'], ['jafari', 'جعفري (3 أوقات)'], ['off', 'لا تظهرها']];

  // تطلع بس لمستخدم جديد: ما عرّفنا عليه، وما عنده بيانات
  function isNew() {
    const s = st.settings || {};
    if (s.onboarded || Array.isArray(s.roles)) return false;
    return !st.transactions.length && !st.courses.length && !st.tasks.length;
  }

  function form(s, compact) {
    const roles = Array.isArray(s.roles) ? s.roles : [];
    const pm = s.prayer_on === false ? 'off' : (s.prayer_method || '');
    return '<div class="field"><label for="obName">اسمك (اختياري)</label><input id="obName" maxlength="24" autocomplete="given-name" placeholder="مثلاً: فاطمة" value="' + h(s.name || '') + '"></div>' +
      '<div class="field"><label>أنا… (اختار كل اللي ينطبق)</label><div class="ob-roles">' +
      ROLES.map(([k, e, l]) => '<button type="button" class="ob-chip' + (roles.includes(k) ? ' on' : '') + '" data-role="' + k + '" aria-pressed="' + roles.includes(k) + '">' + e + ' ' + l + '</button>').join('') + '</div></div>' +
      '<div class="field"><label>أوقات الصلاة</label><div class="seg" id="obPrayer">' +
      PRAYER.map(([k, l]) => '<button type="button" data-p="' + k + '" class="' + (pm === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div></div>' +
      (compact ? '' : '<div class="field"><label for="obBudget">ميزانيتك الشهرية (اختياري)</label><input id="obBudget" inputmode="decimal" placeholder="مثلاً 300" value="' + h(s.budget || '') + '"></div>');
  }
  function read(root) {
    const roles = [...root.querySelectorAll('.ob-chip.on')].map((b) => b.dataset.role);
    // حارس المرمى رياضي أصلاً
    if (roles.includes('keeper') && !roles.includes('athlete')) roles.push('athlete');
    const p = root.querySelector('#obPrayer .on');
    const patch = { name: root.querySelector('#obName').value.trim(), roles, onboarded: true };
    if (p) { if (p.dataset.p === 'off') patch.prayer_on = false; else { patch.prayer_on = true; patch.prayer_method = p.dataset.p; } }
    const b = root.querySelector('#obBudget');
    if (b && b.value.trim()) { const v = A.parseAmount(b.value); if (v > 0) patch.budget = v; }
    return patch;
  }
  function bind(root) {
    root.addEventListener('click', (e) => {
      const c = e.target.closest('.ob-chip');
      if (c) { c.classList.toggle('on'); c.setAttribute('aria-pressed', c.classList.contains('on')); return; }
      const p = e.target.closest('#obPrayer button');
      if (p) root.querySelectorAll('#obPrayer button').forEach((x) => x.classList.toggle('on', x === p));
    });
  }

  // ---------- بطاقة التعارف بأول صفحة ----------
  function welcomeCard() {
    if (!isNew()) return '';
    return '<div class="card ob" id="obCard"><b class="ob-title">👋 هلا! خلّنا نعرفك</b>' +
      '<p class="small muted" style="margin:2px 0 12px">عشان «حياتي» يوريك اللي يهمك بس. بياناتك تظل بجهازك.</p>' +
      form(st.settings || {}) +
      '<div class="btn-row"><button class="btn primary" data-action="ob-save">يلا نبدأ</button><button class="btn ghost" data-action="ob-skip">بعدين</button></div></div>';
  }
  wrap('todayTop', (prev) => welcomeCard() + prev());
  wrap('action', (prev, name, el, e) => {
    if (name === 'ob-save') {
      const patch = read(document.getElementById('obCard'));
      S.setSettings(patch);
      A.toast(patch.name ? 'أهلاً ' + patch.name + ' 👋' : 'أهلاً فيك 👋');
      A.render(); return;
    }
    if (name === 'ob-skip') { S.setSettings({ onboarded: true }); A.render(); return; }
    return prev(name, el, e);
  });
  new MutationObserver(() => { const c = document.getElementById('obCard'); if (c && !c.dataset.b) { c.dataset.b = 1; bind(c); } })
    .observe(document.getElementById('view'), { childList: true });

  // ---------- «ملفك» بالإعدادات ----------
  const prevExtra = E.settingsExtra;
  E.settingsExtra = function () {
    const s = st.settings || {};
    const roles = Array.isArray(s.roles) && s.roles.length ? s.roles : null;
    const who = roles ? ROLES.filter(([k]) => roles.includes(k)).map(([, e, l]) => e + ' ' + l).join(' · ') : 'كل الميزات ظاهرة';
    return '<div class="group-title">' + I('user') + 'ملفك</div><div class="menu">' +
      '<button data-set="profile"><div class="ico" style="' + A.tint('#13636B') + '">' + I('user') + '</div><div style="flex:1;min-width:0"><b>' + h(s.name || 'اسمك ومين أنت') + '</b><small>' + h(who) + '</small></div>' + I('chevL') + '</button>' +
      // «سوّ ميزتك»: الاقتراح يروح رسالة على إنستقرام، وكل أسبوع وحدة تنبني
      '<a class="menu-link" href="https://ig.me/m/hayati.bh" target="_blank" rel="noopener"><div class="ico" style="' + A.tint('#FF6B4A') + '">' + I('sparkle') + '</div><div style="flex:1;min-width:0"><b>💡 اقترح ميزة</b><small>كل أسبوع نبني اقتراح، ونذكر اسمك</small></div>' + I('chevL') + '</a></div>' +
      (prevExtra ? prevExtra.apply(this, arguments) : '');
  };
  const prevSet = E.settingsAction;
  E.settingsAction = async function (act) {
    if (act === 'profile') { A.closeSheet(); setTimeout(profileSheet, 280); return true; }
    return prevSet ? prevSet.apply(this, arguments) : false;
  };
  function profileSheet() {
    A.openSheet({
      title: 'ملفك',
      body: '<p class="small muted" style="margin:0 0 12px">اللي تختاره يحدد وش يطلع لك: المعدل للطالب، الجاهزية للرياضي، ووضع الحارس للحارس. ما تختار شي = كل شي يطلع.</p>' + form(st.settings || {}, true),
      mount: bind,
      onSave(root) { S.setSettings(read(root)); A.toast('انحفظ ✓'); },
    });
  }

  window.HayatiProfile = { ROLES, isNew };
  A.render();
})();
