import { paint, rise } from './_kit.js';
// HOOK: الغسيل العادي يخدش طلاءك
MOTION.scene({ id: 'w1',
  setup(ctx) { const r = ctx.rng('sw'); this.sw = Array.from({ length: 34 }, () => ({ x: r.range(80, 1000), y: r.range(250, 1650), r: r.range(40, 170), a0: r.range(0, 6.28), sp: r.range(1.2, 2.6), d: r.range(.3, 1.2), w: r.range(1.2, 2.8) })); },
  draw(t, lt, ctx) {
    const { X, P, at } = ctx; const S = ctx.scene.start;
    paint(ctx, t, at(lt, 0, 3, 'linear') * .9, .8);
    // swirl marks appear (the problem)
    for (const s of this.sw) { const k = at(lt, s.d, s.d + .7, 'cubicOut'); if (k <= 0) continue;
      X.save(); X.globalAlpha = .28 * k; X.strokeStyle = '#E8E4DA'; X.lineWidth = s.w; X.beginPath(); X.arc(s.x, s.y, s.r, s.a0, s.a0 + s.sp * k); X.stroke(); X.restore(); }
    rise(ctx, t, 'الغسيل العادي', 540, 760, S + .15, { size: 128, color: P.ink });
    const slam = S + .85, [dx, dy] = ctx.MK.shake(t, slam, 12), k = at(t, slam, slam + .25, 'expoOut');
    if (k > 0) { X.save(); X.translate(dx, dy); ctx.text(X, 'يخدش طلاءك', 540, 960, { family: 'display', weight: 900, size: 160 * (1.2 - .2 * k), color: P.acc, alpha: k, maxWidth: 940 }); X.restore(); }
    rise(ctx, t, 'وأنت ما تدري…', 540, 1130, S + 1.6, { size: 64, weight: 700, family: 'body', color: P.mut });
  } });
