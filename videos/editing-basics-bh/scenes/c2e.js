// rule: if the transition is louder than the shot, simplify it
import '../lib.js'; const BH = globalThis.BH;
MOTION.scene({ id: 'c2e',
  draw(t, lt, ctx) {
    const { X, P, at } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    ctx.text(X, 'القاعدة', 540, 600, { family: 'body', weight: 700, size: 44, color: P.mut, alpha: at(lt, 0, .3) });
    BH.words(ctx, lt, 'إذا الانتقال لفت النظر أكثر من اللقطة', 540, 760, { family: 'display', weight: 900, size: 86, t0: .15, st: .09, maxWidth: 880 });
    const k = at(lt, 1.3, 1.7, 'expoOut');
    ctx.text(X, 'بسّطه', 540, 1180 + (1 - k) * 50, { family: 'display', weight: 900, size: 210, color: P.acc, alpha: k });
    ctx.drawPath(X, [[760, 1230], [540, 1240], [320, 1228]], at(lt, 1.6, 2.1, 'cubicInOut'), { width: 10, color: P.acc, cap: 'round' });
  } });
