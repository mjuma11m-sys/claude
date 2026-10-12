// صور حساب إنستقرام «حياتي»: كفر الريل، صورة البروفايل، أغلفة الهايلايت، و3 بوستات للشبكة
//   node build.js → out/*.jpg|png
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const fs = require('fs'), path = require('path'), vm = require('vm');
const D = __dirname, OUT = path.join(D, 'out');
fs.mkdirSync(OUT, { recursive: true });
// نفس أيقونات التطبيق
const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync('/home/user/claude/hayati-app/icons.js', 'utf8'), ctx);
const I = (n, w) => ctx.window.icon(n).replace('class="i"', 'width="' + w + '" height="' + w + '"');
const shot = (n) => 'file://' + path.join(D, '../hayati-promo-v2/shots/' + n + '.png');
const MARK = '<svg viewBox="0 0 512 512" class="mark"><rect width="512" height="512" rx="116" fill="#0E3B43" stroke="rgba(232,220,196,.22)" stroke-width="6"/><path d="M 383.3 172.7 A 160 160 0 1 1 300 102.2" fill="none" stroke="#E8DCC4" stroke-opacity=".28" stroke-width="22" stroke-linecap="round"/><path d="M 304 166 L 196 166 L 264 222 C 204 222 168 254 168 292 C 168 336 206 360 256 360 C 292 360 318 348 338 332" fill="none" stroke="#E8DCC4" stroke-width="38" stroke-linecap="round" stroke-linejoin="round"/><circle cx="352" cy="128" r="30" fill="#FF6B4A"/></svg>';
const BASE = (w, h) => `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>
@font-face{font-family:P;src:url(file://${D}/IBMPlexSansArabic-Bold.ttf);font-weight:700}
@font-face{font-family:P;src:url(file://${D}/IBMPlexSansArabic-Regular.ttf);font-weight:400}
:root{--sea:#0E3B43;--deep:#0A1A1E;--pearl:#E8DCC4;--coral:#FF6B4A;--bg:#F7F4EE}
*{box-sizing:border-box}html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;font-family:P;font-weight:700;color:var(--pearl)}
.sea{position:absolute;inset:0;background:radial-gradient(110% 70% at 50% 45%,#155c64 0%,var(--sea) 45%,var(--deep) 100%)}
.grain{position:absolute;inset:0;opacity:.05;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.chip{position:absolute;left:0;top:0;border-radius:28%;display:grid;place-items:center;background:rgba(232,220,196,.12);border:3px solid rgba(232,220,196,.22);box-shadow:0 30px 60px -28px rgba(0,0,0,.6)}
.phone{position:absolute;border-radius:86px;background:#0b1416;padding:16px;box-shadow:0 -30px 90px -30px rgba(0,0,0,.7),inset 0 0 0 3px #2a4a50}
.phone img{width:100%;height:100%;border-radius:72px;object-fit:cover;object-position:top;display:block}
.c{color:var(--coral)}
</style></head><body>`;
const PAGES = {};

// 1) كفر الريل 1080×1920 — كل المهم داخل المربع الوسطاني (420–1500) عشان ينقرا بشبكة البروفايل
PAGES['reel-cover.jpg'] = [1080, 1920, BASE(1080, 1920) + `<div class="sea"></div>
<svg style="position:absolute;left:50%;top:430px;width:150px;height:150px;margin-left:-75px" viewBox="0 0 512 512">${MARK.slice(MARK.indexOf('>') + 1, -6)}</svg>
${[[50, 300, -12], [840, 280, 10], [30, 1300, 9], [860, 1320, -8]].map(([x, y, r]) => `<div class="chip" style="width:190px;height:190px;font-size:100px;transform:translate(${x}px,${y}px) rotate(${r}deg)">☕</div>`).join('')}
<div style="position:absolute;left:0;right:0;top:660px;text-align:center;line-height:1.08"><div style="font-size:172px">كم صرفت</div><div style="font-size:172px" class="c">على كوستا؟</div></div>
<div style="position:absolute;left:50%;top:1120px;transform:translateX(-50%);padding:18px 46px;border-radius:999px;background:var(--pearl);color:var(--sea);font-size:58px;white-space:nowrap;box-shadow:0 30px 60px -24px rgba(0,0,0,.6)">تطبيقي يعرف ☝️</div>
<div class="phone" style="left:50%;top:1500px;width:560px;height:1212px;margin-left:-280px;transform:rotate(-4deg)"><img src="${shot('03_search')}"></div>
<div class="grain"></div>`];

