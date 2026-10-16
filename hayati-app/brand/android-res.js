// أيقونات وشاشة بداية أندرويد من نفس شعار «حياتي» (DW-008)
//   node brand/android-res.js → android/app/src/main/res/
//   - أيقونة متكيّفة: الشكل داخل المنطقة الآمنة (66 من 108dp) على خلفية بحرية
//   - أيقونة التنبيه الصغيرة: بيضا بس (أندرويد يلوّنها بنفسه، والملونة تطلع مربع أبيض)
//   - شاشة البداية: بحري والشعار بالنص، مثل الآيفون
const fs = require('fs'), path = require('path');
const { chromium } = require('../node_modules/@playwright/test');
const RES = path.join(__dirname, '../android/app/src/main/res');
const SEA = '#0E3B43', PEARL = '#E8DCC4', CORAL = '#FF6B4A';
const ARC = 'M 383.3 172.7 A 160 160 0 1 1 300 102.2';
const HA = 'M 304 166 L 196 166 L 264 222 C 204 222 168 254 168 292 C 168 336 206 360 256 360 C 292 360 318 348 338 332';
const glyph = (ink, dot, arcOpacity) => `<path d="${ARC}" fill="none" stroke="${ink}" stroke-opacity="${arcOpacity}" stroke-width="22" stroke-linecap="round"/>` +
  `<path d="${HA}" fill="none" stroke="${ink}" stroke-width="38" stroke-linecap="round" stroke-linejoin="round"/><circle cx="352" cy="128" r="30" fill="${dot}"/>`;

const D = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const jobs = [];
for (const [d, k] of Object.entries(D)) {
  const L = 48 * k, F = 108 * k, N = 24 * k;
  // أيقونة قديمة (قبل أندرويد 8): مربع بزوايا دائرية، ودائرية
  jobs.push([`mipmap-${d}/ic_launcher.png`, L, `<svg viewBox="0 0 512 512"><rect width="512" height="512" rx="116" fill="${SEA}"/>${glyph(PEARL, CORAL, 0.28)}</svg>`]);
  jobs.push([`mipmap-${d}/ic_launcher_round.png`, L, `<svg viewBox="0 0 512 512"><circle cx="256" cy="256" r="256" fill="${SEA}"/><g transform="translate(40 40) scale(.84)">${glyph(PEARL, CORAL, 0.28)}</g></svg>`]);
  // الواجهة الأمامية للأيقونة المتكيّفة: الشعار بـ 66/108 من المساحة (المنطقة الآمنة)
  const s = 66 / 108, o = (512 * (1 - s)) / 2;
  jobs.push([`mipmap-${d}/ic_launcher_foreground.png`, F, `<svg viewBox="0 0 512 512"><g transform="translate(${o} ${o}) scale(${s})">${glyph(PEARL, CORAL, 0.28)}</g></svg>`]);
  // أيقونة التنبيه: أبيض بالكامل على شفاف
  jobs.push([`drawable-${d}/ic_stat_hayati.png`, N, `<svg viewBox="0 0 512 512"><g transform="translate(26 26) scale(.9)">${glyph('#FFFFFF', '#FFFFFF', 0.55)}</g></svg>`]);
}
// شاشة البداية: نفس مقاسات القالب
for (const f of fs.readdirSync(RES).filter((x) => /^drawable/.test(x) && fs.existsSync(path.join(RES, x, 'splash.png')))) {
  const buf = fs.readFileSync(path.join(RES, f, 'splash.png'));
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const m = Math.round(Math.min(w, h) * 0.32);
  jobs.push([`${f}/splash.png`, [w, h], `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${SEA}"/><g transform="translate(${(w - m) / 2} ${(h - m) / 2}) scale(${m / 512})">${glyph(PEARL, CORAL, 0.28)}</g></svg>`]);
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage();
  for (const [rel, size, svg] of jobs) {
    const [w, h] = Array.isArray(size) ? size : [size, size];
    await p.setViewportSize({ width: Math.round(w), height: Math.round(h) });
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${w}" height="${h}" `)}</body></html>`);
    const out = path.join(RES, rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await p.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: Math.round(w), height: Math.round(h) } });
  }
  await b.close();
  // خلفية الأيقونة المتكيّفة بحرية
  fs.writeFileSync(path.join(RES, 'values/ic_launcher_background.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${SEA}</color>\n</resources>\n`);
  console.log(jobs.length + ' ملف');
})();
