// Logo reveal: pentagon (5 pillars) + spokes into the hub, wordmark, red|gold rule, Arabic tagline.
MOTION.scene({
  id: 'logo',
  draw(t, lt, ctx) {
    const { X, P, at } = ctx;
    X.fillStyle = '#000'; X.fillRect(0, 0, ctx.W, ctx.H);
    const out = 1 - at(lt, 6.1, 6.5, 'cubicIn');
    X.globalAlpha = out;

    const cx = 960, cy = 380, R = 150;
    const V = [0, 1, 2, 3, 4].map(i => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R]; });

    // outline draws in
    X.shadowColor = P.acc; X.shadowBlur = 22;
    ctx.drawPath(X, [...V, V[0]], at(lt, 0, 0.9, 'cubicInOut'), { width: 6, color: P.acc, cap: 'round', smooth: false });

    // spokes into the hub, staggered
    V.forEach((p, i) => {
      const k = at(lt, 0.75 + i * 0.07, 1.1 + i * 0.07, 'cubicOut');
      if (k > 0) ctx.drawPath(X, [p, [cx, cy]], k, { width: 3, color: 'rgba(0,229,255,0.7)', smooth: false });
    });
    X.shadowBlur = 0;

    // pillar nodes
    V.forEach((p, i) => {
      const k = at(lt, 0.9 + i * 0.06, 1.15 + i * 0.06, 'expoOut');
      if (k <= 0) return;
      X.globalAlpha = out * k;
      X.beginPath(); X.arc(p[0], p[1], 13 * (0.95 + 0.05 * k), 0, Math.PI * 2); X.fillStyle = P.ink; X.fill();
    });

    // hub: gold core + red ring, single heartbeat at 1.5s
    const kh = at(lt, 1.25, 1.5, 'expoOut');
    const beat = Math.exp(-Math.max(0, lt - 1.5) * 6) * (lt > 1.5 ? 1 : 0);
    X.globalAlpha = out * kh;
    X.shadowColor = P.hi; X.shadowBlur = 20 + 30 * beat;
    X.beginPath(); X.arc(cx, cy, 30 * (1 + 0.12 * beat), 0, Math.PI * 2); X.fillStyle = P.hi; X.fill();
    X.shadowBlur = 0;
    X.beginPath(); X.arc(cx, cy, 48 + 26 * beat, 0, Math.PI * 2);
    X.strokeStyle = P.clay; X.lineWidth = 6; X.globalAlpha = out * kh * (1 - 0.6 * beat); X.stroke();

    // wordmark: LTR wipe reveal
    const kw = at(lt, 1.6, 2.2, 'expoOut');
    X.globalAlpha = out;
    if (kw > 0) {
      X.save(); X.beginPath(); X.rect(0, 560, 360 + 1200 * kw, 160); X.clip();
      ctx.text(X, 'SPORTS HUB', cx, 680, { family: 'num', weight: 800, size: 132, color: P.ink, align: 'center', dir: 'ltr', letterSpacing: 22 });
      X.restore();
    }

    // red | gold rule grows from the center
    const kr = at(lt, 2.0, 2.5, 'expoOut'), hw = 360 * kr;
    X.fillStyle = P.clay; X.fillRect(cx - hw, 728, hw, 6);
    X.fillStyle = P.hi; X.fillRect(cx, 728, hw, 6);

    // Arabic tagline, word by word (whole words, never per letter)
    const L = ctx.text.layout(X, 'منظومة واحدة لمستقبل الكرة البحرينية', { family: 'body', weight: 700, size: 56 });
    ctx.text.drawLayout(X, L, cx, 830, { align: 'center', color: P.ink, perWord: i => {
      const k = at(lt, 2.4 + i * 0.12, 2.75 + i * 0.12, 'expoOut');
      return { alpha: k, dy: (1 - k) * 30, clipUp: 1 };
    } });
  },
});
