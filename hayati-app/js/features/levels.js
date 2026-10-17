// DW-054: الدراسة لكل المراحل — طالب المدرسة أو الثانوي يشوف «حصة» بدال «محاضرة»، و«المدرسة» بدال «الجامعة»
// يشتغل على الكلام اللي بالشاشة بس (العربي)، وما يلمس بيانات المستخدم المحفوظة ولا الحقول
(function () {
  'use strict';

  const A = window.App;
  if (!A) return;
  const lang = () => (window.HayatiLang && window.HayatiLang.lang) || 'ar';
  const on = () => lang() !== 'en' && ['school', 'secondary'].includes((A.st.settings || {}).study_level);

  // الأطول أول؛ «حصة» مؤنث مثل «محاضرة» فالصفات تظل صح («المحاضرة الجاية» ← «الحصة الجاية»)
  const MAP = [
    [/المحاضرات/g, 'الحصص'], [/محاضرات/g, 'حصص'], [/المحاضرة/g, 'الحصة'], [/محاضرة/g, 'حصة'],
    [/الجامعية/g, 'الدراسية'], [/جامعية/g, 'دراسية'], [/الجامعي/g, 'الدراسي'], [/جامعي/g, 'دراسي'],
    [/جامعتك/g, 'مدرستك'], [/الجامعة/g, 'المدرسة'],
    [/الدكاترة/g, 'المعلمين'], [/الدكتور/g, 'المعلم'], [/دكتور/g, 'معلم'],
  ];
  const HIT = /محاضر|جامع|دكت|دكاترة/;
  const swap = (s) => MAP.reduce((x, [re, to]) => x.replace(re, to), s);
  const ATTRS = ['placeholder', 'aria-label', 'title'];
  const SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT|CODE|SELECT|OPTION)$/;
  // اسم المادة أو المحاضرة اللي كتبه المستخدم ما نغيّره
  const USER = '[data-noi18n],.list .title .t,.lec-row,#lcCards';

  function text(n) {
    const p = n.parentElement;
    if (!p || SKIP.test(p.tagName) || p.closest(USER) || !HIT.test(n.nodeValue)) return;
    const t = swap(n.nodeValue);
    if (t !== n.nodeValue) n.nodeValue = t;
  }
  function attrs(el) {
    for (const a of ATTRS) {
      const v = el.getAttribute && el.getAttribute(a);
      if (v && HIT.test(v)) { const t = swap(v); if (t !== v) el.setAttribute(a, t); }
    }
  }
  function walk(root) {
    if (!on() || !root) return;
    if (root.nodeType === 3) { text(root); return; }
    if (root.nodeType !== 1 || root.closest(USER)) return;
    attrs(root);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n;
    while ((n = tw.nextNode())) { if (n.nodeType === 3) text(n); else attrs(n); }
  }
  const go = () => {
    walk(document.body);
    new MutationObserver((ms) => {
      if (!on()) return;
      for (const m of ms) {
        if (m.type === 'childList') m.addedNodes.forEach(walk);
        else walk(m.target);
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  };
  if (document.body) go(); else addEventListener('DOMContentLoaded', go);
  window.HayatiLevels = { swap, on };
})();
