// DW-052: «المطبخ» — وصفات خليجية بمقادير تتغيّر حسب عدد الأشخاص، خطوات تشطّبها، والناقص يروح للمشتريات
// الوصفات بالجهاز (recipes.js)، والمفضلة بالإعدادات (settings.kitchen_fav)
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, st, I, h } = A;
  const wrap = (name, fn) => { const prev = E[name]; E[name] = (...a) => fn(prev ? prev : () => '', ...a); };
  const all = () => window.HAYATI_RECIPES || [];

  const CATS = [['all', 'الكل'], ['fav', '❤️ المفضلة'], ['main', 'الغدا'], ['breakfast', 'الفطور'], ['sweet', 'الحلا'], ['drink', 'المشروبات'], ['side', 'جانبي']];
  const LEVEL = ['', 'سهلة', 'متوسطة'];
  const COUNT = ['حبة', 'فص', 'عود', 'علبة'];
  const ui = { cat: 'all', q: '' };
  const favs = () => (Array.isArray(st.settings.kitchen_fav) ? st.settings.kitchen_fav : []);

  // ---------- المقادير ----------
  const FRAC = { 0.25: '¼', 0.5: '½', 0.75: '¾' };
  function frac(x) {
    const w = Math.floor(x), f = Math.round((x - w) * 4) / 4;
    if (f === 1) return String(w + 1);
    return f ? (w ? w + FRAC[f] : FRAC[f]) : String(w);
  }
  function qty(q, unit, k) {
    if (q == null) return '';
    let x = q * k;
    if (unit === 'غرام') { x = x >= 100 ? Math.round(x / 50) * 50 : Math.max(10, Math.round(x / 10) * 10); return x >= 1000 ? frac(x / 1000) + ' كغ' : x + ' غرام'; }
    if (unit === 'كغ') { if (x < 1) return Math.max(50, Math.round(x * 1000 / 50) * 50) + ' غرام'; return frac(Math.round(x * 4) / 4) + ' كغ'; }
    if (COUNT.includes(unit)) x = Math.max(0.5, Math.round(x * 2) / 2);
    else x = Math.max(0.25, Math.round(x * 4) / 4);
    return frac(x) + ' ' + unit;
  }
  const short = (name) => name.replace(/\s*\(.*?\)\s*/g, ' ').trim();

  // ---------- القائمة ----------
  function list() {
    const q = ui.q.trim();
    const fv = favs();
    return all().filter((r) => (ui.cat === 'all' || (ui.cat === 'fav' ? fv.includes(r.id) : r.cat === ui.cat)) &&
      (!q || r.name.includes(q) || r.en.toLowerCase().includes(q.toLowerCase()) || r.ing.some((x) => x[2].includes(q))));
  }
  function rows() {
    const items = list();
    if (!items.length) return '<div class="card">' + A.empty('utensils', ui.cat === 'fav' ? 'ما عندك مفضلة للحين' : 'ما لقينا وصفة', ui.cat === 'fav' ? 'اضغط ♡ بأي وصفة وتنحفظ هني' : 'جرّب اسم ثاني أو مكوّن مثل «دجاج»') + '</div>';
    return '<div class="card flush"><ul class="list">' + items.map((r) =>
      '<li class="row" data-recipe="' + r.id + '"><div class="ico" style="font-size:22px">' + r.icon + '</div><div class="main"><div class="title"><span class="t" data-noi18n>' + h(r.name) + '</span>' +
      (favs().includes(r.id) ? ' <small>❤️</small>' : '') + '</div><div class="sub"><bdi>' + r.mins + '</bdi> د · ' + LEVEL[r.level] + ' · ' + r.ing.length + ' مكوّنات</div></div><span class="muted">' + I('chevL') + '</span></li>').join('') + '</ul></div>';
  }
  const BASICS = [
    ['🥄', 'المقاسات', 'الكوب = 240 مل (كوب الشاي الكبير). م.ك = ملعقة كبيرة (ملعقة الأكل)، م.ص = ملعقة صغيرة (ملعقة الشاي).'],
    ['🍚', 'الرز', 'اغسله لين يصير الماي صافي ونقّعه 20–30 دقيقة. كوب ونص ماي لكل كوب بسمتي، وبعد ما يغلي غطّه ولا تحرّكه.'],
    ['🔥', 'النار', '«نار هادية» = أصغر لهب. «يذهّب» = لونه ذهبي فاتح. لو شي بدا يحترق، نزّل النار على طول.'],
    ['🧂', 'الملح', 'حط أقل من المكتوب، وذوق بالآخر. الزيادة تنضاف، بس النقص ما يطلع.'],
  ];
  function sheet() {
    A.openSheet({
      title: 'المطبخ 🍳',
      cancelLabel: 'تم',
      body: '<div class="field" style="margin-bottom:8px"><input name="kq" type="search" placeholder="دوّر: مجبوس، دجاج، حلا…" value="' + h(ui.q) + '" autocomplete="off"></div>' +
        '<div class="chips" id="kCats" style="margin-bottom:10px">' + CATS.map(([k, l]) => '<button type="button" class="chip' + (ui.cat === k ? ' on' : '') + '" data-k="' + k + '">' + l + '</button>').join('') + '</div>' +
        '<details class="card" style="margin-bottom:10px"><summary><b>🧑‍🍳 أول مرة تطبخ؟ اقرا هذي</b></summary>' +
        BASICS.map(([e, t, d]) => '<p class="small" style="margin:8px 0 0">' + e + ' <b>' + t + ':</b> ' + d + '</p>').join('') + '</details>' +
        '<div id="kList">' + rows() + '</div>' +
        '<p class="small muted" style="margin:10px 4px 0">المقادير والأوقات تقريبية؛ ذوق وعدّل على كيفك. الوصفات على جوالك وتشتغل بدون نت.</p>',
      mount(root) {
        const redraw = () => { root.querySelector('#kList').innerHTML = rows(); };
        root.querySelector('[name=kq]').oninput = (e) => { ui.q = e.target.value; redraw(); };
        root.querySelector('#kCats').onclick = (e) => {
          const b = e.target.closest('[data-k]'); if (!b) return;
          ui.cat = b.dataset.k;
          root.querySelectorAll('#kCats .chip').forEach((x) => x.classList.toggle('on', x === b));
          redraw();
        };
        root.querySelector('#kList').onclick = (e) => {
          const r = e.target.closest('[data-recipe]'); if (!r) return;
          A.closeSheet(); setTimeout(() => recipe(r.dataset.recipe), 280);
        };
      },
    });
  }

  // ---------- الوصفة ----------
  function recipe(id) {
    const r = all().find((x) => x.id === id);
    if (!r) return;
    let n = r.serves;
    const need = new Set();
    const done = new Set();
    const ingHtml = () => {
      const k = n / r.serves;
      return '<ul class="list">' + r.ing.map((x, i) => '<li class="row" data-ing="' + i + '" style="cursor:pointer"><button type="button" class="check' + (need.has(i) ? ' on' : '') + '" aria-label="ناقصني">' + I('check') + '</button>' +
        '<div class="main"><div class="title"><span class="t" data-noi18n>' + h(x[2]) + '</span></div></div><b data-noi18n style="white-space:nowrap">' + (x[0] == null ? 'حسب الرغبة' : qty(x[0], x[1], k).replace(/^(\S+)/, '<bdi>$1</bdi>')) + '</b></li>').join('') + '</ul>';
    };
    const note = () => n === r.serves ? '' : '<p class="small" style="margin:0 4px 8px;color:var(--brand)">الكميات بالخطوات مكتوبة لـ <bdi>' + r.serves + '</bdi>؛ استخدم المقادير اللي فوق (×<bdi>' + frac(Math.round(n / r.serves * 4) / 4) + '</bdi>).</p>';
    const fav = () => favs().includes(r.id);
    A.openSheet({
      title: r.icon + ' ' + r.name,
      cancelLabel: 'تم',
      body: '<button type="button" class="link" id="kBack" style="margin:0 0 8px">' + I('chevR') + 'كل الوصفات</button>' +
        '<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px"><span class="tag">⏱ <bdi>' + r.mins + '</bdi> د</span><span class="tag">' + LEVEL[r.level] + '</span>' +
        '<button type="button" class="btn ghost" id="kFav" style="margin-inline-start:auto">' + (fav() ? '❤️ بالمفضلة' : '♡ احفظها') + '</button></div>' +
        '<div class="card" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><b>لكم شخص؟</b><div style="display:flex;align-items:center;gap:12px">' +
        '<button type="button" class="icon-btn" id="kMinus" aria-label="أقل">' + I('minus') + '</button><b class="num" id="kN" style="font-size:20px;min-width:28px;text-align:center">' + n + '</b>' +
        '<button type="button" class="icon-btn" id="kPlus" aria-label="أكثر">' + I('plus') + '</button></div></div>' +
        '<div class="group-title">🧺 المقادير · اضغط على اللي ناقصك</div><div class="card flush" id="kIng">' + ingHtml() + '</div>' +
        '<button type="button" class="btn block" id="kShop" style="margin:8px 0 14px">' + I('cart') + 'أضف الناقص للمشتريات</button>' +
        '<div class="group-title">👣 الخطوات · اضغط على اللي خلصته</div><div id="kNote">' + note() + '</div><div class="card flush"><ol class="list" id="kSteps" style="margin:0;padding:0" data-noi18n>' +
        r.steps.map((s, i) => '<li class="row" data-step="' + i + '" style="cursor:pointer;align-items:flex-start"><b class="num" style="min-width:24px;color:var(--brand)">' + (i + 1) + '</b><div class="main" style="white-space:normal;line-height:1.7">' + h(s) + '</div></li>').join('') + '</ol></div>' +
        (r.tip ? '<div class="card" style="margin-top:10px"><b>💡 نصيحة:</b> <span data-noi18n>' + h(r.tip) + '</span></div>' : ''),
      mount(root) {
        const setN = (v) => { n = Math.max(1, Math.min(30, v)); root.querySelector('#kN').textContent = n; root.querySelector('#kIng').innerHTML = ingHtml(); root.querySelector('#kNote').innerHTML = note(); };
        root.querySelector('#kBack').onclick = () => { A.closeSheet(); setTimeout(sheet, 280); };
        root.querySelector('#kMinus').onclick = () => setN(n - 1);
        root.querySelector('#kPlus').onclick = () => setN(n + 1);
        root.querySelector('#kIng').onclick = (e) => {
          const li = e.target.closest('[data-ing]'); if (!li) return;
          const i = Number(li.dataset.ing); need.has(i) ? need.delete(i) : need.add(i);
          li.querySelector('.check').classList.toggle('on', need.has(i));
          root.querySelector('#kShop').textContent = need.size ? 'أضف الناقص للمشتريات (' + need.size + ')' : 'أضف الناقص للمشتريات';
        };
        root.querySelector('#kSteps').onclick = (e) => {
          const li = e.target.closest('[data-step]'); if (!li) return;
          const i = Number(li.dataset.step); done.has(i) ? done.delete(i) : done.add(i);
          li.style.opacity = done.has(i) ? '.45' : ''; li.style.textDecoration = done.has(i) ? 'line-through' : '';
          if (done.size === r.steps.length) A.toast('بالعافية! 🍽️');
        };
        root.querySelector('#kShop').onclick = () => {
          if (!need.size) { A.toast('اضغط على المكوّنات اللي ناقصتك أول'); return; }
          const k = n / r.serves;
          for (const i of need) { const x = r.ing[i]; S.upsert('shopping', { name: short(x[2]), qty: x[0] == null ? null : qty(x[0], x[1], k), done: false, note: r.name }); }
          A.toast('انضاف ' + need.size + ' للمشتريات ✓');
          need.clear(); root.querySelector('#kIng').innerHTML = ingHtml();
        };
        root.querySelector('#kFav').onclick = (e) => {
          const f = favs().filter((x) => x !== r.id);
          if (!fav()) f.push(r.id);
          S.setSettings({ kitchen_fav: f });
          e.currentTarget.textContent = fav() ? '❤️ بالمفضلة' : '♡ احفظها';
        };
      },
    });
  }

  // ================= الربط =================
  wrap('chooserItems', (prev, item) => prev(item) + item('kitchen', 'utensils', '#ea580c', 'المطبخ', 'وصفات خليجية بمقاديرها'));
  const prevPick = E.pick;
  E.pick = (k) => { if (k === 'kitchen') { sheet(); return; } if (prevPick) prevPick(k); };
  wrap('action', (prev, name, el, e) => { if (name === 'kitchen') { sheet(); return; } return prev(name, el, e); });
  E.kitchen = sheet;
  E._kitchenQty = qty; // للاختبار
})();
