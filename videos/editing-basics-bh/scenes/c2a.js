// Match cut: a spinning wheel cuts to a moon in the same place
import '../lib.js'; const BH = globalThis.BH;
MOTION.scene({ id: 'c2a',
  draw(t, lt, ctx) {
    const { X, P, at } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    BH.chip(ctx, lt, 2, 'الانتقالات'); BH.head(ctx, lt, 'Match Cut', 'قطع مطابق');
    const kf = BH.frame(ctx, lt), cutT = 2.3, moon = lt >= cutT;
    BH.clip(X);
    X.globalAlpha = kf;
    if (!moon) {
      X.fillStyle = '#1C232E'; X.fillRect(150, 500, 780, 660);
      X.fillStyle = '#2A3340'; X.fillRect(150, 990, 780, 170);                 // road
      X.save(); X.translate(540, 830); X.rotate(lt * 5);
      X.strokeStyle = '#0B0E13'; X.lineWidth = 48; X.beginPath(); X.arc(0, 0, 150, 0, 6.283); X.stroke();
      X.strokeStyle = P.mut; X.lineWidth = 8; for (let i = 0; i < 6; i++) { X.rotate(Math.PI / 3); X.beginPath(); X.moveTo(0, 0); X.lineTo(0, 118); X.stroke(); }
      X.fillStyle = P.ink; X.beginPath(); X.arc(0, 0, 22, 0, 6.283); X.fill(); X.restore();
    } else {
      X.fillStyle = '#070A10'; X.fillRect(150, 500, 780, 660);
      const r = ctx.rng('stars'); X.fillStyle = P.ink; for (let i = 0; i < 70; i++) { X.globalAlpha = kf * r.range(.2, .8); X.fillRect(r.range(160, 920), r.range(510, 1150), 3, 3); }
      X.globalAlpha = kf; X.fillStyle = '#E9E4D8'; X.beginPath(); X.arc(540, 830, 174, 0, 6.283); X.fill();
      X.fillStyle = '#C9C2B2'; [[-50, -40, 34], [60, 30, 26], [-20, 70, 20], [40, -80, 16]].forEach(([dx, dy, rr]) => { X.beginPath(); X.arc(540 + dx, 830 + dy, rr, 0, 6.283); X.fill(); });
    }
    const fl = Math.max(0, 1 - Math.abs(lt - cutT) / .08); if (fl > 0) { X.globalAlpha = fl * .7; X.fillStyle = '#fff'; X.fillRect(150, 500, 780, 660); }
    X.restore(); X.globalAlpha = 1;
    ctx.text(X, moon ? 'لقطة 2' : 'لقطة 1', 890, 560, { family: 'body', weight: 700, size: 30, color: P.acc, align: 'right', alpha: kf });
    BH.explain(ctx, lt, 'شكل يشبه شكل = القص ما ينحس', 'مثال: كفر سيارة يصير قمر', { t0: 2.6, hi1: [4] });
  } });
