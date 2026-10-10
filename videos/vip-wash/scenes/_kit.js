// shared helpers for the Ijarati film
export function rr(X, x, y, w, h, r) { X.beginPath(); X.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); }

// navy backdrop: slow drifting accent glow + dot grid
export function bg(ctx, t, glowY = 0.45) {
  const { X, P, W, H } = ctx;
  X.fillStyle = P.bg; X.fillRect(0, 0, W, H);
  const gx = W * (0.5 + 0.15 * Math.sin(t * 0.3)), gy = H * (glowY + 0.05 * Math.cos(t * 0.25));
  const g = X.createRadialGradient(gx, gy, 0, gx, gy, 1000);
  g.addColorStop(0, 'rgba(212,175,55,0.10)'); g.addColorStop(1, 'rgba(212,175,55,0)');
  X.fillStyle = g; X.fillRect(0, 0, W, H);
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

// glossy black paint: deep gradient + moving diagonal specular streak (k = sweep progress 0..1)
export function paint(ctx, t, k, strength = 1) {
  const { X, W, H } = ctx;
  const g = X.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#16161A'); g.addColorStop(.5, '#050506'); g.addColorStop(1, '#121216');
  X.fillStyle = g; X.fillRect(0, 0, W, H);
  const cx = -600 + k * 2400;
  X.save(); X.translate(cx, H / 2); X.rotate(-0.5);
  const s = X.createLinearGradient(-260, 0, 260, 0);
  s.addColorStop(0, 'rgba(255,255,255,0)'); s.addColorStop(.45, `rgba(255,255,255,${.10 * strength})`); s.addColorStop(.5, `rgba(255,248,230,${.32 * strength})`); s.addColorStop(.55, `rgba(255,255,255,${.10 * strength})`); s.addColorStop(1, 'rgba(255,255,255,0)');
  X.fillStyle = s; X.fillRect(-260, -1800, 520, 3600); X.restore();
}
