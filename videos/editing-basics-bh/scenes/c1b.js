// Jump cut: silent gaps collapse out of the waveform
import '../lib.js'; const BH = globalThis.BH;
const SEG = [[1, 150], [0, 80], [1, 130], [0, 95], [1, 120], [0, 65]];
MOTION.scene({ id: 'c1b',
  draw(t, lt, ctx) {
    const { X, P, at } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    BH.chip(ctx, lt, 1, 'أساسيات الريل'); BH.head(ctx, lt, 'Jump Cut', 'شيل السكتات');
    const kf = BH.frame(ctx, lt);
    const mark = at(lt, 1.0, 1.4, 'expoOut'), cut = at(lt, 2.0, 2.7, 'expoInOut');
    const total = SEG.reduce((a, s) => a + (s[0] ? s[1] : s[1] * (1 - cut)), 0);
    let x = 540 + total / 2;                                           // RTL: timeline flows right → left
    X.save(); X.globalAlpha = kf;
    SEG.forEach(([speech, w], si) => {
      const ww = speech ? w : w * (1 - cut);
      if (speech) {
        for (let b = 0; b < w; b += 10) { const h = 20 + 120 * Math.abs(ctx.noise1(si * 7 + b * .09, 4)); X.fillStyle = P.acc; X.fillRect(x - b - 6, 830 - h / 2, 5, h); }
      } else if (ww > 1) {
        X.fillStyle = P.mut; X.fillRect(x - ww, 828, ww, 4);
        if (mark > 0) { X.globalAlpha = kf * mark * .25; X.fillStyle = P.clay; X.fillRect(x - ww, 700, ww, 260); X.globalAlpha = kf;
          ctx.text(X, '✂', x - ww / 2, 690, { family: 'num', size: 40, color: P.clay, alpha: mark * (1 - cut), dir: 'ltr' }); }
      }
      x -= ww;
    });
    X.restore();
    // playhead after the cut
    const kp = ctx.prog(lt, 2.9, 4.6); if (kp > 0 && kp < 1) { const px = 540 + total / 2 - total * kp; X.fillStyle = P.ink; X.fillRect(px - 2, 700, 4, 260); }
    BH.explain(ctx, lt, 'كل سكتة = مكان يطلع منه المشاهد', 'قصّها وخل الكلام ورا بعض', { t0: 1.1, hi1: [4] });
  } });
