import '../lib.js'; const BH = globalThis.BH;
MOTION.scene({ id: 'c3t', draw(t, lt, ctx) { ctx.X.fillStyle = ctx.P.bg; ctx.X.fillRect(0, 0, ctx.W, ctx.H); BH.chapter(ctx, lt, 3, 'حركات الكاميرا', 'CAMERA MOVES'); } });
