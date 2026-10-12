// 🔒 الخصوصية: إخفاء أرقام البطاقات بالرسايل القديمة + «سياسة الخصوصية» + «احذف كل بياناتي»
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E || !window.SmsParser || !window.SmsParser.mask) return;
  const { S, st, I, h } = A;
  const mask = window.SmsParser.mask;

  // الرسايل اللي انحفظت قبل الإخفاء: نخفي أرقامها مرة وحدة (وتتزامن مخفية)
  function maskOld() {
    let n = 0;
    for (const t of st.transactions) {
      if (!t.raw) continue;
      const m = mask(t.raw);
      if (m !== t.raw) { S.upsert('transactions', Object.assign({}, t, { raw: m })); n++; }
    }
    return n;
  }
  let masked = false;
  S.subscribe(() => { if (!masked && st.transactions.length) { masked = true; setTimeout(maskOld, 0); } });

  // ---------- الإعدادات ----------
  const prevExtra = E.settingsExtra;
  E.settingsExtra = function () {
    return (prevExtra ? prevExtra.apply(this, arguments) : '') +
      '<div class="group-title">' + I('key') + 'الخصوصية</div><div class="menu">' +
      '<a class="menu-link" href="privacy.html" target="_blank" rel="noopener"><div class="ico" style="' + A.tint('#13636B') + '">' + I('key') + '</div><div style="flex:1;min-width:0"><b>سياسة الخصوصية</b><small>وين بياناتك، ومين يشوفها</small></div>' + I('chevL') + '</a>' +
      '<button data-set="wipe"><div class="ico" style="' + A.tint('#D63A3A') + '">' + I('trash') + '</div><div style="flex:1;min-width:0"><b style="color:var(--expense)">احذف كل بياناتي</b><small>من الجهاز والمزامنة، وما ترجع</small></div>' + I('chevL') + '</button></div>';
  };
  const prevSet = E.settingsAction;
  E.settingsAction = async function (act) {
    if (act === 'wipe') { A.closeSheet(); setTimeout(wipeSheet, 280); return true; }
    return prevSet ? prevSet.apply(this, arguments) : false;
  };

  function wipeSheet() {
    const WORD = 'احذف';
    A.openSheet({
      title: 'احذف كل بياناتي',
      saveLabel: 'احذف نهائياً',
      body: '<div class="card alert-card over" style="margin-bottom:14px"><div class="ico" style="' + A.tint('#D63A3A') + '">' + I('alert') + '</div><div style="flex:1"><b>ما فيه رجعة</b>' +
        '<div class="small muted">ينمسح كل شي: المصاريف، الجدول، المهام، الصحة، الإعدادات، والرمز السري. من هالجهاز ومن المزامنة.</div></div></div>' +
        '<button type="button" class="btn ghost block" id="wipeBackup" style="margin-bottom:14px">' + I('download') + 'نزّل نسخة احتياطية أول</button>' +
        '<div class="field"><label for="wipeWord">اكتب «' + WORD + '» عشان تأكد</label><input id="wipeWord" autocomplete="off"></div>',
      mount(root) {
        root.querySelector('#wipeBackup').onclick = () => A.saveFile('hayati-backup-' + new Date().toISOString().slice(0, 10) + '.json', S.exportJSON(), 'application/json');
      },
      async onSave(root) {
        if (root.querySelector('#wipeWord').value.trim() !== WORD) throw new Error('اكتب «' + WORD + '» بالضبط');
        const r = await S.wipeAll();
        A.toast(r.ok ? 'انحذف كل شي ✓' : 'انحذف من الجهاز، وبعض المزامنة ما انحذفت — جرّب مرة ثانية');
        setTimeout(() => location.reload(), 900);
      },
    });
  }

  window.HayatiPrivacy = { maskOld };
})();
