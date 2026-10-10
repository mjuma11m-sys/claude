// s5 — outro: «حلّلها قبل أن تدخل أي سوق» + five-item checklist
const ITEMS = ['المنافسة الحالية', 'الداخلون الجدد', 'قوة الموردين', 'قوة المشترين', 'تهديد البدائل'];
MOTION.scene({ id: 's5',
  draw(t, lt, ctx) {
    const { X, P, at } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);

    const w0 = ctx.wordTime('l9', 0), k0 = at(t, w0.s - .12, w0.s + .25, 'expoOut');
    ctx.text(X, 'حلّلها', 540, 330 + (1 - k0) * 60, { family: 'display', weight: 900, size: 160, color: P.acc, alpha: k0 });
    const L = ctx.text.layout(X, 'قبل أن تدخل أي سوق', { family: 'body', weight: 700, size: 66 });
    ctx.text.drawLayout(X, L, 540, 470, { color: P.ink, perWord: i => { const w = ctx.wordTime('l9', 1 + i), k = at(t, w.s - .08, w.s + .2, 'expoOut'); return { alpha: k, dy: (1 - k) * 28 }; } });

    // checklist
    const t0 = ctx.lineSpan('l9').s + .3;
    ITEMS.forEach((s, i) => {
      const y = 660 + i * 118, k = at(t, t0 + i * .07, t0 + i * .07 + .3, 'expoOut'); if (k <= 0) return;
      X.save(); X.globalAlpha = k; X.translate((1 - k) * -40, 0);
      X.fillStyle = 'rgba(244,241,234,0.05)'; X.beginPath(); X.roundRect(150, y - 50, 780, 92, 22); X.fill();
      X.strokeStyle = P.acc; X.lineWidth = 4; X.beginPath(); X.roundRect(830, y - 30, 52, 52, 12); X.stroke();
      X.restore();
      ctx.text(X, String(i + 1), 210, y + 16, { family: 'num', weight: 800, size: 40, color: P.mut, alpha: k });
      ctx.text(X, s, 800, y + 16, { family: 'body', weight: 700, size: 50, color: P.ink, align: 'right', alpha: k });
      const kt = at(t, t0 + .55 + i * .22, t0 + .75 + i * .22, 'cubicOut');
      if (kt > 0) ctx.drawPath(X, [[870, y - 6], [856, y + 10], [842, y - 2]].map(([x, yy]) => [x, yy]).reverse(), kt, { width: 7, color: P.acc, cap: 'round' });
    });

    const kf = at(t, t0 + 1.8, t0 + 2.2, 'expoOut');
    ctx.text(X, "Porter's Five Forces", 540, 1335, { family: 'num', weight: 700, size: 40, color: P.mut, alpha: kf, dir: 'ltr' });
    X.save(); X.globalAlpha = kf; X.strokeStyle = P.acc; X.lineWidth = 3; X.beginPath(); X.roundRect(300, 1385, 480, 84, 42); X.stroke(); X.restore();
    ctx.text(X, 'احفظه للمراجعة', 540, 1440, { family: 'body', weight: 700, size: 44, color: P.acc, alpha: kf });
  } });
