// الحركة: دخول الشاشات، فتح وسكر النوافذ، وتحريك الأرقام والأشرطة لما تتغيّر
(function (global) {
  'use strict';

  const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
  const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';
  const reduced = () => global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wide = () => global.matchMedia('(min-width: 640px)').matches;
  const rtl = () => document.documentElement.dir === 'rtl';

  // منحنى cubic-bezier حقيقي للأرقام (نفس --ease-out)
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t;
    const sy = (t) => ((ay * t + by) * t + cy) * t;
    const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
      let t = x;
      for (let i = 0; i < 6; i++) {
        const d = dx(t);
        if (Math.abs(d) < 1e-6) break;
        t -= (sx(t) - x) / d;
      }
      return sy(Math.max(0, Math.min(1, t)));
    };
  }
  const easeOut = bezier(0.23, 1, 0.32, 1);

  const view = document.getElementById('view');
  const A = global.App;
  if (!view || !A) return;

  // ---------- دخول الشاشة (تبويب أو قسم جديد) ----------
  function viewKey() {
    const u = A.ui;
    const seg = u.tab === 'money' ? u.moneySeg : u.tab === 'schedule' ? u.studySeg : u.tab === 'tasks' ? u.tasksSeg : '';
    return u.tab + '|' + (seg || '');
  }

  let lastKey = null;
  let lastTab = null;
  let enterStart = 0;
  let enterKind = null;
  let snap = new Map();

  function enter(kind, elapsed) {
    const kids = Array.from(view.children);
    if (reduced()) {
      const a = view.animate({ opacity: [0, 1] }, { duration: 150, easing: 'ease' });
      if (elapsed) a.currentTime = elapsed;
      return;
    }
    if (kind === 'tab') {
      // تدرّج خفيف: ٣٥ms بين كل بطاقة، أقصاها ٨ عناصر
      kids.forEach((el, i) => {
        const a = el.animate(
          { opacity: [0, 1], transform: ['translateY(8px)', 'translateY(0)'] },
          { duration: 240, delay: Math.min(i, 7) * 35, easing: EASE_OUT, fill: 'backwards' }
        );
        if (elapsed) a.currentTime = elapsed;
      });
    } else {
      // تغيير القسم داخل نفس التبويب: شريط الأقسام ثابت والمحتوى بس يظهر
      kids.forEach((el) => {
        if (el.matches('.seg') || el.querySelector('.seg')) return;
        const a = el.animate(
          { opacity: [0, 1], transform: ['translateY(4px)', 'translateY(0)'] },
          { duration: 180, easing: EASE_OUT, fill: 'backwards' }
        );
        if (elapsed) a.currentTime = elapsed;
      });
    }
  }

  // ---------- لقطة القيم عشان نحرّك اللي تغيّر بس ----------
  const label = (el, sel) => {
    const c = el.closest(sel);
    return c ? (c.querySelector('.line span, .lbl, .eyebrow, b') || c).textContent.trim().slice(0, 40) : '';
  };

  function collect() {
    const out = new Map();
    const add = (sel, kind, ctx) => {
      view.querySelectorAll(sel).forEach((el, i) => {
        out.set(sel + '#' + i + '#' + (ctx ? label(el, ctx) : ''), { el, kind });
      });
    };
    add('.hero .amount-big .num, .hero .split .num', 'num', '.hero');
    add('.tile .val .num', 'num', '.tile');
    add('.ring b.num', 'num', '.hero');
    add('.ring circle:last-child', 'ring', '.hero');
    add('.hero .track > span', 'w', '.hero');
    add('.meter > span', 'w', '.cat, .goal, .card');
    add('.chart .bar', 'h');
    add('.mini-bars i', 'h');
    return out;
  }

  function readValue(el, kind) {
    if (kind === 'num') return el.textContent;
    if (kind === 'ring') return el.getAttribute('stroke-dasharray');
    if (kind === 'w') return el.style.width;
    return el.style.height;
  }

  function parseNum(text) {
    const m = /(−|-)?([\d,]+(?:\.(\d+))?)/.exec(text);
    if (!m) return null;
    return {
      value: (m[1] ? -1 : 1) * parseFloat(m[2].replace(/,/g, '')),
      dec: m[3] ? m[3].length : 0,
      pre: text.slice(0, m.index),
      post: text.slice(m.index + m[0].length),
      neg: m[1] || '−',
    };
  }

  function formatNum(v, p) {
    const [a, b] = Math.abs(v).toFixed(p.dec).split('.');
    return p.pre + (v < 0 ? p.neg : '') + a.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (b ? '.' + b : '') + p.post;
  }

  const tweens = new Set();
  function countUp(el, fromText, toText) {
    const a = parseNum(fromText), b = parseNum(toText);
    if (!a || !b || a.value === b.value) return;
    const t0 = performance.now(), dur = 300;
    const job = { el };
    tweens.add(job);
    const step = (now) => {
      if (!tweens.has(job) || !el.isConnected) return;
      const k = Math.min(1, (now - t0) / dur);
      el.textContent = k >= 1 ? toText : formatNum(a.value + (b.value - a.value) * easeOut(k), b);
      if (k < 1) requestAnimationFrame(step); else tweens.delete(job);
    };
    el.textContent = fromText;
    requestAnimationFrame(step);
  }

  // الأشرطة تتحرك بـ transform بدل العرض/الطول
  function grow(el, from, to, axis) {
    const f = parseFloat(from), t = parseFloat(to);
    if (!(t > 0) || isNaN(f) || Math.abs(f - t) < 0.5) return;
    const r = Math.max(0, f / t);
    const origin = axis === 'x' ? (rtl() ? 'right center' : 'left center') : 'center bottom';
    el.style.transformOrigin = origin;
    el.animate(
      { transform: [(axis === 'x' ? 'scaleX(' : 'scaleY(') + r + ')', 'none'] },
      { duration: 300, easing: EASE_OUT }
    );
  }

  function animateChanges(prev, next) {
    if (reduced()) return;
    for (const [k, n] of next) {
      const p = prev.get(k);
      if (!p) continue;
      const to = readValue(n.el, n.kind);
      if (p.value === to) continue;
      if (n.kind === 'num') countUp(n.el, p.value, to);
      else if (n.kind === 'ring') n.el.animate({ strokeDasharray: [p.value.replace(' ', ', '), to.replace(' ', ', ')] }, { duration: 300, easing: EASE_OUT });
      else grow(n.el, p.value, to, n.kind === 'w' ? 'x' : 'y');
    }
  }

  // ---------- ردة فعل لما تضغط إنجاز / عادة / كوب ماء ----------
  let tap = null;
  view.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    tap = {
      action: el.dataset.action, id: el.dataset.id, n: el.dataset.n,
      wasOn: el.classList.contains('on'),
      cupsOn: el.classList.contains('cup') ? el.parentElement.querySelectorAll('.cup.on').length : 0,
      t: performance.now(),
    };
  }, true);

  function feedback() {
    const t = tap;
    tap = null;
    if (!t || performance.now() - t.t > 800 || reduced()) return;
    if (t.action === 'water') {
      const cups = view.querySelectorAll('.cup');
      let k = 0;
      cups.forEach((c, i) => {
        if (i >= t.cupsOn && c.classList.contains('on')) {
          c.animate({ transform: ['scale(0.85)', 'scale(1)'], opacity: [0.4, 1] }, { duration: 200, delay: k++ * 30, easing: EASE_OUT, fill: 'backwards' });
        }
      });
      return;
    }
    if (!t.id) return;
    const el = view.querySelector('[data-action="' + CSS.escape(t.action) + '"][data-id="' + CSS.escape(t.id) + '"]');
    if (!el || !el.classList.contains('on') || t.wasOn) return;
    el.animate({ transform: ['scale(0.88)', 'scale(1)'] }, { duration: 200, easing: EASE_OUT });
    // علامة الصح ترتسم
    const path = el.classList.contains('check') && el.querySelector('svg path');
    if (path) {
      path.setAttribute('pathLength', '1');
      path.style.strokeDasharray = '1';
      path.animate({ strokeDashoffset: [1, 0] }, { duration: 220, delay: 40, easing: EASE_OUT, fill: 'backwards' });
    }
  }

  // ---------- بعد كل رسم للشاشة ----------
  function afterRender() {
    const key = viewKey();
    const next = collect();
    const now = performance.now();
    if (key !== lastKey) {
      enterKind = lastTab === A.ui.tab ? 'seg' : 'tab';
      enterStart = now;
      for (const j of tweens) tweens.delete(j);
      enter(enterKind, 0);
    } else if (now - enterStart < 520) {
      // رسمة ثانية وسط الدخول (مثلاً وصلت البيانات من المزامنة): نكمل من نفس النقطة
      enter(enterKind, now - enterStart);
    } else {
      animateChanges(snap, next);
      feedback();
    }
    tap = null;
    lastKey = key;
    lastTab = A.ui.tab;
    snap = new Map();
    for (const [k, n] of next) snap.set(k, { value: readValue(n.el, n.kind) });
  }

  new MutationObserver(afterRender).observe(view, { childList: true });

  // أول رسمة صارت قبل ما ينحمّل هالملف: نبدأ دخولها من هني
  lastKey = viewKey();
  lastTab = A.ui.tab;
  enterKind = 'tab';
  enterStart = performance.now();
  enter('tab', 0);
  for (const [k, n] of collect()) snap.set(k, { value: readValue(n.el, n.kind) });

  // ---------- النوافذ: تطلع من تحت وتنزل لتحت ----------
  const nativeClose = HTMLDialogElement.prototype.close;

  function dialogMotion(dlg, isSheet) {
    const frames = (open) => {
      if (reduced()) return { opacity: open ? [0, 1] : [1, 0] };
      if (isSheet && !wide()) return { transform: open ? ['translateY(100%)', 'translateY(0)'] : ['translateY(0)', 'translateY(100%)'] };
      return { opacity: open ? [0, 1] : [1, 0], transform: open ? ['scale(0.96)', 'scale(1)'] : ['scale(1)', 'scale(0.96)'] };
    };
    const timing = (open) => {
      if (reduced()) return { duration: 150, easing: 'ease' };
      if (isSheet && !wide()) return { duration: open ? 380 : 260, easing: EASE_DRAWER };
      return { duration: open ? 220 : 160, easing: EASE_OUT };
    };
    const backdrop = (open, t) => {
      try { return dlg.animate({ opacity: open ? [0, 1] : [1, 0] }, Object.assign({ pseudoElement: '::backdrop' }, t)); } catch (e) { return null; }
    };

    let closing = null;

    new MutationObserver(() => {
      if (!dlg.open) return;
      const t = timing(true);
      dlg.animate(frames(true), t);
      backdrop(true, t);
    }).observe(dlg, { attributes: true, attributeFilter: ['open'] });

    dlg.close = function (rv) {
      if (!this.open || closing) return;
      const t = Object.assign({ fill: 'forwards' }, timing(false));
      const a = this.animate(frames(false), t);
      const b = backdrop(false, t);
      closing = { a, b };
      const mine = closing;
      a.finished.then(() => {
        if (closing !== mine) return;
        closing = null;
        nativeClose.call(this, rv);
        a.cancel();
        if (b) b.cancel();
      }).catch(() => {});
    };

    // لو انفتحت نافذة جديدة وهي تتسكر، نلغي السكرة
    dlg.cancelClose = () => {
      if (!closing) return;
      const c = closing;
      closing = null;
      c.a.cancel();
      if (c.b) c.b.cancel();
    };

    // زر Esc: نخليه يمر من نفس الحركة
    dlg.addEventListener('cancel', (e) => {
      if (e.defaultPrevented) return;
      e.preventDefault();
      dlg.close();
    });
  }

  const sheet = document.getElementById('sheet');
  const ask = document.getElementById('askDlg');
  if (sheet) {
    dialogMotion(sheet, true);
    new MutationObserver(() => sheet.cancelClose()).observe(document.getElementById('sheetBody'), { childList: true });
  }
  if (ask) dialogMotion(ask, false);

  // ---------- مؤشر التبويب: حبة تنزلق من التبويب القديم للجديد ----------
  // شريط التبويبات ينرسم من جديد كل مرة، فنحفظ مكان الحبة ونحرّكها من المكان القديم (FLIP)
  const tabbar = document.getElementById('tabbar');
  let lastPillX = null;
  function placePill() {
    const on = tabbar.querySelector('.tab.on');
    if (!on) return;
    let pill = tabbar.querySelector('.tab-pill');
    if (!pill) { pill = document.createElement('span'); pill.className = 'tab-pill'; pill.setAttribute('aria-hidden', 'true'); tabbar.prepend(pill); }
    const bar = tabbar.getBoundingClientRect(), r = on.getBoundingClientRect();
    const w = Math.min(r.width - 8, 72), x = r.left - bar.left + (r.width - w) / 2;
    pill.style.width = w + 'px';
    pill.style.transform = 'translateX(' + x + 'px)';
    if (lastPillX != null && Math.abs(lastPillX - x) > 1 && !reduced()) {
      pill.animate({ transform: ['translateX(' + lastPillX + 'px)', 'translateX(' + x + 'px)'] }, { duration: 260, easing: EASE_OUT });
    }
    lastPillX = x;
  }
  if (tabbar) {
    new MutationObserver((m) => { if (m.some((r) => [...r.addedNodes].some((n) => n.classList && n.classList.contains('tab')))) placePill(); })
      .observe(tabbar, { childList: true });
    window.addEventListener('resize', () => { lastPillX = null; placePill(); });
    placePill();
  }
})(window);
