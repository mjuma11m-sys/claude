// DW-078: التحقق بخطوتين للحساب (رمز من 6 أرقام من تطبيق تحقق: «كلمات السر» بالآيفون، Google Authenticator…)
// التفعيل من صفحة «حسابك»، وبعدها أي دخول يطلب الرمز قبل ما تنفتح البيانات أو تتزامن
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, I, h } = A;
  const on = () => !!(S.status && S.status.signedIn && S.mfaFactors);
  const smsOn = () => !!((window.HAYATI_CONFIG || {}).MFA_SMS && S.mfaEnrollPhone);   // DW-085: مخفي لين يتربط Twilio

  // ---------- بصفحة «حسابك» ----------
  const box = () => '<div class="group-title">' + I('key') + 'التحقق بخطوتين</div><div class="card" id="mfaBox"><p class="small muted" style="margin:0">…</p></div>';
  async function fill() {
    const el = document.getElementById('mfaBox');
    if (!el) return;
    let all;
    try { all = S.mfaAll ? await S.mfaAll() : { totp: await S.mfaFactors(), phone: [] }; } catch (e) { el.innerHTML = '<p class="small muted" style="margin:0">ما قدرنا نشيّك الحين · جرّب بعدين</p>'; return; }
    const f = all.totp[0] || all.phone[0];
    el.innerHTML = f
      ? '<p style="margin:0 0 10px"><b>مفعّل ✓</b> <span class="small muted">' + (all.totp.length ? 'بتطبيق التحقق' : 'برسالة SMS') + '</span></p><p class="small muted" style="margin:0 0 12px">أي دخول جديد لحسابك يطلب الرمز.</p>' +
        '<button class="btn ghost block" data-set="mfa-off" data-id="' + h(f.id) + '">وقّف التحقق بخطوتين</button>'
      : '<p class="small muted" style="margin:0 0 12px">لو أحد عرف كلمة سرك، ما يقدر يدخل بدون رمز من جوالك.</p>' +
        '<button class="btn primary block" data-set="mfa-on">' + I('key') + 'فعّله بتطبيق التحقق</button>' +
        (smsOn() ? '<button class="btn ghost block" style="margin-top:8px" data-set="mfa-sms-on">💬 أو برسالة SMS</button>' : '');
  }
  const prevExtra = E.accountExtra;
  E.accountExtra = (...a) => (prevExtra ? prevExtra(...a) : '') + (on() ? (setTimeout(fill, 0), box()) : '');

  const prevAct = E.settingsAction;
  E.settingsAction = async (act, root, b) => {
    if (act === 'mfa-on') { enroll(); return true; }
    if (act === 'mfa-sms-on' && smsOn()) { enrollSms(); return true; }
    if (act === 'mfa-off') {
      if (!(await A.ask('توقف التحقق بخطوتين؟ الدخول يصير بكلمة السر بس.', 'وقّفه'))) return true;
      try { await S.mfaDisable(b.dataset.id); A.toast('توقّف'); fill(); } catch (e) { A.toast(e.message); }
      return true;
    }
    return prevAct ? prevAct(act, root, b) : false;
  };

  // ---------- التفعيل: باركود ← رمز ← تأكيد ----------
  async function enroll() {
    let f;
    try { f = await S.mfaEnroll(); } catch (e) { A.toast(e.message); return; }
    A.closeSheet();
    setTimeout(() => A.openSheet({
      title: 'فعّل التحقق بخطوتين', saveLabel: 'تأكيد',
      body: '<ol class="steps"><li>افتح تطبيق تحقق: <b>كلمات السر</b> بالآيفون (رموز التحقق)، أو <b>Google Authenticator</b>.</li>' +
        '<li>صوّر الباركود، أو انسخ المفتاح تحت.</li><li>اكتب الرمز اللي يطلع (6 أرقام).</li></ol>' +
        '<div style="background:#fff;border-radius:16px;padding:12px;width:220px;margin:10px auto"><img id="mfaQr" alt="باركود التحقق" style="width:196px;height:196px;display:block"></div>' +
        '<div class="copy-box"><code style="direction:ltr;word-break:break-all">' + h(f.secret) + '</code><button type="button" data-copy="' + h(f.secret) + '">' + I('copy') + 'نسخ</button></div>' +
        '<div class="field" style="margin-top:12px"><label>الرمز</label><input name="mfa_code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456" style="direction:ltr;text-align:center;font-size:22px;letter-spacing:6px"></div>',
      mount(root) {
        root.querySelector('#mfaQr').src = f.qr;
        root.querySelector('[data-copy]').onclick = (e) => { try { navigator.clipboard.writeText(e.currentTarget.dataset.copy); A.toast('انتسخ ✓'); } catch (x) { /* تجاهل */ } };
      },
      async onSave(root) {
        const code = A.val(root, 'mfa_code');
        if (!/^\d{6}$/.test(code)) throw new Error('اكتب الرمز (6 أرقام)');
        await S.mfaVerify(f.id, code);
        A.toast('انفعّل ✓ الدخول الجاي يطلب الرمز');
      },
    }), 280);
  }

  // ---------- التفعيل برسالة SMS: الرقم ← الرمز ----------
  const codeField = '<div class="field" style="margin-top:12px"><label>الرمز</label><input name="mfa_code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456" style="direction:ltr;text-align:center;font-size:22px;letter-spacing:6px"></div>';
  function enrollSms() {
    A.closeSheet();
    setTimeout(() => A.openSheet({
      title: 'التحقق برسالة SMS', saveLabel: 'أرسل الرمز',
      body: '<p class="small muted" style="margin:0 4px 12px">نرسل رمز لجوالك كل ما تدخل حسابك من جهاز جديد. تطبيق التحقق أأمن، بس هذا أسهل.</p>' +
        '<div class="field"><label>رقم الجوال</label><input name="mfa_phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="3xxxxxxx" style="direction:ltr;text-align:left"></div>',
      async onSave(root) {
        await S.mfaEnrollPhone(A.val(root, 'mfa_phone'));
        setTimeout(confirmSms, 280);
      },
    }), 280);
  }
  function confirmSms() {
    A.openSheet({
      title: 'اكتب الرمز', saveLabel: 'تأكيد',
      body: '<p class="small muted" style="margin:0 4px 6px">أرسلنا رمز من 6 أرقام لجوالك.</p>' + codeField,
      async onSave(root) {
        const code = A.val(root, 'mfa_code');
        if (!/^\d{6}$/.test(code)) throw new Error('اكتب الرمز (6 أرقام)');
        await S.mfaVerifySms(code);
        A.toast('انفعّل ✓ الدخول الجاي يطلب رمز SMS');
      },
    });
  }

  // ---------- الدخول: الرمز قبل البيانات ----------
  let asking = false;
  function askCode() {
    if (asking) return;
    asking = true;
    let done = false;
    A.openSheet({
      title: 'رمز التحقق', saveLabel: 'دخول',
      body: '<p class="small muted" id="mfaHint" style="margin:0 4px 12px">حسابك عليه تحقق بخطوتين. اكتب الرمز من تطبيق التحقق.</p>' +
        '<div class="field"><input name="mfa_code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456" style="direction:ltr;text-align:center;font-size:24px;letter-spacing:8px"></div>',
      async onSave(root) {
        const code = A.val(root, 'mfa_code');
        if (!/^\d{6}$/.test(code)) throw new Error('اكتب الرمز (6 أرقام)');
        await S.mfaLogin(code);
        done = true; asking = false;
        A.toast('أهلاً 👋');
      },
    });
    // SMS: نرسل الرمز أول ما تنفتح النافذة
    if (S.mfaStart) S.mfaStart().then((r) => {
      const el = document.getElementById('mfaHint');
      if (el && r && r.type === 'sms') el.textContent = 'أرسلنا رمز SMS للرقم اللي ينتهي بـ ' + r.phone + '. اكتبه هني.';
    }).catch((e) => { const el = document.getElementById('mfaHint'); if (el) el.textContent = e.message; });
    // سكّر النافذة بدون رمز ← نطلع من الحساب (ما يبقى نص دخول)
    document.getElementById('sheet').addEventListener('close', () => { asking = false; if (!done && S.status.mfaNeeded) S.mfaCancel(); }, { once: true });
  }
  S.subscribe(() => { if (S.status.mfaNeeded) setTimeout(askCode, 300); });
  if (S.status && S.status.mfaNeeded) setTimeout(askCode, 300);
  E._askMfa = askCode; // للاختبار
})();
