// ستوري «قاعد أشتغل»: الخلفية مغبّشة عشان وجوه الناس اللي ورا ما تبين
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const U = f => 'file://' + path.resolve(__dirname, f);
const css = `@font-face{font-family:P;src:url(${U('../IBMPlexSansArabic-Bold.ttf')});font-weight:700}@font-face{font-family:P;src:url(${U('../IBMPlexSansArabic-Regular.ttf')});font-weight:400}
*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;overflow:hidden;font-family:P;color:#E8DCC4;direction:rtl}
.bg{position:absolute;inset:0;background:url(${U('bg.jpg')}) center/cover}
.sh{position:absolute;left:0;right:0;top:0;height:760px;background:linear-gradient(#0A1A1Ecc,#0A1A1E55 70%,transparent)}
.top{position:absolute;top:330px;left:70px;right:70px;text-align:center}
.k{font:400 40px P;opacity:.85}h1{margin:8px 0 0;font:700 88px/1.12 P}h1 b{color:#FF6B4A;font-weight:700}
.chip{display:inline-block;margin-top:34px;padding:12px 34px;border-radius:999px;background:rgba(14,59,67,.85);border:2px solid rgba(232,220,196,.25);font:400 34px P}
.cta{position:absolute;left:110px;right:110px;top:1390px;padding:26px 30px;border-radius:40px;background:#0E3B43ee;box-shadow:0 30px 60px -20px #000a;text-align:center}
.cta div{font:700 46px P}.cta p{margin:6px 0 0;font:400 34px P;opacity:.85}.cta b{color:#FF6B4A}`;
const top = `<div class="sh"></div><div class="top"><div class="k">بين المحاضرات</div><h1>أشتغل على تطبيق <b>«حياتي»</b></h1><span class="chip">قيد التطوير · نسخة تجريبية</span></div>`;
const S = {
  '01-working.png': top,
  '02-working-cta.png': top + `<div class="cta"><div>تبي تجربه قبل الكل؟</div><p>أرسل لي <b>«حياتي»</b> بالخاص</p></div>`,
};
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const tmp = path.join(__dirname, '.tmp.html');
  for (const [f, body] of Object.entries(S)) {
    fs.writeFileSync(tmp, `<!doctype html><meta charset=utf-8><style>${css}</style><div class="bg"></div>${body}`);
    await p.goto('file://' + tmp, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(__dirname, f), type: 'png' });
  }
  fs.unlinkSync(tmp); await b.close();
})();
