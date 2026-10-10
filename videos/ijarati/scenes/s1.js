import { bg, rise, rr } from './_kit.js';
// HOOK: الإيجار تأخّر… مرة ثانية؟  — papers raining, phone ringing
MOTION.scene({ id: 's1',
  setup(ctx) {
    const r = ctx.rng('papers');
    this.papers = Array.from({ length: 18 }, (_, i) => ({ x: r.range(40, 1040), y0: r.range(-900, 200), v: r.range(260, 520), w: r.range(70, 130), rot: r.range(-1, 1), spin: r.range(-1.6, 1.6), a: r.range(.12, .32), d: r.range(0, .4) }));
  },
  draw(t, lt, ctx) {
    const { X, P, at } = ctx;
    bg(ctx, t, 0.55);
    // falling paper receipts
    for (const p of this.papers) {
      const y = p.y0 + p.v * (lt + 0.6); if (y > 2050) continue;
      X.save(); X.globalAlpha = p.a * at(lt, p.d, p.d + .3); X.translate(p.x + Math.sin(lt * 2 + p.rot * 3) * 30, y); X.rotate(p.rot + p.spin * lt);
      X.fillStyle = P.ink; rr(X, -p.w / 2, -p.w * .65, p.w, p.w * 1.3, 6); X.fill();
      X.fillStyle = 'rgba(11,22,38,.35)'; for (let k = 0; k < 4; k++) X.fillRect(-p.w * .35, -p.w * .4 + k * p.w * .22, p.w * (k % 2 ? .5 : .7), 5);
      X.restore();
    }
    // ringing phone icon
    const ph = at(lt, .05, .35, 'expoOut'), ring = lt > .3 ? Math.sin(lt * 38) * 0.09 * (0.5 + 0.5 * Math.sin(lt * 4)) : 0;
    X.save(); X.globalAlpha = ph; X.translate(540, 520); X.rotate(ring); X.scale(.94 + .06 * ph, .94 + .06 * ph);
    X.fillStyle = P.acc; X.beginPath(); X.arc(0, 0, 105, 0, 7); X.fill();
    X.rotate(-0.55); X.strokeStyle = P.bg; X.fillStyle = P.bg; X.lineWidth = 24; X.lineCap = 'round';
    X.beginPath(); X.arc(18, 0, 52, Math.PI * .62, Math.PI * 1.38); X.stroke();
    rr(X, -32, -66, 50, 30, 12); X.fill(); rr(X, -32, 36, 50, 30, 12); X.fill();
    X.restore();
    for (let k = 0; k < 2; k++) { const q = ((lt * 1.6 + k * .5) % 1); if (lt < .35) break; X.save(); X.globalAlpha = (1 - q) * .55; X.strokeStyle = P.acc; X.lineWidth = 5; X.beginPath(); X.arc(540, 520, 115 + q * 120, 0, 7); X.stroke(); X.restore(); }
    // copy
    const S = ctx.scene.start;
    rise(ctx, t, 'الإيجار تأخّر…', 540, 880, S + .2, { size: 140, color: P.ink });
    const slam = S + 1.0, [dx, dy] = ctx.MK.shake(t, slam, 14);
    X.save(); X.translate(dx, dy);
    const k = at(t, slam, slam + .25, 'expoOut');
    if (k > 0) ctx.text(X, 'مرة ثانية؟', 540, 1110, { family: 'display', weight: 900, size: 215 * (1.25 - .25 * k), color: P.acc, alpha: k });
    X.restore();
    rise(ctx, t, 'وأوراقك… وين صارت؟', 540, 1290, S + 1.7, { size: 66, weight: 700, family: 'body', color: P.mut });
  } });
