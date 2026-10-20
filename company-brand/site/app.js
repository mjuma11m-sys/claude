// نماذج موقع ودقة → Supabase (public.wadqa_submit). المفتاح عام (anon)، والجدول ما ينقرا من المتصفح.
(() => {
  const C = window.WADQA;
  const MSG = {
    ar: { ok: 'وصلت، شكراً. بنرد عليك على إيميلك.', okw: 'سجّلناك. بنراسلك لما يجهز، ومرة وحدة بس.', consent_required: 'لازم توافق على حفظ بياناتك عشان نقدر نرد.', invalid: 'تأكد من الإيميل، والرسالة أقل من 2000 حرف.', too_many: 'أرسلت أكثر من مرة. جرّب بعد ساعة.', busy: 'فيه ضغط حالياً. جرّب بعد دقائق.', net: 'ما قدرنا نوصل. تأكد من الإنترنت وجرّب مرة ثانية.', sending: 'جاري الإرسال…' },
    en: { ok: 'Received, thank you. We will reply to your email.', okw: 'You are on the list. We will email you once, when it is ready.', consent_required: 'Please agree to us storing your details so we can reply.', invalid: 'Check your email address, and keep the message under 2,000 characters.', too_many: 'You have sent this several times. Please try again in an hour.', busy: 'We are busy right now. Please try again in a few minutes.', net: 'We could not connect. Check your internet and try again.', sending: 'Sending…' },
  };
  document.querySelectorAll('form.lead-form').forEach((f) => {
    const st = f.querySelector('.status'), btn = f.querySelector('button[type="submit"]');
    const lang = document.documentElement.lang === 'en' ? 'en' : 'ar', M = MSG[lang];
    const say = (k, cls) => { st.textContent = M[k] || M.net; st.className = 'status ' + (cls || ''); };
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (f.querySelector('.hp input').value) { say(f.dataset.kind === 'waitlist' ? 'okw' : 'ok', 'ok'); return; } // فخ السبام
      const v = (n) => (f.elements[n] ? f.elements[n].value : null);
      const consent = f.elements.consent.checked;
      if (!consent) { say('consent_required', 'err'); return; }
      btn.disabled = true; say('sending');
      try {
        const r = await fetch(C.url + '/rest/v1/rpc/wadqa_submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: C.key, Authorization: 'Bearer ' + C.key },
          body: JSON.stringify({ p_kind: f.dataset.kind, p_product: f.dataset.product, p_email: v('email'), p_name: v('name'), p_message: v('message'), p_consent: consent, p_lang: lang }),
        });
        const res = r.ok ? await r.json() : 'net';
        if (res === 'ok') { say(f.dataset.kind === 'waitlist' ? 'okw' : 'ok', 'ok'); f.reset(); } else say(res, 'err');
      } catch (_) { say('net', 'err'); }
      btn.disabled = false;
    });
  });
})();
