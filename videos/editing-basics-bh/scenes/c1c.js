// Captions: one word at a time inside a phone
import '../lib.js'; const BH = globalThis.BH;
const CAP = ['هذا', 'الكابشن', 'يطلع', 'كلمة', 'كلمة'];
MOTION.scene({ id: 'c1c',
  draw(t, lt, ctx) {
    const { X, P, at } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    BH.chip(ctx, lt, 1, 'أساسيات الريل'); BH.head(ctx, lt, 'Captions', 'كابشن كلمة بكلمة');
    const kf = BH.frame(ctx, lt);
    BH.phone(X, 540, 830, 300, 590, P.mut, kf);
    // speaker silhouette
    X.save(); X.globalAlpha = kf * .35; X.fillStyle = P.mut; X.beginPath(); X.arc(540, 740, 62, 0, 6.283); X.fill();
    X.beginPath(); X.ellipse(540, 900, 120, 80, 0, Math.PI, 0); X.fill(); X.restore();
    const L = ctx.text.layout(X, CAP.join(' '), { family: 'body', weight: 700, size: 40, maxWidth: 250, lineHeight: 1.25 });
    ctx.text.drawLayout(X, L, 540, 990, { perWord: i => { const s = .8 + i * .42, k = at(lt, s, s + .18, 'expoOut'), live = lt >= s && lt < s + .42;
      return { alpha: k, dy: (1 - k) * 18, color: live ? P.acc : P.ink }; } });
    BH.explain(ctx, lt, 'عشان يقرا ويسمع بنفس اللحظة', 'وناس وايد يتفرجون بدون صوت', { t0: 2.6, hi1: [1] });
  } });