// 2) صورة البروفايل 1080×1080 — إنستقرام يقصها دائرة، فالشعار بنص الدائرة بمساحة
PAGES['profile.png'] = [1080, 1080, BASE(1080, 1080) + `<div style="position:absolute;inset:0;background:#0E3B43"></div>
<svg style="position:absolute;left:190px;top:190px;width:700px;height:700px" viewBox="0 0 512 512"><path d="M 383.3 172.7 A 160 160 0 1 1 300 102.2" fill="none" stroke="#E8DCC4" stroke-opacity=".28" stroke-width="22" stroke-linecap="round"/><path d="M 304 166 L 196 166 L 264 222 C 204 222 168 254 168 292 C 168 336 206 360 256 360 C 292 360 318 348 338 332" fill="none" stroke="#E8DCC4" stroke-width="38" stroke-linecap="round" stroke-linejoin="round"/><circle cx="352" cy="128" r="30" fill="#FF6B4A"/></svg>`];

// 3) أغلفة الهايلايت 1080×1920 — الأيقونة بنص الدائرة، والاسم يتكتب بإنستقرام نفسه
const HL = [['features', 'sparkle', 'الميزات'], ['try', 'download', 'جرّبه'], ['updates', 'refresh', 'تحديثات'], ['ideas', 'message', 'اقتراحاتكم'], ['keeper', 'award', 'الحارس']];
for (const [k, ic] of HL) PAGES['highlight-' + k + '.png'] = [1080, 1920, BASE(1080, 1920) + `<div style="position:absolute;inset:0;background:#0E3B43"></div>
<div style="position:absolute;left:50%;top:50%;width:620px;height:620px;margin:-310px 0 0 -310px;border-radius:50%;border:6px solid rgba(232,220,196,.22);display:grid;place-items:center;color:var(--pearl)">${I(ic, 330)}</div>
<div style="position:absolute;left:calc(50% + 175px);top:calc(50% - 265px);width:64px;height:64px;border-radius:50%;background:var(--coral)"></div>`];

// 4) بوستات الشبكة 1080×1350
PAGES['post-1-intro.jpg'] = [1080, 1350, BASE(1080, 1350) + `<div class="sea"></div>
<svg style="position:absolute;left:50%;top:170px;width:300px;height:300px;margin-left:-150px" viewBox="0 0 512 512">${MARK.slice(MARK.indexOf('>') + 1, -6)}</svg>
<div style="position:absolute;left:0;right:0;top:520px;text-align:center"><div style="font-size:190px;line-height:1">حياتي</div><div style="font-size:58px;font-weight:400;opacity:.85;margin-top:28px">كل يومك بمكان واحد</div></div>
<div style="position:absolute;left:0;right:0;top:880px;text-align:center;font-size:44px;font-weight:400;line-height:1.6;opacity:.9">مصاريفك · دراستك · شغلك · صلاتك · تمرينك</div>
<div style="position:absolute;left:50%;top:1060px;transform:translateX(-50%);padding:16px 44px;border-radius:999px;border:3px solid rgba(232,220,196,.45);font-size:44px;white-space:nowrap">🛠️ قيد التطوير · نسخة تجريبية</div>
<div style="position:absolute;left:0;right:0;top:1210px;text-align:center;font-size:38px;font-weight:400;opacity:.7;direction:ltr">@hayati.bh</div>
<div class="grain"></div>`];
const FEAT = [['search', '🔎', 'تبحث عن أي محل', 'ويعطيك مجموع اللي صرفته'], ['chart', '📈', 'يتوقع آخر الشهر', 'قبل لا تتعدى الميزانية'], ['award', '💪', 'جاهزيتك للتمرين', 'من نومك ونبضك بالساعة'], ['message', '💬', 'رسالة البنك', 'تتسجل مصروف بروحها'], ['moon', '🕌', 'الصلاة بالتقويم', 'ينبهك والتطبيق مسكّر']];
PAGES['post-2-features.jpg'] = [1080, 1350, BASE(1080, 1350) + `<div class="sea"></div>
<div style="position:absolute;left:80px;right:80px;top:110px;font-size:92px;line-height:1.1">وش يسوي <span class="c">حياتي</span>؟</div>
<div style="position:absolute;left:80px;right:80px;top:290px;display:grid;gap:26px">${FEAT.map(([, e, a, b]) => `<div style="display:flex;align-items:center;gap:34px;padding:26px 34px;border-radius:36px;background:rgba(232,220,196,.08);border:2px solid rgba(232,220,196,.14)"><div style="font-size:72px;width:96px;text-align:center">${e}</div><div><div style="font-size:52px">${a}</div><div style="font-size:38px;font-weight:400;opacity:.75">${b}</div></div></div>`).join('')}</div>
<div class="grain"></div>`];
PAGES['post-3-ideas.jpg'] = [1080, 1350, BASE(1080, 1350) + `<div style="position:absolute;inset:0;background:var(--bg)"></div>
<div style="position:absolute;left:0;right:0;top:220px;text-align:center;color:var(--sea)"><div style="font-size:150px;line-height:1">💬</div>
<div style="font-size:120px;line-height:1.15;margin-top:50px">عندك <span class="c">اقتراح</span>؟</div>
<div style="font-size:60px;font-weight:400;margin-top:30px;color:#33494D">التطبيق لسه ينبني، وأنت تقرر<br>وش الميزة الجاية</div></div>
<div style="position:absolute;left:50%;top:1010px;transform:translateX(-50%);padding:26px 70px;border-radius:999px;background:var(--coral);color:#2A0E07;font-size:54px;white-space:nowrap">اكتبه بالتعليقات 👇</div>
<div style="position:absolute;left:0;right:0;top:1200px;display:flex;justify-content:center;align-items:center;gap:18px;color:var(--sea);font-size:38px;direction:ltr"><svg style="width:70px;height:70px" viewBox="0 0 512 512">${MARK.slice(MARK.indexOf('>') + 1, -6)}</svg>@hayati.bh</div>`];

