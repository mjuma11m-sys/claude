// محتوى إنستقرام «حياتي» — جلسة الديوانية «محتوى إنستقرام» (13 أكتوبر)
//   كاروسيل «5 أشياء» (7 شرايح) · كاروسيل «التذكيرات الذكية» (5 شرايح) · 3 ستوريات · شبكة معاينة
//   node build-week1.js → out/week1/*.jpg
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const fs = require('fs'), path = require('path');
const D = __dirname, OUT = path.join(D, 'out/week1');
fs.mkdirSync(OUT, { recursive: true });
// نفس الهوية والخط والشعار من build.js
const src = fs.readFileSync(path.join(D, 'build.js'), 'utf8');
const { BASE, MARK, I } = new Function('require', '__dirname', src.slice(src.indexOf('const fs'), src.indexOf('const PAGES')) + ';return { BASE, MARK, I };')(require, D);
const LOGO = (w) => `<svg style="width:${w}px;height:${w}px;display:block" viewBox="0 0 512 512">${MARK.slice(MARK.indexOf('>') + 1, -6)}</svg>`;
const shot = (p) => 'file://' + path.join(D, '..', p);
const PAGES = {};
const W = 1080, H = 1350;
const DEMO = () => `<div style="position:absolute;left:50%;bottom:28px;transform:translateX(-50%);padding:6px 22px;border-radius:999px;background:rgba(10,26,30,.85);font-size:30px;font-weight:400;color:rgba(232,220,196,.85);white-space:nowrap">* لقطات ببيانات تجريبية</div>`;
const HANDLE = (top) => `<div style="position:absolute;left:0;right:0;top:${top}px;text-align:center;font-size:36px;font-weight:400;opacity:.7;direction:ltr">@hayati.bh</div>`;
const BADGE = (t, top, light) => `<div style="position:absolute;left:50%;top:${top}px;transform:translateX(-50%);padding:14px 40px;border-radius:999px;white-space:nowrap;font-size:40px;${light ? 'background:rgba(14,59,67,.08);color:var(--sea);border:3px solid rgba(14,59,67,.18)' : 'border:3px solid rgba(232,220,196,.45)'}">${t}</div>`;
const STEP = (n, of) => `<div style="position:absolute;left:80px;top:80px;padding:10px 26px;border-radius:999px;background:var(--coral);color:#2A0E07;font-size:38px;direction:ltr">${n}/${of}</div>`;

// ================= كاروسيل A: «5 أشياء يسويها حياتي» (الجمعة 16 أكتوبر) =================
const FIVE = [
  ['hayati-promo-v2/shots/03_search.png', 'كم صرفت على', 'كوستا هالشهر؟', 'اكتب اسم المحل… ويطلع لك المجموع'],
  ['hayati-promo-v2/shots/02_money.png', 'بتكمّل الشهر', 'بالميزانية؟', '«تقدير» لآخر الشهر من صرفك لين اليوم'],
  ['hayati-promo-v2/shots/01_today.png', 'وش عندك', 'اليوم؟', 'محاضراتك وأوقات الصلاة بشاشة وحدة'],
  ['hayati-dev-shots/s_goals.png', 'جاهز', 'للاختبار؟', '«تقدير» جاهزيتك من المواضيع اللي خلصتها'],
  ['hayati-dev-shots/gk.png', 'حارس', 'مرمى؟', 'مبارياتك، الكلين شيت، ونسبة التصدي'],
];
PAGES['a1-five-cover.jpg'] = [W, H, BASE(W, H) + `<div class="sea"></div>
${[[-250, 640, 10, 0], [250, 640, -10, 2], [0, 600, 0, 4]].map(([x, y, r, i]) => `<div class="phone" style="left:50%;top:${y}px;width:420px;height:910px;margin-left:${-210 + x}px;transform:rotate(${r}deg);padding:12px;border-radius:66px"><img style="border-radius:54px" src="${shot(FIVE[i][0])}"></div>`).join('')}
<div style="position:absolute;left:0;right:0;top:120px;text-align:center;line-height:1.05"><div style="font-size:200px" class="c">5 أشياء</div><div style="font-size:110px;margin-top:10px">يسويها «حياتي»</div></div>
<div style="position:absolute;left:0;right:0;top:500px;text-align:center;font-size:46px;font-weight:400;opacity:.85">اسحب ← وشوف إذا تحتاجه</div>
<div style="position:absolute;left:0;right:0;bottom:0;height:300px;background:linear-gradient(transparent,rgba(10,26,30,.95))"></div>
${BADGE('🛠️ قيد التطوير · نسخة تجريبية', 1150)}
${DEMO()}<div class="grain"></div>`];
FIVE.forEach(([img, q1, q2, a], i) => {
  PAGES[`a${i + 2}-five-${i + 1}.jpg`] = [W, H, BASE(W, H) + `<div class="sea"></div>${STEP(i + 1, 5)}
<div style="position:absolute;left:80px;right:80px;top:150px;line-height:1.08"><div style="font-size:104px">${q1}</div><div style="font-size:104px" class="c">${q2}</div>
<div style="font-size:50px;font-weight:400;margin-top:26px;opacity:.92">${a}</div></div>
<div class="phone" style="left:50%;top:600px;width:560px;height:1212px;margin-left:-280px"><img src="${shot(img)}"></div>
<div style="position:absolute;left:0;right:0;bottom:0;height:160px;background:linear-gradient(transparent,rgba(10,26,30,.92))"></div>
${DEMO()}<div class="grain"></div>`];
});
PAGES['a7-five-cta.jpg'] = [W, H, BASE(W, H) + `<div style="position:absolute;inset:0;background:var(--bg)"></div>
<div style="position:absolute;left:0;right:0;top:170px;text-align:center;color:var(--sea)"><div style="font-size:64px;color:#33494D">والسادس؟</div>
<div style="font-size:140px;line-height:1.1;margin-top:20px">أنت <span class="c">تقرره</span></div>
<div style="font-size:54px;font-weight:400;margin-top:40px;line-height:1.55;color:#33494D">اكتب الميزة اللي تبيها بالتعليقات<br>والأكثر طلباً تنبني 🛠️</div></div>
<div style="position:absolute;left:50%;top:880px;transform:translateX(-50%);padding:26px 70px;border-radius:999px;background:var(--coral);color:#2A0E07;font-size:54px;white-space:nowrap">اكتبها بالتعليقات 👇</div>
<div style="position:absolute;left:0;right:0;top:1040px;text-align:center;font-size:44px;font-weight:400;color:var(--sea)">🔖 احفظ البوست، ترجع له</div>
<div style="position:absolute;left:0;right:0;top:1190px;display:flex;justify-content:center;align-items:center;gap:18px;color:var(--sea);font-size:38px;direction:ltr">${LOGO(70)}@hayati.bh</div>`];

