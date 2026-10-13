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

  // ---------- 💾 تذكير النسخة الاحتياطية ----------
  // بعد 30 يوم من آخر نسخة (أو من أقدم سجل لو ما سوّى نسخة أبد)، وبس لو عنده 10 سجلات وفوق
  const BACKUP_DAYS = 30, MIN_RECORDS = 10, SNOOZE = 'hayati-backup-snooze';
  function backupDue(now) {
    now = now || new Date();
    // جداول البيانات بس (مو طابور المزامنة «pending»)
    const lists = Object.entries(st).filter(([k, v]) => k !== 'pending' && Array.isArray(v)).map(([, v]) => v);
    const count = lists.reduce((n, l) => n + l.length, 0);
    if (count < MIN_RECORDS) return null;
    try { const z = localStorage.getItem(SNOOZE); if (z && new Date(z) > now) return null; } catch (e) { /* تجاهل */ }
    const last = A.lastBackup();
    let since = last;
    if (!since) {
      let t = Infinity;
      for (const l of lists) for (const r of l) { const v = Date.parse(r.updated_at || r.occurred_at || ''); if (v < t) t = v; }
      if (t === Infinity) return null;
      since = new Date(t);
    }
    const days = A.daysBetween(since, now);
    return days >= BACKUP_DAYS ? { days, never: !last } : null;
  }
  function backupCard() {
    const d = backupDue();
    if (!d) return '';
    return '<div class="card backup-nudge"><div style="display:flex;align-items:center;gap:12px;margin-bottom:12px"><div class="ico" style="' + A.tint('#0d9488') + '">' + I('download') + '</div>' +
      '<div style="flex:1;min-width:0"><b>' + (d.never ? 'ما عندك نسخة احتياطية' : 'آخر نسخة احتياطية قبل ' + A.nDays(d.days)) + '</b>' +
      '<div class="small muted">بياناتك على هالجهاز بس. لو ضاع، تضيع معه.</div></div></div>' +
      '<div class="btn-row"><button class="btn primary" data-action="backup-now">' + I('download') + 'نزّلها الحين</button>' +
      '<button class="btn ghost" data-action="backup-later">بعدين</button></div></div>';
  }
  const prevTop = E.todayTop;
  E.todayTop = function () { return backupCard() + (prevTop ? prevTop.apply(this, arguments) : ''); };
  const prevAct = E.action;
  E.action = function (name) {
    if (name === 'backup-now') { A.backupNow(); return; }
    if (name === 'backup-later') {
      try { localStorage.setItem(SNOOZE, new Date(Date.now() + 7 * 864e5).toISOString()); } catch (e) { /* تجاهل */ }
      A.render(); return;
    }
    return prevAct ? prevAct.apply(this, arguments) : undefined;
  };
  A.backupDue = backupDue;

  // ---------- الإعدادات ----------
  const prevExtra = E.settingsExtra;
  E.settingsExtra = function () {
    return (prevExtra ? prevExtra.apply(this, arguments) : '') +
      '<div class="group-title">' + I('key') + 'الخصوصية</div><div class="menu">' +
      '<a class="menu-link" href="privacy.html" target="_blank" rel="noopener"><div class="ico" style="' + A.tint('#13636B') + '">' + I('key') + '</div><div style="flex:1;min-width:0"><b>سياسة الخصوصية</b><small>وين بياناتك، ومين يشوفها</small></div>' + I('chevL') + '</a>' +
      '<a class="menu-link" href="terms.html" target="_blank" rel="noopener"><div class="ico" style="' + A.tint('#13636B') + '">' + I('tasks') + '</div><div style="flex:1;min-width:0"><b>شروط الاستخدام</b><small>التقديرات، ومسؤولية كل واحد</small></div>' + I('chevL') + '</a>' +
      '<button data-set="wipe"><div class="ico" style="' + A.tint('#D63A3A') + '">' + I('trash') + '</div><div style="flex:1;min-width:0"><b style="color:var(--expense)">احذف كل بياناتي</b><small>من الجهاز والمزامنة، وما ترجع</small></div>' + I('chevL') + '</button></div>' +
      '<p class="small muted app-version" style="text-align:center;margin:18px 0 4px">حياتي ' + A.APP_VERSION + ' · قيد التطوير · نسخة تجريبية</p>';
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
        root.querySelector('#wipeBackup').onclick = () => A.backupNow();
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
