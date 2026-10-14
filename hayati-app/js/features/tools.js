// «كل شي بحياتي» (كل الأدوات بمكان واحد) + «رتّب اليوم» (إخفاء البطاقات) — DW-016
// الإخفاء على الجهاز بس (settings.today_hide) ويدخل بالنسخة الاحتياطية
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, st, I, tint } = A;

  // يشغّل زر data-action موجود بالتطبيق (نفس طريقة البحث)
  function run(action, data) {
    const b = document.createElement('button');
    b.dataset.action = action; b.hidden = true;
    Object.assign(b.dataset, data || {});
    document.getElementById('view').appendChild(b); b.click(); b.remove();
  }
  const goSeg = (tab, key, val) => { A.ui[key] = val; A.go(tab); };

  // [مفتاح، أيقونة، لون، الاسم، وش يسوي]
  const GROUPS = [
    ['💰 الفلوس', [
      ['payday', 'calendar', '#1A8A8F', 'يوم الراتب', () => run('payday')],
      ['zakat', 'target', '#b45309', 'الزكاة والخُمس', () => run('zakat')],
      ['subs', 'repeat', '#f59e0b', 'الاشتراكات', () => goSeg('money', 'moneySeg', 'subs')],
      ['goals', 'piggy', '#10b981', 'أهداف الادخار', () => goSeg('money', 'moneySeg', 'goals')],
      ['debts', 'users', '#0891b2', 'لي وعلي', () => goSeg('money', 'moneySeg', 'debts')],
      ['report', 'chart', '#8b5cf6', 'تقرير الشهر', () => { goSeg('money', 'moneySeg', 'tx'); setTimeout(() => run('report'), 50); }],
      ['year', 'chart', '#6366f1', 'ملخص السنة', () => run('year')],
    ]],
    ['🗓️ يومك', [
      ['shop', 'cart', '#16a34a', 'المشتريات', () => goSeg('tasks', 'tasksSeg', 'shop')],
      ['events', 'gift', '#ec4899', 'المناسبات', () => goSeg('tasks', 'tasksSeg', 'events')],
      ['tasks', 'tasks', '#0d9488', 'المهام', () => goSeg('tasks', 'tasksSeg', 'tasks')],
      ['weekly', 'chart', '#13636B', 'تقرير الأسبوع', () => run('weekly')],
      ['notif', 'bell', '#13636B', 'التنبيهات', () => openSetting('notif-prefs')],
    ]],
    ['📚 الدراسة والصحة', [
      ['schedule', 'graduation', '#1A8A8F', 'الجدول', () => goSeg('schedule', 'studySeg', 'schedule')],
      ['focus', 'timer', '#f97316', 'المذاكرة والتركيز', () => goSeg('schedule', 'studySeg', 'focus')],
      ['gpa', 'award', '#8b5cf6', 'المعدل', () => goSeg('schedule', 'studySeg', 'gpa')],
      ['health', 'heart', '#e11d48', 'صحتي', () => goSeg('schedule', 'studySeg', 'health')],
    ]],
    ['🕌 العبادة', [
      ['ibada', 'moon', '#0d9488', 'عبادتي', () => run('ibada')],
      ['tasbih', 'repeat', '#0d9488', 'المسبحة', () => run('tasbih')],
      ['wird', 'book', '#0d9488', 'ورد القرآن', () => (E.pick ? E.pick('wird') : null)],
    ]],
  ];
  function openSetting(act) { if (E.settingsAction) E.settingsAction(act); }

  // البطاقات اللي تنخفي من «اليوم» (data-tk)
  const CARDS = [['ibada', '🕌 عبادتي'], ['wird', '📖 ورد القرآن'], ['schedule', '📅 جدول اليوم'], ['health', '💧 يومك الصحي'],
    ['events', '🎂 المناسبات'], ['journal', '📝 اليوميات والمزاج'], ['tasks', '✅ مهام قريبة'], ['recent', '💳 آخر العمليات']];
  const hidden = () => (Array.isArray(st.settings.today_hide) ? st.settings.today_hide : []);
  function applyHide() {
    let el = document.getElementById('tkHide');
    if (!el) { el = document.createElement('style'); el.id = 'tkHide'; document.head.appendChild(el); }
    const css = hidden().filter((k) => CARDS.some((c) => c[0] === k)).map((k) => '#view section[data-tk="' + k + '"]{display:none}').join('\n');
    if (el.textContent !== css) el.textContent = css;   // نكتب بس لو تغيّر (الترجمة تراقب الصفحة)
  }

  function toolsSheet() {
    const all = GROUPS.flatMap((g) => g[1]);
    A.openSheet({
      title: 'كل شي بحياتي',
      cancelLabel: 'تم',
      body: GROUPS.map(([g, items]) => '<div class="group-title">' + g + '</div><div class="tools-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">' +
        items.filter((x) => x[0] !== 'notif' || window.HayatiNative).map(([k, ic, col, l]) => '<button type="button" class="tool" data-tool="' + k + '" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 6px;border-radius:16px;border:1px solid var(--line, #e5e2da);background:var(--card, #fff);font:inherit;cursor:pointer"><div class="ico" style="' + tint(col) + '">' + I(ic) + '</div><span style="font-size:13px;text-align:center">' + l + '</span></button>').join('') + '</div>').join('') +
        '<button type="button" class="btn ghost block" id="tkOpen" style="margin-top:16px">' + I('settings') + 'رتّب شاشة «اليوم»</button>',
      mount(root) {
        root.querySelectorAll('[data-tool]').forEach((b) => { b.onclick = () => {
          const t = all.find((x) => x[0] === b.dataset.tool);
          A.closeSheet(); setTimeout(() => t[4](), 280);
        }; });
        root.querySelector('#tkOpen').onclick = () => { A.closeSheet(); setTimeout(arrangeSheet, 280); };
      },
    });
  }

  function arrangeSheet() {
    const hid = hidden();
    A.openSheet({
      title: 'رتّب «اليوم»',
      body: '<p class="small muted" style="margin:0 4px 10px">شغّل اللي تبيه يطلع بشاشة اليوم. اللي تطفيه يظل موجود بـ «كل شي بحياتي».</p><div class="card flush"><ul class="list">' +
        CARDS.map(([k, l]) => '<li class="row" style="cursor:default"><label style="display:flex;align-items:center;gap:12px;width:100%;cursor:pointer"><div class="main"><div class="title"><span class="t">' + l + '</span></div></div>' +
          '<input type="checkbox" data-tk-on="' + k + '"' + (hid.includes(k) ? '' : ' checked') + ' style="width:22px;height:22px;accent-color:var(--brand)"></label></li>').join('') + '</ul></div>',
      onSave(root) {
        const off = [...root.querySelectorAll('[data-tk-on]')].filter((c) => !c.checked).map((c) => c.dataset.tkOn);
        S.setSettings({ today_hide: off });
        applyHide();
        A.toast('انحفظ ✓');
      },
    });
  }

  // زر بالترويسة جنب البحث
  const btn = document.createElement('button');
  btn.className = 'icon-btn'; btn.id = 'toolsBtn'; btn.type = 'button'; btn.setAttribute('aria-label', 'كل شي بحياتي');
  btn.innerHTML = I('dots');
  btn.onclick = toolsSheet;
  const anchor = document.getElementById('findBtn') || document.getElementById('settingsBtn');
  if (anchor) anchor.parentNode.insertBefore(btn, anchor);

  const prevSet = E.settingsAction;
  E.settingsAction = async function (act) {
    if (act === 'arrange-today') { A.closeSheet(); setTimeout(arrangeSheet, 280); return true; }
    return prevSet ? prevSet.apply(this, arguments) : false;
  };
  const prevExtra = E.settingsExtra;
  E.settingsExtra = function () {
    return '<div class="menu" style="margin-top:8px"><button data-set="arrange-today"><div class="ico" style="' + tint('#13636B') + '">' + I('settings') + '</div><div style="flex:1;min-width:0"><b>رتّب شاشة «اليوم»</b><small>' + (hidden().length ? 'مخفي ' + hidden().length : 'كل البطاقات ظاهرة') + '</small></div>' + I('chevL') + '</button></div>' +
      (prevExtra ? prevExtra.apply(this, arguments) : '');
  };
  S.subscribe(applyHide);
  applyHide();
  E.Tools = { GROUPS, CARDS, toolsSheet, arrangeSheet, applyHide };
})();
