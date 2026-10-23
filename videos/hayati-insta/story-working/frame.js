// نسخة بإطار «حياتي»: الصورة داخل كرت بألوان الهوية (ستوري 9:16 + بوست 4:5)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const U = f => 'file://' + path.resolve(__dirname, f);
const css = (w, h) => `@font-face{font-family:P;src:url(${U('../IBMPlexSansArabic-Bold.ttf')});font-weight:700}@font-face{font-family:P;src:url(${U('../IBMPlexSansArabic-Regular.ttf')});font-weight:400}
*{box-sizing:border-box}html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;font-family:P;color:#E8DCC4;direction:rtl;background:radial-gradient(110% 70% at 50% 30%,#155c64 0%,#0E3B43 45%,#0A1A1E 100%)}
.hd{position:absolute;left:60px;right:60px;text-align:center}.k{font:400 38px P;opacity:.8}h1{margin:4px 0 0;font:700 76px/1.1 P}h1 b{color:#FF6B4A}
.card{position:absolute;left:50%;transform:translateX(-50%) rotate(-2deg);padding:16px;border-radius:52px;background:#E8DCC4;box-shadow:0 50px 90px -30px #000c}
.card img{display:block;border-radius:38px;object-fit:cover}
.chip{position:absolute;left:0;right:0;text-align:center}.chip span{display:inline-block;padding:12px 34px;border-radius:999px;background:rgba(232,220,196,.12);border:2px solid rgba(232,220,196,.25);font:400 32px P}
.brand{position:absolute;left:0;right:0;text-align:center;font:700 40px P;color:#FF6B4A}`;
const V = {
  'frame-story.png': [1080, 1920, `<div class="hd" style="top:270px"><div class="k">بين المحاضرات</div><h1>أشتغل على تطبيق <b>«حياتي»</b></h1></div>
<div class="card" style="top:480px"><img src="${U('bg.jpg')}" style="width:720px;height:940px;object-position:50% 75%"></div>
<div class="chip" style="top:1490px"><span>قيد التطوير · نسخة تجريبية</span></div>`],
  'frame-post.png': [1080, 1350, `<div class="hd" style="top:70px"><div class="k">بين المحاضرات</div><h1>أشتغل على تطبيق <b>«حياتي»</b></h1></div>
<div class="card" style="top:300px"><img src="${U('bg.jpg')}" style="width:760px;height:860px;object-position:50% 78%"></div>
<div class="chip" style="top:1225px"><span>قيد التطوير · نسخة تجريبية</span></div>`],
};
(async () => {
  const b = await chromium.launch(); const tmp = path.join(__dirname, '.tmp.html');
  for (const [f, [w, h, body]] of Object.entries(V)) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    fs.writeFileSync(tmp, `<!doctype html><meta charset=utf-8><style>${css(w, h)}</style>${body}`);
    await p.goto('file://' + tmp, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(__dirname, f) }); await p.close();
  }
  fs.unlinkSync(tmp); await b.close();
})();