// ================= كاروسيل B: «التذكيرات الذكية» (الجمعة 23 أكتوبر) =================
// النص حرفياً من hayati-app/native.js
const NOTE = (title, body, when) => `<div style="display:flex;gap:22px;align-items:flex-start;padding:24px 26px;border-radius:40px;background:rgba(245,245,247,.82);backdrop-filter:blur(20px);color:#111;box-shadow:0 20px 40px -20px rgba(0,0,0,.45)">
<div style="flex:none;width:84px;height:84px;border-radius:20px;overflow:hidden">${LOGO(84)}</div>
<div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;font-size:30px;font-weight:400;color:#555"><span>حياتي</span><span>${when}</span></div>
<div style="font-size:40px;margin-top:4px">${title}</div>${body ? `<div style="font-size:34px;font-weight:400;margin-top:2px;color:#333">${body}</div>` : ''}</div></div>`;
const LOCK = (clock, day, notes, top, h) => `<div class="phone" style="left:50%;top:${top}px;width:720px;height:${h || 1400}px;margin-left:-360px;padding:16px">
<div style="width:100%;height:100%;border-radius:72px;overflow:hidden;position:relative;background:radial-gradient(120% 80% at 30% 10%,#2c6b72 0%,#123c44 40%,#071418 100%)">
<div style="position:absolute;left:50%;top:22px;width:200px;height:56px;margin-left:-100px;border-radius:30px;background:#000"></div>
<div style="position:absolute;left:0;right:0;top:80px;text-align:center;color:#f2efe8"><div style="font-size:32px;font-weight:400">${day}</div><div style="font-size:110px;line-height:1;direction:ltr;font-weight:400;letter-spacing:-4px">${clock}</div></div>
<div style="position:absolute;left:30px;right:30px;top:240px;display:grid;gap:14px">${notes}</div></div></div>`;
const NOTE_LBL = `<div style="position:absolute;left:0;right:0;bottom:30px;text-align:center;font-size:30px;font-weight:400;opacity:.7">* شاشة توضيحية · النص نفسه اللي يوصلك</div>`;
const B = 5;
PAGES['b1-remind-cover.jpg'] = [W, H, BASE(W, H) + `<div class="sea"></div>
<div style="position:absolute;left:0;right:0;top:100px;text-align:center;line-height:1.05"><div style="font-size:150px">نسيت اختبارك؟</div><div style="font-size:96px;margin-top:16px" class="c">مو بعد اليوم</div></div>
${LOCK('8:00', 'الأربعاء', NOTE('بكرة اختبار: محاسبة', 'راجع وارتاح زين 🤍', 'الآن'), 560, 1100)}
<div style="position:absolute;left:0;right:0;bottom:0;height:200px;background:linear-gradient(transparent,rgba(10,26,30,.97) 60%)"></div>
${BADGE('📱 نسخة الآيفون · قيد التطوير', 430)}${NOTE_LBL}<div class="grain"></div>`];
const BSLIDE = (n, h1, h2, sub, clock, day, notes, foot) => [W, H, BASE(W, H) + `<div class="sea"></div>${STEP(n, B)}
<div style="position:absolute;left:80px;right:80px;top:110px;line-height:1.1"><div style="font-size:92px">${h1}</div><div style="font-size:92px" class="c">${h2}</div>
<div style="font-size:44px;font-weight:400;margin-top:16px;opacity:.92">${sub}</div></div>
${LOCK(clock, day, notes, 520, 1100)}
<div style="position:absolute;left:0;right:0;bottom:0;height:190px;background:linear-gradient(transparent,rgba(10,26,30,.97) 50%)"></div>
${foot ? `<div style="position:absolute;left:0;right:0;bottom:80px;text-align:center;font-size:40px">${foot}</div>` : ''}${NOTE_LBL}<div class="grain"></div>`];
PAGES['b2-remind-evening.jpg'] = BSLIDE(2, 'الليلة', 'اللي قبل', 'الساعة 8 الليل، للاختبار والتسليم', '8:00', 'الأربعاء',
  NOTE('بكرة اختبار: محاسبة', 'راجع وارتاح زين 🤍', 'الآن') + NOTE('بكرة تسليم: تقرير التسويق', '', 'الآن'), 'الواجب اللي خلصته؟ ما يذكّرك فيه ✅');
