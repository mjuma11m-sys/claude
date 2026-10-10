// shared helpers for every scene (word-stagger text, chapter chip, demo frame)
const BH = globalThis.BH = {
  // words rise in one after another (stagger st), from local time t0
  words(ctx, lt, str, x, y, o = {}) {
    const { X, P, at } = ctx, t0 = o.t0 || 0, st = o.st ?? .08;
    const L = ctx.text.layout(X, str, { family: o.family || 'body', weight: o.weight || 700, size: o.size || 56, maxWidth: o.maxWidth || 860, lineHeight: o.lh || 1.3 });
    const hi = o.hi || [];
    ctx.text.drawLayout(X, L, x, y, { align: o.align || 'center', color: o.color || P.ink, perWord: i => {
      const k = at(lt, t0 + i * st, t0 + i * st + .28, 'expoOut'), out = o.out != null ? 1 - at(lt, o.out, o.out + .2) : 1;
      return { alpha: k * out, dy: (1 - k) * (o.rise ?? 36), color: hi.includes(i) ? (o.hiColor || P.acc) : (o.color || P.ink) }; } });
    return L;
  },
  // chapter chip at the top: «1/3  أساسيات الريل»
  chip(ctx, lt, n, label) {
    const { X, P, at } = ctx, k = at(lt, 0, .3, 'expoOut');
    X.save(); X.globalAlpha = k; X.font = ctx.font('body', 700, 34);
    const w = X.measureText(label).width + 150;
    X.fillStyle = 'rgba(242,179,61,.12)'; X.strokeStyle = P.acc; X.lineWidth = 2;
    X.beginPath(); X.roundRect(540 - w / 2, 188, w, 64, 32); X.fill(); X.stroke(); X.restore();
    ctx.text(X, label, 540 + 34, 232, { family: 'body', weight: 700, size: 34, color: P.ink, alpha: k });
    ctx.text(X, n + '/3', 540 - w / 2 + 52, 232, { family: 'num', weight: 800, size: 30, color: P.acc, alpha: k, dir: 'ltr' });
  },
  // technique header: English name + Arabic line
  head(ctx, lt, en, ar) {
    const { X, P, at } = ctx, k = at(lt, .05, .4, 'expoOut');
    ctx.text(X, en, 540, 352 + (1 - k) * 30, { family: 'num', weight: 800, size: 78, color: P.acc, alpha: k, dir: 'ltr' });
    BH.words(ctx, lt, ar, 540, 432, { size: 46, t0: .2, color: P.mut, rise: 20 });
  },
  // rounded demo frame, returns clip helper
  frame(ctx, lt, o = {}) {
    const { X, P, at } = ctx, k = at(lt, .1, .5, 'expoOut'), r = o.r || [150, 500, 780, 660];
    X.save(); X.globalAlpha = k; X.fillStyle = o.fill || '#151B24'; X.beginPath(); X.roundRect(r[0], r[1] + (1 - k) * 30, r[2], r[3], 34); X.fill();
    X.strokeStyle = 'rgba(244,241,234,.10)'; X.lineWidth = 2; X.stroke(); X.restore();
    return k;
  },
  clip(X, r = [150, 500, 780, 660]) { X.save(); X.beginPath(); X.roundRect(r[0], r[1], r[2], r[3], 34); X.clip(); },
};
export default BH;

// chapter title card: big number + Arabic title + English subtitle
BH.chapter = (ctx, lt, n, ar, en) => {
  const { X, P, at } = ctx, k = at(lt, 0, .35, 'expoOut'), k2 = at(lt, .15, .5, 'expoOut');
  const out = 1 - at(lt, ctx.scene.dur - .25, ctx.scene.dur);
  X.save(); X.globalAlpha = .07 * k; X.strokeStyle = P.acc; X.lineWidth = 3;
  for (let i = 0; i < 6; i++) { X.beginPath(); X.arc(540, 860, 160 + i * 70 + lt * 40, 0, 6.283); X.stroke(); }
  X.restore();
  X.save(); X.globalAlpha = out; X.translate(540, 860); X.scale(.94 + .06 * k, .94 + .06 * k);
  ctx.text(X, String(n), 0, 0, { family: 'num', weight: 900, size: 340, color: P.acc, alpha: k, dir: 'ltr' }); X.restore();
  ctx.text(X, ar, 540, 1070 + (1 - k2) * 40, { family: 'display', weight: 900, size: 112, color: P.ink, alpha: k2 * out });
  ctx.text(X, en, 540, 1150, { family: 'num', weight: 600, size: 38, color: P.mut, alpha: k2 * out, letterSpacing: 4, dir: 'ltr' });
};
// phone outline centred at (cx, cy)
BH.phone = (X, cx, cy, w, h, col, alpha = 1) => {
  X.save(); X.globalAlpha *= alpha; X.strokeStyle = col; X.lineWidth = 5;
  X.beginPath(); X.roundRect(cx - w / 2, cy - h / 2, w, h, 38); X.stroke();
  X.fillStyle = col; X.beginPath(); X.roundRect(cx - 40, cy - h / 2 + 16, 80, 14, 7); X.fill(); X.restore();
};
// one or two bottom lines of explanation
BH.explain = (ctx, lt, l1, l2, o = {}) => {
  BH.words(ctx, lt, l1, 540, o.y1 || 1300, { size: 54, t0: o.t0 ?? .55, hi: o.hi1 || [] });
  if (l2) BH.words(ctx, lt, l2, 540, o.y2 || 1378, { size: 44, t0: (o.t0 ?? .55) + .5, color: ctx.P.mut, hi: o.hi2 || [], rise: 24 });
};

