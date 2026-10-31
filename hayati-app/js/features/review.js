// DW-113: مراجعة ذكية لأسئلة المحاضرات — يكمّل «اختبرني» اللي عندنا:
// (1) «📚 راجع اليوم»: كل بطاقة لها صندوق (1 إلى 5). عرفتها ← تطلع بعد أيام أكثر، ما عرفتها ← ترجع بكرة (تكرار متباعد).
// (2) «❌ راجع أغلاطك»: الأسئلة اللي غلطت فيها لين تعرفها مرتين.
// (3) قبل الاختبار: لو عندك اختبار مادة خلال 3 أيام وفيه بطاقات لها، يطلع لك بالرئيسية «راجع مادة الاختبار».
// (4) سلسلة المذاكرة: كم يوم ورا بعض راجعت أو ذاكرت. التقدم على الجهاز (hayati-cards).
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E || !E.Lectures) return;
  const { st, h } = A;
  const KEY = 'hayati-cards';
  const GAP = [0, 1, 2, 4, 8, 16];   // أيام قبل ما تطلع البطاقة مرة ثانية حسب صندوقها
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const addD = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const load = () => { try { return Object.assign({ cards: {}, days: [] }, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return { cards: {}, days: [] }; } };
  const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* تجاهل */ } };
  const allCards = () => (st.lectures || []).flatMap((l) => (l.cards || []).filter((c) => c.id).map((c) => ({ c, l })));

  function mark(id, ok, now) {
    now = now || new Date();
    const v = load(), x = v.cards[id] || { box: 0, wrong: 0, right: 0 };
    if (ok) { x.box = Math.min(5, (x.box || 0) + 1); x.right = (x.right || 0) + 1; if (x.wrong && x.fix != null) x.fix++; }
    else { x.box = 1; x.wrong = (x.wrong || 0) + 1; x.fix = 0; }
    x.due = ymd(addD(now, ok ? GAP[x.box] : 1)); x.last = ymd(now);
    v.cards[id] = x;
    const d = ymd(now); if (!v.days.includes(d)) v.days = v.days.concat(d).slice(-120);
    save(v);
  }
  // اللي موعدها اليوم أو قبل، أو ما انراجعت أبداً — الصناديق الصغيرة أول
  function due(now) {
    const v = load(), today = ymd(now || new Date());
    return allCards().filter(({ c }) => { const x = v.cards[c.id]; return !x || !x.due || x.due <= today; })
      .sort((a, b) => ((v.cards[a.c.id] || {}).box || 0) - ((v.cards[b.c.id] || {}).box || 0)).map(({ c }) => c.id);
  }
  // غلطت فيها وللحين ما عرفتها مرتين بعدها
  function mistakes() {
    const v = load();
    return allCards().filter(({ c }) => { const x = v.cards[c.id]; return x && x.wrong > 0 && (x.fix || 0) < 2; })
      .sort((a, b) => (v.cards[b.c.id].wrong || 0) - (v.cards[a.c.id].wrong || 0)).map(({ c }) => c.id);
  }
  // سلسلة: أيام ورا بعض (لين اليوم أو أمس) راجعت فيها بطاقات أو سجّلت جلسة مذاكرة
  function streak(now) {
    now = now || new Date();
    const days = new Set(load().days.concat((st.study_sessions || []).map((s) => ymd(new Date(s.started_at)))));
    let d = days.has(ymd(now)) ? now : addD(now, -1), n = 0;
    while (days.has(ymd(d))) { n++; d = addD(d, -1); }
    return n;
  }
  // اختبار مادة خلال 3 أيام، ولها بطاقات
  function examSoon(now) {
    now = now || new Date();
    const lim = addD(now, 4);
    for (const t of (st.tasks || []).filter((x) => x.kind === 'exam' && !x.done && x.due_at && x.course_id).sort((a, b) => new Date(a.due_at) - new Date(b.due_at))) {
      const at = new Date(t.due_at); if (at < now || at >= lim) continue;
      const ids = allCards().filter(({ l }) => l.course_id === t.course_id).map(({ c }) => c.id);
      if (ids.length) {
        const course = (st.courses || []).find((c) => c.id === t.course_id);
        const n = Math.round((new Date(at.getFullYear(), at.getMonth(), at.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5);
        return { task: t, course: course ? course.name : t.title, ids, n };
      }
    }
    return null;
  }

  const go = (ids, title) => E.Lectures.quiz(null, { only: ids, title, max: 15 });
  function bar() {
    const d = due(), m = mistakes(), s = streak();
    if (!allCards().length) return '';
    return '<div class="card" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px">' +
      (s ? '<span class="tag">🔥 ' + h('سلسلة ' + s + ' ' + (s === 1 ? 'يوم' : 'أيام')) + '</span>' : '') +
      '<span style="flex:1"></span>' +
      (d.length ? '<button class="btn primary" data-action="rv-due">📚 <span>راجع اليوم</span> <bdi class="num">' + Math.min(15, d.length) + '</bdi></button>' : '<span class="small muted">✓ خلصت مراجعة اليوم</span>') +
      (m.length ? '<button class="btn ghost" data-action="rv-wrong">❌ <span>أغلاطك</span> <bdi class="num">' + m.length + '</bdi></button>' : '') + '</div>';
  }
  function todayCard() {
    const x = examSoon(); if (!x) return '';
    return '<section data-tk="exam-review"><button class="cta" data-action="rv-exam"><div class="ico">📝</div><div style="flex:1;min-width:0"><b><span>اختبار</span> <bdi>' + h(x.course) + '</bdi> ' +
      '<span>' + (x.n === 0 ? 'اليوم' : x.n === 1 ? 'بكرة' : x.n === 2 ? 'بعد يومين' : 'بعد ' + x.n + ' أيام') + '</span></b><small><span>أسئلة للمراجعة من محاضراتها:</span> <bdi class="num">' + x.ids.length + '</bdi></small></div>' + A.I('chevL') + '</button></section>';
  }

  const prevView = E.viewLectures;
  E.viewLectures = (...a) => { const out = prevView(...a); const i = out.indexOf('</div>'); return i > 0 ? out.slice(0, i + 6) + bar() + out.slice(i + 6) : bar() + out; };
  const prevTop = E.todayTop;
  E.todayTop = (...a) => todayCard() + (prevTop ? prevTop(...a) : '');
  const prevAct = E.action;
  E.action = (name, el, e) => {
    if (name === 'rv-due') { go(due().slice(0, 15), '📚 مراجعة اليوم'); return; }
    if (name === 'rv-wrong') { go(mistakes().slice(0, 15), '❌ راجع أغلاطك'); return; }
    if (name === 'rv-exam') { const x = examSoon(); if (x) go(x.ids.slice(0, 15), '📝 قبل الاختبار'); return; }
    return prevAct ? prevAct(name, el, e) : undefined;
  };
  if (E.View && E.View.KEEP && !E.View.KEEP.includes('exam-review')) { E.View.KEEP.push('exam-review'); E.View.apply(); }
  E.Cards = { mark, due, mistakes, streak, examSoon, load, KEY, GAP };
})();
