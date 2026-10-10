import { bg, rise, rr } from './_kit.js';
// REVEAL: 3D phone with the app → خلّ الفوضى علينا
MOTION.scene({ id: 's2',
  setup(ctx) {
    const { THREE, P } = ctx;
    this.st = ctx.stage3D({ fov: 30, camera: [0, 0, 22], env: 'room', tone: 'neutral', exposure: 1.0 });
    const body = new THREE.Mesh(new ctx.RoundedBoxGeometry(3.3, 6.8, 0.38, 6, 0.42),
      new THREE.MeshPhysicalMaterial({ color: '#1B2738', metalness: .7, roughness: .28, clearcoat: .6, envMapIntensity: .9 }));
    // screen UI drawn once
    const c = document.createElement('canvas'); c.width = 620; c.height = 1300; const S = c.getContext('2d');
    S.fillStyle = P.bg; S.fillRect(0, 0, 620, 1300);
    S.direction = 'rtl'; S.textAlign = 'center'; S.fillStyle = P.acc; S.font = '900 96px "Tajawal"'; S.fillText('إجاراتي', 310, 200);
    S.fillStyle = P.mut; S.font = '700 34px "Tajawal"'; S.fillText('عقارك كله بشاشة وحدة', 310, 262);
    const rows = [['إيجار هالشهر', 'مدفوع', P.acc], ['المستأجر الثاني', 'متأخر', '#F2B33D'], ['طلب صيانة', 'قيد التنفيذ', P.mut], ['المصروفات', 'محدّثة', P.acc]];
    rows.forEach((r, i) => { const y = 340 + i * 220;
      S.fillStyle = 'rgba(243,246,250,.07)'; S.beginPath(); S.roundRect(40, y, 540, 180, 28); S.fill();
      S.textAlign = 'right'; S.fillStyle = P.ink; S.font = '700 40px "Tajawal"'; S.fillText(r[0], 545, y + 78);
      S.fillStyle = 'rgba(135,150,171,.5)'; S.fillRect(305, y + 112, 240, 12);
      S.fillStyle = r[2]; S.beginPath(); S.roundRect(70, y + 52, 180, 64, 32); S.fill();
      S.textAlign = 'center'; S.fillStyle = P.bg; S.font = '700 32px "Tajawal"'; S.fillText(r[1], 160, y + 95); });
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 6.3), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    screen.position.z = 0.195;
    this.phone = new THREE.Group(); this.phone.add(body, screen); this.st.add(this.phone);
    const r = ctx.rng('suck');
    this.bits = Array.from({ length: 22 }, () => ({ a: r.range(0, 6.28), d: r.range(500, 900), w: r.range(60, 110), rot: r.range(-2, 2), dl: r.range(0, .25) }));
  },
  draw(t, lt, ctx) {
    const { X, P, at, E } = ctx;
    bg(ctx, t, 0.5);
    // papers get pulled into the phone
    for (const b of this.bits) { const k = at(lt, b.dl, b.dl + .6, 'cubicIn'); if (k >= 1) continue;
      const d = b.d * (1 - k); X.save(); X.globalAlpha = .45 * (1 - k); X.translate(540 + Math.cos(b.a) * d, 960 + Math.sin(b.a) * d * 1.3); X.rotate(b.rot * (1 - k) + k * 4);
      X.scale(1 - k * .8, 1 - k * .8); X.fillStyle = P.ink; rr(X, -b.w / 2, -b.w * .65, b.w, b.w * 1.3, 6); X.fill(); X.restore(); }
    const k = at(lt, .15, 1.05, 'expoOut');
    this.phone.position.set(0, 0.05 + (1 - k) * -10, 0);
    this.phone.rotation.set(.12 * (1 - k) + .05 * Math.sin(lt * 1.3), -1.4 * (1 - k) + .22 * Math.sin(lt * .9), -.25 * (1 - k));
    this.phone.scale.setScalar(.75 + .25 * k);
    this.st.draw(X);
    const S = ctx.scene.start;
    rise(ctx, t, 'خلّ الفوضى علينا', 540, 300, S + .55, { size: 104, color: P.ink });
    rise(ctx, t, 'كل عقارك… بشاشة وحدة', 540, 1500, S + 1.2, { size: 64, weight: 700, family: 'body', color: P.acc });
  } });
