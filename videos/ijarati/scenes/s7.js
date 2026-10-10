import { bg, rise, rr } from './_kit.js';
// OUTRO + CTA
MOTION.scene({ id: 's7',
  draw(t, lt, ctx) {
    const { X, P, at } = ctx; const S = ctx.scene.start;
    bg(ctx, t, 0.5);
    rise(ctx, t, 'عقارك يستاهل', 540, 480, S + .15, { size: 104, color: P.ink });
    rise(ctx, t, 'إدارة تليق فيه', 540, 610, S + .35, { size: 104, color: P.ink });
    const bk = at(lt, .7, 1.4, 'expoInOut'), bin = at(lt, .6, .85, 'expoOut');
    X.save(); X.globalAlpha = bin; X.translate(540, 900); X.scale(.95 + .05 * bin, .95 + .05 * bin); X.translate(-540, -900);
    ctx.text.drawKashida(X, 'إجاراتي', 540, 960, 860, { family: 'display', weight: 900, size: 240, color: P.acc }, bk);
    X.restore();
    const ck = at(lt, 1.3, 1.65, 'expoOut'), pulse = lt > 1.7 ? .03 * ctx.beatPulse(t, 7) : 0;
    if (ck > 0) {
      X.save(); X.globalAlpha = ck; X.translate(540, 1210 + (1 - ck) * 60); X.scale(.95 + .05 * ck + pulse, .95 + .05 * ck + pulse);
      X.fillStyle = P.ink; rr(X, -360, -75, 720, 150, 75); X.fill(); X.restore();
      ctx.text(X, 'جرّب إجاراتي الحين', 540, 1232 + (1 - ck) * 60, { family: 'display', weight: 900, size: 62, color: P.bg, alpha: ck });
    }
    const ak = at(lt, 1.7, 2.0, 'expoOut');
    if (ak > 0) {
      const bob = Math.sin(lt * 6) * 8;
      X.save(); X.globalAlpha = ak; X.strokeStyle = P.acc; X.lineWidth = 8; X.lineCap = 'round'; X.lineJoin = 'round';
      X.beginPath(); X.moveTo(540, 1440 + bob); X.lineTo(540, 1360 + bob); X.moveTo(510, 1390 + bob); X.lineTo(540, 1360 + bob); X.lineTo(570, 1390 + bob); X.stroke(); X.restore();
      ctx.text(X, 'الرابط في البايو', 540, 1500, { family: 'body', weight: 700, size: 54, color: P.mut, alpha: ak });
    }
  } });
