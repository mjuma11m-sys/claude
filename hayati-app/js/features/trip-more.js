// DW-103: السفر أكثر — (1) وضع السفر: يوم السفر وخلال الرحلة، «اليوم» يصير عن الرحلة (الوقت والصلاة هناك، برنامج اليوم، المصروف)،
// (2) تعارض مع جدولك: اختبار أو تسليم أو موعد أو محاضرات خلال أيام الرحلة، (3) حصّالة الرحلة: هدف ادخار لين يوم السفر،
// (4) بطاقة الطوارئ: أرقام الطوارئ بالبلد وعبارات جاهزة بالإنجليزي، (5) ملخص الرحلة بصورة بعد الرجعة (المبالغ مخفية إلا لو تبي).
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E || !E.Travel || !E.TravelPlus) return;
  const { S, st, h, fmt } = A;
  const T = E.Travel, P = E.TravelPlus;
  const day = (s) => (s ? new Date(s + 'T00:00:00') : null);
  const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const mins = (s) => { const [a, b] = String(s || '').split(':').map(Number); return (a || 0) * 60 + (b || 0); };
  const open = (u) => { const N = window.HayatiNative; if (N && N.openLink) N.openLink(u); else window.open(u, '_blank', 'noopener'); };

  // ================= 🆘 أرقام الطوارئ (تقريبية: تأكد منها لما توصل) =================
  // [الطوارئ العامة، الشرطة، الإسعاف]
  const SOS = {
    TR: ['112'], GB: ['999'], FR: ['112', '17', '15'], CH: ['112', '117', '144'], AT: ['112', '133', '144'], DE: ['112', '110', '112'], IT: ['112'],
    BA: ['112', '122', '124'], AZ: ['112', '102', '103'], GE: ['112'], EG: ['', '122', '123'], JO: ['911'], LB: ['', '112', '140'],
    SA: ['911', '999', '997'], AE: ['', '999', '998'], QA: ['999'], KW: ['112'], OM: ['9999'], IR: ['', '110', '115'],
    MY: ['999'], TH: ['', '191', '1669'], ID: ['112', '110', '118'], MV: ['', '119', '102'], IN: ['112'],
  };
  const COUNTRY = { istanbul: 'TR', trabzon: 'TR', london: 'GB', paris: 'FR', geneva: 'CH', vienna: 'AT', munich: 'DE', milan: 'IT', sarajevo: 'BA', baku: 'AZ', tbilisi: 'GE',
    cairo: 'EG', amman: 'JO', beirut: 'LB', makkah: 'SA', madinah: 'SA', riyadh: 'SA', jeddah: 'SA', dubai: 'AE', doha: 'QA', kuwait: 'KW', muscat: 'OM', salalah: 'OM',
    mashhad: 'IR', kualalumpur: 'MY', bangkok: 'TH', phuket: 'TH', bali: 'ID', maldives: 'MV', mumbai: 'IN' };
  const PHRASES = [['أحتاج دكتور', 'I need a doctor'], ['وين أقرب صيدلية؟', 'Where is the nearest pharmacy?'], ['عندي حساسية من…', 'I am allergic to…'],
    ['اتصلوا بالشرطة لو سمحت', 'Please call the police'], ['ضاع جوازي', 'I lost my passport'], ['ودّني لهالعنوان', 'Please take me to this address']];
  const sosOf = (t) => { const c = P.cityOf(t); return c && SOS[COUNTRY[c.key]] ? SOS[COUNTRY[c.key]] : null; };
  function sosSheet(t) {
    const n = sosOf(t), c = P.cityOf(t);
    const tel = (x, l) => (x ? '<a class="btn ghost block" href="tel:' + x + '" style="margin:0 0 8px;display:flex;justify-content:space-between"><span>' + l + '</span><bdi class="num" dir="ltr">' + x + '</bdi></a>' : '');
    A.openSheet({
      title: '🆘 بطاقة الطوارئ', cancelLabel: 'تم',
      body: (n ? '<div class="group-title">📞 <bdi>' + h(c.name) + '</bdi></div>' + tel(n[0], 'الطوارئ') + tel(n[1], 'الشرطة') + tel(n[2] && n[2] !== n[0] ? n[2] : '', 'الإسعاف') +
          '<p class="small muted" style="margin:0 4px 12px">الأرقام تقريبية وممكن تتغيّر. تأكد منها من الفندق لما توصل.</p>' : '') +
        '<div class="group-title">🗣️ عبارات جاهزة</div><p class="small muted" style="margin:0 4px 8px">اضغط على العبارة وتطلع كبيرة، وريها للي قدامك.</p>' +
        '<div class="card flush"><ul class="list">' + PHRASES.map(([ar, en], i) => '<li class="row" data-ph="' + i + '"><div class="main"><div class="title"><span>' + ar + '</span></div><div class="sub" dir="ltr" data-noi18n>' + en + '</div></div></li>').join('') + '</ul></div>',
      mount(root) {
        root.querySelectorAll('[data-ph]').forEach((r) => { r.onclick = () => {
          const [ar, en] = PHRASES[Number(r.dataset.ph)];
          const big = document.createElement('div');
          big.id = 'phBig'; big.setAttribute('role', 'dialog');
          big.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#fff;color:#111;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px;text-align:center';
          big.innerHTML = '<div dir="ltr" data-noi18n style="font:700 44px/1.25 system-ui,sans-serif">' + en + '</div><div style="margin-top:18px;font-size:20px;color:#555">' + ar + '</div><div style="margin-top:28px;font-size:15px;color:#888">اضغط بأي مكان للرجوع</div>';
          big.onclick = () => big.remove(); (document.querySelector('#sheet[open]') || document.body).appendChild(big);   // داخل النافذة: الـ dialog فوق أي شي برّاه
        }; });
      },
    });
  }

  // ================= ⚠️ التعارض مع جدولك =================
  function conflicts(t) {
    if (!t.go) return null;
    const a = day(t.go), b = day(t.back || t.go); b.setHours(23, 59, 59, 999);
    if (b < new Date()) return null;
    const tasks = (st.tasks || []).filter((x) => !x.done && x.due_at && ['exam', 'homework', 'appointment'].includes(x.kind) && new Date(x.due_at) >= a && new Date(x.due_at) <= b)
      .sort((x, y) => new Date(x.due_at) - new Date(y.due_at));
    let lectures = 0;
    const today0 = new Date(); today0.setHours(0, 0, 0, 0);
    for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
      if (d < today0) continue;
      lectures += (st.courses || []).filter((c) => Array.isArray(c.days) && c.days.includes(d.getDay()) && (!c.type || c.type === 'lecture')).length;
    }
    return tasks.length || lectures ? { tasks, lectures } : null;
  }
  const KIND = { exam: '📝 اختبار', homework: '📚 تسليم', appointment: '📅 موعد' };
  function conflictCard(t) {
    const c = conflicts(t); if (!c) return '';
    const dd = (s) => { const d = new Date(s); return d.getDate() + ' ' + A.MONTHS[d.getMonth()]; };
    return '<div class="card" style="border:1.5px solid var(--warn);margin-top:12px"><b>⚠️ تعارض مع جدولك</b><ul class="small" style="margin:8px 0 0;padding-inline-start:18px;line-height:1.8">' +
      c.tasks.slice(0, 5).map((x) => '<li>' + KIND[x.kind] + ': <bdi>' + h(x.title || '') + '</bdi> · <bdi>' + dd(x.due_at) + '</bdi></li>').join('') +
      (c.lectures ? '<li>بتفوّت <bdi class="num">' + c.lectures + '</bdi> ' + (c.lectures === 1 ? 'محاضرة' : 'محاضرات') + ' خلال الرحلة. شيّك حد الغياب بكل مادة</li>' : '') + '</ul></div>';
  }

  // ================= 🐷 حصّالة الرحلة =================
  const goalOf = (t) => (t.goal ? (st.goals || []).find((g) => g.id === t.goal) : null);
  function piggyCard(t) {
    const cd = T.countdown(t); if (cd.phase !== 'before') return '';
    const need = Math.max(0, Math.round((T.planned(t) - T.spentOf(t)) * 1000) / 1000);
    const g = goalOf(t);
    if (!g) return need > 0 ? '<button type="button" class="btn ghost block" id="tmPiggy" style="margin-top:10px"><span>🐷 سوّ حصّالة للرحلة</span> · <bdi>' + fmt(need) + '</bdi> <span>د.ب</span></button>' : '';
    const saved = Number(g.saved) || 0, left = Math.max(0, (Number(g.target) || 0) - saved), perDay = cd.n > 0 ? left / cd.n : left;
    const pct = g.target ? Math.min(100, Math.round((saved / g.target) * 100)) : 0;
    return '<div class="card" style="margin-top:12px"><b>🐷 حصّالة الرحلة</b><div class="small" style="margin:6px 0">جمعت <bdi>' + fmt(saved) + '</bdi> من <bdi>' + fmt(g.target) + '</bdi> د.ب' +
      (left > 0 ? ' · <span>وفّر</span> <bdi>' + fmt(perDay) + '</bdi> <span>د.ب باليوم لين السفر</span>' : ' · <span>جاهز ✓</span>') + '</div><div class="meter"><span style="width:' + pct + '%;background:var(--brand)"></span></div></div>';
  }

  // ================= 🎞️ ملخص الرحلة بصورة =================
  async function summary(t, withMoney) {
    const c = P.cityOf(t), name = c ? c.name : t.name;
    const ds = P.dates(t), ag = (t.agenda || []), places = new Set(ag.map((x) => x.title)).size, spent = T.spentOf(t);
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) { /* تجاهل */ }
    const font = getComputedStyle(document.body).fontFamily || 'sans-serif';
    const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const g = x.createRadialGradient(W / 2, H * 0.4, 50, W / 2, H * 0.45, H * 0.8); g.addColorStop(0, '#145a62'); g.addColorStop(0.5, '#0E3B43'); g.addColorStop(1, '#0A1A1E');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.direction = 'rtl'; x.textAlign = 'center'; x.fillStyle = '#E8DCC4';
    const txt = (s, y, size, color, weight) => { x.font = (weight || '700') + ' ' + size + 'px ' + font; x.fillStyle = color || '#E8DCC4'; x.fillText(s, W / 2, y); };
    txt('✈️ رحلتي إلى ' + name, 230, 76);
    if (t.go) { const a = day(t.go), b = day(t.back || t.go); txt('من ' + a.getDate() + (a.getMonth() === b.getMonth() ? '' : ' ' + A.MONTHS[a.getMonth()]) + ' لين ' + b.getDate() + ' ' + A.MONTHS[b.getMonth()] + ' ' + b.getFullYear(), 320, 40, '#E8DCC4', '400'); }
    const stats = [[String(ds.length || 1), ds.length === 1 ? 'يوم' : ds.length === 2 ? 'يومين' : 'أيام'], [String(places || 0), places === 1 ? 'مكان' : 'أماكن']];
    if (withMoney && spent > 0) stats.push([fmt(spent), 'د.ب']);
    const cw = W / stats.length;
    stats.forEach(([v, l], i) => {
      const cx = W - cw * i - cw / 2;
      x.font = '700 120px ' + font; x.fillStyle = '#FF6B4A'; x.textAlign = 'center'; x.direction = 'ltr'; x.fillText(v, cx, 560);
      x.direction = 'rtl'; x.font = '400 40px ' + font; x.fillStyle = '#E8DCC4'; x.fillText(l, cx, 625);
    });
    const top = ag.slice(0, 6).map((a) => a.title);
    x.textAlign = 'center'; x.direction = 'rtl';
    top.forEach((p, i) => txt('📍 ' + String(p).slice(0, 34), 760 + i * 70, 42, '#E8DCC4', '400'));
    txt('مسجّلة بتطبيق «حياتي» 🤍', H - 90, 34, '#FF6B4A');
    return cv;
  }
  function summarySheet(t) {
    let money = false, cv = null;
    A.openSheet({
      title: '🎞️ ملخص الرحلة', saveLabel: window.HayatiNative ? 'شارك الصورة' : 'احفظ الصورة',
      body: '<div style="border-radius:16px;overflow:hidden;background:#0E3B43"><img id="tmImg" alt="" style="width:100%;display:block"></div>' +
        '<label class="switch" style="margin-top:10px"><input type="checkbox" id="tmMoney"> أظهر كم صرفت</label>',
      async mount(root) {
        const redraw = async () => { cv = await summary(t, money); root.querySelector('#tmImg').src = cv.toDataURL('image/png'); };
        root.querySelector('#tmMoney').onchange = (e) => { money = e.target.checked; redraw(); };
        await redraw();
      },
      async onSave() {
        if (!cv) return false;
        const b64 = cv.toDataURL('image/png').split(',')[1], N = window.HayatiNative;
        if (N && N.saveImage) return N.saveImage('hayati-trip-summary.png', b64);
        const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = 'hayati-trip-summary.png'; document.body.appendChild(a); a.click(); a.remove();
        A.toast('انحفظت الصورة ✓'); return true;
      },
    });
  }

  // ================= صفحة الرحلة =================
  const prevSection = P.section, prevMount = P.mount;
  P.section = function (t) {
    const cd = T.countdown(t), after = cd.phase === 'after' && t.back && A.daysBetween(day(t.back), new Date()) <= 60;
    return conflictCard(t) + piggyCard(t) +
      (after ? '<button type="button" class="btn primary block" id="tmSum" style="margin-top:12px">🎞️ ملخص الرحلة بصورة</button>' : '') +
      prevSection.apply(this, arguments) +
      (P.cityOf(t) ? '<button type="button" class="btn ghost block" id="tmSos" style="margin-top:12px">🆘 بطاقة الطوارئ</button>' : '');
  };
  P.mount = function (root, t, persist, rerender) {
    prevMount.apply(this, arguments);
    const b = root.querySelector('#tmPiggy');
    if (b) b.onclick = () => {
      const need = Math.max(0, Math.round((T.planned(t) - T.spentOf(t)) * 1000) / 1000);
      const id = S.uuid();
      S.upsert('goals', { id, name: 'رحلة ' + t.name, emoji: '✈️', items: [], target: need, saved: 0, deadline: t.go || null, color: A.COLORS[1], done: false });
      t.goal = id; persist(); A.toast('انضافت الحصّالة 🐷 تلقاها بأهدافك'); rerender();
    };
    const s = root.querySelector('#tmSum'); if (s) s.onclick = () => { A.closeSheet(); setTimeout(() => summarySheet(t), 280); };
    const o = root.querySelector('#tmSos'); if (o) o.onclick = () => { A.closeSheet(); setTimeout(() => sosSheet(t), 280); };
  };

  // ================= ✈️ وضع السفر (اليوم) =================
  function active() {
    return T.all().find((t) => { const p = T.countdown(t).phase; return p === 'today' || p === 'during'; }) || null;
  }
  function modeCard() {
    const t = active(); if (!t) return '';
    const c = P.cityOf(t), ds = P.dates(t), today = ymd(new Date()), i = ds.indexOf(today);
    let rows = '';
    if (c) {
      const now = P.localNow(c), pr = P.prayersThere(c, new Date());
      const nowM = now ? mins(now.time) : null;
      let next = pr && nowM != null ? (pr.find(([, v]) => mins(v) > nowM) || null) : null;
      if (!next && pr && pr.length) { const tm = P.prayersThere(c, new Date(Date.now() + 864e5)); if (tm && tm[0]) next = [tm[0][0] + ' (بكرة)', tm[0][1]]; }
      rows += '<div class="split" style="margin-top:10px"><div><small>الوقت هناك</small><b class="num">' + (now ? now.time : '—') + '</b></div>' +
        (next ? '<div><small>الصلاة الجاية هناك</small><b><span>' + next[0] + '</span> <bdi class="num">' + next[1] + '</bdi></b></div>' : '') + '</div>';
    }
    const items = (t.agenda || []).filter((x) => x.date === today).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const planned = T.planned(t), spent = T.spentOf(t);
    return '<section data-tk="trip-mode"><div class="hero dark"><span class="eyebrow">✈️ <bdi>' + h(c ? c.name : t.name) + '</bdi>' + (i >= 0 ? ' · <span>يوم الرحلة</span> <bdi class="num">' + (i + 1) + '/' + ds.length + '</bdi>' : '') + '</span>' + rows +
      (items.length ? '<ul class="list" style="margin-top:10px">' + items.map((x) => '<li class="row" style="cursor:default"><div class="ico num" style="font-size:12px">' + h(x.time || '') + '</div><div class="main"><div class="title"><bdi>' + h(x.title) + '</bdi></div></div>' +
        (x.map || x.q ? '<button type="button" class="btn ghost" data-action="trip-map" data-url="' + h(x.map || ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(x.q))) + '">📍</button>' : '') + '</li>').join('') + '</ul>' : '') +
      (planned ? '<div class="meta" style="margin-top:8px"><span>صرفت <bdi>' + fmt(spent) + '</bdi> من <bdi>' + fmt(planned) + '</bdi> د.ب</span></div>' : '') +
      '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn primary" data-action="trip" data-id="' + t.id + '">افتح الرحلة</button>' +
      (sosOf(t) ? '<button class="btn" style="background:rgba(255,255,255,.16);color:#fff" data-action="trip-sos" data-id="' + t.id + '">🆘 الطوارئ</button>' : '') + '</div></div></section>';
  }
  const prevTop = E.todayTop;
  E.todayTop = (...a) => modeCard() + (prevTop ? prevTop(...a) : '');
  const prevAct = E.action;
  E.action = (name, el, e) => {
    if (name === 'trip-map') { open(el.dataset.url); return; }
    if (name === 'trip-sos') { const t = T.get(el.dataset.id); if (t) sosSheet(t); return; }
    return prevAct ? prevAct(name, el, e) : undefined;
  };
  E.TripMore = { conflicts, sosOf, SOS, COUNTRY, summary, summarySheet, sosSheet, modeCard, active };
})();
