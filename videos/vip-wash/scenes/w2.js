import { paint, rise } from './_kit.js';
// FOAM: thick foam cannon coverage
MOTION.scene({ id: 'w2',
  setup(ctx) { const r = ctx.rng('foam');
    this.b = Array.from({ length: 420 }, (_, i) => { const a = r.range(-.6, .6) - 2.35, d = r.range(0, 1); return { tx: r.range(-80, 1160), ty: r.range(150, 1800), r: r.range(28, 85), d: r.range(0, 1.2), shade: r.range(.82, 1) }; });
    this.b.sort((p, q) => p.d - q.d); },
  draw(t, lt, ctx) {
    const { X, P, at, lerp } = ctx; const S = ctx.scene.start;
    paint(ctx, t, .2 + at(lt, 0, 3) * .3, .6);
    // nozzle at bottom-right shoots foam
    const nx = 1000, ny = 1850;
    for (const p of this.b) { const k = at(lt, p.d * .9, p.d * .9 + .45, 'expoOut'); if (k <= 0) continue;
      const x = lerp(nx, p.tx, k), y = lerp(ny, p.ty, k), r = p.r * (.25 + .75 * k) * (1 + .03 * Math.sin(lt * 3 + p.tx));
      const g = X.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r);
      const c = Math.round(255 * p.shade); g.addColorStop(0, `rgb(${c},${c},${c})`); g.addColorStop(.85, `rgb(${c - 28},${c - 26},${c - 22})`); g.addColorStop(1, `rgba(${c - 40},${c - 40},${c - 36},0)`);
      X.fillStyle = g; X.beginPath(); X.arc(x, y, r, 0, 7); X.fill(); }
    // text on a dark card so it reads over white foam
    const ck = at(lt, .9, 1.25, 'expoOut');
    if (ck > 0) { X.save(); X.globalAlpha = .82 * ck; X.fillStyle = '#0A0A0C'; X.beginPath(); X.roundRect(90, 640 + (1 - ck) * 40, 900, 470, 40); X.fill(); X.restore(); }
    rise(ctx, t, 'رغوة كثيفة', 540, 820, S + 1.0, { size: 130, color: P.ink });
    rise(ctx, t, 'ترفع الوسخ…', 540, 960, S + 1.25, { size: 92, color: P.acc });
    rise(ctx, t, 'قبل لا يلمس شي سيارتك', 540, 1060, S + 1.55, { size: 56, weight: 700, family: 'body', color: P.mut });
  } });
