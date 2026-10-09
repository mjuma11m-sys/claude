// Bedtime story: "The star that was afraid of the dark" — one illustrated night world, camera follows the narration.
MOTION.scene({
  id: 'story',
  setup(ctx) {
    const r = ctx.rng('stars');
    this.stars = Array.from({ length: 140 }, () => ({ x: r.range(0, 1920), y: r.range(0, 760), s: r.range(1, 3.2), ph: r.range(0, 6.28), sp: r.range(0.6, 1.8) }));
    this.story = ctx.project.story;
    this.byId = Object.fromEntries(this.story.map(l => [l.id, l]));
  },
  draw(t, lt, ctx) {
    const { X, P, at, lerp, clamp, E } = ctx;
    const S = this.story, L = id => this.byId[id];
    const ease = k => E.sineInOut(clamp(k, 0, 1));

    // ── camera: each line has a shot; glide 1.4 s into it ──
    const SHOTS = { title: [960, 540, 1], wide: [960, 540, 1], end: [960, 540, 1], kitty: [450, 620, 1.6], star: [1170, 320, 1.7], bat: [1470, 600, 1.55], batstar: [1320, 460, 1.2] };
    let cur = 0; for (let i = 0; i < S.length; i++) if (t >= S[i].start - 0.6) cur = i;
    const a = SHOTS[S[Math.max(0, cur - 1)].shot], b = SHOTS[S[cur].shot];
    const k = cur === 0 ? 1 : ease((t - (S[cur].start - 0.6)) / 1.4);
    const drift = 0.025 * clamp((t - S[cur].start) / 8, 0, 1);
    const cx = lerp(a[0], b[0], k), cy = lerp(a[1], b[1], k), z = lerp(a[2], b[2], k) + drift;

    X.save();
    X.translate(960, 540); X.scale(z, z); X.translate(-cx, -cy);

    // sky
    const g = X.createLinearGradient(0, 0, 0, 1080);
    g.addColorStop(0, '#070B26'); g.addColorStop(0.6, '#16205A'); g.addColorStop(1, '#2A2F72');
    X.fillStyle = g; X.fillRect(-400, -400, 2720, 1880);

    // twinkling stars
    for (const s of this.stars) {
      X.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
      X.fillStyle = '#FFF6D8'; X.beginPath(); X.arc(s.x, s.y, s.s, 0, 6.283); X.fill();
    }
    X.globalAlpha = 1;

    // moon
    X.save(); X.shadowColor = '#FFF1B8'; X.shadowBlur = 60;
    X.fillStyle = '#FFF3C4'; X.beginPath(); X.arc(240, 170, 70, 0, 6.283); X.fill(); X.restore();
    X.fillStyle = '#0C1232'; X.beginPath(); X.arc(272, 150, 62, 0, 6.283); X.fill();

    // far hills
    X.fillStyle = '#10153F';
    X.beginPath(); X.moveTo(-400, 900); X.quadraticCurveTo(300, 760, 900, 880); X.quadraticCurveTo(1500, 980, 2320, 820); X.lineTo(2320, 1480); X.lineTo(-400, 1480); X.fill();

    // ── the star ──
    const l2 = L('l2'), l10 = L('l10'), l11 = L('l11'), l14 = L('l14');
    const out = ease((t - l10.start - 1) / 3);           // leaves the cloud
    const toKitty = ease((t - l14.start - 1) / 6);        // drifts over Kitty's window
    let sx = lerp(lerp(1075, 1260, out), 560, toKitty), sy = lerp(lerp(262, 235, out), 330, toKitty);
    const scared = t < l10.start + 1;
    if (scared) { sx += Math.sin(t * 38) * 3; sy += Math.cos(t * 31) * 2; }
    const grow = ease((t - l11.start - 2) / 3);
    const sr = 42 * (1 + 0.5 * grow - 0.15 * toKitty);
    X.save(); X.translate(sx, sy);
    X.shadowColor = '#FFE27A'; X.shadowBlur = 20 + 70 * grow + 10 * Math.sin(t * 2);
    X.fillStyle = '#FFD86B';
    X.beginPath();
    for (let i = 0; i < 10; i++) { const rr = i % 2 ? sr * 0.48 : sr, an = -Math.PI / 2 + i * Math.PI / 5; X.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
    X.closePath(); X.fill(); X.shadowBlur = 0;
    // face: eyes open at l10, worried → smile at l11
    const eyesOpen = t < l2.start + 2 ? 1 : t < l10.start + 1.5 ? 0.25 : 1;
    X.fillStyle = '#3A2A10';
    for (const ex of [-0.22, 0.22]) { X.beginPath(); X.ellipse(ex * sr, -0.05 * sr, 0.07 * sr, 0.1 * sr * eyesOpen, 0, 0, 6.283); X.fill(); }
    X.strokeStyle = '#3A2A10'; X.lineWidth = Math.max(2, sr * 0.06); X.lineCap = 'round';
    const smile = ease((t - l11.start - 1.5) / 1.5);
    X.beginPath(); X.moveTo(-0.15 * sr, 0.2 * sr); X.quadraticCurveTo(0, 0.2 * sr + lerp(-0.1, 0.16, smile) * sr, 0.15 * sr, 0.2 * sr); X.stroke();
    X.fillStyle = 'rgba(255,140,160,0.6)';
    for (const ex of [-0.33, 0.33]) { X.beginPath(); X.arc(ex * sr, 0.12 * sr, 0.06 * sr, 0, 6.283); X.fill(); }
    X.restore();

    // cloud in front of the star; drifts away once she comes out
    const cdx = 140 * out, calpha = 0.95 - 0.45 * out;
    X.globalAlpha = calpha; X.fillStyle = '#3B4585';
    for (const [x, y, rr] of [[1080, 330, 58], [1150, 300, 78], [1225, 325, 60], [1150, 345, 70], [1270, 340, 40]]) { X.beginPath(); X.arc(x + cdx, y, rr, 0, 6.283); X.fill(); }
    X.globalAlpha = 1;

    // ── Kitty's house ──
    X.fillStyle = '#1B2150'; X.fillRect(170, 470, 540, 700);
    X.fillStyle = '#141940'; X.beginPath(); X.moveTo(140, 475); X.lineTo(440, 320); X.lineTo(740, 475); X.fill();
    // window light
    X.save(); X.shadowColor = '#FFD27A'; X.shadowBlur = 50;
    X.fillStyle = '#FFDD99'; X.fillRect(300, 520, 280, 260); X.restore();
    // Kitty (white cat, red bow)
    const l12 = L('l12');
    const blink = (Math.sin(t * 0.9) > 0.985) ? 0.15 : 1;
    const hx = 440, hy = 655;
    X.save();
    X.beginPath(); X.rect(300, 520, 280, 260); X.clip();
    X.fillStyle = '#FF8FB1'; X.beginPath(); X.roundRect(375, 725, 130, 90, 30); X.fill();
    X.strokeStyle = '#2B2B2B'; X.lineWidth = 4; X.fillStyle = '#FFFFFF';
    for (const ear of [[[352, 640], [348, 560], [410, 600]], [[470, 600], [532, 560], [528, 640]]]) {
      X.beginPath(); X.moveTo(...ear[0]); X.lineTo(...ear[1]); X.lineTo(...ear[2]); X.closePath(); X.fill(); X.stroke();
    }
    X.beginPath(); X.ellipse(hx, hy, 100, 80, 0, 0, 6.283); X.fill(); X.stroke();
    // bow on her left ear (viewer's right)
    X.fillStyle = '#E8344E';
    X.beginPath(); X.ellipse(500, 585, 26, 20, -0.5, 0, 6.283); X.fill();
    X.beginPath(); X.ellipse(548, 572, 26, 20, 0.5, 0, 6.283); X.fill();
    X.beginPath(); X.arc(524, 580, 11, 0, 6.283); X.fill();
    X.fillStyle = '#1A1A1A';
    for (const ex of [405, 475]) { X.beginPath(); X.ellipse(ex, 660, 8, 12 * blink, 0, 0, 6.283); X.fill(); }
    X.fillStyle = '#F5C542'; X.beginPath(); X.ellipse(hx, 682, 9, 6, 0, 0, 6.283); X.fill();
    X.strokeStyle = '#2B2B2B'; X.lineWidth = 3;
    for (const [d, dy] of [[-1, -8], [-1, 4], [-1, 16], [1, -8], [1, 4], [1, 16]]) {
      X.beginPath(); X.moveTo(hx + d * 70, 672 + dy * 0.6); X.lineTo(hx + d * 120, 668 + dy); X.stroke();
    }
    // paws: clap during l12
    const clapping = t > l12.start + 0.3 && t < l12.start + 3.5;
    const gap = clapping ? 18 + 18 * Math.abs(Math.sin((t - l12.start) * 7)) : 46;
    X.fillStyle = '#FFFFFF';
    for (const d of [-1, 1]) { X.beginPath(); X.arc(hx + d * gap, 752, 20, 0, 6.283); X.fill(); X.stroke(); }
    X.restore();
    // window frame + curtains
    X.strokeStyle = '#0E1233'; X.lineWidth = 14; X.strokeRect(300, 520, 280, 260);
    X.fillStyle = 'rgba(255,143,177,0.85)';
    X.beginPath(); X.moveTo(300, 520); X.quadraticCurveTo(345, 650, 300, 780); X.fill();
    X.beginPath(); X.moveTo(580, 520); X.quadraticCurveTo(535, 650, 580, 780); X.fill();
    X.fillStyle = '#0E1233'; X.fillRect(285, 780, 310, 18);

    // ── neighbour roof + Batman ──
    X.fillStyle = '#121638'; X.fillRect(1240, 700, 600, 500);
    X.fillRect(1700, 620, 60, 90);
    const l6 = L('l6'), l13 = L('l13');
    const bAlpha = ease((t - l6.start - 1.5) / 2) * (1 - ease((t - l13.start - 2.5) / 2.5));
    if (bAlpha > 0.01) {
      const rise = 18 * (1 - ease((t - l6.start - 1.5) / 2));
      const sway = Math.sin(t * 1.3) * 6;
      X.save(); X.globalAlpha = bAlpha; X.translate(0, rise);
      // cape
      X.fillStyle = '#1C1C2A';
      X.beginPath(); X.moveTo(1428, 560); X.lineTo(1512, 560); X.lineTo(1565 + sway, 700);
      for (let i = 0; i < 4; i++) X.quadraticCurveTo(1565 + sway - 22 - i * 45, 680, 1565 + sway - 45 - i * 45, 700);
      X.lineTo(1375 + sway, 700); X.closePath(); X.fill();
      // body + belt
      X.fillStyle = '#545A70'; X.beginPath(); X.roundRect(1440, 560, 60, 130, 16); X.fill();
      X.fillStyle = '#F2C94C'; X.fillRect(1440, 628, 60, 11);
      // cowl with ears
      X.fillStyle = '#1C1C2A';
      X.beginPath(); X.moveTo(1438, 500); X.lineTo(1434, 448); X.lineTo(1458, 482); X.closePath(); X.fill();
      X.beginPath(); X.moveTo(1502, 500); X.lineTo(1506, 448); X.lineTo(1482, 482); X.closePath(); X.fill();
      X.beginPath(); X.arc(1470, 518, 46, 0, 6.283); X.fill();
      X.fillStyle = '#F1C9A5'; X.beginPath(); X.ellipse(1470, 545, 28, 19, 0, 0, Math.PI); X.fill();
      X.fillStyle = '#FFFFFF';
      for (const ex of [1452, 1488]) { X.beginPath(); X.ellipse(ex, 514, 10, 4, ex < 1470 ? 0.25 : -0.25, 0, 6.283); X.fill(); }
      const bSmile = ease((t - l13.start) / 1.2);
      X.strokeStyle = '#5A3B2A'; X.lineWidth = 3; X.lineCap = 'round';
      X.beginPath(); X.moveTo(1460, 552); X.quadraticCurveTo(1470, 552 + 7 * bSmile, 1480, 552); X.stroke();
      X.restore();
    }
    X.restore();   // end camera

    // ── title card ──
    const l0 = L('l0');
    const tA = ease((t - l0.start + 0.5) / 1) * (1 - ease((t - l0.end + 0.2) / 1));
    if (tA > 0) {
      X.globalAlpha = tA;
      X.fillStyle = 'rgba(5,8,30,0.45)'; X.fillRect(0, 0, 1920, 1080);
      ctx.text(X, 'هلو كيتي وباتمان', 960, 470, { family: 'display', weight: 900, size: 120, color: P.acc, align: 'center', shadow: { blur: 30, y: 0, color: 'rgba(255,216,107,0.5)' } });
      ctx.text(X, 'النجمة التي خافت من الظلام', 960, 590, { family: 'body', weight: 700, size: 64, color: P.ink, align: 'center' });
      X.globalAlpha = 1;
    }

    // ── subtitles (screen space) ──
    for (const l of S) {
      if (!l.text || l.shot === 'end') continue;
      const sA = ease((t - l.start + 0.25) / 0.4) * (1 - ease((t - l.end - 0.3) / 0.4));
      if (sA <= 0) continue;
      X.globalAlpha = sA;
      const lay = ctx.text.layout(X, l.text, { family: 'body', weight: 700, size: 48, maxWidth: 1560, lineHeight: 1.45 });
      const n = lay.lines ? lay.lines.length : 1, h = 70 * n + 40;
      X.fillStyle = 'rgba(5,8,30,0.55)'; X.beginPath(); X.roundRect(140, 1040 - h, 1640, h, 24); X.fill();
      ctx.text.drawLayout(X, lay, 960, 1040 - h + 66, { align: 'center', color: P.ink });
    }
    X.globalAlpha = 1;

    // ── ending: moral + goodnight, fade to night ──
    const l15 = L('l15');
    const eA = ease((t - l15.start + 0.3) / 1.2);
    if (eA > 0) {
      X.globalAlpha = eA; X.fillStyle = 'rgba(5,8,30,0.6)'; X.fillRect(0, 0, 1920, 1080);
      const lay = ctx.text.layout(X, l15.text, { family: 'body', weight: 700, size: 62, maxWidth: 1300, lineHeight: 1.5 });
      ctx.text.drawLayout(X, lay, 960, 420, { align: 'center', color: P.ink });
      const gA = ease((t - l15.start - 6.5) / 1.2);
      X.globalAlpha = gA;
      ctx.text(X, 'تصبحون على خير', 960, 720, { family: 'display', weight: 900, size: 96, color: P.acc, align: 'center', shadow: { blur: 30, y: 0, color: 'rgba(255,216,107,0.5)' } });
      X.globalAlpha = 1;
    }
    const fade = ease((t - (ctx.project.duration - 2)) / 2);
    if (fade > 0) { X.fillStyle = `rgba(0,0,0,${fade})`; X.fillRect(0, 0, 1920, 1080); }
  },
});
