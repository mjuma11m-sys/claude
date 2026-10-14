// صفحة «عبادتي» + المسبحة + التقويم الهجري + مناسبات البحرين والخليج (DW-015)
// قواعد ثابتة: كلمات الذكر القصيرة بس (بدون نصوص طويلة ولا أحكام)، مقبول للكل، وكل شي على الجهاز
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, st, I, h, tint } = A;
  const wrap = (name, fn) => { const prev = E[name]; E[name] = (...a) => fn(prev ? prev : () => '', ...a); };
  const pad = (n) => String(n).padStart(2, '0');
  const dateKey = (d) => { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  // ================= التقويم الهجري (أم القرى من الجهاز، مع تعديل ±2 للرؤية) =================
  const H_MONTHS = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
  let fmtH = null;
  try { fmtH = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' }); } catch (e) { fmtH = null; }
  const offset = () => Math.max(-2, Math.min(2, Math.round(Number(st.settings.hijri_offset) || 0)));
  function hijri(d) {
    if (!fmtH) return null;
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset(), 12);
    const p = {}; for (const part of fmtH.formatToParts(x)) p[part.type] = part.value;
    const day = Number(p.day), month = Number(p.month), year = Number(String(p.year).replace(/\D/g, ''));
    return day && month ? { day, month, year } : null;
  }
  function hijriText(d) { const x = hijri(d || new Date()); return x ? x.day + ' ' + H_MONTHS[x.month - 1] + ' ' + x.year + ' هـ' : ''; }

  // ================= المناسبات (المشتركة والثقافية بالبحرين والخليج) =================
  // [اسم، شهر هجري، يوم] أو [اسم، null، شهر ميلادي، يوم]
  const OCCASIONS = [
    ['🌙 أول رمضان', 9, 1], ['🍬 القرقاعون', 9, 15], ['🎉 عيد الفطر', 10, 1],
    ['🌿 الحية بية', 12, 8], ['🕋 يوم عرفة', 12, 9], ['🐑 عيد الأضحى', 12, 10],
    ['🗓️ رأس السنة الهجرية', 1, 1], ['🍬 الناصفة', 8, 15],
    ['🇧🇭 اليوم الوطني', null, 12, 16],
  ];
  function nextDate(o, from) {
    const start = midnight(from || new Date());
    if (o[1] == null) {
      let d = new Date(start.getFullYear(), o[2] - 1, o[3]);
      if (d < start) d = new Date(start.getFullYear() + 1, o[2] - 1, o[3]);
      return d;
    }
    for (let i = 0; i < 400; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const x = hijri(d);
      if (x && x.month === o[1] && x.day === o[2]) return d;
    }
    return null;
  }
  function upcoming(n, from) {
    return OCCASIONS.map((o) => ({ name: o[0], date: nextDate(o, from), hijri: o[1] != null }))
      .filter((x) => x.date).sort((a, b) => a.date - b.date).slice(0, n || 5);
  }
  const daysWord = (n) => (n === 0 ? 'اليوم' : n === 1 ? 'بكرة' : n === 2 ? 'بعد يومين' : 'بعد ' + n + ' يوم');

  // ================= المسبحة =================
  const PRESETS = {
    zahra: { name: 'تسبيحة الزهراء (ع)', steps: [['الله أكبر', 34], ['الحمد لله', 33], ['سبحان الله', 33]] },
    after: { name: 'التسبيح بعد الصلاة', steps: [['سبحان الله', 33], ['الحمد لله', 33], ['الله أكبر', 34]] },
    free: { name: 'عداد حر', steps: [['', 0]] },
  };
  let tsb = { preset: 'zahra', step: 0, count: 0, free: '', target: 33 };
  function stepsOf() { const p = PRESETS[tsb.preset]; return tsb.preset === 'free' ? [[tsb.free || 'ذكر', tsb.target || 0]] : p.steps; }
  function todayTotal() { const t = st.settings.tasbih || {}; return t.date === dateKey() ? t.n || 0 : 0; }
  function addToday() { S.setSettings({ tasbih: { date: dateKey(), n: todayTotal() + 1 } }); }
  function vibrate() { try { if (window.HayatiNative && window.HayatiNative.haptic) window.HayatiNative.haptic(); else if (navigator.vibrate) navigator.vibrate(8); } catch (e) { /* تجاهل */ } }
  // ضغطة وحدة: تزيد العداد، ولو خلصت المرحلة تنتقل للي بعدها. ترجع وين صرنا
  function press() {
    const steps = stepsOf(), cur = steps[tsb.step] || steps[0];
    tsb.count++; addToday(); vibrate();
    let done = false;
    if (cur[1] && tsb.count >= cur[1]) {
      if (tsb.step < steps.length - 1) { tsb.step++; tsb.count = 0; } else done = true;
    }
    return { step: tsb.step, count: tsb.count, done };
  }
  function tasbihSheet(preset) {
    tsb = { preset: preset || tsb.preset || 'zahra', step: 0, count: 0, free: tsb.free, target: tsb.target || 33 };
    const draw = (root) => {
      const steps = stepsOf(), cur = steps[tsb.step], total = steps.reduce((a, s) => a + s[1], 0);
      const doneSoFar = steps.slice(0, tsb.step).reduce((a, s) => a + s[1], 0) + tsb.count;
      root.querySelector('#tsbWord').textContent = cur[0] || 'ذكر';
      root.querySelector('#tsbN').textContent = tsb.count + (cur[1] ? ' / ' + cur[1] : '');
      root.querySelector('#tsbAll').textContent = total ? doneSoFar + ' من ' + total : '';
      root.querySelector('#tsbToday').textContent = 'اليوم: ' + todayTotal();
    };
    A.openSheet({
      title: 'المسبحة',
      cancelLabel: 'تم',
      body: '<div class="seg" id="tsbPre" style="margin-bottom:12px">' + Object.entries(PRESETS).map(([k, p]) => '<button type="button" data-p="' + k + '" class="' + (k === tsb.preset ? 'on' : '') + '">' + p.name + '</button>').join('') + '</div>' +
        (tsb.preset === 'free' ? '<div style="display:flex;gap:8px;margin-bottom:10px"><input id="tsbFree" placeholder="الذكر (اختياري)" value="' + h(tsb.free || '') + '" style="flex:1"><input id="tsbTarget" inputmode="numeric" value="' + (tsb.target || 33) + '" style="width:80px" aria-label="الهدف"></div>' : '') +
        '<button type="button" id="tsbBtn" class="tsb-btn" style="display:block;width:100%;aspect-ratio:1/1;max-height:340px;border-radius:50%;border:0;background:var(--hero, #0E3B43);color:#fff;font:inherit;cursor:pointer">' +
        '<div id="tsbWord" style="font-size:34px;font-weight:700"></div><div id="tsbN" class="num" style="font-size:56px;font-weight:700;margin-top:8px"></div><div id="tsbAll" style="opacity:.75;margin-top:6px"></div></button>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px"><span id="tsbToday" class="small muted"></span><button type="button" class="btn ghost" id="tsbReset">من جديد</button></div>',
      mount(root) {
        draw(root);
        root.querySelector('#tsbBtn').onclick = () => { const r = press(); draw(root); if (r.done) { A.toast('تقبّل الله 🤍'); tsb.step = 0; tsb.count = 0; setTimeout(() => draw(root), 600); } };
        root.querySelector('#tsbReset').onclick = () => { tsb.step = 0; tsb.count = 0; draw(root); };
        root.querySelector('#tsbPre').onclick = (e) => { const b = e.target.closest('[data-p]'); if (b && b.dataset.p !== tsb.preset) tasbihSheet(b.dataset.p); };
        const f = root.querySelector('#tsbFree'), t = root.querySelector('#tsbTarget');
        if (f) f.oninput = () => { tsb.free = f.value.trim(); draw(root); };
        if (t) t.oninput = () => { tsb.target = Math.max(0, Math.round(A.parseAmount(t.value) || 0)); draw(root); };
      },
    });
  }

  // ================= صفحة «عبادتي» =================
  function nextPrayer() {
    const nm = A.nowMinutes(), list = A.agendaOn(new Date()).filter((x) => x.type === 'prayer');
    const p = list.find((x) => x.start > nm);
    return p ? { name: p.name, left: p.start - nm, at: A.time12(A.hhmm(p.start)) } : null;
  }
  const leftWord = (m) => (m < 60 ? m + ' دقيقة' : Math.floor(m / 60) + ' س ' + (m % 60 ? (m % 60) + ' د' : ''));
  function ibadaSheet() {
    const np = nextPrayer(), occ = upcoming(5), today = midnight(new Date());
    const w = (E.Wird && st.settings.wird && st.settings.wird.on) ? st.settings.wird : null;
    let body = '<div class="hero dark" style="margin-top:4px"><span class="eyebrow">' + I('calendar') + A.DAYS[new Date().getDay()] + ' ' + new Date().getDate() + ' ' + A.MONTHS[new Date().getMonth()] + '</span>' +
      '<div class="big" id="hijriNow">' + (hijriText() || '—') + '</div>' +
      '<div class="meta"><span>' + (np ? np.name + ' بعد ' + leftWord(np.left) + ' (' + np.at + ')' : 'خلصت صلوات اليوم') + '</span></div></div>';
    body += '<div class="small muted" style="margin:6px 4px 12px;display:flex;align-items:center;gap:8px">التاريخ الهجري تقدير (أم القرى)، وتقدر تعدّله للرؤية: ' +
      '<button type="button" class="btn ghost" data-ho="-1" style="padding:4px 12px">−1</button><b class="num" id="hoVal">' + (offset() > 0 ? '+' : '') + offset() + '</b><button type="button" class="btn ghost" data-ho="1" style="padding:4px 12px">+1</button></div>';
    body += '<div class="actions"><button class="action" type="button" id="ibTsb"><div class="ico" style="' + tint('#0d9488') + '">📿</div>المسبحة</button>' +
      '<button class="action" type="button" id="ibWird"><div class="ico" style="' + tint('#0d9488') + '">' + I('book') + '</div>' + (w ? 'وردك ' + ((w.log || {})[dateKey()] || 0) + '/' + E.Wird.goalPages(w) : 'ورد القرآن') + '</button></div>';
    body += A.secHead('المناسبات الجاية') + '<div class="card flush"><ul class="list">' + occ.map((o) => {
      const n = A.daysBetween(today, o.date);
      return '<li class="row" style="cursor:default"><div class="main"><div class="title"><span class="t">' + o.name + '</span></div><div class="sub">' + o.date.getDate() + ' ' + A.MONTHS[o.date.getMonth()] + (o.hijri ? ' · تقدير' : '') + '</div></div><span class="tag ' + (n <= 7 ? 'brand' : '') + '">' + daysWord(n) + '</span></li>';
    }).join('') + '</ul></div>';
    body += '<p class="small muted" style="margin:10px 6px 0">المناسبات المشتركة والشعبية بالبحرين والخليج. مواعيد الأشهر الهجرية تتأكد بالرؤية.</p>';
    A.openSheet({
      title: '🕌 عبادتي',
      cancelLabel: 'تم',
      body,
      mount(root) {
        root.querySelectorAll('[data-ho]').forEach((b) => { b.onclick = () => {
          const v = Math.max(-2, Math.min(2, offset() + Number(b.dataset.ho)));
          S.setSettings({ hijri_offset: v });
          root.querySelector('#hijriNow').textContent = hijriText();
          root.querySelector('#hoVal').textContent = (v > 0 ? '+' : '') + v;
        }; });
        root.querySelector('#ibTsb').onclick = () => tasbihSheet();
        root.querySelector('#ibWird').onclick = () => { A.closeSheet(); setTimeout(() => (E.pick ? E.pick('wird') : null), 280); };
      },
    });
  }

  // سطر واحد باليوم: الهجري + الصلاة الجاية، يفتح «عبادتي»
  function todayRow() {
    const t = hijriText();
    if (!t) return '';
    const np = nextPrayer();
    return '<button class="cta ibada-row" data-action="ibada"><div class="ico">🕌</div><div style="flex:1;min-width:0"><b>عبادتي</b><small>' + t + (np ? ' · ' + np.name + ' بعد ' + leftWord(np.left) : '') + '</small></div>' + I('chevL') + '</button>';
  }

  // ================= الربط =================
  wrap('todayMid', (prev) => '<section data-tk="ibada">' + todayRow() + '</section>' + prev());
  wrap('chooserItems', (prev, item) => prev(item) + item('tasbih', 'repeat', '#0d9488', 'المسبحة', 'تسبيحة الزهراء (ع)، بعد الصلاة، أو عداد حر'));
  wrap('pick', (prev, k) => { if (k === 'tasbih') { A.closeSheet(); setTimeout(() => tasbihSheet(), 280); return; } return prev(k); });
  wrap('settingsExtra', (prev) => '<div class="menu" style="margin-top:8px"><button data-set="ibada"><div class="ico" style="' + tint('#0d9488') + '">🕌</div><div style="flex:1;min-width:0"><b>عبادتي</b><small>الهجري، الصلاة، المسبحة، والمناسبات</small></div>' + I('chevL') + '</button></div>' + prev());
  const prevSet = E.settingsAction;
  E.settingsAction = async function (act) {
    if (act === 'ibada') { A.closeSheet(); setTimeout(ibadaSheet, 280); return true; }
    return prevSet ? prevSet.apply(this, arguments) : false;
  };
  wrap('action', (prev, name, el, e) => {
    if (name === 'ibada') { ibadaSheet(); return; }
    if (name === 'tasbih') { tasbihSheet(); return; }
    return prev(name, el, e);
  });
  E.Ibada = { hijri, hijriText, nextDate, upcoming, press, PRESETS, OCCASIONS, start: (p) => { tsb = { preset: p || 'zahra', step: 0, count: 0, free: '', target: 33 }; } };
})();