PAGES['b3-remind-examday.jpg'] = BSLIDE(3, 'يوم', 'الاختبار', 'قبله بساعتين… والصبح بدري؟ 7:30', '10:00', 'الخميس',
  NOTE('بعد ساعتين: اختبار محاسبة', 'S40-2050', 'الآن') + NOTE('اليوم: اختبار إحصاء', '', '7:30 ص'), 'اختبار الساعة 8؟ ما يصحيك نص الليل');
PAGES['b4-remind-subs.jpg'] = BSLIDE(4, 'الاشتراكات', 'قبل لا تنسحب', 'قبل التجديد بالأيام اللي تختارها', '8:00', 'الأحد',
  NOTE('بكرة يتجدد: الجيم', '25.000 د.ب', 'الآن') + NOTE('بعد 3 أيام يتجدد: التخزين', '0.400 د.ب', 'أمس'), 'الاشتراك الموقوف؟ ساكت');
const TOG = [['📅', 'الجدول والصلاة', true], ['📝', 'الاختبارات', true], ['📚', 'الواجبات', true], ['💳', 'تجديد الاشتراكات', true], ['☀️', 'ملخص الصباح', false]];
PAGES['b5-remind-control.jpg'] = [W, H, BASE(W, H) + `<div style="position:absolute;inset:0;background:var(--bg)"></div>${STEP(5, B)}
<div style="position:absolute;left:80px;right:80px;top:150px;color:var(--sea);line-height:1.1"><div style="font-size:110px">أنت <span class="c">تتحكم</span></div>
<div style="font-size:48px;font-weight:400;margin-top:22px;color:#33494D">كل نوع له مفتاح. ملخص الصباح مسكّر إلا إذا شغّلته</div></div>
<div style="position:absolute;left:80px;right:80px;top:420px;border-radius:40px;background:#fff;box-shadow:0 20px 50px -30px rgba(14,59,67,.5);overflow:hidden">${TOG.map(([e, t, on], i) => `<div style="display:flex;align-items:center;gap:26px;padding:24px 40px;${i ? 'border-top:2px solid #eee8dd;' : ''}color:var(--sea)">
<span style="font-size:52px">${e}</span><span style="flex:1;font-size:48px">${t}</span>
<span style="width:120px;height:70px;border-radius:40px;background:${on ? '#13636B' : '#d8d2c6'};position:relative;flex:none"><span style="position:absolute;top:7px;${on ? 'left:7px' : 'right:7px'};width:56px;height:56px;border-radius:50%;background:#fff;box-shadow:0 3px 8px rgba(0,0,0,.25)"></span></span></div>`).join('')}</div>
<div style="position:absolute;left:0;right:0;top:1130px;text-align:center;font-size:48px;color:var(--sea)">وش التنبيه اللي تبيه بعد؟ 👇</div>
<div style="position:absolute;left:0;right:0;top:1230px;text-align:center;font-size:32px;font-weight:400;color:#33494D">📱 نسخة الآيفون · قيد التطوير · نسخة تجريبية</div>`];

