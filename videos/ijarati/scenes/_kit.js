// shared helpers for the Ijarati film
export function rr(X, x, y, w, h, r) { X.beginPath(); X.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); }

// navy backdrop: slow drifting accent glow + dot grid
export function bg(ctx, t, glowY = 0.45) {
  const { X, P, W, H } = ctx;
  X.fillStyle = P.bg; X.fillRect(0, 0, W, H);
  const gx = W * (0.5 + 0.18 * Math.sin(t * 0.35)), gy = H * (glowY + 0.05 * Math.cos(t * 0.27));
  const g = X.createRadialGradient(gx, gy, 0, gx, gy, 900);
  g.addColorStop(0, 'rgba(34,195,142,0.16)'); g.addColorStop(1, 'rgba(34,195,142,0)');
  X.fillStyle = g; X.fillRect(0, 0, W, H);
  X.fillStyle = 'rgba(135,150,171,0.13)';
  const off = (t * 14) % 60;
  for (let y = -60 + off; y < H; y += 60) for (let x = 30; x < W; x += 60) { X.beginPath(); X.arc(x, y, 2.2, 0, 7); X.fill(); }
}

// word-by-word rise; s = absolute start time
export function rise(ctx, t, str, x, y, s, o = {}) {
  const { X } = ctx;
  const L = ctx.text.layout(X, str, { family: o.family || 'display', weight: o.weight || 900, size: o.size || 110, maxWidth: o.maxWidth || 920, lineHeight: o.lineHeight || 1.25 });
  const out = o.e ? 1 - ctx.at(t, o.e - 0.2, o.e, 'cubicIn') : 1;
  return ctx.text.drawLayout(X, L, x, y, { align: o.align || 'center', color: o.color, perWord: i => {
    const k = ctx.at(t, s + i * (o.stagger || 0.07), s + i * (o.stagger || 0.07) + (o.dur || 0.32), 'expoOut');
    return { clipUp: 1, dy: (1 - k) * (o.size || 110) * 1.1, alpha: (k > 0 ? 1 : 0) * out, color: (o.colors && o.colors[i]) || undefined };
  } });
}

// small pill tag ("01  ميزة")
export function tag(ctx, t, str, x, y, s, color) {
  const { X, P } = ctx; const k = ctx.at(t, s, s + 0.3, 'expoOut'); if (k <= 0) return;
  X.save(); X.globalAlpha *= k; X.font = ctx.font('Tajawal', 700, 40);
  const w = X.measureText(str).width + 60;
  X.translate(x, y + (1 - k) * 30);
  X.strokeStyle = color || P.acc; X.lineWidth = 3; rr(X, -w / 2, -36, w, 72, 36); X.stroke();
  X.restore();
  ctx.text(X, str, x, y + (1 - k) * 30 + 14, { family: 'body', weight: 700, size: 40, color: color || P.acc, alpha: k });
}
