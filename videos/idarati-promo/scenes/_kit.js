// أدوات مشتركة لفيلم إداراتي
export function rr(X, x, y, w, h, r) { X.beginPath(); X.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); }

// خلفية الليل: توهّج ذهبي بطيء + شبكة خواتم خفيفة
export function bg(ctx, t, glowY = 0.42) {
  const { X, P, W, H } = ctx;
  X.fillStyle = P.bg; X.fillRect(0, 0, W, H);
  const gx = W * (0.5 + 0.16 * Math.sin(t * 0.33)), gy = H * (glowY + 0.05 * Math.cos(t * 0.25));
  const g = X.createRadialGradient(gx, gy, 0, gx, gy, 950);
  g.addColorStop(0, 'rgba(201,150,58,0.17)'); g.addColorStop(1, 'rgba(201,150,58,0)');
  X.fillStyle = g; X.fillRect(0, 0, W, H);
  X.save(); X.strokeStyle = 'rgba(245,242,235,0.05)'; X.lineWidth = 2;
  const off = (t * 12) % 180;
  for (let y = -180 + off; y < H + 180; y += 180) for (let x = (Math.round((y - off) / 180) % 2) * 90; x < W + 90; x += 180) star(X, x, y, 34, false);
  X.restore();
}

// النجمة الثمانية (الخاتم): مربعين، واحد مدوّر 45°
export function starPts(cx, cy, s) {
  const pts = [];
  for (let k = 0; k < 8; k++) {
    const a = -Math.PI / 2 + k * Math.PI / 4, R = s * Math.SQRT2;
    pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
    const a2 = a + Math.PI / 8, r = s * 1.0824;
    pts.push([cx + r * Math.cos(a2), cy + r * Math.sin(a2)]);
  }
  pts.push(pts[0]);
  return pts;
}
export function star(X, cx, cy, s, fill = true) {
  const p = starPts(cx, cy, s); X.beginPath(); X.moveTo(...p[0]); for (const q of p.slice(1)) X.lineTo(...q); X.closePath();
  fill ? X.fill() : X.stroke();
}

// كلمات تطلع من تحت خط الأساس، كلمة كلمة
export function rise(ctx, t, str, x, y, s, o = {}) {
  const { X } = ctx;
  const L = ctx.text.layout(X, str, { family: o.family || 'display', weight: o.weight || 700, size: o.size || 110, maxWidth: o.maxWidth || 920, lineHeight: o.lineHeight || 1.3 });
  const out = o.e ? 1 - ctx.at(t, o.e - 0.2, o.e, 'cubicIn') : 1;
  return ctx.text.drawLayout(X, L, x, y, { align: o.align || 'center', color: o.color, perWord: i => {
    const st = s + i * (o.stagger ?? 0.08), k = ctx.at(t, st, st + (o.dur || 0.34), 'expoOut');
    return { clipUp: k < 1 ? 1 : 0, dy: (1 - k) * (o.size || 110) * 1.1, alpha: (k > 0 ? 1 : 0) * out, color: (o.colors && o.colors[i]) || undefined };
  } });
}

// شارة صغيرة («ميزة 1»)
export function tag(ctx, t, str, x, y, s, color) {
  const { X, P } = ctx; const k = ctx.at(t, s, s + 0.3, 'expoOut'); if (k <= 0) return;
  const c = color || P.acc;
  X.save(); X.globalAlpha *= k; X.font = ctx.font('IBM Plex Sans Arabic', 700, 40);
  const w = X.measureText(str).width + 64;
  X.translate(x, y + (1 - k) * 30);
  X.strokeStyle = c; X.lineWidth = 3; rr(X, -w / 2, -38, w, 76, 38); X.stroke();
  X.restore();
  ctx.text(X, str, x, y + (1 - k) * 30 + 14, { family: 'body', weight: 700, size: 40, color: c, alpha: k });
}

// جوال: إطار + شاشة من لقطة حقيقية. (x,y) = منتصف الجوال، w = عرضه
export const PHONE_AR = 1688 / 780;
export function phone(ctx, name, x, y, w, rot = 0, alpha = 1, o = {}) {
  const { X } = ctx; const h = w * PHONE_AR, b = w * 0.035, r = w * 0.13;
  X.save(); X.globalAlpha *= alpha; X.translate(x, y); X.rotate(rot); if (o.scale) X.scale(o.scale, o.scale);
  X.shadowColor = 'rgba(0,0,0,0.45)'; X.shadowBlur = 70; X.shadowOffsetY = 30;
  X.fillStyle = '#05080F'; rr(X, -w / 2 - b, -h / 2 - b, w + 2 * b, h + 2 * b, r + b); X.fill();
  X.shadowColor = 'transparent';
  X.strokeStyle = 'rgba(245,242,235,0.18)'; X.lineWidth = 3; rr(X, -w / 2 - b, -h / 2 - b, w + 2 * b, h + 2 * b, r + b); X.stroke();
  rr(X, -w / 2, -h / 2, w, h, r); X.clip();
  const img = ctx.img(name); if (img) X.drawImage(img, -w / 2, -h / 2, w, h);
  // نتوء الكاميرا
  X.fillStyle = '#05080F'; rr(X, -w * 0.16, -h / 2 + w * 0.03, w * 0.32, w * 0.08, w * 0.04); X.fill();
  if (o.after) o.after(X, w, h);
  X.restore();
}

// ملصق «* لقطات ببيانات تجريبية» (قاعدة المحتوى)
export function demoLabel(ctx, t, s) {
  const k = ctx.at(t, s, s + 0.3);
  ctx.text(ctx.X, '* لقطات ببيانات تجريبية', 540, 1585, { family: 'body', weight: 400, size: 30, color: ctx.P.mut, alpha: 0.85 * k });
}
