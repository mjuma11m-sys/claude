// DW-067: «ابدأ هني» — 4 خطوات توصّل المستخدم الجديد لأقوى شي بالتطبيق، وكل خطوة تنشطب لحالها من بياناته
// تختفي لما يخلصها كلها أو يضغط «خلاص». الحالة بالجهاز (localStorage).
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { st, I, tint } = A;
  const wrap = (name, fn) => { const prev = E[name]; E[name] = (...a) => fn(prev ? prev : () => '', ...a); };
  const KEY = 'hayati-start-here';
  const hidden = () => { try { return localStorage.getItem(KEY) === 'done'; } catch (e) { return false; } };

  const STEPS = [
    ['sms', '💬', 'الصق رسالة بنك', 'المبلغ والمحل والتاريخ لحالهم', () => st.transactions.some((t) => t.source === 'sms' || t.source === 'import')],
    ['timetable', '📅', 'ارفع جدولك', 'دراسة أو دوام أو برنامج المدرب', () => st.courses.length > 0],
    ['budget', '🎯', 'حط ميزانيتك', 'وكل يوم يقولك كم تقدر تصرف', () => Number(st.settings.budget) > 0],
    ['acc-add', '💳', 'أضف بطاقتك', 'رصيدها، والرسائل تنربط فيها', () => Array.isArray(st.settings.accounts) && st.settings.accounts.length > 0],
  ];

  function card() {
    if (hidden() || !(st.settings || {}).onboarded) return '';
    const done = STEPS.map((s) => s[4]());
    if (done.every(Boolean)) return '';
    const n = done.filter(Boolean).length;
    return '<section data-tk="start"><div class="card" id="startHere"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><b style="flex:1">🚀 ابدأ هني</b>' +
      '<small class="muted"><bdi>' + n + '/' + STEPS.length + '</bdi></small><button type="button" class="link" data-action="start-hide">خلاص</button></div>' +
      '<div class="track" style="margin:0 0 8px"><span style="width:' + (n / STEPS.length) * 100 + '%"></span></div><ul class="list">' +
      STEPS.map(([k, e, t, sub], i) => '<li class="row' + (done[i] ? ' done' : '') + '" data-action="start-go" data-k="' + k + '"><div class="ico" style="' + tint(done[i] ? '#10b981' : '#1A8A8F') + '">' + (done[i] ? I('check') : e) + '</div>' +
        '<div class="main"><div class="title"><span class="t">' + t + '</span></div><div class="sub">' + sub + '</div></div>' + (done[i] ? '' : '<span class="muted">' + I('chevL') + '</span>') + '</li>').join('') +
      '</ul></div></section>';
  }

  // نفس طريقة «كل شي بحياتي»: زر مخفي بـ data-action يمر على موزّع التطبيق
  function run(action) {
    const b = document.createElement('button'); b.dataset.action = action; b.hidden = true;
    document.getElementById('view').appendChild(b); b.click(); b.remove();
  }

  wrap('todayTop', (prev) => prev() + card());
  wrap('action', (prev, name, el, e) => {
    if (name === 'start-hide') { try { localStorage.setItem(KEY, 'done'); } catch (err) { /* تجاهل */ } A.render(); return; }
    if (name === 'start-go') {
      const k = el.dataset.k;
      if (k === 'sms') A.pasteSmsForm();
      else if (k === 'acc-add') { A.ui.moneySeg = 'accounts'; A.go('money'); setTimeout(() => run('acc-add'), 60); }
      else run(k);
      return;
    }
    return prev(name, el, e);
  });
  E._startHere = { STEPS, card };
})();

// DW-070: بعد ما يخلص «ابدأ هني»، الميزات الجديدة ما تندفن: صف اختصارات صغير بشاشة اليوم
(function () {
  'use strict';
  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const wrap = (name, fn) => { const prev = E[name]; E[name] = (...a) => fn(prev ? prev : () => '', ...a); };
  const KEYS = [['timetable', '📅', 'جدولك'], ['kitchen', '🍳', 'المطبخ'], ['acc-add', '💳', 'حساباتي'], ['bankfile', '📥', 'كشف حساب']];
  function row() {
    if (!(A.st.settings || {}).onboarded) return '';
    return '<section data-tk="shortcuts"><div class="chips" id="quickRow" style="flex-wrap:nowrap;overflow-x:auto;margin:0 0 12px">' +
      KEYS.map(([k, e, t]) => '<button type="button" class="chip" data-action="quick-go" data-k="' + k + '">' + e + ' ' + t + '</button>').join('') + '</div></section>';
  }
  function run(action) {
    const b = document.createElement('button'); b.dataset.action = action; b.hidden = true;
    document.getElementById('view').appendChild(b); b.click(); b.remove();
  }
  wrap('todayTop', (prev) => { const out = prev(); return out.includes('id="startHere"') ? out : row() + out; });
  wrap('action', (prev, name, el, e) => {
    if (name !== 'quick-go') return prev(name, el, e);
    const k = el.dataset.k;
    if (k === 'acc-add') { A.ui.moneySeg = 'accounts'; A.go('money'); return; }
    run(k);
  });
})();
