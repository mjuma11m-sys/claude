// ⌚ الساعة الذكية — DW-053: بنسخة الآيفون نقرا تطبيق الصحة مباشرة (Apple Watch وأي ساعة تكتب فيه)
// وبالمتصفح: اختصار بالآيفون يقرا النوم من تطبيق الصحة كل صبح ويفتح التطبيق برابط فيه الأرقام
//   …/#health?sleep=7.25&deep=1.1&rem=1.6&rhr=54&hrv=48&steps=8200   (date اختياري = اليوم)
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, st, I, h, tint } = A;
  // DW-081: Apple (إرشاد 2.5.1) طلبت نشيل HealthKit من نسخة الآيفون، فربط الساعة ما يطلع فيها (يظل بالمتصفح والأندرويد)
  const C0 = window.Capacitor;
  if (C0 && typeof C0.isNativePlatform === 'function' && C0.isNativePlatform() && typeof C0.getPlatform === 'function' && C0.getPlatform() === 'ios') return;
  const wrap = (name, fn) => { const prev = E[name]; E[name] = (...a) => fn(prev ? prev : () => '', ...a); };
  const pad = (n) => String(n).padStart(2, '0');
  const dateKey = (d) => { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // الحقول المقبولة وحدودها — أي شي برّاها ينرفض
  const FIELDS = {
    sleep: ['sleep', 0, 16, 0.1], deep: ['sleep_deep', 0, 8, 0.1], rem: ['sleep_rem', 0, 8, 0.1], core: ['sleep_core', 0, 12, 0.1],
    awake: ['sleep_awake', 0, 8, 0.1], rhr: ['rhr', 25, 160, 1], hrv: ['hrv', 3, 300, 1], steps: ['steps', 0, 150000, 1],
  };

  function parse(text) {
    const q = String(text || '').trim().replace(/^.*?#?health\??/, '').replace(/^\?/, '');
    const p = new URLSearchParams(q.replace(/;/g, '&'));
    const out = {};
    for (const [k, [field, lo, hi, step]] of Object.entries(FIELDS)) {
      const raw = p.get(k);
      if (raw == null || raw === '') continue;
      // الاختصارات أحياناً ترسل «7٫25» أو «7,25» أو «7.25 ساعة»
      const n = parseFloat(String(raw).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٫,]/, '.'));
      if (!isFinite(n) || n < lo || n > hi) continue;
      out[field] = step === 1 ? Math.round(n) : Math.round(n * 10) / 10;
    }
    const d = p.get('date');
    out.date = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : dateKey();
    return Object.keys(out).length > 1 ? out : null;
  }

  function apply(data, quiet) {
    const cur = st.daily.find((x) => x.date === data.date) || { id: S.stableId('daily:' + data.date), date: data.date, water: 0, sleep: null, habits: {} };
    const patch = Object.assign({}, data, { watch: true, watch_at: new Date().toISOString() });
    S.upsert('daily', Object.assign({}, cur, patch));
    if (quiet) return;
    const parts = [];
    if (data.sleep != null) parts.push('نومك ' + fmtH(data.sleep));
    if (data.steps != null) parts.push(data.steps.toLocaleString('en') + ' خطوة');
    A.toast('⌚ ' + (parts.join(' · ') || 'انسجلت بيانات الساعة'));
  }

  // ---------- تطبيق الصحة (نسخة الآيفون) ----------
  const Cap = window.Capacitor;
  const HK = Cap && typeof Cap.isNativePlatform === 'function' && Cap.isNativePlatform() && typeof Cap.getPlatform === 'function' && Cap.getPlatform() === 'ios'
    ? ((Cap.Plugins && Cap.Plugins.HayatiHealth) || (typeof Cap.registerPlugin === 'function' ? Cap.registerPlugin('HayatiHealth') : null)) : null;
  const HK_ON = 'hayati-health-on', HK_AT = 'hayati-health-at';
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } return null; };
  const hkOn = () => !!HK && ls(HK_ON) === '1';
  let hkBusy = false;
  async function hkSync(manual) {
    if (!hkOn() || hkBusy) return;
    if (!manual && Date.now() - Number(ls(HK_AT) || 0) < 3600e3) return;   // مرة بالساعة بالكثير
    hkBusy = true;
    try {
      const r = await HK.read({ days: 7 });
      let n = 0;
      for (const d of (r && r.days) || []) {
        const q = Object.keys(FIELDS).filter((k) => d[k] != null).map((k) => k + '=' + d[k]).join('&');
        const one = q && parse(q + '&date=' + d.date);
        if (one) { apply(one, true); n++; }
      }
      ls(HK_AT, String(Date.now()));
      if (manual) A.toast(n ? '⌚ تحدّثت ' + n + ' أيام من تطبيق الصحة' : 'ما لقينا بيانات بتطبيق الصحة · تأكد إنك سمحت لـ«حياتي» بالقراءة');
    } catch (e) {
      if (manual) A.toast('ما قدرنا نقرا تطبيق الصحة');
    } finally { hkBusy = false; }
  }
  async function hkConnect() {
    try {
      await HK.authorize();
      ls(HK_ON, '1');
      await hkSync(true);
      A.render();
    } catch (e) { A.toast('ما انربط · افتح الإعدادات ← الصحة ← الوصول للبيانات ← «حياتي»'); }
  }
  function hkDisconnect() { ls(HK_ON, null); ls(HK_AT, null); A.render(); A.toast('وقّفنا القراءة · الأيام اللي انسجلت تظل بـ«صحتي»'); }

  function fromHash() {
    if (!/^#health/.test(location.hash)) return;
    const d = parse(location.hash);
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* تجاهل */ }
    if (d) apply(d); else A.toast('رابط الساعة ناقص — شيّك الاختصار');
  }

  // 7.25 → «7 س و15 د»
  function fmtH(x) {
    const H = Math.floor(x), M = Math.round((x - H) * 60);
    return H + ' س' + (M ? ' و' + M + ' د' : '');
  }

  // ---------- كرت الساعة في «صحتي» ----------
  let ringDrawn = false;
  function watchCard() {
    const goal = Number((st.settings || {}).sleep_goal) || 8;
    const nights = st.daily.filter((d) => d.watch && d.sleep != null).sort((a, b) => (a.date < b.date ? 1 : -1));
    let out = A.secHead('⌚ الساعة الذكية', hkOn() ? '<button class="link" data-action="health-sync">تحديث</button>' : '<button class="link" data-action="watch-setup">' + (nights.length ? 'الإعداد' : 'اربط') + '</button>');
    if (!nights.length && hkOn()) {
      return out + '<div class="card"><b>متصل بتطبيق الصحة ✓</b><p class="small muted" style="margin:4px 0 0">ما فيه نوم مسجّل للحين. البس الساعة وأنت نايم، ونومك يطلع هني الصبح.</p></div>';
    }
    if (!nights.length) {
      return out + '<button class="cta" data-action="watch-setup"><div class="ico">⌚</div><div style="flex:1"><b>اربط ساعتك</b><small>' + (HK ? 'Apple Watch أو أي ساعة تشارك مع تطبيق الصحة: نومك ونبضك وخطواتك تلقائياً' : 'كل صبح تنسجل ساعات نومك ومراحله ونبضك تلقائياً') + '</small></div>' + I('chevL') + '</button>';
    }
    const n = nights[0];
    const pct = Math.min(1, n.sleep / goal), R = 52, C = 2 * Math.PI * R;
    const color = n.sleep >= goal ? 'var(--income)' : n.sleep >= goal - 1 ? '#f59e0b' : 'var(--expense)';
    const stage = (lbl, v, c) => v != null ? '<div class="tile" style="padding:10px"><div class="lbl">' + lbl + '</div><div class="val" dir="rtl" style="color:' + c + '">' + fmtH(v) + '</div></div>' : '';
    out += '<div class="card"><div style="display:flex;align-items:center;gap:18px">' +
      '<div class="sleep-ring" style="position:relative;width:128px;height:128px;flex:none">' +
      '<svg viewBox="0 0 128 128" style="width:100%;height:100%;transform:rotate(-90deg)"><circle cx="64" cy="64" r="' + R + '" fill="none" stroke="var(--surface-2)" stroke-width="12"/>' +
      '<circle class="sleep-arc" cx="64" cy="64" r="' + R + '" fill="none" stroke="' + color + '" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + (C * pct) + ' ' + C + '"/></svg>' +
      '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><b class="num" style="font-size:26px">' + n.sleep + '</b><small class="muted">من ' + goal + ' س</small></div></div>' +
      '<div style="flex:1;min-width:0"><b>' + (n.date === dateKey() ? 'نومك البارحة' : 'آخر ليلة · ' + h(n.date)) + '</b>' +
      '<div class="small muted" style="margin:2px 0 8px">' + (n.sleep >= goal ? 'نوم كافي 👌 جاهز ليومك' : n.sleep >= goal - 1 ? 'قريب من هدفك' : 'أقل من هدفك — خفّف التمرين القوي اليوم') + '</div>' +
      (n.rhr != null ? '<div class="small">❤️ نبض الراحة <b class="num">' + n.rhr + '</b></div>' : '') +
      (n.hrv != null ? '<div class="small">📈 HRV <b class="num">' + n.hrv + '</b> ms</div>' : '') +
      (n.steps != null ? '<div class="small">👟 <b class="num">' + n.steps.toLocaleString('en') + '</b> خطوة</div>' : '') + '</div></div>';
    if (n.sleep_deep != null || n.sleep_rem != null || n.sleep_core != null) {
      out += '<div class="tiles" style="margin-top:12px">' + stage('عميق', n.sleep_deep, '#13636B') + stage('REM', n.sleep_rem, '#8b5cf6') + stage('خفيف', n.sleep_core, '#0ea5e9') + '</div>';
    }
    // آخر 7 ليالي
    const last = nights.slice(0, 7).reverse();
    if (last.length >= 2) {
      const max = Math.max(goal + 1, ...last.map((x) => x.sleep));
      const DAYS = (window.HayatiLang && HayatiLang.lang === 'en') ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];
      out += '<div class="mini-chart" style="margin:14px 0 0"><b>آخر ' + last.length + ' ليالي</b><div class="mini-bars" style="grid-template-columns:repeat(' + last.length + ',1fr);height:84px">' +
        last.map((x) => '<div><small class="num">' + x.sleep + '</small><i style="height:' + Math.round((x.sleep / max) * 100) + '%;background:' + (x.sleep >= goal ? 'var(--income)' : x.sleep >= goal - 1 ? '#f59e0b' : 'var(--expense)') + '"></i><small>' + DAYS[new Date(x.date + 'T12:00').getDay()] + '</small></div>').join('') + '</div></div>';
    }
    return out + '</div>';
  }

  // يرسم القوس أول مرة بالجلسة بس (مو كل ما ترجع للصفحة)
  function drawRing() {
    if (ringDrawn || reduced()) return;
    const arc = document.querySelector('.sleep-arc');
    if (!arc) return;
    ringDrawn = true;
    const C = 2 * Math.PI * 52, to = arc.getAttribute('stroke-dasharray');
    arc.animate({ strokeDasharray: ['0, ' + C, to.replace(' ', ', ')] }, { duration: 700, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', delay: 120, fill: 'backwards' });
  }

  // ---------- طريقة الربط ----------
  function setupSheet() {
    const base = location.origin && !/^about|blob|data/.test(location.protocol) ? location.origin + location.pathname : 'https://رابط-التطبيق';
    const url = base + '#health?sleep=';
    const isClaude = /claude\.ai|claudeusercontent|artifact/.test(location.href);
    const copy = (label, value) => '<div class="copy-box"><code style="word-break:keep-all;white-space:nowrap">' + h(label) + '</code><button type="button" data-copy="' + h(value) + '">' + I('copy') + 'نسخ</button></div>';
    A.openSheet({
      title: 'ربط الساعة',
      cancelLabel: 'تم',
      saveLabel: 'سجّل',
      body:
        (HK ? '<div class="card" style="margin-bottom:12px"><b>📲 تطبيق الصحة</b><p class="small muted" style="margin:4px 0 10px">Apple Watch، وأي ساعة تطبيقها يشارك مع تطبيق الصحة (مثل Garmin وHuawei وAmazfit وXiaomi). نقرا بس، وما نكتب شي فيه.</p>' +
          (hkOn() ? '<button type="button" class="btn block" id="hkSync">' + I('refresh') + 'حدّث الحين</button><button type="button" class="btn ghost block" id="hkOff" style="margin-top:8px">وقّف القراءة</button>'
            : '<button type="button" class="btn primary block" id="hkConnect">⌚ اربط تطبيق الصحة</button>') + '</div>' +
          '<details><summary class="small muted">أو بالاختصارات (الطريقة القديمة)</summary>' : '') +
        (isClaude ? '<div class="card notice"><p class="small" style="margin:10px 0">⚠️ الربط التلقائي يشتغل على رابط Vercel أو الملف المحمّل. داخل رابط Claude استخدم «لصق» تحت.</p></div>' : '') +
        '<p class="small muted" style="margin:0 0 8px">مرة وحدة بتطبيق <b>الاختصارات</b> بالآيفون (الساعة تسجّل النوم بتطبيق الصحة، والاختصار يوصله هني):</p>' +
        '<ol class="steps">' +
        '<li><b>الأتمتة</b> ← <b>+</b> ← <b>المنبّه</b> ← <b>عند إيقافه</b> ← <b>تشغيل فوراً</b>.</li>' +
        '<li>إجراء <b>«البحث عن عينات الصحة»</b>: النوع <b>تحليل النوم</b>، تاريخ البدء <b>آخر يوم واحد</b>، والقيمة <b>ليس «مستيقظ»</b> ولا «في السرير».</li>' +
        '<li><b>«حساب الإحصائيات»</b> ← <b>المجموع</b> لمدة العينات ← <b>«حساب»</b> ÷ 3600 = ساعات النوم.</li>' +
        '<li>(اختياري) كرّر للعميق <code style="word-break:keep-all;white-space:nowrap">deep</code> و REM <code style="word-break:keep-all;white-space:nowrap">rem</code>، و<b>نبض الراحة</b> <code style="word-break:keep-all;white-space:nowrap">rhr</code>، و<b>الخطوات</b> <code style="word-break:keep-all;white-space:nowrap">steps</code>.</li>' +
        '<li>إجراء <b>«نص»</b> فيه الرابط وبعده الرقم:</li></ol>' + copy(url.length > 40 ? '…' + url.slice(-30) + '7.5' : url + '7.5', url) +
        '<p class="small muted" style="margin:0 0 4px">والإضافي هكذا: <code style="word-break:keep-all;white-space:nowrap">&amp;deep=1.2&amp;rem=1.6&amp;rhr=54&amp;steps=8200</code></p>' +
        '<ol class="steps" start="6"><li>إجراء <b>«فتح عناوين URL»</b> على النص. خلاص — كل ما توقف المنبّه ينفتح التطبيق ونومك مسجّل.</li></ol>' +
        A.secHead('أو الصق يدوياً') +
        '<div class="field"><textarea name="paste" class="ltr" placeholder="sleep=7.5&amp;deep=1.2&amp;rem=1.6&amp;rhr=54"></textarea></div>' + (HK ? '</details>' : ''),
      mount(root) {
        const on = (id, fn) => { const b = root.querySelector(id); if (b) b.onclick = (e) => { e.stopPropagation(); A.closeSheet(); fn(); }; };
        on('#hkConnect', hkConnect); on('#hkSync', () => hkSync(true)); on('#hkOff', hkDisconnect);
        root.onclick = (e) => {
          const b = e.target.closest('[data-copy]');
          if (!b) return;
          try { navigator.clipboard.writeText(b.dataset.copy).then(() => A.toast('انسخ ✓'), () => A.toast('ما قدرت أنسخ — انسخه يدوياً')); } catch (err) { A.toast('ما قدرت أنسخ'); }
        };
      },
      onSave(root) {
        const d = parse(A.val(root, 'paste'));
        if (!d) { A.toast('ما لقيت أرقام — مثال: sleep=7.5'); return false; }
        apply(d);
      },
    });
  }

  // ================= الربط =================
  wrap('viewHealth', (prev) => watchCard() + prev());
  wrap('action', (prev, name, el, e) => {
    if (name === 'watch-setup') { setupSheet(); return; }
    if (name === 'health-sync') { hkSync(true); return; }
    return prev(name, el, e);
  });
  const prevExtra = E.settingsExtra;
  E.settingsExtra = function () {
    return (prevExtra ? prevExtra.apply(this, arguments) : '') + '<div class="group-title">⌚ الساعة الذكية</div><div class="menu">' +
      '<button data-set="watch-setup"><div class="ico" style="' + tint('#13636B') + '">⌚</div><div style="flex:1"><b>ربط الساعة (النوم والنبض)</b><small>' + (HK ? (hkOn() ? 'متصل بتطبيق الصحة ✓' : 'Apple Watch وأي ساعة تشارك مع تطبيق الصحة') : 'اختصار واحد بالآيفون، مرة وحدة') + '</small></div>' + I('chevL') + '</button></div>';
  };
  const prevSet = E.settingsAction;
  E.settingsAction = async function (act) {
    if (act === 'watch-setup') { A.closeSheet(); setTimeout(setupSheet, 280); return true; }
    return prevSet ? prevSet.apply(this, arguments) : false;
  };
  new MutationObserver(drawRing).observe(document.getElementById('view'), { childList: true });
  window.addEventListener('hashchange', fromHash);
  fromHash();
  if (HK) {
    document.addEventListener('visibilitychange', () => { if (!document.hidden) hkSync(false); });
    setTimeout(() => hkSync(false), 1500);
  }
  E._healthSync = hkSync; // للاختبار
  A.render();
})();
