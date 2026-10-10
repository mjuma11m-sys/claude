// Zoom through: fly into a window and land in the next scene
import '../lib.js'; const BH = globalThis.BH;
const WX = 540, WY = 800, WW = 200, WH = 150;
function beach(X, x, y, w, h, lt) {
  X.fillStyle = '#7CC6E8'; X.fillRect(x, y, w, h);
  X.fillStyle = '#F2B33D'; X.beginPath(); X.arc(x + w * .7, y + h * .3, h * .12, 0, 6.283); X.fill();
  X.fillStyle = '#1F6F9A'; X.fillRect(x, y + h * .55, w, h * .45);
  X.strokeStyle = 'rgba(255,255,255,.6)'; X.lineWidth = Math.max(1, h * .012);
  for (let i = 0; i < 3; i++) { X.beginPath(); for (let s = 0; s <= 20; s++) { const px = x + w * s / 20, py = y + h * (.62 + i * .12) + Math.sin(s * 1.2 + lt * 3 + i) * h * .012; s ? X.lineTo(px, py) : X.moveTo(px, py); } X.stroke(); }
  X.fillStyle = '#E8D3A2'; X.fillRect(x, y + h * .9, w, h * .1);
}
MOTION.scene({ id: 'c2c',
  draw(t, lt, ctx) {
    const { X, P, at, E } = ctx;
    X.fillStyle = P.bg; X.fillRect(0, 0, ctx.W, ctx.H);
    BH.chip(ctx, lt, 2, 'الانتقالات'); BH.head(ctx, lt, 'Zoom Through', 'تدخل من الدريشة');
    const kf = BH.frame(ctx, lt), z = E.expoIn(ctx.prog(lt, 1.4, 2.5)), s = 1 + 5.2 * z;   // 780/150 ≈ 5.2 → window fills frame
    BH.clip(X); X.globalAlpha = kf;
    X.translate(WX, WY + (830 - WY) * z); X.scale(s, s); X.translate(-WX, -WY);
    X.fillStyle = '#3A2F28'; X.fillRect(0, 300, 1080, 1100);                    // room wall
    X.fillStyle = '#2A221D'; X.fillRect(0, 1000, 1080, 400);                     // floor
    X.fillStyle = '#5A4636'; X.fillRect(WX - WW / 2 - 14, WY - WH / 2 - 14, WW + 28, WH + 28);
    beach(X, WX - WW / 2, WY - WH / 2, WW, WH, lt);
    X.strokeStyle = '#5A4636'; X.lineWidth = 8; X.beginPath(); X.moveTo(WX, WY - WH / 2); X.lineTo(WX, WY + WH / 2); X.stroke();
    X.restore(); X.globalAlpha = 1;
    BH.explain(ctx, lt, 'تدخل من دريشة أو شاشة', 'وتطلع بمكان ثاني', { t0: 2.6, hi1: [2] });
  } });
