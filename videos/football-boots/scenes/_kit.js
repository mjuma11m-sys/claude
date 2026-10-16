// football-boots kit: procedural boot + pitch + shared 2D helpers. No brand assets, no randomness.
export const BOOTS = {
  cb: { upper: '#1c2127', accent: '#C6FF3D', sole: '#0c0e10', stud: 'round', label: 'مدافع', code: 'CB', tag: 'ثبات وحماية',
        c1: ['مقدمة معزّزة', 'حماية عند التدخلات'], c2: ['مسامير دائرية', 'ثبات بالالتحام'], p1: [1.55, .2, 0], p2: [-.1, -.28, .5] },
  cm: { upper: '#b9c2cf', accent: '#2d8cff', sole: '#1a2030', stud: 'mixed', label: 'وسط', code: 'CM', tag: 'توازن وتحمّل',
        c1: ['ملمس متوازن', 'للتمرير والاستلام'], c2: ['نعل مريح', 'طول المباراة'], p1: [.5, .55, .45], p2: [-.3, -.28, .5] },
  wg: { upper: '#ff7a1a', accent: '#111418', sole: '#15110d', stud: 'blade', label: 'جناح', code: 'WG', tag: 'خفة وانطلاق',
        c1: ['وزن خفيف', 'للسرعة'], c2: ['مسامير شفرية', 'تسارع وتغيير اتجاه'], p1: [.2, .6, .45], p2: [.9, -.28, .5] },
  st: { upper: '#e6203a', accent: '#fff3f5', sole: '#14090b', stud: 'cone', label: 'مهاجم', code: 'ST', tag: 'لمسة وتسديد',
        c1: ['قماش رقيق', 'إحساس أقرب بالكرة'], c2: ['نعل خفيف', 'للتسديد والانطلاق'], p1: [1.1, .38, .42], p2: [.6, -.28, .5] },
  gk: { glove: true, label: 'حارس مرمى', code: 'GK', tag: 'قبضة وثبات',
        c1: ['كف لاتكس', 'قبضة أفضل على الكرة'], c2: ['رباط معصم', 'ثبات القفاز باليد'], p1: [0, .35, .3], p2: [0, -.82, .3] },
};
const sstep = (a, b, v) => { const k = Math.min(1, Math.max(0, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
// half-width of the boot body at (x,y): wide at heel/mid, narrow at toe, tapering to the top
const halfW = (x, y) => .5 * (1 - .42 * sstep(.2, 1.6, x)) * (1 - .32 * Math.min(1, Math.max(0, y) / 1.2)) * (.88 + .12 * sstep(-1.5, -.6, x));

export function makeBoot(THREE, spec, opt = {}) {
  const g = new THREE.Group();
  const mat = (c, r = .5, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, envMapIntensity: .45 });
  // upper: side profile extruded, then tapered in width
  const s = new THREE.Shape();
  s.moveTo(-1.5, .02); s.lineTo(1.42, .02);
  s.bezierCurveTo(1.72, .04, 1.78, .3, 1.5, .42);
  s.bezierCurveTo(1.15, .52, .95, .6, .62, .8);
  s.bezierCurveTo(.4, .95, .2, 1.02, -.1, 1.04);
  s.lineTo(-.62, 1.12);
  s.bezierCurveTo(-.95, 1.16, -1.3, 1.08, -1.46, .92);
  s.bezierCurveTo(-1.58, .6, -1.58, .3, -1.5, .02);
  const ug = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: true, bevelThickness: .08, bevelSize: .08, bevelSegments: 4, curveSegments: 28 });
  ug.translate(0, 0, -.5);
  const p = ug.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, p.getZ(i) * 2 * halfW(x, y) * .98); }
  ug.computeVertexNormals();
  const upper = new THREE.Mesh(ug, mat(spec.upper, .62, 0)); g.add(upper);
  // dark collar opening on top of the ankle
  const col = new THREE.Mesh(new THREE.CircleGeometry(.42, 32), mat('#05070a', .9)); col.rotation.x = -Math.PI / 2; col.scale.set(1.05, 1.5, 1);
  col.position.set(-.82, 1.1, 0); col.rotation.z = .1; g.add(col);
  // accent stripes both sides
  const st = new THREE.Shape();
  st.moveTo(-.9, .22); st.bezierCurveTo(-.2, .3, .35, .62, 1.05, .72); st.lineTo(1.12, .62); st.bezierCurveTo(.45, .5, -.15, .18, -.9, .1); st.closePath();
  for (const side of [1, -1]) {
    const sg = new THREE.ShapeGeometry(st, 24); const q = sg.attributes.position;
    for (let i = 0; i < q.count; i++) q.setZ(i, side * (halfW(q.getX(i), q.getY(i)) * 2 * .5 + .095));
    sg.computeVertexNormals(); const m = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ color: spec.accent, roughness: .35, side: THREE.DoubleSide, polygonOffsetFactor: -2, polygonOffset: true })); g.add(m);
  }
  // laces
  const lm = mat('#f2f2ee', .6);
  for (let i = 0; i < 5; i++) { const x = .15 + i * .24, y = .98 - i * .1 - (i > 2 ? i * .03 : 0);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, halfW(x, y) * 1.5, 8), lm); l.rotation.x = Math.PI / 2; l.position.set(x - .1, Math.min(y, .88) - .03 * i, 0); l.rotation.z = -.0; g.add(l); }
  // sole plate
  const sole = new THREE.Shape();
  sole.moveTo(-1.52, 0); sole.lineTo(1.45, 0); sole.bezierCurveTo(1.82, 0, 1.82, -.05, 1.45, -.05); sole.lineTo(-1.5, -.05);
  const sg2 = new THREE.BoxGeometry(3.4, .12, 1.0, 1, 1, 1);
  const sp = sg2.attributes.position;
  for (let i = 0; i < sp.count; i++) { const x = sp.getX(i); sp.setZ(i, sp.getZ(i) * (.72 + .28 * (1 - sstep(.1, 1.7, x) * .9 - (x < -1.2 ? .15 : 0)))); }
  sg2.computeVertexNormals();
  const sl = new THREE.Mesh(sg2, mat(spec.sole, .6)); sl.position.set(.12, -.04, 0); g.add(sl);
  // studs
  const sm = mat('#cfd6da', .35, .4); const pos = [[-1.15, -.3], [-1.15, .3], [-.55, -.34], [-.55, .34], [.15, -.3], [.15, .3], [.75, -.26], [.75, .26], [1.3, -.12], [1.3, .12], [1.55, 0]];
  pos.forEach(([x, z], i) => { let m;
    if (spec.stud === 'blade') { m = new THREE.Mesh(new THREE.BoxGeometry(.26, .15, .04), sm); m.rotation.y = (i % 2 ? .6 : -.6); }
    else if (spec.stud === 'cone') { m = new THREE.Mesh(new THREE.ConeGeometry(.05, .15, 12), sm); m.rotation.z = Math.PI; }
    else if (spec.stud === 'mixed') { m = i % 2 ? new THREE.Mesh(new THREE.CylinderGeometry(.05, .07, .13, 12), sm) : new THREE.Mesh(new THREE.BoxGeometry(.24, .13, .04), sm); if (i % 2 === 0) m.rotation.y = .5; }
    else m = new THREE.Mesh(new THREE.CylinderGeometry(.05, .075, .15, 14), sm);
    m.position.set(x, -.19, z * (.9 - .5 * sstep(.8, 1.6, x))); g.add(m); });
  g.scale.setScalar(opt.scale || 1);
  return g;
}

