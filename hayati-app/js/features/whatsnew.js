// «جديد بحياتي ✨» (DW-019): نافذة مرة وحدة بعد كل تحديث، للي كان يستخدم التطبيق قبل بس
// المستخدم الجديد ما يشوفها (يشوف الترحيب)، وما تطلع فوق قفل الرمز ولا فوق نافذة مفتوحة
(function () {
  'use strict';

  const A = window.App;
  if (!A) return;
  const { st, h } = A;
  const KEY = 'hayati-seen-version';

  // الجديد لكل نسخة (نصوص قصيرة وصادقة: شي يشتغل اليوم بس)
  const NEWS = {
    v22: [
      ['🧰', '«كل شي بحياتي»', 'زر فوق فيه كل الأدوات، وترتّب شاشة «اليوم» على كيفك'],
      ['💰', 'يوم الراتب', 'الشهر يمشي من راتب لراتب، مع «راتبك وين راح؟»'],
      ['🕌', '«عبادتي»', 'التاريخ الهجري، الصلاة الجاية، المسبحة، والمناسبات'],
      ['⚡', 'أسرع', 'التطبيق صار يفتح أسرع'],
    ],
  };

  const lsGet = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const lsSet = (v) => { try { localStorage.setItem(KEY, v); } catch (e) { /* تجاهل */ } };
  // مستخدم قديم = خلّص الترحيب أو عنده بيانات
  const isExisting = () => !!(st.settings && st.settings.onboarded) || (st.transactions || []).length > 0 || (st.tasks || []).length > 0 || (st.courses || []).length > 0;

  function show(items) {
    A.openSheet({
      title: 'جديد بحياتي ✨',
      cancelLabel: 'تمام',
      body: '<p class="small muted" style="margin:0 4px 12px">تحدّث التطبيق (' + h(A.APP_VERSION) + '). هذا الجديد:</p><div class="card flush"><ul class="list">' +
        items.map(([ic, t, d]) => '<li class="row news-item" style="cursor:default"><div class="ico" style="font-size:22px;background:none">' + ic + '</div><div class="main"><div class="title"><span class="t">' + h(t) + '</span></div><div class="sub">' + h(d) + '</div></div></li>').join('') +
        '</ul></div>',
    });
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();   // بدون إطار التركيز على «تمام»
    lsSet(A.APP_VERSION);   // انشافت = ما ترجع، حتى لو سكّرها بأي طريقة
  }

  function check() {
    const seen = lsGet(), v = A.APP_VERSION;
    if (seen === v) return true;
    if (!seen && !isExisting()) { lsSet(v); return true; }   // جديد: ما نعرض له
    const items = NEWS[v];
    if (!items) { lsSet(v); return true; }
    if (document.body.classList.contains('locked') || document.querySelector('#sheet[open]')) return false;   // نستنى
    show(items);
    return true;
  }

  // بعد ما تحمل البيانات وتنرسم أول شاشة؛ نعيد المحاولة لين يفتح القفل أو تنسكر النافذة
  function start() {
    let tries = 0;
    const tick = () => { if (!check() && ++tries < 600) setTimeout(tick, 1000); };
    setTimeout(tick, 1200);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();

  window.Extras = window.Extras || {};
  window.Extras.WhatsNew = { NEWS, KEY, check };
})();
