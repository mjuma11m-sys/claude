import { BOOTS, makeBoot, makeGlove, pitchTexture, night, lights, chip, callout, project, disclaimer } from './_kit.js';
// one scene per position: badge → item enters & spins → callout 1 → flip → callout 2 → exit
export function positionScene(id) {
  const B = BOOTS[id];
  MOTION.scene({ id,
    setup(ctx) { const { THREE } = ctx;
      this.st = ctx.stage3D({ fov: 30, camera: [0, 3.2, 14], lookAt: [0, .2, 0], env: 'room', tone: 'neutral', exposure: B.glove ? .7 : .85, bloom: { strength: .22, radius: .5, threshold: 2.4 } });
      const tex = pitchTexture(THREE); const pitch = new THREE.Mesh(new THREE.PlaneGeometry(14, 28), new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0, envMapIntensity: 0 }));
      pitch.rotation.x = -Math.PI / 2; pitch.position.y = -.28; this.st.add(pitch);
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.75, 1.88, 64), new THREE.MeshBasicMaterial({ color: '#C6FF3D', transparent: true, opacity: .9 })); ring.rotation.x = -Math.PI / 2; ring.position.y = -.26; this.ring = ring; this.st.add(ring);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1.75, 64), new THREE.MeshBasicMaterial({ color: '#C6FF3D', transparent: true, opacity: .1 })); disc.rotation.x = -Math.PI / 2; disc.position.y = -.27; this.st.add(disc);
      this.pivot = new THREE.Group(); this.item = new THREE.Group();
      if (B.glove) { const a = makeGlove(THREE, ctx.RoundedBoxGeometry, 1), b = makeGlove(THREE, ctx.RoundedBoxGeometry, -1); a.position.set(-.85, .75, 0); b.position.set(.85, .75, 0); a.rotation.z = .12; b.rotation.z = -.12; this.item.add(a, b); this.item.scale.setScalar(1.05); }
      else { this.boot = makeBoot(THREE, B); this.boot.position.set(-.1, 0, 0); this.item.add(this.boot); this.item.scale.setScalar(.95); }
      this.pivot.add(this.item); this.st.add(this.pivot);
      const key = new THREE.DirectionalLight('#ffffff', 1.5); key.position.set(3, 5, 6); this.st.add(key);
      const rim = new THREE.DirectionalLight('#C6FF3D', 1.1); rim.position.set(-4, 2, -3); this.st.add(rim);
      this.st.add(new THREE.AmbientLight('#8fb7a5', .35)); this.THREE = THREE; },
    draw(t, lt, ctx) { const { X, W, H, at } = ctx; const S = ctx.scene.start, D = ctx.scene.dur;
      night(ctx, .66); lights(ctx, t, 330);
      const enter = at(lt, .35, 1.15, 'expoOut'), exit = at(lt, D - .6, D - .1, 'cubicIn');
      const flip = at(lt, 3.05, 3.7, 'cubicInOut') - at(lt, 4.55, 5.2, 'cubicInOut');
      if (B.glove) this.pivot.rotation.set(0, (1 - enter) * -1.6 + Math.sin(lt * .8) * .25 + flip * Math.PI, 0);
      else this.pivot.rotation.set(flip * -1.15, ((1 - enter) * -1.6 + lt * .55) * (1 - flip * .8) - flip * .3, flip * -.35);
      this.pivot.position.set(0, (1 - enter) * 1.3 + exit * 1.6 + (B.glove ? 0 : flip * .55), (1 - enter) * -2 - exit * 2); this.pivot.scale.setScalar(.2 + .8 * enter);
      this.ring.material.opacity = .9 * enter * (1 - exit); this.ring.scale.setScalar(1 + .04 * ctx.beatPulse(t, 8));
      this.st.camera.position.set(0, B.glove ? 1.4 : 3.4, 14.6 - 1.4 * at(lt, 0, D, 'sineInOut')); this.st.camera.lookAt(0, .35, 0);
      this.pivot.updateMatrixWorld(true); this.st.draw(X);
      const k = at(lt, 0, .45, 'expoOut'), ko = 1 - at(lt, D - .35, D - .05);
      X.save(); X.globalAlpha = ko;
      ctx.text(X, B.label, 540, 330 + (1 - k) * -40, { family: 'display', weight: 900, size: B.label.length > 6 ? 150 : 190, color: '#F4F7F2', align: 'center', alpha: k, maxWidth: 900, shadow: { blur: 30, y: 6, color: 'rgba(0,0,0,.5)' } });
      chip(ctx, B.code, 540, 190, { alpha: k, scale: .85 + .15 * k });
      ctx.text(X, B.tag, 540, 450, { family: 'body', weight: 700, size: 60, color: '#C6FF3D', align: 'center', alpha: at(lt, .25, .65, 'expoOut') });
      X.restore();
      const THREE = this.THREE; const tgt = B.glove ? this.item : this.boot; const pt = (p) => project(this.st, tgt.localToWorld(new THREE.Vector3(...p)), W, H);
      const a = pt(B.p1), b = pt(B.p2);
      if (lt < 3.0) callout(ctx, t, S + 1.2, B.c1[0], B.c1[1], 540, 1260, a[0], a[1], S + 2.95);
      else callout(ctx, t, S + 3.55, B.c2[0], B.c2[1], 540, 1260, b[0], b[1], S + D - .55);
      disclaimer(ctx, ko);
    } });
}
