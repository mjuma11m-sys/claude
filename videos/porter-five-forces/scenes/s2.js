// s2 — the answer: Porter → a 3D «5» → «قوى تحدد ربح أي صناعة»
MOTION.scene({ id: 's2',
  setup(ctx) {
    const { THREE, P } = ctx;
    this.st = ctx.stage3D({ fov: 35, camera: [0, 0, 10], env: 'room', tone: 'neutral' });
    this.five = ctx.extrudedText('5', { family: 'num', weight: 900, size: 420, height: 2.1, depth: .6, layers: 30, color: P.acc, sideColor: '#9A6A12', sideColor2: '#3B2A08' });
    this.five.position.set(0, .35, 0); this.st.add(this.five);
    this.sparks = ctx.particles3D({ count: 90, seed: 11, geometry: 'octa', color: P.ink,
      spawn: (i, r) => { const a = r() * 6.283, sp = r.range(2.2, 4.2); return { p: [0, .35, 0], v: [Math.cos(a) * sp, Math.sin(a) * sp, r.gauss() * 1.2], s: r.range(.03, .07), life: 1.1 }; }, drag: 2.4 });
    this.sparks.mesh.position.set(0, 0, 0); this.st.add(this.sparks.mesh);
  },
  draw(t, lt, ctx) {
    const { X, P, at, E } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);

    // «الجواب عند»
    const L0 = ctx.text.layout(X, 'الجواب عند', { family: 'body', weight: 700, size: 58 });
    ctx.text.drawLayout(X, L0, 540, 300, { color: P.mut, perWord: i => { const w = ctx.wordTime('l2', i), k = at(t, w.s - .1, w.s + .2, 'expoOut'); return { alpha: k, dy: (1 - k) * 24 }; } });
    // Michael Porter + source
    const wp = ctx.wordTime('l2', 2), kp = at(t, wp.s - .15, wp.s + .3, 'expoOut');
    ctx.text(X, 'Michael Porter', 540, 412 + (1 - kp) * 40, { family: 'num', weight: 800, size: 92, color: P.ink, alpha: kp, dir: 'ltr' });
    const kl = at(t, wp.s + .1, wp.s + .55, 'cubicInOut');
    if (kl > 0) ctx.drawPath(X, [[230, 442], [850, 442]], kl, { width: 6, color: P.acc, cap: 'round' });
    ctx.text(X, 'Harvard Business Review · 1979', 540, 500, { family: 'num', weight: 500, size: 32, color: P.mut, alpha: at(t, wp.s + .35, wp.s + .7), dir: 'ltr' });

    // 3D «5»
    const w5 = ctx.wordTime('l2', 3), k5 = at(t, w5.s - .25, w5.s + .45, 'expoOut');
    this.five.visible = k5 > 0;
    this.five.scale.setScalar(.94 + .06 * k5);
    this.five.rotation.set(.12 * Math.sin(lt * 1.3), (1 - k5) * -2.4 + .28 * Math.sin(lt * 1.1), 0);
    this.five.position.z = -3 * (1 - k5);
    this.five.traverse(o => { if (o.material) o.material.opacity = k5; });
    this.sparks.update(t - w5.s);
    this.st.draw(X, { alpha: k5 > 0 ? 1 : 0 });

    // «قوى»
    const wq = ctx.wordTime('l2', 4), kq = at(t, wq.s - .1, wq.s + .25, 'expoOut');
    ctx.text(X, 'قوى', 540, 1235 + (1 - kq) * 50, { family: 'display', weight: 900, size: 130, color: P.acc, alpha: kq });

    // «تحدد ربح أي صناعة»
    const L = ctx.text.layout(X, 'تحدد ربح أي صناعة', { family: 'body', weight: 700, size: 72 });
    ctx.text.drawLayout(X, L, 540, 1420, { color: P.ink, perWord: i => { const w = ctx.wordTime('l2', 5 + i), k = at(t, w.s - .08, w.s + .2, 'expoOut'); return { alpha: k, dy: (1 - k) * 34, color: i === 1 ? P.hi : P.ink }; } });
  } });
