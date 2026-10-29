// DW-093: «حياتي 2026» — سنتك بصورة ستوري (1080×1920) تنرسم بالجوال من بياناتك وتشاركها.
// الخصوصية: المبالغ وأسماء الأماكن مخفية افتراضياً، والصحة والعبادات ما تدخل أبداً، والصورة ما ترتفع لأي مكان.
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { st } = A;
  const W = 1080, H = 1920;
  const en = () => !!(window.HayatiLang && HayatiLang.lang === 'en');
  const tr = (s) => (en() && HayatiLang.tr ? HayatiLang.tr(s) : s);
  const dk = (d) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();

  function data(y) {
    const now = new Date();
    const inY = (iso) => iso && new Date(iso).getFullYear() === y;
    const tx = (st.transactions || []).filter((t) => inY(t.occurred_at));
    const exps = tx.filter((t) => t.kind === 'expense');
    const s = A.sums(tx);
    // أيام بدون صرف + أطول سلسلة (من أول عملية بالسنة لين اليوم أو آخر السنة)
    const spent = new Set(exps.map((t) => dk(new Date(t.occurred_at))));
    const first = tx.length ? new Date(Math.min(...tx.map((t) => new Date(t.occurred_at).getTime()))) : null;
    const last = y === now.getFullYear() ? now : new Date(y, 11, 31);
    let days = 0, noSpend = 0, run = 0, streak = 0;
    if (first) for (let d = new Date(first.getFullYear(), first.getMonth(), first.getDate()); d <= last; d.setDate(d.getDate() + 1)) {
      days++;
      if (spent.has(dk(d))) run = 0; else { noSpend++; run++; streak = Math.max(streak, run); }
    }
    const by = {}, visits = {}, months = Array(12).fill(0);
    for (const t of exps) {
      const v = Number(t.amount) || 0;
      by[t.category || 'أخرى'] = (by[t.category || 'أخرى'] || 0) + v;
      if (t.merchant) visits[t.merchant] = (visits[t.merchant] || 0) + 1;
      months[new Date(t.occurred_at).getMonth()] += v;
    }
    const cat = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
    const place = Object.entries(visits).sort((a, b) => b[1] - a[1])[0];
    const hiM = months.some((v) => v > 0) ? months.indexOf(Math.max(...months)) : -1;
    const tasksDone = (st.tasks || []).filter((t) => t.done && inY(t.updated_at || t.due_at)).length;
    return {
      y, count: tx.length, exp: s.exp, inc: s.inc, saved: s.inc - s.exp,
      days, noSpend, streak,
      cat: cat ? { name: cat[0], pct: s.exp ? Math.round((cat[1] / s.exp) * 100) : 0, color: A.catMeta(cat[0], 'expense')[1] } : null,
      place: place ? { name: place[0], n: place[1] } : null,
      month: hiM, tasksDone, courses: (st.courses || []).length,
    };
  }

  async function draw(y, details) {
    const d = data(y), E2 = en();
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) { /* تجاهل */ }
    const font = getComputedStyle(document.body).fontFamily || 'sans-serif';
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.direction = E2 ? 'ltr' : 'rtl';
    const F = (w, px) => w + ' ' + px + 'px ' + font;
    const txt = (s, X, Y, f, col, al, max) => { x.font = f; x.fillStyle = col; x.textAlign = al || 'center'; x.fillText(s, X, Y, max || W - 160); };
    const ltr = (s) => '⁦' + s + '⁩';
    const money = (n) => ltr(A.fmt(n)) + ' ' + (window.HayatiCur ? HayatiCur.sym() : E2 ? 'BHD' : 'د.ب');

    const g = x.createLinearGradient(0, 0, W * 0.4, H); g.addColorStop(0, '#0A1A1E'); g.addColorStop(0.45, '#0E3B43'); g.addColorStop(1, '#13636B');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(255,107,74,.14)'; x.beginPath(); x.arc(W - 40, 240, 300, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(232,220,196,.06)'; x.beginPath(); x.arc(80, H - 260, 340, 0, Math.PI * 2); x.fill();

    txt(tr('سنتي مع'), W / 2, 210, F('600', 44), 'rgba(232,220,196,.8)');
    txt(tr('حياتي') + ' ' + ltr(String(d.y)), W / 2, 320, F('800', 110), '#fff');

    // بطاقات الأرقام
    const tiles = [];
    tiles.push([ltr(String(d.count)), tr('عملية سجّلتها')]);
    tiles.push([ltr(String(d.noSpend)), tr('يوم بدون صرف')]);
    if (d.streak >= 2) tiles.push([ltr(String(d.streak)), tr('أطول سلسلة بدون صرف (يوم)')]);
    if (d.cat) tiles.push([ltr(d.cat.pct + '%'), tr('راحت على') + ' ' + tr(d.cat.name)]);
    if (d.month >= 0) tiles.push([tr(A.MONTHS[d.month]), tr('أغلى شهر')]);
    if (d.tasksDone) tiles.push([ltr(String(d.tasksDone)), tr('مهمة خلّصتها')]);
    if (details) {
      tiles.push([money(d.exp), tr('صرفت')]);
      if (d.inc) tiles.push([money(Math.abs(d.saved)), d.saved >= 0 ? tr('وفّرت') : tr('صرفت فوق دخلك')]);
      if (d.place) tiles.push([d.place.name, tr('أكثر مكان رحته') + ' · ' + ltr(d.place.n + '×')]);
    }
    const shown = tiles.slice(0, 8);
    const colW = (W - 200) / 2, rowH = 250, top = 470;
    shown.forEach((t, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const X = E2 ? 80 + col * (colW + 40) : W - 80 - colW - col * (colW + 40), Y = top + row * (rowH + 30);
      x.fillStyle = i === 0 ? 'rgba(255,107,74,.92)' : 'rgba(255,255,255,.09)';
      x.beginPath(); if (x.roundRect) x.roundRect(X, Y, colW, rowH, 36); else x.rect(X, Y, colW, rowH); x.fill();
      txt(t[0], X + colW / 2, Y + 130, F('800', String(t[0]).length > 9 ? 52 : 84), '#fff', 'center', colW - 40);
      txt(t[1], X + colW / 2, Y + 195, F('500', 32), 'rgba(255,255,255,.85)', 'center', colW - 40);
    });
    if (!d.count) txt(tr('سجّل مصاريفك وبتطلع سنتك هني'), W / 2, top + 120, F('600', 44), '#fff');

    txt(tr('مصاريفك ودراستك وصلاتك بمكان واحد'), W / 2, H - 200, F('500', 36), 'rgba(232,220,196,.85)');
    txt(tr('حياتي') + ' · App Store', W / 2, H - 130, F('700', 40), '#FF6B4A');
    return c;
  }

  const b64 = (c) => c.toDataURL('image/png').split(',')[1];
  async function save(canvas, y) {
    const name = 'hayati-' + y + '.png';
    const N = window.HayatiNative;
    if (N && N.saveImage) return N.saveImage(name, b64(canvas));
    const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/png'));
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return true;
  }

  function sheet(y) {
    y = y || new Date().getFullYear();
    let canvas = null;
    A.openSheet({
      title: '🎁 حياتي ' + y,
      saveLabel: window.HayatiNative ? 'شارك' : 'احفظ الصورة',
      body: '<div style="border-radius:18px;overflow:hidden;aspect-ratio:9/16;max-height:62vh;margin:0 auto;background:#0E3B43"><img id="wrImg" alt="" style="width:100%;height:100%;display:block;object-fit:contain"></div>' +
        '<label style="display:flex;gap:10px;align-items:center;margin:12px 0 6px"><input id="wrDetails" type="checkbox"><span>اعرض المبالغ والأماكن</span></label>' +
        '<p class="small muted" style="margin:0">المبالغ وأسماء الأماكن مخفية افتراضياً. الصحة والعبادات ما تدخل الصورة. تنرسم بجوالك وما ترتفع لأي مكان.</p>',
      async mount(root) {
        const box = root.querySelector('#wrDetails');
        const redraw = async () => { canvas = await draw(y, box.checked); const im = root.querySelector('#wrImg'); if (im) im.src = canvas.toDataURL('image/png'); };
        box.onchange = redraw;
        await redraw();
      },
      async onSave() {
        if (!canvas) return false;
        const ok = await save(canvas, y);
        if (ok) A.toast(window.HayatiNative ? 'تمام ✓' : 'انحفظت الصورة ✓');
        return ok !== false;
      },
    });
  }

  const prevMoney = E.moneyActions;
  E.moneyActions = (...a) => (prevMoney ? prevMoney(...a) : '') + '<button class="btn ghost block" style="margin:0 0 4px" data-action="wrapped">🎁 حياتي ' + new Date().getFullYear() + '</button>';
  const prevAct = E.action;
  E.action = (name, el, e) => (name === 'wrapped' ? sheet() : prevAct ? prevAct(name, el, e) : undefined);
  E.Wrapped = { data, draw, sheet };
})();
