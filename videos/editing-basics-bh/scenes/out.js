// outro: save + try in CapCut + recap chips + comment CTA
import '../lib.js'; const BH = globalThis.BH;
const R = ['أساسيات الريل', 'الانتقالات', 'حركات الكاميرا'];
MOTION.scene({ id: 'out',
  draw(t, lt, ctx) {
    const { X, P, at } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    const k = at(lt, 0, .4, 'expoOut');
    ctx.text(X, 'احفظ الفيديو', 540, 470 + (1 - k) * 50, { family: 'display', weight: 900, size: 124, color: P.acc, alpha: k });
    BH.words(ctx, lt, 'وجرّبهم بـ CapCut', 540, 590, { size: 64, t0: .3 });
    R.forEach((s, i) => {
      const y = 790 + i * 130, ki = at(lt, .7 + i * .08, 1.0 + i * .08, 'expoOut'); if (ki <= 0) return;
      X.save(); X.globalAlpha = ki; X.translate(0, (1 - ki) * 30); X.fillStyle = 'rgba(244,241,234,0.05)'; X.beginPath(); X.roundRect(200, y - 56, 680, 100, 24); X.fill();
      X.strokeStyle = P.acc; X.lineWidth = 4; X.beginPath(); X.roundRect(780, y - 30, 52, 52, 12); X.stroke(); X.restore();
      ctx.text(X, s, 740, y + 16, { family: 'body', weight: 700, size: 52, color: P.ink, align: 'right', alpha: ki });
      ctx.text(X, String(i + 1), 260, y + 16, { family: 'num', weight: 800, size: 44, color: P.mut, alpha: ki, dir: 'ltr' });
      const kt = at(lt, 1.3 + i * .25, 1.5 + i * .25, 'cubicOut');
      if (kt > 0) ctx.drawPath(X, [[792, y - 2], [806, y + 12], [822, y - 14]], kt, { width: 7, color: P.acc, cap: 'round' });
    });
    BH.words(ctx, lt, 'شنهو تبينا نشرح بعد؟', 540, 1300, { family: 'display', weight: 900, size: 76, t0: 2.3 });
    BH.words(ctx, lt, 'اكتبه بالتعليقات', 540, 1390, { size: 50, t0: 2.6, color: P.mut, hi: [1] });
  } });
