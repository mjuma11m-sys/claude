// DW-114: يشغّل اختبارات «اسأل حياتي» (supabase/functions/lecture-ai/evals.json) على الدالة المنشورة.
// يحتاج حساب تجريبي: HAYATI_URL (رابط Supabase) و HAYATI_TOKEN (access token لحساب تجريبي). كل سؤال يحسب من حصة الحساب.
//   HAYATI_URL=https://xxx.supabase.co HAYATI_TOKEN=... node scripts/ai-eval.mjs
import fs from 'node:fs';
const { data, cases } = JSON.parse(fs.readFileSync(new URL('../supabase/functions/lecture-ai/evals.json', import.meta.url)));
const url = process.env.HAYATI_URL, token = process.env.HAYATI_TOKEN;
if (!url || !token) { console.error('حط HAYATI_URL و HAYATI_TOKEN'); process.exit(2); }
let fail = 0;
for (const c of cases) {
  const r = await fetch(url + '/functions/v1/lecture-ai', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ mode: 'ask', messages: [{ role: 'user', content: c.q }], data: JSON.stringify(data) }) });
  const j = await r.json().catch(() => ({}));
  const t = String(j.text || j.error || '');
  const bad = c.must.filter((p) => !new RegExp(p, 'i').test(t)).map((p) => 'ناقص: ' + p).concat(c.must_not.filter((p) => new RegExp(p, 'i').test(t)).map((p) => 'ممنوع: ' + p));
  if (bad.length) fail++;
  console.log((bad.length ? '❌ ' : '✅ ') + c.id + ' (مرحلة ' + c.stage + ')' + (bad.length ? '\n   ' + bad.join(' · ') + '\n   ← ' + t.slice(0, 200).replace(/\n/g, ' ') : ''));
}
console.log(fail ? '\n' + fail + ' من ' + cases.length + ' فشلت' : '\nكلها نجحت ✓');
process.exit(fail ? 1 : 0);
