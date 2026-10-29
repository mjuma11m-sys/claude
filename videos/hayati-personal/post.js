// بوست 4:5 للحساب الشخصي — node post.js
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const fs = require('fs'), path = require('path');
const F = 'file://' + __dirname + '/';
const html = `<html dir="rtl"><style>@font-face{font-family:P;src:url(${F}IBMPlexSansArabic-Bold.ttf);font-weight:700}@font-face{font-family:P;src:url(${F}IBMPlexSansArabic-Regular.ttf);font-weight:400}
body{margin:0;width:1080px;height:1350px;font-family:P,Arial,sans-serif;color:#E8DCC4;background:radial-gradient(120% 75% at 50% 42%,#145a62 0%,#0E3B43 42%,#0A1A1E 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 80px;box-sizing:border-box}
.c{color:#FF6B4A}img{width:220px;border-radius:50px;margin:30px 0}h1{font-size:110px;line-height:1.15;margin:0}p{font-size:46px;margin:10px 0;opacity:.9}.pill{margin-top:40px;font-size:42px;padding:16px 40px;border-radius:999px;background:#FF6B4A;color:#fff;font-weight:700}</style>
<body><h1>أنا محمد 👋<br>و<span class="c">سويت تطبيق</span></h1><img src="${F}icon.png"><p>«حياتي»: مصاريفك ودراستك وصلاتك بمكان واحد</p><p style="opacity:.75">Apple رفضته مرتين… واليوم على App Store ✅</p><div class="pill">جرّبوه وقولوا لي رأيكم 🙏</div></body></html>`;
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } }); const tmp = path.join(__dirname, '.tmp.html'); fs.writeFileSync(tmp, html); await p.goto('file://' + tmp); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300); await p.screenshot({ path: path.join(__dirname, 'post.png') }); fs.unlinkSync(tmp); await b.close(); })();
