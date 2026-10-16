import { pitchTexture, night, lights, chip } from './_kit.js';
// hook: pitch from above, 4 position nodes light up one by one, title lands
MOTION.scene({ id: 'hook',
  setup(ctx) { const { THREE } = ctx;
    this.st = ctx.stage3D({ fov: 40, camera: [0, 6, 15], lookAt: [0, 0, -2], env: 'room', tone: 'neutral', bloom: { strength: .4, radius: .5, threshold: 1.7 } });
    const pitch = new THREE.Mesh(new THREE.PlaneGeometry(10, 22), new THREE.MeshStandardMaterial({ map: pitchTexture(THREE), roughness: 1, envMapIntensity: 0 }));
    pitch.rotation.x = -Math.PI / 2; this.st.add(pitch);
    this.st.add(new THREE.AmbientLight('#cfe9dc', .8)); const dl = new THREE.DirectionalLight('#fff', 1.6); dl.position.set(2, 6, 3); this.st.add(dl);
    this.nodes = [['st', 0, -9.4], ['wg', -2.8, -6.4], ['cm', 0, -3.4], ['cb', 0, -.4], ['gk', 0, 2.6]].map(([id, x, z]) => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(.55, 40), new THREE.MeshBasicMaterial({ color: '#C6FF3D', transparent: true, opacity: 0 })); m.rotation.x = -Math.PI / 2; m.position.set(x, .02, z);
      const r = new THREE.Mesh(new THREE.RingGeometry(.7, .8, 48), new THREE.MeshBasicMaterial({ color: '#E4FF9A', transparent: true, opacity: 0 })); r.rotation.x = -Math.PI / 2; r.position.set(x, .03, z);
      this.st.add(m); this.st.add(r); return { id, m, r, x, z }; }); this.THREE = THREE; },
  draw(t, lt, ctx) { const { X, W, H, at } = ctx; const ko = 1 - at(lt, 2.7, 3.0);
    night(ctx, .6);
    this.st.camera.position.set(0, 7 - 1.2 * at(lt, 0, 3, 'cubicInOut'), 15 - 1.5 * at(lt, 0, 3)); this.st.camera.lookAt(0, 0, -2.2);
    this.nodes.forEach((n, i) => { const k = at(lt, .8 + i * .3, 1.1 + i * .3, 'expoOut'); const p = .5 + .5 * Math.sin(lt * 6 - i);
      n.m.material.opacity = .85 * k; n.r.material.opacity = k * (.5 + .5 * p); n.r.scale.setScalar(1 + .18 * p); });
    this.st.draw(X); const tk = at(lt, .05, .6, 'expoOut');
    chip(ctx, 'FOOTBALL', 540, 190, { size: 38, alpha: tk, scale: .9 + .1 * tk });
    ctx.text(X, 'عدّتك', 540, 400 - (1 - tk) * 50, { family: 'display', weight: 900, size: 210, color: '#F4F7F2', align: 'center', alpha: tk, shadow: { blur: 30, y: 8, color: 'rgba(0,0,0,.6)' } });
    const wk = at(lt, .25, .6, 'expoOut'), mk = at(lt, .6, .9, 'backOut'); ctx.text(X, 'حسب', 860, 590 - (1 - wk) * 50, { family: 'display', weight: 900, size: 130, color: '#F4F7F2', align: 'center', alpha: wk });
    ctx.text(X, 'مركزك', 370, 590 - (1 - mk) * 50, { family: 'display', weight: 900, size: 190 * (.7 + .3 * mk), color: '#C6FF3D', align: 'center', alpha: mk > 0 ? 1 : 0, shadow: { blur: 30, y: 8, color: 'rgba(0,0,0,.6)' } });
    // position chips next to nodes
    const names = { st: 'مهاجم', wg: 'جناح', cm: 'وسط', cb: 'مدافع', gk: 'حارس' };
    this.nodes.forEach((n, i) => { const k = at(lt, 1.1 + i * .3, 1.4 + i * .3, 'expoOut'); if (k <= 0) return;
      const v = new this.THREE.Vector3(n.x, 0, n.z).project(this.st.camera); const px = (v.x * .5 + .5) * W, py = (-v.y * .5 + .5) * H;
      ctx.text(X, names[n.id], px, py - 60, { family: 'display', weight: 900, size: 50, color: '#F4F7F2', align: 'center', alpha: k, shadow: { blur: 12, y: 3, color: 'rgba(0,0,0,.7)' } }); });
  } });
