// ستوريات الحساب الشخصي (قصة الإطلاق) — node make.js
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const fs = require('fs'), path = require('path');
const F = 'file://' + __dirname + '/';
const CSS = `@font-face{font-family:P;src:url(${F}IBMPlexSansArabic-Bold.ttf);font-weight:700}
@font-face{font-family:P;src:url(${F}IBMPlexSansArabic-Regular.ttf);font-weight:400}
*{box-sizing:border-box}body{margin:0;width:1080px;height:1920px;font-family:P,'Helvetica Neue',Arial,sans-serif;color:#E8DCC4;direction:rtl;
background:radial-gradient(120% 75% at 50% 38%,#145a62 0%,#0E3B43 42%,#0A1A1E 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 80px}
.c{color:#FF6B4A}img.i{width:240px;border-radius:54px;margin-bottom:50px}h1{font-size:130px;line-height:1.15;margin:0 0 30px}p{font-size:52px;line-height:1.5;margin:0;opacity:.92}
.tl{text-align:right;width:100%;margin-top:30px}.row{display:flex;gap:30px;align-items:flex-start;margin:0 0 46px}.dot{flex:none;width:34px;height:34px;border-radius:50%;background:#E8DCC4;margin-top:22px}.dot.c2{background:#FF6B4A}
.row b{display:block;font-size:56px}.row span{font-size:44px;opacity:.85}
.qr{background:#fff;border-radius:40px;padding:26px;width:440px;margin:50px 0 30px}.qr img{width:100%;display:block}`;
const S = [
  `<img class="i" src="${F}icon.png"><h1>سويت<br><span class="c">تطبيق</span> 🤍</h1><p>اسمه «حياتي»، ونزل اليوم على App Store</p>`,
  `<h1 style="font-size:100px">من فكرة<br>لـ <span class="c">App Store</span></h1><div class="tl">
   <div class="row"><i class="dot"></i><div><b>11 أكتوبر</b><span>أول نسخة</span></div></div>
   <div class="row"><i class="dot"></i><div><b>Apple رفضته ❌</b><span>صلّحت ورجعت أرسلته</span></div></div>
   <div class="row"><i class="dot"></i><div><b>ورفضته مرة ثانية ❌</b><span>صلّحت 3 أشياء وجرّبت كل شي</span></div></div>
   <div class="row"><i class="dot c2"></i><div><b class="c">29 أكتوبر: انقبل ✅</b><span>18 يوم و151 تحديث</span></div></div></div>`,
  `<h1 style="font-size:110px">جرّبه<br><span class="c">وقولي رأيك</span></h1><p>مصاريفك ودراستك وصلاتك بمكان واحد · مجاني</p><div class="qr"><img src="${F}qr.svg"></div><p style="font-size:44px">امسح أو الرابط فوق 👆 · أندرويد قريباً 👀</p>`,
];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const tmp = path.join(__dirname, '.tmp.html');
  for (let i = 0; i < S.length; i++) { fs.writeFileSync(tmp, `<html><style>${CSS}</style><body>${S[i]}</body></html>`); await p.goto('file://' + tmp); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300); await p.screenshot({ path: path.join(__dirname, `story-${i + 1}.png`) }); }
  fs.unlinkSync(tmp); await b.close();
})();
