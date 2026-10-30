// DW-097: المستخدم الجديد — بطاقة «تعرّف على حياتي» بالرئيسية: فيديو شرح (40 ث، داخل التطبيق بدون نت) + جولة سريعة
// تأشّر على الأزرار المهمة خطوة خطوة. تختفي لما يشوفها أو يقفلها، وترجع من الإعدادات «شرح التطبيق». الحالة بالجهاز بس.
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const KEY = 'hayati-tour';
  const read = () => { try { return localStorage.getItem(KEY) || ''; } catch (e) { return 'done'; } };
  const write = (v) => { try { localStorage.setItem(KEY, v); } catch (e) { /* تجاهل */ } };

  const STEPS = [
    ['#tabbar [data-tab="today"]', '🏠 يومك', 'كل شي اليوم بمكان واحد: الصلاة الجاية، محاضراتك، ومصروفك.'],
    ['#addBtn', '➕ أضف أي شي', 'مصروف، مهمة، موعد، أو الصق رسالة البنك وتنسجل لحالها.'],
    ['#tabbar [data-tab="money"]', '💰 فلوسك', 'وين راحت فلوسك، الميزانية، وتقرير الشهر.'],
    ['#assistBtn', '✨ المساعد', 'اسأله عن أرقامك: «كم صرفت على القهوة؟» أو «سوّ لي خطة توفير».'],
    ['#settingsBtn', '⚙️ الإعدادات', 'حسابك، التنبيهات، اللغة، والنسخة الاحتياطية.'],
  ];

  function video() {
    write('done');
    A.openSheet({
      title: '🎬 حياتي بـ 40 ثانية',
      cancelLabel: 'تم',
      body: '<div style="border-radius:18px;overflow:hidden;background:#0E3B43;aspect-ratio:9/16;max-height:66vh;margin:0 auto"><video id="tourVid" src="media/howto.mp4" poster="media/howto.jpg" controls playsinline preload="metadata" style="width:100%;height:100%;display:block;object-fit:contain"></video></div>' +
        '<p class="small muted" id="tourVidNote" style="margin:10px 4px 0">* لقطات ببيانات تجريبية</p>' +
        '<button type="button" class="btn block" id="tourGo" style="margin-top:10px">👆 جولة سريعة على الأزرار</button>',
      mount(root) {
        const v = root.querySelector('#tourVid');
        v.onerror = () => { v.parentElement.hidden = true; root.querySelector('#tourVidNote').textContent = 'الفيديو موجود بنسخة التطبيق. جرّب الجولة السريعة.'; };
        try { const p = v.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* يشغّله المستخدم */ }
        root.querySelector('#tourGo').onclick = () => { A.closeSheet(); setTimeout(tour, 350); };
      },
    });
  }

  // جولة: طبقة شفافة فيها «فتحة» على الزر + بطاقة شرح وتالي/خلاص
  function tour() {
    write('done');
    let i = 0;
    const wrap = document.createElement('div');
    wrap.id = 'tourLayer';
    wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true');
    wrap.innerHTML = '<div class="tour-hole"></div><div class="tour-card"><b class="tour-t"></b><p class="tour-d"></p><div class="tour-row"><span class="tour-n small muted"></span><span style="flex:1"></span><button type="button" class="btn ghost tour-skip">خلاص</button><button type="button" class="btn primary tour-next">التالي</button></div></div>' +
      '<style>#tourLayer{position:fixed;inset:0;z-index:9999}#tourLayer .tour-hole{position:fixed;border-radius:18px;box-shadow:0 0 0 9999px rgba(10,26,30,.72);transition:all .35s cubic-bezier(.2,.8,.2,1);pointer-events:none}' +
      '#tourLayer .tour-card{position:fixed;left:16px;right:16px;background:var(--card,#fff);color:var(--text,#111);border-radius:20px;padding:16px 18px;box-shadow:0 20px 50px -10px rgba(0,0,0,.5);transition:top .35s}#tourLayer .tour-t{font-size:18px}#tourLayer .tour-d{margin:6px 0 12px;line-height:1.6}#tourLayer .tour-row{display:flex;gap:8px;align-items:center}' +
      '@media (prefers-reduced-motion:reduce){#tourLayer .tour-hole,#tourLayer .tour-card{transition:none}}</style>';
    document.body.appendChild(wrap);
    const hole = wrap.querySelector('.tour-hole'), card = wrap.querySelector('.tour-card');
    const steps = STEPS.filter(([sel]) => document.querySelector(sel));
    const end = () => { wrap.remove(); document.removeEventListener('keydown', key); };
    const key = (e) => { if (e.key === 'Escape') end(); };
    document.addEventListener('keydown', key);
    function show() {
      if (i >= steps.length) { end(); A.toast('يلا ابدأ 💪'); return; }
      const [sel, t, d] = steps[i], el = document.querySelector(sel);
      const r = el.getBoundingClientRect(), pad = 6;
      Object.assign(hole.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
      card.querySelector('.tour-t').textContent = t; card.querySelector('.tour-d').textContent = d;
      card.querySelector('.tour-n').textContent = (i + 1) + ' / ' + steps.length;
      card.querySelector('.tour-next').textContent = i === steps.length - 1 ? 'يلا 🚀' : 'التالي';
      const below = r.top < window.innerHeight / 2;
      card.style.top = below ? r.bottom + 18 + 'px' : 'auto';
      card.style.bottom = below ? 'auto' : window.innerHeight - r.top + 18 + 'px';
    }
    card.querySelector('.tour-next').onclick = () => { i++; show(); };
    card.querySelector('.tour-skip').onclick = end;
    wrap.addEventListener('click', (e) => { if (!card.contains(e.target)) { i++; show(); } });
    show();
  }

  // بطاقة بالرئيسية للمستخدم الجديد بس (بعد الترحيب، ولين يشوفها أو يقفلها)
  const prevTop = E.todayTop;
  E.todayTop = (...a) => {
    const s = A.st.settings || {};
    const card = s.onboarded && !read()
      ? '<section data-tk="tour"><div class="card" style="display:flex;gap:12px;align-items:center"><div style="font-size:30px">🎬</div><div style="flex:1;min-width:0"><b>تعرّف على حياتي</b><div class="small muted">فيديو 40 ثانية أو جولة سريعة على الأزرار</div>' +
        '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn primary" data-action="tour-video">▶️ شوف الفيديو</button><button class="btn ghost" data-action="tour-go">👆 جولة</button></div></div>' +
        '<button type="button" class="icon-x" data-action="tour-close" aria-label="قفل">✕</button></div></section>' : '';
    return card + (prevTop ? prevTop(...a) : '');
  };
  const prevAct = E.action;
  E.action = (name, el, e) => {
    if (name === 'tour-video') { video(); A.render(); return; }
    if (name === 'tour-go') { write('done'); A.render(); setTimeout(tour, 200); return; }
    if (name === 'tour-close') { write('done'); A.render(); return; }
    return prevAct ? prevAct(name, el, e) : undefined;
  };
  // من الإعدادات: «شرح التطبيق» دايماً
  const prevExtra = E.settingsExtra;
  E.settingsExtra = function () {
    return (prevExtra ? prevExtra.apply(this, arguments) : '') + '<div class="group-title">🎬 شرح التطبيق</div><div class="menu"><button data-set="tour-video"><div class="ico" style="' + A.tint('#13636B') + '">▶️</div><div style="flex:1;min-width:0"><b>فيديو الشرح (40 ث)</b><small>شوف كيف تستخدم حياتي</small></div>' + A.I('chevL') + '</button>' +
      '<button data-set="tour-go"><div class="ico" style="' + A.tint('#FF6B4A') + '">👆</div><div style="flex:1;min-width:0"><b>جولة سريعة</b><small>نأشّر لك على الأزرار المهمة</small></div>' + A.I('chevL') + '</button></div>';
  };
  const prevSet = E.settingsAction;
  E.settingsAction = async function (act) {
    if (act === 'tour-video') { A.closeSheet(); setTimeout(video, 300); return true; }
    if (act === 'tour-go') { A.closeSheet(); setTimeout(tour, 400); return true; }
    return prevSet ? prevSet.apply(this, arguments) : false;
  };
  E.Tour = { video, tour, KEY };
})();
