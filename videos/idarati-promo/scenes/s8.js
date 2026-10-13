import { bg, rise } from './_kit.js';
// الإغلاق: الشعار + قيد التطوير
MOTION.scene({ id: 's8',
  draw(t, lt, ctx) {
    const { X, P, at, lerp } = ctx; const S = ctx.scene.start;
    bg(ctx, t, 0.42);
    const k = ctx.E.springK(at(lt, 0.1, 0.9, 'linear'));
    const sym = ctx.img('sym');
    if (sym) { const s = 380 * k; X.save(); X.translate(540, 720); X.rotate((1 - k) * 0.8 + 0.03 * Math.sin(lt * 1.5)); X.drawImage(sym, -s / 2, -s / 2, s, s); X.restore(); }
    rise(ctx, t, 'إداراتي', 540, 1110, S + 0.45, { size: 170, color: P.ink });
    const tk = at(lt, 1.0, 1.4, 'expoOut');
    if (tk > 0) {
      X.save(); X.globalAlpha = tk; X.strokeStyle = P.acc; X.lineWidth = 3; X.beginPath(); X.roundRect(540 - 300, 1240 - 44 + (1 - tk) * 20, 600, 88, 44); X.stroke(); X.restore();
      ctx.text(X, 'قيد التطوير · نسخة تجريبية', 540, 1256 + (1 - tk) * 20, { family: 'body', weight: 700, size: 40, color: P.acc, alpha: tk });
    }
    ctx.text(X, '* لقطات ببيانات تجريبية', 540, 1480, { family: 'body', weight: 400, size: 30, color: P.mut, alpha: at(lt, 1.3, 1.6) });
  } });
