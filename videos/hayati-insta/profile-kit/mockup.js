// شكل حساب @hayati.bh (مرحلتين) — node profile-kit/mockup.js → profile-kit/mockup.jpg
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const path = require('path'), fs = require('fs');
const R = (p) => 'file://' + path.resolve(__dirname, '..', p);
const F = R('IBMPlexSansArabic-Bold.ttf'), F2 = R('IBMPlexSansArabic-Regular.ttf');
const bio = fs.readFileSync(path.join(__dirname, 'bio.txt'), 'utf8').trim().split('\n');
const HL = [['الجديد', 'out/highlight-updates.png'], ['الميزات', 'out/highlight-features.png'], ['جرّبه', 'out/highlight-try.png'], ['اقتراحاتكم', 'out/highlight-ideas.png']];
// الأحدث أول (الترتيب اللي يبين بالشبكة)، 📌 = مثبّت
const NOW = [['out/post-1-intro.jpg', 1], ['out/week1/a1-five-cover.jpg', 1], ['out/post-3-ideas.jpg', 1], ['out/week1/b1-remind-cover.jpg'], ['out/post-5-honesty.jpg'], ['out/post-2-features.jpg']];
const LATER = [['../insta-reels/04-share/cover.jpg', 1, 1], ['../insta-reels/01-hayati-motion/cover.jpg', 1, 1], ['out/post-1-intro.jpg', 1], ['../insta-reels/03-bank-sms/cover.jpg', 0, 1], ['../insta-reels/02-hayati-promo/cover.jpg', 0, 1], ['out/post-3-ideas.jpg'], ['out/week1/b1-remind-cover.jpg'], ['out/week1/a1-five-cover.jpg'], ['out/post-5-honesty.jpg']];
const phone = (title, grid) => `<div class="ph"><div class="cap">${title}</div><div class="scr">
<div class="top"><b>hayati.bh</b></div>
<div class="head"><img class="pp" src="${R('out/profile.png')}"><div class="st"><div><b>${grid.length}</b>منشورات</div><div><b>—</b>متابعين</div><div><b>—</b>يتابع</div></div></div>
<div class="nm">Hayati | حياتي</div><div class="bio">${bio.join('<br>')}</div><div class="lnk">🔗 رابط سياسة الخصوصية والتجربة</div>
<div class="hls">${HL.map(([n, f]) => `<div><span style="background-image:url('${R(f)}')"></span>${n}</div>`).join('')}</div>
<div class="grid">${grid.map(([f, pin, reel]) => `<div style="background-image:url('${R(f)}')">${pin ? '<i>📌</i>' : ''}${reel ? '<u>▶</u>' : ''}</div>`).join('')}</div></div></div>`;
const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>
@font-face{font-family:P;src:url(${F});font-weight:700}@font-face{font-family:P;src:url(${F2});font-weight:400}
*{box-sizing:border-box}body{margin:0;width:800px;height:1500px;background:#F7F4EE;font-family:P;color:#0B2328;display:flex;gap:80px;justify-content:center;align-items:flex-start;padding-top:40px}
.ph{width:640px}.cap{font-size:40px;text-align:center;margin-bottom:18px}.cap small{display:block;font:400 26px P;color:#33494D}
.scr{background:#fff;border-radius:48px;border:12px solid #0b1416;overflow:hidden;height:1340px}
.top{padding:22px 28px;font-size:30px;direction:ltr;text-align:left}
.head{display:flex;align-items:center;gap:30px;padding:0 28px}.pp{width:150px;height:150px;border-radius:50%}
.st{display:flex;flex:1;justify-content:space-around;text-align:center;font:400 22px P}.st b{display:block;font:700 30px P}
.nm{padding:16px 28px 0;font-size:26px}.bio{padding:6px 28px;font:400 23px/1.5 P}.lnk{padding:0 28px;font:400 22px P;color:#1a5fb4}
.hls{display:flex;gap:18px;padding:22px 28px;font:400 20px P;text-align:center}.hls span{display:block;width:96px;height:96px;border-radius:50%;background-size:cover;background-position:center;border:3px solid #ddd;margin-bottom:6px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3px}.grid div{aspect-ratio:3/4;background-size:cover;background-position:center;position:relative}
.grid i{position:absolute;top:6px;left:8px;font-style:normal;font-size:22px}.grid u{position:absolute;top:6px;right:10px;text-decoration:none;color:#fff;font-size:22px;text-shadow:0 1px 3px #000}
</style></head><body>${phone('شكل حساب @hayati.bh<small>الريلز الأربع + الكاروسيلين + 3 بوستات · 📌 مثبّت · ▶ ريل</small>', LATER)}</body></html>`;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 800, height: 1500 } });
  const tmp = path.join(__dirname, '.mockup.html'); fs.writeFileSync(tmp, html); await p.goto('file://' + tmp, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(__dirname, 'mockup.jpg'), type: 'jpeg', quality: 90 });
  await b.close(); fs.unlinkSync(tmp);
})();
