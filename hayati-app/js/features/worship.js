// ورد القرآن + زر «اقرأ» (DW-014)
// قاعدة ثابتة: ما فيه أي نص ديني داخل التطبيق (لا آيات ولا أذكار ولا أدعية). نرتّب الوقت بس، والقراءة من تطبيقك أو كتابك.
// الورد بإعدادات الجهاز (settings.wird) وما يطلع من الجوال، ويدخل بالنسخة الاحتياطية
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, st, I, h, tint } = A;
  const wrap = (name, fn) => { const prev = E[name]; E[name] = (...a) => fn(prev ? prev : () => '', ...a); };
  const pad = (n) => String(n).padStart(2, '0');
  const dateKey = (d) => { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const PAGES = 604, JUZ = 20;
  const DEF_LINK = 'https://quran.com';

  function wird() { return Object.assign({ on: false, unit: 'page', goal: 5, pos: 0, khatmat: 0, log: {}, link: DEF_LINK }, st.settings.wird || {}); }
  function save(w) {
    // نخلي آخر 60 يوم بس بالسجل
    const keys = Object.keys(w.log || {}).sort();
    if (keys.length > 60) for (const k of keys.slice(0, keys.length - 60)) delete w.log[k];
    S.setSettings({ wird: w });
  }
  const goalPages = (w) => Math.max(1, Math.round(Number(w.goal) || 1) * (w.unit === 'juz' ? JUZ : 1));
  const unitWord = (w, n) => (w.unit === 'juz' ? (n === 1 ? 'جزء' : n === 2 ? 'جزئين' : 'أجزاء') : (n === 1 ? 'صفحة' : n === 2 ? 'صفحتين' : 'صفحات'));
  const fmtN = (w, pages) => (w.unit === 'juz' ? Math.round((pages / JUZ) * 10) / 10 : pages);

  // تسجيل صفحات: يحرّك الختمة، ولو خلصت تبدأ وحدة جديدة
  function addPages(n) {
    const w = wird(), k = dateKey();
    w.log = Object.assign({}, w.log); w.log[k] = Math.max(0, (w.log[k] || 0) + n);
    let pos = (Number(w.pos) || 0) + n, done = false;
    if (pos >= PAGES) { pos -= PAGES; w.khatmat = (w.khatmat || 0) + 1; done = true; }
    w.pos = Math.max(0, pos);
    save(w);
    return done;
  }
  function eta(w) {
    const left = PAGES - (Number(w.pos) || 0);
    return Math.ceil(left / goalPages(w));
  }

  function card() {
    const w = wird();
    if (!w.on) return '';
    const today = (w.log || {})[dateKey()] || 0, g = goalPages(w), done = today >= g;
    const pct = Math.min(100, Math.round(((Number(w.pos) || 0) / PAGES) * 100));
    const left = eta(w);
    return '<div class="card wird-card"><div style="display:flex;align-items:center;gap:12px"><div class="ico" style="' + tint('#0d9488') + '">' + I('book') + '</div>' +
      '<div style="flex:1;min-width:0"><b>ورد القرآن</b><div class="small muted">اليوم <b class="num">' + fmtN(w, today) + '</b> من ' + fmtN(w, g) + ' ' + unitWord(w, fmtN(w, g)) + (done ? ' ✓' : '') + '</div></div>' +
      '<button class="btn" data-action="wird-read">' + I('book') + 'اقرأ</button></div>' +
      '<div class="meter" style="margin:12px 0 6px"><span style="width:' + pct + '%;background:#0d9488"></span></div>' +
      '<div class="small muted">الختمة ' + pct + '%' + (w.khatmat ? ' · ختمت ' + w.khatmat + (w.khatmat === 1 ? ' مرة' : ' مرات') : '') + ' · تختم بعد ' + left + ' يوم تقريباً</div>' +
      '<div style="display:flex;gap:8px;margin-top:10px"><button class="btn ghost" data-action="wird-add" data-n="1">+1 صفحة</button>' +
      (done ? '' : '<button class="btn primary" style="flex:1" data-action="wird-add" data-n="' + (g - today) + '">خلّصت وردي</button>') + '</div></div>';
  }

  function openLink() {
    const url = wird().link || DEF_LINK;
    if (!/^https:\/\//.test(url)) { A.toast('الرابط لازم يبدأ بـ https://'); return; }
    if (window.HayatiNative && window.HayatiNative.openLink) window.HayatiNative.openLink(url);
    else window.open(url, '_blank', 'noopener');
  }

  function setupSheet() {
    const w = wird();
    const native = !!(window.HayatiNative && window.HayatiNative.prefs);
    const np = native ? window.HayatiNative.prefs() : {};
    A.openSheet({
      title: 'ورد القرآن والأذكار',
      body: '<p class="small muted" style="margin:0 4px 12px">«حياتي» يرتب وقتك بس: تقرا من مصحفك أو تطبيقك، وتسجّل هني. ما نعرض آيات ولا أذكار، وكل شي يظل على جوالك.</p>' +
        '<label style="display:flex;align-items:center;justify-content:space-between;margin:0 4px 12px"><b>📖 ورد يومي</b><input type="checkbox" name="w_on"' + (w.on ? ' checked' : '') + ' style="width:22px;height:22px;accent-color:var(--brand)"></label>' +
        '<div class="seg" id="wUnit" style="margin-bottom:10px">' + [['page', 'صفحات'], ['juz', 'أجزاء']].map(([k, l]) => '<button type="button" data-u="' + k + '" class="' + (w.unit === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div>' +
        '<div class="field"><label>كم باليوم؟</label><input name="w_goal" inputmode="numeric" value="' + (Number(w.goal) || 5) + '"></div>' +
        '<div class="field"><label>وين وصلت بالختمة (صفحة)</label><input name="w_pos" inputmode="numeric" value="' + (Number(w.pos) || 0) + '"></div>' +
        '<div class="field"><label>زر «اقرأ» يفتح</label><input name="w_link" class="ltr" inputmode="url" value="' + h(w.link || DEF_LINK) + '"></div>' +
        '<p class="small muted" style="margin:0 4px 14px">رابط تطبيق القرآن اللي تستخدمه أو أي موقع موثّق. الافتراضي quran.com.</p>' +
        (native ? '<label style="display:flex;align-items:center;justify-content:space-between;margin:0 4px"><span><b>📿 تذكير الأذكار</b><div class="small muted">بعد الفجر والعصر بنص ساعة: «وقت أذكار الصباح / المساء»</div></span><input type="checkbox" name="w_adhkar"' + (np.adhkar ? ' checked' : '') + ' style="width:22px;height:22px;accent-color:var(--brand)"></label>' :
          '<p class="small muted" style="margin:0 4px">📿 تذكير الأذكار يشتغل بنسخة الجوال.</p>'),
      mount(root) {
        root.querySelector('#wUnit').onclick = (e) => { const b = e.target.closest('[data-u]'); if (b) root.querySelectorAll('#wUnit button').forEach((x) => x.classList.toggle('on', x === b)); };
      },
      onSave(root) {
        const goal = Math.round(A.parseAmount(A.val(root, 'w_goal')));
        if (!(goal >= 1 && goal <= 604)) throw new Error('اكتب رقم صحيح لوردك اليومي');
        const pos = Math.round(A.parseAmount(A.val(root, 'w_pos')) || 0);
        if (!(pos >= 0 && pos < PAGES)) throw new Error('الصفحة من 0 لين 603');
        const link = A.val(root, 'w_link') || DEF_LINK;
        if (!/^https:\/\/[^\s]+$/.test(link)) throw new Error('الرابط لازم يبدأ بـ https://');
        const unit = (root.querySelector('#wUnit .on') || {}).dataset.u || 'page';
        save(Object.assign(wird(), { on: root.querySelector('[name=w_on]').checked, unit, goal, pos, link }));
        if (native) {
          const on = root.querySelector('[name=w_adhkar]').checked;
          window.HayatiNative.savePrefs(Object.assign({}, window.HayatiNative.prefs(), { adhkar: on }));
          window.HayatiNative.reschedule();
        }
        A.toast('انحفظ ✓');
      },
    });
  }

  // ================= الربط =================
  wrap('todayMid', (prev) => '<section data-tk="wird">' + card() + '</section>' + prev());
  wrap('chooserItems', (prev, item) => prev(item) + item('wird', 'book', '#0d9488', 'ورد القرآن والأذكار', 'هدف يومي، عداد ختمة، وتذكير'));
  wrap('pick', (prev, k) => { if (k === 'wird') { A.closeSheet(); setTimeout(setupSheet, 280); return; } return prev(k); });
  wrap('settingsExtra', (prev) => '<div class="group-title">' + I('book') + 'العبادة</div><div class="menu">' +
    '<button data-set="wird"><div class="ico" style="' + tint('#0d9488') + '">' + I('book') + '</div><div style="flex:1;min-width:0"><b>ورد القرآن والأذكار</b><small>' + (wird().on ? 'شغّال · ' + wird().goal + ' ' + unitWord(wird(), Number(wird().goal)) + ' باليوم' : 'مطفّي') + '</small></div>' + I('chevL') + '</button></div>' + prev());
  const prevSet = E.settingsAction;
  E.settingsAction = async function (act) {
    if (act === 'wird') { A.closeSheet(); setTimeout(setupSheet, 280); return true; }
    return prevSet ? prevSet.apply(this, arguments) : false;
  };
  wrap('action', (prev, name, el, e) => {
    switch (name) {
      case 'wird-read': openLink(); return;
      case 'wird-add': {
        const done = addPages(Number(el.dataset.n) || 1);
        A.toast(done ? 'ختمت القرآن 🤍 تقبّل الله' : 'انحفظ ✓');
        return;
      }
      default: return prev(name, el, e);
    }
  });
  E.Wird = { addPages, eta, goalPages, PAGES };
})();
