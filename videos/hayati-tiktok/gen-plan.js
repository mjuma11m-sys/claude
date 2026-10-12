// يطلّع plan.md (للريبو) و plan.html (صفحة الخطة) من plan.json
//   node gen-plan.js
const fs = require('fs'), path = require('path');
const D = __dirname, P = JSON.parse(fs.readFileSync(path.join(D, 'plan.json'), 'utf8'));
const pad = (n) => String(n).padStart(2, '0');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const RULES = [
  ['الغلاف', 'بعد ما ترفع الفيديو: «تعديل الغلاف» ← «إضافة من الألبوم» ← اختار الغلاف بنفس الرقم. لو الخيار مو طالع، اختار فريم الهوك من أول الفيديو.'],
  ['الترتيب', 'انشر بنفس الترتيب. الغامق والفاتح يتبادلون، فالبروفايل يطلع شطرنج ويظل شطرنج مع أي فيديو جديد.'],
  ['التثبيت', 'لا تثبّت (Pin) أي فيديو الحين، لأنه يطلع أول الشبكة ويخرب الترتيب. لما يصير عندك 12 فيديو، ثبّت 3 مرة وحدة.'],
  ['لو حذفت فيديو', 'الشطرنج ينقلب من مكان الحذف. انشر بعده فيديو بنفس لون اللي انحذف، وترجع الشبكة.'],
  ['التاريخ', 'التواريخ هني لك بس. ولا تاريخ إطلاق بأي كابشن.'],
  ['بين الفيديوهات', 'رد بفيديو على أي تعليق فيه اقتراح. هذا أقوى شي بتيك توك.'],
];

// plan.md
let md = `# جدول تيك توك «حياتي»: 9 فيديوهات على أسبوعين\n\n> الأغلفة بـ \`covers/\` (تنبني بـ \`node covers/build.js\`)، وهذا الملف ينبني من \`plan.json\` بـ \`node gen-plan.js\`.\n\n` +
  `| # | اليوم | الساعة | الفيديو | الغلاف |\n|---|---|---|---|---|\n` +
  P.map((v) => `| ${v.n} | ${v.day} ${v.date} | ${v.time} | \`${v.file}\` (${v.title}، ${v.sec} ث) | \`covers/cover-${pad(v.n)}.jpg\` |`).join('\n') +
  `\n\n![شكل البروفايل](covers/grid-preview.jpg)\n\n## القواعد\n` + RULES.map(([k, t]) => `- **${k}:** ${t}`).join('\n') +
  `\n\n## الكابشنات\n` + P.map((v) => `### ${v.n}. ${v.title} · ${v.day} ${v.date} ${v.time}\n\`${v.file}\` + \`covers/cover-${pad(v.n)}.jpg\`\n\`\`\`\n${v.caption}\n\`\`\``).join('\n\n') + '\n';
fs.writeFileSync(path.join(D, 'plan.md'), md);

// plan.html
const cards = P.map((v, i) => `<article class="card" id="v${v.n}">
  <img class="cover" src="covers/cover-${pad(v.n)}.jpg" alt="غلاف ${v.n}: ${esc(v.title)}" loading="lazy" width="1080" height="1920">
  <div class="body">
    <div class="meta"><span class="num ${i % 2 ? 'light' : 'dark'}">${v.n}</span><div><h3>${esc(v.title)}</h3><p class="when">${v.day} ${v.date} · <b>${v.time}</b> · ${v.sec} ث</p></div></div>
    <pre class="cap" id="cap${v.n}">${esc(v.caption)}</pre>
    <div class="acts">
      <button type="button" class="btn primary" data-copy="cap${v.n}">انسخ الكابشن</button>
      <button type="button" class="btn dl" hidden data-save="covers/cover-${pad(v.n)}.jpg" data-name="hayati-cover-${pad(v.n)}.jpg">احفظ الغلاف</button>
      <button type="button" class="btn dl" hidden data-save="${v.file}" data-name="hayati-${pad(v.n)}.mp4">احفظ الفيديو</button>
    </div>
  </div>
</article>`).join('\n');

