// Split screen: before / after side by side
import '../lib.js'; const BH = globalThis.BH;
MOTION.scene({ id: 'c2d',
  draw(t, lt, ctx) {
    const { X, P, at, E } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    BH.chip(ctx, lt, 2, 'الانتقالات'); BH.head(ctx, lt, 'Split Screen', 'تقسيم الشاشة');
    const kf = BH.frame(ctx, lt), ks = at(lt, .7, 1.2, 'expoOut');
    BH.clip(X); X.globalAlpha = kf;
    X.fillStyle = '#1C232E'; X.fillRect(150, 500, 780, 660);
    const gap = 10 * ks;
    // right half (RTL first) = قبل, left half = بعد
    X.fillStyle = '#232A35'; X.fillRect(540 + gap, 500, 390, 660); X.fillStyle = '#1A2A22'; X.fillRect(150, 500, 390 - gap, 660);
    const r = ctx.rng('mess');
    for (let i = 0; i < 5; i++) { const h = r.range(80, 300), k = at(lt, 1.2 + i * .06, 1.5 + i * .06, 'expoOut'); X.fillStyle = P.mut; X.fillRect(600 + i * 62, 1100 - h * k, 40, h * k); }
    for (let i = 0; i < 5; i++) { const h = 90 + i * 55, k = at(lt, 1.6 + i * .06, 1.9 + i * .06, 'expoOut'); X.fillStyle = P.hi; X.fillRect(200 + i * 62, 1100 - h * k, 40, h * k); }
    X.restore(); X.globalAlpha = 1;
    ctx.text(X, 'قبل', 735, 590, { family: 'display', weight: 900, size: 54, color: P.mut, alpha: ks });
    ctx.text(X, 'بعد', 345, 590, { family: 'display', weight: 900, size: 54, color: P.hi, alpha: ks });
    BH.explain(ctx, lt, 'للمقارنة: قبل وبعد', 'أو شيئين يصيرون بنفس الوقت', { t0: 1.9, hi1: [1, 3] });
  } });