// 5) ستوري التشويق من الحساب الشخصي 1080×1920 — الكلام بعيد عن أعلى 250 وأسفل 340 (واجهة الستوري)
PAGES['story-teaser.jpg'] = [1080, 1920, BASE(1080, 1920) + `<div class="sea"></div>
<div style="position:absolute;left:80px;right:80px;top:300px;text-align:center;line-height:1.2"><div style="font-size:84px">أشتغل على شي</div><div style="font-size:84px">من شهر…</div></div>
<div style="position:absolute;left:50%;top:560px;width:700px;height:875px;margin-left:-350px;border-radius:36px;overflow:hidden;transform:rotate(-3deg);box-shadow:0 50px 100px -30px rgba(0,0,0,.75),0 0 0 3px rgba(232,220,196,.18)"><img src="file://${D}/out/post-1-intro.jpg" style="width:100%;height:100%;display:block"></div>
<div style="position:absolute;left:0;right:0;top:1470px;text-align:center;font-size:96px" class="c">قريباً 👀</div>
<div style="position:absolute;left:50%;top:1610px;transform:translateX(-50%);padding:14px 38px;border-radius:18px;background:#fff;color:#0E3B43;font-size:46px;direction:ltr;white-space:nowrap;box-shadow:0 20px 40px -20px rgba(0,0,0,.6)">@hayati.bh</div>
<div class="grain"></div>`];

// 6) حملة «سوّ ميزتك»: بوست الإعلان + ستوري فيه مكان لملصق «اسألني»
PAGES['post-4-build-your-feature.jpg'] = [1080, 1350, BASE(1080, 1350) + `<div class="sea"></div>
<div style="position:absolute;left:0;right:0;top:150px;text-align:center"><div style="font-size:64px;opacity:.85">🛠️ كل أسبوع</div>
<div style="font-size:150px;line-height:1.05;margin-top:20px">سوّ <span class="c">ميزتك</span></div></div>
<div style="position:absolute;left:90px;right:90px;top:560px;display:grid;gap:22px">${[['💬', 'اكتب الميزة اللي تبيها بالتعليقات'], ['🏛️', 'الديوانية تناقشها'], ['💻', 'تنبني بالتطبيق'], ['📣', 'ريل باسمك وحسابك']].map(([e, t], i) => `<div style="display:flex;align-items:center;gap:30px;padding:24px 34px;border-radius:32px;background:rgba(232,220,196,.08);border:2px solid rgba(232,220,196,.14)"><div style="font-size:30px;width:56px;height:56px;border-radius:50%;background:var(--coral);color:#2A0E07;display:grid;place-items:center">${i + 1}</div><div style="font-size:66px">${e}</div><div style="font-size:48px">${t}</div></div>`).join('')}</div>
<div style="position:absolute;left:0;right:0;top:1230px;text-align:center;font-size:38px;font-weight:400;opacity:.7;direction:ltr">@hayati.bh</div>
<div class="grain"></div>`];
PAGES['story-build-your-feature.jpg'] = [1080, 1920, BASE(1080, 1920) + `<div class="sea"></div>
<div style="position:absolute;left:0;right:0;top:300px;text-align:center"><div style="font-size:60px;opacity:.85">🛠️ كل أسبوع</div>
<div style="font-size:150px;line-height:1.05;margin-top:16px">سوّ <span class="c">ميزتك</span></div>
<div style="font-size:52px;font-weight:400;margin-top:36px;line-height:1.5">قول لنا وش تبي بـ «حياتي»<br>ونبنيها… <b>ونذكر اسمك</b> 👀</div></div>
<div style="position:absolute;left:140px;right:140px;top:1000px;height:420px;border-radius:44px;border:4px dashed rgba(232,220,196,.35);opacity:.6"></div>
<div style="position:absolute;left:0;right:0;top:1520px;text-align:center;font-size:44px;direction:ltr;opacity:.8">@hayati.bh</div>
<div class="grain"></div>`];

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [name, [w, h, html]] of Object.entries(PAGES)) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    const f = path.join(D, '.tmp.html'); fs.writeFileSync(f, html + '</body></html>');
    await p.goto('file://' + f); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, name), type: name.endsWith('.png') ? 'png' : 'jpeg', ...(name.endsWith('.jpg') ? { quality: 92 } : {}) });
    await p.close(); console.log(name);
  }
  fs.unlinkSync(path.join(D, '.tmp.html'));
  await b.close();
})();
