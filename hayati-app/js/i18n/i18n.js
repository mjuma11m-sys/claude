// 🌐 اللغة: العربي الأصل، والإنقليزي طبقة عرض بس — تترجم النص اللي يطلع على الشاشة بدون ما تلمس بياناتك
//   localStorage «hayati-lang» = 'en' | 'ar'
(function () {
  'use strict';

  const KEY = 'hayati-lang';
  const lang = (() => { try { return localStorage.getItem(KEY) || 'ar'; } catch (e) { return 'ar'; } })();
  window.HayatiLang = {
    lang,
    set(l) { try { localStorage.setItem(KEY, l); } catch (e) { /* تجاهل */ } location.reload(); },
  };
  if (lang !== 'en' || !window.HAYATI_EN) return;

  const D = window.HAYATI_EN;
  // حدود الكلمة: حروف عربية بس (بدون «،» و«؛» و«؟» و«٪» اللي كانت تمنع ترجمة الكلمة اللي قبلها)
  const AR = 'ء-ٟٮ-ۓ';
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // الأطول أول، وما نترجم جزء من كلمة عربية أطول
  const keys = Object.keys(D).sort((a, b) => b.length - a.length);
  const RE = new RegExp('(?<![' + AR + '])(' + keys.map(esc).join('|') + ')(?![' + AR + '])', 'g');
  const hasAr = (s) => /[؀-ۿ]/.test(s);
  function tr(s) {
    if (!s || !hasAr(s)) return s;
    // «حضرت X؟» سؤال (مو «Attended»)، والاسم يظل مثل ما هو
    return s.replace(/^حضرت\s+(.+)؟$/, 'Did you attend $1?').replace(RE, (m) => D[m])
      .replace(/(\d)\s*م(?![ء-ٟٮ-ۓ])/g, '$1 pm').replace(/(\d)\s*ص(?![ء-ٟٮ-ۓ])/g, '$1 am')
      .replace(/(^|[\s\d.])من(?=$|[\s\d])/g, '$1of')
      // أرقام بوحدات عربية: «بعد 3 أيام»، «49 دقيقة»، «30 د»، «1.5 س»، «3 مرات»
      .replace(/قبل\s+(\d+)\s*(?:أيام|يوم|days)(?![ء-ٟٮ-ۓ])/g, '$1 days ago').replace(/قبل\s+(?:يومين|two days|2 days)(?![ء-ٟٮ-ۓ])/g, '2 days ago').replace(/قبل\s+(?:يوم|a day|1 day|Day)(?![ء-ٟٮ-ۓ\w])/g, 'a day ago')
      .replace(/بعد\s+(\d+)\s*(?:أيام|يوم|days)(?![ء-ٟٮ-ۓ])/g, 'in $1 days').replace(/(\d+)\s*(?:أيام|يوم)(?![ء-ٟٮ-ۓ])/g, '$1 days')
      .replace(/(\d+)\s*(?:دقيقة|دقايق|دقائق)(?![ء-ٟٮ-ۓ])/g, '$1 min').replace(/(\d+(?:\.\d+)?)\s*س(?![ء-ٟٮ-ۓ.])/g, '$1 h')
      .replace(/(\d+)\s*د(?![ء-ٟٮ-ۓ.])/g, '$1 min').replace(/(\d+)\s*مرات(?![ء-ٟٮ-ۓ])/g, '$1 times').replace(/(\d)\s*كم(?![ء-ٟٮ-ۓ])/g, '$1 km')
      .replace(/(^|\s)يا\s+(?=\S)/g, ', ').replace(/\s+يا\s*$/, ', ').replace(/(^|\s)و(?=\s|$)/g, '$1and')
      .replace(/(^|\s)بعد(?=\s)/g, '$1in').replace(/(\s)و(?=\d)/g, '$1and ')
      .replace(/،/g, ',').replace(/؟/g, '?').replace(/٪/g, '%');
  }
  // بيانات المستخدم (اسم مهمة، محل، مادة) ما نترجم كلمة منها: «اختبار المحاسبة» تظل مثل ما كتبها.
  //   نترجمها بس لو كلها كلمة معروفة (مثل «مصروف» أو «مذاكرة عامة» اللي يحطها التطبيق نفسه)
  const USER = '.t, bdi';
  function trText(n) {
    const p = n.parentElement;
    if (p && p.closest(USER)) {
      const k = n.nodeValue.trim();
      if (D[k]) n.nodeValue = n.nodeValue.replace(k, D[k]);
      return;
    }
    const o = n.nodeValue, w = WHOLE[o.trim()], v = w ? o.replace(o.trim(), w) : tr(o); if (v !== o) n.nodeValue = v;
    if (hasAr(v) && !OUT.has(o)) { MISS.add(o.trim()); OUT.add(v); }
  }
  // النص اللي ظل فيه عربي بعد الترجمة (للاختبار: tests/tools/i18n-audit.js)
  const MISS = new Set(), OUT = new Set();
  // حرف لحاله بعنصر (وحدة بجنب رقم): نترجمه بس لو هو النص كله، عشان «د.ب» و«30 د» ما يتأثرون
  const WHOLE = { 'د': 'min', 'س': 'h', 'هـ': 'AH', 'لك': 'Owed to you', 'عليك': 'You owe', 'ص': 'am', 'م': 'pm' };
  function trAttr(el, a) {
    const v = el.getAttribute(a);
    if (!v || !hasAr(v)) return;
    const t = tr(v); if (t !== v) el.setAttribute(a, t);
    if (hasAr(t) && !OUT.has(v)) { MISS.add(v); OUT.add(t); }
  }
  const ATTRS = ['placeholder', 'aria-label', 'title'];
  const SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT|CODE)$/, FIELD = /^(TEXTAREA|INPUT)$/;
  function walk(root) {
    if (root.nodeType === 3) {
      // نص داخل <script> أو حقل إدخال ما نلمسه أبداً
      const p = root.parentElement;
      if (!p || SKIP.test(p.tagName) || p.closest('[data-noi18n]')) return;
      trText(root); return;
    }
    if (root.nodeType !== 1 || root.closest('[data-noi18n]')) return;
    if (FIELD.test(root.tagName)) { for (const a of ATTRS) trAttr(root, a); return; }
    if (SKIP.test(root.tagName)) return;
    // نكتب بس لو تغيّر: نص عربي بدون ترجمة كان يرجع يطلق المراقب للأبد
    for (const a of ATTRS) trAttr(root, a);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n;
    while ((n = tw.nextNode())) {
      if (n.nodeType === 3) {
        const p = n.parentElement;
        if (p && (SKIP.test(p.tagName) || p.closest('[data-noi18n]'))) continue;
        trText(n);
      } else if (!SKIP.test(n.tagName) || FIELD.test(n.tagName)) {
        for (const a of ATTRS) trAttr(n, a);
      }
    }
  }
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
  // الستايل الأصلي يثبّت الاتجاه يمين ← يسار؛ بالإنقليزي نقلبه
  const css = document.createElement('style');
  css.textContent = 'html{direction:ltr!important}.rd-chips span{direction:ltr!important}' +
    // أسهم «التالي/السابق» تنقلب مع الاتجاه
    '.month-nav svg,.menu button>svg:last-child,.menu a>svg:last-child,.cta>svg:last-child{transform:scaleX(-1)}';
  (document.head || document.documentElement).appendChild(css);
  document.title = 'Hayati';
  const go = () => {
    walk(document.body);
    new MutationObserver((ms) => {
      for (const m of ms) {
        if (m.type === 'characterData') walk(m.target);
        else if (m.type === 'attributes') walk(m.target);
        else m.addedNodes.forEach(walk);
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  };
  if (document.body) go(); else addEventListener('DOMContentLoaded', go);
  window.HayatiLang.tr = tr;
  window.HayatiLang.missing = () => [...MISS];
})();
