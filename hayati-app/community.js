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

  // اللغة: العربي أو English (يعيد فتح التطبيق، وبياناتك ما تتغير)
  const curLang = () => (window.HayatiLang && window.HayatiLang.lang) || 'ar';
  function langSeg() {
    return '<div class="seg lang-seg" data-noi18n style="margin:0 0 12px">' +
      [['ar', 'العربية'], ['en', 'English']].map(([k, l]) => '<button type="button" data-lang="' + k + '" class="' + (curLang() === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div>';
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang]');
    if (!b || !window.HayatiLang || b.dataset.lang === curLang()) return;
    window.HayatiLang.set(b.dataset.lang);
  });

  // ---------- بطاقة التعارف بأول صفحة ----------
  function welcomeCard() {
    if (!isNew()) return '';
    return '<div class="card ob" id="obCard">' + langSeg() + '<b class="ob-title">👋 هلا! خلّنا نعرفك</b>' +
      '<p class="small muted" style="margin:2px 0 12px">عشان «حياتي» يوريك اللي يهمك بس. بياناتك تظل بجهازك.</p>' +
      form(st.settings || {}) +
      // حساب خاص (يحفظ بياناتك بين أجهزتك): يطلع بس لو المزامنة مركّبة، وإلا ملفك يكون على هالجهاز
      (S.getConfig && S.getConfig() ? '<button type="button" class="btn ghost block" style="margin-bottom:10px" data-action="ob-account">🔐 أنشئ حساب (بياناتك على كل أجهزتك)</button>' :
        '<p class="small muted" style="margin:0 0 10px">🔒 ملفك محفوظ على هالجهاز. الحسابات والمزامنة بين الأجهزة لسه قيد التطوير.</p>') +
      '<div class="btn-row"><button class="btn primary" data-action="ob-save">يلا نبدأ</button><button class="btn ghost" data-action="ob-skip">بعدين</button></div>' +
      '<p class="small muted ob-terms" style="margin:10px 2px 0">باستخدامك «حياتي» توافق على <a href="terms.html" target="_blank" rel="noopener">شروط الاستخدام</a> و<a href="privacy.html" target="_blank" rel="noopener">سياسة الخصوصية</a>. الأرقام كلها تقدير، وبياناتك على جهازك.</p></div>';
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
    if (name === 'ob-account') {
      S.setSettings(read(document.getElementById('obCard')));
      A.render(); setTimeout(() => { const b = document.getElementById('settingsBtn'); if (b) b.click(); }, 200);
      return;
    }
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
    return '<div class="group-title">🌐 اللغة · Language</div><div class="card">' + langSeg() + '<p class="small muted" style="margin:0">English (beta): الترجمة للواجهة بس، وبياناتك تظل مثل ما هي.</p></div>' +
      '<div class="group-title">' + I('user') + 'ملفك</div><div class="menu">' +
      '<button data-set="profile"><div class="ico" style="' + A.tint('#13636B') + '">' + I('user') + '</div><div style="flex:1;min-width:0"><b>' + h(s.name || 'اسمك ومين أنت') + '</b><small>' + h(who) + '</small></div>' + I('chevL') + '</button>' +
      // «سوّ ميزتك»: الاقتراح يروح رسالة على إنستقرام، وكل أسبوع وحدة تنبني
      '<button data-set="feedback"><div class="ico" style="' + A.tint('#13636B') + '">' + I('message') + '</div><div style="flex:1;min-width:0"><b>رأيك بالتطبيق</b><small>دقيقة وحدة، وكل رأي ينقرا</small></div>' + I('chevL') + '</button>' +
      '<a class="menu-link" href="https://ig.me/m/hayati.bh" target="_blank" rel="noopener"><div class="ico" style="' + A.tint('#FF6B4A') + '">' + I('sparkle') + '</div><div style="flex:1;min-width:0"><b>💡 اقترح ميزة</b><small>كل أسبوع نبني اقتراح، ونذكر اسمك</small></div>' + I('chevL') + '</a></div>' +
      (prevExtra ? prevExtra.apply(this, arguments) : '');
  };
  const prevSet = E.settingsAction;
  E.settingsAction = async function (act) {
    if (act === 'profile') { A.closeSheet(); setTimeout(profileSheet, 280); return true; }
    if (act === 'feedback') { A.closeSheet(); setTimeout(feedbackSheet, 280); return true; }
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

  // ---------- «رأيك بالتطبيق»: يجهّز الرسالة وينسخها، وتنرسل لـ @hayati.bh على إنستقرام ----------
  function feedbackText(root) {
    const stars = Number(root.dataset.stars || 0);
    const bad = root.querySelector('#fbBad').value.trim(), want = root.querySelector('#fbWant').value.trim();
    const roles = (st.settings.roles || []).map((r) => (ROLES.find((x) => x[0] === r) || [])[2]).filter(Boolean).join('، ');
    return ['رأيي في «حياتي» 📱', stars ? 'التقييم: ' + '★'.repeat(stars) + '☆'.repeat(5 - stars) : '', bad ? 'ضايقني: ' + bad : '', want ? 'أبي: ' + want : '', roles ? 'أنا: ' + roles : ''].filter(Boolean).join('\n');
  }
  function feedbackSheet() {
    A.openSheet({
      title: 'رأيك بالتطبيق',
      saveLabel: 'انسخ وأرسل',
      body: '<p class="small muted" style="margin:0 0 12px">«حياتي» قيد التطوير، ورأيك يقرر وش ينبني بعد. نجهّز لك الرسالة، تنسخها، وترسلها لنا على إنستقرام.</p>' +
        '<div class="field"><label>تقييمك</label><div id="fbStars" class="fb-stars" dir="ltr">' + [1, 2, 3, 4, 5].map((n) => '<button type="button" data-n="' + n + '" aria-label="' + n + ' من 5">★</button>').join('') + '</div></div>' +
        '<div class="field"><label for="fbBad">وش ضايقك أو ما اشتغل زين؟</label><textarea id="fbBad" maxlength="600"></textarea></div>' +
        '<div class="field"><label for="fbWant">وش الميزة اللي تبيها؟</label><textarea id="fbWant" maxlength="600"></textarea></div>',
      mount(root) {
        root.querySelector('#fbStars').onclick = (e) => {
          const b = e.target.closest('button'); if (!b) return;
          root.dataset.stars = b.dataset.n;
          root.querySelectorAll('#fbStars button').forEach((x) => x.classList.toggle('on', Number(x.dataset.n) <= Number(b.dataset.n)));
        };
      },
      async onSave(root) {
        const text = feedbackText(root);
        if (!root.dataset.stars && !root.querySelector('#fbBad').value.trim() && !root.querySelector('#fbWant').value.trim()) throw new Error('اختار تقييم أو اكتب شي');
        let copied = false;
        try { await navigator.clipboard.writeText(text); copied = true; } catch (e) { /* بعض المتصفحات تمنع النسخ */ }
        window.open('https://ig.me/m/hayati.bh', '_blank', 'noopener');
        A.toast(copied ? 'انسخت ✓ الصقها بالرسالة' : 'افتحنا إنستقرام — اكتب رأيك هناك');
      },
    });
  }
  window.HayatiFeedback = { feedbackText };

  window.HayatiProfile = { ROLES, isNew };
  A.render();
})();
