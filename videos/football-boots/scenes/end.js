import { BOOTS, makeBoot, makeGlove, pitchTexture, night, lights, chip, disclaimer } from './_kit.js';
// closing: all four boots in a row, then the question
MOTION.scene({ id: 'end',
  setup(ctx) { const { THREE } = ctx;
    this.st = ctx.stage3D({ fov: 30, camera: [0, 4.2, 15], lookAt: [0, .3, 0], env: 'room', tone: 'neutral', bloom: { strength: .35, radius: .5, threshold: 2.4 } });
    const pitch = new THREE.Mesh(new THREE.PlaneGeometry(20, 28), new THREE.MeshStandardMaterial({ map: pitchTexture(THREE), roughness: 1, envMapIntensity: 0 })); pitch.rotation.x = -Math.PI / 2; pitch.position.y = -.28; this.st.add(pitch);
    this.boots = ['st', 'wg', 'cm', 'cb'].map((id, i) => { const b = makeBoot(THREE, BOOTS[id], { scale: .42 }); b.position.set(0, 0, 0); this.st.add(b); return b; });
    this.gl = new THREE.Group(); const ga = makeGlove(THREE, ctx.RoundedBoxGeometry, 1), gb = makeGlove(THREE, ctx.RoundedBoxGeometry, -1); ga.position.x = -.62; gb.position.x = .62; this.gl.add(ga, gb); this.st.add(this.gl);
    this.st.add(new THREE.AmbientLight('#8fb7a5', .55)); const k = new THREE.DirectionalLight('#fff', 2.2); k.position.set(3, 5, 5); this.st.add(k); const r = new THREE.DirectionalLight('#C6FF3D', 1.4); r.position.set(-4, 2, -3); this.st.add(r); },
  draw(t, lt, ctx) { const { X, at } = ctx; night(ctx, .62); lights(ctx, t, 300);
    this.boots.forEach((b, i) => { const k = at(lt, .15 + i * .15, .8 + i * .15, 'expoOut'); const ang = -.55;
      b.position.set((i % 2 ? 1.15 : -1.15) + (i % 2 ? 1 : -1) * (1 - k) * 2.5, (1 - k) * 2.2, (i < 2 ? -3.2 : -1.0) - (1 - k) * 2); b.rotation.set(0, ang + lt * .12 * (i % 2 ? -1 : 1) + (1 - k) * 1.2, 0); b.scale.setScalar(.42 * (.3 + .7 * k)); });
    const gk = at(lt, .75, 1.4, 'expoOut'); this.gl.position.set(0, .55 + (1 - gk) * 2.2, 1.5 - (1 - gk) * 3); this.gl.scale.setScalar(.45 * (.3 + .7 * gk)); this.gl.rotation.y = (1 - gk) * 1.2;
    this.st.camera.position.set(0, 4.4 - .3 * at(lt, 0, 2), 15 - 1.2 * at(lt, 0, 3)); this.st.camera.lookAt(0, -.1, -.9); this.st.draw(X);
    const a = at(lt, 1.2, 1.7, 'expoOut'), c = at(lt, 1.8, 2.3, 'expoOut');
    ctx.text(X, 'وش مركزك؟', 540, 330 - (1 - a) * 40, { family: 'display', weight: 900, size: 170, color: '#F4F7F2', align: 'center', alpha: a, shadow: { blur: 30, y: 8, color: 'rgba(0,0,0,.6)' } });
    ctx.text(X, 'اكتبه بالتعليقات', 540, 480 - (1 - c) * 40, { family: 'display', weight: 900, size: 100, color: '#C6FF3D', align: 'center', alpha: c });
    disclaimer(ctx, c);
  } });
