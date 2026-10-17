// DW-058: استيراد الحساب كامل — كشف الحساب (Excel · CSV · PDF) أو ملف الرسائل (TXT · XML من «SMS Backup & Restore» · CSV)
// كل شي يتقرا بالجهاز. الـPDF بس، لأصحاب الحسابات، يقدر يروح للذكاء لو القارئ المحلي ما لقى شي. المكرر ما ينضاف.
(function () {
  'use strict';

  const A = window.App, E = window.Extras, P = window.SmsParser;
  if (!A || !E || !P) return;
  const { S, st, I, h } = A;
  const wrap = (name, fn) => { const prev = E[name]; E[name] = (...a) => fn(prev ? prev : () => '', ...a); };
  const MAX_DAYS = 365 * 15;
  const PDF_MAX = 6 * 1024 * 1024;
  const PDFJS = location.protocol === 'file:' ? 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/' : 'vendor/pdfjs/';
  const digits = (s) => String(s == null ? '' : s).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/٫/g, '.').replace(/٬/g, ',');

  // ---------- CSV ----------
  function csv(text) {
    const first = text.split('\n', 1)[0];
    const sep = [',', ';', '\t'].sort((a, b) => first.split(b).length - first.split(a).length)[0];
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; continue; }
      if (c === '"') q = true;
      else if (c === sep) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); if (row.some((x) => x.trim())) rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    row.push(cell); if (row.some((x) => x.trim())) rows.push(row);
    return rows;
  }

  // ---------- قيم الخلايا ----------
  function money(v) {
    if (typeof v === 'number') return v;
    let t = digits(v).trim();
    if (!t) return null;
    const neg = /^\(.*\)$/.test(t) || /^-|-$/.test(t) || /\bDR\b|مدين/i.test(t);
    t = t.replace(/[^\d.,]/g, '');
    if (/,\d{3}(\.|$)/.test(t)) t = t.replace(/,/g, ''); else t = t.replace(',', '.');
    const n = parseFloat(t);
    return isFinite(n) ? (neg ? -Math.abs(n) : n) : null;
  }
  function when(v, now) {
    if (typeof v === 'number' && v > 20000 && v < 80000) {   // رقم تاريخ Excel
      const d = new Date(Math.round((v - 25569) * 864e5)); return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes());
    }
    if (typeof v === 'number' && v > 1e12 && v < 4e12) return new Date(v);   // ملّي ثانية (XML الرسائل)
    const t = digits(v).trim();
    if (!t) return null;
    const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2}))?/.exec(t);
    if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3], +(iso[4] || 12), +(iso[5] || 0));
    return P.findDate(t, now, MAX_DAYS);
  }

  // ---------- الصفوف ← عمليات ----------
  const H = {
    date: /\bdate\b|تاريخ/i,
    text: /^(text|body|message|sms|content)$|الرسالة|نص الرسالة/i,
    desc: /desc|details|narration|particular|remark|transaction|merchant|beneficiary|البيان|التفاصيل|الوصف|الشرح|المستفيد/i,
    debit: /debit|withdraw|^dr$|money out|paid out|مدين|سحب|مسحوب|خصم/i,
    credit: /credit|deposit|^cr$|money in|paid in|دائن|إيداع|ايداع|وارد/i,
    amount: /^amount|المبلغ|القيمة/i,
    balance: /balance|الرصيد/i,
  };
  const SKIP = /opening balance|closing balance|balance b\/?f|balance c\/?f|brought forward|carried forward|الرصيد الافتتاحي|الرصيد الختامي|رصيد مرحل/i;

  function fromRows(rows, now) {
    let hi = -1, col = {};
    for (let i = 0; i < Math.min(rows.length, 25) && hi < 0; i++) {
      const c = {};
      rows[i].forEach((x, j) => { const t = String(x).trim(); if (!t || t.length > 40) return; for (const k of Object.keys(H)) if (c[k] == null && H[k].test(t)) { c[k] = j; break; } });
      if (c.date != null && (c.text != null || c.desc != null) && (c.text != null || c.debit != null || c.credit != null || c.amount != null)) { hi = i; col = c; }
    }
    if (hi < 0) return null;
    const out = [];
    let lastBal = null;
    for (const r of rows.slice(hi + 1)) {
      const d = when(r[col.date], now);
      if (col.text != null) {   // ملف رسائل: كل صف رسالة
        const body = String(r[col.text] || '');
        const p = P.parse(body, now);
        if (p) out.push({ kind: p.kind, amount: p.amount, currency: p.currency, merchant: p.merchant, category: p.category, at: d || p.date, review: p.needs_review, raw: body });
        continue;
      }
      const desc = String(r[col.desc] || '').replace(/\s+/g, ' ').trim();
      if (!d || SKIP.test(desc)) continue;
      let amt = null, kind = null;
      const dr = col.debit != null ? money(r[col.debit]) : null, cr = col.credit != null ? money(r[col.credit]) : null;
      if (dr) { amt = Math.abs(dr); kind = 'expense'; } else if (cr) { amt = Math.abs(cr); kind = 'income'; } else if (col.amount != null) {
        const a = money(r[col.amount]);
        if (a) { amt = Math.abs(a); kind = a < 0 ? 'expense' : /\bCR\b|دائن/i.test(String(r[col.amount])) ? 'income' : P.detectKind(desc).kind; }
      }
      if (!amt || !(amt > 0)) continue;
      if (col.balance != null) { const b = money(r[col.balance]); if (b != null) lastBal = { b, at: d }; }
      out.push({ kind, amount: Math.round(amt * 1000) / 1000, currency: window.HayatiCur ? HayatiCur.code() : 'BHD', merchant: desc.slice(0, 60), category: P.categorize(kind, desc, desc), at: d, review: col.amount != null && !(money(r[col.amount]) < 0) && !P.detectKind(desc).sure });
    }
    return { list: out, balance: lastBal };
  }

  // ملف نص: رسائل بسطر فاضي بينها (أو تصدير iMazing/الماك: كل رسالة تبدأ بتاريخ)
  function fromText(text, now) {
    let parts = text.split(/\n\s*\n/);
    if (parts.length < 3) parts = text.split(/\n(?=\s*(?:\[?\d{4}-\d{2}-\d{2}|\[?\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}))/);
    const out = [];
    for (const raw of parts) {
      const t = raw.trim(); if (!t) continue;
      const p = P.parse(t, now);
      if (p) out.push({ kind: p.kind, amount: p.amount, currency: p.currency, merchant: p.merchant, category: p.category, at: p.date || P.findDate(t, now, MAX_DAYS), review: p.needs_review, raw: t });
    }
    return { list: out, balance: null };
  }

  // «SMS Backup & Restore» (أندرويد): <sms date="ملّي ثانية" body="…" />
  function fromXml(text, now) {
    const doc = new DOMParser().parseFromString(text, 'text/xml');
    const out = [];
    for (const n of doc.querySelectorAll('sms')) {
      const body = n.getAttribute('body') || '';
      const p = P.parse(body, now);
      if (!p) continue;
      const ms = Number(n.getAttribute('date'));
      out.push({ kind: p.kind, amount: p.amount, currency: p.currency, merchant: p.merchant, category: p.category, at: p.date || (ms ? new Date(ms) : null), review: p.needs_review, raw: body });
    }
    return { list: out, balance: null };
  }

  // PDF: كل سطر فيه تاريخ ومبلغ = عملية (الرقم الأخير غالباً الرصيد لو فيه أكثر من رقم)
  let pdfLib = null;
  function loadPdf() {
    if (pdfLib) return pdfLib;
    pdfLib = window.pdfjsLib ? Promise.resolve(window.pdfjsLib) : new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = PDFJS + 'pdf.min.js';
      s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; res(window.pdfjsLib); };
      s.onerror = () => { pdfLib = null; rej(new Error('pdf')); };
      document.head.appendChild(s);
    });
    return pdfLib;
  }
  async function pdfLines(file) {
    const lib = await loadPdf();
    const doc = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
    const lines = [];
    for (let i = 1; i <= Math.min(doc.numPages, 60); i++) {
      const rows = new Map();
      for (const it of (await (await doc.getPage(i)).getTextContent()).items) {
        const y = Math.round(it.transform[5] / 3);
        rows.set(y, (rows.get(y) || []).concat([[it.transform[4], it.str]]));
      }
      [...rows.entries()].sort((a, b) => b[0] - a[0]).forEach(([, r]) => lines.push(r.sort((a, b) => a[0] - b[0]).map((x) => x[1]).join('  ')));
    }
    return lines;
  }
  function fromPdfLines(lines, now) {
    const out = [];
    for (const raw of lines) {
      const line = digits(raw);
      if (SKIP.test(line)) continue;
      const m = /^\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}[\s-][A-Za-z]{3}[\s-]\d{2,4})/.exec(line);
      if (!m) continue;
      const d = when(m[1], now);
      const nums = [...line.slice(m[0].length).matchAll(/-?\(?\d{1,3}(?:,\d{3})*\.\d{2,3}\)?(?:\s*(?:DR|CR))?/gi)].map((x) => x[0]);
      if (!d || !nums.length) continue;
      const a = money(nums[0]);
      if (!a) continue;
      const desc = line.slice(m[0].length).replace(/-?\(?\d{1,3}(?:,\d{3})*\.\d{2,3}\)?(?:\s*(?:DR|CR))?/gi, ' ').replace(/\s+/g, ' ').trim();
      const k = a < 0 || /\bDR\b/i.test(nums[0]) ? 'expense' : /\bCR\b/i.test(nums[0]) ? 'income' : P.detectKind(desc).kind;
      out.push({ kind: k, amount: Math.round(Math.abs(a) * 1000) / 1000, currency: window.HayatiCur ? HayatiCur.code() : 'BHD', merchant: desc.slice(0, 60), category: P.categorize(k, desc, desc), at: d, review: true });
    }
    return { list: out, balance: null };
  }

  // ---------- المكرر ----------
  const dayKey = (d) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  const keyOf = (kind, amount, d) => kind + '|' + Number(amount).toFixed(3) + '|' + dayKey(d);
  function dedupe(list) {
    const have = new Map();
    for (const t of st.transactions) { const k = keyOf(t.kind, t.amount, new Date(t.occurred_at)); have.set(k, (have.get(k) || 0) + 1); }
    const seen = new Map();
    let dup = 0;
    const fresh = [];
    for (const x of list) {
      const k = keyOf(x.kind, x.amount, x.at);
      const n = (seen.get(k) || 0) + 1; seen.set(k, n);
      if (n <= (have.get(k) || 0)) { dup++; continue; }   // نفس اليوم والمبلغ موجود قبل (أو من رسالة لصقتها)
      fresh.push(x);
    }
    return { fresh, dup };
  }

  async function readFile(file, now) {
    const name = String(file.name || '').toLowerCase();
    if (/\.xlsx$/.test(name)) return fromRows(await window.HayatiOffice.sheet(file), now) || { list: [], balance: null };
    if (/\.xls$/.test(name)) throw new Error('xls');
    if (/\.pdf$/.test(name) || /pdf$/.test(file.type)) return fromPdfLines(await pdfLines(file), now);
    const text = await file.text();
    if (/<smses|<sms\s/.test(text.slice(0, 4000))) return fromXml(text, now);
    if (/\.csv$/.test(name) || /^[^\n]*[,;\t][^\n]*[,;\t]/.test(text)) { const r = fromRows(csv(text), now); if (r && r.list.length) return r; }
    return fromText(text, now);
  }

  // ---------- الواجهة ----------
  function sheet() {
    let res = null;
    const fmt = (n) => A.fmt(n);
    const summary = () => {
      if (!res) return '';
      const { fresh, dup, all, balance } = res;
      if (!all.length) return '<div class="card">' + A.empty('alert', 'ما لقيت عمليات', 'تأكد إن الملف كشف حساب أو رسائل البنك') + '</div>';
      const dates = fresh.map((x) => x.at).sort((a, b) => a - b);
      const exp = fresh.filter((x) => x.kind === 'expense').reduce((s, x) => s + x.amount, 0), inc = fresh.filter((x) => x.kind === 'income').reduce((s, x) => s + x.amount, 0);
      const months = new Map();
      for (const x of fresh) { const k = x.at.getFullYear() + '-' + String(x.at.getMonth() + 1).padStart(2, '0'); const m = months.get(k) || { n: 0, e: 0, i: 0 }; m.n++; if (x.kind === 'expense') m.e += x.amount; else m.i += x.amount; months.set(k, m); }
      const review = fresh.filter((x) => x.review).length;
      return '<div class="card"><b>لقيت ' + all.length + ' عملية</b>' +
        (dates.length ? '<p class="small muted" style="margin:4px 0 8px">من <bdi>' + A.dayLabel(dates[0]) + ' ' + dates[0].getFullYear() + '</bdi> لين <bdi>' + A.dayLabel(dates[dates.length - 1]) + ' ' + dates[dates.length - 1].getFullYear() + '</bdi></p>' : '') +
        '<div class="split" style="display:flex;gap:12px"><div><small class="muted">صرف</small><br><b class="num" data-noi18n>' + fmt(exp) + '</b></div><div><small class="muted">دخل</small><br><b class="num" data-noi18n>' + fmt(inc) + '</b></div>' +
        (balance ? '<div><small class="muted">آخر رصيد بالكشف</small><br><b class="num" data-noi18n>' + fmt(balance.b) + '</b></div>' : '') + '</div>' +
        '<p class="small" style="margin:8px 0 0">بينضاف <b>' + fresh.length + '</b>' + (dup ? ' · ' + dup + ' موجودة عندك قبل وما بتتكرر' : '') + (review ? ' · ' + review + ' عليها «راجعها»' : '') + '</p></div>' +
        (months.size ? '<div class="card flush"><ul class="list">' + [...months.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 24).map(([k, m]) =>
          '<li class="row" style="cursor:default"><div class="main"><div class="title"><span class="t" data-noi18n>' + A.monthLabel(k) + '</span></div><div class="sub">' + m.n + ' عملية</div></div>' +
          '<div style="text-align:end"><div class="amount expense"><span class="num" data-noi18n>' + fmt(m.e) + '</span></div>' + (m.i ? '<small class="muted num" data-noi18n>+' + fmt(m.i) + '</small>' : '') + '</div></li>').join('') + '</ul></div>' : '');
    };
    A.openSheet({
      title: 'استيراد الحساب كامل',
      saveLabel: 'أضف العمليات',
      body: '<p class="small muted" style="margin:0 0 10px">ارفع <b>كشف الحساب</b> من تطبيق البنك (Excel أو CSV أو PDF)، أو <b>ملف رسائل البنك</b> (TXT، أو XML من تطبيق «SMS Backup & Restore» بالأندرويد). كل عملية تنحفظ بتاريخها، والمكرر ما ينضاف.</p>' +
        '<label class="btn primary block" style="margin-bottom:10px">' + I('upload') + 'اختار الملف<input type="file" id="biFile" accept=".xlsx,.csv,.pdf,.txt,.xml,text/csv,text/plain,text/xml,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden></label>' +
        '<p class="small muted" id="biStatus" style="margin:6px 4px 10px;min-height:18px"></p><div id="biOut"></div>' +
        '<details class="card" style="margin-top:10px"><summary class="small"><b>وين ألقى الملف؟</b></summary>' +
        '<p class="small" style="margin:8px 0 0">• <b>كشف الحساب:</b> تطبيق البنك ← الحساب ← كشف حساب (Statement) ← اختار الفترة ← صدّره Excel أو PDF ← احفظه بـ «الملفات».</p>' +
        '<p class="small" style="margin:6px 0 0">• <b>رسائل الآيفون:</b> الآيفون ما يصدّر الرسائل كملف. أسهل شي كشف الحساب، أو انسخ الرسائل والصقها بـ «لصق رسالة بنك» (كذا وحدة مرة وحدة).</p>' +
        '<p class="small" style="margin:6px 0 0">• <b>رسائل الأندرويد:</b> تطبيق «SMS Backup & Restore» ← نسخة احتياطية ← ارفع ملف الـ XML.</p></details>' +
        '<p class="small muted" style="margin:10px 4px 0">الملف يتقرا بجوالك وما يطلع منه، وأرقام البطاقات تنخفى قبل الحفظ.</p>',
      mount(root) {
        const status = (t) => { root.querySelector('#biStatus').textContent = t; };
        root.querySelector('#biFile').onchange = async (e) => {
          const file = e.target.files[0]; e.target.value = '';
          if (!file) return;
          if (/\.pdf$/i.test(file.name) && file.size > PDF_MAX * 4) { status('الملف كبير · قسّم الفترة'); return; }
          status('📎 ' + file.name + ' · نقرا…'); res = null; root.querySelector('#biOut').innerHTML = '';
          const now = new Date();
          try {
            const r = await readFile(file, now);
            const all = r.list.filter((x) => x.at instanceof Date && !isNaN(x.at) && x.amount > 0).sort((a, b) => a.at - b.at);
            const { fresh, dup } = dedupe(all);
            res = { all, fresh, dup, balance: r.balance };
            status(all.length ? '📎 ' + file.name : '📎 ' + file.name + (/\.pdf$/i.test(file.name) ? ' · كشوف الـPDF تختلف؛ لو تقدر صدّره Excel أو CSV' : ''));
          } catch (err) {
            status(err && err.message === 'xls' ? 'هذا ملف Excel قديم (.xls) · احفظه .xlsx أو CSV' : 'ما قدرنا نقرا الملف · جرّب Excel أو CSV');
            return;
          }
          root.querySelector('#biOut').innerHTML = summary();
        };
      },
      onSave() {
        if (!res || !res.fresh.length) { A.toast(res && res.dup ? 'كل العمليات موجودة عندك قبل' : 'اختار الملف أول'); return false; }
        const C = window.HayatiCur, mine = C ? C.code() : 'BHD';
        for (const x of res.fresh) {
          let amount = x.amount, note = 'من ملف الاستيراد';
          if (C && x.currency && x.currency !== mine && C.LIST[x.currency]) { note = 'أصلها ' + x.amount + ' ' + x.currency + ' ≈ بعملتك'; amount = C.convert(x.amount, x.currency, mine); }
          S.upsert('transactions', { kind: x.kind, amount, category: x.category, merchant: x.merchant || null, note, occurred_at: x.at.toISOString(), source: 'import',
            needs_review: !!x.review, raw: x.raw ? P.mask(x.raw) : null });
        }
        A.toast('انضافت ' + res.fresh.length + ' عملية بتواريخها ✓');
      },
    });
  }

  // ================= الربط =================
  wrap('chooserItems', (prev, item) => prev(item) + item('bankfile', 'download', '#0d9488', 'استيراد الحساب كامل', 'كشف الحساب أو ملف رسائل البنك'));
  const prevPick = E.pick;
  E.pick = (k) => { if (k === 'bankfile') { sheet(); return; } if (prevPick) prevPick(k); };
  wrap('action', (prev, name, el, e) => { if (name === 'bankfile') { sheet(); return; } return prev(name, el, e); });
  E.bankImport = sheet;
  E._bank = { csv, fromRows, fromText, fromXml, fromPdfLines, dedupe, money, when }; // للاختبار
})();
