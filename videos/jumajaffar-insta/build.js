// هوية حساب @m_jumajaffar16 الشخصي (حارس مرمى + مطوّر): node build.js → out/*
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs'), path = require('path'), vm = require('vm');
const D = __dirname, OUT = path.join(D, 'out');
fs.mkdirSync(OUT, { recursive: true });
const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync('/home/user/claude/hayati-app/js/core/icons.js', 'utf8'), ctx);
const I = (n, w) => ctx.window.icon(n).replace('class="i"', 'width="' + w + '" height="' + w + '"');
const MARK = '<svg viewBox="0 0 512 512" style="width:100%;height:100%"><path d="M 383.3 172.7 A 160 160 0 1 1 300 102.2" fill="none" stroke="#E8DCC4" stroke-opacity=".28" stroke-width="22" stroke-linecap="round"/><path d="M 304 166 L 196 166 L 264 222 C 204 222 168 254 168 292 C 168 336 206 360 256 360 C 292 360 318 348 338 332" fill="none" stroke="#E8DCC4" stroke-width="38" stroke-linecap="round" stroke-linejoin="round"/><circle cx="352" cy="128" r="30" fill="#FF6B4A"/></svg>';
const GLOVE = (w) => `<svg viewBox="0 0 100 100" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M30 52 V26 a5 5 0 0 1 10 0 V44 M40 44 V16 a5 5 0 0 1 10 0 V44 M50 44 V18 a5 5 0 0 1 10 0 V44 M60 44 V26 a5 5 0 0 1 10 0 V58 C70 76 62 84 50 84 C40 84 34 78 28 68 L18 52 a5 5 0 0 1 9-5 L30 52"/><path d="M34 72 H66" stroke-width="5"/></svg>`;
// هوية شخصية: ليل + ليموني حارس + لؤلؤي. المرجان يبقى لحياتي بس.
const BASE = (w, h) => `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>
@font-face{font-family:P;src:url(file://${D}/IBMPlexSansArabic-Bold.ttf);font-weight:700}
@font-face{font-family:P;src:url(file://${D}/IBMPlexSansArabic-Regular.ttf);font-weight:400}
:root{--night:#0B0F10;--ink:#141A1C;--lime:#C6F432;--pearl:#E8DCC4;--mut:#8A9A9B}
*{box-sizing:border-box}html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;font-family:P;font-weight:700;color:var(--pearl);background:var(--night)}
.bg{position:absolute;inset:0;background:radial-gradient(90% 60% at 80% 0%,#1d2a14 0%,var(--night) 60%)}
.lime{color:var(--lime)}.abs{position:absolute}
.grid{position:absolute;inset:0;opacity:.07;background-image:linear-gradient(var(--pearl) 1px,transparent 1px),linear-gradient(90deg,var(--pearl) 1px,transparent 1px);background-size:90px 90px}
.tag{position:absolute;left:0;right:0;text-align:center;font-size:36px;font-weight:400;opacity:.65;direction:ltr}
.pill{display:inline-block;padding:14px 40px;border-radius:999px;background:var(--lime);color:#10150A;font-size:46px;white-space:nowrap}
</style></head><body>`;
const P = {};
// 1) البروفايل: صورتك الشخصية تبقى كما هي (ما نبدّلها بحرف)
// 2) الهايلايت 1080×1920 — أيقونة بنص الشاشة، بدون حلقة سميكة
const PLANE = (w) => `<svg viewBox="0 0 100 100" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M92 10 L8 44 L40 56 L52 90 Z"/><path d="M40 56 L92 10"/></svg>`;
const CODE = (t) => `<span style="font-size:36px;font-weight:400;letter-spacing:.2em;direction:ltr;display:block;margin-top:24px;opacity:.7">${t}</span>`;
const HL = [['uni', I('graduation', 360) + CODE('UTB'), 'UTB'], ['turkey', PLANE(330) + CODE('TR'), 'تركيا'], ['oman', PLANE(330) + CODE('OM'), 'عُمان'], ['keeper', GLOVE(360), 'الحراسة'], ['training', I('dumbbell', 360), 'تمارين'], ['build', '<span style="font-size:250px;direction:ltr">&lt;/&gt;</span>', 'أبني'], ['hayati', MARK.replace('style="width:100%;height:100%"', 'style="width:400px;height:400px"'), 'حياتي']];
for (const [k, ic] of HL) P['highlight-' + k + '.png'] = [1080, 1920, BASE(1080, 1920) + `<div class="abs" style="inset:0;background:radial-gradient(40% 25% at 50% 50%,${k === 'hayati' ? 'rgba(232,220,196,.10)' : 'rgba(198,244,50,.12)'} 0%,var(--night) 100%)"></div>
<div class="abs" style="left:50%;top:50%;width:620px;height:620px;margin:-310px 0 0 -310px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:${k === 'hayati' ? 'var(--pearl)' : 'var(--lime)'};font-size:300px">${ic}</div>`];
// 3) قوالب البوست 1080×1350
P['post-1-intro.jpg'] = [1080, 1350, BASE(1080, 1350) + `<div class="bg"></div><div class="grid"></div>
<div class="abs" style="left:90px;right:90px;top:150px;font-size:46px;font-weight:400;opacity:.8">أبو جعفر</div>
<div class="abs" style="left:90px;right:90px;top:240px;font-size:200px;line-height:1.0">حارس<br><span class="lime">مرمى.</span></div>
<div class="abs" style="left:90px;right:90px;top:720px;font-size:200px;line-height:1.0">وأبني<br><span class="lime">تطبيقات.</span></div>
<div class="abs" style="left:90px;right:90px;top:1180px;font-size:40px;font-weight:400;opacity:.75">طالب إدارة أعمال دولية · البحرين 🇧🇭</div>`];
P['post-2-template-tip.jpg'] = [1080, 1350, BASE(1080, 1350) + `<div class="bg"></div><div class="grid"></div>
<div class="abs" style="left:90px;top:120px"><span class="pill" style="display:inline-flex;gap:14px;align-items:center">${GLOVE(48)} نصيحة حارس</span></div>
<div class="abs" style="left:90px;right:90px;top:340px;font-size:128px;line-height:1.2">عنوان النصيحة<br>بسطرين <span class="lime">كحد أقصى</span></div>
<div class="abs" style="left:90px;right:90px;top:860px;font-size:52px;font-weight:400;line-height:1.7;opacity:.85">سطرين شرح بس. التفصيل بالكابشن.</div>
<div class="tag" style="top:1230px">@m_jumajaffar16</div>`];
P['post-3-template-build.jpg'] = [1080, 1350, BASE(1080, 1350) + `<div class="bg"></div><div class="grid"></div>
<div class="abs" style="left:90px;top:120px"><span class="pill" style="direction:ltr">&lt;/&gt; أبني</span></div>
<div class="abs" style="left:90px;right:90px;top:340px;font-size:128px;line-height:1.2">وش سويت<br>هالأسبوع <span class="lime">بالكود</span></div>
<div class="abs" style="left:90px;right:90px;top:860px;padding:34px 44px;border-radius:30px;background:var(--ink);border:2px solid rgba(232,220,196,.16);font-size:40px;font-weight:400;direction:ltr;text-align:left;line-height:1.6;color:var(--lime)">$ git commit -m "..."</div>
<div class="tag" style="top:1230px">@m_jumajaffar16 · قيد التطوير @hayati.bh</div>`];
// تعريف 2 و3
P['post-intro-2-keeper.jpg'] = [1080, 1350, BASE(1080, 1350) + `<div class="bg"></div><div class="grid"></div>
<div class="abs" style="left:90px;top:120px"><span class="pill" style="display:inline-flex;gap:14px;align-items:center">${GLOVE(48)} الحراسة</span></div>
<div class="abs" style="left:90px;right:90px;top:340px;font-size:150px;line-height:1.2">آخر خط<br><span class="lime">دفاع.</span></div>
<div class="abs" style="left:90px;right:90px;top:860px;font-size:52px;font-weight:400;line-height:1.7;opacity:.85">أتدرّب، ألعب، وأشارككم الرحلة.</div>
<div class="tag" style="top:1230px">@m_jumajaffar16</div>`];
P['post-intro-3-builder.jpg'] = [1080, 1350, BASE(1080, 1350) + `<div class="bg"></div><div class="grid"></div>
<div class="abs" style="left:90px;top:120px"><span class="pill" style="direction:ltr">&lt;/&gt; أبني</span></div>
<div class="abs" style="left:90px;right:90px;top:340px;font-size:150px;line-height:1.2">وأبني<br><span class="lime">تطبيقات.</span></div>
<div class="abs" style="left:90px;right:90px;top:860px;font-size:52px;font-weight:400;line-height:1.7;opacity:.85">حياتي · قيد التطوير<br>نسخة تجريبية</div>
<div class="tag" style="top:1230px">@m_jumajaffar16</div>`];
// 4) كفر الريل 1080×1920 — كل المهم بالمربع الوسطاني (420–1500)
P['reel-cover-template.jpg'] = [1080, 1920, BASE(1080, 1920) + `<div class="bg"></div><div class="grid"></div>
<div class="abs" style="left:0;right:0;top:620px;text-align:center;font-size:170px;line-height:1.1">عنوان<br><span class="lime">الريل</span></div>
<div class="abs" style="left:0;right:0;top:1120px;text-align:center"><span class="pill" style="display:inline-flex;gap:14px;align-items:center">${GLOVE(48)} / &lt;/&gt;</span></div>
<div class="tag" style="top:1420px">@m_jumajaffar16</div>`];
// 5) ستوري 1080×1920 — بعيد عن أعلى 250 وأسفل 340
P['story-template.jpg'] = [1080, 1920, BASE(1080, 1920) + `<div class="bg"></div><div class="grid"></div>
<div class="abs" style="left:80px;right:80px;top:560px;text-align:center;font-size:130px;line-height:1.25">نص الستوري<br><span class="lime">هنا</span></div>
<div class="tag" style="top:1500px">@m_jumajaffar16</div>`];
// كفر ريلز وستوري فخمة
P['reel-cover-keeper.jpg'] = [1080, 1920, BASE(1080, 1920) + `<div class="bg"></div><div class="grid"></div>
<div class="abs" style="left:50%;top:500px;width:560px;height:560px;margin-left:-280px;border-radius:50%;background:radial-gradient(circle,rgba(198,244,50,.18),transparent 70%)"></div>
<div class="abs" style="left:0;right:0;top:540px;text-align:center;color:var(--lime)">${GLOVE(300)}</div>
<div class="abs" style="left:0;right:0;top:890px;text-align:center;font-size:190px;line-height:1.05">يوم<br><span class="lime">حارس</span></div>
<div class="abs" style="left:0;right:0;top:1390px;text-align:center"><span class="pill">تمرين · مباراة · رحلة</span></div>
<div class="tag" style="top:1520px">@m_jumajaffar16</div>`];
P['reel-cover-build.jpg'] = [1080, 1920, BASE(1080, 1920) + `<div class="bg"></div><div class="grid"></div>
<div class="abs" style="left:0;right:0;top:560px;text-align:center;font-size:260px;color:var(--lime);direction:ltr;line-height:1">&lt;/&gt;</div>
<div class="abs" style="left:0;right:0;top:890px;text-align:center;font-size:190px;line-height:1.05">أبني<br><span class="lime">تطبيق</span></div>
<div class="abs" style="left:0;right:0;top:1390px;text-align:center"><span class="pill">قيد التطوير · نسخة تجريبية</span></div>
<div class="tag" style="top:1520px">@m_jumajaffar16</div>`];
P['story-intro.jpg'] = [1080, 1920, BASE(1080, 1920) + `<div class="bg"></div><div class="grid"></div>
<div class="abs" style="left:0;right:0;top:520px;text-align:center;color:var(--lime)">${GLOVE(200)}</div>
<div class="abs" style="left:80px;right:80px;top:780px;text-align:center;font-size:170px;line-height:1.15">أبو جعفر<br><span class="lime">حارس مرمى</span></div>
<div class="abs" style="left:80px;right:80px;top:1250px;text-align:center;font-size:48px;font-weight:400;opacity:.8">وأبني تطبيقات · البحرين 🇧🇭</div>
<div class="tag" style="top:1500px">@m_jumajaffar16</div>`];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [name, [w, h, html]] of Object.entries(P)) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    const f = path.join(D, '.tmp.html'); fs.writeFileSync(f, html + '</body></html>');
    await p.goto('file://' + f); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, name), type: name.endsWith('.png') ? 'png' : 'jpeg', ...(name.endsWith('.jpg') ? { quality: 92 } : {}) });
    await p.close(); console.log(name);
  }
  fs.unlinkSync(path.join(D, '.tmp.html'));
  await b.close();
})();
