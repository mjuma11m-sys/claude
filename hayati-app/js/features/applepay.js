// DW-092: «Apple Pay يسجّل لحاله» — أتمتة بتطبيق «الاختصارات» (Shortcuts) بالآيفون:
//   لما تدفع بـ Apple Pay ← الاختصار يفتح bh.hayati.app://pay?amount=…&merchant=…&card=…
//   ← حياتي يطلع العملية جاهزة وتأكدها بضغطة (ما ننحفظ شي بدون تأكيدك: أي موقع يقدر يفتح الرابط).
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, st, I, h } = A;
  const P = window.SmsParser;

  // المبلغ ممكن يجي «BHD 3.750» أو «3.750 د.ب.‏» أو «3,750» حسب لغة الجوال
  function amountOf(v) {
    const t = String(v || '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/٫/g, '.').replace(/٬/g, ',');
    const m = /\d[\d.,]*\d|\d/.exec(t);
    if (!m) return null;
    let s = m[0];
    if (/^\d+,\d{1,3}$/.test(s)) s = s.replace(',', '.');          // «3,750» = فاصلة عشرية (الدينار 3 خانات)
    else s = s.replace(/,/g, '');                                     // «1,250.000» = فاصلة آلاف
    const n = Number(s);
    return n > 0 && n < 100000 ? Math.round(n * 1000) / 1000 : null;
  }
  function categoryOf(merchant) {
    try { const r = P && P.quick ? P.quick('1 ' + merchant) : null; if (r && r.category) return r.category; } catch (e) { /* تجاهل */ }
    return 'أخرى';
  }

  function fromShortcut(params) {
    const amount = amountOf(params.amount);
    const merchant = String(params.merchant || '').trim().slice(0, 60) || 'Apple Pay';
    const card = String(params.card || '').trim().slice(0, 40);
    if (!amount) { A.toast('ما وصلنا مبلغ من الاختصار · شيّك خطوة «المبلغ»'); return false; }
    // نفس العملية خلال دقيقتين = تكرار (الاختصار انفتح مرتين)
    const dup = (st.transactions || []).find((t) => t.source === 'applepay' && Math.abs(t.amount - amount) < 0.0005 && t.merchant === merchant && Date.now() - new Date(t.occurred_at).getTime() < 120000);
    if (dup) { A.toast('انسجّلت قبل ✓'); return true; }
    const category = categoryOf(merchant);
    A.openSheet({
      title: '💳 دفعت بـ Apple Pay',
      saveLabel: 'سجّل',
      body: '<div class="card" style="text-align:center"><div class="small muted">' + h(merchant) + (card ? ' · ' + h(card) : '') + '</div><b class="num" style="font-size:34px"><bdi>' + A.fmt(amount) + '</bdi></b></div>' +
        '<div class="field"><label>المحل</label><input name="ap_m" value="' + h(merchant) + '"></div>' +
        '<div class="field"><label>التصنيف</label><input name="ap_c" value="' + h(category) + '"></div>' +
        '<p class="small muted" style="margin:4px">من اختصار «Apple Pay ← حياتي». تقدر تعدّلها بعدين.</p>',
      onSave(root) {
        S.upsert('transactions', { kind: 'expense', amount, merchant: A.val(root, 'ap_m') || merchant, category: A.val(root, 'ap_c') || category, occurred_at: new Date().toISOString(), source: 'applepay', note: card || null });
        A.toast('انسجّل ✓');
      },
    });
    return true;
  }
  E.payFromShortcut = fromShortcut;
  E._amountOf = amountOf; // للاختبار

  // ---------- الشرح بالإعدادات (آيفون بس) ----------
  const ios = () => { try { const C = window.Capacitor; return !!(C && C.getPlatform && C.getPlatform() === 'ios'); } catch (e) { return false; } };
  const URL_TPL = 'bh.hayati.app://pay?amount=[المبلغ]&merchant=[التاجر]&card=[البطاقة]';
  function guide() {
    A.openSheet({
      title: '💳 Apple Pay يسجّل لحاله',
      cancelLabel: 'تم',
      body: '<p class="small muted" style="margin:0 4px 12px">مرة وحدة بس (دقيقتين): بعدها كل ما تدفع بـ Apple Pay، حياتي يطلع لك العملية جاهزة وتأكدها بضغطة.</p>' +
        '<ol class="steps">' +
        '<li>افتح تطبيق <b>الاختصارات</b> ← <b>الأتمتة</b> ← <b>＋</b> ← <b>المعاملة</b> (Transaction).</li>' +
        '<li>اختار بطاقاتك، و<b>شغّل فوراً</b> (Run Immediately).</li>' +
        '<li>أضف إجراء <b>فتح عناوين URL</b> (Open URLs)، والصق الرابط تحت.</li>' +
        '<li>بدّل <b>[المبلغ]</b> و<b>[التاجر]</b> و<b>[البطاقة]</b> بالمتغيرات من «مدخل الاختصار»: Amount، Merchant، Card.</li>' +
        '<li>احفظ. جرّب تدفع شي صغير ✓</li></ol>' +
        '<div class="copy-box"><code style="direction:ltr;word-break:break-all">' + h(URL_TPL) + '</code><button type="button" data-copy="' + h(URL_TPL) + '">' + I('copy') + 'نسخ</button></div>' +
        '<p class="small muted" style="margin:10px 4px 0">ما نقرا أي شي من Apple Pay بروحنا: الاختصار هو اللي يرسل المبلغ واسم المحل، وما ينحفظ شي بدون تأكيدك.</p>',
      mount(root) { const b = root.querySelector('[data-copy]'); if (b) b.onclick = () => { try { navigator.clipboard.writeText(URL_TPL); A.toast('انتسخ ✓'); } catch (e) { /* تجاهل */ } }; },
    });
  }
  const prevExtra = E.settingsExtra;
  E.settingsExtra = function () {
    return (prevExtra ? prevExtra.apply(this, arguments) : '') + (ios() || window.__forceApplePayGuide ? '<div class="group-title">💳 Apple Pay</div><div class="menu"><button data-set="applepay"><div class="ico" style="' + A.tint('#0B2328') + '">💳</div><div style="flex:1;min-width:0"><b>Apple Pay يسجّل لحاله</b><small>بعد كل دفعة، العملية تطلع جاهزة</small></div>' + I('chevL') + '</button></div>' : '');
  };
  const prevSet = E.settingsAction;
  E.settingsAction = async function (act) {
    if (act === 'applepay') { A.closeSheet(); setTimeout(guide, 280); return true; }
    return prevSet ? prevSet.apply(this, arguments) : false;
  };
})();
