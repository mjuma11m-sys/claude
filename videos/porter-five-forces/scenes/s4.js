// s4 — pressure: five forces push in, the profit coin shrinks
const C4 = [540, 870];
MOTION.scene({ id: 's4',
  setup(ctx) {
    const { THREE, P } = ctx;
    this.st = ctx.stage3D({ fov: 30, camera: [0, 0, 12], env: 'room', tone: 'neutral' });
    const gold = new THREE.MeshPhysicalMaterial({ color: P.acc, metalness: .85, roughness: .28, clearcoat: .4, envMapIntensity: 1.1 });
    this.coin = new THREE.Mesh(new THREE.CylinderGeometry(.62, .62, .16, 64), gold); this.coin.rotation.x = Math.PI / 2;
    this.g = new THREE.Group(); this.g.add(this.coin); this.g.position.set(0, (960 - C4[1]) / 298.6, 0); this.st.add(this.g);
    const key = new THREE.DirectionalLight('#ffffff', 1.6); key.position.set(-3, 4, 6); this.st.add(key);
  },
  draw(t, lt, ctx) {
    const { X, P, at } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);

    const wPress = ctx.wordTime('l8', 1), wDrop = ctx.wordTime('l8', 3);
    const press = at(t, wPress.s - .1, ctx.wordTime('l8', 2).e, 'cubicInOut');      // arrows advance on «اشتدت القوى»
    const drop = at(t, wDrop.s - .05, wDrop.s + .6, 'expoOut');                      // coin shrinks on «قلّت»
    const scale = 1.25 - .7 * drop, rCoin = 186 * scale;
    const shake = drop > 0 && drop < 1 ? (ctx.noise1(t * 40, 3) - .5) * 14 * (1 - drop) : 0;

    // arrows from outside
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * 2 * Math.PI / 5, ux = Math.cos(a), uy = Math.sin(a);
      const kin = at(lt, .05 + i * .05, .35 + i * .05, 'expoOut'); if (kin <= 0) continue;
      const r0 = 470 - 90 * press, r1 = rCoin + 26 + 60 * (1 - press) + 8 * ctx.beatPulse(t, 10);
      const p0 = [C4[0] + ux * r0, C4[1] + uy * r0], p1 = [C4[0] + ux * r1, C4[1] + uy * r1];
      ctx.drawPath(X, [p0, p1], kin, { width: 12 + 8 * press, color: P.clay, cap: 'round' });
      if (kin > .95) { X.save(); X.translate(p1[0], p1[1]); X.rotate(a + Math.PI); X.fillStyle = P.clay; X.beginPath(); X.moveTo(12, 0); X.lineTo(-24, -20 - 6 * press); X.lineTo(-24, 20 + 6 * press); X.closePath(); X.fill(); X.restore(); }
    }

    // coin
    this.g.scale.setScalar(scale); this.g.position.x = shake / 298.6;
    this.coin.rotation.z = .3 * Math.sin(lt * 2);
    this.g.rotation.set(.15 * Math.sin(lt * 1.1), .45 * Math.sin(lt * 1.4), 0);
    this.st.draw(X);
    ctx.text(X, 'الربح', C4[0] + shake, C4[1] + 26 * scale, { family: 'display', weight: 900, size: 76 * scale, color: P.bg });

    // «كلما اشتدت القوى»
    const L = ctx.text.layout(X, 'كلما اشتدت القوى', { family: 'display', weight: 900, size: 92 });
    ctx.text.drawLayout(X, L, 540, 330, { color: P.ink, perWord: i => { const w = ctx.wordTime('l8', i), k = at(t, w.s - .1, w.s + .22, 'expoOut'); return { alpha: k, dy: (1 - k) * 70, color: i === 1 ? P.clay : P.ink }; } });
    // «قلّت الأرباح» — «الأرباح» shrinks with the coin
    const L2 = ctx.text.layout(X, 'قلّت الأرباح', { family: 'display', weight: 900, size: 120 });
    ctx.text.drawLayout(X, L2, 540, 1460, { color: P.ink, perWord: i => { const w = ctx.wordTime('l8', 3 + i), k = at(t, w.s - .1, w.s + .22, 'expoOut');
      return { alpha: k, dy: (1 - k) * 50, color: i === 1 ? P.acc : P.ink, scale: i === 1 ? 1 - .32 * at(t, w.s + .1, w.s + .7, 'expoOut') : 1 }; } });
  } });
