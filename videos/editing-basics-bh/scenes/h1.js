// hook: «تبي ريلك يمسك العين؟» → big 3
import '../lib.js'; const BH = globalThis.BH;
MOTION.scene({ id: 'h1',
  draw(t, lt, ctx) {
    const { X, P, at } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    // film-strip sprockets sliding down both edges (motion from frame 1)
    X.save(); X.fillStyle = P.ink; X.globalAlpha = .07;
    for (let i = -1; i < 20; i++) { const y = ((i * 110 + lt * 260) % 2200) - 140; X.beginPath(); X.roundRect(34, y, 46, 64, 10); X.fill(); X.beginPath(); X.roundRect(1000, y, 46, 64, 10); X.fill(); }
    X.restore();
    ctx.drawPath(X, [[980, 440], [100, 440]], at(lt, 0, .5, 'expoOut'), { width: 6, color: P.acc, cap: 'round' });
    BH.words(ctx, lt, 'تبي ريلك يمسك العين؟', 540, 600, { family: 'display', weight: 900, size: 92, maxWidth: 960, t0: .05, st: .12, hi: [3], rise: 60 });
    const k = at(lt, 1.35, 1.75, 'expoOut');
    X.save(); X.translate(540, 1200); X.scale(.94 + .06 * k, .94 + .06 * k);
    X.globalAlpha = k; X.strokeStyle = P.acc; X.lineWidth = 10; X.lineCap = 'round';
    X.beginPath(); X.arc(0, -130, 215, -Math.PI / 2, -Math.PI / 2 + 6.283 * at(lt, 1.4, 2.4, 'cubicInOut')); X.stroke();
    ctx.text(X, '3', 0, 0, { family: 'num', weight: 900, size: 340, color: P.ink, dir: 'ltr' }); X.restore();
    BH.words(ctx, lt, 'أشياء لازم تعرفها بالمونتاج', 540, 1470, { size: 62, t0: 1.9, hi: [3] });
  } });
