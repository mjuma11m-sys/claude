// «تقرير الشهر كصورة» (DW-041): بطاقة 1080×1350 تنرسم بالجوال (canvas) من أرقام الشهر، وتحفظها أو تشاركها.
// الخصوصية: المبالغ مخفية افتراضياً (نِسَب بس)، وما فيها أسماء محلات ولا أشخاص، والصورة ما ترتفع لأي مكان.
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const W = 1080, H = 1350;
  const en = () => !!(window.HayatiLang && HayatiLang.lang === 'en');
  const tr = (s) => (en() && HayatiLang.tr ? HayatiLang.tr(s) : s);

  // الأرقام اللي تطلع بالصورة (بدون أسماء محلات)
  function data(month) {
    const prevKey = A.shiftKey(month, -1), rg = A.monthRange(month);
    const cur = A.txInMonth(month), prev = A.txInMonth(prevKey);
    const a = A.sums(cur), b = A.sums(prev);
    const isNow = month === A.monthKey(new Date());
    const days = Math.max(1, A.daysBetween(rg.start, isNow ? new Date() : new Date(rg.end - 1)) + 1);
    const exps = cur.filter((t) => t.kind === 'expense');
    let noSpend = 0;
    for (let i = 0; i < days; i++) {
      const d = new Date(rg.start.getFullYear(), rg.start.getMonth(), rg.start.getDate() + i);
      if (!exps.some((t) => A.sameDay(new Date(t.occurred_at), d))) noSpend++;
    }
    const by = {};
    for (const t of exps) by[t.category || 'أخرى'] = (by[t.category || 'أخرى'] || 0) + Number(t.amount);
    const cats = Object.entries(by).sort((p, q) => q[1] - p[1]).slice(0, 4)
      .map(([c, v]) => ({ name: c, sum: v, pct: a.exp ? Math.round((v / a.exp) * 100) : 0, color: A.catMeta(c, 'expense')[1] }));
    const budget = Number(A.st.settings.budget) || 0;
    return {
      label: A.monthLabel(month), spent: a.exp, income: a.inc, avg: a.exp / days, days, noSpend, cats,
      diff: b.exp ? Math.round(((a.exp - b.exp) / b.exp) * 100) : null,
      budgetPct: budget ? Math.round((a.exp / budget) * 100) : null,
    };
  }

  async function draw(month, showAmounts) {
    const d = data(month), E2 = en();
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) { /* تجاهل */ }
    const font = getComputedStyle(document.body).fontFamily || 'sans-serif';
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.direction = E2 ? 'ltr' : 'rtl';
    const start = E2 ? 90 : W - 90, end = E2 ? W - 90 : 90;
    const alignS = E2 ? 'left' : 'right', alignE = E2 ? 'right' : 'left';
    const F = (w, px) => w + ' ' + px + 'px ' + font;
    const txt = (s, X, Y, f, col, al, max) => { x.font = f; x.fillStyle = col; x.textAlign = al; x.fillText(s, X, Y, max || W - 180); };
    const money = (n) => A.fmt(n) + ' ' + (window.HayatiCur ? HayatiCur.sym() : E2 ? 'BHD' : 'د.ب');
    const ltr = (s) => '\u2066' + s + '\u2069';   // رقم ثابت الاتجاه داخل نص عربي

    // الخلفية
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0f3d3e'); g.addColorStop(1, '#13636B');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(255,255,255,.06)'; x.beginPath(); x.arc(E2 ? W - 60 : 60, 160, 260, 0, Math.PI * 2); x.fill();

    // العنوان
    txt(tr('تقرير الشهر'), start, 150, F('600', 40), 'rgba(255,255,255,.75)', alignS);
    txt(tr(d.label), start, 225, F('700', 64), '#fff', alignS);

    // الرقم الكبير
    txt(tr('صرفت'), start, 360, F('500', 38), 'rgba(255,255,255,.75)', alignS);
    let big;
    if (showAmounts) big = money(d.spent);
    else big = d.budgetPct != null ? d.budgetPct + '%' : (d.diff != null ? (d.diff > 0 ? '+' : '') + d.diff + '%' : '—');
    txt(big, start, 470, F('800', 110), '#fff', alignS);
    let sub = '';
    if (!showAmounts && d.budgetPct != null) sub = tr('من الميزانية');
    const bigIsDiff = !showAmounts && d.budgetPct == null;
    if (d.diff != null && !bigIsDiff) sub += (sub ? ' · ' : '') + (d.diff > 0 ? '▲ ' : d.diff < 0 ? '▼ ' : '') + ltr(Math.abs(d.diff) + '%') + ' ' + tr('عن الشهر اللي قبله');
    if (sub) txt(sub, start, 535, F('500', 34), 'rgba(255,255,255,.8)', alignS);

    // التصنيفات
    txt(tr('وين راحت فلوسك'), start, 650, F('700', 40), '#fff', alignS);
    let y = 720;
    for (const k of d.cats) {
      txt(tr(k.name), start, y, F('600', 36), '#fff', alignS, W - 420);
      txt(showAmounts ? A.fmt(k.sum) : k.pct + '%', end, y, F('700', 36), '#fff', alignE);
      const bw = W - 180;
      x.fillStyle = 'rgba(255,255,255,.15)'; x.fillRect(90, y + 20, bw, 14);
      x.fillStyle = k.color; const fw = Math.max(8, bw * k.pct / 100);
      x.fillRect(E2 ? 90 : 90 + bw - fw, y + 20, fw, 14);
      y += 100;
    }
    if (!d.cats.length) { txt(tr('ما فيه مصاريف هالشهر'), start, y, F('500', 34), 'rgba(255,255,255,.8)', alignS); y += 100; }

    // سطرين تحت
    const boxY = 1190;
    x.fillStyle = 'rgba(255,255,255,.1)';
    x.fillRect(90, boxY - 70, (W - 200) / 2, 120); x.fillRect(110 + (W - 200) / 2, boxY - 70, (W - 200) / 2, 120);
    const c1 = E2 ? 90 + (W - 200) / 4 : W - 90 - (W - 200) / 4, c2 = E2 ? W - 90 - (W - 200) / 4 : 90 + (W - 200) / 4;
    txt(ltr(d.noSpend + ' / ' + d.days), c1, boxY - 5, F('800', 44), '#fff', 'center', (W - 200) / 2 - 40);
    txt(tr('أيام بدون صرف'), c1, boxY + 35, F('500', 28), 'rgba(255,255,255,.8)', 'center');
    txt(showAmounts ? A.fmt(d.avg) : (d.cats[0] ? tr(d.cats[0].name) : '—'), c2, boxY - 5, F('800', 44), '#fff', 'center', (W - 200) / 2 - 40);
    txt(showAmounts ? tr('متوسط اليوم (د.ب)') : tr('أكثر تصنيف'), c2, boxY + 35, F('500', 28), 'rgba(255,255,255,.8)', 'center');

    txt(tr('حياتي'), W / 2, H - 50, F('700', 32), 'rgba(255,255,255,.6)', 'center');
    return c;
  }

  const b64 = (c) => c.toDataURL('image/png').split(',')[1];

  async function save(canvas, month) {
    const name = 'hayati-report-' + month + '.png';
    const N = window.HayatiNative;
    if (N && N.saveImage) return N.saveImage(name, b64(canvas));
    const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/png'));
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return true;
  }

  function sheet(month) {
    let canvas = null;
    A.openSheet({
      title: '🖼️ صورة التقرير',
      saveLabel: window.HayatiNative ? 'شارك' : 'احفظ الصورة',
      body: '<div id="riBox" style="border-radius:16px;overflow:hidden;aspect-ratio:4/5;background:#13636B"><img id="riImg" alt="" style="width:100%;height:100%;display:block"></div>' +
        '<label style="display:flex;gap:10px;align-items:center;margin:12px 0 6px"><input id="riAmounts" type="checkbox"><span>اعرض المبالغ</span></label>' +
        '<p class="small muted" style="margin:0">المبالغ مخفية افتراضياً (نِسَب بس)، وما فيها أسماء محلات. الصورة تنرسم بجوالك وما ترتفع لأي مكان.</p>',
      async mount(root) {
        const box = root.querySelector('#riAmounts');
        const redraw = async () => { canvas = await draw(month, box.checked); root.querySelector('#riImg').src = canvas.toDataURL('image/png'); };
        box.onchange = redraw;
        await redraw();
      },
      async onSave() {
        if (!canvas) return false;
        const ok = await save(canvas, month);
        if (ok) A.toast(window.HayatiNative ? 'تمام ✓' : 'انحفظت الصورة ✓');
        return ok !== false;
      },
    });
  }

  E.reportExtra = () => '<button class="btn ghost block" type="button" id="reportImg" style="margin-bottom:10px">🖼️ صورة التقرير</button>';
  E.reportMount = (root, month) => {
    const b = root.querySelector('#reportImg');
    if (b) b.onclick = () => { A.closeSheet(); setTimeout(() => sheet(month), 280); };
  };
  E.ReportImage = { data, draw, sheet };
})();
