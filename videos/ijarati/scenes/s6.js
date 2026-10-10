import { bg, rise, rr, tag } from './_kit.js';
// FEATURE 4: طلبات الصيانة خطوة بخطوة
MOTION.scene({ id: 's6',
  draw(t, lt, ctx) {
    const { X, P, at } = ctx; const S = ctx.scene.start;
    bg(ctx, t, 0.55);
    tag(ctx, t, 'ميزة 4', 540, 250, S + .05);
    rise(ctx, t, 'طلبات الصيانة', 540, 420, S + .15, { size: 112, color: P.ink });
    rise(ctx, t, 'تحت عينك خطوة بخطوة', 540, 520, S + .3, { size: 60, weight: 700, family: 'body', color: P.mut });
    const steps = [['طلب جديد', .35], ['العامل بالطريق', .85], ['تم الإصلاح', 1.35]], cx = 840, y0 = 720, gap = 260;
    // track
    X.save(); X.strokeStyle = 'rgba(135,150,171,.3)'; X.lineWidth = 10; X.lineCap = 'round'; X.beginPath(); X.moveTo(cx, y0); X.lineTo(cx, y0 + gap * 2); X.stroke(); X.restore();
    const lk = at(lt, .35, 1.35, 'cubicInOut');
    if (lk > 0) { X.save(); X.strokeStyle = P.acc; X.lineWidth = 10; X.lineCap = 'round'; X.beginPath(); X.moveTo(cx, y0); X.lineTo(cx, y0 + gap * 2 * lk); X.stroke(); X.restore(); }
    steps.forEach(([label, s], i) => {
      const y = y0 + i * gap, k = at(lt, s, s + .25, 'expoOut'), last = i === 2;
      X.save(); X.translate(cx, y); X.scale(.94 + .06 * k, .94 + .06 * k);
      X.fillStyle = k > 0 ? P.acc : P.bg; X.strokeStyle = k > 0 ? P.acc : 'rgba(135,150,171,.6)'; X.lineWidth = 6;
      X.beginPath(); X.arc(0, 0, last ? 58 : 44, 0, 7); X.fill(); X.stroke();
      if (k > 0) { X.strokeStyle = P.bg; X.lineWidth = last ? 11 : 9; X.lineCap = 'round'; X.lineJoin = 'round'; X.beginPath();
        const m = last ? 1.3 : 1; X.moveTo(-18 * m, 0); X.lineTo(-5 * m, 14 * m); X.lineTo(20 * m, -14 * m); X.stroke(); }
      X.restore();
      const tk = at(lt, s + .05, s + .35, 'expoOut');
      ctx.text(X, label, cx - 100, y + 22 + (1 - tk) * 30, { family: last ? 'display' : 'body', weight: last ? 900 : 700, size: last ? 78 : 60, color: last ? P.acc : P.ink, align: 'right', alpha: tk });
    });
    ctx.MK.burst(t, { s: S + 1.4, cx: cx, cy: y0 + gap * 2, spread: 200, colors: [P.acc, P.ink, P.acc] });
  } });
