// DW-059: عملة المستخدم — يختارها من «ملفك»، والتطبيق كله يعرض فيها (الرمز وعدد الخانات)
// المبالغ المسجلة ما تتحول لما تغيّر العملة؛ التحويل بس للرسائل اللي بعملة ثانية (أسعار تقريبية مربوطة بالدولار)
(function (global) {
  'use strict';

  // [الرمز بالعربي، بالإنقليزي، الخانات، كم وحدة بالدولار (تقريبي)، الاسم]
  const LIST = {
    BHD: ['د.ب', 'BHD', 3, 0.376, 'دينار بحريني'],
    SAR: ['ر.س', 'SAR', 2, 3.75, 'ريال سعودي'],
    AED: ['د.إ', 'AED', 2, 3.6725, 'درهم إماراتي'],
    KWD: ['د.ك', 'KWD', 3, 0.307, 'دينار كويتي'],
    QAR: ['ر.ق', 'QAR', 2, 3.64, 'ريال قطري'],
    OMR: ['ر.ع', 'OMR', 3, 0.3845, 'ريال عماني'],
    JOD: ['د.أ', 'JOD', 3, 0.709, 'دينار أردني'],
    EGP: ['ج.م', 'EGP', 2, 48.5, 'جنيه مصري'],
    USD: ['$', 'USD', 2, 1, 'دولار أمريكي'],
    EUR: ['€', 'EUR', 2, 0.92, 'يورو'],
    GBP: ['£', 'GBP', 2, 0.79, 'جنيه إسترليني'],
  };
  // تخمين أول مرة من المنطقة الزمنية للجهاز (المستخدم يقدر يغيّرها)
  const ZONES = { 'Asia/Bahrain': 'BHD', 'Asia/Riyadh': 'SAR', 'Asia/Dubai': 'AED', 'Asia/Kuwait': 'KWD', 'Asia/Qatar': 'QAR', 'Asia/Muscat': 'OMR', 'Asia/Amman': 'JOD', 'Africa/Cairo': 'EGP' };

  let guessed = null;
  const guess = () => guessed || (guessed = (() => { try { return ZONES[Intl.DateTimeFormat().resolvedOptions().timeZone] || 'BHD'; } catch (e) { return 'BHD'; } })());
  const code = () => {
    const c = global.Store && global.Store.state && global.Store.state.settings && global.Store.state.settings.currency;
    return LIST[c] ? c : guess();   // ما اختار للحين = منطقة جهازه (البحرين ← دينار)
  };
  const en = () => !!(global.HayatiLang && global.HayatiLang.lang === 'en');
  const sym = (c) => LIST[c || code()][en() ? 1 : 0];
  const dec = (c) => LIST[c || code()][2];
  // من عملة لعملة المستخدم (تقريبي)
  function convert(amount, from, to) {
    to = to || code();
    if (!LIST[from] || !LIST[to] || from === to) return amount;
    const d = 10 ** dec(to);
    return Math.round((amount / LIST[from][3]) * LIST[to][3] * d) / d;
  }
  // نص مكتوب بالدينار (د.ب / BHD / دينار بحريني) ← عملة المستخدم
  function swap(s) {
    const c = code();
    if (c === 'BHD' || s == null) return s;
    const x = LIST[c];
    return String(s).replace(/دينار بحريني/g, x[4]).replace(/د\.ب/g, x[0]).replace(/\bBHD\b/g, x[1]).replace(/\b0\.000\b/g, (0).toFixed(x[2]));
  }

  // الشاشة: أي «د.ب» مكتوب بالواجهة يصير رمز عملتك (الحقول اللي يكتبها المستخدم ما تنلمس)
  const SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT|CODE)$/;
  const HIT = /د\.ب|دينار بحريني|\bBHD\b|\b0\.000\b/;
  function walk(root) {
    if (code() === 'BHD' || !root) return;
    const one = (n) => {
      if (n.nodeType === 3) {
        const p = n.parentElement;
        if (!p || SKIP.test(p.tagName) || p.closest('[data-nocur]') || !HIT.test(n.nodeValue)) return;
        const t = swap(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t;
      } else if (n.nodeType === 1) {
        const v = n.getAttribute('placeholder');
        if (v && HIT.test(v)) { const t = swap(v); if (t !== v) n.setAttribute('placeholder', t); }
      }
    };
    if (root.nodeType === 3) { one(root); return; }
    if (root.nodeType !== 1) return;
    one(root);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n; while ((n = tw.nextNode())) one(n);
  }
  if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
    const go = () => {
      walk(document.body);
      new MutationObserver((ms) => {
        if (code() === 'BHD') return;
        for (const m of ms) { if (m.type === 'childList') m.addedNodes.forEach(walk); else walk(m.target); }
      }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['placeholder'] });
    };
    if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
  }

  global.HayatiCur = { LIST, code, sym, dec, convert, swap, guess, walk };
})(typeof window !== 'undefined' ? window : globalThis);
