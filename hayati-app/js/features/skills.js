// DW-074: مهارات المساعد بالجهاز (بدون حساب وبدون نت): سجّل مصروف أو دخل، ذكّرني، المشتريات، وش عندي، كم صرفت، كم باقي
// أي شي يكتب ببياناتك يطلع كاقتراح وتأكده أنت؛ والأسئلة المفتوحة تروح للذكاء (لو متوفر)
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, st } = A;
  const P = window.SmsParser;
  const pad = (n) => String(n).padStart(2, '0');
  const digits = (s) => String(s).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/٫/g, '.');
  const money = (n) => A.fmt(n);
  const DAYS = [[0, /الأحد|الاحد/], [1, /الاثنين|الإثنين/], [2, /الثلاثاء/], [3, /الأربعاء|الاربعاء/], [4, /الخميس/], [5, /الجمعة|الجمعه/], [6, /السبت/]];

  // ---------- الوقت: اليوم/بكرة/بعد بكرة/يوم بالاسم + الساعة ----------
  function whenOf(q) {
    const now = new Date();
    const d = new Date(now); d.setSeconds(0, 0);
    let dayGiven = false;
    if (/بعد\s*بكر[ةه]/.test(q)) { d.setDate(d.getDate() + 2); dayGiven = true; }
    else if (/بكر[ةه]|باچر|باكر/.test(q)) { d.setDate(d.getDate() + 1); dayGiven = true; }
    else if (/اليوم|الليلة|الحين/.test(q)) dayGiven = true;
    else { const w = DAYS.find(([, re]) => re.test(q)); if (w) { let add = (w[0] - d.getDay() + 7) % 7; if (add === 0) add = 7; d.setDate(d.getDate() + add); dayGiven = true; } }
    const m = /(?:الساعة|الساعه|ساعة|@)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(ص|م|الصبح|العصر|المغرب|بالليل|الليل|am|pm)?/i.exec(q) || /\b(\d{1,2})[:.](\d{2})\s*(ص|م|am|pm)?/i.exec(q);
    let timed = false;
    if (m) {
      let H = Number(m[1]); const M = Number(m[2] || 0);
      const mer = m[3] || '';
      if (H > 23 || M > 59) return null;
      if (/م|العصر|المغرب|الليل|pm/i.test(mer) && H < 12) H += 12;
      else if (/ص|الصبح|am/i.test(mer) && H === 12) H = 0;
      else if (!mer && H >= 1 && H <= 7) H += 12;   // «الساعة 5» بدون ص/م = العصر
      d.setHours(H, M);
      timed = true;
      if (!dayGiven && d < now) d.setDate(d.getDate() + 1);
    } else d.setHours(9, 0);
    return (dayGiven || timed) ? { at: d, timed, re: m } : null;
  }
  const whenLabel = (d) => {
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - t0) / 86400000);
    const day = diff === 0 ? 'اليوم' : diff === 1 ? 'بكرة' : A.DAYS[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1);
    return day + ' ' + A.time12(pad(d.getHours()) + ':' + pad(d.getMinutes()));
  };
  const dayOffset = (q) => (/بعد\s*بكر[ةه]/.test(q) ? 2 : /بكر[ةه]|باچر|باكر/.test(q) ? 1 : 0);

  // ---------- المهارات ----------
  const SKILLS = [
    // مساعدة
    [/^(وش|شو|ايش|شنو)\s+(تقدر|تسوي)|^مساعد[ةه]$|^help$/i, () => ({ text: helpText() })],

    // DW-086: «كم أحتاج سعرات؟» · «كم بروتين احتاج» ← من «احسب احتياجك» (على الجهاز)
    [/^كم\s+(?:احتاج|أحتاج|يحتاج جسمي)|^(?:كم\s+)?(?:سعرات|بروتين)\s+(?:احتاج|أحتاج)/, () => {
      const p = st.settings && st.settings.body_needs, c = p && E._needsCalc ? E._needsCalc(p) : null;
      if (!c) return { text: 'ما حسبنا احتياجك للحين. افتح «الدراسة ← صحتي ← احسب احتياجك» وحط وزنك وطولك 💪' };
      return { text: 'احتياجك باليوم تقريباً: ' + c.kcal.toLocaleString('en') + ' سعرة و' + c.protein + ' غم بروتين (' + c.goal + ') · تقدير، مو نصيحة طبية' };
    }],

    // DW-086: «كم سعرة في المجبوس؟» ← من وصفات المطبخ (تقدير من المقادير)
    [/^كم\s+سعر[ةه]\s+/, (q) => {
      const C = window.HayatiCalories, R = window.HAYATI_RECIPES;
      if (!C || !R) return null;
      const name = q.replace(/^كم\s+سعر[ةه]\s+/, '').replace(/^(في|فى|بـ?|ب)\s*/, '').replace(/^ال(?=\S{3,})/, '').trim();
      if (name.length < 2) return null;
      const hit = R.find((r) => r.name.replace(/^ال/, '').includes(name)) || R.find((r) => r.name.includes(name.split(' ')[0]));
      if (!hit) return { text: 'ما لقيت «' + name + '» بالمطبخ. جرّب اسم الأكلة مثل: «كم سعرة في المجبوس؟»' };
      const k = C.recipeKcal(hit);
      return { text: k ? hit.icon + ' ' + hit.name + ': ≈ ' + k.toLocaleString('en') + ' سعرة للحصة (تقدير من مقادير الوصفة)' : hit.name + ': سعراتها قليلة جداً' };
    }],

    // ذكّرني / موعد ← مهمة بوقت
    [/^(ذكرني|ذكّرني|نبهني|نبّهني|فكرني|موعد|عندي موعد)(?=\s|$)/, (q) => {
      const w = whenOf(q);
      if (!w) return { text: 'متى أذكّرك؟ مثلاً: «ذكّرني بكرة الساعة 5 م أدفع الإيجار»' };
      let title = q.replace(/^(ذكرني|ذكّرني|نبهني|نبّهني|فكرني|عندي موعد|موعد)\s*/, '').replace(w.re ? w.re[0] : '', ' ')
        .replace(/بعد\s*بكر[ةه]|بكر[ةه]|باچر|باكر|اليوم|الليلة|الحين/g, ' ').replace(/(?:يوم\s+)?(?:الأحد|الاحد|الاثنين|الإثنين|الثلاثاء|الأربعاء|الاربعاء|الخميس|الجمعة|الجمعه|السبت)/g, ' ')
        .replace(/^\s*(إني|اني|ان|أن|ب|على)\s+/, '').replace(/\s+/g, ' ').trim();
      if (!title) title = 'تذكير';
      const kind = /^(موعد|عندي موعد)/.test(q) ? 'appointment' : 'personal';
      return { text: 'أضيف مهمة «' + title + '» ' + whenLabel(w.at) + '؟', label: 'أضف', run: () => { S.upsert('tasks', { title: title.slice(0, 80), kind, due_at: w.at.toISOString(), done: false, notes: null }); return 'انضافت ✓ تلقاها بالمهام'; } };
    }],

    // المشتريات
    [/(للمشتريات|بالمشتريات|لقائمة المشتريات|بقائمة المشتريات)|^(ضيف|أضف|اضف)\s+.+\s+(للبقالة|بالبقالة)$/, (q) => {
      const body = q.replace(/(للمشتريات|بالمشتريات|لقائمة المشتريات|بقائمة المشتريات|للبقالة|بالبقالة)/g, ' ').replace(/^\s*(ضيف|أضف|اضف|حط|زيد|نبي|ابي|أبي)\s+/, '').trim();
      const items = body.split(/\s*(?:،|,|\s+و(?=\S))\s*/).map((x) => x.trim()).filter(Boolean).slice(0, 12);
      if (!items.length) return { text: 'وش أضيف؟ مثلاً: «ضيف حليب وخبز للمشتريات»' };
      return { text: 'أضيف للمشتريات: ' + items.join('، ') + '؟', label: 'أضف', run: () => { items.forEach((name) => S.upsert('shopping', { name: name.slice(0, 60), qty: null, done: false })); return 'انضافت ✓ (' + items.length + ')'; } };
    }],

    // وش عندي اليوم/بكرة
    [/(وش|شو|ايش|شنو)\s+(عندي|جدولي|برنامجي)|^جدول(ي)?\s+(اليوم|بكر[ةه])/, (q) => {
      const off = dayOffset(q);
      const d = new Date(); d.setDate(d.getDate() + off);
      const key = d.toDateString();
      const cls = st.courses.filter((c) => (c.days || []).includes(d.getDay())).sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)))
        .map((c) => '• ' + A.time12(c.start_time) + ' ' + c.name);
      const tasks = st.tasks.filter((t) => !t.done && t.due_at && new Date(t.due_at).toDateString() === key).sort((a, b) => new Date(a.due_at) - new Date(b.due_at))
        .map((t) => '• ' + A.time12(pad(new Date(t.due_at).getHours()) + ':' + pad(new Date(t.due_at).getMinutes())) + ' ' + t.title);
      const label = off === 0 ? 'اليوم' : off === 1 ? 'بكرة' : 'بعد بكرة';
      if (!cls.length && !tasks.length) return { text: label + ' فاضي 👌 ما عندك حصص ولا مهام بموعد' };
      return { text: label + ':\n' + cls.concat(tasks).join('\n') };
    }],

    // كم باقي من الميزانية
    [/(كم|شكثر)\s+(باقي|بقى|تبقى)|باقي\s+من\s+(الميزانية|ميزانيتي)|^ميزانيتي/, () => {
      const b = Number(st.settings.budget) || 0;
      const spent = A.sums(A.txInMonth(A.monthKey(new Date()))).exp;
      if (!b) return { text: 'صرفت هالشهر ' + money(spent) + ' · ما حطيت ميزانية للحين (من «الفلوس»)' };
      const left = b - spent;
      const end = new Date(); end.setMonth(end.getMonth() + 1, 0);
      const days = Math.max(1, end.getDate() - new Date().getDate() + 1);
      return { text: left >= 0 ? 'باقي ' + money(left) + ' من ' + money(b) + ' · يعني تقريباً ' + money(left / days) + ' باليوم لآخر الشهر' : 'تعدّيت الميزانية بـ ' + money(-left) + ' (الميزانية ' + money(b) + ')' };
    }],

    // كم صرفت (على X) اليوم/هالأسبوع/هالشهر
    [/كم\s+(صرفت|دفعت)/, (q) => {
      const now = new Date();
      let from, label;
      if (/اليوم/.test(q)) { from = new Date(now); from.setHours(0, 0, 0, 0); label = 'اليوم'; }
      else if (/(هال|هذا ال|ال)?أسبوع|الاسبوع|هالاسبوع/.test(q)) { from = new Date(now); from.setDate(from.getDate() - 6); from.setHours(0, 0, 0, 0); label = 'آخر 7 أيام'; }
      else { from = new Date(now.getFullYear(), now.getMonth(), 1); label = 'هالشهر'; }
      const on = (/على\s+(.+?)\s*(?:اليوم|هالشهر|هالاسبوع|هالأسبوع|الشهر|الاسبوع|الأسبوع|؟|\?|$)/.exec(q) || [])[1];
      let list = st.transactions.filter((t) => t.kind === 'expense' && new Date(t.occurred_at) >= from);
      if (on) {
        const words = on.split(/\s+و|\s+/).map((w) => w.trim()).filter((w) => w.length > 1);
        list = list.filter((t) => words.some((w) => String(t.category || '').includes(w) || String(t.merchant || '').toLowerCase().includes(w.toLowerCase()) || (P && String(P.categorize('expense', w, w)) === t.category && !/أخرى|اخرى/.test(t.category))));
      }
      const sum = list.reduce((s, t) => s + Number(t.amount || 0), 0);
      return { text: 'صرفت ' + label + (on ? ' على ' + on : '') + ': ' + money(sum) + ' (' + list.length + ' عملية)' };
    }],

    // سجّل مصروف أو دخل: «صرفت 2.5 قهوة» · «سجل 3 بنزين» · «استلمت 450 راتب»
    [/^(صرفت|دفعت|سجل|سجّل|اشتريت|حط مصروف|استلمت|جاني|انضاف|دخل)(?=\s|$)|^[+-]?\d+(?:[.,]\d+)?\s+\S|\S\s+\d+(?:[.,]\d+)?\s*(?:د\.?\s?ب|bd|bhd|دينار)?$/i, (q) => {
      if (!P) return null;
      const income = /^(استلمت|جاني|انضاف|دخل)(?=\s|$)|راتب/.test(q);
      const rest = digits(q).replace(/^(صرفت|دفعت|سجل|سجّل|اشتريت|حط مصروف|استلمت|جاني|انضاف|دخل)\s*/, '').replace(/\s(على|في|ب|حق)\s/g, ' ').trim();
      const r = P.quick((income ? '+' : '') + rest.replace(/^\+/, ''));
      if (!r) return null;
      const t = { kind: r.kind, amount: r.amount, merchant: r.merchant || null, category: r.category, occurred_at: new Date().toISOString(), source: 'assistant' };
      return { text: (r.kind === 'income' ? 'أسجّل دخل ' : 'أسجّل مصروف ') + money(r.amount) + (r.merchant ? ' · ' + r.merchant : '') + (r.merchant === r.category ? '' : ' (' + r.category + ')') + '؟', label: 'سجّل', run: () => { S.upsert('transactions', t); return 'انسجّل ✓'; } };
    }],
  ];

  function helpText() {
    return 'أقدر بدون نت:\n• «صرفت 1.5 قهوة» ← أسجّل المصروف\n• «ذكّرني بكرة الساعة 5 م أدفع الإيجار»\n• «ضيف حليب وخبز للمشتريات»\n• «وش عندي اليوم؟» أو بكرة\n• «كم صرفت هالشهر على الأكل؟»\n• «كم باقي من الميزانية؟»\n• «كم سعرة في المجبوس؟» أو «كم أحتاج سعرات؟»\n• 📎 ارفع أي ملف وأرتّبه' +
      (aiReady() ? '\nوأي سؤال ثاني أسأل فيه Claude ✨' : '');
  }
  const aiReady = () => !!(window.__hayatiSample || (S.status && S.status.signedIn && S.invokeFn && !S.status.aiOff));

  function localSkill(raw) {
    const q = digits(String(raw || '')).replace(/[؟?!.]+$/, '').replace(/\s+/g, ' ').trim();
    if (!q) return null;
    for (const [re, fn] of SKILLS) if (re.test(q)) { const r = fn(q); if (r) return r; }
    return null;
  }

  E.localSkill = localSkill;
  E.skillsHelp = helpText;
})();
