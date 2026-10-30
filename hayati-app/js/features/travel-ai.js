// DW-096: «✨ خطط رحلتي بالذكاء» — المدينة والأيام ونوع الرحلة ← ملف رحلة: جدول يوم بيوم (أماكن حقيقية، رسوم تقديرية
// بعملتهم وبالدينار، زر الخريطة)، ميزانية تقديرية، أغراض، نصايح. ينحفظ بالرحلة: خطة الأيام + الميزانية + الأغراض. شارك بالواتساب.
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, h } = A;

  const STYLES = ['عائلية واستجمام', 'مغامرة وطبيعة', 'ثقافة وتاريخ', 'تسوق', 'زيارة دينية', 'اقتصادية'];
  const STEPS = ['🧭 نحدد الوجهة…', '💎 ندوّر الأماكن المميزة…', '💰 نحسب الرسوم بعملتهم وبالدينار…', '🗺️ نربط المواقع بالخريطة…', '📒 نجهّز ملف رحلتك…'];
  const errText = (e) => { const m = String((e && e.message) || ''); return m === 'quota' ? 'خلصت محاولاتك المجانية لهالشهر ✨ · ترجع أول الشهر' : m === 'limit' ? 'خلصت محاولات اليوم ✨ · جرّب بكرة' : m === 'signin' ? 'سجّل دخول أول عشان تستخدم الذكاء' : m === 'unavailable' ? 'الذكاء مو متاح الحين' : 'ما قدرنا نوصل للخدمة · جرّب بعدين'; };
  const mapUrl = (p, city) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((p.name_en || p.name) + ', ' + city);
  const openLink = (u) => { const N = window.HayatiNative; if (N && N.openLink) N.openLink(u); else window.open(u, '_blank', 'noopener'); };
  const nightsOf = (t) => (t.go && t.back ? Math.max(0, A.daysBetween(new Date(t.go + 'T00:00:00'), new Date(t.back + 'T00:00:00'))) : 0);

  function form(t, persist, rerender) {
    const c = E.TravelPlus && E.TravelPlus.cityOf(t);
    const days = Math.min(14, Math.max(1, nightsOf(t) + 1 || 5));
    A.openSheet({
      title: '✨ خطط رحلتي بالذكاء',
      saveLabel: 'سوّ الخطة',
      body: '<p class="small muted" style="margin:0 4px 12px">نسوي لك جدول يوم بيوم بأماكن حقيقية، ورسوم الدخول بعملتهم وبالدينار، وميزانية تقديرية، وأغراض تناسب الوجهة.</p>' +
        '<div class="field"><label>المدينة / الدولة</label><input name="ta_c" maxlength="60" value="' + h(c ? c.name : t.name || '') + '" placeholder="مثلاً: طرابزون، تركيا"></div>' +
        '<div class="two"><div class="field"><label>عدد الأيام</label><input name="ta_d" type="number" min="1" max="14" inputmode="numeric" value="' + days + '"></div>' +
        '<div class="field"><label>كم شخص؟</label><input name="ta_p" type="number" min="1" max="20" inputmode="numeric" value="1"></div></div>' +
        '<div class="field"><label>طبيعة الرحلة</label><select name="ta_s">' + STYLES.map((s) => '<option>' + s + '</option>').join('') + '</select></div>' +
        '<p class="small muted" style="margin:0 4px">يستخدم محاولة من محاولات «خطط رحلتي» المجانية لهالشهر.</p>',
      onSave(root) {
        const input = { city: A.val(root, 'ta_c').trim(), days: Math.min(14, Math.max(1, Math.round(Number(A.val(root, 'ta_d')) || 1))), people: Math.min(20, Math.max(1, Math.round(Number(A.val(root, 'ta_p')) || 1))), style: A.val(root, 'ta_s') };
        if (input.city.length < 2) throw new Error('اكتب المدينة');
        setTimeout(() => run(t, input, persist, rerender), 300);
      },
    });
  }

  function run(t, input, persist, rerender) {
    let i = 0, timer = null, cancelled = false;
    A.openSheet({
      title: '✨ نخطط رحلتك',
      cancelLabel: 'إلغاء',
      body: '<div style="text-align:center;padding:40px 10px"><div class="ta-spin" style="width:64px;height:64px;margin:0 auto 22px;border-radius:50%;border:5px solid var(--line);border-top-color:var(--brand);animation:taSpin 1s linear infinite"></div>' +
        '<b id="taStep" style="font-size:18px">' + STEPS[0] + '</b><p class="small muted" style="margin:10px 0 0">ياخذ تقريباً 20–40 ثانية</p></div>' +
        '<style>@keyframes taSpin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.ta-spin{animation:none!important}}</style>',
      mount(root) {
        timer = setInterval(() => { i = Math.min(STEPS.length - 1, i + 1); const el = root.querySelector('#taStep'); if (el) el.textContent = STEPS[i]; }, 4500);
        const sh = document.getElementById('sheet');
        if (sh) sh.addEventListener('close', () => { cancelled = true; clearInterval(timer); }, { once: true });
      },
    });
    const month = (t.go ? new Date(t.go + 'T00:00:00') : new Date()).toLocaleString('en-US', { month: 'long' });
    S.invokeFn('lecture-ai', { mode: 'trip', city: input.city, days: input.days, style: input.style, people: input.people, month })
      .then((plan) => {
        clearInterval(timer);
        if (cancelled) return;
        if (!plan || !Array.isArray(plan.days) || !plan.days.length) throw new Error('empty');
        plan.city = input.city; plan.style = input.style; plan.people = input.people; plan.at = new Date().toISOString();
        t.aiPlan = plan; persist();
        setTimeout(() => result(t, persist, rerender), 250);
      })
      .catch((e) => { clearInterval(timer); if (cancelled) return; A.closeSheet(); setTimeout(() => A.toast(errText(e)), 300); });
  }

  const fee = (p, cur) => (p.fee_local > 0 ? '<bdi>' + p.fee_local + ' ' + h(cur || '') + ' ≈ ' + A.fmt(p.fee_bhd || 0) + ' د.ب</bdi>' : '<span>مجاني</span>');

  function result(t, persist, rerender) {
    const plan = t.aiPlan; if (!plan) return;
    const city = plan.city || t.name, ppl = plan.people || 1, n = plan.days.length;
    const b = plan.budget || {};
    const total = (b.hotel_night || 0) * Math.max(1, n - 1) * Math.ceil(ppl / 2) + ((b.food_day || 0) + (b.transport_day || 0)) * n * ppl + (b.activities_total || 0) * ppl;
    const tabs = { days: 'الجدول', budget: 'الميزانية', pack: 'الأغراض', tips: 'نصايح' };
    const daysHtml = plan.days.map((d, i) => '<div class="ta-day"><div class="group-title" style="display:flex;gap:8px;align-items:center"><span class="ta-n">' + (i + 1) + '</span><span data-noi18n>' + h(d.title) + '</span></div>' +
      d.places.map((p) => '<div class="card ta-place"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div style="min-width:0"><b data-noi18n>' + h(p.name) + '</b>' + (p.name_en ? ' <small class="muted" dir="ltr" data-noi18n>(' + h(p.name_en) + ')</small>' : '') + '</div><span class="num small muted">' + h(p.time || '') + '</span></div>' +
        '<span class="tag" style="margin:6px 0;display:inline-block" data-noi18n>' + h(p.tag) + '</span>' +
        '<div class="small" style="margin:4px 0"><span>رسوم الدخول:</span> ' + fee(p, plan.currency) + '</div>' +
        '<p class="small muted" style="margin:4px 0 10px" data-noi18n>' + h(p.activities) + '</p>' +
        '<button type="button" class="btn block" data-map="' + h(mapUrl(p, city)) + '">📍 افتح بالخريطة</button></div>').join('') + '</div>').join('');
    const budgetHtml = '<div class="card"><ul class="list">' +
      [['🏨', 'السكن بالليلة', b.hotel_night], ['🍽️', 'الأكل باليوم (للشخص)', b.food_day], ['🚕', 'المواصلات باليوم', b.transport_day], ['🎟️', 'الأنشطة (للشخص)', b.activities_total]]
        .map(([e, l, v]) => '<li class="row" style="cursor:default"><div class="ico">' + e + '</div><div class="main"><div class="title"><span>' + l + '</span></div></div><div class="amount fit"><bdi>≈ ' + A.fmt(v || 0) + ' د.ب</bdi></div></li>').join('') +
      '</ul><p style="margin:10px 4px 0"><b><span>المجموع التقريبي</span> <bdi>≈ ' + A.fmt(total) + ' د.ب</bdi></b> <span class="small muted">(بدون الطيران)</span></p></div>';
    const packHtml = '<div class="card"><ul class="list">' + (plan.packing || []).map((x) => '<li class="row" style="cursor:default"><div class="ico">🧳</div><div class="main"><div class="title"><span data-noi18n>' + h(x) + '</span></div></div></li>').join('') + '</ul></div>';
    const tipsHtml = '<div class="card"><ul class="list">' + (plan.tips || []).map((x) => '<li class="row" style="cursor:default"><div class="ico">💡</div><div class="main"><div class="sub" style="white-space:normal" data-noi18n>' + h(x) + '</div></div></li>').join('') + '</ul></div>';
    A.openSheet({
      title: '📒 ملف رحلتك',
      saveLabel: 'احفظها بالرحلة',
      body: '<div class="hero dark"><span class="eyebrow">✨ <span data-noi18n>' + h(city) + '</span></span><div class="big"><bdi>' + n + '</bdi> <span>أيام</span></div><div class="meta"><span data-noi18n>' + h(plan.style || '') + '</span> · <bdi>' + ppl + '</bdi> <span>شخص</span></div></div>' +
        '<div class="seg" id="taTabs" style="margin:12px 0">' + Object.entries(tabs).map(([k, l], i) => '<button type="button" data-k="' + k + '" class="' + (i ? '' : 'on') + '">' + l + '</button>').join('') + '</div>' +
        '<div data-pane="days">' + daysHtml + '</div><div data-pane="budget" hidden>' + budgetHtml + '</div><div data-pane="pack" hidden>' + packHtml + '</div><div data-pane="tips" hidden>' + tipsHtml + '</div>' +
        '<button type="button" class="btn block" id="taShare" style="margin-top:12px">📤 شارك الخطة مع القروب</button>' +
        '<p class="small muted" style="margin:10px 4px 0">الأماكن والأسعار تقدير من الذكاء الاصطناعي، تأكد منها قبل تروح. «احفظها» تضيف الأيام لخطة الرحلة والأغراض للقائمة، وتعبّي بنود الميزانية الفاضية بس.</p>' +
        '<style>.ta-n{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:50%;background:var(--brand);color:#fff;font-size:13px}.ta-place{border-inline-start:3px solid var(--brand)}</style>',
      mount(root) {
        A.segPick(root, '#taTabs', (k) => root.querySelectorAll('[data-pane]').forEach((p) => { p.hidden = p.dataset.pane !== k; }));
        root.querySelectorAll('[data-map]').forEach((x) => { x.onclick = () => openLink(x.dataset.map); });
        root.querySelector('#taShare').onclick = () => (E.TravelShare ? E.TravelShare.sheet(t) : share(t));
      },
      onSave() { apply(t); persist(); A.toast('انحفظت بالرحلة ✓'); setTimeout(rerender, 300); },
    });
  }

  // للرحلة: الأيام ← خطة الأيام (لو التواريخ محددة)، الميزانية ← البنود الفاضية بس، الأغراض ← القائمة بدون تكرار
  function apply(t) {
    const plan = t.aiPlan; if (!plan) return;
    const city = plan.city || t.name, n = plan.days.length, ppl = plan.people || 1, b = plan.budget || {};
    if (t.go) {
      const start = new Date(t.go + 'T00:00:00');
      t.agenda = (t.agenda || []).filter((x) => !x.ai);
      plan.days.forEach((d, i) => {
        const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const ds = day.getFullYear() + '-' + String(day.getMonth() + 1).padStart(2, '0') + '-' + String(day.getDate()).padStart(2, '0');
        d.places.forEach((p) => t.agenda.push({ id: S.uuid(), ai: true, date: ds, time: /^\d{1,2}:\d{2}$/.test(p.time || '') ? p.time.padStart(5, '0') : '', title: String(p.name).slice(0, 60), place: String(p.name_en || '').slice(0, 60), map: mapUrl(p, city) }));
      });
    }
    t.plan = t.plan || {};
    const set = (k, v) => { if (!(Number(t.plan[k]) > 0) && v > 0) t.plan[k] = Math.round(v * 1000) / 1000; };
    set('hotel', (b.hotel_night || 0) * Math.max(1, n - 1) * Math.ceil(ppl / 2));
    set('food', (b.food_day || 0) * n * ppl);
    set('transport', (b.transport_day || 0) * n);
    set('fun', (b.activities_total || 0) * ppl);
    const have = new Set((t.check || []).map((x) => x.t));
    (plan.packing || []).forEach((x) => { const s = String(x).slice(0, 80); if (!have.has(s)) { t.check.push({ g: 'أغراض', t: s, on: false }); have.add(s); } });
  }

  function share(t) {
    const p = t.aiPlan, city = p.city || t.name;
    const lines = ['✨ خطة رحلتي إلى ' + city + ' (' + p.days.length + ' أيام)', ''];
    p.days.forEach((d, i) => { lines.push('📅 اليوم ' + (i + 1) + ': ' + d.title); d.places.forEach((x) => lines.push('• ' + (x.time ? x.time + ' ' : '') + x.name + ' 📍 ' + mapUrl(x, city))); lines.push(''); });
    lines.push('مخطّطة بتطبيق «حياتي» 🤍 apps.apple.com/app/id6823956749');
    const text = lines.join('\n'), N = window.HayatiNative;
    if (N && N.shareText) N.shareText(text);
    else if (navigator.share) navigator.share({ text }).catch(() => {});
    else { try { navigator.clipboard.writeText(text); A.toast('انتسخت الخطة ✓ الصقها بالواتساب'); } catch (e) { /* تجاهل */ } }
  }

  E.TravelAI = { form, result, apply, share, mapUrl, STYLES };
})();
