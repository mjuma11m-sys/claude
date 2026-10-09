// Vision AI HUD: lock onto #10, leader line, speed counter 0 → 34.2 km/h.
MOTION.scene({
  id: 'speed',
  draw(t, lt, ctx) {
    const { X, P, at, E } = ctx;
    X.fillStyle = '#000'; X.fillRect(0, 0, ctx.W, ctx.H);
    const out = 1 - at(lt, 4.15, 4.45, 'cubicIn');
    X.globalAlpha = out;

    // target bracket around the player
    const bx = 620, by = 300, bw = 280, bh = 460;
    const kb = at(lt, 0, 0.35, 'expoOut'), s = 1.12 - 0.12 * kb;
    const cx = bx + bw / 2, cy = by + bh / 2, L = 46;
    X.save(); X.translate(cx, cy); X.scale(s, s); X.translate(-cx, -cy);
    X.globalAlpha = out * kb;
    X.strokeStyle = P.acc; X.lineWidth = 4; X.shadowColor = P.acc; X.shadowBlur = 18; X.lineCap = 'square';
    [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]].forEach(([x, y, dx, dy]) => {
      X.beginPath(); X.moveTo(x, y + dy * L); X.lineTo(x, y); X.lineTo(x + dx * L, y); X.stroke();
    });
    X.restore();

    // scan line sweeping the box once
    const ks = at(lt, 0.2, 0.75, 'cubicInOut');
    if (ks > 0 && ks < 1) {
      const y = by + bh * ks;
      const g = X.createLinearGradient(0, y - 60, 0, y);
      g.addColorStop(0, 'rgba(0,229,255,0)'); g.addColorStop(1, 'rgba(0,229,255,0.35)');
      X.globalAlpha = out; X.fillStyle = g; X.fillRect(bx, y - 60, bw, 60);
      X.fillStyle = P.acc; X.fillRect(bx, y - 2, bw, 3);
    }

    // ID tag: #10 locked
    const kt = at(lt, 0.55, 0.8, 'expoOut');
    X.globalAlpha = out * kt; X.shadowBlur = 0;
    X.fillStyle = P.acc; X.fillRect(bx, by - 64 + (1 - kt) * 10, 132, 44);
    ctx.text(X, '#10', bx + 66, by - 30 + (1 - kt) * 10, { family: 'num', weight: 800, size: 30, color: '#000', align: 'center', dir: 'ltr' });
    ctx.text(X, 'ID LOCKED', bx + 150, by - 32 + (1 - kt) * 10, { family: 'num', weight: 600, size: 22, color: P.acc, align: 'left', dir: 'ltr', letterSpacing: 4 });

    // leader line to the data panel
    X.globalAlpha = out;
    ctx.drawPath(X, [[bx + bw, by + 120], [bx + bw + 120, by + 40], [1080, by + 40]], at(lt, 0.7, 1.0, 'cubicOut'),
      { width: 3, color: P.acc, tip: { r: 6, color: P.acc } });

    // glass panel
    const kp = at(lt, 0.95, 1.25, 'expoOut');
    const px = 1080, py = 200, pw = 600, ph = 340;
    X.save(); X.globalAlpha = out * kp;
    X.translate(px, py + ph / 2); X.scale(0.96 + 0.04 * kp, 0.96 + 0.04 * kp); X.translate(-px, -(py + ph / 2));
    X.beginPath(); X.roundRect(px, py, pw, ph, 22);
    X.fillStyle = 'rgba(0,229,255,0.07)'; X.fill();
    X.strokeStyle = 'rgba(0,229,255,0.55)'; X.lineWidth = 2; X.stroke();

    ctx.text(X, 'TOP SPEED', px + 40, py + 58, { family: 'num', weight: 600, size: 24, color: P.mut, align: 'left', dir: 'ltr', letterSpacing: 6 });
    ctx.text(X, 'السرعة القصوى', px + pw - 40, py + 58, { family: 'body', weight: 700, size: 30, color: P.mut, align: 'right' });

    // counter with fixed-width digit slots so it never jitters
    const v = 34.2 * at(lt, 1.15, 2.6, 'quartOut');
    const str = v.toFixed(1), size = 150, slot = 92;
    let x = px + 40;
    X.shadowColor = P.acc; X.shadowBlur = 24;
    for (const ch of str.padStart(4, ' ')) {
      const w = ch === '.' ? 40 : slot;
      if (ch !== ' ') ctx.text(X, ch, x + w / 2, py + 190, { family: 'num', weight: 800, size, color: P.ink, align: 'center', dir: 'ltr' });
      x += w;
    }
    X.shadowBlur = 0;
    ctx.text(X, 'km/h', x + 20, py + 205, { family: 'num', weight: 600, size: 40, color: P.acc, align: 'left', dir: 'ltr' });

    // 16-segment meter tracking the counter
    const segs = 16, fill = v / 40;
    for (let i = 0; i < segs; i++) {
      const on = i / segs < fill;
      X.fillStyle = on ? P.acc : 'rgba(91,112,131,0.35)';
      X.fillRect(px + 40 + i * 33, py + 270, 25, 22);
    }
    X.restore();
  },
});
