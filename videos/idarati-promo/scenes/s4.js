import { bg, rise, tag, phone, rr, demoLabel } from './_kit.js';
// ميزة 1: المتأخرات بالأشهر
MOTION.scene({ id: 's4',
  draw(t, lt, ctx) {
    const { X, P, at, lerp } = ctx; const S = ctx.scene.start;
    bg(ctx, t, 0.55);
    tag(ctx, t, 'ميزة 1', 540, 230, S + 0.05);
    rise(ctx, t, 'تعرف مين متأخر', 540, 380, S + 0.15, { size: 96, color: P.ink });
    rise(ctx, t, 'وكم، ومن أي شهر', 540, 495, S + 0.35, { size: 96, color: P.acc });
    const k = at(lt, 0.2, 1.0, 'expoOut');
    phone(ctx, 'unit', 540, lerp(1900, 1130, k), 470, lerp(0.18, -0.04, k) + 0.01 * Math.sin(lt * 2));
    // بطاقة المتأخرات تطلع من الجوال وتكبر
    const ck = at(lt, 1.15, 1.6, 'backOut');
    if (ck > 0) {
      const y = lerp(1100, 1010, ck), s = lerp(0.6, 1, ck);
      X.save(); X.translate(540, y); X.scale(s, s); X.globalAlpha = Math.min(1, ck * 1.4);
      X.shadowColor = 'rgba(0,0,0,.45)'; X.shadowBlur = 50; X.shadowOffsetY = 20;
      X.fillStyle = '#F8E2DE'; rr(X, -400, -120, 800, 240, 32); X.fill(); X.shadowColor = 'transparent';
      X.restore();
      ctx.text(X, 'متأخرات 3 أشهر', 540 + 360 * s, y - 30 * s, { family: 'display', weight: 700, size: 58 * s, color: '#B83A2B', align: 'right', alpha: ck });
      ctx.text(X, 'أغسطس، سبتمبر، أكتوبر', 540 + 360 * s, y + 50 * s, { family: 'body', weight: 400, size: 40 * s, color: '#14213A', align: 'right', alpha: ck });
      const v = Math.round(600 * at(lt, 1.3, 2.1, 'expoOut'));
      ctx.text(X, ctx.num(v) + '.000', 540 - 360 * s, y + 60 * s, { family: 'num', weight: 800, size: 60 * s, color: '#B83A2B', align: 'left', dir: 'ltr', alpha: ck });
    }
    demoLabel(ctx, t, S + 0.3);
  } });
