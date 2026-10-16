import { bg, rise } from './_kit.js';
// المشكلة: ثلاث أسئلة، كل سؤال بضربة
MOTION.scene({ id: 's2',
  draw(t, lt, ctx) {
    const { X, P, at } = ctx; const S = ctx.scene.start;
    bg(ctx, t, 0.4);
    const qs = ['مين متأخر؟', 'من أي شهر؟', 'وين الإيصال؟'];
    qs.forEach((q, i) => {
      const s = S + 0.1 + i * 0.8, y = 640 + i * 290;
      const shake = i === 2 ? 0 : Math.sin(lt * 60) * 8 * (at(t, s + 0.3, s + 0.35) - at(t, s + 0.45, s + 0.55));
      X.save(); X.translate(shake, 0);
      rise(ctx, t, q, 540, y, s, { size: 120, color: P.ink, stagger: 0.06 });
      X.restore();
      ctx.drawPath(X, [[860, y + 40], [540, y + 52], [220, y + 38]], at(t, s + 0.25, s + 0.55, 'expoOut'), { width: 12, color: P.clay, cap: 'round' });
    });
    const fade = at(lt, 2.75, 3.0);
    if (fade > 0) { X.fillStyle = `rgba(20,33,58,${fade})`; X.fillRect(0, 0, ctx.W, ctx.H); }
  } });