// ================= ستوريات 1080×1920 (الكلام بعيد عن أعلى 250 وأسفل 340) =================
const SH = 1920;
const STICKER = (top, label) => `<div style="position:absolute;left:150px;right:150px;top:${top}px;height:400px;border-radius:44px;border:4px dashed rgba(232,220,196,.35);display:grid;place-items:center;font-size:38px;font-weight:400;opacity:.55">${label}</div>`;
PAGES['s1-story-poll.jpg'] = [W, SH, BASE(W, SH) + `<div class="sea"></div>
<div style="position:absolute;left:80px;right:80px;top:330px;text-align:center"><div style="font-size:60px;opacity:.85">سؤال سريع 👀</div>
<div style="font-size:140px;line-height:1.08;margin-top:24px">وش تنساه</div><div style="font-size:140px;line-height:1.08" class="c">أكثر؟</div></div>
${STICKER(880, 'ملصق التصويت هني')}
<div style="position:absolute;left:0;right:0;top:1350px;text-align:center;font-size:44px;font-weight:400;opacity:.85">جوابك يقرر وش ينبني بـ «حياتي»</div>
${HANDLE(1500)}<div class="grain"></div>`];
PAGES['s2-story-ask.jpg'] = [W, SH, BASE(W, SH) + `<div class="sea"></div>
<div style="position:absolute;left:80px;right:80px;top:330px;text-align:center"><div style="font-size:60px;opacity:.85">🛠️ أبني تطبيق لحياتنا</div>
<div style="font-size:118px;line-height:1.12;margin-top:24px">وش الميزة</div><div style="font-size:118px;line-height:1.12" class="c">اللي تبيها؟</div></div>
${STICKER(880, 'ملصق «اسألني» هني')}
<div style="position:absolute;left:0;right:0;top:1350px;text-align:center;font-size:44px;font-weight:400;opacity:.85">كل اقتراح يدخل الديوانية 🏛️</div>
${HANDLE(1500)}<div class="grain"></div>`];
PAGES['s3-story-tests.jpg'] = [W, SH, BASE(W, SH) + `<div class="sea"></div>
<div style="position:absolute;left:80px;right:80px;top:330px;text-align:center"><div style="font-size:60px;opacity:.85">من الكواليس 🛠️</div>
<div style="font-size:96px;line-height:1.15;margin-top:30px">التطبيق يختبر نفسه</div></div>
<div style="position:absolute;left:0;right:0;top:640px;text-align:center"><div style="font-size:400px;line-height:1;direction:ltr" class="c">36</div>
<div style="font-size:64px;margin-top:10px">اختبار قبل كل تحديث ✅</div>
<div style="font-size:44px;font-weight:400;margin-top:30px;opacity:.85;line-height:1.5">يضيف مصروف، يحفظ الجدول، يجرّب التنبيه…<br>وإذا واحد طاح، نصلحه قبل التحديث</div></div>
<div style="position:absolute;left:0;right:0;top:1440px;text-align:center;font-size:88px" class="c">قريباً 👀</div>
<div class="grain"></div>`];

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [name, [w, h, html]] of Object.entries(PAGES)) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    const f = path.join(D, '.tmp-w1.html'); fs.writeFileSync(f, html + '</body></html>');
    await p.goto('file://' + f); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(OUT, name), type: 'jpeg', quality: 92 });
    await p.close(); console.log(name);
  }
  fs.unlinkSync(path.join(D, '.tmp-w1.html'));
  // شبكة معاينة: كل كاروسيل بصف، والستوري بصف
  const rows = [Object.keys(PAGES).filter((n) => n[0] === 'a'), Object.keys(PAGES).filter((n) => n[0] === 'b'), Object.keys(PAGES).filter((n) => n[0] === 's')];
  const p = await b.newPage({ viewport: { width: 2100, height: 1200 } });
  const f = path.join(OUT, '.grid.html');
  fs.writeFileSync(f, `<body style="margin:0;background:#111;padding:20px;display:grid;gap:20px;width:max-content">${rows.map((r) => `<div style="display:flex;gap:14px">${r.map((n) => `<img src="${n}" style="height:${n[0] === 's' ? 420 : 330}px">`).join('')}</div>`).join('')}</body>`);
  await p.goto('file://' + f); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(OUT, 'grid-preview.jpg'), type: 'jpeg', quality: 80, fullPage: true });
  fs.unlinkSync(f);
  await b.close();
})();
