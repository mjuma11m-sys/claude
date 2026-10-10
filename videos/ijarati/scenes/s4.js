import { bg, rise, rr, tag } from './_kit.js';
// FEATURE 2: تذكير واتساب بضغطة زر
MOTION.scene({ id: 's4',
  draw(t, lt, ctx) {
    const { X, P, at, lerp } = ctx; const S = ctx.scene.start;
    bg(ctx, t, 0.45);
    tag(ctx, t, 'ميزة 2', 540, 250, S + .05);
    rise(ctx, t, 'تذكير واتساب', 540, 420, S + .15, { size: 112, color: P.ink });
    rise(ctx, t, 'بضغطة زر', 540, 545, S + .3, { size: 112, color: P.acc });
    const press = .95, pk = at(lt, press - .08, press, 'quadIn') * (1 - at(lt, press, press + .2, 'cubicOut'));
    const bk = at(lt, .35, .7, 'expoOut'), sc = (.94 + .06 * bk) * (1 - .08 * pk);
    // ripple
    for (let q = 0; q < 2; q++) { const rk = at(lt, press + q * .12, press + q * .12 + .7, 'cubicOut'); if (rk <= 0 || rk >= 1) continue;
      X.save(); X.globalAlpha = (1 - rk) * .6; X.strokeStyle = P.acc; X.lineWidth = 8; X.beginPath(); X.arc(540, 860, 150 + rk * 260, 0, 7); X.stroke(); X.restore(); }
    X.save(); X.globalAlpha = bk; X.translate(540, 860); X.scale(sc, sc);
    X.fillStyle = P.acc; X.beginPath(); X.arc(0, 0, 150, 0, 7); X.fill();
    // bell
    X.fillStyle = P.bg; X.beginPath(); X.moveTo(-62, 40); X.quadraticCurveTo(-58, -70, 0, -72); X.quadraticCurveTo(58, -70, 62, 40); X.lineTo(78, 58); X.lineTo(-78, 58); X.closePath(); X.fill();
    X.beginPath(); X.arc(0, 74, 18, 0, 7); X.fill(); X.beginPath(); X.arc(0, -78, 11, 0, 7); X.fill();
    X.restore();
    // pointer
    const fk = at(lt, .45, press, 'expoOut'), fo = 1 - at(lt, press + .35, press + .6);
    if (fk > 0 && fo > 0) { X.save(); X.globalAlpha = fo; X.translate(lerp(820, 600, fk), lerp(1150, 920, fk)); X.scale(1 - .12 * pk, 1 - .12 * pk);
      X.fillStyle = P.ink; X.strokeStyle = P.bg; X.lineWidth = 6; X.beginPath(); X.arc(0, 0, 38, 0, 7); X.fill(); X.stroke(); X.restore(); }
    // chat bubble
    const ck = at(lt, press + .25, press + .6, 'expoOut');
    if (ck > 0) {
      X.save(); X.globalAlpha = ck; X.translate(0, (1 - ck) * 80);
      X.fillStyle = P.ink; rr(X, 150, 1130, 780, 190, 36); X.fill();
      X.beginPath(); X.moveTo(880, 1300); X.lineTo(950, 1340); X.lineTo(860, 1318); X.fill();
      X.restore();
      ctx.text(X, 'تذكير: إيجار هالشهر مستحق', 890, 1215 + (1 - ck) * 80, { family: 'body', weight: 700, size: 50, color: P.bg, align: 'right', alpha: ck });
      ctx.text(X, 'شكراً لتعاونك', 890, 1285 + (1 - ck) * 80, { family: 'body', weight: 400, size: 40, color: '#4A5A70', align: 'right', alpha: ck });
      const tk = at(lt, press + .9, press + 1.1); const tc = tk > .5 ? P.clay : '#9AA6B6';
      X.save(); X.globalAlpha = ck; X.strokeStyle = tc; X.lineWidth = 7; X.lineCap = 'round'; X.lineJoin = 'round';
      for (const o of [0, 22]) { X.beginPath(); X.moveTo(190 + o, 1278); X.lineTo(205 + o, 1293); X.lineTo(235 + o, 1258); X.stroke(); }
      X.restore();
    }
    rise(ctx, t, 'بدون إحراج… وبدون اتصالات', 540, 1470, S + 2.0, { size: 60, weight: 700, family: 'body', color: P.mut });
  } });
