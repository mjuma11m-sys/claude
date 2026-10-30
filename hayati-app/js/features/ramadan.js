// DW-104: وضع رمضان — من نص شعبان: عد تنازلي لرمضان. وخلال رمضان: الإمساك والفطور بالرئيسية، ختمة 30 جزء (جزء لكل يوم)،
// تذكير السحور، وميزانية رمضان مع الغبقات والعزايم. الإمساك = الفجر ناقص 10 دقايق (تقريبي ومكتوب كذا).
// كله على الجهاز (hayati-ramadan) ويدخل بالنسخة الاحتياطية. التاريخ من التقويم الهجري حق «عبادتي» (مع تعديل الرؤية ±2).
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E || !E.Ibada) return;
  const { S, st, h, fmt } = A;
  const KEY = 'hayati-ramadan';
  const pad = (n) => String(n).padStart(2, '0');
  const hm = (m) => { m = ((Math.round(m) % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
  const day0 = (d) => { const x = new Date(d || Date.now()); x.setHours(0, 0, 0, 0); return x; };
  const load = () => { try { return Object.assign({ budget: 0, khatma: {}, gatherings: [] }, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return { budget: 0, khatma: {}, gatherings: [] }; } };
  const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* تجاهل */ } if (window.HayatiNative && HayatiNative.reschedule) HayatiNative.reschedule(); A.render(); };

  // أيام رمضان: من 1 رمضان لين آخر يوم قبل 1 شوال
  function range(now) {
    now = day0(now);
    const hj = E.Ibada.hijri(now);
    let start;
    if (hj && hj.month === 9) start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (hj.day - 1));
    else start = E.Ibada.nextDate(['', 9, 1], now);
    if (!start) return null;
    const eid = E.Ibada.nextDate(['', 10, 1], start);
    const end = eid ? new Date(eid.getFullYear(), eid.getMonth(), eid.getDate() - 1) : new Date(start.getFullYear(), start.getMonth(), start.getDate() + 29);
    const days = Math.round((end - start) / 864e5) + 1;
    const n = Math.round((now - start) / 864e5) + 1;
    return { start, end, days, n, inside: n >= 1 && n <= days, before: n < 1 ? -n + 1 : 0 };
  }
  // من نص شعبان لين آخر رمضان
  function phase(now) {
    const r = range(now); if (!r) return null;
    if (r.inside) return Object.assign({ mode: 'during' }, r);
    const hj = E.Ibada.hijri(day0(now));
    if (hj && hj.month === 8 && hj.day >= 15 && r.before <= 16) return Object.assign({ mode: 'soon' }, r);
    return null;
  }
  function times(d) {
    if (!E.prayerTimes) return null;
    const m = (st.settings && st.settings.prayer_method) || 'jafari';
    const t = E.prayerTimes(d || new Date(), m);
    return t ? { imsak: t.fajr - 10, fajr: t.fajr, iftar: t.maghrib } : null;
  }
  const leftText = (m) => { const H = Math.floor(m / 60), M = m % 60; return H ? H + ' س' + (M ? ' ' + M + ' د' : '') : M + ' د'; };   // بدون «و» عشان الترجمة
  const t12 = (m) => '<span>' + A.time12(hm(m)) + '</span>';

  // ================= بطاقة الرئيسية =================
  function card(now) {
    now = now || new Date();
    const p = phase(now); if (!p) return '';
    if (p.mode === 'soon') return '<section data-tk="ramadan"><button class="cta" data-action="ramadan"><div class="ico">🌙</div><div style="flex:1;min-width:0"><b><span>باقي</span> <bdi class="num">' + p.before + '</bdi> <span>' + (p.before === 1 ? 'يوم' : p.before === 2 ? 'يومين' : 'أيام') + ' على رمضان</span></b><small>جهّز ميزانية رمضان والغبقات من الحين</small></div>' + A.I('chevL') + '</button></section>';
    const t = times(now), v = load(), y = String(p.start.getFullYear()), done = (v.khatma[y] || []).length;
    const nowM = now.getHours() * 60 + now.getMinutes();
    let line = '';
    if (t) {
      if (nowM < t.imsak) line = '<span>الإمساك</span> ' + t12(t.imsak) + ' · <span>باقي ' + leftText(t.imsak - nowM) + '</span>';
      else if (nowM < t.iftar) line = '<span>الفطور</span> ' + t12(t.iftar) + ' · <span>باقي ' + leftText(t.iftar - nowM) + '</span>';
      else line = '<span>الإمساك بكرة</span> ' + t12((times(new Date(now.getTime() + 864e5)) || t).imsak);
    }
    const juz = Math.min(30, p.n), read = (v.khatma[y] || []).includes(p.n);
    return '<section data-tk="ramadan"><div class="hero dark"><span class="eyebrow">🌙 <span>رمضان</span> · <span>اليوم</span> <bdi class="num">' + p.n + '/' + p.days + '</bdi></span>' +
      '<div style="font-size:20px;font-weight:700;margin-top:6px">' + line + '</div>' +
      '<div class="meta" style="margin-top:6px"><span><span>الختمة:</span> <bdi class="num">' + done + '/30</bdi> <span>جزء</span></span></div>' +
      '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' + (read ? '<span class="tag">✓ <span>قريت جزء اليوم</span></span>' : '<button class="btn primary" data-action="ramadan-juz"><span>📖 قريت الجزء</span> <bdi class="num">' + juz + '</bdi></button>') +
      '<button class="btn" style="background:rgba(255,255,255,.16);color:#fff" data-action="ramadan">ميزانية رمضان</button></div></div></section>';
  }

  // ================= ميزانية رمضان والغبقات =================
  const FOOD = ['أكل ومطاعم', 'بقالة وتسوق', 'قهوة'];
  function spent(p) {
    const a = p.start, b = new Date(p.end.getFullYear(), p.end.getMonth(), p.end.getDate(), 23, 59, 59);
    return (st.transactions || []).filter((t) => t.kind === 'expense' && FOOD.includes(t.category) && new Date(t.occurred_at) >= a && new Date(t.occurred_at) <= b).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  }
  function sheet() {
    const p = range(new Date()), v = load(); if (!p) return;
    const sp = spent(p), gs = v.gatherings.slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const plannedG = gs.reduce((s, g) => s + (Number(g.cost) || 0), 0);
    const y = String(p.start.getFullYear()), done = (v.khatma[y] || []).length;
    A.openSheet({
      title: '🌙 رمضان', cancelLabel: 'تم',
      body: '<p class="small muted" style="margin:0 4px 12px"><span>من</span> <bdi>' + p.start.getDate() + ' ' + A.MONTHS[p.start.getMonth()] + '</bdi> <span>لين</span> <bdi>' + p.end.getDate() + ' ' + A.MONTHS[p.end.getMonth()] + '</bdi> · <span>التاريخ حسب تقويم أم القرى وتعديل الرؤية من «عبادتي»</span></p>' +
        '<div class="card"><div class="field" style="margin:0"><label>ميزانية رمضان للأكل والعزايم (د.ب)</label><input id="rmBudget" inputmode="decimal" class="ltr" value="' + (v.budget ? fmt(v.budget) : '') + '"></div>' +
        (v.budget ? '<p class="small" style="margin:8px 4px 0;color:' + (sp + plannedG > v.budget ? 'var(--expense)' : 'var(--muted)') + '"><span>صرفت</span> <bdi>' + fmt(sp) + '</bdi> <span>+ الغبقات المخطط لها</span> <bdi>' + fmt(plannedG) + '</bdi> <span>من</span> <bdi>' + fmt(v.budget) + '</bdi> <span>د.ب</span></p>' : '') + '</div>' +
        '<div class="group-title">🍽️ الغبقات والعزايم</div>' +
        (gs.length ? '<div class="card flush"><ul class="list">' + gs.map((g) => '<li class="row" data-g="' + g.id + '"><div class="ico">🍽️</div><div class="main"><div class="title"><bdi>' + h(g.name) + '</bdi></div><div class="sub"><bdi>' + h(g.date || '') + '</bdi> · <bdi class="num">' + (Number(g.people) || 0) + '</bdi> <span>شخص</span> · <bdi>' + fmt(Number(g.cost) || 0) + '</bdi> <span>د.ب</span></div></div></li>').join('') + '</ul></div>'
          : '<p class="small muted" style="margin:0 4px 8px">سجّل الغبقات والعزايم اللي ناوي تسويها، ونذكّرك قبلها بيوم.</p>') +
        '<button type="button" class="btn ghost block" id="rmAdd">＋ غبقة أو عزيمة</button>' +
        '<div class="group-title">📖 الختمة</div><div class="card"><b><bdi class="num">' + done + '/30</bdi> <span>جزء</span></b><div class="meter" style="margin-top:8px"><span style="width:' + Math.round((done / 30) * 100) + '%;background:var(--brand)"></span></div>' +
        '<p class="small muted" style="margin:8px 0 0">جزء لكل يوم. اضغط «قريت الجزء» من بطاقة رمضان بالرئيسية.</p></div>' +
        '<p class="small muted" style="margin:12px 4px 0">الإمساك بالتطبيق = قبل الفجر بـ 10 دقايق (تقريبي). اعتمد على إمساكية بلدك أو مرجعك.</p>',
      mount(root) {
        root.querySelector('#rmBudget').onchange = (e) => { const x = load(); x.budget = Math.round((parseFloat(String(e.target.value).replace(',', '.')) || 0) * 1000) / 1000; save(x); };
        root.querySelector('#rmAdd').onclick = () => { A.closeSheet(); setTimeout(() => gForm(), 280); };
        root.querySelectorAll('[data-g]').forEach((r) => { r.onclick = () => { A.closeSheet(); setTimeout(() => gForm(load().gatherings.find((x) => x.id === r.dataset.g)), 280); }; });
      },
    });
  }
  function gForm(g) {
    A.openSheet({
      title: g ? 'عدّل' : 'غبقة أو عزيمة', saveLabel: 'حفظ',
      body: '<div class="field"><label>وش هي؟</label><input name="name" placeholder="مثلاً: غبقة الربع" value="' + h((g && g.name) || '') + '"></div>' +
        '<div class="field"><label>متى؟</label><input name="date" type="date" value="' + h((g && g.date) || '') + '"></div>' +
        '<div class="field"><label>كم شخص؟</label><input name="people" inputmode="numeric" class="ltr" value="' + h(g ? String(g.people || '') : '') + '"></div>' +
        '<div class="field"><label>التكلفة المتوقعة (د.ب)</label><input name="cost" inputmode="decimal" class="ltr" value="' + h(g ? String(g.cost || '') : '') + '"></div>' +
        (g ? '<button type="button" class="btn danger block" id="rmDel">حذف</button>' : ''),
      mount(root) { const d = root.querySelector('#rmDel'); if (d) d.onclick = () => { const x = load(); x.gatherings = x.gatherings.filter((y) => y.id !== g.id); save(x); A.closeSheet(); setTimeout(sheet, 280); }; },
      onSave(root) {
        const val = (n) => root.querySelector('[name=' + n + ']').value.trim();
        if (!val('name')) throw new Error('اكتب وش هي');
        const it = { id: (g && g.id) || S.uuid(), name: val('name'), date: val('date'), people: Math.round(parseFloat(val('people')) || 0), cost: Math.round((parseFloat(val('cost').replace(',', '.')) || 0) * 1000) / 1000 };
        const x = load(); x.gatherings = x.gatherings.filter((y) => y.id !== it.id).concat(it); save(x);
        A.toast('انحفظت ✓'); setTimeout(sheet, 300);
      },
    });
  }

  // ================= التنبيهات: السحور (قبل الإمساك بـ 45 د) والغبقات (قبلها بيوم 8 الليل) =================
  function reminders(now) {
    now = now || new Date();
    const out = [], p = range(now); if (!p) return out;
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      if (d < p.start || d > p.end) continue;
      const t = times(d); if (!t) continue;
      const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, t.imsak - 45);
      if (at > now) out.push({ key: 'suhoor:' + d.toDateString(), at, title: '🌙 وقت السحور', body: 'الإمساك ' + A.time12(hm(t.imsak)) + ' (تقريبي)', extra: { kind: 'ramadan' } });
    }
    for (const g of load().gatherings) {
      if (!g.date) continue;
      const [y, m, dd] = g.date.split('-').map(Number), at = new Date(y, m - 1, dd - 1, 20, 0);
      if (at > now) out.push({ key: 'ghabga:' + g.id, at, title: '🍽️ بكرة: ' + g.name, body: (Number(g.people) || 0) + ' شخص', extra: { kind: 'ramadan' } });
    }
    return out;
  }

  const prevTop = E.todayTop;
  E.todayTop = (...a) => card() + (prevTop ? prevTop(...a) : '');
  const prevAct = E.action;
  E.action = (name, el, e) => {
    if (name === 'ramadan') { sheet(); return; }
    if (name === 'ramadan-juz') {
      const p = range(new Date()); if (!p || !p.inside) return;
      const v = load(), y = String(p.start.getFullYear());
      v.khatma[y] = Array.from(new Set((v.khatma[y] || []).concat(p.n))); save(v); A.toast('تقبّل الله 🤍'); return;
    }
    return prevAct ? prevAct(name, el, e) : undefined;
  };
  if (E.Tools && E.Tools.GROUPS) { const g = E.Tools.GROUPS.find((x) => x[0].indexOf('العبادة') >= 0); if (g) g[1].push(['ramadan', 'moon', '#0d9488', 'رمضان', sheet]); }
  E.Ramadan = { range, phase, times, card, sheet, reminders, KEY };
})();
