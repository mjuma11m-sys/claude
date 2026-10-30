// DW-107: «👨‍👩‍👧 عيالك» — لكل ولد أو بنت: جدول الأسبوع (وش عنده كل يوم ووش ياخذ معاه)، الاختبارات، رسوم المدرسة، والمصروف اليومي.
// بالرئيسية: «بكرة عند عيالك» بالليل، واختبار أو رسوم قريبة. تنبيه ليلة الاختبار وقبل الرسوم بـ 3 أيام.
// بيانات قاصرين: على الجهاز بس (hayati-kids) وتدخل بالنسخة الاحتياطية المشفّرة. الاسم الأول بس، بدون صور ولا أرقام.
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, h, fmt } = A;
  const KEY = 'hayati-kids';
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const day0 = (d) => { const x = new Date(d || Date.now()); x.setHours(0, 0, 0, 0); return x; };
  const parse = (s) => { const [y, m, d] = String(s || '').split('-').map(Number); return y ? new Date(y, m - 1, d) : null; };
  const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { A.toast('ما قدرنا نحفظ على هالجهاز'); } if (window.HayatiNative && HayatiNative.reschedule) { clearTimeout(save.t); save.t = setTimeout(() => HayatiNative.reschedule(), 800); } A.render(); };
  const SCHOOL = [0, 1, 2, 3, 4];   // الأحد لين الخميس
  const upd = (id, fn) => { const v = load(), k = v.find((x) => x.id === id); if (k) { fn(k); save(v); } return k; };
  const dd = (s) => { const d = parse(s); return d ? d.getDate() + ' ' + A.MONTHS[d.getMonth()] : ''; };

  // ================= الرئيسية =================
  function todayCard(now) {
    now = now || new Date();
    const kids = load(); if (!kids.length) return '';
    const evening = now.getHours() >= 15, target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (evening ? 1 : 0));
    const tk = ymd(target), rows = [];
    for (const k of kids) {
      const plan = (k.week || {})[target.getDay()], exams = (k.exams || []).filter((x) => x.date === tk);
      if (plan || exams.length) rows.push('<li class="row" style="cursor:default"><div class="ico">' + h(k.emoji || '🧒') + '</div><div class="main"><div class="title"><bdi>' + h(k.name) + '</bdi></div>' +
        '<div class="sub" style="white-space:normal">' + (exams.length ? exams.map((x) => '📝 <span>اختبار</span> <bdi>' + h(x.subject) + '</bdi>').join(' · ') + (plan ? ' · ' : '') : '') + (plan ? '<bdi>' + h(plan) + '</bdi>' : '') + '</div></div></li>');
    }
    const soon = [];
    for (const k of kids) for (const f of k.fees || []) {
      if (f.paid) continue;
      const n = A.daysBetween(day0(now), parse(f.due)); if (n == null || n > 7) continue;
      soon.push('<li class="row" style="cursor:default"><div class="ico">💳</div><div class="main"><div class="title"><bdi>' + h(f.label || '') + '</bdi> · <bdi>' + h(k.name) + '</bdi></div><div class="sub" style="color:' + (n <= 0 ? 'var(--expense)' : 'var(--warn)') + '"><bdi>' + fmt(f.amount) + '</bdi> <span>د.ب</span> · <bdi>' + dd(f.due) + '</bdi></div></div></li>');
    }
    if (!rows.length && !soon.length) return '';
    return '<section data-tk="kids"><div class="card"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><b style="flex:1">👨‍👩‍👧 <span>' + (evening ? 'بكرة عند عيالك' : 'اليوم عند عيالك') + '</span></b><button class="link" data-action="kids">الكل</button></div>' +
      '<ul class="list">' + rows.concat(soon).join('') + '</ul></div></section>';
  }

  // ================= القائمة =================
  function sheet() {
    const kids = load();
    A.openSheet({
      title: '👨‍👩‍👧 عيالك', cancelLabel: 'تم',
      body: '<p class="small muted" style="margin:0 4px 12px">لكل واحد: وش عنده كل يوم، اختباراته، رسوم المدرسة، ومصروفه. يبقى على جهازك بس.</p>' +
        (kids.length ? '<div class="card flush"><ul class="list">' + kids.map((k) => {
          const next = (k.exams || []).filter((x) => x.date >= ymd(new Date())).sort((a, b) => a.date.localeCompare(b.date))[0];
          const due = (k.fees || []).filter((f) => !f.paid).reduce((s, f) => s + (Number(f.amount) || 0), 0);
          return '<li class="row" data-kid="' + k.id + '"><div class="ico">' + h(k.emoji || '🧒') + '</div><div class="main"><div class="title"><bdi>' + h(k.name) + '</bdi>' + (k.grade ? ' · <bdi class="small muted">' + h(k.grade) + '</bdi>' : '') + '</div><div class="sub" style="white-space:normal">' +
            (next ? '📝 <bdi>' + h(next.subject) + '</bdi> <bdi>' + dd(next.date) + '</bdi>' : '<span>ما فيه اختبارات قريبة</span>') + (due ? ' · 💳 <bdi>' + fmt(due) + '</bdi> <span>د.ب</span>' : '') + '</div></div>' + A.I('chevL') + '</li>';
        }).join('') + '</ul></div>' : '') +
        '<button type="button" class="btn primary block" id="kdAdd" style="margin-top:12px">＋ أضف ولد أو بنت</button>',
      mount(root) {
        root.querySelector('#kdAdd').onclick = () => { A.closeSheet(); setTimeout(() => kidForm(), 280); };
        root.querySelectorAll('[data-kid]').forEach((r) => { r.onclick = () => { A.closeSheet(); setTimeout(() => kidSheet(r.dataset.kid), 280); }; });
      },
    });
  }
  const EMOJI = ['🧒', '👦', '👧', '🧑', '👶'];
  function kidForm(k) {
    A.openSheet({
      title: k ? 'عدّل' : 'ولد أو بنت', saveLabel: 'حفظ',
      body: '<div class="field"><label>الاسم الأول</label><input name="name" value="' + h((k && k.name) || '') + '"></div>' +
        '<div class="field"><label>الصف (اختياري)</label><input name="grade" value="' + h((k && k.grade) || '') + '" placeholder="مثلاً: ثالث ابتدائي"></div>' +
        '<div class="field"><label>الرمز</label><div class="seg" id="kdEmoji">' + EMOJI.map((e) => '<button type="button" data-k="' + e + '" class="' + (((k && k.emoji) || '🧒') === e ? 'on' : '') + '">' + e + '</button>').join('') + '</div></div>' +
        '<div class="field"><label>المصروف اليومي (د.ب، اختياري)</label><input name="allow" inputmode="decimal" class="ltr" value="' + h(k && k.allow ? String(k.allow) : '') + '"></div>' +
        (k ? '<button type="button" class="btn danger block" id="kdDel">حذف</button>' : ''),
      mount(root) {
        A.segPick(root, '#kdEmoji', (e) => { root.dataset.emoji = e; });
        const d = root.querySelector('#kdDel'); if (d) d.onclick = async () => { if (await A.ask('تحذف ' + k.name + ' وكل بياناته؟')) { save(load().filter((x) => x.id !== k.id)); A.closeSheet(); setTimeout(sheet, 280); } };
      },
      onSave(root) {
        const val = (n) => root.querySelector('[name=' + n + ']').value.trim();
        if (!val('name')) throw new Error('اكتب الاسم');
        const it = Object.assign({ week: {}, exams: [], fees: [] }, k || {}, { id: (k && k.id) || S.uuid(), name: val('name').slice(0, 30), grade: val('grade').slice(0, 40),
          emoji: root.dataset.emoji || (k && k.emoji) || '🧒', allow: Math.round((parseFloat(val('allow').replace(',', '.')) || 0) * 1000) / 1000 });
        save(load().filter((x) => x.id !== it.id).concat(it));
        A.toast('انحفظ ✓'); setTimeout(() => kidSheet(it.id), 300);
      },
    });
  }

  // ================= صفحة الولد =================
  function monthAllowance(k, now) {
    now = now || new Date();
    const y = now.getFullYear(), m = now.getMonth(), last = new Date(y, m + 1, 0).getDate();
    let n = 0; for (let d = 1; d <= last; d++) if (SCHOOL.includes(new Date(y, m, d).getDay())) n++;
    return Math.round((Number(k.allow) || 0) * n * 1000) / 1000;
  }
  function kidSheet(id) {
    const k = load().find((x) => x.id === id); if (!k) { sheet(); return; }
    const today = ymd(new Date());
    const exams = (k.exams || []).slice().sort((a, b) => a.date.localeCompare(b.date)), fees = (k.fees || []).slice().sort((a, b) => (a.due || '').localeCompare(b.due || ''));
    A.openSheet({
      title: '👨‍👩‍👧 عيالك', cancelLabel: 'تم',
      body: '<h2 style="margin:0 4px 6px;font-size:22px">' + h(k.emoji || '🧒') + ' <bdi>' + h(k.name) + '</bdi>' + (k.grade ? ' <small class="muted" style="font-size:14px"><bdi>' + h(k.grade) + '</bdi></small>' : '') + '</h2>' +
        '<div class="group-title">🗓️ وش عنده كل يوم</div><p class="small muted" style="margin:0 4px 8px">المواد أو اللي ياخذه معاه. يطلع لك بالرئيسية الليلة اللي قبل.</p>' +
        '<div class="card">' + SCHOOL.map((d) => '<div class="field" style="margin:0 0 8px"><label>' + A.DAYS[d] + '</label><input data-day="' + d + '" value="' + h((k.week || {})[d] || '') + '" placeholder="مثلاً: رياضيات، علوم · الشنطة الرياضية"></div>').join('') + '</div>' +
        '<div class="group-title">📝 الاختبارات</div>' +
        (exams.length ? '<div class="card flush"><ul class="list">' + exams.map((x) => '<li class="row" style="cursor:default' + (x.date < today ? ';opacity:.5' : '') + '"><div class="ico">📝</div><div class="main"><div class="title"><bdi>' + h(x.subject) + '</bdi></div><div class="sub"><bdi>' + dd(x.date) + '</bdi></div></div><button type="button" class="icon-x" data-dx="' + x.id + '" aria-label="حذف">✕</button></li>').join('') + '</ul></div>' : '') +
        '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><input id="kdExS" placeholder="المادة" style="flex:2;min-width:0"><input id="kdExD" type="date" style="flex:1;min-width:130px"><button type="button" class="btn primary" id="kdExAdd">＋</button></div>' +
        '<div class="group-title">💳 رسوم المدرسة</div>' +
        (fees.length ? '<div class="card flush"><ul class="list">' + fees.map((f) => '<li class="row" style="cursor:default"><div class="ico">' + (f.paid ? '✅' : '💳') + '</div><div class="main"><div class="title"><bdi>' + h(f.label) + '</bdi></div><div class="sub"><bdi>' + fmt(f.amount) + '</bdi> <span>د.ب</span> · <bdi>' + dd(f.due) + '</bdi></div></div>' +
          (f.paid ? '' : '<button type="button" class="btn ghost" data-fp="' + f.id + '">دفعتها</button>') + '<button type="button" class="icon-x" data-fx="' + f.id + '" aria-label="حذف">✕</button></li>').join('') + '</ul></div>' : '') +
        '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><input id="kdFeL" placeholder="مثلاً: القسط الثاني" style="flex:2;min-width:0"><input id="kdFeA" inputmode="decimal" class="ltr" placeholder="د.ب" style="flex:1;min-width:60px"><input id="kdFeD" type="date" style="flex:1;min-width:130px"><button type="button" class="btn primary" id="kdFeAdd">＋</button></div>' +
        (k.allow ? '<div class="card" style="margin-top:14px"><b>💰 <span>المصروف</span></b><p class="small" style="margin:6px 0 0"><bdi>' + fmt(k.allow) + '</bdi> <span>د.ب باليوم الدراسي ≈</span> <bdi>' + fmt(monthAllowance(k)) + '</bdi> <span>د.ب هالشهر</span></p></div>' : '') +
        '<button type="button" class="btn ghost block" id="kdEdit" style="margin-top:14px">✏️ الاسم والصف والمصروف</button>',
      mount(root) {
        root.querySelectorAll('[data-day]').forEach((i) => { i.onchange = () => upd(id, (x) => { x.week = x.week || {}; const v = i.value.trim().slice(0, 120); if (v) x.week[i.dataset.day] = v; else delete x.week[i.dataset.day]; }); });
        const reopen = () => { A.closeSheet(); setTimeout(() => kidSheet(id), 280); };
        root.querySelector('#kdExAdd').onclick = () => {
          const s = root.querySelector('#kdExS').value.trim(), d = root.querySelector('#kdExD').value;
          if (!s || !d) { A.toast('اكتب المادة والتاريخ'); return; }
          upd(id, (x) => { x.exams = (x.exams || []).concat({ id: S.uuid(), subject: s.slice(0, 40), date: d }); }); reopen();
        };
        root.querySelector('#kdFeAdd').onclick = () => {
          const l = root.querySelector('#kdFeL').value.trim() || 'رسوم', a = parseFloat(root.querySelector('#kdFeA').value.replace(',', '.')), d = root.querySelector('#kdFeD').value;
          if (!(a > 0) || !d) { A.toast('اكتب المبلغ والتاريخ'); return; }
          upd(id, (x) => { x.fees = (x.fees || []).concat({ id: S.uuid(), label: l.slice(0, 40), amount: Math.round(a * 1000) / 1000, due: d, paid: false }); }); reopen();
        };
        root.querySelectorAll('[data-dx]').forEach((b) => { b.onclick = () => { upd(id, (x) => { x.exams = x.exams.filter((y) => y.id !== b.dataset.dx); }); reopen(); }; });
        root.querySelectorAll('[data-fx]').forEach((b) => { b.onclick = () => { upd(id, (x) => { x.fees = x.fees.filter((y) => y.id !== b.dataset.fx); }); reopen(); }; });
        root.querySelectorAll('[data-fp]').forEach((b) => { b.onclick = () => {
          const kk = upd(id, (x) => { const f = x.fees.find((y) => y.id === b.dataset.fp); if (f) f.paid = true; });
          const f = kk && kk.fees.find((y) => y.id === b.dataset.fp);
          if (f) S.upsert('transactions', { id: S.uuid(), kind: 'expense', amount: f.amount, category: 'جامعة ودراسة', merchant: f.label, occurred_at: new Date().toISOString() });
          A.toast('انسجلت بالمصاريف ✓'); reopen();
        }; });
        root.querySelector('#kdEdit').onclick = () => { A.closeSheet(); setTimeout(() => kidForm(load().find((x) => x.id === id)), 280); };
      },
    });
  }

  // ================= التنبيهات =================
  function reminders(now) {
    now = now || new Date();
    const out = [];
    for (const k of load()) {
      for (const x of k.exams || []) {
        const d = parse(x.date); if (!d) continue;
        const at = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, 19, 30);
        if (at > now) out.push({ key: 'kidexam:' + x.id, at, title: '📝 بكرة اختبار ' + k.name + ': ' + x.subject, body: 'راجعوا مع بعض الليلة', extra: { kind: 'kids' } });
      }
      for (const f of k.fees || []) {
        if (f.paid) continue;
        const d = parse(f.due); if (!d) continue;
        const at = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 3, 9, 0);
        if (at > now) out.push({ key: 'kidfee:' + f.id, at, title: '💳 ' + f.label + ' · ' + k.name, body: fmt(f.amount) + ' د.ب بعد 3 أيام', extra: { kind: 'kids' } });
      }
    }
    return out;
  }

  const prevMid = E.todayMid;
  E.todayMid = (...a) => todayCard() + (prevMid ? prevMid(...a) : '');
  const prevAct = E.action;
  E.action = (name, el, e) => {
    if (name === 'kids') { sheet(); return; }
    return prevAct ? prevAct(name, el, e) : undefined;
  };
  if (E.Tools && E.Tools.GROUPS) { const g = E.Tools.GROUPS.find((x) => x[0].indexOf('يومك') >= 0); if (g) g[1].push(['kids', 'users', '#ec4899', 'عيالك', sheet]); }
  if (E.View && E.View.KEEP && !E.View.KEEP.includes('kids')) { E.View.KEEP.push('kids'); E.View.apply(); }
  E.Kids = { load, sheet, kidSheet, kidForm, reminders, todayCard, monthAllowance, KEY };
})();
