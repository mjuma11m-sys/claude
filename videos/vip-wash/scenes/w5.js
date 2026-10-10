import { paint, rise } from './_kit.js';
// CTA
MOTION.scene({ id: 'w5',
  draw(t, lt, ctx) {
    const { X, P, at } = ctx; const S = ctx.scene.start;
    paint(ctx, t, .1 + at(lt, 0, 3.6) * .8, .7);
    rise(ctx, t, 'سيارتك تستاهل', 540, 520, S + .1, { size: 112, color: P.ink });
    rise(ctx, t, 'أكثر من غسيل عادي', 540, 650, S + .3, { size: 98, color: P.ink });
    const vk = at(lt, .6, 1.0, 'expoOut');
    if (vk > 0) { ctx.text(X, 'VIP', 540, 960, { family: 'num', weight: 900, size: 260 * (1.15 - .15 * vk), color: P.acc, alpha: vk, dir: 'ltr', letterSpacing: 40 * (1 - vk) + 12 }); }
    const lk = at(lt, .9, 1.3, 'expoOut'); if (lk > 0) { X.save(); X.fillStyle = P.acc; X.fillRect(540 - 260 * lk, 1010, 520 * lk, 4); X.restore(); }
    const ck = at(lt, 1.3, 1.65, 'expoOut'), pulse = lt > 1.7 ? .03 * ctx.beatPulse(t, 7) : 0;
    if (ck > 0) { X.save(); X.globalAlpha = ck; X.translate(540, 1200 + (1 - ck) * 60); X.scale(.95 + .05 * ck + pulse, .95 + .05 * ck + pulse);
      X.fillStyle = P.acc; X.beginPath(); X.roundRect(-380, -78, 760, 156, 78); X.fill(); X.restore();
      ctx.text(X, 'احجز موعد غسيلك القادم', 540, 1222 + (1 - ck) * 60, { family: 'display', weight: 900, size: 60, color: '#08080A', alpha: ck }); }
    const ak = at(lt, 1.75, 2.05, 'expoOut');
    if (ak > 0) { const bob = Math.sin(lt * 6) * 8;
      X.save(); X.globalAlpha = ak; X.strokeStyle = P.acc; X.lineWidth = 8; X.lineCap = 'round'; X.lineJoin = 'round';
      X.beginPath(); X.moveTo(540, 1420 + bob); X.lineTo(540, 1340 + bob); X.moveTo(510, 1370 + bob); X.lineTo(540, 1340 + bob); X.lineTo(570, 1370 + bob); X.stroke(); X.restore();
      ctx.text(X, 'اسحب لفوق — المواعيد محدودة يومياً', 540, 1490, { family: 'body', weight: 700, size: 46, color: P.mut, alpha: ak }); }
  } });
