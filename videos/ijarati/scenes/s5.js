import { bg, rise, rr, tag } from './_kit.js';
// FEATURE 3: المصروفات بالصوت والذكاء الاصطناعي
MOTION.scene({ id: 's5',
  draw(t, lt, ctx) {
    const { X, P, at } = ctx; const S = ctx.scene.start;
    bg(ctx, t, 0.4);
    tag(ctx, t, 'ميزة 3', 540, 250, S + .05);
    rise(ctx, t, 'سجّل مصروفاتك بصوتك', 540, 420, S + .15, { size: 100, color: P.ink });
    // mic
    const mk = at(lt, .25, .55, 'expoOut'), listening = lt > .4 && lt < 1.9;
    for (let q = 0; q < 2; q++) { if (!listening) break; const rk = ((lt * 1.4 + q * .5) % 1); X.save(); X.globalAlpha = (1 - rk) * .45; X.fillStyle = P.acc; X.beginPath(); X.arc(540, 660, 95 + rk * 110, 0, 7); X.fill(); X.restore(); }
    X.save(); X.globalAlpha = mk; X.translate(540, 660); X.scale(.94 + .06 * mk, .94 + .06 * mk);
    X.fillStyle = P.acc; X.beginPath(); X.arc(0, 0, 95, 0, 7); X.fill();
    X.fillStyle = P.bg; rr(X, -24, -55, 48, 80, 24); X.fill();
    X.strokeStyle = P.bg; X.lineWidth = 9; X.lineCap = 'round'; X.beginPath(); X.arc(0, -5, 42, .15, Math.PI - .15); X.stroke(); X.beginPath(); X.moveTo(0, 38); X.lineTo(0, 58); X.stroke();
    X.restore();
    // waveform
    const wk = at(lt, .4, .6) * (1 - at(lt, 1.8, 2.05));
    if (wk > 0) { X.save(); X.fillStyle = P.acc; for (let i = 0; i < 31; i++) { const a = .2 + .8 * Math.abs(ctx.noise1(i * .37 + lt * 6, 4)); const h = 16 + a * 110 * wk; rr(X, 540 + (i - 15) * 26 - 7, 860 - h / 2, 14, h, 7); X.fill(); } X.restore(); }
    // transcript, word by word
    rise(ctx, t, 'دفعت 25 دينار تصليح مكيف — شقة 3', 540, 1030, S + .6, { size: 54, weight: 700, family: 'body', color: P.ink, stagger: .14, dur: .25 });
    // AI sparkle + expense row
    const ek = at(lt, 1.95, 2.35, 'expoOut');
    if (ek > 0) {
      const sp = at(lt, 1.95, 2.3, 'expoOut'), spOut = 1 - at(lt, 2.6, 2.9);
      X.save(); X.globalAlpha = spOut; X.translate(540, 1140); X.rotate(sp * 1.2); X.scale(sp, sp); X.fillStyle = P.acc; X.beginPath();
      for (let i = 0; i < 8; i++) { const r = i % 2 ? 14 : 48, a = i * Math.PI / 4; X.lineTo(Math.cos(a) * r, Math.sin(a) * r); } X.closePath(); X.fill(); X.restore();
      X.save(); X.globalAlpha = ek; X.translate(0, (1 - ek) * 70);
      X.fillStyle = 'rgba(243,246,250,.09)'; rr(X, 130, 1200, 800, 170, 34); X.fill(); X.strokeStyle = 'rgba(34,195,142,.6)'; X.lineWidth = 3; rr(X, 130, 1200, 800, 170, 34); X.stroke();
      X.fillStyle = P.acc; rr(X, 600, 1302, 150, 50, 25); X.fill();
      X.restore();
      const oy = (1 - ek) * 70;
      ctx.text(X, 'تصليح مكيف', 895, 1275 + oy, { family: 'body', weight: 700, size: 52, color: P.ink, align: 'right', alpha: ek });
      ctx.text(X, 'صيانة', 675, 1338 + oy, { family: 'body', weight: 700, size: 32, color: P.bg, alpha: ek });
      ctx.text(X, 'شقة 3', 895, 1345 + oy, { family: 'body', weight: 400, size: 38, color: P.mut, align: 'right', alpha: ek });
      ctx.text(X, '25 د.ب', 180, 1305 + oy, { family: 'display', weight: 900, size: 64, color: P.ink, align: 'left', alpha: ek });
    }
    rise(ctx, t, 'والذكاء الاصطناعي يصنّفها لك', 540, 1480, S + 2.4, { size: 58, weight: 700, family: 'body', color: P.acc });
  } });
