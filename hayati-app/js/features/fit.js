// المبالغ الكبيرة تركب بمكانها (DW-025): أي مبلغ (فيه .cur) ما يركب بعرضه، يصغر خطه شوي شوي لين 55%
// بدل ما يطلع برا الكرت أو ينقص من أوله «…567.892». الأرقام العادية ما تتأثر.
(function () {
  'use strict';
  const SEL = '.amount-big, .hero .split b, .tile .val, .fit';
  function fitOne(el) {
    if (!el.querySelector('.cur')) return;
    el.style.fontSize = '';
    if (el.scrollWidth <= el.clientWidth + 1) return;
    const base = parseFloat(getComputedStyle(el).fontSize) || 16, min = base * 0.55;
    let fs = base;
    while (el.scrollWidth > el.clientWidth + 1 && fs > min) { fs -= 1; el.style.fontSize = fs + 'px'; }
  }
  function fitAll(root) { (root || document).querySelectorAll(SEL).forEach(fitOne); }
  let queued = false;
  const queue = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fitAll(); }); };
  const start = () => {
    ['view', 'sheetBody'].forEach((id) => { const el = document.getElementById(id); if (el) new MutationObserver(queue).observe(el, { childList: true, subtree: true }); });
    addEventListener('resize', queue);
    queue();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
  window.HayatiFit = { fitAll, fitOne };
})();
