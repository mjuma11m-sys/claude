// يطلع كل نص عربي ثابت بالكود ويشوف إذا الترجمة تغطيه. node tests/tools/i18n-literals.js js/features/travel.js …
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '../..');
global.window = global; global.localStorage = { getItem: () => 'en', setItem() {} };
global.document = { documentElement: {}, title: '', head: { appendChild() {} }, createElement: () => ({}), body: null };
global.addEventListener = () => {};
require(path.join(root, 'js/i18n/i18n-en.js')); require(path.join(root, 'js/i18n/i18n.js'));
const tr = window.HayatiLang.tr, AR = /[ء-ي]/;
const out = new Map();
for (const f of process.argv.slice(2)) {
  const src = fs.readFileSync(f, 'utf8').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
  for (const m of src.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)) {
    // نقسم على الوسوم والمتغيّرات: كل قطعة نص تطلع لحالها بالشاشة
    for (let seg of m[1].replace(/<[^>]*>/g, '\u0000').split('\u0000')) {
      seg = seg.replace(/\\n/g, '\n').trim();
      if (!seg || !AR.test(seg)) continue;
      const t = tr(seg);
      if (AR.test(t)) out.set(seg, path.basename(f) + ' → ' + t);
    }
  }
}
for (const [k, v] of out) console.log(k + '\t' + v);
console.error(out.size + ' missing');
