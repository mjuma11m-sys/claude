// «أول دقيقة» (DW-024 · بند 11): بعد الترحيب مباشرة خطوة وحدة توصل لأول رقم مفيد.
// 1) ما عنده ولا عملية ← «الصق آخر رسالة بنك» أو «أضف أول مصروف» (أو «بعدين» وما ترجع)
// 2) أول عملية تنضاف ← بطاقة مرة وحدة: كم صرف هالشهر وكم من ميزانيته. الحالة بالجهاز بس (localStorage).
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { st, I, tint } = A;
  const wrap = (name, fn) => { const prev = E[name]; E[name] = (...a) => fn(prev ? prev : () => '', ...a); };
  const KEY = 'hayati-first-step';   // فاضي ← step ← done
  const get = () => { try { return localStorage.getItem(KEY); } catch (e) { return 'done'; } };
  const put = (v) => { try { localStorage.setItem(KEY, v); } catch (e) { /* بدون تخزين: تختفي مع الجلسة */ } };

  function card() {
    const s = st.settings || {}, state = get();
    if (!s.onboarded || state === 'done') return '';
    if (!st.transactions.length) {
      if (state !== 'step') put('step');
      return '<div class="card ob" id="fmCard"><b class="ob-title">⚡ أول دقيقة</b>' +
        '<p class="small muted" style="margin:2px 0 12px">خطوة وحدة وتشوف وين رايحة فلوسك.</p>' +
        '<div class="actions" style="margin:0"><button class="action" data-action="paste-sms"><div class="ico" style="' + tint('#0d9488') + '">' + I('message') + '</div>الصق آخر رسالة بنك</button>' +
        '<button class="action" data-action="add-tx"><div class="ico" style="' + tint('#1A8A8F') + '">' + I('plus') + '</div>أضف أول مصروف</button></div>' +
        '<button class="btn ghost block" style="margin-top:10px" data-action="fm-later">بعدين</button></div>';
    }
    if (state !== 'step') return '';   // مستخدم قديم عنده عمليات: ما نطلّع له شي
    const spent = A.sums(A.txInMonth(A.monthKey(new Date()))).exp, budget = Number(s.budget) || 0;
    const pct = budget ? Math.round((spent / budget) * 100) : 0;
    return '<div class="card ob" id="fmCard"><b class="ob-title">🎉 أول رقم لك</b>' +
      '<p style="margin:6px 0 4px">هالشهر صرفت <b class="num">' + A.money(spent) + '</b>' + (budget ? '، يعني <b class="num">' + pct + '%</b> من ميزانيتك.' : '.') + '</p>' +
      '<p class="small muted" style="margin:0 0 12px">' + (budget ? 'كل ما تضيف رسالة، الرقم يتحدّث بروحه.' : 'حدد ميزانيتك ونقولك كم باقي لك.') + '</p>' +
      '<div class="btn-row">' + (budget ? '' : '<button class="btn primary" data-action="budget">حدد الميزانية</button>') +
      '<button class="btn ' + (budget ? 'primary' : 'ghost') + '" data-action="fm-done">تمام</button></div></div>';
  }

  wrap('todayTop', (prev) => prev() + card());
  wrap('action', (prev, name, el, e) => {
    if (name === 'fm-later' || name === 'fm-done') { put('done'); A.render(); return; }
    if (name === 'budget' && get() === 'step' && st.transactions.length) put('done');
    return prev(name, el, e);
  });
  E.FirstMinute = { KEY, card };
})();
