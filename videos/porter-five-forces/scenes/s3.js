// s3 — the five forces build a pentagon around the profit coin, one per line
const C3 = [540, 840], R3 = 330;
const FORCES = [
  { line: 'l3', label: ['المنافسة', 'الحالية'] },
  { line: 'l4', label: ['الداخلون', 'الجدد'] },
  { line: 'l5', label: ['قوة', 'الموردين'] },
  { line: 'l6', label: ['قوة', 'المشترين'] },
  { line: 'l7', label: ['تهديد', 'البدائل'] },
].map((f, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return { ...f, a, x: C3[0] + R3 * Math.cos(a), y: C3[1] + R3 * Math.sin(a) }; });

MOTION.scene({ id: 's3',
  setup(ctx) {
    const { THREE, P } = ctx;
    this.st = ctx.stage3D({ fov: 30, camera: [0, 0, 12], env: 'room', tone: 'neutral' });
    const gold = new THREE.MeshPhysicalMaterial({ color: P.acc, metalness: .85, roughness: .28, clearcoat: .4, envMapIntensity: 1.1 });
    this.coin = new THREE.Mesh(new THREE.CylinderGeometry(.62, .62, .16, 64), gold);
    this.coinG = new THREE.Group(); this.coinG.add(this.coin); this.coin.rotation.x = Math.PI / 2;
    this.coinG.position.set(0, (960 - C3[1]) / 298.6, 0); this.st.add(this.coinG);
    const key = new THREE.DirectionalLight('#ffffff', 1.6); key.position.set(-3, 4, 6); this.st.add(key);
  },
  draw(t, lt, ctx) {
    const { X, P, at, E } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    // dotted backdrop
    X.save(); X.fillStyle = P.ink; X.globalAlpha = .06;
    for (let y = 400; y <= 1300; y += 52) for (let x = 72; x <= 1008; x += 52) { X.beginPath(); X.arc(x, y, 2.4, 0, 6.283); X.fill(); }
    X.restore();

    // header
    const kh = at(lt, 0, .4, 'expoOut');
    ctx.text(X, "PORTER'S FIVE FORCES", 540, 232, { family: 'num', weight: 700, size: 30, color: P.mut, letterSpacing: 6, alpha: kh, dir: 'ltr' });
    ctx.text(X, 'القوى الخمس', 540, 312 + (1 - kh) * 30, { family: 'display', weight: 900, size: 72, color: P.ink, alpha: kh });

    // pentagon outline grows as forces arrive
    const st = FORCES.map(f => ctx.lineSpan(f.line).s);
    X.save(); X.strokeStyle = P.ink; X.globalAlpha = .14; X.lineWidth = 3; X.setLineDash([10, 12]);
    for (let i = 1; i < 5; i++) { const k = at(t, st[i] - .2, st[i] + .3, 'cubicOut'); if (k <= 0) continue; const a = FORCES[i - 1], b = FORCES[i];
      X.beginPath(); X.moveTo(a.x, a.y); X.lineTo(lerp(a.x, b.x, k), lerp(a.y, b.y, k)); X.stroke(); }
    const kc = at(t, st[4] + .4, st[4] + .9, 'cubicOut'); if (kc > 0) { const a = FORCES[4], b = FORCES[0]; X.beginPath(); X.moveTo(a.x, a.y); X.lineTo(lerp(a.x, b.x, kc), lerp(a.y, b.y, kc)); X.stroke(); }
    X.restore();
    function lerp(a, b, k) { return a + (b - a) * k; }

    // active force = last one that started
    let act = -1; st.forEach((s, i) => { if (t >= s - .15) act = i; });

    // arrows (under the coin)
    let hit = 0;
    FORCES.forEach((f, i) => {
      const k = at(t, st[i] + .05, st[i] + .5, 'cubicInOut'); if (k <= 0) return;
      hit = Math.max(hit, Math.exp(-Math.max(0, t - (st[i] + .5)) * 7) * (t >= st[i] + .5 ? 1 : 0));
      const dx = C3[0] - f.x, dy = C3[1] - f.y, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
      const p0 = [f.x + ux * 66, f.y + uy * 66], p1 = [C3[0] - ux * 132, C3[1] - uy * 132];
      const col = i === act ? P.acc : P.mut;
      const tip = ctx.drawPath(X, [p0, p1], k, { width: i === act ? 9 : 6, color: col, cap: 'round' });
      if (k > .95) { X.save(); X.translate(p1[0], p1[1]); X.rotate(Math.atan2(uy, ux)); X.fillStyle = col; X.beginPath(); X.moveTo(8, 0); X.lineTo(-18, -14); X.lineTo(-18, 14); X.closePath(); X.fill(); X.restore(); }
    });

    // coin
    const kin = at(lt, .1, .7, 'expoOut');
    this.coinG.scale.setScalar((.94 + .06 * kin) * (1 + .07 * hit));
    this.coin.rotation.z = .35 * Math.sin(lt * 1.6);
    this.coinG.rotation.set(.18 * Math.sin(lt * .9), .5 * Math.sin(lt * 1.2), 0);
    this.st.draw(X, { alpha: kin });
    ctx.text(X, 'الربح', C3[0], C3[1] + 22, { family: 'display', weight: 900, size: 64, color: P.bg, alpha: kin });

    // nodes + labels
    FORCES.forEach((f, i) => {
      const k = at(t, st[i] - .2, st[i] + .1, 'expoOut'); if (k <= 0) return;
      const on = i === act, s = .92 + .08 * k;
      X.save(); X.globalAlpha = k; X.translate(f.x, f.y); X.scale(s, s);
      X.beginPath(); X.arc(0, 0, 56, 0, 6.283);
      if (on) { X.fillStyle = P.acc; X.fill(); } else { X.fillStyle = P.bg; X.fill(); X.strokeStyle = P.ink; X.globalAlpha = k * .55; X.lineWidth = 4; X.stroke(); X.globalAlpha = k; }
      X.restore();
      ctx.text(X, String(i + 1), f.x, f.y + 22, { family: 'num', weight: 900, size: 60, color: on ? P.bg : P.ink, alpha: k });
      const above = i === 0, ly = above ? f.y - 122 : f.y + 112;
      f.label.forEach((w, j) => ctx.text(X, w, f.x, ly + j * 50 + (1 - k) * 20, { family: 'body', weight: 700, size: 44, color: on ? P.acc : P.ink, alpha: k * (on ? 1 : .8) }));
    });

    // caption (spoken line, active word highlighted)
    if (act >= 0) {
      const id = FORCES[act].line, sp = ctx.lineSpan(id);
      const L = ctx.text.layout(X, sp.text, { family: 'body', weight: 700, size: 54, maxWidth: 880 });
      const kout = act === 4 ? 1 - at(t, sp.e + .2, sp.e + .45) : 1;
      ctx.text.drawLayout(X, L, 540, 1440, { color: P.ink, perWord: i => { const w = ctx.wordTime(id, i), k = at(t, w.s - .08, w.s + .16, 'expoOut'), live = t >= w.s - .04 && t < w.e + .08;
        return { alpha: k * kout, dy: (1 - k) * 24, color: live ? P.acc : P.ink }; } });
    }
  } });