export function makeGlove(THREE, RBG, flipX = 1) {
  const g = new THREE.Group(); const M = (c, r = .55) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0, envMapIntensity: .6 });
  const back = M('#15181c'), latex = M('#b9d93a', .8), acc = M('#C6FF3D', .4), band = M('#f1f3ef', .7);
  const palm = new THREE.Mesh(new RBG(1.05, .95, .3, 5, .12), back); g.add(palm);
  const pl = new THREE.Mesh(new RBG(.9, .82, .06, 4, .03), latex); pl.position.z = .16; g.add(pl);
  [[-.36, .62, .6], [-.12, .72, .68], [.12, .72, .66], [.36, .62, .56]].forEach(([x, y, l], i) => {
    const f = new THREE.Mesh(new THREE.CapsuleGeometry(.105, l, 6, 14), back); f.position.set(x, y + l / 2 - .1, 0); f.rotation.z = (i - 1.5) * -.05; g.add(f);
    const fl = new THREE.Mesh(new THREE.CapsuleGeometry(.075, l * .9, 6, 12), latex); fl.position.set(x, y + l / 2 - .1, .07); fl.rotation.z = (i - 1.5) * -.05; g.add(fl); });
  const th = new THREE.Mesh(new THREE.CapsuleGeometry(.12, .5, 6, 14), back); th.position.set(.62, .1, .02); th.rotation.z = -.75; g.add(th);
  const tl = new THREE.Mesh(new THREE.CapsuleGeometry(.08, .42, 6, 12), latex); tl.position.set(.64, .1, .1); tl.rotation.z = -.75; g.add(tl);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(.5, .46, .5, 28), back); cuff.position.set(0, -.68, 0); cuff.scale.z = .55; g.add(cuff);
  const bd = new THREE.Mesh(new THREE.CylinderGeometry(.52, .52, .16, 28), band); bd.position.set(0, -.82, 0); bd.scale.z = .57; g.add(bd);
  const ac = new THREE.Mesh(new THREE.CylinderGeometry(.505, .505, .06, 28), acc); ac.position.set(0, -.58, 0); ac.scale.z = .56; g.add(ac);
  const st = new THREE.Mesh(new RBG(.12, .7, .04, 3, .015), acc); st.position.set(0, .1, -.16); g.add(st);
  g.scale.x = flipX; return g;
}
export function pitchTexture(THREE, W = 1024, H = 2048) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#0e3a22' : '#0b3320'; x.fillRect(0, i * H / 16, W, H / 16 + 1); }
  x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 6; const m = 60;
  x.strokeRect(m, m, W - 2 * m, H - 2 * m);
  x.beginPath(); x.moveTo(m, H / 2); x.lineTo(W - m, H / 2); x.stroke();
  x.beginPath(); x.arc(W / 2, H / 2, 130, 0, 7); x.stroke();
  x.strokeRect(W / 2 - 260, m, 520, 250); x.strokeRect(W / 2 - 260, H - m - 250, 520, 250);
  x.strokeRect(W / 2 - 120, m, 240, 90); x.strokeRect(W / 2 - 120, H - m - 90, 240, 90);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// floodlight bokeh dots (2D, deterministic)
