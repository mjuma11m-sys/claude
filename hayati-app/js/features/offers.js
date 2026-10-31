// DW-110: «عروض الشركاء» — شركات موثّقة (سجل وترخيص) تعرض خدمتها بالمكان اللي يناسبها: الرحلة والعمرة، الويكند،
// صيانة السيارة، عيالك، ورمضان. مكتوب عليها «إعلان»، عرض واحد بالشاشة، ونفس العرض 3 مرات بالأسبوع بالكثير.
// السيرفر يرسل كل العروض الشغالة، و**الجهاز** يختار المناسب (وجهة رحلتك، القسم): ولا معلومة عنك تطلع للسيرفر ولا للشركة.
// الحملات الدينية للمذهبين والسياحية: الاختيار بالوجهة بس، وما نستخدم المذهب أو طريقة الصلاة للإعلانات أبداً.
// التواصل يبدأ منك (واتساب أو رابط). تقدر تطفيها كلها من الإعدادات، أو «ما يهمني» لعرض واحد.
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, h, fmt } = A;
  const CACHE = 'hayati-offers', PREFS = 'hayati-offers-prefs', TTL = 12 * 3600e3, WEEK_MAX = 3;
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const week = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return ymd(x); };
  const get = (k, d) => { try { return Object.assign({}, d, JSON.parse(localStorage.getItem(k) || 'null') || {}); } catch (e) { return Object.assign({}, d); } };
  const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* تجاهل */ } };
  const prefs = () => get(PREFS, { off: false, hidden: [], seen: {}, viewed: {} });

  // ---------- التحميل (مرة كل 12 ساعة) ----------
  let loading = null;
  function cached() { const c = get(CACHE, { at: 0, list: [] }); return Array.isArray(c.list) ? c : { at: 0, list: [] }; }
  async function refresh(force) {
    const c = cached();
    if (!force && Date.now() - c.at < TTL) return c.list;
    if (loading) return loading;
    loading = (async () => {
      const list = navigator.onLine ? await S.fetchOffers().catch(() => null) : null;
      if (Array.isArray(list)) set(CACHE, { at: Date.now(), list });
      loading = null;
      return Array.isArray(list) ? list : c.list;
    })();
    return loading;
  }

  // ---------- الاختيار على الجهاز ----------
  // ctx: { city, date } — نفس المدينة، وتواريخ العرض قريبة من تاريخ الرحلة (±30 يوم)
  function pick(section, ctx, now) {
    now = now || new Date();
    const p = prefs(), wk = week(now), today = ymd(now);
    ctx = ctx || {};
    // بالعدل: نفس الباقة والأولوية ← اللي انعرض أقل هالأسبوع يطلع أول (حملات نفس الوجهة تطلع بالدور)
    const shown = (o) => ((p.seen[o.id] || {}).w === wk ? (p.seen[o.id] || {}).n : 0);
    const near = (o) => {
      if (!ctx.date) return !o.ends_on || o.ends_on >= today;
      const d = new Date(ctx.date + 'T00:00:00').getTime(), lo = d - 30 * 864e5, hi = d + 30 * 864e5;
      const s = o.starts_on ? new Date(o.starts_on + 'T00:00:00').getTime() : -Infinity, e = o.ends_on ? new Date(o.ends_on + 'T00:00:00').getTime() : Infinity;
      return s <= hi && e >= lo;
    };
    return cached().list.filter((o) => o.section === section && (!o.city || !ctx.city || o.city === ctx.city) && (!o.city || ctx.city || section !== 'travel') &&
      near(o) && !p.hidden.includes(o.id) && !((p.seen[o.id] || {}).w === wk && (p.seen[o.id] || {}).n >= WEEK_MAX))
      .sort((a, b) => (b.plan === 'featured' || b.plan === 'sponsor') - (a.plan === 'featured' || a.plan === 'sponsor') || (b.priority || 0) - (a.priority || 0) || shown(a) - shown(b))[0] || null;
  }
  function seen(o, now) {
    now = now || new Date();
    const p = prefs(), wk = week(now), s = p.seen[o.id] && p.seen[o.id].w === wk ? p.seen[o.id] : { w: wk, n: 0 };
    s.n++; p.seen[o.id] = s;
    // مشاهدة وحدة باليوم لكل عرض تنحسب بالسيرفر (رقم مجمّع بدون هوية)
    if (p.viewed[o.id] !== ymd(now)) { p.viewed[o.id] = ymd(now); S.offerEvent(o.id, 'view'); }
    set(PREFS, p);
  }

  // ---------- البطاقة ----------
  const wa = (o) => 'https://wa.me/' + o.whatsapp + '?text=' + encodeURIComponent('السلام عليكم، شفت عرضكم «' + o.title + '» بتطبيق حياتي' + (o.discount || o.code ? '، وأبي خصم مستخدمي حياتي' + (o.code ? ' (كود: ' + o.code + ')' : '') : ''));
  function card(o) {
    return '<div class="card offer-card" data-offer="' + h(o.id) + '" style="margin-top:14px;border:1px dashed var(--line,#d9d2c3)">' +
      '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><span class="tag" style="font-size:11px">إعلان · شريك موثّق</span><span style="flex:1"></span>' +
      '<button type="button" class="link small" data-offer-hide>ما يهمني</button></div>' +
      '<div class="small muted" data-noi18n><bdi>' + h(o.partner) + '</bdi></div>' +
      (o.discount ? '<span class="tag brand" style="display:inline-block;margin:4px 0;font-weight:700">🎟️ <bdi data-noi18n>' + h(o.discount) + '</bdi> <span>لمستخدمي حياتي</span></span>' : '') +
      '<b data-noi18n style="display:block;font-size:16px;margin:2px 0"><bdi>' + h(o.title) + '</bdi></b>' +
      (o.body ? '<p class="small" data-noi18n style="margin:4px 0"><bdi>' + h(o.body) + '</bdi></p>' : '') +
      (o.price_bhd != null ? '<div style="margin:4px 0"><span>من</span> <b><bdi>' + fmt(Number(o.price_bhd)) + '</bdi> د.ب</b></div>' : '') +
      '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">' +
      (o.discount || o.code ? '<button type="button" class="btn primary" data-offer-redeem>🎟️ استخدم الخصم</button>' : '') +
      (o.whatsapp ? '<button type="button" class="btn ' + (o.discount || o.code ? 'ghost' : 'primary') + '" data-offer-go="wa">💬 تواصل واتساب</button>' : '') +
      (o.url ? '<button type="button" class="btn ghost" data-offer-go="url">🔗 التفاصيل</button>' : '') + '</div></div>';
  }
  function open(u) { const N = window.HayatiNative; if (N && N.openLink) N.openLink(u); else window.open(u, '_blank', 'noopener'); }
  function bind(el, o) {
    el.querySelectorAll('[data-offer-go]').forEach((b) => { b.onclick = () => { S.offerEvent(o.id, 'click'); open(b.dataset.offerGo === 'wa' ? wa(o) : o.url); }; });
    const rd = el.querySelector('[data-offer-redeem]'); if (rd) rd.onclick = () => redeem(o);
    const hide = el.querySelector('[data-offer-hide]');
    if (hide) hide.onclick = () => { const p = prefs(); if (!p.hidden.includes(o.id)) p.hidden.push(o.id); set(PREFS, p); el.remove(); A.toast('ما راح يطلع لك مرة ثانية'); };
  }
  // 🎟️ شاشة الخصم: كبيرة يوريها للكاشير، فيها تاريخ اليوم وساعة تمشي (عشان صورة قديمة ما تمشي)
  function redeem(o, now) {
    const p = prefs(), day = ymd(now || new Date());
    p.redeemed = p.redeemed || {};
    if (p.redeemed[o.id] !== day) { p.redeemed[o.id] = day; set(PREFS, p); S.offerEvent(o.id, 'redeem'); }
    const box = document.createElement('div');
    box.id = 'offerRedeem'; box.setAttribute('role', 'dialog');
    box.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#0E3B43;color:#E8DCC4;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px;text-align:center;gap:10px';
    box.innerHTML = '<div style="font-size:15px;opacity:.85">عرض من تطبيق «حياتي» 📱</div>' +
      '<div data-noi18n style="font-size:18px;font-weight:700"><bdi>' + h(o.partner) + '</bdi></div>' +
      (o.discount ? '<div data-noi18n style="font-size:40px;font-weight:700;color:#FF6B4A;line-height:1.2"><bdi>' + h(o.discount) + '</bdi></div>' : '') +
      (o.code ? '<div style="font-size:14px;opacity:.85">الكود</div><div dir="ltr" data-noi18n style="font:700 34px/1.2 ui-monospace,Menlo,monospace;letter-spacing:3px;background:#fff;color:#0E3B43;padding:10px 22px;border-radius:14px">' + h(o.code) + '</div>' : '') +
      '<div id="orClock" dir="ltr" style="font-size:16px;margin-top:6px;opacity:.9"></div>' +
      '<div style="font-size:13px;opacity:.75;max-width:300px">وريها للكاشير أو للحملة. الخصم حسب شروط المحل.</div>' +
      '<div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap;justify-content:center">' + (o.whatsapp ? '<button type="button" class="btn" style="background:#fff;color:#0E3B43" data-or-wa>💬 أرسل للمحل</button>' : '') +
      '<button type="button" class="btn" style="background:rgba(255,255,255,.16);color:#fff" data-or-close>رجوع</button></div>';
    const tick = () => { const d = new Date(), c = box.querySelector('#orClock'); if (c) c.textContent = d.toLocaleDateString('en-GB') + ' · ' + d.toLocaleTimeString('en-GB'); };
    tick(); const iv = setInterval(tick, 1000);
    const close = () => { clearInterval(iv); box.remove(); };
    box.querySelector('[data-or-close]').onclick = close;
    const w = box.querySelector('[data-or-wa]'); if (w) w.onclick = () => { S.offerEvent(o.id, 'click'); open(wa(o)); };
    (document.querySelector('#sheet[open]') || document.body).appendChild(box);
    return box;
  }

  // يحط عرض واحد بآخر النافذة المفتوحة
  function inject(section, ctx, root) {
    if (prefs().off || !(S.status && S.status.configured)) return null;
    root = root || document.getElementById('sheetBody'); if (!root || root.querySelector('.offer-card')) return null;
    const o = pick(section, ctx); if (!o) return null;
    const del = root.querySelector('.btn.danger');   // فوق زر الحذف لو موجود
    if (del) del.insertAdjacentHTML('beforebegin', card(o)); else root.insertAdjacentHTML('beforeend', card(o));
    const el = root.querySelector('.offer-card'); bind(el, o); seen(o);
    return o;
  }

  // ---------- وين تطلع ----------
  // صفحة الرحلة (قبل السفر بس): حسب الوجهة والتاريخ. العمرة لها قسمها
  if (E.TravelPlus) {
    const prevMount = E.TravelPlus.mount;
    E.TravelPlus.mount = function (root, t) {
      prevMount.apply(this, arguments);
      const ph = E.Travel && E.Travel.countdown ? E.Travel.countdown(t).phase : 'before';
      if (ph === 'before' || ph === 'none') inject(t.kind === 'umrah' ? 'umrah' : 'travel', { city: t.city || null, date: t.go || null }, root);
    };
  }
  // النوافذ اللي من غير الرحلة: نعرفها من عنوانها
  const BY_TITLE = { '🌴 وين نروح الويكند؟': 'weekend', '🔧 صيانة السيارة': 'car', '👨‍👩‍👧 عيالك': 'kids', '🌙 رمضان': 'ramadan' };
  const prevOpen = A.openSheet;
  A.openSheet = function (opts) {
    const r = prevOpen.apply(this, arguments);
    const sec = opts && BY_TITLE[opts.title];
    if (sec) setTimeout(() => inject(sec, {}), 60);
    return r;
  };

  // ---------- الإعدادات: «📊 الإحصائيات والعروض» ----------
  const prevExtra = E.settingsExtra;
  E.settingsExtra = function () {
    const off = prefs().off, u = E.Usage ? E.Usage.read() : { off: true };
    return (prevExtra ? prevExtra.apply(this, arguments) : '') + '<div class="group-title">📊 الإحصائيات والعروض</div><div class="menu">' +
      '<button data-set="offers-toggle"><div class="ico" style="' + A.tint('#B45309') + '">🏷️</div><div style="flex:1;min-width:0"><b>عروض الشركاء</b><small>' + (off ? 'طافية' : 'شغّالة · تتختار على جهازك') + '</small></div></button>' +
      (E.Usage ? '<button data-set="usage-toggle"><div class="ico" style="' + A.tint('#13636B') + '">📊</div><div style="flex:1;min-width:0"><b>إحصائيات بدون هوية</b><small>' + (u.off ? 'طافية' : 'شغّالة · نعدّ الأجهزة بس، بدون أي معرّف') + '</small></div></button>' : '') + '</div>';
  };
  const prevSet = E.settingsAction;
  E.settingsAction = async function (act) {
    if (act === 'offers-toggle') { const p = prefs(); p.off = !p.off; set(PREFS, p); A.toast(p.off ? 'العروض طافية' : 'العروض شغّالة'); A.closeSheet(); return true; }
    if (act === 'usage-toggle' && E.Usage) { const u = E.Usage.read(); u.off = !u.off; E.Usage.write(u); A.toast(u.off ? 'الإحصائيات طافية' : 'الإحصائيات شغّالة'); A.closeSheet(); return true; }
    return prevSet ? prevSet.apply(this, arguments) : false;
  };

  setTimeout(() => { refresh(); }, 6000);
  E.Offers = { refresh, pick, inject, card, redeem, prefs, CACHE, PREFS, WEEK_MAX };
})();
