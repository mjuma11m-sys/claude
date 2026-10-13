import { bg, rise, tag, phone, rr, demoLabel } from './_kit.js';
// ميزة 2: تذكير واتساب برسالة جاهزة
const WA = [0.5, 0.582]; // مكان زر الواتساب على اللقطة (من Playwright)
MOTION.scene({ id: 's5',
  draw(t, lt, ctx) {
    const { X, P, at, lerp } = ctx; const S = ctx.scene.start;
    bg(ctx, t, 0.5);
    tag(ctx, t, 'ميزة 2', 540, 230, S + 0.05);
    rise(ctx, t, 'تذكير بالواتساب', 540, 380, S + 0.15, { size: 100, color: P.ink });
    rise(ctx, t, 'برسالة جاهزة', 540, 500, S + 0.35, { size: 100, color: P.acc });
    // الكاميرا تقرّب على الزر
    const zoom = lerp(1, 1.15, at(lt, 0.3, 1.0, 'cubicInOut')), pw = 470, ph = pw * 1688 / 780;
    const cx = 540, cy = 1210 - (WA[1] - 0.5) * ph * (zoom - 1);
    const press = 1.15, pk = at(lt, press - 0.08, press, 'quadIn') * (1 - at(lt, press, press + 0.2));
    phone(ctx, 'unit', cx, cy, pw, -0.02, 1 - at(lt, 1.6, 2.0) * 0.55, { scale: zoom * (1 - 0.015 * pk) });
    const bx = cx + (WA[0] - 0.5) * pw * zoom, by = cy + (WA[1] - 0.5) * ph * zoom;
    for (let q = 0; q < 2; q++) { const rk = at(lt, press + q * 0.12, press + q * 0.12 + 0.6, 'cubicOut'); if (rk <= 0 || rk >= 1) continue;
      X.save(); X.globalAlpha = (1 - rk) * 0.7; X.strokeStyle = '#2FBF71'; X.lineWidth = 8; X.beginPath(); X.arc(bx, by, 40 + rk * 220, 0, 7); X.stroke(); X.restore(); }
    const fk = at(lt, 0.5, press, 'expoOut'), fo = 1 - at(lt, press + 0.3, press + 0.5);
    if (fk > 0 && fo > 0) { X.save(); X.globalAlpha = fo; X.translate(lerp(900, bx + 60, fk), lerp(1700, by + 20, fk)); X.scale(1 - 0.15 * pk, 1 - 0.15 * pk);
      X.fillStyle = 'rgba(245,242,235,.95)'; X.strokeStyle = P.bg; X.lineWidth = 6; X.beginPath(); X.arc(0, 0, 40, 0, 7); X.fill(); X.stroke(); X.restore(); }
    // فقاعة الرسالة (نفس قالب التطبيق، مختصر)
    const ck = at(lt, press + 0.35, press + 0.75, 'expoOut');
    if (ck > 0) {
      X.save(); X.globalAlpha = ck; X.translate(0, (1 - ck) * 90);
      X.shadowColor = 'rgba(0,0,0,.4)'; X.shadowBlur = 40;
      X.fillStyle = '#DCF8C6'; rr(X, 90, 1040, 840, 330, 38); X.fill(); X.shadowColor = 'transparent';
      X.beginPath(); X.moveTo(880, 1360); X.lineTo(930, 1400); X.lineTo(850, 1370); X.fill();
      X.restore();
      const yy = (1 - ck) * 90;
      ctx.text(X, 'السلام عليكم عائلة سلمان،', 890, 1115 + yy, { family: 'body', weight: 700, size: 44, color: '#14213A', align: 'right', alpha: ck });
      ctx.text(X, 'تذكير بإيجار شقة 3 (أغسطس، سبتمبر، أكتوبر):', 890, 1180 + yy, { family: 'body', weight: 400, size: 38, color: '#14213A', align: 'right', alpha: ck, maxWidth: 800 });
      ctx.text(X, '600.000 د.ب', 890, 1245 + yy, { family: 'body', weight: 700, size: 44, color: '#1F7A4D', align: 'right', alpha: ck });
      ctx.text(X, 'إذا تم الدفع تجاهل الرسالة، وشكراً.', 890, 1310 + yy, { family: 'body', weight: 400, size: 36, color: '#4A5A70', align: 'right', alpha: ck });
    }
    demoLabel(ctx, t, S + 0.3);
  } });
