// DW-105: «الخط والعرض» — خط أكبر (كل التطبيق يكبر بنفس النسبة: النص والأزرار والمسافات)، و«الشاشة المبسّطة»:
// «اليوم» يظهر الأساسيات بس (الصلاة، رمضان أو السفر لو وقتهم، المهام، آخر العمليات). الإعداد لكل جهاز (hayati-view).
// فكرة الوالد: الجوالات تختلف، وناس كثير يتعبهم الخط الصغير.
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const KEY = 'hayati-view';
  const SIZES = [['1', 'عادي'], ['1.12', 'كبير'], ['1.25', 'أكبر']];
  const KEEP = ['ibada', 'ramadan', 'trip-mode', 'tasks', 'recent'];
  const read = () => { try { return Object.assign({ size: '1', simple: false }, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return { size: '1', simple: false }; } };
  const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* تجاهل */ } apply(); };

  const css = document.createElement('style'); css.id = 'viewCss'; document.head.appendChild(css);
  function apply() {
    const v = read(), z = SIZES.some(([s]) => s === v.size) ? Number(v.size) : 1;
    // zoom يكبّر كل شي بنفس النسبة (WebKit وChrome)، والنوافذ (dialog) معاه
    let out = z !== 1 ? 'body{zoom:' + z + '}' : '';
    if (v.simple) out += '#view section[data-tk]' + KEEP.map((k) => ':not([data-tk="' + k + '"])').join('') + '{display:none}#findBtn,#toolsBtn{display:none}';
    if (css.textContent !== out) css.textContent = out;
    document.documentElement.classList.toggle('view-simple', !!v.simple);
  }

  function sheet() {
    const v = read();
    A.openSheet({
      title: '🔠 الخط والعرض', cancelLabel: 'تم',
      body: '<div class="group-title">حجم الخط</div><div class="seg" id="vwSize">' + SIZES.map(([s, l]) => '<button type="button" data-k="' + s + '" class="' + (v.size === s ? 'on' : '') + '" style="font-size:' + Math.round(14 * Number(s)) + 'px">' + l + '</button>').join('') + '</div>' +
        '<p class="small muted" style="margin:8px 4px 14px">يكبر كل شي: الكلام والأزرار. لو تبي أكبر بعد، كبّر خط الجوال من إعداداته.</p>' +
        '<div class="card"><label class="switch" style="margin:0"><input type="checkbox" id="vwSimple"' + (v.simple ? ' checked' : '') + '> الشاشة المبسّطة</label>' +
        '<p class="small muted" style="margin:8px 0 0">«اليوم» يظهر الأساسيات بس: الصلاة، المهام، وآخر المصاريف. وكل الباقي موجود بـ «كل شي بحياتي».</p></div>',
      mount(root) {
        A.segPick(root, '#vwSize', (k) => { const x = read(); x.size = k; write(x); });
        root.querySelector('#vwSimple').onchange = (e) => { const x = read(); x.simple = e.target.checked; write(x); A.render(); };
      },
    });
  }

  const prevExtra = E.settingsExtra;
  E.settingsExtra = function () {
    const v = read(), l = (SIZES.find(([s]) => s === v.size) || SIZES[0])[1];
    return '<div class="menu" style="margin-top:8px"><button data-set="view"><div class="ico" style="' + A.tint('#13636B') + '">🔠</div><div style="flex:1;min-width:0"><b>الخط والعرض</b><small>' + l + (v.simple ? ' · مبسّطة' : '') + '</small></div>' + A.I('chevL') + '</button></div>' +
      (prevExtra ? prevExtra.apply(this, arguments) : '');
  };
  const prevSet = E.settingsAction;
  E.settingsAction = async function (act) {
    if (act === 'view') { A.closeSheet(); setTimeout(sheet, 280); return true; }
    return prevSet ? prevSet.apply(this, arguments) : false;
  };
  apply();
  E.View = { read, write, apply, sheet, KEY, KEEP };
})();
