// DW-086: «احسب احتياجك» — كم سعرة وكم بروتين تحتاج باليوم (معادلة Mifflin-St Jeor)
// بيانات الجسم على الجهاز بس (LOCAL_SETTINGS: body_needs)، ما تروح للسيرفر. تقدير، مو نصيحة طبية.
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, st, I, h } = A;
  const wrap = (name, fn) => { const prev = E[name]; E[name] = (...a) => fn(prev ? prev : () => '', ...a); };

  const ACT = [[1.2, 'قليل الحركة (مكتب، بدون رياضة)'], [1.375, 'خفيف (رياضة 1–3 أيام)'], [1.55, 'متوسط (رياضة 3–5 أيام)'], [1.725, 'عالي (رياضة 6–7 أيام)'], [1.9, 'رياضي (تمرينين باليوم أو شغل بدني)']];
  const GOALS = [['cut', 'أنزّل وزن', -0.15], ['keep', 'أثبّت وزني', 0], ['bulk', 'أزيد عضل', 0.1]];
  const r10 = (x) => Math.round(x / 10) * 10;

  function calc(p) {
    if (!p || !(p.w > 0 && p.h > 0 && p.age > 0)) return null;
    const bmr = 10 * p.w + 6.25 * p.h - 5 * p.age + (p.sex === 'f' ? -161 : 5);
    const tdee = bmr * (p.act || 1.2);
    const g = GOALS.find((x) => x[0] === p.goal) || GOALS[1];
    const kcal = r10(tdee * (1 + g[2]));
    // البروتين غم لكل كغ: النشيط يحتاج أكثر، والتنزيل يحافظ على العضل
    const per = ((p.act || 1.2) >= 1.55 ? 1.8 : 1.4) + (p.goal === 'cut' ? 0.2 : 0);
    return { bmr: r10(bmr), tdee: r10(tdee), kcal, protein: Math.round(p.w * per / 5) * 5, goal: g[1] };
  }

  const prof = () => (st.settings && st.settings.body_needs) || null;

  function card() {
    const p = prof(), c = calc(p);
    if (!c) return '<div class="card" style="margin-bottom:12px"><div style="display:flex;align-items:center;gap:12px"><div style="font-size:30px">🔥</div><div style="flex:1"><b>احسب احتياجك</b><p class="small muted" style="margin:2px 0 0">كم سعرة وكم بروتين تحتاج باليوم</p></div>' +
      '<button class="btn primary" data-action="needs">احسبه</button></div></div>';
    return '<div class="card" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:center"><b>🔥 احتياجك اليومي</b><button class="link" data-action="needs">عدّل</button></div>' +
      '<div class="two" style="margin-top:10px"><div><small class="muted">السعرات</small><br><b class="num" style="font-size:24px"><bdi>' + c.kcal.toLocaleString('en') + '</bdi></b> <small>سعرة</small></div>' +
      '<div><small class="muted">البروتين</small><br><b class="num" style="font-size:24px"><bdi>' + c.protein + '</bdi></b> <small>غم</small></div></div>' +
      '<p class="small muted" style="margin:8px 0 0">' + h(c.goal) + ' · حرق جسمك بالراحة ≈ <bdi>' + c.bmr.toLocaleString('en') + '</bdi> · تقدير، مو نصيحة طبية</p></div>';
  }

  function sheet() {
    const p = Object.assign({ sex: 'm', act: 1.55, goal: 'keep' }, prof() || {});
    A.openSheet({
      title: '🔥 احسب احتياجك',
      saveLabel: 'احسب',
      body: '<p class="small muted" style="margin:0 4px 12px">الأرقام تبقى على جهازك بس.</p>' +
        '<div class="field"><label>الجنس</label><select name="sex"><option value="m"' + (p.sex === 'm' ? ' selected' : '') + '>ذكر</option><option value="f"' + (p.sex === 'f' ? ' selected' : '') + '>أنثى</option></select></div>' +
        '<div class="two"><div class="field"><label>العمر</label><input name="age" type="number" inputmode="numeric" min="14" max="90" value="' + h(p.age || '') + '" placeholder="22"></div>' +
        '<div class="field"><label>الطول (سم)</label><input name="h" type="number" inputmode="numeric" min="120" max="230" value="' + h(p.h || '') + '" placeholder="175"></div></div>' +
        '<div class="field"><label>الوزن (كغ)</label><input name="w" type="number" inputmode="decimal" min="30" max="250" step="0.1" value="' + h(p.w || '') + '" placeholder="72"></div>' +
        '<div class="field"><label>نشاطك</label><select name="act">' + ACT.map(([v, l]) => '<option value="' + v + '"' + (Number(p.act) === v ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>هدفك</label><select name="goal">' + GOALS.map(([v, l]) => '<option value="' + v + '"' + (p.goal === v ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></div>' +
        '<p class="small muted" style="margin:4px">معادلة Mifflin-St Jeor. لو عندك حالة صحية أو حمل، راجع طبيب أو أخصائي تغذية.</p>',
      onSave(root) {
        const v = (n) => A.val(root, n);
        const rec = { sex: v('sex') === 'f' ? 'f' : 'm', age: Number(v('age')), h: Number(v('h')), w: Number(v('w')), act: Number(v('act')), goal: v('goal') };
        if (!(rec.age >= 14 && rec.age <= 90)) throw new Error('العمر بين 14 و 90');
        if (!(rec.h >= 120 && rec.h <= 230)) throw new Error('الطول بالسنتيمتر (120–230)');
        if (!(rec.w >= 30 && rec.w <= 250)) throw new Error('الوزن بالكيلو (30–250)');
        S.setSettings({ body_needs: rec });
        const c = calc(rec);
        A.toast('≈ ' + c.kcal.toLocaleString('en') + ' سعرة · ' + c.protein + ' غم بروتين');
      },
    });
  }

  wrap('viewHealth', (prev) => card() + prev());
  wrap('action', (prev, name, el, e) => { if (name === 'needs') { sheet(); return; } return prev(name, el, e); });
  E._needsCalc = calc; // للاختبار
  A.render();
})();
