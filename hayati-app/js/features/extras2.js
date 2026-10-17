// حياتي — إضافات 2: تقسيم الفاتورة، تحديات التوفير، ملخص السنة، الدرجات الجزئية، بطاقات المراجعة،
// الاختبارات الجاية، وضع التركيز، تمارين بديلة، المساعد الذكي، المناسبات، المشتريات، اليوميات والمزاج.
(function () {
  'use strict';
  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, st, I, h, fmt, money, tint, pad } = A;
  const dateKey = (d) => { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const parseDate = (k) => new Date(k + 'T00:00:00');
  const seg = (items, cur, action) => '<div class="seg">' + items.map(([k, l]) => '<button class="' + (cur === k ? 'on' : '') + '" data-action="' + action + '" data-k="' + k + '">' + l + '</button>').join('') + '</div>';
  const wrap = (name, fn) => { const prev = E[name]; E[name] = (...a) => fn(prev ? prev : () => '', ...a); };

  // ================= تقسيم الفاتورة (DW-048) =================
  // الحصص تنحسب بالفلس: مجموعها = المبلغ بالضبط. الحصص مربوطة بالعملية (split_of): إعادة القسمة تستبدلها،
  // وحذف العملية يسأل عن حصصها، وتعديل المبلغ يعيد حساب القسمة بالتساوي. المصروف نفسه يظل كامل (اللي طلع من حسابك).
  const fils = (x) => Math.round((Number(x) || 0) * 1000);
  const linked = (id) => st.debts.filter((d) => d.split_of === id);
  // equal: {names, me} · custom: {names, me, amounts{name: dinars}} ← [{person, amount}] أو خطأ
  function splitShares(total, cfg) {
    const T = fils(total), names = cfg.names;
    if (!names.length) throw new Error('اكتب اسم واحد على الأقل');
    if (cfg.mode === 'custom') {
      const out = names.map((n) => ({ person: n, f: fils(cfg.amounts[n]) }));
      if (out.some((x) => !(x.f > 0))) throw new Error('اكتب حصة كل واحد');
      const sum = out.reduce((a, x) => a + x.f, 0);
      if (sum > T) throw new Error('الحصص أكثر من المبلغ');
      if (!cfg.me && sum !== T) throw new Error('مجموع الحصص لازم يساوي ' + fmt(T / 1000));
      return out.map((x) => ({ person: x.person, amount: x.f / 1000 }));
    }
    const count = names.length + (cfg.me ? 1 : 0), base = Math.floor(T / count), rest = T - base * count;
    // الفلس الزايد: على اللي دفع لو داخل بالقسمة، وإلا على أول الربع
    return names.map((n, i) => ({ person: n, amount: (base + (!cfg.me && i < rest ? 1 : 0)) / 1000 }));
  }
  function splitText(tx, shares) {
    const d = new Date(tx.occurred_at);
    return ['🧾 ' + (tx.merchant || tx.category) + ' · ' + d.getDate() + '/' + (d.getMonth() + 1), 'المجموع: ' + fmt(tx.amount) + ' د.ب']
      .concat(shares.map((x) => x.person + ': ' + fmt(x.amount) + ' د.ب')).join('\n');
  }
  function applySplit(tx, cfg) {
    const old = linked(tx.id);
    if (old.some((d) => d.settled)) throw new Error('فيه حصص انسدّت · عدّلها من «لي وعلي»');
    const shares = splitShares(tx.amount, cfg);
    old.forEach((d) => S.remove('debts', d.id));
    const note = 'نصيبه من ' + (tx.merchant || tx.category);
    for (const x of shares) S.upsert('debts', { person: x.person, amount: x.amount, direction: 'lent', note, occurred_at: tx.occurred_at, settled: false, split_of: tx.id });
    S.upsert('transactions', Object.assign({}, tx, { split: { mode: cfg.mode, me: cfg.me, names: cfg.names, amounts: cfg.mode === 'custom' ? cfg.amounts : undefined } }));
    return shares;
  }

  let pendingSplit = false;   // «دفعت عن ربعك؟» بعملية جديدة: القسمة تنفتح بعد الحفظ
  wrap('txExtra', (prev, tx) => {
    let out = prev(tx);
    if (!tx) out += '<label class="switch" id="splitAsk" style="margin-bottom:12px"><input type="checkbox" name="split_after"> 👥 دفعت عن ربعك؟ قسّمها بعد الحفظ</label>';
    else if (tx.kind === 'expense') {
      const n = linked(tx.id).length;
      out += '<button type="button" class="btn ghost block" data-split style="margin-bottom:12px">' + I('users') + (n ? 'مقسّمة على ' + n + ' · عدّل القسمة' : 'قسّم الفاتورة مع ربعك') + '</button>';
    }
    return out;
  });
  wrap('txMount', (prev, root, tx) => {
    prev(root, tx);
    pendingSplit = false;
    const b = root.querySelector('[data-split]');
    if (b) b.onclick = () => { A.closeSheet(); setTimeout(() => splitSheet(st.transactions.find((x) => x.id === tx.id) || tx), 280); };
    const ask = root.querySelector('[name=split_after]');
    if (ask) ask.onchange = () => { pendingSplit = ask.checked; };
    const box = root.querySelector('#splitAsk');
    if (box) { const sync = () => { box.hidden = root.dataset.kind !== 'expense'; }; root.querySelector('#kindSeg').addEventListener('click', () => setTimeout(sync)); sync(); }
  });
  wrap('afterTx', (prev, tx) => {
    if (pendingSplit && tx && tx.kind === 'expense') { pendingSplit = false; splitSheet(tx); return ''; }
    pendingSplit = false;
    return prev(tx);
  });
  // تعديل مبلغ عملية مقسّمة: بالتساوي ← نعيد الحساب، بحصص ← نطلب منك تعدّلها
  wrap('txSaved', (prev, tx, old) => {
    prev(tx, old);
    if (!old || !tx.split || fils(old.amount) === fils(tx.amount) || !linked(tx.id).length) return '';
    if (tx.split.mode === 'equal') {
      try { applySplit(tx, tx.split); A.toast('انعاد حساب القسمة على المبلغ الجديد'); } catch (e) { A.toast(e.message); }
    } else A.toast('عدّلت المبلغ · افتح «عدّل القسمة» وعدّل الحصص');
    return '';
  });
  wrap('txDeleted', (prev, tx) => {
    prev(tx);
    const open = linked(tx.id).filter((d) => !d.settled);
    if (open.length) setTimeout(async () => { if (await A.ask('تحذف حصص الربع (' + open.length + ') بعد؟', 'احذفها')) { open.forEach((d) => S.remove('debts', d.id)); A.toast('انحذفت الحصص'); } }, 320);
    return '';
  });

  function splitSheet(tx) {
    const prevCfg = tx.split || { mode: 'equal', me: true, names: [] };
    const people = [...new Set(st.debts.map((d) => d.person).filter(Boolean))];
    A.openSheet({
      title: 'تقسيم الفاتورة',
      saveLabel: 'قسّم',
      body: '<p class="small muted" style="margin:0 4px 10px;text-align:center"><bdi>' + h(tx.merchant || tx.category) + '</bdi> · ' + money(tx.amount) + '</p>' +
        (people.length ? '<div class="chips" id="pp" style="margin-bottom:10px">' + people.map((p) => '<button type="button" class="chip" data-p="' + h(p) + '" data-noi18n>' + h(p) + '</button>').join('') + '</div>' : '') +
        '<div class="field"><label for="spNames">أسماء الربع (افصل بفاصلة)</label><input id="spNames" name="names" placeholder="أحمد، علي، حسين" value="' + h(prevCfg.names.join('، ')) + '"></div>' +
        '<div class="seg" id="spMode" style="margin-bottom:12px"><button type="button" data-k="equal"' + (prevCfg.mode !== 'custom' ? ' class="on"' : '') + '>بالتساوي</button><button type="button" data-k="custom"' + (prevCfg.mode === 'custom' ? ' class="on"' : '') + '>كل واحد حصته</button></div>' +
        '<div id="spCustom"></div>' +
        '<label class="switch" style="margin-bottom:12px"><input type="checkbox" name="me"' + (prevCfg.me !== false ? ' checked' : '') + '> أنا داخل بالقسمة</label>' +
        '<div class="card" id="splitPrev" style="text-align:center"></div>' +
        '<button type="button" class="btn ghost block" id="spSend" style="margin-top:10px">📤 أرسل لهم حصصهم</button>' +
        '<p class="small muted" style="margin:8px 4px 0">المصروف يظل كامل (اللي طلع من حسابك)، وحصصهم تنسجل بـ «لي وعلي».</p>',
      mount(root) {
        root.dataset.mode = prevCfg.mode === 'custom' ? 'custom' : 'equal';
        const amounts = Object.assign({}, prevCfg.amounts || {});
        const names = () => [...new Set(A.val(root, 'names').split(/[،,]/).map((x) => x.trim()).filter(Boolean))];
        const cfg = () => ({ mode: root.dataset.mode, me: root.querySelector('[name=me]').checked, names: names(), amounts });
        const drawCustom = () => {
          const box = root.querySelector('#spCustom');
          box.innerHTML = root.dataset.mode !== 'custom' ? '' : names().map((n) => '<div class="field" style="display:flex;gap:8px;align-items:center"><label style="flex:1;margin:0"><bdi>' + h(n) + '</bdi></label><input data-amt="' + h(n) + '" inputmode="decimal" placeholder="0.000" style="width:130px" aria-label="نصيب ' + h(n) + '" value="' + (amounts[n] != null ? h(String(amounts[n])) : '') + '"></div>').join('');
        };
        const upd = () => {
          const prev = root.querySelector('#splitPrev');
          try {
            const sh = splitShares(tx.amount, cfg());
            const mine = fils(tx.amount) - sh.reduce((a, x) => a + fils(x.amount), 0);
            prev.innerHTML = sh.map((x) => '<div><bdi>' + h(x.person) + '</bdi>: <b>' + money(x.amount) + '</b></div>').join('') + (cfg().me ? '<div class="small muted">حصتك: ' + money(mine / 1000) + '</div>' : '') + '<div class="small muted">ينسجل ' + sh.length + ' بـ «لي وعلي»</div>';
          } catch (e) { prev.innerHTML = '<span class="muted small">' + h(e.message) + '</span>'; }
        };
        root.querySelector('#spMode').onclick = (e) => {
          const b = e.target.closest('button'); if (!b) return;
          root.dataset.mode = b.dataset.k;
          root.querySelectorAll('#spMode button').forEach((x) => x.classList.toggle('on', x === b));
          drawCustom(); upd();
        };
        root.oninput = (e) => {
          const a = e.target.closest('[data-amt]');
          if (a) amounts[a.dataset.amt] = parseAmountSafe(a.value);
          if (e.target.name === 'names') drawCustom();
          upd();
        };
        root.onchange = upd;
        const pp = root.querySelector('#pp');
        if (pp) pp.onclick = (e) => { const b = e.target.closest('[data-p]'); if (!b) return; const cur = names(); if (!cur.includes(b.dataset.p)) { root.querySelector('[name=names]').value = cur.concat(b.dataset.p).join('، '); drawCustom(); } upd(); };
        root.querySelector('#spSend').onclick = async () => {
          let sh; try { sh = splitShares(tx.amount, cfg()); } catch (e) { A.toast(e.message); return; }
          const text = splitText(tx, sh);
          if (window.HayatiNative && window.HayatiNative.shareText && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) { window.HayatiNative.shareText(text); return; }
          if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { /* سكّر القائمة */ } }
          try { await navigator.clipboard.writeText(text); A.toast('انسخت ✓ الصقها لربعك'); } catch (e) { A.toast('ما قدرنا ننسخ'); }
        };
        drawCustom(); upd();
      },
      onSave(root) {
        const c = { mode: root.dataset.mode, me: root.querySelector('[name=me]').checked, names: [...new Set(A.val(root, 'names').split(/[،,]/).map((x) => x.trim()).filter(Boolean))], amounts: {} };
        root.querySelectorAll('[data-amt]').forEach((i) => { c.amounts[i.dataset.amt] = parseAmountSafe(i.value); });
        const sh = applySplit(st.transactions.find((x) => x.id === tx.id) || tx, c);
        A.toast('انسجل على ' + sh.length + (sh.length === 1 ? ' شخص' : ' أشخاص') + ' بـ «لي وعلي»');
      },
    });
  }
  const parseAmountSafe = (v) => { const n = Number(String(v || '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٫,]/g, '.')); return isFinite(n) && n > 0 ? Math.round(n * 1000) / 1000 : 0; };
  E.Split = { splitShares, splitText, linked };

  // ================= تحديات التوفير =================
  const CH = { '52w': { name: 'تحدي 52 أسبوع', emoji: '🗓️' }, nofood: { name: 'أسبوع بدون مطاعم', emoji: '🍔' } };
  const challenges = () => (Array.isArray(st.settings.challenges) ? st.settings.challenges : []);
  const saveCh = (list) => S.setSettings({ challenges: list });
  function goalsTop() {
    const list = challenges();
    let out = A.secHead('التحديات', '<button class="link" data-action="ch-add">تحدي جديد</button>');
    if (!list.length) return out + '<div class="card ch-empty"><div class="ico" style="' + tint('#f59e0b') + '">🏆</div><div style="flex:1"><b>تحدّى نفسك</b><div class="small muted">تحدي 52 أسبوع أو أسبوع بدون مطاعم</div></div><button class="btn primary" data-action="ch-add">ابدأ</button></div>';
    return out + list.map((c) => {
      const days = A.daysBetween(parseDate(c.start), new Date());
      if (c.type === '52w') {
        const week = Math.min(52, Math.floor(days / 7) + 1), step = Number(c.step) || 0.5, done = c.done || [];
        const saved = done.reduce((s, w) => s + w * step, 0), target = (52 * 53 / 2) * step;
        return '<div class="card ch"><div class="ch-head"><span>' + CH['52w'].emoji + '</span><b>' + CH['52w'].name + '</b><button class="icon-x" data-action="ch-del" data-id="' + c.id + '">✕</button></div>' +
          '<div class="small muted">الأسبوع ' + week + ': وفّر ' + money(week * step) + ' · المجموع ' + fmt(saved) + ' من ' + fmt(target) + '</div>' +
          '<div class="wk-grid">' + Array.from({ length: 52 }, (_, i) => '<i class="' + (done.includes(i + 1) ? 'on' : i + 1 === week ? 'now' : '') + '"></i>').join('') + '</div>' +
          (done.includes(week) ? '<div class="small" style="color:var(--income)">✓ وفّرت هالأسبوع</div>' : '<button class="btn primary block" data-action="ch-week" data-id="' + c.id + '" data-w="' + week + '">وفّرت ' + fmt(week * step) + ' هالأسبوع</button>') + '</div>';
      }
      const broke = st.transactions.filter((t) => t.kind === 'expense' && t.category === 'أكل ومطاعم' && new Date(t.occurred_at) >= parseDate(c.start)).sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at))[0];
      const streak = broke ? A.daysBetween(parseDate(c.start), new Date(broke.occurred_at)) : Math.min(7, days + 1);
      const win = !broke && days >= 6;
      return '<div class="card ch"><div class="ch-head"><span>' + CH.nofood.emoji + '</span><b>' + CH.nofood.name + '</b><button class="icon-x" data-action="ch-del" data-id="' + c.id + '">✕</button></div>' +
        '<div class="day-dots">' + Array.from({ length: 7 }, (_, i) => '<i class="' + (i < streak ? 'on' : '') + (broke && i === streak ? ' bad' : '') + '">' + (i + 1) + '</i>').join('') + '</div>' +
        '<div class="small ' + (broke ? 'neg' : win ? 'pos' : 'muted') + '">' + (broke ? 'انكسر يوم ' + (streak + 1) + ' (' + h(broke.merchant || 'مطعم') + ')' : win ? '🏅 أحسنت! كمّلت الأسبوع' : 'يوم ' + (days + 1) + ' من 7 — كمّل!') + '</div>' +
        (broke || win ? '<button class="btn ghost block" style="margin-top:8px" data-action="ch-restart" data-id="' + c.id + '">ابدأ من جديد</button>' : '') + '</div>';
    }).join('');
  }
  function chAddSheet() {
    A.openSheet({
      title: 'تحدي جديد',
      body: '<div class="menu">' + Object.entries(CH).map(([k, c]) => '<button data-ch="' + k + '"><div class="ico" style="' + tint('#f59e0b') + ';font-size:20px">' + c.emoji + '</div><div style="flex:1"><b>' + c.name + '</b><small>' +
        (k === '52w' ? 'كل أسبوع توفّر أكثر: الأسبوع 1 = نص دينار، الأسبوع 52 = 26 دينار (المجموع 689 د.ب)' : '7 أيام بدون صرف بتصنيف «أكل ومطاعم» — التطبيق يتابع لحاله') + '</small></div></button>').join('') + '</div>',
      mount(root) {
        root.onclick = (e) => {
          const b = e.target.closest('[data-ch]');
          if (!b) return;
          saveCh(challenges().concat({ id: S.uuid(), type: b.dataset.ch, start: dateKey(), step: 0.5, done: [] }));
          A.closeSheet(); A.toast('بدأ التحدي 💪');
        };
      },
    });
  }

  // ================= ملخص السنة =================
  function yearSheet() {
    const y = new Date().getFullYear();
    const tx = st.transactions.filter((t) => new Date(t.occurred_at).getFullYear() === y);
    const months = Array.from({ length: 12 }, (_, m) => A.sums(tx.filter((t) => new Date(t.occurred_at).getMonth() === m)));
    const exp = months.reduce((s, x) => s + x.exp, 0), inc = months.reduce((s, x) => s + x.inc, 0);
    const active = months.map((x, m) => ({ m, v: x.exp })).filter((x) => x.v > 0);
    const max = Math.max(1, ...months.map((x) => x.exp));
    const byCat = {}, byMer = {};
    for (const t of tx) if (t.kind === 'expense') { byCat[t.category || 'أخرى'] = (byCat[t.category || 'أخرى'] || 0) + Number(t.amount); const k = t.merchant || t.category; byMer[k] = (byMer[k] || 0) + Number(t.amount); }
    const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0], topMer = Object.entries(byMer).sort((a, b) => b[1] - a[1])[0];
    const hi = active.slice().sort((a, b) => b.v - a.v)[0], lo = active.slice().sort((a, b) => a.v - b.v)[0];
    A.openSheet({
      title: 'ملخص ' + y, cancelLabel: 'تم',
      body: '<div class="hero dark" style="margin-top:4px"><span class="eyebrow">' + I('chart') + 'صرفت هالسنة</span><div class="amount-big">' + money(exp) + '</div>' +
        '<div class="split"><div><small>الدخل</small><b>' + money(inc) + '</b></div><div><small>متوسط الشهر</small><b>' + money(active.length ? exp / active.length : 0) + '</b></div></div></div>' +
        '<div class="card"><div class="chart" style="height:150px">' + months.map((x, m) => '<div class="col' + (m === new Date().getMonth() ? ' today' : '') + '"><span class="v num">' + (x.exp ? Math.round(x.exp) : '') + '</span><div class="bar" style="height:' + Math.max(3, (x.exp / max) * 100) + 'px"></div><span class="lbl">' + A.MONTHS[m].slice(0, 3) + '</span></div>').join('') + '</div></div>' +
        '<div class="card"><ul class="list">' +
        (topCat ? '<li class="row" style="cursor:default"><div class="main">أكثر تصنيف<div class="sub">' + h(topCat[0]) + '</div></div><b>' + money(topCat[1]) + '</b></li>' : '') +
        (topMer ? '<li class="row" style="cursor:default"><div class="main">أكثر مكان<div class="sub">' + h(topMer[0]) + '</div></div><b>' + money(topMer[1]) + '</b></li>' : '') +
        (hi ? '<li class="row" style="cursor:default"><div class="main">أغلى شهر<div class="sub">' + A.MONTHS[hi.m] + '</div></div><b class="neg">' + money(hi.v) + '</b></li>' : '') +
        (lo && active.length > 1 ? '<li class="row" style="cursor:default"><div class="main">أوفر شهر<div class="sub">' + A.MONTHS[lo.m] + '</div></div><b class="pos">' + money(lo.v) + '</b></li>' : '') +
        '</ul></div>',
    });
  }

  // ================= الدرجات الجزئية بصفحة المادة =================
  function courseExtra(cc) {
    const rows = Array.isArray(cc.assessments) ? cc.assessments : [];
    const target = Number(cc.grade_target) || 90;
    let scoredW = 0, earned = 0, totalW = 0;
    for (const r of rows) { const w = Number(r.weight) || 0; totalW += w; if (r.score !== null && r.score !== '' && r.score != null) { scoredW += w; earned += w * Number(r.score) / 100; } }
    const remaining = Math.max(0, 100 - scoredW);
    const need = remaining ? ((target - earned) / remaining) * 100 : null;
    const current = scoredW ? (earned / scoredW) * 100 : null;
    let msg = '';
    if (current != null) msg += 'درجتك الحالية <b class="num">' + current.toFixed(1) + '%</b> من ' + scoredW + '% محسوبة. ';
    if (need != null && scoredW) msg += need > 100 ? '<span class="neg">صعب توصل ' + target + '% — جرّب هدف أقل.</span>' : need <= 0 ? '<span class="pos">ضمنت ' + target + '% 🎉</span>' : 'تحتاج <b class="num">' + Math.ceil(need) + '%</b> بالباقي (' + remaining + '%) عشان توصل ' + target + '%.';
    if (totalW !== 100 && rows.length) msg += ' <span class="small muted">(مجموع الأوزان ' + totalW + '% — المفروض 100)</span>';
    return '<div class="group-title">' + I('chart') + 'الدرجات خلال الفصل</div><div class="card">' +
      (rows.length ? '<div class="as-head"><span>التقييم</span><span>الوزن %</span><span>درجتك %</span><span></span></div>' + rows.map((r, i) =>
        '<div class="as-row"><input data-as="' + cc.id + '" data-i="' + i + '" data-f="name" value="' + h(r.name) + '"><input inputmode="decimal" data-as="' + cc.id + '" data-i="' + i + '" data-f="weight" value="' + (r.weight ?? '') + '"><input inputmode="decimal" data-as="' + cc.id + '" data-i="' + i + '" data-f="score" value="' + (r.score ?? '') + '" placeholder="—"><button type="button" data-x="as-del" data-i="' + i + '" aria-label="حذف">✕</button></div>').join('') : '<p class="small muted" style="margin:0 0 10px">أضف الكويزات والميدترم والمشروع بأوزانها، وأحسب لك وين أنت وكم تحتاج بالفاينل.</p>') +
      '<div class="btn-row" style="margin-top:10px"><button type="button" class="btn ghost" data-x="as-preset">ميدترم + فاينل + كويزات</button><button type="button" class="btn ghost" data-x="as-add">' + I('plus') + 'تقييم</button></div>' +
      (rows.length ? '<div class="as-target"><span>هدفك بالمادة</span><div class="stepper"><button type="button" data-x="as-t" data-d="-5">−</button><b class="num">' + target + '%</b><button type="button" data-x="as-t" data-d="5">+</button></div></div><div class="small" style="margin-top:8px">' + msg + '</div>' : '') + '</div>';
  }
  function redrawCourse(root, cc) {
    const tmp = document.createElement('div');
    tmp.innerHTML = courseExtra(A.courseById(cc.id) || cc);
    const old = root.querySelector('.group-title + .card .as-head, .group-title + .card .btn-row [data-x=as-add]');
    const titles = [...root.querySelectorAll('.group-title')].find((t) => t.textContent.includes('الدرجات خلال الفصل'));
    if (titles) { titles.nextElementSibling.replaceWith(tmp.children[1]); }
    return old;
  }
  function courseClick(b, cc, root) {
    const rows = Array.isArray(cc.assessments) ? cc.assessments.slice() : [];
    const x = b.dataset.x;
    if (x === 'as-add') rows.push({ name: 'كويز ' + (rows.length + 1), weight: 10, score: null });
    else if (x === 'as-preset') rows.push({ name: 'كويزات', weight: 20, score: null }, { name: 'ميدترم', weight: 30, score: null }, { name: 'مشروع/واجبات', weight: 10, score: null }, { name: 'فاينل', weight: 40, score: null });
    else if (x === 'as-del') rows.splice(Number(b.dataset.i), 1);
    else if (x === 'as-t') { S.upsert('courses', Object.assign({}, cc, { grade_target: Math.max(50, Math.min(100, (Number(cc.grade_target) || 90) + Number(b.dataset.d))) })); redrawCourse(root, cc); return true; }
    else return false;
    S.upsert('courses', Object.assign({}, cc, { assessments: rows }));
    redrawCourse(root, cc);
    return true;
  }
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-as]');
    if (!el) return;
    const cc = A.courseById(el.dataset.as);
    if (!cc) return;
    const rows = (cc.assessments || []).slice(), i = Number(el.dataset.i);
    const v = el.dataset.f === 'name' ? el.value.trim() : el.value.trim() === '' ? null : A.parseAmount(el.value);
    rows[i] = Object.assign({}, rows[i], { [el.dataset.f]: v });
    S.upsert('courses', Object.assign({}, cc, { assessments: rows }));
    redrawCourse(document.getElementById('sheetBody'), cc);
  });

  // ================= بطاقات المراجعة =================
  const BOX_DAYS = [0, 1, 2, 4, 8, 16, 30];
  const dueCards = (courseId) => st.cards.filter((c) => (!courseId || c.course_id === courseId) && (!c.due || c.due <= dateKey()));
  function cardsSection() {
    const lec = A.lectures();
    let out = A.secHead('بطاقات المراجعة', '<button class="link" data-action="card-add">بطاقة جديدة</button>');
    if (!st.cards.length) return out + '<div class="card">' + A.empty('book', 'ما فيه بطاقات', 'اكتب سؤال وجوابه لكل مادة، وراجعها يومياً — اللي ما تعرفه يرجع لك أكثر') + '</div>';
    out += '<div class="card flush"><ul class="list">' + lec.concat([{ id: '', name: 'عام', color: '#64748b' }]).map((c) => {
      const all = st.cards.filter((x) => (x.course_id || '') === c.id);
      if (!all.length) return '';
      const due = dueCards(c.id || null).filter((x) => (x.course_id || '') === c.id).length;
      const mastered = all.filter((x) => (x.box || 1) >= 5).length;
      return '<li class="row" data-action="card-review" data-id="' + c.id + '"><div class="ico" style="' + tint(c.color || '#1A8A8F') + '">' + I('book') + '</div><div class="main"><div class="title"><span class="t">' + h(c.name) + '</span></div>' +
        '<div class="sub">' + all.length + ' بطاقة · حفظت ' + mastered + '</div></div>' + (due ? '<span class="tag brand">راجع ' + due + '</span>' : '<span class="tag">✓</span>') + '</li>';
    }).join('') + '</ul></div>';
    return out;
  }
  function cardForm() {
    const lec = A.lectures();
    A.openSheet({
      title: 'بطاقة مراجعة', saveLabel: 'أضف',
      body: '<div class="field"><label>المادة</label><select name="course"><option value="">عام</option>' + lec.map((c) => '<option data-noi18n value="' + c.id + '">' + h(c.name) + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>السؤال</label><textarea name="q" placeholder="مثلاً: What is a function?"></textarea></div>' +
        '<div class="field"><label>الجواب</label><textarea name="a"></textarea></div>' +
        '<label class="switch"><input type="checkbox" name="more" checked> أضيف بطاقة ثانية بعدها</label>',
      onSave(root) {
        const q = A.val(root, 'q'), a = A.val(root, 'a');
        if (!q || !a) throw new Error('اكتب السؤال والجواب');
        S.upsert('cards', { course_id: A.val(root, 'course') || null, q, a, box: 1, due: dateKey() });
        A.toast('انضافت ✓');
        if (root.querySelector('[name=more]').checked) { root.querySelector('[name=q]').value = ''; root.querySelector('[name=a]').value = ''; root.querySelector('[name=q]').focus(); return false; }
      },
    });
  }
  function reviewSheet(courseId) {
    let queue = dueCards(null).filter((x) => (x.course_id || '') === (courseId || ''));
    if (!queue.length) queue = st.cards.filter((x) => (x.course_id || '') === (courseId || '')).slice().sort((a, b) => (a.box || 1) - (b.box || 1)).slice(0, 10);
    let i = 0, shown = false, right = 0, total = queue.length;
    const draw = () => {
      if (i >= queue.length) return '<div class="empty"><div class="ico">🎉</div><b>خلصت المراجعة</b><p>عرفت ' + right + ' من ' + total + '</p></div>';
      const c = queue[i];
      return '<div class="small muted" style="text-align:center;margin-bottom:8px">' + (i + 1) + ' / ' + queue.length + '</div>' +
        '<div class="flash' + (shown ? ' open' : '') + '" data-flip><div class="fq">' + h(c.q) + '</div>' + (shown ? '<div class="fa">' + h(c.a) + '</div>' : '<div class="small muted" style="margin-top:14px">اضغط عشان تشوف الجواب</div>') + '</div>' +
        (shown ? '<div class="btn-row" style="margin-top:14px"><button class="btn danger" data-ans="0">ما عرفتها</button><button class="btn primary" data-ans="1">عرفتها ✓</button></div>' : '');
    };
    A.openSheet({
      title: 'مراجعة', cancelLabel: 'تم', body: draw(),
      mount(root) {
        root.onclick = (e) => {
          if (e.target.closest('[data-flip]') && !shown) { shown = true; root.innerHTML = draw(); return; }
          const b = e.target.closest('[data-ans]');
          if (!b) return;
          const c = queue[i];
          if (b.dataset.ans === '1') {
            right++;
            const box = Math.min(BOX_DAYS.length - 1, (c.box || 1) + 1), d = new Date(); d.setDate(d.getDate() + BOX_DAYS[box]);
            S.upsert('cards', Object.assign({}, c, { box, due: dateKey(d) }));
          } else {
            S.upsert('cards', Object.assign({}, c, { box: 1, due: dateKey() }));
            queue.push(Object.assign({}, c, { box: 1 }));
          }
          i++; shown = false; root.innerHTML = draw();
        };
      },
    });
  }

  // ================= وضع التركيز + أصوات هادية =================
  let audio = null;
  function stopSound() { if (audio) { try { audio.ctx.close(); } catch (e) { /* تجاهل */ } audio = null; } }
  function playSound(kind) {
    stopSound();
    if (kind === 'none') return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = kind === 'white' ? w : (last + 0.02 * w) / 1.02; d[i] = kind === 'white' ? w * 0.25 : last * 3.5; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = kind === 'rain' ? 'highpass' : 'lowpass'; filter.frequency.value = kind === 'rain' ? 900 : kind === 'waves' ? 500 : 8000;
    const gain = ctx.createGain(); gain.gain.value = kind === 'waves' ? 0.5 : 0.35;
    if (kind === 'waves') { const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.12; lg.gain.value = 0.35; lfo.connect(lg).connect(gain.gain); lfo.start(); }
    src.connect(filter).connect(gain).connect(ctx.destination); src.start();
    audio = { ctx };
  }
  let wakeLock = null, focusTimer = null;
  function focusMode() {
    const tKey = 'hayati-timer';
    const get = () => { try { return JSON.parse(localStorage.getItem(tKey) || 'null'); } catch (e) { return null; } };
    if (!get()) { const b = document.querySelector('[data-action=timer-start]'); if (b) b.click(); }
    const ov = document.createElement('div');
    ov.className = 'focus-ov';
    ov.innerHTML = '<button class="focus-x" aria-label="خروج">✕</button><div class="focus-course"></div><div class="focus-time num">--:--</div><div class="focus-phase"></div>' +
      '<div class="focus-sounds">' + [['none', 'هدوء'], ['rain', '🌧️ مطر'], ['waves', '🌊 أمواج'], ['white', '〰️ ضوضاء']].map(([k, l]) => '<button data-snd="' + k + '" class="' + (k === 'none' ? 'on' : '') + '">' + l + '</button>').join('') + '</div>' +
      '<p class="focus-tip">حط جوالك على «عدم الإزعاج» وخلك هني 🤍</p>';
    document.body.appendChild(ov);
    const tick = () => {
      const t = get();
      const left = t ? (t.ends_at ? Math.max(0, t.ends_at - Date.now()) : t.remaining) : 0;
      ov.querySelector('.focus-time').textContent = A.mmss(left);
      ov.querySelector('.focus-phase').textContent = !t ? 'انتهت الجلسة 🎉' : t.phase === 'break' ? 'استراحة' : t.ends_at ? 'تركيز' : 'متوقف';
      const c = t && t.course_id && A.courseById(t.course_id);
      ov.querySelector('.focus-course').textContent = c ? c.name : 'مذاكرة';
    };
    tick(); focusTimer = setInterval(tick, 500);
    try { navigator.wakeLock && navigator.wakeLock.request('screen').then((w) => { wakeLock = w; }).catch(() => {}); } catch (e) { /* تجاهل */ }
    ov.onclick = (e) => {
      const s = e.target.closest('[data-snd]');
      if (s) { ov.querySelectorAll('[data-snd]').forEach((x) => x.classList.toggle('on', x === s)); playSound(s.dataset.snd); return; }
      if (e.target.closest('.focus-x')) { clearInterval(focusTimer); stopSound(); try { wakeLock && wakeLock.release(); } catch (err) { /* تجاهل */ } ov.remove(); A.render(); }
    };
  }

  // ================= تمارين بديلة =================
  const ALT = {
    'Smith Flat Chest Press': ['DB Flat Press', 'Barbell Bench Press', 'Machine Chest Press'],
    'Machine Incline Chest': ['Incline DB Press', 'Smith Incline Press', 'Low-to-High Cable Fly'],
    'DB Overhead Press': ['Machine Shoulder Press', 'Smith Overhead Press', 'Arnold Press'],
    'Machine Butterfly': ['Cable Crossover', 'DB Fly', 'Pec Deck'],
    'Push Up': ['Knee Push Up', 'Dips (Chest)', 'Machine Chest Press'],
    'Cable Kickback Extension': ['DB Kickback', 'Overhead Cable Extension', 'Bench Dips'],
    'DB Lateral Raise': ['Cable Lateral Raise', 'Machine Lateral Raise', 'Upright Row'],
    'V Bar Pushdown': ['Rope Pushdown', 'Straight Bar Pushdown', 'Close Grip Bench Press'],
    'T Bar Row': ['Barbell Row', 'Seated Cable Row', 'Chest Supported DB Row'],
    'Lat Pull Down': ['Pull Up', 'Assisted Pull Up', 'Single Arm Cable Pulldown'],
    '1 Arm Row': ['Machine Row', 'Seal Row', 'Cable Single Arm Row'],
    'Cable One Hand Seated Row': ['Seated Cable Row', 'Machine Row', 'DB Row'],
    'DB Shrugs': ['Barbell Shrugs', 'Smith Shrugs', 'Cable Shrugs'],
    'Cable Rear Delt': ['Reverse Pec Deck', 'Face Pull', 'Bent Over DB Reverse Fly'],
    'Cable Bayesian Curl': ['Incline DB Curl', 'Cable Curl', 'Barbell Curl'],
    'DB Preacher Curl': ['Machine Preacher Curl', 'EZ Bar Preacher Curl', 'Concentration Curl'],
    'Cable Reverse Curl': ['EZ Bar Reverse Curl', 'Hammer Curl', 'DB Reverse Curl'],
    'DB Wrist Curl': ['Barbell Wrist Curl', 'Cable Wrist Curl', 'Wrist Roller'],
    'Smith Squat': ['Barbell Back Squat', 'Hack Squat', 'Goblet Squat'],
    'Lunges with Dumbbell': ['Walking Lunges', 'Bulgarian Split Squat', 'Smith Reverse Lunge'],
    'Leg Extension': ['Sissy Squat', 'Single Leg Extension', 'Front Squat'],
    'Leg Press': ['Hack Squat', 'Smith Squat', 'Belt Squat'],
    'Leg Curl': ['Seated Leg Curl', 'Romanian Deadlift', 'Nordic Curl'],
    'Calf Raise': ['Seated Calf Raise', 'Leg Press Calf Raise', 'Single Leg DB Calf Raise'],
    'Hanging Leg Raise': ['Captain Chair Leg Raise', 'Lying Leg Raise', 'Reverse Crunch'],
    'DB Crunch': ['Cable Crunch', 'Machine Crunch', 'Decline Crunch'],
    'Sit Ups': ['Crunches', 'Decline Sit Up', 'V-Ups'],
    'Plank': ['Side Plank', 'Dead Bug', 'Ab Wheel Rollout'],
  };
  const yt = (n) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(n + ' exercise proper form');
  wrap('exExtra', (prev, c, x, i) => prev(c, x, i) + (ALT[x.name] ? '<button class="alt-btn" data-alt="' + i + '">' + I('repeat') + 'الجهاز مشغول؟ بديل</button><div class="alt-list hidden" data-altlist="' + i + '">' +
    ALT[x.name].map((n) => '<a href="' + yt(n) + '" target="_blank" rel="noopener">' + I('play') + '<span>' + h(n) + '</span></a>').join('') + '</div>' : ''));
  wrap('wkClick', (prev, e, c, root) => {
    const b = e.target.closest('[data-alt]');
    if (b) { const l = root.querySelector('[data-altlist="' + b.dataset.alt + '"]'); if (l) l.classList.toggle('hidden'); return true; }
    if (e.target.closest('.alt-list')) return e.target.closest('a') ? false : true;
    return prev(e, c, root);
  });

  // ================= المناسبات والتجديدات =================
  const EV_KINDS = { birthday: ['🎂', 'عيد ميلاد'], renewal: ['🪪', 'تجديد'], other: ['📌', 'مناسبة'] };
  function nextOccur(ev) {
    const d = parseDate(ev.date);
    if (!ev.yearly) return d;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const n = new Date(now.getFullYear(), d.getMonth(), d.getDate());
    if (n < now) n.setFullYear(n.getFullYear() + 1);
    return n;
  }
  const upcoming = (days) => st.events.map((e) => ({ e, d: nextOccur(e) })).filter((x) => { const n = A.daysBetween(new Date(), x.d); return n >= 0 && n <= days; }).sort((a, b) => a.d - b.d);
  function eventsCard() {
    const list = st.events.map((e) => ({ e, d: nextOccur(e) })).filter((x) => { const n = A.daysBetween(new Date(), x.d); return n >= 0 && n <= (Number(x.e.remind_days) || 7); }).sort((a, b) => a.d - b.d);
    if (!list.length) return '';
    return '<div class="card notice">' + list.map(({ e, d }) => { const n = A.daysBetween(new Date(), d); const [em] = EV_KINDS[e.kind] || EV_KINDS.other;
      return '<div class="row" data-action="ev-edit" data-id="' + e.id + '"><div class="ico" style="' + tint('#ec4899') + ';font-size:19px">' + em + '</div><div class="main"><div class="title"><span class="t">' + h(e.title) + '</span></div><div class="sub">' + (n === 0 ? 'اليوم!' : n === 1 ? 'بكرة' : 'بعد ' + A.nDays(n)) + '</div></div></div>'; }).join('') + '</div>';
  }
  function eventsView() {
    const list = st.events.map((e) => ({ e, d: nextOccur(e) })).sort((a, b) => a.d - b.d);
    if (!list.length) return '<div class="card">' + A.empty('calendar', 'ما فيه مناسبات', 'أضف أعياد الميلاد، تجديد السيبيآر، الليسن، تأمين السيارة… وينبّهك قبلها') + '</div>';
    return '<div class="card flush"><ul class="list">' + list.map(({ e, d }) => { const n = A.daysBetween(new Date(), d); const [em, lbl] = EV_KINDS[e.kind] || EV_KINDS.other;
      return '<li class="row" data-action="ev-edit" data-id="' + e.id + '"><div class="ico" style="' + tint('#ec4899') + ';font-size:19px">' + em + '</div><div class="main"><div class="title"><span class="t">' + h(e.title) + '</span></div>' +
        '<div class="sub">' + lbl + ' · ' + d.getDate() + ' ' + A.MONTHS[d.getMonth()] + (e.yearly ? ' · كل سنة' : '') + '</div></div><span class="tag ' + (n <= 7 ? 'brand' : '') + '">' + (n < 0 ? 'فات' : n === 0 ? 'اليوم' : A.nDays(n)) + '</span></li>'; }).join('') + '</ul></div>';
  }
  function eventForm(ev) {
    const v = ev || { title: '', date: dateKey(), kind: 'birthday', yearly: true, remind_days: 7 };
    A.openSheet({
      title: ev ? 'تعديل' : 'مناسبة / تجديد',
      body: '<div class="seg" id="evk">' + Object.entries(EV_KINDS).map(([k, [em, l]]) => '<button type="button" data-k="' + k + '" class="' + (v.kind === k ? 'on' : '') + '">' + em + ' ' + l + '</button>').join('') + '</div>' +
        '<div class="field"><label>العنوان</label><input name="title" value="' + h(v.title) + '" placeholder="مثلاً: عيد ميلاد أمي، تجديد الليسن"></div>' +
        '<div class="two"><div class="field"><label>التاريخ</label><input type="date" name="date" value="' + h(v.date) + '"></div><div class="field"><label>نبّهني قبلها</label><select name="rd">' + [1, 3, 7, 14, 30].map((d) => '<option value="' + d + '"' + (Number(v.remind_days) === d ? ' selected' : '') + '>' + A.nDays(d) + '</option>').join('') + '</select></div></div>' +
        '<label class="switch"><input type="checkbox" name="yearly"' + (v.yearly ? ' checked' : '') + '> تتكرر كل سنة</label>' +
        (ev ? '<button class="btn danger block" type="button" id="evDel" style="margin-top:12px">' + I('trash') + 'حذف</button>' : ''),
      mount(root) {
        root.dataset.k = v.kind;
        A.segPick(root, '#evk', (k) => { root.dataset.k = k; root.querySelector('[name=yearly]').checked = k === 'birthday' || k === 'renewal'; });
        const del = root.querySelector('#evDel');
        if (del) del.onclick = async () => { if (await A.ask('تحذفها؟')) { S.remove('events', ev.id); A.closeSheet(); } };
      },
      onSave(root) {
        const title = A.val(root, 'title');
        if (!title) throw new Error('اكتب العنوان');
        S.upsert('events', Object.assign({}, ev || {}, { title, date: A.val(root, 'date') || dateKey(), kind: root.dataset.k, yearly: root.querySelector('[name=yearly]').checked, remind_days: Number(A.val(root, 'rd')) }));
        A.toast('انحفظت ✓');
      },
    });
  }

  // ================= قائمة المشتريات =================
  function shoppingView() {
    const items = st.shopping.slice().sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0));
    const done = items.filter((x) => x.done);
    return '<form class="shop-add" id="shopForm"><input name="item" placeholder="أضف غرض… (خبز، حليب ×2)" autocomplete="off"><button class="btn primary" type="submit">' + I('plus') + '</button></form>' +
      (items.length ? '<div class="card flush"><ul class="list">' + items.map((x) => '<li class="row' + (x.done ? ' done' : '') + '" data-action="shop-toggle" data-id="' + x.id + '"><button class="check' + (x.done ? ' on' : '') + '" aria-label="تم">' + I('check') + '</button>' +
        '<div class="main"><div class="title"><span class="t">' + h(x.name) + '</span>' + (x.qty ? '<span class="tag">' + h(x.qty) + '</span>' : '') + '</div></div><button class="icon-x" data-action="shop-del" data-id="' + x.id + '" aria-label="حذف">✕</button></li>').join('') + '</ul></div>' :
        '<div class="card">' + A.empty('cart', 'القائمة فاضية', 'اكتب الأغراض فوق، وشطّبها وأنت بالسوبرماركت') + '</div>') +
      (done.length ? '<button class="btn primary block" style="margin-top:6px" data-action="shop-finish">' + I('wallet') + 'خلصت التسوق — سجّل المبلغ (' + done.length + ' أغراض)</button>' : '');
  }
  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'shopForm') return;
    e.preventDefault();
    const raw = e.target.item.value.trim();
    if (!raw) return;
    const m = raw.match(/^(.*?)\s*[×x]\s*(\d+)$/);
    S.upsert('shopping', { name: m ? m[1] : raw, qty: m ? '×' + m[2] : null, done: false });
    setTimeout(() => { const i = document.querySelector('#shopForm input'); if (i) i.focus(); }, 50);
  });
  function shopFinish() {
    const done = st.shopping.filter((x) => x.done);
    A.openSheet({
      title: 'سجّل التسوق', saveLabel: 'سجّل',
      body: '<div class="amount-box"><input name="amt" inputmode="decimal" placeholder="0.000"><small>كم دفعت؟ (د.ب)</small></div><div class="field"><label>المحل</label><input name="shop" placeholder="لولو، كارفور…"></div>' +
        '<p class="small muted">' + done.map((x) => h(x.name)).join('، ') + '</p>',
      onSave(root) {
        const a = A.parseAmount(A.val(root, 'amt'));
        if (!(a > 0)) throw new Error('اكتب المبلغ');
        S.upsert('transactions', { kind: 'expense', amount: Math.round(a * 1000) / 1000, category: 'بقالة وتسوق', merchant: A.val(root, 'shop') || 'تسوق', note: done.map((x) => x.name).join('، ').slice(0, 200), occurred_at: new Date().toISOString(), source: 'manual', needs_review: false });
        for (const x of done) S.remove('shopping', x.id);
        A.toast('انسجل بالمصاريف ✓');
      },
    });
  }

  // ================= الاختبارات الجاية (بالمهام) =================
  function examsCard() {
    const exams = st.tasks.filter((t) => t.kind === 'exam' && !t.done && t.due_at && new Date(t.due_at) >= new Date()).sort((a, b) => new Date(a.due_at) - new Date(b.due_at));
    if (!exams.length) return '';
    const planned = (ex) => st.tasks.some((t) => t.kind === 'study' && t.title.includes(ex.title));
    const todo = exams.filter((e) => !planned(e));
    return '<div class="card exams-card"><div class="m-head"><b>📝 الاختبارات الجاية</b></div>' + exams.slice(0, 6).map((e) => {
      const d = new Date(e.due_at), n = A.daysBetween(new Date(), d);
      return '<div class="ex-line"><span class="ex-n num' + (n <= 3 ? ' soon' : '') + '">' + n + '<small>' + (n === 1 ? 'يوم' : 'أيام') + '</small></span><div style="flex:1;min-width:0"><b><bdi>' + h(e.title) + '</bdi></b><div class="small muted">' + A.DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + A.MONTHS[d.getMonth()] + '</div></div>' + (planned(e) ? '<span class="tag brand">✓ خطة</span>' : '') + '</div>';
    }).join('') + (todo.length ? '<button class="btn primary block" style="margin-top:10px" data-action="plan-all">' + I('book') + 'سوّ خطة مراجعة لكل الاختبارات (' + todo.length + ')</button>' : '') + '</div>';
  }
  function planAll() {
    const exams = st.tasks.filter((t) => t.kind === 'exam' && !t.done && t.due_at && new Date(t.due_at) > new Date() && !st.tasks.some((x) => x.kind === 'study' && x.title.includes(t.title)));
    let made = 0;
    for (const ex of exams) {
      const n = Math.min(3, Math.max(1, A.daysBetween(new Date(), new Date(ex.due_at)) - 1));
      for (let i = n; i >= 1; i--) {
        const d = new Date(ex.due_at); d.setDate(d.getDate() - i); d.setHours(20, 0, 0, 0);
        if (d < new Date()) continue;
        S.upsert('tasks', { title: 'مراجعة ' + ex.title + ' (' + (n - i + 1) + '/' + n + ')', kind: 'study', due_at: d.toISOString(), course_id: ex.course_id || null, notes: 'مدة 60 دقيقة', done: false });
        made++;
      }
    }
    A.toast(made ? 'انضافت ' + made + ' جلسات مراجعة الساعة 8 بالليل 📚' : 'ما فيه أيام كافية');
  }

  // ================= اليوميات والمزاج =================
  const MOODS = ['😞', '😕', '😐', '🙂', '😄'];
  function journalCard() {
    if (new Date().getHours() < 17) return '';
    const k = dateKey(), j = st.journal.find((x) => x.date === k);
    return A.secHead('كيف كان يومك؟') + '<div class="card"><div class="moods">' + MOODS.map((m, i) => '<button class="mood' + (j && j.mood === i + 1 ? ' on' : '') + '" data-action="mood" data-m="' + (i + 1) + '">' + m + '</button>').join('') + '</div>' +
      '<textarea class="jr-text" id="jrText" placeholder="سطر عن يومك… (اختياري)">' + h((j && j.text) || '') + '</textarea>' +
      '<button class="btn ghost block" data-action="jr-save" style="margin-top:8px">' + (j && j.text ? 'تحديث' : 'احفظ') + '</button></div>';
  }
  function saveJournal(patch) {
    const k = dateKey(), j = st.journal.find((x) => x.date === k) || { id: S.stableId('journal:' + k), date: k, mood: null, text: '' };
    S.upsert('journal', Object.assign({}, j, patch));
  }
  function moodSection() {
    const list = st.journal.filter((j) => j.mood).sort((a, b) => (a.date < b.date ? -1 : 1));
    let out = A.secHead('مزاجك ويومياتك');
    if (!list.length) return out + '<div class="card">' + A.empty('sparkle', 'ما فيه يوميات', 'كل مساء اختر مزاجك واكتب سطر عن يومك') + '</div>';
    const byDay = Array.from({ length: 7 }, () => []);
    for (const j of list) byDay[parseDate(j.date).getDay()].push(j.mood);
    const avg = byDay.map((a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0));
    const best = avg.indexOf(Math.max(...avg));
    out += '<div class="card"><div class="mood-strip">' + list.slice(-14).map((j) => '<div><span>' + MOODS[j.mood - 1] + '</span><small>' + j.date.slice(8) + '</small></div>').join('') + '</div>' +
      (list.length >= 5 ? '<p class="small" style="margin:10px 0 0">أحسن أيامك غالباً: <b>' + A.DAYS[best] + '</b> ' + MOODS[Math.round(avg[best]) - 1] + '</p>' : '') + '</div>';
    const notes = list.filter((j) => j.text).slice(-5).reverse();
    if (notes.length) out += '<div class="card flush"><ul class="list">' + notes.map((j) => '<li class="row" style="cursor:default"><span style="font-size:22px">' + MOODS[j.mood - 1] + '</span><div class="main"><div class="sub">' + A.dayLabel(parseDate(j.date)) + '</div><div style="white-space:normal">' + h(j.text) + '</div></div></li>').join('') + '</ul></div>';
    return out;
  }

  // ================= المساعد الذكي =================
  // DW-037: يشتغل بطريقتين: داخل Claude (sample)، أو بالتطبيق نفسه لما تكون مسجّل دخول (دالة lecture-ai بـ Supabase)
  let sampleFn = null, chatTurns = [], chatCtl = null;
  const viaServer = () => !sampleFn && !!(S && S.status && S.status.signedIn && S.invokeFn);
  function showBtn() {
    const btn = document.getElementById('assistBtn');
    if (!btn) return;
    const on = !!sampleFn || viaServer();
    btn.classList.toggle('hidden', !on);
    if (on && !btn.onclick) { btn.innerHTML = I('sparkle'); btn.onclick = assistantSheet; }
  }
  (async () => {
    if (window.claude && typeof window.claude.use === 'function') sampleFn = await window.claude.use('sample');
    showBtn();
  })();
  if (S && S.subscribe) S.subscribe(showBtn);
  function dataSnapshot() {
    const now = new Date(), mk = A.monthKey(now);
    const monthTx = A.txInMonth(mk);
    const byCat = {}, byMer = {};
    for (const t of monthTx) if (t.kind === 'expense') { byCat[t.category] = +((byCat[t.category] || 0) + Number(t.amount)).toFixed(3); const k = t.merchant || t.category; byMer[k] = +((byMer[k] || 0) + Number(t.amount)).toFixed(3); }
    const months = []; for (let i = 0; i < 4; i++) { const k = A.shiftKey(mk, -i); const s = A.sums(A.txInMonth(k)); months.push({ month: k, spent: +s.exp.toFixed(3), income: +s.inc.toFixed(3) }); }
    const cum = A.cumulative();
    return {
      today: dateKey() + ' ' + A.DAYS[now.getDay()] + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()),
      currency: 'BHD', budget: st.settings.budget, category_budgets: st.settings.cat_budgets || {},
      this_month: { by_category: byCat, top_merchants: Object.entries(byMer).sort((a, b) => b[1] - a[1]).slice(0, 8) }, last_months: months,
      weekly_schedule: st.courses.map((c) => ({ name: c.name, type: c.type || 'lecture', days: (c.days || []).map((d) => A.DAYS[d]), time: c.start_time + '-' + c.end_time, room: c.room || '', absences: (c.absences || []).length })),
      open_tasks: st.tasks.filter((t) => !t.done).map((t) => ({ title: t.title, kind: t.kind, due: t.due_at ? t.due_at.slice(0, 16) : null })).slice(0, 30),
      goals: st.goals.map((g) => ({ name: g.name, target: g.target, saved: g.saved, deadline: g.deadline || null })),
      // أسماء الناس ما تطلع للخدمة (DW-037): المبلغ والاتجاه بس
      debts_open: st.debts.filter((d) => !d.settled).map((d) => (Object.assign(viaServer() ? {} : { person: d.person }, { amount: d.amount, direction: d.direction === 'lent' ? 'owes me' : 'I owe' }))),
      subscriptions: st.subscriptions.filter((s) => s.active !== false).map((s) => ({ name: s.name, amount: s.amount, cycle: s.cycle })),
      gpa: { cumulative: cum.gpa != null ? +cum.gpa.toFixed(2) : null, credits: cum.credits },
      study_minutes_last_7_days: st.study_sessions.filter((x) => Date.now() - new Date(x.started_at) < 7 * 86400000).reduce((s, x) => s + Number(x.minutes), 0),
      body_weight: st.body.slice(-4).map((b) => ({ date: b.date, kg: b.weight })),
    };
  }
  const RULES = () => 'أنت مساعد داخل تطبيق «حياتي» الشخصي لشخص بالبحرين (طالب مدرسة أو جامعة، أو موظف…). جاوب بالعربي بلهجة خليجية بسيطة، باختصار (3–6 أسطر أو نقاط قليلة)، ' +
    'وبالأرقام من البيانات تحت فقط. لا تخترع أرقام أو مواعيد مو موجودة؛ لو المعلومة ناقصة قل كذا. المبالغ بالدينار البحريني بثلاث خانات عشرية. ' +
    'لو طلب خطة (مذاكرة/توفير) اعطه خطة عملية بأيام وأوقات تناسب جدوله.\n\nبيانات المستخدم (JSON):\n' + JSON.stringify(dataSnapshot());
  function assistantSheet() {
    const QUICK = ['كم صرفت على القهوة والأكل هالشهر؟', 'رتّب لي مذاكرة هالأسبوع حسب جدولي واختباراتي', 'كيف أوفّر أسرع لهدف الزواج؟', 'وش أكثر شي يضيّع فلوسي؟'];
    const drawMsgs = () => chatTurns.map((t) => '<div class="msg ' + t.role + '">' + h(t.content).replace(/\n/g, '<br>') + '</div>').join('');
    A.openSheet({
      title: 'المساعد الذكي', cancelLabel: 'تم',
      body: '<div class="chat" id="chat">' + (chatTurns.length ? drawMsgs() : '<div class="empty"><div class="ico">' + I('sparkle') + '</div><b>اسألني عن يومك</b><p>أجاوبك من بياناتك: صرفك، جدولك، مهامك، وأهدافك</p></div>') + '</div>' +
        '<div class="chips quick" style="margin:10px 0">' + QUICK.map((q) => '<button type="button" class="chip" data-q="' + h(q) + '">' + h(q) + '</button>').join('') + '</div>' +
        '<form class="chat-form" id="chatForm"><input name="q" placeholder="اكتب سؤالك…" autocomplete="off"><button class="btn primary" type="submit" aria-label="إرسال">' + I('arrowUp') + '</button></form>' +
        '<p class="small muted" style="margin:8px 4px 0">' + (viaServer() ? 'سؤالك وملخص أرقامك (بدون أسماء الناس) يروحون لـ Claude عشان الجواب، وما ينحفظون. كل سؤال يحسب من محاولات اليوم.' : 'يستخدم حسابك في Claude. أول مرة بيطلب إذنك.') + '</p>',
      mount(root) {
        const chat = root.querySelector('#chat');
        const ask = async (q) => {
          if (!q || (!sampleFn && !viaServer())) return;
          if (chatCtl) chatCtl.abort();
          chatTurns.push({ role: 'user', content: q });
          chat.innerHTML = drawMsgs() + '<div class="msg assistant typing">يفكّر…</div>';
          chat.scrollTop = chat.scrollHeight;
          const bubble = chat.lastElementChild;
          chatCtl = new AbortController();
          try {
            const turns = chatTurns.slice(-8);
            if (viaServer()) {
              const r = await S.invokeFn('lecture-ai', { mode: 'ask', messages: turns, data: JSON.stringify(dataSnapshot()) });
              const text = String((r && r.text) || '').trim();
              if (!text) throw { code: 'empty' };
              bubble.classList.remove('typing'); bubble.innerHTML = h(text).replace(/\n/g, '<br>');
              chatTurns.push({ role: 'assistant', content: text });
              chat.scrollTop = chat.scrollHeight;
              return;
            }
            const { text } = await sampleFn([{ role: 'user', content: RULES() }].concat(turns[0].role === 'assistant' ? turns.slice(1) : turns), {
              cache: false, signal: chatCtl.signal, onText: ({ text: t }) => { bubble.classList.remove('typing'); bubble.innerHTML = h(t).replace(/\n/g, '<br>'); chat.scrollTop = chat.scrollHeight; },
            });
            chatTurns.push({ role: 'assistant', content: text });
          } catch (e) {
            const code = (e && e.code) || (e && e.message);
            const msg = { not_granted: 'ما انسمح للمساعد يستخدم Claude.', rate_limited: 'وصلت الحد المسموح حالياً، جرّب بعد شوي.', limit: 'خلصت محاولات اليوم ✨ · جرّب بكرة', signin: 'سجّل دخول أول', cancelled: '' }[code];
            if (e && e.text) chatTurns.push({ role: 'assistant', content: e.text });
            bubble.classList.remove('typing');
            bubble.textContent = e && e.text ? e.text : msg != null ? msg : 'صار خلل، جرّب مرة ثانية.';
            if (e && (e.code === 'not_granted' || e.code === 'sampling_disabled')) document.getElementById('assistBtn').classList.add('hidden');
          }
        };
        root.querySelector('#chatForm').onsubmit = (e) => { e.preventDefault(); const q = e.target.q.value.trim(); e.target.q.value = ''; ask(q); };
        root.querySelector('.quick').onclick = (e) => { const b = e.target.closest('[data-q]'); if (b) ask(b.dataset.q); };
        chat.scrollTop = chat.scrollHeight;
      },
    });
  }

  // ================= الربط =================
  wrap('todayTop', (prev) => prev() + '<section data-tk="events">' + eventsCard() + '</section>');
  wrap('todayMid', (prev) => prev() + '<section data-tk="journal">' + journalCard() + '</section>');
  wrap('viewHealth', (prev) => prev() + moodSection());
  // DW-048: اختصار «اسأل حياتي» من أيقونة التطبيق
  E.openAssistant = () => { if (sampleFn || viaServer()) assistantSheet(); else A.toast('«اسأل حياتي» يشتغل لما تسجّل دخول بحسابك'); };
  E.goalsTop = goalsTop;
  E.moneyActions = () => '<button class="btn ghost block" style="margin:10px 0 4px" data-action="year">' + I('chart') + 'ملخص السنة</button>';
  E.courseExtra = courseExtra;
  E.courseClick = courseClick;
  E.focusExtra = () => '<button class="btn primary block" style="margin:14px 0 4px" data-action="focus-mode">🎧 وضع التركيز (شاشة كاملة + أصوات هادية)</button>' + cardsSection();
  E.chooserItems = (item) => item('event', 'calendar', '#ec4899', 'مناسبة / تجديد', 'عيد ميلاد، الليسن، السيبيآر…') + item('shop', 'cart', '#16a34a', 'غرض للمشتريات', 'قائمة البقالة') + item('card', 'book', '#8b5cf6', 'بطاقة مراجعة', 'سؤال وجواب لمادة');
  E.pick = (k) => { if (k === 'event') eventForm(); else if (k === 'card') cardForm(); else if (k === 'shop') { A.closeSheet(); A.ui.tasksSeg = 'shop'; A.go('tasks'); } };
  E.tasksTop = () => {
    const cur = A.ui.tasksSeg || 'tasks';
    const bar = seg([['tasks', 'المهام'], ['shop', 'المشتريات'], ['events', 'المناسبات']], cur, 'tasks-seg');
    if (cur === 'shop') return { full: true, html: bar + shoppingView() };
    if (cur === 'events') return { full: true, html: bar + eventsView() };
    return bar + examsCard();
  };
  E.tasksFab = () => { const cur = A.ui.tasksSeg || 'tasks'; if (cur === 'events') { eventForm(); return true; } if (cur === 'shop') { const i = document.querySelector('#shopForm input'); if (i) i.focus(); return true; } return false; };
  wrap('action', (prev, name, el, e) => {
    const id = el.dataset.id;
    switch (name) {
      case 'tasks-seg': A.ui.tasksSeg = el.dataset.k; A.render(); return;
      case 'ch-add': chAddSheet(); return;
      case 'ch-del': A.ask('توقف التحدي؟', 'إيقاف').then((ok) => { if (ok) saveCh(challenges().filter((c) => c.id !== id)); }); return;
      case 'ch-week': saveCh(challenges().map((c) => (c.id === id ? Object.assign({}, c, { done: (c.done || []).concat(Number(el.dataset.w)) }) : c))); A.toast('عاش 💪'); return;
      case 'ch-restart': saveCh(challenges().map((c) => (c.id === id ? Object.assign({}, c, { start: dateKey(), done: [] }) : c))); return;
      case 'year': yearSheet(); return;
      case 'card-add': cardForm(); return;
      case 'card-review': reviewSheet(id || null); return;
      case 'focus-mode': focusMode(); return;
      case 'ev-edit': eventForm(st.events.find((x) => x.id === id)); return;
      case 'shop-toggle': { const x = st.shopping.find((y) => y.id === id); if (x) S.upsert('shopping', Object.assign({}, x, { done: !x.done })); return; }
      case 'shop-del': e && e.stopPropagation(); S.remove('shopping', id); return;
      case 'shop-finish': shopFinish(); return;
      case 'plan-all': planAll(); return;
      case 'mood': saveJournal({ mood: Number(el.dataset.m) }); return;
      case 'jr-save': { const t = document.getElementById('jrText'); saveJournal({ text: t ? t.value.trim() : '' }); A.toast('انحفظ ✓'); return; }
      default: prev(name, el, e);
    }
  });

  A.render();
})();
