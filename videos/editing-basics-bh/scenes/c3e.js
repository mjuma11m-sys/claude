// rule: one camera move per shot
import '../lib.js'; const BH = globalThis.BH;
MOTION.scene({ id: 'c3e',
  draw(t, lt, ctx) {
    const { X, P, at } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    ctx.text(X, 'القاعدة', 540, 640, { family: 'body', weight: 700, size: 44, color: P.mut, alpha: at(lt, 0, .3) });
    const k = at(lt, .1, .5, 'expoOut');
    ctx.text(X, 'حركة وحدة بس', 540, 840 + (1 - k) * 50, { family: 'display', weight: 900, size: 130, color: P.acc, alpha: k });
    BH.words(ctx, lt, 'بكل لقطة', 540, 990, { family: 'display', weight: 900, size: 110, t0: .45 });
    BH.words(ctx, lt, 'لا تقرّب وتلف وتمسح بنفس الوقت', 540, 1200, { size: 52, t0: 1.1, color: P.mut, hi: [0], hiColor: P.clay });
  } });