export function lights(ctx, t, y0 = 120) {
  const { X, W } = ctx;
  for (let i = 0; i < 9; i++) { const x = 60 + i * (W - 120) / 8, y = y0 + 30 * Math.sin(i * 1.7) + (i % 2) * 40, r = 16 + (i % 3) * 8;
    const g = X.createRadialGradient(x, y, 0, x, y, r * 4); g.addColorStop(0, 'rgba(230,255,200,.55)'); g.addColorStop(.25, 'rgba(198,255,61,.14)'); g.addColorStop(1, 'rgba(198,255,61,0)');
    X.fillStyle = g; X.beginPath(); X.arc(x, y, r * 4, 0, 7); X.fill(); }
}
export function night(ctx, glowY = .62) {
  const { X, W, H } = ctx;
  const g = X.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#04140f'); g.addColorStop(.5, '#06221a'); g.addColorStop(1, '#03100c');
  X.fillStyle = g; X.fillRect(0, 0, W, H);
  const r = X.createRadialGradient(W / 2, H * glowY, 0, W / 2, H * glowY, 900); r.addColorStop(0, 'rgba(198,255,61,.16)'); r.addColorStop(1, 'rgba(198,255,61,0)');
  X.fillStyle = r; X.fillRect(0, 0, W, H);
}
export function chip(ctx, str, x, y, { size = 54, bg = '#C6FF3D', fg = '#06120E', alpha = 1, scale = 1 } = {}) {
  const { X } = ctx; X.save(); X.globalAlpha *= alpha; X.translate(x, y); X.scale(scale, scale);
  X.font = ctx.font('Inter', 900, size); const w = X.measureText(str).width + size * .9, h = size * 1.45;
  X.fillStyle = bg; X.beginPath(); X.roundRect(-w / 2, -h / 2, w, h, h * .28); X.fill();
  ctx.text(X, str, 0, size * .36, { family: 'Inter', weight: 900, size, color: fg, align: 'center', dir: 'ltr' }); X.restore(); return w;
}
export function callout(ctx, t, s, str1, str2, ax, ay, bx, by, e) {
  const { X, at } = ctx; const k = at(t, s, s + .35, 'expoOut'); const o = e ? 1 - at(t, e - .25, e, 'cubicIn') : 1; if (k <= 0 || o <= 0) return;
  X.save(); X.globalAlpha = o * Math.min(1, k * 1.5);
  // leader line to the boot point
  X.strokeStyle = '#C6FF3D'; X.lineWidth = 3; X.beginPath(); X.moveTo(bx, by); X.lineTo(bx + (ax - bx) * k, by + (ay - by) * k); X.stroke();
  X.fillStyle = '#C6FF3D'; X.beginPath(); X.arc(bx, by, 11, 0, 7); X.fill(); X.strokeStyle = 'rgba(198,255,61,.5)'; X.lineWidth = 3; X.beginPath(); X.arc(bx, by, 11 + 14 * k, 0, 7); X.stroke();
  const w = 560, h = 130, y = ay + (1 - k) * 24;
  X.fillStyle = 'rgba(6,24,20,.92)'; X.strokeStyle = 'rgba(198,255,61,.6)'; X.lineWidth = 2.5; X.beginPath(); X.roundRect(ax - w / 2, y - h / 2, w, h, 26); X.fill(); X.stroke();
  ctx.text(X, str1, ax, y - 8, { family: 'display', weight: 900, size: 56, color: '#F4F7F2', align: 'center', maxWidth: w - 50 });
  ctx.text(X, str2, ax, y + 40, { family: 'body', weight: 700, size: 38, color: '#9fb7ad', align: 'center', maxWidth: w - 50 });
  X.restore();
}
export function project(st, v3, W, H) { const v = v3.clone().project(st.camera); return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H]; }
export const disclaimer = (ctx, a = 1) => { ctx.X.save(); ctx.X.globalAlpha *= a; ctx.text(ctx.X, '* تصاميم توضيحية · مو موديل محدد', 540, 1488, { family: 'body', weight: 700, size: 30, color: '#7f968c', align: 'center' }); ctx.X.restore(); };
