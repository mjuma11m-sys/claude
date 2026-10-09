// Bedtime story 3: "Batman can't sleep" — city rooftop at night, Kitty's balloon, a lullaby.
MOTION.scene({
  id: 'story',
  setup(ctx) {
    const r = ctx.rng('city');
    this.stars = Array.from({ length: 120 }, () => ({ x: r.range(0, 1920), y: r.range(0, 600), s: r.range(1, 3), ph: r.range(0, 6.28), sp: r.range(0.6, 1.6) }));
    // skyline (Batman's tower is drawn separately at x 700–1000)
    this.blds = [];
    for (let x = -300; x < 2300; ) {
      const w = r.range(120, 220), h = r.range(220, 460);
      if (!(x + w > 680 && x < 1020) && !(x + w > 1230 && x < 1520)) {
        const wins = []; for (let wy = 1080 - h + 30; wy < 1040; wy += 44) for (let wx = x + 20; wx < x + w - 30; wx += 38) if (r() > 0.55) wins.push([wx, wy, r.range(0, 6.28)]);
        this.blds.push({ x, w, h, wins });
      }
      x += w + r.range(8, 30);
    }
    this.notes = Array.from({ length: 14 }, (_, i) => ({ dx: r.range(-60, 60), ph: r.range(0, 6.28), d: i * 0.55 }));
    this.story = ctx.project.story;
    this.byId = Object.fromEntries(this.story.map(l => [l.id, l]));
  },
  draw(t, lt, ctx) {
    const { X, P, lerp, clamp, E } = ctx;
    const S = this.story, L = id => this.byId[id];
    const ease = k => E.sineInOut(clamp(k, 0, 1));

    const SHOTS = { title: [960, 540, 1], end: [960, 540, 1], bat: [850, 470, 1.7], balloon: [960, 420, 1.35], both: [930, 470, 1.65],
      moon: [1500, 260, 1.5], owl: [270, 640, 1.9], fire: [1375, 740, 1.6], song: [930, 440, 1.3], sleep: [900, 490, 1.9] };
    let cur = 0; for (let i = 0; i < S.length; i++) if (t >= S[i].start - 0.6) cur = i;
    const a = SHOTS[S[Math.max(0, cur - 1)].shot], b = SHOTS[S[cur].shot];
    const k = cur === 0 ? 1 : ease((t - (S[cur].start - 0.6)) / 1.6);
    const drift = 0.025 * clamp((t - S[cur].start) / 8, 0, 1);
    const cx = lerp(a[0], b[0], k), cy = lerp(a[1], b[1], k), z = lerp(a[2], b[2], k) + drift;

    const l2 = L('l2'), l3 = L('l3'), l5 = L('l5'), l7 = L('l7'), l10 = L('l10'), l11 = L('l11'), l12 = L('l12'), l14 = L('l14'), l15 = L('l15'), l16 = L('l16'), l17 = L('l17');
    const sleepK = ease((t - l16.start - 3) / 3);          // Batman dozes off
    const dim = 0.35 * ease((t - l14.start) / 4);           // the city quiets down during the song

    X.save();
    X.translate(960, 540); X.scale(z, z); X.translate(-cx, -cy);

    const g = X.createLinearGradient(0, 0, 0, 1080);
    g.addColorStop(0, '#060A24'); g.addColorStop(0.65, '#18215C'); g.addColorStop(1, '#2C3478');
    X.fillStyle = g; X.fillRect(-400, -400, 2720, 1880);
    for (const s of this.stars) {
      X.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
      X.fillStyle = '#FFF6D8'; X.beginPath(); X.arc(s.x, s.y, s.s, 0, 6.283); X.fill();
    }
    X.globalAlpha = 1;

    // full moon (brightens when Kitty points at it)
    const moonK = ease((t - L('l9').start) / 1.5) * (1 - ease((t - l10.start) / 2));
    X.save(); X.shadowColor = '#FFF1B8'; X.shadowBlur = 70 + 60 * moonK;
    X.fillStyle = '#FFF3C4'; X.beginPath(); X.arc(1550, 190, 90, 0, 6.283); X.fill(); X.restore();
    X.fillStyle = 'rgba(220,205,150,0.35)';
    for (const [x, y, rr] of [[1520, 170, 16], [1580, 215, 11], [1560, 150, 8]]) { X.beginPath(); X.arc(x, y, rr, 0, 6.283); X.fill(); }
    if (moonK > 0) {   // moonbeam on the streets
      X.globalAlpha = 0.18 * moonK; X.fillStyle = '#FFF3C4';
      X.beginPath(); X.moveTo(1500, 260); X.lineTo(1600, 260); X.lineTo(1900, 1080); X.lineTo(1100, 1080); X.fill(); X.globalAlpha = 1;
    }

    // skyline
    for (const bd of this.blds) {
      X.fillStyle = '#121845'; X.fillRect(bd.x, 1080 - bd.h, bd.w, bd.h + 400);
      for (const [wx, wy, ph] of bd.wins) {
        const on = 0.55 + 0.45 * Math.sin(t * 0.3 + ph);
        X.fillStyle = `rgba(255,214,130,${on * (1 - dim * 2)})`; X.fillRect(wx, wy, 16, 22);
      }
    }

    // tree + owl
    X.fillStyle = '#2A1D18'; X.fillRect(255, 700, 30, 420);
    X.fillStyle = '#123322';
    for (const [x, y, rr] of [[270, 650, 95], [200, 700, 70], [345, 705, 72]]) { X.beginPath(); X.arc(x, y, rr, 0, 6.283); X.fill(); }
    X.fillStyle = '#2A1D18'; X.fillRect(225, 640, 100, 12);
    const owlK = ease((t - l10.start) / 1);
    const owlBlink = Math.sin(t * 1.7) > 0.96 ? 0.15 : 1;
    X.save(); X.translate(275, 600);
    X.fillStyle = '#8A6A4A'; X.beginPath(); X.ellipse(0, 0, 34, 42, 0, 0, 6.283); X.fill();
    X.beginPath(); X.moveTo(-28, -30); X.lineTo(-22, -52); X.lineTo(-10, -36); X.fill();
    X.beginPath(); X.moveTo(28, -30); X.lineTo(22, -52); X.lineTo(10, -36); X.fill();
    X.fillStyle = '#E9D9B8'; X.beginPath(); X.ellipse(0, 12, 20, 24, 0, 0, 6.283); X.fill();
    for (const ex of [-14, 14]) {
      X.fillStyle = '#FFF4CC'; X.beginPath(); X.arc(ex, -14, 12, 0, 6.283); X.fill();
      X.fillStyle = '#1A1A1A'; X.beginPath(); X.ellipse(ex, -14, 5, 6 * owlBlink, 0, 0, 6.283); X.fill();
    }
    X.fillStyle = '#F2B33D'; X.beginPath(); X.moveTo(-5, -4); X.lineTo(5, -4); X.lineTo(0, 6); X.fill();
    if (owlK > 0) { X.globalAlpha = owlK * (0.5 + 0.5 * Math.sin(t * 3)); X.strokeStyle = '#FFF4CC'; X.lineWidth = 2; X.beginPath(); X.arc(0, 0, 58, 0, 6.283); X.stroke(); X.globalAlpha = 1; }
    X.restore();

    // fire station
    X.fillStyle = '#4A1E2A'; X.fillRect(1240, 690, 270, 400);
    X.fillStyle = '#B23A3A'; X.fillRect(1240, 670, 270, 30);
    X.fillStyle = '#2B1218'; X.beginPath(); X.roundRect(1275, 820, 90, 140, [40, 40, 0, 0]); X.fill(); X.beginPath(); X.roundRect(1385, 820, 90, 140, [40, 40, 0, 0]); X.fill();
    X.fillStyle = 'rgba(255,214,130,0.9)'; X.fillRect(1290, 730, 50, 40); X.fillRect(1410, 730, 50, 40);
    const siren = 0.5 + 0.5 * Math.sin(t * 4);
    X.save(); X.shadowColor = '#FF4D4D'; X.shadowBlur = 30 * siren * (1 - dim * 2);
    X.fillStyle = `rgba(255,77,77,${0.4 + 0.6 * siren})`; X.beginPath(); X.arc(1375, 655, 14, 0, 6.283); X.fill(); X.restore();
    // a firefighter waving from the window during l11
    const ffK = ease((t - l11.start) / 1);
    if (ffK > 0) {
      X.globalAlpha = ffK;
      X.fillStyle = '#F1C9A5'; X.beginPath(); X.arc(1435, 748, 10, 0, 6.283); X.fill();
      X.fillStyle = '#C8282E'; X.fillRect(1423, 734, 24, 6);
      X.strokeStyle = '#F1C9A5'; X.lineWidth = 5; X.lineCap = 'round';
      const wv = Math.sin(t * 6) * 0.5;
      X.beginPath(); X.moveTo(1448, 756); X.lineTo(1448 + Math.cos(-1.2 + wv) * 16, 756 + Math.sin(-1.2 + wv) * 16); X.stroke();
      X.globalAlpha = 1;
    }

    // street lamps
    for (const lx of [80, 560, 1140, 1640, 1880]) {
      X.fillStyle = '#0E1233'; X.fillRect(lx - 4, 920, 8, 200);
      X.save(); X.shadowColor = '#FFD98A'; X.shadowBlur = 30; X.fillStyle = '#FFE6A8'; X.beginPath(); X.arc(lx, 918, 10, 0, 6.283); X.fill(); X.restore();
    }

    // Batman's tower
    X.fillStyle = '#161C4E'; X.fillRect(700, 520, 300, 700);
    X.fillStyle = '#0F1440'; X.fillRect(690, 510, 320, 14);
    for (let wy = 560; wy < 1060; wy += 60) for (let wx = 730; wx < 980; wx += 56) { X.fillStyle = `rgba(255,214,130,${(((wx * 7 + wy) % 5) < 2 ? 0.75 : 0.12) * (1 - dim)})`; X.fillRect(wx, wy, 22, 30); }

    // ── Batman sitting on the edge ──
    const bx = 850, by = 510;
    const slump = 8 * ease((t - l2.start) / 1.5) * (1 - ease((t - l12.start) / 2)) + 6 * sleepK;
    const sigh = Math.max(0, Math.sin(clamp((t - l5.start - 0.5) / 1.6, 0, 1) * Math.PI)) * 6;
    X.save();
    X.translate(bx, by);
    // legs over the edge
    X.fillStyle = '#545A70'; X.fillRect(-22, -6, 16, 60); X.fillRect(6, -6, 16, 60);
    X.fillStyle = '#1C1C2A'; X.fillRect(-25, 48, 22, 14); X.fillRect(4, 48, 22, 14);
    X.translate(0, slump - sigh);
    // cape (wraps around him as he falls asleep)
    X.fillStyle = '#1C1C2A';
    const wrap = sleepK;
    X.beginPath(); X.moveTo(-42, -100); X.lineTo(42, -100); X.lineTo(lerp(70, 40, wrap), 6); X.lineTo(lerp(-70, -40, wrap), 6); X.closePath(); X.fill();
    // body + belt
    X.fillStyle = '#545A70'; X.beginPath(); X.roundRect(-28, -100, 56, 100, 14); X.fill();
    X.fillStyle = '#F2C94C'; X.fillRect(-28, -40, 56, 9);
    if (wrap > 0) { X.globalAlpha = wrap; X.fillStyle = '#1C1C2A'; X.beginPath(); X.roundRect(-34, -96, 68, 98, 18); X.fill(); X.globalAlpha = 1; }
    // head (tilts when asleep)
    X.save(); X.translate(0, -140); X.rotate(-0.22 * sleepK);
    X.fillStyle = '#1C1C2A';
    X.beginPath(); X.moveTo(-32, -18); X.lineTo(-36, -70); X.lineTo(-12, -36); X.closePath(); X.fill();
    X.beginPath(); X.moveTo(32, -18); X.lineTo(36, -70); X.lineTo(12, -36); X.closePath(); X.fill();
    X.beginPath(); X.arc(0, 0, 46, 0, 6.283); X.fill();
    X.fillStyle = '#F1C9A5'; X.beginPath(); X.ellipse(0, 27, 28, 19, 0, 0, Math.PI); X.fill();
    // eyes: open → tired → closed
    const tired = ease((t - l2.start) / 1.5) * (1 - ease((t - l12.start) / 2));
    if (sleepK < 0.5) {
      X.fillStyle = '#FFFFFF';
      for (const ex of [-18, 18]) { X.beginPath(); X.ellipse(ex, -4, 10, 4 * (1 - 0.5 * tired), ex < 0 ? 0.25 : -0.25, 0, 6.283); X.fill(); }
    } else {
      X.strokeStyle = '#FFFFFF'; X.lineWidth = 3; X.lineCap = 'round';
      for (const ex of [-18, 18]) { X.beginPath(); X.arc(ex, -6, 8, 0.2 * Math.PI, 0.8 * Math.PI); X.stroke(); }
    }
    const content = ease((t - l12.start - 1) / 1.5);
    X.strokeStyle = '#5A3B2A'; X.lineWidth = 3; X.lineCap = 'round';
    X.beginPath(); X.moveTo(-10, 34); X.quadraticCurveTo(0, 34 + 6 * content - 3 * tired, 10, 34); X.stroke();
    // Kitty's red ribbon on his cowl at l17
    const ribK = ease((t - l17.start - 2.5) / 0.8);
    if (ribK > 0) {
      X.globalAlpha = ribK; X.fillStyle = '#E8344E';
      X.beginPath(); X.ellipse(26, -30, 14, 10, -0.5, 0, 6.283); X.fill();
      X.beginPath(); X.ellipse(50, -36, 14, 10, 0.5, 0, 6.283); X.fill();
      X.beginPath(); X.arc(38, -33, 6, 0, 6.283); X.fill(); X.globalAlpha = 1;
    }
    X.restore();
    X.restore();

    // Zzz
    if (sleepK > 0.3) {
      for (let i = 0; i < 3; i++) {
        const p = ((t * 0.35 + i / 3) % 1);
        X.globalAlpha = (sleepK - 0.3) * Math.sin(p * Math.PI);
        ctx.text(X, 'z', bx + 50 + p * 70, by - 190 - p * 120, { family: 'num', weight: 800, size: 26 + p * 22, color: '#C9D2FF', align: 'center', dir: 'ltr' });
      }
      X.globalAlpha = 1;
    }

    // ── Kitty's balloon: flies in at l3, parks beside the roof ──
    const fly = ease((t - l3.start) / 5);
    const bob = Math.sin(t * 1.2) * 8;
    const kx = lerp(-250, 1070, fly), ky = lerp(330, 475, fly) + bob;
    if (fly > 0) {
      // strings + balloons
      const balloons = [[-70, -250, 46, '#FF8FB1'], [-10, -290, 52, '#FFB3C7'], [55, -250, 46, '#FF6F9C'], [-40, -200, 40, '#FFC9D9'], [30, -205, 42, '#FF8FB1']];
      X.strokeStyle = 'rgba(255,255,255,0.6)'; X.lineWidth = 2;
      for (const [x, y] of balloons) { X.beginPath(); X.moveTo(kx, ky - 60); X.lineTo(kx + x, ky + y + 40); X.stroke(); }
      for (const [x, y, rr, c] of balloons) {
        X.fillStyle = c; X.beginPath(); X.ellipse(kx + x, ky + y, rr * 0.85, rr, 0, 0, 6.283); X.fill();
        X.fillStyle = 'rgba(255,255,255,0.45)'; X.beginPath(); X.ellipse(kx + x - rr * 0.3, ky + y - rr * 0.35, rr * 0.18, rr * 0.28, -0.4, 0, 6.283); X.fill();
      }
      // Kitty in the basket
      const kh = ky - 55;
      X.strokeStyle = '#2B2B2B'; X.lineWidth = 3; X.fillStyle = '#FFFFFF';
      X.beginPath(); X.moveTo(kx - 42, kh - 18); X.lineTo(kx - 46, kh - 60); X.lineTo(kx - 14, kh - 40); X.closePath(); X.fill(); X.stroke();
      X.beginPath(); X.moveTo(kx + 14, kh - 40); X.lineTo(kx + 46, kh - 60); X.lineTo(kx + 42, kh - 18); X.closePath(); X.fill(); X.stroke();
      X.beginPath(); X.ellipse(kx, kh, 56, 44, 0, 0, 6.283); X.fill(); X.stroke();
      X.fillStyle = '#E8344E';
      X.beginPath(); X.ellipse(kx + 34, kh - 46, 15, 11, -0.5, 0, 6.283); X.fill();
      X.beginPath(); X.ellipse(kx + 60, kh - 54, 15, 11, 0.5, 0, 6.283); X.fill();
      X.beginPath(); X.arc(kx + 47, kh - 50, 6, 0, 6.283); X.fill();
      const kb = Math.sin(t * 0.8) > 0.985 ? 0.15 : 1;
      X.fillStyle = '#1A1A1A'; for (const ex of [-20, 20]) { X.beginPath(); X.ellipse(kx + ex, kh + 2, 5, 7 * kb, 0, 0, 6.283); X.fill(); }
      X.fillStyle = '#F5C542'; X.beginPath(); X.ellipse(kx, kh + 14, 5, 3.5, 0, 0, 6.283); X.fill();
      X.strokeStyle = '#2B2B2B'; X.lineWidth = 2;
      for (const [d, dy] of [[-1, -4], [-1, 6], [1, -4], [1, 6]]) { X.beginPath(); X.moveTo(kx + d * 40, kh + 8 + dy * 0.5); X.lineTo(kx + d * 68, kh + 6 + dy); X.stroke(); }
      // basket
      X.fillStyle = '#B07A45'; X.beginPath(); X.roundRect(kx - 60, ky - 20, 120, 60, 10); X.fill();
      X.strokeStyle = '#7E5430'; X.lineWidth = 3;
      for (let i = 1; i < 5; i++) { X.beginPath(); X.moveTo(kx - 60 + i * 24, ky - 20); X.lineTo(kx - 60 + i * 24, ky + 40); X.stroke(); }
      X.beginPath(); X.moveTo(kx - 60, ky + 10); X.lineTo(kx + 60, ky + 10); X.stroke();

      // music notes rising from Kitty during the song
      if (t > l14.start && t < l16.start + 4) {
        const songA = ease((t - l14.start) / 1) * (1 - ease((t - l16.start - 2) / 2));
        for (const n of this.notes) {
          const p = ((t - l14.start - n.d) * 0.22) % 1; if (t - l14.start < n.d) continue;
          X.globalAlpha = songA * Math.sin(p * Math.PI);
          ctx.text(X, '♪', kx + n.dx + Math.sin(t * 2 + n.ph) * 20 - 80 * p, kh - 70 - p * 260, { family: 'body', weight: 700, size: 40, color: '#FFD86B', align: 'center' });
        }
        X.globalAlpha = 1;
      }
    }
    X.restore();   // end camera

    // night dims a little during the song
    if (dim > 0) { X.fillStyle = `rgba(3,5,20,${dim * 0.6})`; X.fillRect(0, 0, 1920, 1080); }

    // title card
    const l0 = L('l0');
    const tA = ease((t - l0.start + 0.5) / 1) * (1 - ease((t - l0.end + 0.2) / 1));
    if (tA > 0) {
      X.globalAlpha = tA;
      X.fillStyle = 'rgba(5,8,30,0.45)'; X.fillRect(0, 0, 1920, 1080);
      ctx.text(X, 'هلو كيتي وباتمان', 960, 470, { family: 'display', weight: 900, size: 120, color: P.acc, align: 'center', shadow: { blur: 30, y: 0, color: 'rgba(255,216,107,0.5)' } });
      ctx.text(X, 'باتمان لا يستطيع النوم', 960, 590, { family: 'body', weight: 700, size: 64, color: P.ink, align: 'center' });
      X.globalAlpha = 1;
    }

    // subtitles
    for (const l of S) {
      if (!l.text || l.shot === 'end') continue;
      const sA = ease((t - l.start + 0.25) / 0.4) * (1 - ease((t - l.end - 0.3) / 0.4));
      if (sA <= 0) continue;
      X.globalAlpha = sA;
      const song = l.shot === 'song';
      const lay = ctx.text.layout(X, l.text, { family: 'body', weight: 700, size: song ? 52 : 48, maxWidth: song ? 1100 : 1560, lineHeight: 1.45 });
      const n = lay.lines ? lay.lines.length : 1, h = 72 * n + 40;
      X.fillStyle = song ? 'rgba(60,20,50,0.55)' : 'rgba(5,8,30,0.55)'; X.beginPath(); X.roundRect(140, 1040 - h, 1640, h, 24); X.fill();
      ctx.text.drawLayout(X, lay, 960, 1040 - h + 68, { align: 'center', color: song ? '#FFD9E6' : P.ink });
    }
    X.globalAlpha = 1;

    // ending
    const l18 = L('l18');
    const eA = ease((t - l18.start + 0.3) / 1.2);
    if (eA > 0) {
      X.globalAlpha = eA; X.fillStyle = 'rgba(5,8,30,0.6)'; X.fillRect(0, 0, 1920, 1080);
      const lay = ctx.text.layout(X, l18.text, { family: 'body', weight: 700, size: 62, maxWidth: 1300, lineHeight: 1.5 });
      ctx.text.drawLayout(X, lay, 960, 420, { align: 'center', color: P.ink });
      X.globalAlpha = ease((t - l18.start - 6.5) / 1.2);
      ctx.text(X, 'تصبحون على خير', 960, 720, { family: 'display', weight: 900, size: 96, color: P.acc, align: 'center', shadow: { blur: 30, y: 0, color: 'rgba(255,216,107,0.5)' } });
      X.globalAlpha = 1;
    }
    const fade = ease((t - (ctx.project.duration - 2)) / 2);
    if (fade > 0) { X.fillStyle = `rgba(0,0,0,${fade})`; X.fillRect(0, 0, 1920, 1080); }
  },
});
