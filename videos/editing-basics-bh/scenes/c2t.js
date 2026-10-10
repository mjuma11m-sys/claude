import '../lib.js'; const BH = globalThis.BH;
MOTION.scene({ id: 'c2t', draw(t, lt, ctx) { ctx.X.fillStyle = ctx.P.bg; ctx.X.fillRect(0, 0, ctx.W, ctx.H); BH.chapter(ctx, lt, 2, 'الانتقالات', 'TRANSITIONS'); } });
