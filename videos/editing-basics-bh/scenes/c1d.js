// On beat: cuts snap to beat markers, playhead flashes on each cut
import '../lib.js'; const BH = globalThis.BH;
const N = 9, X0 = 890, STEP = 87.5, CUTS = [2, 4, 5, 7];
MOTION.scene({ id: 'c1d',
  draw(t, lt, ctx) {
    const { X, P, at } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    BH.chip(ctx, lt, 1, 'أساسيات الريل'); BH.head(ctx, lt, 'On Beat', 'القص على الإيقاع');
    const kf = BH.frame(ctx, lt);
    const ph = ctx.prog(lt, .6, 3.8), px = X0 - (N - 1) * STEP * ph;
    X.save(); X.globalAlpha = kf;
    for (let i = 0; i < N; i++) {                                   // beat markers (RTL)
      const bx = X0 - i * STEP, hit = Math.exp(-Math.max(0, (X0 - px) / STEP - i) * 3) * ((X0 - px) / STEP >= i ? 1 : 0);
      X.fillStyle = hit > .05 ? P.acc : P.mut; X.globalAlpha = kf * (.5 + .5 * hit);
      X.beginPath(); X.arc(bx, 700, 10 + 10 * hit, 0, 6.283); X.fill();
    }
    X.globalAlpha = kf;
    const bounds = [0, ...CUTS, N - 1];                              // clip blocks between cuts
    for (let b = 0; b < bounds.length - 1; b++) {
      const xa = X0 - bounds[b] * STEP, xb = X0 - bounds[b + 1] * STEP, on = px <= xa && px > xb;
      X.fillStyle = on ? P.acc : '#2A3340'; X.beginPath(); X.roundRect(xb + 4, 800, xa - xb - 8, 110, 14); X.fill();
      ctx.text(X, String(b + 1), (xa + xb) / 2, 870, { family: 'num', weight: 800, size: 36, color: on ? P.bg : P.mut, dir: 'ltr' });
    }
    CUTS.forEach(c => { const cx = X0 - c * STEP; X.strokeStyle = P.ink; X.globalAlpha = kf * .35; X.setLineDash([6, 8]); X.lineWidth = 2; X.beginPath(); X.moveTo(cx, 715); X.lineTo(cx, 800); X.stroke(); X.setLineDash([]); });
    X.globalAlpha = kf; if (ph > 0 && ph < 1) { X.fillStyle = P.ink; X.fillRect(px - 2, 660, 4, 280); }
    X.restore();
    ctx.text(X, 'الضربات', 960 - 70, 640, { family: 'body', weight: 700, size: 30, color: P.mut, alpha: kf, align: 'right' });
    ctx.text(X, 'المقاطع', 960 - 70, 975, { family: 'body', weight: 700, size: 30, color: P.mut, alpha: kf, align: 'right' });
    BH.explain(ctx, lt, 'خل كل قطعة تجي على ضربة', 'المشاهد يحس بالإيقاع حتى لو ما انتبه', { t0: 1.4, hi1: [4] });
  } });
