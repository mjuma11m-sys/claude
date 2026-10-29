// DW-094: «وين نروح الويكند؟» — أفكار طلعات بالبحرين تناسب الباقي من ميزانيتك وعدد الناس والجو.
// الأسعار تقديرية للشخص (أنواع أماكن ومناطق، مو محلات بعينها) وتشتغل بدون نت وبدون ذكاء اصطناعي.
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, st, h } = A;

  // [الإيموجي، الفكرة، وين، أقل، أكثر (د.ب للشخص)، النوع، داخلي؟]
  const IDEAS = [
    ['🌅', 'مشي على الكورنيش وقت الغروب', 'ممشى عراد · الكورنيش', 0, 0, 'outdoor', 0],
    ['🏖️', 'بحر وسباحة', 'شاطئ عام (البديع، الجزائر)', 0, 1, 'outdoor', 0],
    ['🧺', 'نزهة بحديقة مع أكل من البيت', 'حديقة عامة قريبة منك', 0, 1, 'outdoor', 0],
    ['🚴', 'ركوب سيكل', 'ممشى أو مسار دراجات', 0, 2, 'sport', 0],
    ['🏛️', 'زيارة متحف أو قلعة', 'المتحف الوطني · قلعة البحرين', 0, 2, 'culture', 1],
    ['🕌', 'جولة بالسوق القديم', 'باب البحرين · سوق المنامة · المحرق', 0, 3, 'culture', 0],
    ['☕', 'قهوة وجلسة', 'مقاهي العدلية أو السيف', 2, 4, 'food', 1],
    ['🥙', 'عشا خفيف (شاورما، كرك، سمبوسة)', 'أي منطقة', 1, 3, 'food', 0],
    ['🍔', 'مطعم مع الربع', 'العدلية · أمواج · الجفير', 5, 10, 'food', 1],
    ['🍽️', 'عشا مطعم فخم', 'الفنادق · خليج البحرين', 15, 30, 'food', 1],
    ['🎬', 'سينما', 'أقرب مجمع', 4, 7, 'fun', 1],
    ['🎳', 'بولينغ', 'مجمع أو صالة بولينغ', 3, 6, 'fun', 1],
    ['🕹️', 'ألعاب وأركيد', 'مجمع تجاري', 3, 10, 'fun', 1],
    ['⚽', 'حجز ملعب مع الربع', 'ملعب صناعي (تقسيم الحجز)', 2, 4, 'sport', 0],
    ['🏎️', 'كارتينغ', 'حلبة كارتينغ', 15, 30, 'sport', 0],
    ['🚤', 'طلعة بحر أو جت سكي', 'مرسى (تقسيم الحجز)', 10, 25, 'outdoor', 0],
    ['🏕️', 'كشتة وشوي بالبر', 'الصخير (موسم البر)', 3, 6, 'outdoor', 0],
    ['🛍️', 'مشي بالمجمع (بدون شراء 😅)', 'أي مجمع', 0, 1, 'fun', 1],
    ['🎨', 'معرض أو فعالية مجانية', 'تابع حسابات الفعاليات', 0, 2, 'culture', 1],
    ['🏋️', 'تمرين أو كلاس تجريبي', 'جيم أو نادي (حصة يومية)', 0, 5, 'sport', 1],
  ];
  const TYPES = { all: 'الكل', outdoor: '🌿 برّا', food: '🍽️ أكل', fun: '🎉 ترفيه', sport: '⚽ رياضة', culture: '🏛️ ثقافة' };

  // كم باقي من الميزانية، وكم ويكند باقي لين الراتب/آخر الشهر
  function room() {
    const budget = Number(st.settings.budget) || 0;
    const key = A.monthKey(new Date()), rg = A.monthRange(key);
    const spent = A.sums(A.txInMonth(key)).exp;
    let weekends = 0;
    for (let d = new Date(); d < rg.end; d.setDate(d.getDate() + 1)) if (d.getDay() === 5) weekends++;
    weekends = Math.max(1, weekends);
    if (!budget) return { budget: 0, left: null, weekends, per: null };
    const left = Math.max(0, budget - spent);
    // ثلث الباقي للطلعات، موزّع على الويكندات (الباقي للأساسيات)
    return { budget, left, weekends, per: Math.floor((left / 3 / weekends) * 2) / 2 };
  }
  const cur = () => (window.HayatiCur && HayatiCur.sym ? HayatiCur.sym() : (window.HayatiLang && HayatiLang.lang === 'en' ? 'BHD' : 'د.ب'));
  const hot = (m) => m >= 4 && m <= 9;   // مايو–أكتوبر: الأولوية للأماكن الداخلية أو بعد المغرب

  function pick(cap, people, type, month) {
    const list = IDEAS.map(([em, title, where, lo, hi, kind, indoor]) => ({ em, title, where, lo, hi, kind, indoor: !!indoor, total: hi * people }))
      .filter((x) => (type === 'all' || x.kind === type) && (cap == null || x.lo * people <= cap));
    const summer = hot(month);
    const fits = (x) => (cap == null || x.hi * people <= cap ? 1 : 0);
    // اللي يدخل كامل بالمبلغ أول، بعدين الداخلي بالصيف، بعدين الأقرب للمبلغ (أو الأرخص لو ما فيه حد)
    return list.sort((a, b) => fits(b) - fits(a) || (summer ? b.indoor - a.indoor : 0) || (cap == null ? a.lo - b.lo : b.hi - a.hi)).slice(0, 8);
  }

  function nextFriday() { const d = new Date(); d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7)); d.setHours(17, 0, 0, 0); return d; }

  function sheet() {
    const r = room(), month = new Date().getMonth();
    let people = 1, type = 'all', cap = r.per;
    const draw = (root) => {
      const list = pick(cap, people, type, month);
      root.querySelector('#wkList').innerHTML = list.length ? list.map((x, i) =>
        '<li class="row" style="cursor:default"><div style="font-size:26px">' + x.em + '</div><div class="main"><div class="title"><b>' + h(x.title) + '</b></div>' +
        '<div class="sub"><span>' + h(x.where) + '</span> · ' + (x.hi ? '<bdi>≈ \u2066' + (x.lo ? x.lo * people + '–' : '') + x.hi * people + '\u2069 ' + cur() + '</bdi>' : '<span>مجاني</span>') + (hot(month) && !x.indoor ? ' · <span>بعد المغرب</span>' : '') + '</div></div>' +
        '<button class="btn ghost" type="button" data-wk="' + i + '">＋ خطة</button></li>').join('') :
        '<li class="row" style="cursor:default"><div class="main">ما فيه شي بهالمبلغ 😅 جرّب «الكل» أو زيد المبلغ</div></li>';
      root.querySelectorAll('[data-wk]').forEach((b) => { b.onclick = () => {
        const x = list[Number(b.dataset.wk)];
        S.upsert('tasks', { title: x.em + ' ' + x.title + ' (' + x.where + ')', due_at: nextFriday().toISOString(), done: false, note: x.hi ? 'ميزانية ≈ ' + A.fmt(x.hi * people) + ' د.ب' : null });
        A.toast('انضافت لمهام الجمعة ✓');
      }; });
    };
    A.openSheet({
      title: '🌴 وين نروح الويكند؟',
      cancelLabel: 'تم',
      body: '<div class="card" style="text-align:center">' + (r.per != null
        ? '<div class="small muted"><span>باقي من ميزانيتك</span> <bdi>' + A.fmt(r.left) + ' ' + cur() + '</bdi> · <span>ويكندات لين آخر الشهر:</span> <bdi>' + r.weekends + '</bdi></div><b style="font-size:22px"><span>مساحتك للطلعة</span> <bdi>≈ ' + A.fmt(r.per) + ' ' + cur() + '</bdi></b>'
        : '<div class="small muted">ما حددت ميزانية الشهر، فبنوريك كل الأفكار. حددها من «فلوسي» عشان نقترح على قدّها.</div>') + '</div>' +
        '<div class="two"><div class="field"><label>كم شخص؟</label><input name="wk_p" type="number" min="1" max="20" value="1" inputmode="numeric"></div>' +
        '<div class="field"><label>المبلغ (د.ب)</label><input name="wk_c" type="number" min="0" step="0.5" inputmode="decimal" value="' + (r.per != null ? r.per : '') + '" placeholder="بدون حد"></div></div>' +
        '<div class="seg" id="wkT">' + Object.entries(TYPES).map(([k, l]) => '<button type="button" data-k="' + k + '" class="' + (k === 'all' ? 'on' : '') + '">' + l + '</button>').join('') + '</div>' +
        '<ul class="list" id="wkList" style="margin-top:10px"></ul>' +
        '<p class="small muted" style="margin:8px 4px 0"><span>الأسعار تقدير للشخص، تأكد منها قبل تروح.</span>' + (hot(month) ? ' <span>الجو حار: قدّمنا الأماكن الداخلية.</span>' : '') + '</p>',
      mount(root) {
        const P = root.querySelector('[name=wk_p]'), C = root.querySelector('[name=wk_c]');
        P.oninput = () => { people = Math.min(20, Math.max(1, Math.round(Number(P.value) || 1))); draw(root); };
        C.oninput = () => { cap = C.value === '' ? null : Math.max(0, Number(C.value) || 0); draw(root); };
        A.segPick(root, '#wkT', (k) => { type = k; draw(root); });
        draw(root);
      },
    });
  }

  const prevMoney = E.moneyActions;
  E.moneyActions = (...a) => (prevMoney ? prevMoney(...a) : '') + '<button class="btn ghost block" style="margin:0 0 4px" data-action="weekend">🌴 وين نروح الويكند؟</button>';
  // بطاقة صغيرة بـ«اليوم» من الخميس للسبت
  const prevMid = E.todayMid;
  E.todayMid = (...a) => {
    const d = new Date().getDay();
    return (prevMid ? prevMid(...a) : '') + (d === 4 || d === 5 || d === 6
      ? '<section data-tk="weekend"><button class="card" data-action="weekend" style="display:flex;gap:12px;align-items:center;width:100%;text-align:start"><div style="font-size:28px">🌴</div><div><b>وين نروح الويكند؟</b><div class="small muted">أفكار على قد ميزانيتك</div></div></button></section>' : '');
  };
  const prevAct = E.action;
  E.action = (name, el, e) => (name === 'weekend' ? sheet() : prevAct ? prevAct(name, el, e) : undefined);
  E.Weekend = { room, pick, IDEAS, sheet };
})();