// 3D set for camera-move demos: gold subject on a pedestal + two side objects + floor grid
BH.set3D = ctx => {
  const { THREE, P } = ctx;
  const st = ctx.stage3D({ fov: 34, camera: [0, 1.6, 10], lookAt: [0, 1, 0], env: 'room', tone: 'neutral' });
  const m = c => new THREE.MeshPhysicalMaterial({ color: c, roughness: .3, clearcoat: .5, metalness: .2, envMapIntensity: .9 });
  const subj = st.add(new THREE.Mesh(new ctx.RoundedBoxGeometry(1.5, 1.5, 1.5, 5, .2), m(P.acc))); subj.position.set(0, 1.35, 0);
  const ped = st.add(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, .6, 48), m('#2A3340'))); ped.position.set(0, .3, 0);
  const a = st.add(new THREE.Mesh(new ctx.RoundedBoxGeometry(1, 2.2, 1, 4, .15), m(P.clay))); a.position.set(-2.4, 1.1, -.6);
  const b = st.add(new THREE.Mesh(new THREE.SphereGeometry(.8, 48, 32), m(P.mut))); b.position.set(2.4, .8, -.6);
  const g = new THREE.GridHelper(30, 30, 0x3a4452, 0x232a35); st.add(g);
  const key = new THREE.DirectionalLight('#ffffff', 1.5); key.position.set(4, 7, 6); st.add(key);
  return { st, subj, a, b };
};
// viewfinder overlay + REC dot on the demo frame
BH.viewfinder = (ctx, lt, kf) => {
  const { X, P } = ctx;
  X.save(); X.globalAlpha = kf * .9; X.strokeStyle = P.ink; X.lineWidth = 4;
  [[190, 540, 1, 1], [890, 540, -1, 1], [190, 1120, 1, -1], [890, 1120, -1, -1]].forEach(([x, y, sx, sy]) => { X.beginPath(); X.moveTo(x, y + 50 * sy); X.lineTo(x, y); X.lineTo(x + 50 * sx, y); X.stroke(); });
  X.fillStyle = P.clay; X.globalAlpha = kf * (Math.floor(lt * 2) % 2 ? .35 : 1); X.beginPath(); X.arc(230, 582, 11, 0, 6.283); X.fill(); X.restore();
  ctx.text(X, 'REC', 290, 594, { family: 'num', weight: 800, size: 28, color: P.ink, alpha: kf, dir: 'ltr' });
};
// top-view inset: subject square + camera triangle at (cx, cz) looking at (lx, lz); world units → px
BH.minimap = (ctx, kf, cam, look, trail) => {
  const { X, P } = ctx, ox = 270, oy = 1040, s = 3.4;
  X.save(); X.globalAlpha = kf; X.fillStyle = 'rgba(13,17,23,.85)'; X.beginPath(); X.roundRect(175, 960, 190, 170, 18); X.fill();
  X.fillStyle = P.acc; X.fillRect(ox - 7, oy - 7, 14, 14);
  X.fillStyle = P.clay; X.fillRect(ox - 2.4 * s - 5, oy - .6 * s - 5, 10, 10); X.fillStyle = P.mut; X.beginPath(); X.arc(ox + 2.4 * s, oy - .6 * s, 6, 0, 6.283); X.fill();
  if (trail && trail.length > 1) { X.strokeStyle = 'rgba(244,241,234,.35)'; X.lineWidth = 2; X.setLineDash([4, 5]); X.beginPath(); trail.forEach(([x, z], i) => i ? X.lineTo(ox + x * s, oy + z * s) : X.moveTo(ox + x * s, oy + z * s)); X.stroke(); X.setLineDash([]); }
  const cx = ox + cam[0] * s, cz = oy + cam[1] * s, ang = Math.atan2(look[1] - cam[1], look[0] - cam[0]);
  X.translate(Math.max(185, Math.min(355, cx)), Math.max(970, Math.min(1120, cz))); X.rotate(ang);
  X.fillStyle = P.ink; X.beginPath(); X.moveTo(10, 0); X.lineTo(-8, -8); X.lineTo(-8, 8); X.closePath(); X.fill(); X.restore();
  ctx.text(X, 'من فوق', 270, 1118, { family: 'body', weight: 700, size: 20, color: P.mut, alpha: kf });
};
