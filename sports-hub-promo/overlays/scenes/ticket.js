// Fan Zone: holographic 3D VIP pass materializes after a face scan and turns slowly.
MOTION.scene({
  id: 'ticket',
  setup(ctx) {
    const { THREE, P } = ctx;
    this.st = ctx.stage3D({ fov: 30, camera: [0, 0, 14], background: null, env: 'room', tone: 'neutral',
      bloom: { strength: 0.9, radius: 0.55, threshold: 1.3 } });

    // card face texture
    const cw = 680, ch = 1040, cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const Y = cv.getContext('2d');
    Y.fillStyle = 'rgba(6,20,28,0.92)'; Y.beginPath(); Y.roundRect(0, 0, cw, ch, 48); Y.fill();
    Y.fillStyle = P.clay; Y.fillRect(0, 0, cw * 0.62, 18);
    Y.fillStyle = P.hi; Y.fillRect(cw * 0.62, 0, cw * 0.38, 18);
    ctx.text(Y, 'SPORTS HUB', 60, 120, { family: 'num', weight: 800, size: 46, color: P.ink, align: 'left', dir: 'ltr', letterSpacing: 8 });
    ctx.text(Y, 'FAN ZONE', 60, 170, { family: 'num', weight: 600, size: 26, color: P.acc, align: 'left', dir: 'ltr', letterSpacing: 10 });
    ctx.text(Y, 'VIP', cw / 2, 470, { family: 'num', weight: 900, size: 250, color: P.hi, align: 'center', dir: 'ltr' });
    ctx.text(Y, 'PASS', cw / 2, 560, { family: 'num', weight: 700, size: 64, color: P.ink, align: 'center', dir: 'ltr', letterSpacing: 30 });
    ctx.text(Y, 'تذكرة كبار الشخصيات', cw / 2, 640, { family: 'body', weight: 700, size: 38, color: P.mut, align: 'center' });
    // abstract QR block
    const r = ctx.rng('qr'), q = 13, qs = 16, qx = (cw - q * qs) / 2, qy = 720;
    Y.fillStyle = P.ink;
    for (let i = 0; i < q; i++) for (let j = 0; j < q; j++) {
      const finder = (i < 3 && j < 3) || (i > q - 4 && j < 3) || (i < 3 && j > q - 4);
      if (finder || r() > 0.52) Y.fillRect(qx + i * qs, qy + j * qs, qs - 2, qs - 2);
    }
    Y.setLineDash([10, 10]); Y.strokeStyle = 'rgba(0,229,255,0.5)'; Y.lineWidth = 3;
    Y.beginPath(); Y.moveTo(40, 680); Y.lineTo(cw - 40, 680); Y.stroke();
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;

    const W = 3.4, H = 5.2;
    this.card = new THREE.Group();
    const glass = new THREE.Mesh(new ctx.RoundedBoxGeometry(W + 0.12, H + 0.12, 0.08, 6, 0.24),
      new THREE.MeshPhysicalMaterial({ color: '#0a2a36', roughness: 0.12, metalness: 0.3, clearcoat: 1, transparent: true, opacity: 0.55, envMapIntensity: 0.6 }));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
    face.position.z = 0.05;
    const back = face.clone(); back.rotation.y = Math.PI; back.position.z = -0.05;
    // neon edge (HDR so bloom catches only this)
    const edgeShape = new THREE.Shape(); const rr = 0.3, w2 = W / 2 + 0.08, h2 = H / 2 + 0.08;
    edgeShape.moveTo(-w2 + rr, -h2); edgeShape.lineTo(w2 - rr, -h2); edgeShape.quadraticCurveTo(w2, -h2, w2, -h2 + rr);
    edgeShape.lineTo(w2, h2 - rr); edgeShape.quadraticCurveTo(w2, h2, w2 - rr, h2); edgeShape.lineTo(-w2 + rr, h2);
    edgeShape.quadraticCurveTo(-w2, h2, -w2, h2 - rr); edgeShape.lineTo(-w2, -h2 + rr); edgeShape.quadraticCurveTo(-w2, -h2, -w2 + rr, -h2);
    const edge = new THREE.Line(new THREE.BufferGeometry().setFromPoints(edgeShape.getPoints(80)),
      new THREE.LineBasicMaterial({ color: new THREE.Color(P.acc).multiplyScalar(2.6), toneMapped: false }));
    edge.position.z = 0.06;
    this.card.add(glass, face, back, edge);
    this.mats = [glass.material, face.material, edge.material];
    this.st.add(this.card);

    this.sparks = ctx.particles3D({ count: 160, seed: 7, geometry: 'octa', glow: 2.4, color: P.acc,
      spawn: (i, r) => { const a = r() * 6.283, d = r.range(2.6, 4.2);
        return { p: [Math.cos(a) * d, r.range(-3.2, -1), Math.sin(a) * d * 0.5], v: [0, r.range(0.4, 1.1), 0], s: r.range(0.03, 0.07), delay: r.range(0.2, 1.4), life: r.range(1.6, 3) }; } });
    this.st.add(this.sparks.mesh);
  },
  draw(t, lt, ctx) {
    const { X, P, at } = ctx;
    X.fillStyle = '#000'; X.fillRect(0, 0, ctx.W, ctx.H);
    const out = 1 - at(lt, 5.2, 5.5, 'cubicIn');

    // materialize: fade + slight scale, scan bar sweeps bottom → top
    const k = at(lt, 0.15, 0.9, 'expoOut');
    this.mats[0].opacity = 0.55 * k * out; this.mats[1].opacity = k * out; this.mats[2].opacity = k * out;
    this.mats.forEach(m => m.transparent = true);
    this.card.scale.setScalar(0.95 + 0.05 * k);
    this.card.rotation.y = -0.9 + 0.9 * at(lt, 0.15, 1.6, 'cubicOut') + 0.22 * Math.sin(lt * 0.9);
    this.card.rotation.x = 0.06 * Math.sin(lt * 0.7);
    this.card.position.y = 0.12 * Math.sin(lt * 1.3);
    this.sparks.update(lt);
    this.st.draw(X, { alpha: out });

    const ks = at(lt, 0.1, 0.95, 'cubicInOut');
    if (ks > 0 && ks < 1) {
      const y = 1010 - ks * 940;
      const g = X.createLinearGradient(0, y, 0, y + 90);
      g.addColorStop(0, 'rgba(0,229,255,0.45)'); g.addColorStop(1, 'rgba(0,229,255,0)');
      X.fillStyle = g; X.fillRect(640, y, 640, 90);
      X.fillStyle = P.acc; X.fillRect(640, y - 2, 640, 3);
    }

    // verified chip
    const kc = at(lt, 1.3, 1.6, 'expoOut');
    X.globalAlpha = out * kc;
    const bx = 1340, by = 470 + (1 - kc) * 12;
    X.beginPath(); X.roundRect(bx, by, 330, 70, 35); X.fillStyle = 'rgba(0,229,255,0.12)'; X.fill();
    X.strokeStyle = P.acc; X.lineWidth = 2; X.stroke();
    ctx.drawPath(X, [[bx + 30, by + 36], [bx + 44, by + 50], [bx + 70, by + 22]], at(lt, 1.45, 1.7, 'cubicOut'), { width: 6, color: P.acc });
    ctx.text(X, 'FACE VERIFIED', bx + 95, by + 45, { family: 'num', weight: 700, size: 24, color: P.ink, align: 'left', dir: 'ltr', letterSpacing: 3 });
  },
});
