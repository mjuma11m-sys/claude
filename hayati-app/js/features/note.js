// DW-102: «💬 ملاحظة» — طلب الوالد: خانة واضحة يرسل منها أي أحد مشكلة أو اقتراح أو رأي، وتوصل مباشرة.
// زر بالترويسة بكل الشاشات + أعلى «كل شي بحياتي» + الإعدادات («رأيك بالتطبيق» و«بلّغ عن مشكلة» صاروا يفتحون هني).
// يوصل: النص اللي كتبه، النسخة، نوع الجهاز، وآخر الأخطاء التقنية لو اختار. بدون مبالغ ولا اسم ولا IP.
// بدون نت ← تنحفظ على الجهاز وتنرسل بروحها لما يرجع النت. بدون Supabase ← نرجع لطريقة إنستقرام.
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, h } = A;
  const QUEUE = 'hayati-fb-queue';
  const KINDS = [['bug', '🐞 مشكلة'], ['idea', '💡 اقتراح'], ['opinion', '💬 رأي']];
  const readQ = () => { try { const a = JSON.parse(localStorage.getItem(QUEUE) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const writeQ = (a) => { try { if (a.length) localStorage.setItem(QUEUE, JSON.stringify(a.slice(-10))); else localStorage.removeItem(QUEUE); } catch (e) { /* تجاهل */ } };
  const device = () => (window.HayatiFeedback && window.HayatiFeedback.deviceInfo ? window.HayatiFeedback.deviceInfo() : (navigator.platform || ''));

  async function flush() {
    const q = readQ(); if (!q.length || !navigator.onLine) return;
    const left = [];
    for (const f of q) { try { if (!(await S.sendFeedback(f))) left.push(f); } catch (e) { if (e.message !== 'rate_limited') left.push(f); } }
    writeQ(left);
  }

  function sheet(kind) {
    kind = kind || 'bug';
    const errs = window.HayatiErrLog ? window.HayatiErrLog.text(5) : '';
    A.openSheet({
      title: '💬 أرسل ملاحظة', saveLabel: 'أرسل',
      body: '<p class="small muted" style="margin:0 4px 12px">توصلنا مباشرة ونقراها كلها. مشكلة، اقتراح، أو رأي.</p>' +
        '<div class="seg" id="nkSeg" role="tablist" style="margin-bottom:12px">' + KINDS.map(([k, l]) => '<button type="button" data-k="' + k + '" class="' + (k === kind ? 'on' : '') + '">' + l + '</button>').join('') + '</div>' +
        '<div class="field" id="nkStars"' + (kind === 'opinion' ? '' : ' hidden') + '><label>تقييمك</label><div class="fb-stars" dir="ltr">' + [1, 2, 3, 4, 5].map((n) => '<button type="button" data-n="' + n + '" aria-label="' + n + ' من 5">★</button>').join('') + '</div></div>' +
        '<div class="field"><label for="nkMsg" id="nkLabel">' + label(kind) + '</label><textarea id="nkMsg" maxlength="1500" rows="5"></textarea></div>' +
        '<div class="field"><label for="nkContact">نتواصل معاك؟ إيميل أو حساب إنستقرام (اختياري)</label><input id="nkContact" maxlength="120" class="ltr" autocomplete="off"></div>' +
        (errs ? '<label class="check-row" id="nkErrRow" style="display:flex;gap:8px;align-items:flex-start;margin:0 0 8px"' + (kind === 'bug' ? '' : ' hidden') + '><input type="checkbox" id="nkErr"><span class="small">أرفق آخر الأخطاء التقنية (ما فيها بياناتك)</span></label>' : '') +
        '<p class="small muted" style="margin:4px 4px 0">ينرسل معاها: <span class="num" dir="ltr">' + h(A.APP_VERSION + ' · ' + device()) + '</span></p>',
      mount(root) {
        const msg = root.querySelector('#nkMsg');
        root.querySelector('#nkSeg').onclick = (e) => {
          const b = e.target.closest('[data-k]'); if (!b) return;
          root.querySelectorAll('#nkSeg [data-k]').forEach((x) => x.classList.toggle('on', x === b));
          root.dataset.kind = b.dataset.k;
          root.querySelector('#nkLabel').textContent = label(b.dataset.k);
          root.querySelector('#nkStars').hidden = b.dataset.k !== 'opinion';
          const er = root.querySelector('#nkErrRow'); if (er) er.hidden = b.dataset.k !== 'bug';
        };
        root.querySelector('#nkStars').onclick = (e) => {
          const b = e.target.closest('button'); if (!b) return;
          root.dataset.stars = b.dataset.n;
          root.querySelectorAll('#nkStars button').forEach((x) => x.classList.toggle('on', Number(x.dataset.n) <= Number(b.dataset.n)));
        };
        root.dataset.kind = kind;
        setTimeout(() => { try { msg.focus(); } catch (e) { /* تجاهل */ } }, 350);
      },
      async onSave(root) {
        const message = root.querySelector('#nkMsg').value.trim();
        if (message.length < 3) throw new Error('اكتب ملاحظتك');
        const er = root.querySelector('#nkErr');
        const f = { kind: root.dataset.kind || kind, message, rating: Number(root.dataset.stars) || null, contact: root.querySelector('#nkContact').value.trim(),
          version: A.APP_VERSION, device: device(), errors: er && er.checked && window.HayatiErrLog ? window.HayatiErrLog.text(5) : null };
        try {
          if (!navigator.onLine) throw new Error('offline');
          const ok = await S.sendFeedback(f);
          if (!ok) { fallback(f); return; }
          A.toast('وصلتنا ✓ شكراً لك 🤍');
        } catch (e) {
          if (e.message === 'rate_limited') throw new Error('أرسلت كثير بهالساعة، جرّب بعد شوي');
          writeQ(readQ().concat(f));
          A.toast('انحفظت ✓ بترسل لما يرجع النت');
        }
      },
    });
  }
  function label(k) { return k === 'bug' ? 'وش صار؟ ووين؟' : k === 'idea' ? 'وش الميزة اللي تبيها؟' : 'وش رأيك بالتطبيق؟'; }
  // بدون سيرفر: نفس الطريقة القديمة (ننسخ وتلصقها بإنستقرام)
  async function fallback(f) {
    const text = [f.kind === 'bug' ? '🐞 مشكلة' : f.kind === 'idea' ? '💡 اقتراح' : '💬 رأي', f.message, 'النسخة: ' + f.version, 'الجهاز: ' + f.device].join('\n');
    let copied = false;
    try { await navigator.clipboard.writeText(text); copied = true; } catch (e) { /* تجاهل */ }
    window.open('https://ig.me/m/hayati.bh', '_blank', 'noopener');
    A.toast(copied ? 'انسخت ✓ الصقها بالرسالة' : 'افتحنا إنستقرام، اكتب ملاحظتك هناك');
  }

  // زر بالترويسة (كل الشاشات)
  const btn = document.createElement('button');
  btn.className = 'icon-btn'; btn.id = 'noteBtn'; btn.type = 'button'; btn.setAttribute('aria-label', 'أرسل ملاحظة');
  btn.innerHTML = A.I('message');
  btn.onclick = () => sheet();
  const anchor = document.getElementById('toolsBtn') || document.getElementById('settingsBtn');
  if (anchor) anchor.parentNode.insertBefore(btn, anchor);

  // الإعدادات: «رأيك بالتطبيق» و«بلّغ عن مشكلة» يفتحون هني
  const prevSet = E.settingsAction;
  E.settingsAction = async function (act) {
    // بدون سيرفر تظل نوافذ إنستقرام القديمة (community.js)
    if ((act === 'feedback' || act === 'bug') && S.status && S.status.configured) { A.closeSheet(); setTimeout(() => sheet(act === 'bug' ? 'bug' : 'opinion'), 280); return true; }
    return prevSet ? prevSet.apply(this, arguments) : false;
  };
  if (E.Tools && E.Tools.GROUPS && E.Tools.GROUPS[0]) E.Tools.GROUPS[0][1].unshift(['note', 'message', '#FF6B4A', 'أرسل ملاحظة', () => sheet()]);

  window.addEventListener('online', flush);
  setTimeout(flush, 4000);
  E.Note = { sheet, flush, QUEUE };
})();
