import { bg, rise, tag, phone, demoLabel, star } from './_kit.js';
// ميزة 3: الإيصال يطلع من الجوال، والخاتم ينختم عليه
const RC = { x: 16 / 390, y: 420.7 / 844, w: 358 / 390, h: 343.3 / 844 }; // مكان الإيصال على اللقطة
MOTION.scene({ id: 's6',
  draw(t, lt, ctx) {
    const { X, P, at, lerp } = ctx; const S = ctx.scene.start;
    bg(ctx, t, 0.5);
    tag(ctx, t, 'ميزة 3', 540, 230, S + 0.05);
    rise(ctx, t, 'إيصال بشعارك', 540, 380, S + 0.15, { size: 100, color: P.ink });
    rise(ctx, t, 'تشاركه بضغطة', 540, 500, S + 0.35, { size: 100, color: P.acc });
    const pk = at(lt, 0.15, 0.8, 'expoOut');
    const pw = 440, ph = pw * 1688 / 780, py = lerp(1900, 1180, pk);
    const out = at(lt, 0.85, 1.35, 'expoOut');
    phone(ctx, 'receipt', 540, py + out * 160, pw, 0.03, 1 - out * 0.65);
    const img = ctx.img('receipt');
    if (img && out > 0) {
      const sx = RC.x * img.width, sy = RC.y * img.height, sw = RC.w * img.width, sh = RC.h * img.height;
      const w = lerp(pw * RC.w, 800, out), h = w * sh / sw;
      const cx = 540, cy = lerp(py - ph / 2 + (RC.y + RC.h / 2) * ph, 1080, out);
      X.save(); X.translate(cx, cy); X.rotate(lerp(0.03, -0.02, out));
      X.shadowColor = 'rgba(0,0,0,.5)'; X.shadowBlur = 60; X.shadowOffsetY = 24;
      X.drawImage(img, sx, sy, sw, sh, -w / 2, -h / 2, w, h); X.shadowColor = 'transparent';
      // الختم: يطيح من فوق، ينضغط، والإيصال يهتز
      const sk = at(lt, 1.5, 1.72, 'quadIn');
      if (sk > 0) {
        const land = at(lt, 1.72, 1.9, 'backOut');
        const sc = lerp(2.6, 1, sk) * (1 + 0.1 * (1 - land) * (sk >= 1 ? 1 : 0));
        X.save(); X.translate(-w * 0.3, -h * 0.04); X.rotate(-0.25); X.scale(sc, sc);
        X.globalAlpha = 0.85 * sk; X.strokeStyle = P.acc; X.lineWidth = 7; star(X, 0, 0, 62, false);
        X.lineWidth = 3; star(X, 0, 0, 50, false);
        X.restore();
        ctx.text(X, 'مستلم', -w * 0.3, -h * 0.04 + 14, { family: 'display', weight: 700, size: 34 * sc, color: P.acc, alpha: 0.85 * sk });
      }
      X.restore();
    }
    // زر المشاركة
    const bk = at(lt, 2.2, 2.55, 'backOut');
    if (bk > 0) {
      X.save(); X.globalAlpha = bk; X.translate(540, 1460); X.scale(bk, bk);
      X.fillStyle = '#1E3A5F'; X.beginPath(); X.roundRect(-210, -52, 420, 104, 52); X.fill(); X.restore();
      ctx.text(X, 'مشاركة', 540, 1478, { family: 'display', weight: 700, size: 50, color: P.ink, alpha: bk });
    }
    demoLabel(ctx, t, S + 0.3);
  } });
