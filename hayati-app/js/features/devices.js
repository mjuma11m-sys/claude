// DW-090: «الأجهزة المسجّلة» بصفحة «حسابك»: وين حسابك مفتوح، ومتى آخر مرة، وتطلّع أي جهاز ما تعرفه
// (اقتراح المالك). الجهاز الحالي ما ينطلع من هني؛ «تسجيل خروج» موجود فوق.
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, I, h } = A;
  const on = () => !!(S.status && S.status.signedIn && S.mySessions);

  // اسم الجهاز من user agent (تقريبي)
  function device(ua) {
    ua = String(ua || '');
    const os = /iPad/.test(ua) ? ['📱', 'آيباد'] : /iPhone/.test(ua) ? ['📱', 'آيفون'] : /Android/.test(ua) ? ['📱', 'أندرويد']
      : /Macintosh|Mac OS X/.test(ua) ? ['💻', 'ماك'] : /Windows/.test(ua) ? ['💻', 'ويندوز'] : /Linux/.test(ua) ? ['💻', 'لينكس'] : ['🔑', 'جهاز'];
    const app = /Hayati|Capacitor|wv\)|; wv/.test(ua) || (/iPhone|iPad/.test(ua) && !/Safari\//.test(ua));
    const br = app ? 'تطبيق حياتي' : /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'متصفح';
    return { icon: os[0], name: os[1] + ' · ' + br };
  }
  function ago(iso) {
    const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    if (m < 2) return 'الحين';
    if (m < 60) return 'قبل ' + m + ' دقيقة';
    const hr = Math.round(m / 60);
    if (hr < 24) return 'قبل ' + hr + ' ساعة';
    const d = Math.round(hr / 24);
    return d === 1 ? 'أمس' : 'قبل ' + d + ' يوم';
  }

  const box = () => '<div class="group-title">' + I('key') + 'الأجهزة المسجّلة بحسابك</div><div class="card" id="devBox"><p class="small muted" style="margin:0">…</p></div>';
  async function fill() {
    const el = document.getElementById('devBox');
    if (!el) return;
    let list;
    try { list = await S.mySessions(); } catch (e) { el.innerHTML = '<p class="small muted" style="margin:0">' + h(e.message) + '</p>'; return; }
    if (!list.length) { el.innerHTML = '<p class="small muted" style="margin:0">ما فيه أجهزة</p>'; return; }
    const others = list.filter((s) => !s.is_current).length;
    el.innerHTML = '<ul class="list" style="margin:0 0 6px">' + list.map((s) => {
      const d = device(s.user_agent);
      return '<li class="row"><div style="font-size:24px">' + d.icon + '</div><div class="main"><div class="title"><b>' + h(d.name) + '</b>' + (s.is_current ? ' <span class="tag" style="margin-inline-start:6px">هذا الجهاز</span>' : '') + '</div>' +
        '<div class="sub">آخر استخدام ' + h(ago(s.last_active)) + (s.aal === 'aal2' ? ' · 🛡️ بخطوتين' : '') + '</div></div>' +
        (s.is_current ? '' : '<button class="btn ghost" data-set="dev-out" data-id="' + h(s.id) + '">اطلع</button>') + '</li>';
    }).join('') + '</ul>' +
      '<p class="small muted" style="margin:0 0 10px">ما تعرف جهاز؟ طلّعه، وغيّر كلمة السر، وفعّل التحقق بخطوتين.</p>' +
      (others ? '<button class="btn danger block" data-set="dev-out-all">اطلع من كل الأجهزة الثانية (' + others + ')</button>' : '');
  }

  const prevExtra = E.accountExtra;
  E.accountExtra = (...a) => (prevExtra ? prevExtra(...a) : '') + (on() ? (setTimeout(fill, 0), box()) : '');

  const prevAct = E.settingsAction;
  E.settingsAction = async (act, root, b) => {
    if (act === 'dev-out') {
      if (!(await A.ask('تطلّع هالجهاز من حسابك؟ بيحتاج يسجّل دخول من جديد.', 'اطلع'))) return true;
      try { await S.revokeSession(b.dataset.id); A.toast('انطلع ✓'); fill(); } catch (e) { A.toast(e.message); }
      return true;
    }
    if (act === 'dev-out-all') {
      if (!(await A.ask('تطلّع كل الأجهزة الثانية من حسابك؟ هذا الجهاز يظل داخل.', 'اطلعهم'))) return true;
      try { await S.signOutOthers(); A.toast('انطلعت كل الأجهزة الثانية ✓'); fill(); } catch (e) { A.toast(e.message); }
      return true;
    }
    return prevAct ? prevAct(act, root, b) : false;
  };
  E._device = device; // للاختبار
})();
