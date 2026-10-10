// camera move demo: Pull Out
import '../lib.js'; const BH = globalThis.BH;
MOTION.scene({ id: 'c3b',
  setup(ctx) { Object.assign(this, BH.set3D(ctx)); },
  draw(t, lt, ctx) {
    const { X, P, at, E } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    BH.chip(ctx, lt, 3, 'حركات الكاميرا'); BH.head(ctx, lt, 'Pull Out', 'ترجع لورا');
    const kf = BH.frame(ctx, lt), k = E.sineInOut(ctx.prog(lt, .5, 3.6));
    let cam, look, trail = [];
    const z = 4.5 + 19.5 * k; cam = [0, 1.6 + 1.6 * k, z]; look = [0, 1.1, 0]; trail = [[0, 4.5], [0, z]];
    this.st.camera.position.set(cam[0], cam[1], cam[2]); this.st.camera.lookAt(look[0], look[1], look[2]);
    this.subj.rotation.y = lt * .4;
    BH.clip(X); this.st.draw(X, { y: -130, alpha: kf }); X.restore();
    BH.viewfinder(ctx, lt, kf);
    BH.minimap(ctx, kf, [cam[0], cam[2]], [look[0], look[2]], trail);
    BH.explain(ctx, lt, 'تكشف الصورة كاملة', 'حلوة للمفاجأة', { t0: 1.2, hi1: [1] });
  } });
