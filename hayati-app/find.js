// 🔎 بحث بكل التطبيق (مصاريف، مهام، جدول، مباريات) + ↩️ تراجع بعد أي حذف
(function () {
  'use strict';

  const A = window.App;
  if (!A) return;
  const { S, st, I, h, fmt, money } = A;

  // ================= البحث =================
  // «أ/إ/آ = ا»، «ة = ه»، «ى = ي»، بدون تشكيل، والأرقام العربية = إنقليزي
  function norm(s) {
    return String(s == null ? '' : s).toLowerCase()
      .replace(/[ً-ٰٟـ]/g, '')
      .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .replace(/٫/g, '.').trim();
  }
  const hit = (q, ...fields) => q.every((w) => fields.some((f) => norm(f).includes(w)));
  const day = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.getDate() + ' ' + A.MONTHS[d.getMonth()] + ' ' + d.getFullYear(); };

  function search(text) {
    const q = norm(text).split(/\s+/).filter(Boolean);
    if (!q.length) return null;
    const tx = st.transactions
      .filter((t) => hit(q, t.merchant, t.note, t.category, Number(t.amount).toFixed(3), t.raw))
      .sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));
    const tasks = st.tasks.filter((t) => hit(q, t.title, t.notes, t.place));
    const courses = st.courses.filter((c) => hit(q, c.name, c.room, c.code));
    const matches = (st.matches || []).filter((m) => hit(q, m.opponent, m.notes, m.date));
    return { tx, tasks, courses, matches };
  }

  function results(r) {
    if (!r) return '<p class="small muted" style="margin:8px 4px">جرّب: اسم محل، مبلغ، مادة، مهمة، أو خصم.</p>';
    const n = r.tx.length + r.tasks.length + r.courses.length + r.matches.length;
    if (!n) return '<p class="small muted" style="margin:8px 4px">ما لقيت شي.</p>';
    let out = '';
    if (r.tx.length) {
      const exp = r.tx.filter((t) => t.kind !== 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
      out += '<div class="group-title">' + I('wallet') + 'المصاريف <span class="muted">(' + r.tx.length + ')</span></div>' +
        (exp ? '<div class="card find-sum"><small class="muted">مجموع اللي صرفته عليها</small><b>' + money(exp) + '</b></div>' : '') +
        '<div class="menu">' + r.tx.slice(0, 30).map((t) =>
          '<button data-find="tx" data-id="' + h(t.id) + '">' + A.catIcon(t.category, t.kind) + '<div style="flex:1;min-width:0"><b>' + h(t.merchant || t.category || 'عملية') + '</b><small>' + day(t.occurred_at) + '</small></div>' +
          '<span class="num ' + (t.kind === 'income' ? 'pos' : '') + '">' + (t.kind === 'income' ? '+' : '') + fmt(t.amount) + '</span></button>').join('') + '</div>' +
        (r.tx.length > 30 ? '<p class="small muted" style="margin:6px 4px">وفيه ' + (r.tx.length - 30) + ' أقدم. زيد كلمة عشان تضيّق.</p>' : '');
    }
    if (r.tasks.length) out += '<div class="group-title">' + I('check') + 'المهام <span class="muted">(' + r.tasks.length + ')</span></div><div class="menu">' +
      r.tasks.slice(0, 20).map((t) => '<button data-find="task" data-id="' + h(t.id) + '"><div style="flex:1;min-width:0"><b>' + (t.done ? '✓ ' : '') + h(t.title) + '</b><small>' + (t.due_at ? day(t.due_at) : 'بدون موعد') + '</small></div></button>').join('') + '</div>';
    if (r.courses.length) out += '<div class="group-title">' + I('calendar') + 'الجدول <span class="muted">(' + r.courses.length + ')</span></div><div class="menu">' +
      r.courses.map((c) => '<button data-find="course" data-id="' + h(c.id) + '"><div style="flex:1;min-width:0"><b>' + h(c.name) + '</b><small>' + (c.days || []).map((d) => A.DAYS[d]).join('، ') + (c.start_time ? ' · ' + A.time12(c.start_time) : '') + '</small></div></button>').join('') + '</div>';
    if (r.matches.length) out += '<div class="group-title">🧤 المباريات <span class="muted">(' + r.matches.length + ')</span></div><div class="menu">' +
      r.matches.map((m) => '<button data-find="match" data-id="' + h(m.id) + '"><div style="flex:1;min-width:0"><b>' + h(m.opponent || 'مباراة') + '</b><small>' + h(m.date || '') + '</small></div><span class="num">' + (m.for != null ? m.for + '–' + m.against : '') + '</span></button>').join('') + '</div>';
    return out;
  }

  function open(prefill) {
    A.openSheet({
      title: 'بحث',
      cancelLabel: 'تم',
      body: '<div class="field" style="margin-bottom:6px"><input type="search" id="findQ" enterkeyhint="search" autocomplete="off" placeholder="Costa، 3.750، محاسبة، المحرق…" value="' + h(prefill || '') + '"></div><div id="findRes"></div>',
      mount(root) {
        const q = root.querySelector('#findQ'), res = root.querySelector('#findRes');
        let t;
        const draw = () => { res.innerHTML = results(search(q.value)); };
        q.oninput = () => { clearTimeout(t); t = setTimeout(draw, 120); };
        res.onclick = (e) => {
          const b = e.target.closest('[data-find]');
          if (!b) return;
          const id = b.dataset.id, kind = b.dataset.find;
          A.closeSheet();
          setTimeout(() => {
            if (kind === 'tx') document.dispatchEvent(new CustomEvent('hayati-open', { detail: { action: 'edit-tx', id } }));
            else if (kind === 'task') A.taskForm(st.tasks.find((x) => x.id === id));
            else if (kind === 'course') A.courseForm(st.courses.find((x) => x.id === id));
            else if (kind === 'match') { A.ui.studySeg = 'health'; A.go('schedule'); }
          }, 280);
        };
        draw();
        setTimeout(() => q.focus(), 60);
      },
    });
  }
  // زر البحث بالهيدر جنب الإعدادات
  const btn = document.createElement('button');
  btn.className = 'icon-btn'; btn.id = 'findBtn'; btn.type = 'button'; btn.setAttribute('aria-label', 'بحث');
  btn.innerHTML = I('search');
  btn.onclick = () => open();
  const set = document.getElementById('settingsBtn');
  if (set) set.parentNode.insertBefore(btn, set);
  // فتح عملية بالبحث: نفس زر «edit-tx» بالقائمة
  document.addEventListener('hayati-open', (e) => {
    const fake = document.createElement('button');
    fake.dataset.action = e.detail.action; fake.dataset.id = e.detail.id; fake.hidden = true;
    document.getElementById('view').appendChild(fake); fake.click(); fake.remove();
  });

  // ================= التراجع بعد الحذف =================
  const bar = document.createElement('div');
  bar.className = 'undo-bar'; bar.setAttribute('role', 'status');
  bar.innerHTML = '<span></span><button type="button">تراجع</button>';
  document.body.appendChild(bar);
  let batch = [], timer = null, flush = null;
  const origRemove = S.remove;
  S.remove = function (table, id) {
    const row = (st[table] || []).find((r) => r.id === id);
    origRemove.call(S, table, id);
    if (!row) return;
    batch.push([table, JSON.parse(JSON.stringify(row))]);
    // الحذف الجماعي (مثل «امسح المشتريات المخلّصة») = تراجع واحد
    clearTimeout(flush);
    flush = setTimeout(show, 0);
  };
  function show() {
    const items = batch; batch = [];
    const toast = document.getElementById('toast');
    if (toast) toast.classList.remove('show');
    bar.querySelector('span').textContent = items.length > 1 ? 'انحذف ' + items.length : 'انحذفت';
    bar.classList.add('show');
    bar.querySelector('button').onclick = () => {
      for (const [table, row] of items) S.upsert(table, row);
      hide(); A.toast('رجعت ✓'); A.render();
    };
    clearTimeout(timer);
    timer = setTimeout(hide, 6000);
  }
  function hide() { bar.classList.remove('show'); clearTimeout(timer); }

  window.HayatiFind = { search, norm, open };
})();
