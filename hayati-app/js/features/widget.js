// «ودجت حياتي» على شاشة أندرويد الرئيسية (DW-031).
// التطبيق يجهّز «لقطة» صغيرة (الميزانية + الجاي اليوم وبكرة) ويحفظها عند الأندرويد، والودجت يعرضها حتى لو التطبيق مسكّر.
// الخصوصية: الشاشة الرئيسية يشوفها أي أحد، فالمبالغ مخفية إلا لو فعّلتها، ولو القفل شغّال ما يطلع ولا شي.
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { I, tint, st } = A;
  const KEY = 'hayati-widget';
  const tr = (s) => (window.HayatiLang && HayatiLang.lang === 'en' && HayatiLang.tr ? HayatiLang.tr(s) : s);
  const Cap = window.Capacitor;
  const plugin = () => {
    if (!Cap || typeof Cap.getPlatform !== 'function' || !['android', 'ios'].includes(Cap.getPlatform())) return null;   // آيفون من DW-044
    return (Cap.Plugins && Cap.Plugins.HayatiWidget) || (typeof Cap.registerPlugin === 'function' ? Cap.registerPlugin('HayatiWidget') : null);
  };

  function prefs() { try { return Object.assign({ amounts: false }, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return { amounts: false }; } }
  function setPrefs(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* تجاهل */ } }
  const locked = () => { try { return !!localStorage.getItem('hayati-lock'); } catch (e) { return false; } };

  // الجاي: اليوم وبكرة من الجدول، والاختبارات والتسليمات اللي موعدها خلال يومين
  function items(now) {
    const out = [];
    for (let d = 0; d < 2; d++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
      for (const it of A.agendaOn(day)) {
        const t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(it.start / 60), it.start % 60).getTime();
        const type = A.ACT_TYPES[it.type] || A.ACT_TYPES.activity || {};
        out.push({ t, title: it.name, sub: [type.label, it.room].filter(Boolean).join(' · ') });
      }
    }
    for (const k of st.tasks) {
      if (k.done || !k.due_at || k.kind === 'appointment') continue;
      const t = new Date(k.due_at).getTime();
      if (t > now.getTime() && t - now.getTime() < 2 * 864e5) out.push({ t, title: k.title, sub: (A.TASK_KINDS[k.kind] || {}).label || '' });
    }
    return out.filter((x) => x.t > now.getTime() - 30 * 6e4).sort((a, b) => a.t - b.t).slice(0, 8)
      .map((x) => ({ t: x.t, title: tr(String(x.title || '')).slice(0, 60), sub: tr(x.sub).slice(0, 60), time: tr(A.timeOf(new Date(x.t))) }));
  }

  function snapshot(now) {
    now = now || new Date();
    const p = prefs(), en = !!(window.HayatiLang && HayatiLang.lang === 'en');
    const labels = { next: tr('الجاي'), none: tr('ما فيه شي اليوم وبكرة'), add: tr('+ مصروف'), paste: tr('الصق رسالة'), locked: tr('🔒 افتح حياتي'),
      today: tr('اليوم'), tomorrow: tr('بكرة'), noBudget: tr('حدد ميزانيتك من التطبيق') };
    const base = { v: 1, at: now.getTime(), rtl: !en, labels };
    if (locked()) return Object.assign(base, { locked: true, items: [] });
    const budget = Number(st.settings.budget) || 0;
    const spent = A.sums(A.txInMonth(A.monthKey(now))).exp;
    let line = labels.noBudget, pct = -1;
    // الودجت الصغير (DW-039): رقم واحد كبير وتحته سطر
    let small = { big: '+', cap: labels.noBudget, pct: -1 };
    if (budget) {
      const left = budget - spent;
      pct = Math.max(0, Math.min(100, Math.round((left / budget) * 100)));
      const amt = (n) => A.fmt(n) + (en ? ' BHD' : ' د.ب');
      if (left < 0) line = (en ? 'Over budget' : 'تجاوزت الميزانية') + (p.amounts ? (en ? ' by ' : ' بـ ') + amt(-left) : '');
      else line = en ? (p.amounts ? amt(left) : pct + '%') + ' of budget left' : 'باقي ' + (p.amounts ? amt(left) : pct + '%') + ' من الميزانية';
      small = left < 0
        ? { big: p.amounts ? '−' + A.fmt(-left) : '0%', cap: en ? 'Over budget' : 'تجاوزت الميزانية', pct: 0 }
        : { big: p.amounts ? A.fmt(left) : pct + '%', cap: p.amounts ? (en ? 'BHD left this month' : 'د.ب باقي هالشهر') : (en ? 'of budget left' : 'باقي من الميزانية'), pct };
    }
    return Object.assign(base, { locked: false, budget: { line, pct }, small, items: items(now) });
  }

  // نرسل اللقطة بعد ما تهدا الشاشة، ولما التطبيق يروح للخلفية
  let timer = null, last = '';
  function push(force) {
    const W = plugin(); if (!W || typeof W.update !== 'function') return;
    let data; try { data = JSON.stringify(snapshot()); } catch (e) { return; }
    const sig = data.replace(/"at":\d+,/, '');
    if (!force && sig === last) return;
    last = sig;
    Promise.resolve().then(() => W.update({ data })).catch(() => {});
  }
  const soon = () => { clearTimeout(timer); timer = setTimeout(push, 1500); };
  const view = document.getElementById('view');
  if (view && plugin()) new MutationObserver(soon).observe(view, { childList: true, subtree: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) push(true); });

  // أزرار الودجت: «+ مصروف» و«الصق رسالة»
  function onAction(name) {
    if (!name) return;
    console.info('hayati-widget-action:' + name);
    setTimeout(() => {
      if (name === 'add-tx') A.txForm();
      else if (name === 'paste-sms') A.pasteSmsForm();
      else if (name === 'ask' && window.Extras.openAssistant) window.Extras.openAssistant();   // DW-048: اختصار الأيقونة
    }, 300);
  }
  const W0 = plugin();
  if (W0 && typeof W0.take === 'function') {
    try { const r = W0.addListener('action', (ev) => onAction(ev && ev.name)); if (r && r.catch) r.catch(() => {}); } catch (e) { /* تجاهل */ }
    Promise.resolve().then(() => W0.take()).then((r) => onAction(r && r.name)).catch(() => {});
    setTimeout(() => push(true), 2500);
  }

  // الإعدادات (أندرويد بس)
  function sheet() {
    const p = prefs();
    A.openSheet({
      title: '📱 ودجت حياتي',
      saveLabel: 'حفظ',
      body: '<p class="small muted" style="margin:0 0 12px">' + (Cap && Cap.getPlatform() === 'ios' ? 'ثبّته من الشاشة الرئيسية: اضغط مطوّل على مكان فاضي ← «+» فوق ← حياتي. فيه حجمين: الصغير يعرض كم باقي من الميزانية وزر «+ مصروف»، والمتوسط يعرض الجاي اليوم وبكرة والميزانية مع «+ مصروف» و«الصق رسالة».' : 'ثبّته من الشاشة الرئيسية: اضغط مطوّل على مكان فاضي ← الأدوات (Widgets) ← حياتي. فيه حجمين: الكبير (4×2) يعرض الجاي اليوم وبكرة والميزانية مع «+ مصروف» و«الصق رسالة»، والصغير (2×2) يعرض كم باقي من الميزانية وزر «+ مصروف».') + '</p>' +
        '<label style="display:flex;gap:10px;align-items:center;margin:0 0 10px"><input id="wgAmounts" type="checkbox"' + (p.amounts ? ' checked' : '') + '><span>اعرض المبالغ بالودجت</span></label>' +
        '<p class="small muted" style="margin:0">الشاشة الرئيسية يشوفها أي أحد يمسك جوالك، فالمبالغ مخفية إلا لو فعّلتها (يطلع بس كم % باقي). ولو قفل التطبيق شغّال، الودجت ما يعرض أي بيانات.</p>',
      onSave(root) {
        setPrefs({ amounts: root.querySelector('#wgAmounts').checked });
        push(true); A.toast('تحدّث الودجت');
      },
    });
  }
  const prevExtra = E.settingsExtra;
  E.settingsExtra = function () {
    return (plugin() ? '<div class="menu" style="margin-top:8px"><button data-set="widget"><div class="ico" style="' + tint('#13636B') + '">' + I('phone') + '</div><div style="flex:1;min-width:0"><b>ودجت الشاشة الرئيسية</b><small>الجاي والميزانية بدون ما تفتح التطبيق</small></div>' + I('chevL') + '</button></div>' : '') +
      (prevExtra ? prevExtra.apply(this, arguments) : '');
  };
  const prevSet = E.settingsAction;
  E.settingsAction = async function (act) {
    if (act === 'widget') { A.closeSheet(); setTimeout(sheet, 280); return true; }
    return prevSet ? prevSet.apply(this, arguments) : false;
  };

  E.Widget = { snapshot, items, sheet, push, prefs, onAction };
})();
