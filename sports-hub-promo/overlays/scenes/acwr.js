// Clinical AI: ACWR gauge, needle climbs past the 1.5 threshold into the red zone.
MOTION.scene({
  id: 'acwr',
  draw(t, lt, ctx) {
    const { X, P, at, kf, lerp } = ctx;
    X.fillStyle = '#000'; X.fillRect(0, 0, ctx.W, ctx.H);
    const out = 1 - at(lt, 5.7, 6.0, 'cubicIn');

    const cx = 960, cy = 700, R = 360, V0 = 0.5, V1 = 2.0;
    const ang = v => Math.PI + (v - V0) / (V1 - V0) * Math.PI;   // 0.5 → left, 2.0 → right
    const red = P.clay, gold = P.hi, cyan = P.acc;

    // value: settles in the safe zone, then climbs past 1.5
    const v = kf(lt, [[0.6, 0.5], [1.5, 1.05, 'cubicOut'], [2.2, 1.1], [3.4, 1.58, 'cubicInOut']]);
    const danger = at(lt, 3.0, 3.25, 'cubicOut');
    const pulse = danger > 0 ? 0.5 + 0.5 * Math.cos((lt - 3.25) * Math.PI * 4) : 0;

    // title
    const kt = at(lt, 0, 0.35, 'expoOut');
    X.globalAlpha = out * kt;
    ctx.text(X, 'ACWR', cx, 150 + (1 - kt) * 14, { family: 'num', weight: 800, size: 44, color: P.ink, align: 'center', dir: 'ltr', letterSpacing: 10 });
    ctx.text(X, 'نسبة الحمل الحاد إلى المزمن', cx, 210 + (1 - kt) * 14, { family: 'body', weight: 700, size: 32, color: P.mut, align: 'center' });

    // zone arcs draw in left → right
    const kd = at(lt, 0.1, 0.8, 'cubicInOut'), vd = lerp(V0, V1, kd);
    const zones = [[0.5, 0.8, P.mut], [0.8, 1.3, cyan], [1.3, 1.5, gold], [1.5, 2.0, red]];
    X.lineWidth = 34; X.lineCap = 'butt';
    for (const [a, b, c] of zones) {
      if (vd <= a) continue;
      const isRed = c === red;
      X.globalAlpha = out * (isRed ? 0.55 + 0.45 * Math.max(pulse * danger, 1 - danger) : 0.85);
      X.strokeStyle = c; X.shadowColor = c; X.shadowBlur = isRed ? 10 + 30 * pulse * danger : 10;
      X.beginPath(); X.arc(cx, cy, R, ang(a) + 0.008, ang(Math.min(b, vd)) - 0.008); X.stroke();
    }
    X.shadowBlur = 0;

    // ticks + labels
    X.globalAlpha = out * at(lt, 0.5, 0.9);
    for (const tv of [0.5, 0.8, 1.3, 1.5, 2.0]) {
      const a = ang(tv), r1 = R + 30, r2 = R + 48;
      X.strokeStyle = tv === 1.5 ? red : P.mut; X.lineWidth = tv === 1.5 ? 5 : 3;
      X.beginPath(); X.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); X.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); X.stroke();
      ctx.text(X, tv.toFixed(1), cx + Math.cos(a) * (R + 92), cy + Math.sin(a) * (R + 92) + 12,
        { family: 'num', weight: 700, size: 30, color: tv === 1.5 ? red : P.mut, align: 'center', dir: 'ltr' });
    }

    // needle
    const kn = at(lt, 0.5, 0.75, 'expoOut');
    X.globalAlpha = out * kn;
    const na = ang(v), nc = v >= 1.5 ? red : v >= 1.3 ? gold : cyan;
    X.strokeStyle = nc; X.lineWidth = 8; X.lineCap = 'round'; X.shadowColor = nc; X.shadowBlur = 20;
    X.beginPath(); X.moveTo(cx + Math.cos(na) * 210, cy + Math.sin(na) * 210); X.lineTo(cx + Math.cos(na) * (R - 46), cy + Math.sin(na) * (R - 46)); X.stroke();
    X.beginPath(); X.arc(cx + Math.cos(na) * (R - 46), cy + Math.sin(na) * (R - 46), 9, 0, Math.PI * 2); X.fillStyle = nc; X.fill();
    X.shadowBlur = 0;

    // live value (fixed-width digits)
    const s = v.toFixed(2), slot = 70; let x = cx - (s.length - 1) * slot / 2 - 10;
    for (const ch of s) {
      const w = ch === '.' ? 30 : slot;
      ctx.text(X, ch, x + w / 2, cy - 20, { family: 'num', weight: 800, size: 110, color: v >= 1.5 ? red : P.ink, align: 'center', dir: 'ltr' });
      x += w;
    }

    // danger badge
    if (danger > 0) {
      X.globalAlpha = out * danger;
      const bw = 640, bh = 96, by = cy + 90 + (1 - danger) * 16;
      X.beginPath(); X.roundRect(cx - bw / 2, by, bw, bh, 16);
      X.fillStyle = `rgba(206,17,38,${0.18 + 0.22 * pulse})`; X.fill();
      X.strokeStyle = red; X.lineWidth = 3; X.stroke();
      ctx.text(X, 'خطر إصابة مرتفع', cx, by + 58, { family: 'body', weight: 900, size: 46, color: '#FFFFFF', align: 'center' });
      X.globalAlpha = out * at(lt, 3.4, 3.7);
      ctx.text(X, 'HIGH INJURY RISK · HAMSTRING', cx, by + bh + 52, { family: 'num', weight: 700, size: 26, color: red, align: 'center', dir: 'ltr', letterSpacing: 6 });
    }
  },
});
