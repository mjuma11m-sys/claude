import { bg, rise, starPts } from './_kit.js';
// الكشف: الخاتم ينرسم بخط ذهبي، يمتلي، وتطلع «دار» ثم «إداراتي»
MOTION.scene({ id: 's3',
  setup(ctx) {
    this.sparks = ctx.particles2D({ count: 46, seed: 9, spawn: (i, r) => { const a = r() * 6.283, v = r.range(250, 700); return { x: 540, y: 760, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: r.range(4, 9), color: r.pick(['#C9963A', '#E2B866', '#F5F2EB']), delay: 1.05, life: r.range(0.7, 1.2), shape: 'circle' }; }, drag: 1.6 });
  },
  draw(t, lt, ctx) {
    const { X, P, at } = ctx; const S = ctx.scene.start;
    bg(ctx, t, 0.38);
    const pts = starPts(540, 760, 175);
    const draw = at(lt, 0.05, 0.95, 'cubicInOut'), fill = at(lt, 0.85, 1.15, 'expoOut');
    const pop = 1 + 0.12 * (at(lt, 1.0, 1.12, 'quadOut') - at(lt, 1.12, 1.45, 'cubicOut'));
    X.save(); X.translate(540, 760); X.scale(pop, pop); X.rotate((1 - at(lt, 0, 1.2, 'expoOut')) * -0.6); X.translate(-540, -760);
    if (fill < 1) ctx.drawPath(X, pts, draw, { width: 14, color: P.acc, glow: 24, glowColor: 'rgba(201,150,58,.8)', tip: { r: 12, color: '#FFE7B0', glow: 30 } });
    if (fill > 0) {
      const img = ctx.img('sym');
      X.globalAlpha = fill; if (img) X.drawImage(img, 540 - 290, 760 - 290, 580, 580);
    }
    X.restore();
    this.sparks.draw(X, lt);
    rise(ctx, t, 'إداراتي', 540, 1210, S + 1.3, { size: 170, color: P.ink });
    rise(ctx, t, 'إدارة أملاك العائلة… بمكان واحد', 540, 1420, S + 1.75, { size: 58, family: 'body', weight: 700, color: P.mut, stagger: 0.05 });
  } });
