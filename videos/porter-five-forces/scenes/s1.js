// s1 — hook: same market, one bar climbs (تربح) and one sinks (تخسر)
MOTION.scene({ id: 's1',
  setup(ctx) {
    const { THREE, P } = ctx;
    this.st = ctx.stage3D({ fov: 30, camera: [0, 1, 17], lookAt: [0, .6, 0], env: 'room', tone: 'neutral' });
    const mat = c => new THREE.MeshPhysicalMaterial({ color: c, roughness: .32, clearcoat: .5, metalness: .05, envMapIntensity: .8 });
    const geo = new ctx.RoundedBoxGeometry(1.2, 1, 1.2, 5, .12);
    this.up = this.st.add(new THREE.Mesh(geo, mat(P.hi)));
    this.dn = this.st.add(new THREE.Mesh(geo, mat(P.clay)));
    const key = new THREE.DirectionalLight('#ffffff', 1.4); key.position.set(4, 6, 8); this.st.add(key);
    this.base = -1.0;
    this.v = new THREE.Vector3();
  },
  scr(x, y, z) { this.v.set(x, y, z).project(this.st.camera); return [(this.v.x + 1) / 2 * 1080, (1 - this.v.y) / 2 * 1920]; },
  draw(t, lt, ctx) {
    const { X, P, at, E } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    // faint market grid
    X.save(); X.strokeStyle = P.ink; X.globalAlpha = .05; X.lineWidth = 2;
    for (let y = 560; y <= 1340; y += 78) { X.beginPath(); X.moveTo(110, y); X.lineTo(970, y); X.stroke(); }
    X.restore();

    const wUp = ctx.wordTime('l1', 1), wDn = ctx.wordTime('l1', 3);
    const kUp = at(t, wUp.s - .1, wUp.s + 1.1, 'expoOut'), kDn = at(t, wDn.s - .1, wDn.s + 1.0, 'expoOut');
    const kIn = at(lt, 0, .5, 'cubicOut');
    const hUp = .4 + 2.8 * kUp, hDn = (2.4 - 1.95 * kDn) * kIn + .01;
    this.up.scale.set(1, hUp, 1); this.up.position.set(-1.3, this.base + hUp / 2, 0);
    this.dn.scale.set(1, hDn, 1); this.dn.position.set(1.3, this.base + hDn / 2, 0);
    this.st.orbit(-.12 + .2 * E.sineInOut(ctx.prog(lt, 0, 5.4)), .07, 16.6, [0, .6, 0]);
    this.st.camera.updateMatrixWorld();
    this.st.draw(X);
    { const [bx0, by] = this.scr(-2.4, this.base, .6), [bx1] = this.scr(2.4, this.base, .6), kb = at(lt, 0, .5, 'cubicOut'); ctx.drawPath(X, [[bx0, by], [bx1, by]], kb, { width: 4, color: P.mut, cap: 'round' }); }

    // «لماذا»
    const w0 = ctx.wordTime('l1', 0), k0 = at(t, w0.s - .12, w0.s + .25, 'expoOut');
    ctx.text(X, 'لماذا', 540, 300 + (1 - k0) * 50, { family: 'display', weight: 900, size: 150, color: P.ink, alpha: k0 });

    // labels ride on top of each bar
    const [ux, uy] = this.scr(-1.3, this.base + hUp, 0), [dx, dy] = this.scr(1.3, this.base + hDn, 0);
    const lab = (s, x, y, c, w, i0, i1) => {
      const L = ctx.text.layout(X, s, { family: 'body', weight: 700, size: 60 });
      ctx.text.drawLayout(X, L, x, y, { color: c, perWord: i => { const wt = ctx.wordTime('l1', [i0, i1][i]), k = at(t, wt.s - .08, wt.s + .22, 'expoOut'); return { alpha: k, dy: (1 - k) * 26 }; } });
    };
    lab('تربح شركة', ux, uy - 46, P.hi, 0, 1, 2);
    lab('وتخسر أخرى', dx, dy - 46, P.clay, 0, 3, 4);
    // «في نفس السوق؟»
    const L = ctx.text.layout(X, 'في نفس السوق؟', { family: 'display', weight: 900, size: 104 });
    ctx.text.drawLayout(X, L, 540, 1475, { color: P.ink, perWord: i => { const w = ctx.wordTime('l1', 5 + i), k = at(t, w.s - .1, w.s + .22, 'expoOut'); return { alpha: k, dy: (1 - k) * 80 }; } });
    const wl = ctx.wordTime('l1', 7), ku = at(t, wl.s + .1, wl.s + .55, 'cubicInOut');
    if (ku > 0) ctx.drawPath(X, [[820, 1515], [540, 1522], [260, 1512]], ku, { width: 9, color: P.mut, cap: 'round' });
  } });
