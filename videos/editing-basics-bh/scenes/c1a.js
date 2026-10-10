// Hook: a 3-second countdown inside a phone
import '../lib.js'; const BH = globalThis.BH;
MOTION.scene({ id: 'c1a',
  draw(t, lt, ctx) {
    const { X, P, at, E } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    BH.chip(ctx, lt, 1, 'أساسيات الريل'); BH.head(ctx, lt, 'Hook', 'أول شي يشوفه المشاهد');
    const kf = BH.frame(ctx, lt);
    BH.phone(X, 540, 830, 300, 590, P.mut, kf);
    // countdown 3 → 1
    const c = ctx.prog(lt, .6, 3.6), n = Math.max(1, 3 - Math.floor(c * 3));
    if (kf > .5) {
      X.save(); X.lineCap = 'round';
      X.strokeStyle = 'rgba(244,241,234,.12)'; X.lineWidth = 14; X.beginPath(); X.arc(540, 800, 100, 0, 6.283); X.stroke();
      X.strokeStyle = c >= 1 ? P.clay : P.acc; X.beginPath(); X.arc(540, 800, 100, -Math.PI / 2, -Math.PI / 2 + 6.283 * (1 - c)); X.stroke(); X.restore();
      const ph = (c * 3) % 1, kn = c < 1 ? E.expoOut(Math.min(1, ph * 4)) : 1;
      ctx.text(X, c >= 1 ? '0' : String(n), 540, 838, { family: 'num', weight: 900, size: 110 * (.94 + .06 * kn), color: c >= 1 ? P.clay : P.ink, dir: 'ltr' });
      ctx.text(X, 'ثواني', 540, 950, { family: 'body', weight: 700, size: 36, color: P.mut });
    }
    // swipe-away arrow after the clock runs out
    const ks = at(lt, 3.6, 4.1, 'expoOut');
    if (ks > 0) { ctx.drawPath(X, [[540, 1090], [540, 1020 - 40 * ks]], ks, { width: 8, color: P.clay, cap: 'round' });
      X.save(); X.fillStyle = P.clay; X.globalAlpha = ks; X.beginPath(); X.moveTo(540, 990 - 40 * ks); X.lineTo(515, 1025 - 40 * ks); X.lineTo(565, 1025 - 40 * ks); X.fill(); X.restore(); }
    BH.explain(ctx, lt, 'أول 3 ثواني تقرر', 'يكمل ولا يسوي سكرول', { hi2: [3] });
  } });
