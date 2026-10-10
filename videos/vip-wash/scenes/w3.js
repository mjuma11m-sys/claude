import { paint, rise } from './_kit.js';
// FEATURES: 3 rows
MOTION.scene({ id: 'w3',
  draw(t, lt, ctx) {
    const { X, P, at } = ctx; const S = ctx.scene.start;
    paint(ctx, t, .5 + at(lt, 0, 3.8) * .3, .5);
    rise(ctx, t, 'شغل VIP… بمواد عالمية', 540, 330, S + .1, { size: 74, color: P.ink, maxWidth: 1000 });
    const rows = [
      ['Vonixx V-Floc', 'شامبو pH متعادل — آمن على الواكس والسيراميك والـ PPF', true],
      ['فوم قن ألمنيوم', 'رغوة سميكة تفكك الأوساخ = صفر احتكاك', false],
      ['عناية بالتفاصيل', 'الجنوط والفتحات وتنشيف مايكروفايبر', false]];
    rows.forEach(([h, sub, latin], i) => {
      const s = .45 + i * .55, k = at(lt, s, s + .4, 'expoOut'); if (k <= 0) return;
      const y = 520 + i * 330, dx = (1 - k) * -160;
      X.save(); X.globalAlpha = k; X.translate(dx, 0);
      X.fillStyle = 'rgba(245,242,234,.05)'; X.beginPath(); X.roundRect(90, y, 860, 270, 32); X.fill();
      X.strokeStyle = 'rgba(212,175,55,.45)'; X.lineWidth = 2; X.beginPath(); X.roundRect(90, y, 860, 270, 32); X.stroke();
      X.fillStyle = P.acc; X.fillRect(944, y + 40, 6, 190);
      X.restore();
      ctx.text(X, String(i + 1).padStart(2, '0'), 150 + dx, y + 105, { family: 'num', weight: 200, size: 80, color: P.acc, alpha: k, dir: 'ltr', align: 'left' });
      ctx.text(X, h, 900 + dx, y + 115, { family: latin ? 'num' : 'display', weight: latin ? 800 : 900, size: latin ? 76 : 80, color: P.ink, align: latin ? 'right' : 'right', dir: 'rtl', alpha: k });
      ctx.text(X, sub, 900 + dx, y + 195, { family: 'body', weight: 400, size: 38, color: P.mut, align: 'right', maxWidth: 760, alpha: k });
    });
  } });
