// الدراسة: سؤال الحضور بعد كل محاضرة · هدف مذاكرة أسبوعي لكل مادة · جاهزية الاختبارات (مواضيع)
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, st, I, h, tint } = A;
  const wrap = (name, fn) => { const prev = E[name]; E[name] = (...a) => fn(prev ? prev : () => '', ...a); };
  const pad = (n) => String(n).padStart(2, '0');
  const dateKey = (d) => { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const isLecture = (c) => !c.type || c.type === 'lecture';
  const lecEnd = (c) => (c.end_time ? A.minutesOf(c.end_time) : A.minutesOf(c.start_time) + 50);
  const course = (id) => st.courses.find((c) => c.id === id);
  function hrs(min) {
    min = Math.round(min);
    const H = Math.floor(min / 60), M = min % 60;
    const hs = H === 0 ? '' : H === 1 ? 'ساعة' : H === 2 ? 'ساعتين' : H + ' س';
    return hs ? hs + (M ? ' و' + M + 'د' : '') : M + ' د';
  }

  // ================= الحضور =================
  // بعد ما تخلص المحاضرة اليوم: «حضرت؟» — جواب واحد يسجّل الحضور أو الغياب
  function pendingLecture() {
    const today = dateKey(), now = A.nowMinutes();
    return A.lecturesOn(new Date().getDay()).filter(isLecture)
      .filter((c) => lecEnd(c) <= now)
      .filter((c) => !(c.attended || []).includes(today) && !(c.absences || []).includes(today) && !(c.skipped || []).includes(today))
      .pop() || null;
  }

  function attendanceCard() {
    if (A.has && !A.has('student')) return '';
    const c = pendingLecture();
    if (!c) return '';
    return '<div class="card" style="border-color:color-mix(in srgb,' + h(c.color || '#1A8A8F') + ' 40%,var(--border))">' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px"><div class="ico" style="' + tint(c.color || '#1A8A8F') + '">' + I('graduation') + '</div>' +
      '<div style="flex:1;min-width:0"><b>حضرت <bdi>' + h(c.name) + '</bdi>؟</b><div class="small muted">خلصت ' + h(c.end_time || '') + (c.room ? ' · ' + h(c.room) : '') + '</div></div></div>' +
      '<div class="btn-row"><button class="btn primary" data-action="att-yes" data-id="' + c.id + '">' + I('check') + 'حضرت</button>' +
      '<button class="btn" data-action="att-no" data-id="' + c.id + '">غبت</button>' +
      '<button class="btn ghost" style="flex:0 0 auto" data-action="att-skip" data-id="' + c.id + '" aria-label="تخطّي">' + I('minus') + '</button></div></div>';
  }

  // day: «2026-10-13»، لما الجواب يجي من تنبيه يوم ثاني (بعد نص الليل مثلاً)
  function mark(id, field, day) {
    const c = course(id);
    if (!c) return false;
    const k = day || dateKey();
    const list = Array.isArray(c[field]) ? c[field].filter((d) => d !== k) : [];
    list.push(k);
    S.upsert('courses', Object.assign({}, c, { [field]: list }));
    if (field === 'absences') {
      const lim = Number(c.absence_limit) || 0;
      if (lim) {
        const left = lim - list.length;
        A.toast(left <= 0 ? '⚠️ وصلت حد الغياب في ' + c.name : left <= 2 ? '⚠️ باقي لك ' + left + ' غيابات بس' : 'انسجل الغياب · باقي ' + left);
      } else A.toast('انسجل الغياب');
    } else if (field === 'attended') A.toast('انسجل الحضور ✓');
    return true;
  }
  A.markAttendance = mark;   // تنبيه «حضرت؟» بالآيفون (native.js) يستخدم نفس المنطق

  // ================= هدف المذاكرة الأسبوعي =================
  // الأسبوع يبدأ الأحد
  function weekStart() { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); return d; }
  function minutesThisWeek(courseId) {
    const s = weekStart();
    return st.study_sessions.filter((x) => (x.course_id || null) === courseId && x.started_at && new Date(x.started_at) >= s)
      .reduce((t, x) => t + (Number(x.minutes) || 0), 0);
  }

  function goalsCard() {
    const lec = A.lectures();
    if (!lec.length) return '';
    const withGoal = lec.filter((c) => Number(c.study_goal) > 0);
    let out = A.secHead('هدف المذاكرة هالأسبوع', '<button class="link" data-action="goals-set">' + (withGoal.length ? 'تعديل' : 'حدد') + '</button>');
    if (!withGoal.length) {
      return out + '<button class="cta" data-action="goals-set"><div class="ico">' + I('target') + '</div><div style="flex:1"><b>حدد كم ساعة تذاكر لكل مادة</b><small>وتشوف وين مقصّر قبل الاختبار، مو بعده</small></div>' + I('chevL') + '</button>';
    }
    const dayIdx = new Date().getDay(); // 0 = الأحد
    out += '<div class="card">' + withGoal.map((c) => {
      const goal = Number(c.study_goal), done = minutesThisWeek(c.id);
      const pct = Math.min(100, Math.round((done / goal) * 100));
      const expected = Math.round(((dayIdx + 1) / 7) * 100);
      const color = pct >= 100 ? 'var(--income)' : pct + 15 < expected ? 'var(--expense)' : 'var(--brand)';
      const lim = Number(c.absence_limit) || 0, ab = (c.absences || []).length;
      return '<div class="cat" data-action="focus-course" data-id="' + c.id + '" style="cursor:pointer"><div class="ico" style="' + tint(c.color || '#1A8A8F') + '">' + I('book') + '</div><div class="body">' +
        '<div class="line"><span>' + h(c.name) + '</span><b dir="rtl">' + hrs(done) + ' من ' + hrs(goal) + '</b></div>' +
        '<div class="meter"><span style="width:' + pct + '%;background:' + color + '"></span></div>' +
        (lim ? '<div class="small" style="margin-top:4px;color:' + (ab >= lim ? 'var(--expense)' : lim - ab <= 2 ? 'var(--warn)' : 'var(--muted)') + '">الغياب ' + ab + ' من ' + lim + '</div>' : '') + '</div></div>';
    }).join('') + '<p class="small muted" style="margin:8px 0 0">اضغط على المادة عشان تبدأ المؤقت لها.</p></div>';
    return out;
  }

  function goalsSheet() {
    const lec = A.lectures();
    A.openSheet({
      title: 'هدف المذاكرة الأسبوعي',
      body: '<p class="small muted" style="margin:0 0 12px">قاعدة عملية: ساعتين مذاكرة لكل ساعة محاضرة بالأسبوع. حطها صفر لو ما تبي هدف للمادة.</p><div class="card">' +
        lec.map((c) => {
          const weekly = ((c.days || []).length * (lecEnd(c) - A.minutesOf(c.start_time))) / 60;
          const suggest = Math.round(weekly * 2 * 2) / 2;
          return '<div class="cb-row"><div class="ico" style="' + tint(c.color || '#1A8A8F') + '">' + I('book') + '</div><span>' + h(c.name) +
            '<small class="muted" style="display:block;font-weight:500">مقترح: ' + suggest + ' س</small></span>' +
            '<input name="g_' + c.id + '" inputmode="decimal" placeholder="' + suggest + '" value="' + (Number(c.study_goal) ? Number(c.study_goal) / 60 : '') + '" aria-label="ساعات"></div>';
        }).join('') + '</div><p class="small muted" style="margin:8px 4px 0">بالساعات بالأسبوع.</p>',
      onSave(root) {
        for (const c of lec) {
          const raw = A.val(root, 'g_' + c.id).replace(',', '.');
          const v = raw === '' ? 0 : Math.max(0, Math.min(60, Number(raw) || 0));
          if (Math.round(v * 60) !== (Number(c.study_goal) || 0)) S.upsert('courses', Object.assign({}, c, { study_goal: Math.round(v * 60) }));
        }
        A.toast('تم ✓');
      },
    });
  }

  // ================= جاهزية الاختبارات =================
  const upcomingExams = () => st.tasks.filter((t) => t.kind === 'exam' && !t.done && t.due_at && new Date(t.due_at) >= new Date())
    .sort((a, b) => new Date(a.due_at) - new Date(b.due_at));
  const readiness = (t) => { const tp = t.topics || []; return tp.length ? Math.round((tp.filter((x) => x.done).length / tp.length) * 100) : null; };

  function readinessCard() {
    const ex = upcomingExams().slice(0, 4);
    if (!ex.length) return '';
    return A.secHead('جاهزيتك للاختبارات') + '<div class="card">' + ex.map((t) => {
      const r = readiness(t), n = A.daysBetween(new Date(), new Date(t.due_at));
      const color = r == null ? 'var(--muted)' : r >= 80 ? 'var(--income)' : r >= 50 ? '#f59e0b' : 'var(--expense)';
      return '<div class="cat" data-action="exam-topics" data-id="' + t.id + '" style="cursor:pointer"><div class="ex-n num' + (n <= 3 ? ' soon' : '') + '" style="width:44px;height:44px;font-size:16px">' + n + '<small>' + (n === 1 ? 'يوم' : 'أيام') + '</small></div><div class="body">' +
        '<div class="line"><span><bdi>' + h(t.title) + '</bdi></span><b class="num" style="color:' + color + '">' + (r == null ? 'حط المواضيع' : r + '%') + '</b></div>' +
        '<div class="meter"><span style="width:' + (r || 0) + '%;background:' + color + '"></span></div></div></div>';
    }).join('') + '</div>';
  }

  function topicsSheet(id) {
    const t0 = st.tasks.find((x) => x.id === id);
    if (!t0) return;
    let topics = (t0.topics || []).map((x) => Object.assign({}, x));
    const draw = () => {
      const r = topics.length ? Math.round((topics.filter((x) => x.done).length / topics.length) * 100) : 0;
      return '<div class="hero" style="padding:16px 18px;margin-bottom:12px"><span class="eyebrow">' + I('target') + 'جاهزيتك</span><div class="amount-big num">' + r + '%</div>' +
        '<div class="track"><span style="width:' + r + '%"></span></div></div>' +
        '<form class="shop-add" id="topicForm"><input name="n" placeholder="موضوع / فصل (مثلاً: Chapter 3 — Ratios)" autocomplete="off"><button class="btn primary" type="submit">' + I('plus') + '</button></form>' +
        (topics.length ? '<div class="card flush"><ul class="list">' + topics.map((x, i) =>
          '<li class="row' + (x.done ? ' done' : '') + '" style="cursor:default"><button class="check' + (x.done ? ' on' : '') + '" data-t="toggle" data-i="' + i + '" type="button" aria-label="خلّصته">' + I('check') + '</button>' +
          '<div class="main"><div class="title"><span class="t">' + h(x.n) + '</span></div></div><button class="icon-x" data-t="del" data-i="' + i + '" type="button" aria-label="حذف">✕</button></li>').join('') + '</ul></div>'
          : '<div class="empty"><b>قسّم المادة لمواضيع</b><p>فصول الكتاب أو سلايدات الدكتور — وعلّم اللي خلّصته.</p></div>');
    };
    A.openSheet({
      title: t0.title,
      body: '<div id="topicsRoot">' + draw() + '</div>',
      mount(root) {
        const box = root.querySelector('#topicsRoot');
        const refresh = () => { box.innerHTML = draw(); bind(); };
        const bind = () => {
          box.querySelector('#topicForm').onsubmit = (e) => {
            e.preventDefault();
            const n = e.target.n.value.trim();
            if (!n) return;
            topics.push({ id: S.uuid(), n: n.slice(0, 120), done: false });
            refresh();
            box.querySelector('#topicForm input').focus();
          };
        };
        box.onclick = (e) => {
          const b = e.target.closest('[data-t]');
          if (!b) return;
          const i = Number(b.dataset.i);
          if (b.dataset.t === 'toggle') topics[i].done = !topics[i].done;
          else topics.splice(i, 1);
          refresh();
        };
        bind();
      },
      onSave() {
        const t = st.tasks.find((x) => x.id === id) || t0;
        S.upsert('tasks', Object.assign({}, t, { topics }));
        const r = topics.length ? Math.round((topics.filter((x) => x.done).length / topics.length) * 100) : 0;
        A.toast(r >= 100 ? 'جاهز 💪 بالتوفيق' : 'انحفظ · جاهزيتك ' + r + '%');
      },
    });
  }

  // ================= الربط =================
  wrap('todayTop', (prev) => attendanceCard() + prev());
  wrap('focusExtra', (prev) => goalsCard() + readinessCard() + prev());
  wrap('action', (prev, name, el, e) => {
    const id = el.dataset.id;
    switch (name) {
      case 'att-yes': mark(id, 'attended'); return;
      case 'att-no': mark(id, 'absences'); return;
      case 'att-skip': mark(id, 'skipped'); return;
      case 'goals-set': goalsSheet(); return;
      case 'exam-topics': topicsSheet(id); return;
      default: return prev(name, el, e);
    }
  });
  A.render();
})();
