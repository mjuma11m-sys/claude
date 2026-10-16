import { bg, rise, phone, demoLabel } from './_kit.js';
// كل شي بمكان واحد: أربع شاشات تنفرد مثل أوراق اللعب
MOTION.scene({ id: 's7',
  draw(t, lt, ctx) {
    const { X, P, at, lerp } = ctx; const S = ctx.scene.start;
    bg(ctx, t, 0.6);
    rise(ctx, t, 'كل أملاك العائلة', 540, 330, S + 0.1, { size: 100, color: P.ink });
    rise(ctx, t, 'بمكان واحد', 540, 450, S + 0.3, { size: 100, color: P.acc });
    const cards = [['house', 'الصيانة'], ['bank', 'بنك العائلة'], ['budget', 'الميزانية'], ['home', 'الإيجارات']];
    cards.forEach(([img, label], i) => {
      const k = at(lt, 0.2 + i * 0.12, 0.9 + i * 0.12, 'expoOut');
      const spread = (i - 1.5);
      const x = 540 + spread * lerp(0, 190, k), rot = spread * lerp(0, 0.16, k), y = lerp(1950, 1090 + Math.abs(spread) * 40, k);
      phone(ctx, img, x, y, 330, rot);
      const lk = at(lt, 1.2 + i * 0.1, 1.5 + i * 0.1, 'expoOut');
      ctx.text(X, label, x + Math.sin(rot) * 420, y - 420 - lk * 10, { family: 'body', weight: 700, size: 38, color: P.ink, alpha: lk });
    });
    demoLabel(ctx, t, S + 0.3);
  } });
