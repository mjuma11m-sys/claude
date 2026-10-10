// Whip pan: fast slide with motion streaks hides the cut
import '../lib.js'; const BH = globalThis.BH;
function shotA(X, x0) { X.fillStyle = '#20324A'; X.fillRect(x0, 500, 780, 660); X.fillStyle = '#F2B33D'; X.beginPath(); X.arc(x0 + 390, 760, 90, 0, 6.283); X.fill(); X.fillStyle = '#15202E'; X.fillRect(x0, 930, 780, 230); }
function shotB(X, x0) { X.fillStyle = '#2B1E22'; X.fillRect(x0, 500, 780, 660); X.fillStyle = '#E5484D'; [[120, 300], [260, 420], [420, 260], [560, 380]].forEach(([dx, h]) => X.fillRect(x0 + dx, 1160 - h, 100, h)); }
MOTION.scene({ id: 'c2b',
  draw(t, lt, ctx) {
    const { X, P, at, E } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    BH.chip(ctx, lt, 2, 'الانتقالات'); BH.head(ctx, lt, 'Whip Pan', 'مسحة سريعة');
    const kf = BH.frame(ctx, lt), k = E.expoInOut(ctx.prog(lt, 1.9, 2.3)), off = 780 * k;
    BH.clip(X); X.globalAlpha = kf;
    shotA(X, 150 + off); shotB(X, 150 + off - 780);                       // slides left → right
    const blur = Math.sin(Math.PI * ctx.prog(lt, 1.9, 2.3));
    if (blur > 0) { const r = ctx.rng('wp' + Math.floor(lt * 60)); for (let i = 0; i < 60; i++) { X.globalAlpha = blur * r.range(.05, .3); X.fillStyle = r() > .5 ? P.ink : P.acc; X.fillRect(150, r.range(500, 1160), 780, r.range(2, 14)); } }
    X.restore(); X.globalAlpha = 1;
    ctx.text(X, lt < 2.1 ? 'لقطة 1' : 'لقطة 2', 890, 560, { family: 'body', weight: 700, size: 30, color: P.ink, align: 'right', alpha: kf });
    BH.explain(ctx, lt, 'حركة سريعة تخبي القص', 'وايد حلوة للريلز السريعة', { t0: 2.5, hi1: [2] });
  } });
