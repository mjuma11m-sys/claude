// DW-100: أمان أكثر — (1) «فحص الأمان» بالإعدادات: وين أنت وشلون تقوّيه بضغطة، (2) شاشة الخصوصية للكل:
// لما تطلع من التطبيق تتغطى الشاشة عشان أرقامك ما تبين بمبدّل التطبيقات (قفل التطبيق يسويها أصلاً لو مفعّل).
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, h } = A;
  const COVER = 'hayati-cover';
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* تجاهل */ } };
  const lockOn = () => !!get('hayati-lock');
  const coverOn = () => get(COVER) !== 'off';

  // ---------- شاشة الخصوصية ----------
  const css = document.createElement('style');
  css.textContent = 'body.covered > *{visibility:hidden}body.covered{background:#0E3B43}body.covered::after{content:"حياتي";position:fixed;inset:0;display:grid;place-items:center;color:#E8DCC4;font:700 34px/1 inherit;visibility:visible}';
  document.head.appendChild(css);
  const cover = (on) => { if (!lockOn() && coverOn()) document.body.classList.toggle('covered', on); else document.body.classList.remove('covered'); };
  document.addEventListener('visibilitychange', () => cover(document.hidden));
  window.addEventListener('pagehide', () => cover(true));
  window.addEventListener('pageshow', () => cover(false));
  try { const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App; if (App && App.addListener) App.addListener('appStateChange', (s) => cover(!s.isActive)); } catch (e) { /* تجاهل */ }

  // ---------- فحص الأمان ----------
  async function checks() {
    const out = [];
    out.push({ ok: lockOn(), icon: '🔒', title: 'قفل التطبيق', on: 'رمز (وبصمة لو مفعّلة) قبل ما ينفتح', off: 'أي أحد يمسك جوالك مفتوح يشوف فلوسك', fix: 'lock-set', fixL: 'فعّل القفل' });
    out.push({ ok: lockOn() || coverOn(), icon: '🫥', title: 'إخفاء الشاشة لما تطلع', on: 'أرقامك ما تبين بمبدّل التطبيقات', off: 'أرقامك تبين بمبدّل التطبيقات', fix: 'cover-on', fixL: 'شغّله' });
    if (S.status && S.status.signedIn) {
      let mfa = null, others = null;
      try { const all = S.mfaAll ? await S.mfaAll() : { totp: S.mfaFactors ? await S.mfaFactors() : [], phone: [] }; mfa = !!((all.totp || []).length || (all.phone || []).length); } catch (e) { mfa = null; }
      try { if (S.mySessions) others = (await S.mySessions()).filter((x) => !x.is_current).length; } catch (e) { others = null; }
      if (mfa != null) out.push({ ok: mfa, icon: '🛡️', title: 'التحقق بخطوتين', on: 'حتى لو أحد عرف كلمة السر ما يقدر يدخل', off: 'كلمة السر بروحها تفتح حسابك', fix: 'account', fixL: 'فعّله' });
      if (others != null) out.push({ ok: others === 0, warn: others > 0, icon: '📱', title: 'الأجهزة المسجّلة', on: 'حسابك مفتوح على هالجهاز بس', off: 'أجهزة ثانية داخلة على حسابك: ' + others + ' · تعرفهم؟', fix: 'account', fixL: 'شوفهم' });
    } else {
      out.push({ ok: true, icon: '📴', title: 'بياناتك على جهازك بس', on: 'ما فيه حساب ولا مزامنة، فما فيه شي ينسرق من السيرفر. سوّ نسخة احتياطية مشفّرة عشان ما تضيع', off: '' });
    }
    out.push({ ok: !!(A.lastBackup && A.lastBackup()), icon: '💾', title: 'نسخة احتياطية مشفّرة', on: 'عندك نسخة بكلمة سر', off: 'لو ضاع جوالك تضيع بياناتك اللي مو بحسابك', fix: 'secure-backup', fixL: 'سوّ نسخة', soft: true });
    return out;
  }

  async function sheet() {
    A.openSheet({ title: '🛡️ فحص الأمان', cancelLabel: 'تم', body: '<p class="small muted" style="margin:0 4px">نفحص…</p>' });
    const list = await checks();
    const root = document.getElementById('sheetBody'); if (!root) return;
    const must = list.filter((x) => !x.soft), score = must.filter((x) => x.ok).length;
    root.innerHTML = '<div class="hero dark" style="text-align:center"><div class="big"><bdi>' + score + ' / ' + must.length + '</bdi></div><div class="meta"><span>' + (score === must.length ? 'أمانك ممتاز 💪' : 'فيه شي تقدر تقوّيه 👇') + '</span></div></div>' +
      '<div class="card flush" style="margin-top:12px"><ul class="list">' + list.map((x) => '<li class="row" style="cursor:default"><div class="ico">' + x.icon + '</div><div class="main"><div class="title"><span>' + h(x.title) + '</span> ' + (x.ok ? '✅' : x.warn ? '⚠️' : x.soft ? '💡' : '❌') + '</div><div class="sub" style="white-space:normal">' + h(x.ok ? x.on : x.off) + '</div></div>' +
        (!x.ok && x.fix ? '<button type="button" class="btn ' + (x.soft ? 'ghost' : 'primary') + '" data-fix="' + x.fix + '">' + h(x.fixL) + '</button>' : '') + '</li>').join('') + '</ul></div>' +
      '<div class="card"><b>🧠 نصايح سريعة</b><ul class="small" style="margin:8px 0 0;padding-inline-start:18px;line-height:1.8"><li>لا تعطي أحد رمز التحقق اللي يوصلك، حتى لو قال إنه من «حياتي» أو البنك.</li><li>كلمة سر طويلة ومختلفة عن باقي حساباتك.</li><li>«حياتي» ما يطلب منك بيانات بطاقتك أبداً.</li></ul></div>';
    root.querySelectorAll('[data-fix]').forEach((b) => { b.onclick = () => fix(b.dataset.fix); });
  }
  function fix(act) {
    if (act === 'cover-on') { set(COVER, null); A.toast('شاشة الخصوصية شغّالة ✓'); sheet(); return; }
    A.closeSheet();
    setTimeout(() => {
      const sb = document.getElementById('settingsBtn'); if (sb) sb.click();
      setTimeout(() => {
        if (act === 'account') { const a = document.querySelector('#sheetBody [data-set="account"]'); if (a) a.click(); return; }
        if (E.settingsAction) E.settingsAction(act, document.getElementById('sheetBody'), null);
      }, 350);
    }, 300);
  }

  // بالإعدادات: «فحص الأمان» + مفتاح شاشة الخصوصية (لو القفل مو مفعّل)
  const prevExtra = E.settingsExtra;
  E.settingsExtra = function () {
    return (prevExtra ? prevExtra.apply(this, arguments) : '') + '<div class="group-title">🛡️ الأمان</div><div class="menu"><button data-set="sec-check"><div class="ico" style="' + A.tint('#2F9E7A') + '">🛡️</div><div style="flex:1;min-width:0"><b>فحص الأمان</b><small>شوف وين أنت وقوّيه بضغطة</small></div>' + A.I('chevL') + '</button>' +
      (lockOn() ? '' : '<button data-set="cover-toggle"><div class="ico" style="' + A.tint('#13636B') + '">🫥</div><div style="flex:1;min-width:0"><b>إخفاء الشاشة لما تطلع</b><small>' + (coverOn() ? 'شغّال ✓' : 'طافي') + '</small></div></button>') + '</div>';
  };
  const prevSet = E.settingsAction;
  E.settingsAction = async function (act) {
    if (act === 'sec-check') { A.closeSheet(); setTimeout(sheet, 300); return true; }
    if (act === 'cover-toggle') { set(COVER, coverOn() ? 'off' : null); A.toast(coverOn() ? 'شاشة الخصوصية شغّالة ✓' : 'شاشة الخصوصية طافية'); A.closeSheet(); return true; }
    return prevSet ? prevSet.apply(this, arguments) : false;
  };
  E.Secure = { checks, sheet, cover };
})();