const html = `<title>خطة تيك توك حياتي</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap">
<style>
/* Layout: عمود واحد للجوال؛ الجدول فوق، بعده بطاقة لكل فيديو (غلاف + كابشن). نفس ألوان «حياتي»: بحر، لؤلؤ، مرجان */
:root{--bg:#F7F4EE;--surface:#FFFFFF;--fg:#0E3B43;--muted:#4E6669;--line:#E2DACB;--accent:#D9532F;--sea:#0E3B43;--pearl:#E8DCC4;
  --f:"IBM Plex Sans Arabic",system-ui,"Segoe UI",Tahoma,sans-serif}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0A1A1E;--surface:#10292E;--fg:#E8DCC4;--muted:#9DB2B2;--line:#21414A;--accent:#FF7A5C;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#0A1A1E;--surface:#10292E;--fg:#E8DCC4;--muted:#9DB2B2;--line:#21414A;--accent:#FF7A5C;color-scheme:dark}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--fg);font-family:var(--f);font-size:16px;line-height:1.7}
.wrap{max-width:880px;margin:0 auto;padding:28px 16px 64px;display:grid;gap:36px}
h1{font-size:clamp(28px,6vw,40px);line-height:1.2;margin:0;text-wrap:balance}
h2{font-size:20px;margin:0 0 12px}
h3{font-size:18px;margin:0;line-height:1.3}
.lede{color:var(--muted);margin:8px 0 0;max-width:60ch}
.hero{display:grid;grid-template-columns:1fr minmax(0,300px);gap:28px;align-items:center}
.grid-img{width:100%;border-radius:18px;border:1px solid var(--line);display:block}
.grid-cap{font-size:13px;color:var(--muted);margin-top:6px;text-align:center}
.tbl{overflow-x:auto;border:1px solid var(--line);border-radius:14px;background:var(--surface)}
table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums;font-size:15px}
th,td{text-align:start;padding:10px 14px;border-bottom:1px solid var(--line);white-space:nowrap}
th{font-weight:600;color:var(--muted);font-size:13px}
tr:last-child td{border-bottom:0}
td a{color:var(--fg);text-decoration-color:var(--accent);text-underline-offset:4px}
.sw{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-1px;margin-inline-end:6px;border:1px solid var(--line)}
.sw.dark{background:var(--sea)}.sw.light{background:#F7F4EE}
.rules{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:12px;margin:0;padding:0;list-style:none}
.rules li{padding:14px 16px;border-radius:14px;background:var(--surface);border:1px solid var(--line);font-size:15px}
.rules b{display:block;color:var(--accent);font-size:13px;letter-spacing:.02em}
.cards{display:grid;gap:18px}
.card{display:grid;grid-template-columns:minmax(0,170px) 1fr;gap:18px;padding:16px;border-radius:18px;background:var(--surface);border:1px solid var(--line)}
.cover{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:12px;display:block;max-width:100%}
.body{min-width:0;display:grid;gap:10px;align-content:start}
.meta{display:flex;gap:12px;align-items:center}
.num{flex:none;width:38px;height:38px;border-radius:10px;display:grid;place-items:center;font-weight:700;font-variant-numeric:tabular-nums}
.num.dark{background:var(--sea);color:#E8DCC4}.num.light{background:#F7F4EE;color:#0E3B43;border:1px solid var(--line)}
.when{margin:2px 0 0;color:var(--muted);font-size:14px}.when b{color:var(--fg)}
.cap{margin:0;white-space:pre-wrap;word-break:break-word;font-family:var(--f);font-size:15px;line-height:1.75;padding:12px 14px;border-radius:12px;background:var(--bg);border:1px solid var(--line);user-select:text}
.acts{display:flex;flex-wrap:wrap;gap:8px}
.btn{font:600 14px var(--f);padding:9px 16px;border-radius:999px;border:1px solid var(--line);background:transparent;color:var(--fg);cursor:pointer}
.btn.primary{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.btn:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.btn.ok{background:var(--accent);border-color:var(--accent);color:#fff}
.note{font-size:14px;color:var(--muted)}
@media (max-width:620px){.hero{grid-template-columns:1fr}.card{grid-template-columns:96px 1fr;gap:12px;padding:12px}}
@media (prefers-reduced-motion:no-preference){.btn{transition:background .15s,color .15s}}
</style>
<div class="wrap" dir="rtl">
  <header class="hero">
    <div>
      <h1>خطة تيك توك «حياتي»</h1>
      <p class="lede">9 فيديوهات على أسبوعين. كل فيديو معاه غلافه وكابشنه وساعته. الغلاف نفس جملة الهوك اللي بأول الفيديو بالحرف.</p>
    </div>
    <figure style="margin:0"><img class="grid-img" src="covers/grid-preview.jpg" alt="شكل البروفايل بعد الـ 9 فيديوهات: شبكة شطرنج غامق وفاتح" width="1080" height="1446"><figcaption class="grid-cap">شكل البروفايل بعد آخر فيديو</figcaption></figure>
  </header>

  <section>
    <h2>الجدول</h2>
    <div class="tbl"><table>
      <thead><tr><th>#</th><th>اليوم</th><th>الساعة</th><th>الفيديو</th><th>اللون</th></tr></thead>
      <tbody>${P.map((v, i) => `<tr><td>${v.n}</td><td>${v.day} ${v.date}</td><td>${v.time}</td><td><a href="#v${v.n}">${esc(v.title)}</a></td><td><span class="sw ${i % 2 ? 'light' : 'dark'}"></span>${i % 2 ? 'فاتح' : 'غامق'}</td></tr>`).join('')}</tbody>
    </table></div>
  </section>

  <section>
    <h2>قبل ما تنشر</h2>
    <ul class="rules">${RULES.map(([k, t]) => `<li><b>${k}</b>${t}</li>`).join('')}</ul>
  </section>

  <section>
    <h2>الفيديوهات</h2>
    <p class="note" id="dlnote">اضغط مطوّل على الغلاف عشان تحفظه بجوالك.</p>
    <div class="cards">
${cards}
    </div>
  </section>
</div>
<script>
document.addEventListener('click', async (e) => {
  const c = e.target.closest('[data-copy]');
  if (c) {
    const el = document.getElementById(c.dataset.copy);
    try { await navigator.clipboard.writeText(el.textContent); }
    catch (err) { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    const t = c.textContent; c.textContent = 'انسخ ✓'; c.classList.add('ok');
    setTimeout(() => { c.textContent = t; c.classList.remove('ok'); }, 1600);
    return;
  }
  const s = e.target.closest('[data-save]');
  if (s && window._dl) {
    const t = s.textContent; s.disabled = true; s.textContent = 'يجهّز…';
    try {
      const blob = await (await fetch(s.dataset.save)).blob();
      await window._dl.save({ filename: s.dataset.name, data: blob });
      s.textContent = 'انحفظ ✓';
    } catch (err) { s.textContent = err && err.code === 'declined' ? t : 'ما انحفظ'; }
    setTimeout(() => { s.textContent = t; s.disabled = false; }, 2000);
  }
});
// زر الحفظ يطلع بس لو المتصفح يسمح
(async () => {
  try {
    const dl = window.claude && await window.claude.use('downloads');
    if (!dl) return;
    window._dl = dl;
    document.querySelectorAll('[data-save]').forEach((b) => { b.hidden = false; });
    document.getElementById('dlnote').textContent = 'تقدر تحفظ الغلاف والفيديو من هني على جوالك مباشرة.';
  } catch (e) { /* يظل الضغط المطوّل */ }
})();
</script>
`;
fs.writeFileSync(path.join(D, 'plan.html'), html);
console.log('plan.md + plan.html');
