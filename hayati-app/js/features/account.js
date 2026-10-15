// «حسابك» (DW-035): بطاقة باليوم تدعو للحساب لما يكون عندك بيانات تستاهل، عشان توصل لكل أجهزتك.
// تطلع بس لو Supabase مربوط وأنت مو مسجّل، وعندك 10 سجلات أو أكثر. «بعدين» يخفيها 30 يوم.
(function () {
  'use strict';

  const A = window.App, E = window.Extras, S = window.Store;
  if (!A || !E || !S) return;
  const { I } = A;
  const KEY = 'hayati-account-later';
  const wrap = (name, fn) => { const prev = E[name]; E[name] = (...a) => fn(prev ? prev : () => '', ...a); };

  const later = () => { try { return Number(localStorage.getItem(KEY)) || 0; } catch (e) { return 0; } };
  function due() {
    const s = S.status;
    if (!s.configured || s.signedIn || s.mode === 'artifact') return false;
    if (Date.now() - later() < 30 * 864e5) return false;
    return (S.localCount ? S.localCount() : 0) >= 10;
  }
  function card() {
    if (!due()) return '';
    return '<div class="card" id="accNudge" style="margin-top:12px;display:flex;gap:12px;align-items:flex-start">' +
      '<div class="ico" style="flex:none">' + I('user') + '</div><div style="flex:1;min-width:0"><b>بياناتك على هالجوال بس</b>' +
      '<p class="small muted" style="margin:4px 0 10px">سوّ حساب وتوصل لك نفس البيانات على أي جهاز ثاني، وما تضيع لو تبدّل الجوال.</p>' +
      '<div class="btn-row"><button class="btn primary" data-action="account">' + I('user') + 'سجّل أو أنشئ حساب</button><button class="btn ghost" data-action="account-later">بعدين</button></div></div></div>';
  }

  wrap('todayTop', (prev) => prev() + card());
  wrap('action', (prev, name, el, e) => {
    if (name === 'account') { A.accountSheet(); return; }
    if (name === 'account-later') { try { localStorage.setItem(KEY, String(Date.now())); } catch (er) { /* تجاهل */ } A.render(); return; }
    return prev(name, el, e);
  });
  E.Account = { due, card, KEY };
})();
