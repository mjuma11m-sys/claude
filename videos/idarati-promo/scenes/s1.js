import { bg, rise, rr } from './_kit.js';
// الهوك: دفتر الإيجار؟ — أوراق تطيح وتتبعثر
MOTION.scene({ id: 's1',
  setup(ctx) {
    const r = ctx.rng('papers');
    this.papers = Array.from({ length: 14 }, (_, i) => ({ x: (i % 2 ? r.range(110, 300) : r.range(780, 970)), y0: r.range(-500, -150), y1: r.range(450, 1500), rot0: r.range(-1.2, 1.2), rot1: r.range(-0.4, 0.4), d: i * 0.045 + r.range(0, 0.1), vx: r.sign() * r.range(300, 900), vy: -r.range(200, 900), w: r.range(170, 230) }));
  },
  draw(t, lt, ctx) {
    const { X, P, at, lerp } = ctx;
    bg(ctx, t, 0.5);
    const blow = at(lt, 1.75, 2.5, 'cubicIn');
    for (const p of this.papers) {
      const k = at(lt, p.d, p.d + 0.7, 'backOut');
      if (k <= 0) continue;
      const x = p.x + p.vx * blow, y = lerp(p.y0, p.y1, k) + p.vy * blow + 1400 * blow * blow;
      const rot = lerp(p.rot0, p.rot1, k) + blow * 3;
      X.save(); X.translate(x, y); X.rotate(rot); X.globalAlpha = 1 - blow * 0.6;
      X.fillStyle = '#F5F2EB'; X.shadowColor = 'rgba(0,0,0,.35)'; X.shadowBlur = 24; rr(X, -p.w / 2, -p.w * 0.65, p.w, p.w * 1.3, 8); X.fill(); X.shadowColor = 'transparent';
      X.strokeStyle = 'rgba(20,33,58,.35)'; X.lineWidth = 4;
      for (let l = 0; l < 6; l++) { X.beginPath(); X.moveTo(-p.w / 2 + 22, -p.w * 0.45 + l * 34); X.lineTo(p.w / 2 - 22 - (l % 3) * 25, -p.w * 0.45 + l * 34); X.stroke(); }
      X.restore();
    }
    const sc = ctx.at(lt, 0.1, 0.5);
    const g = X.createRadialGradient(540, 870, 0, 540, 870, 520); g.addColorStop(0, `rgba(20,33,58,${0.85 * sc})`); g.addColorStop(1, 'rgba(20,33,58,0)');
    X.fillStyle = g; X.fillRect(0, 300, ctx.W, 1200);
    const pulse = 1 + 0.08 * ctx.beatPulse(t, 7);
    X.save(); X.translate(540, 820); X.scale(pulse, pulse); X.translate(-540, -820);
    rise(ctx, t, 'دفتر', 540, 760, 0.15, { size: 200, color: P.ink });
    rise(ctx, t, 'الإيجار؟', 540, 980, 0.35, { size: 200, color: P.acc });
    X.restore();
  } });
