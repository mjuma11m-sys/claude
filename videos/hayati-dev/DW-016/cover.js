// كفر فيديو DW-016 (المهم داخل مربع 1:1 بالنص) — 1080×1920
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const fs = require('fs'), path = require('path');
const U = (f) => 'file://' + path.join(__dirname, f);
const html = `<!doctype html><meta charset=utf-8><style>@font-face{font-family:P;src:url(${U('IBMPlexSansArabic-Bold.ttf')});font-weight:700}@font-face{font-family:P;src:url(${U('IBMPlexSansArabic-Regular.ttf')});font-weight:400}
*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;overflow:hidden;font-family:P;font-weight:700;color:#E8DCC4;direction:rtl;background:radial-gradient(110% 70% at 50% 40%,#155c64 0%,#0E3B43 45%,#0A1A1E 100%)}
.a{position:absolute;left:0;right:0;text-align:center}.c{color:#FF6B4A}
.bar{width:620px;height:26px;border-radius:13px;background:rgba(232,220,196,.15);margin:0 auto;overflow:hidden}.bar i{display:block;height:100%;width:36%;background:#0d9488;border-radius:13px}
.pill{display:inline-block;padding:14px 36px;border-radius:999px;background:rgba(232,220,196,.12);border:2px solid rgba(232,220,196,.25);font:400 36px P}</style>
<div class="a" style="top:470px;font:400 46px P;opacity:.8">جديد بـ «حياتي» ✨</div>
<div class="a" style="top:560px;font-size:150px;line-height:1.08">كل شي<br><span class="c">بمكان واحد</span></div>
<div class="a" style="top:960px"><div style="margin-top:18px;font:400 40px P;opacity:.85">الفلوس · يومك · الدراسة · العبادة</div></div>
<div class="a" style="top:1150px;font:400 50px P">ورتّب شاشتك</div>
<div class="a" style="top:1290px"><span class="pill">قيد التطوير · نسخة تجريبية</span></div>`;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const tmp = path.join(__dirname, '.tmp.html'); fs.writeFileSync(tmp, html);
  await p.goto('file://' + tmp); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
  await p.screenshot({ path: path.join(__dirname, 'cover.jpg'), type: 'jpeg', quality: 92 });
  fs.unlinkSync(tmp); await b.close();
})();
