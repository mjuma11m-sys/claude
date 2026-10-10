import { paint, rise } from './_kit.js';
// SHINE: 3D glossy black + gold, light sweep
MOTION.scene({ id: 'w4',
  setup(ctx) {
    const { THREE, P } = ctx;
    this.st = ctx.stage3D({ fov: 28, camera: [0, 0, 19], env: 'room', tone: 'neutral', exposure: 1.05 });
    this.obj = new THREE.Mesh(new THREE.SphereGeometry(2.6, 96, 64), new THREE.MeshPhysicalMaterial({ color: '#050506', metalness: .2, roughness: .06, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1.6 }));
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(3.3, .06, 24, 160), new THREE.MeshPhysicalMaterial({ color: P.acc, metalness: 1, roughness: .2, envMapIntensity: 1.4 }));
    this.st.add(this.obj); this.st.add(this.ring);
    this.light = new THREE.PointLight('#ffffff', 60, 30); this.st.add(this.light);
  },
  draw(t, lt, ctx) {
    const { X, P, at } = ctx; const S = ctx.scene.start;
    const sweep = at(lt, .3, 2.2, 'cubicInOut');
    paint(ctx, t, sweep, .5);
    const k = at(lt, 0, .8, 'expoOut');
    this.obj.scale.setScalar(.85 + .15 * k); this.obj.rotation.y = lt * .4;
    this.ring.rotation.set(1.15 + .1 * Math.sin(lt), lt * .5, .3); this.ring.scale.setScalar(.6 + .4 * k);
    this.light.position.set(-8 + 16 * sweep, 4 - 2 * sweep, 7);
    this.st.camera.position.set(0, .9, 19); this.st.camera.lookAt(0, .9, 0);
    this.st.draw(X, { alpha: k });
    rise(ctx, t, 'لمعة تحسّ فيها', 540, 360, S + .35, { size: 120, color: P.ink });
    rise(ctx, t, 'قبل لا تشوفها', 540, 490, S + .6, { size: 120, color: P.acc });
    rise(ctx, t, 'وحماية لطلائك والـ PPF', 540, 610, S + 1.4, { size: 62, weight: 700, family: 'body', color: P.mut });
  } });
