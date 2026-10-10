import { bg, rise, rr, tag } from './_kit.js';
// FEATURE 1: سند قبض إلكتروني
MOTION.scene({ id: 's3',
  draw(t, lt, ctx) {
    const { X, P, at } = ctx; const S = ctx.scene.start;
    bg(ctx, t, 0.5);
    tag(ctx, t, 'ميزة 1', 540, 250, S + .05);
    rise(ctx, t, 'سند قبض إلكتروني', 540, 410, S + .15, { size: 96, maxWidth: 1000, color: P.ink });
    const stampT = S + 1.25, [dx, dy] = ctx.MK.shake(t, stampT + .28, 10);
    const k = at(lt, .3, .75, 'expoOut');
    X.save(); X.translate(dx, dy + (1 - k) * 500); X.globalAlpha = Math.min(1, k * 2);
    const x = 190, y = 520, w = 700, h = 760;
    X.shadowColor = 'rgba(0,0,0,.45)'; X.shadowBlur = 50; X.shadowOffsetY = 24; X.fillStyle = P.ink; rr(X, x, y, w, h, 34); X.fill(); X.shadowColor = 'transparent';
    X.fillStyle = P.acc; rr(X, x, y, w, 120, 34); X.fill(); X.fillRect(x, y + 60, w, 60);
    X.restore();
    ctx.text(X, 'سند قبض', 540 + dx, y + 82 + dy + (1 - k) * 500, { family: 'display', weight: 900, size: 62, color: P.bg, alpha: Math.min(1, k * 2) });
    const rows = ['المستأجر', 'المبلغ', 'التاريخ', 'العقار'];
    rows.forEach((r, i) => { const rk = at(lt, .7 + i * .09, 1.0 + i * .09, 'expoOut'); if (rk <= 0) return; const ry = y + 230 + i * 100 + dy;
      ctx.text(X, r, 830 + dx, ry, { family: 'body', weight: 700, size: 42, color: P.bg, align: 'right', alpha: rk });
      X.save(); X.globalAlpha = rk; X.fillStyle = 'rgba(11,22,38,.18)'; rr(X, 250 + dx, ry - 26, 330 * rk, 18, 9); X.fill(); X.restore(); });
    ctx.MK.stamp(t, { s: stampT, cx: 540, cy: 1185, text: 'مدفوع ✓', color: P.clay, size: 74, rot: -9 });
    // "sent" arrow sweep
    const ak = at(lt, 1.75, 2.25, 'expoOut');
    if (ak > 0) ctx.drawPath(X, [[300, 1350], [540, 1320], [800, 1360]], ak, { width: 8, color: P.acc, cap: 'round', tip: { r: 12, color: P.acc } });
    rise(ctx, t, 'يوصل للمستأجر فوراً', 540, 1470, S + 1.85, { size: 66, weight: 700, family: 'body', color: P.acc });
  } });
