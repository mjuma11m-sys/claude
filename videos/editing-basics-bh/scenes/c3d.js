// camera move demo: Orbit
import '../lib.js'; const BH = globalThis.BH;
MOTION.scene({ id: 'c3d',
  setup(ctx) { Object.assign(this, BH.set3D(ctx)); },
  draw(t, lt, ctx) {
    const { X, P, at, E } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    BH.chip(ctx, lt, 3, 'حركات الكاميرا'); BH.head(ctx, lt, 'Orbit', 'تدور حول الشي');
    const kf = BH.frame(ctx, lt), k = E.sineInOut(ctx.prog(lt, .5, 3.6));
    let cam, look, trail = [];
    const az = 3.77 * k, d = 12; cam = [d * Math.sin(az), 2.4, d * Math.cos(az)]; look = [0, 1.2, 0]; for (let i = 0; i <= 24; i++) { const a = 3.77 * k * i / 24; trail.push([d * Math.sin(a), d * Math.cos(a)]); }
    this.st.camera.position.set(cam[0], cam[1], cam[2]); this.st.camera.lookAt(look[0], look[1], look[2]);
    this.subj.rotation.y = lt * .4;
    BH.clip(X); this.st.draw(X, { y: -130, alpha: kf }); X.restore();
    BH.viewfinder(ctx, lt, kf);
    BH.minimap(ctx, kf, [cam[0], cam[2]], [look[0], look[2]], trail);
    BH.explain(ctx, lt, 'تعطيه هيبة وحجم', 'أول ثانيتين من الريل', { t0: 1.2, hi1: [1] });
  } });
