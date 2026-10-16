// ⚽ استيراد جدول تمارين كرة القدم: صورة · PDF · أو رسالة المدرب (نص)
// داخل Claude: Claude يقرا الملف. برّاه: قارئ محلي للنص (أيام + أوقات).
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, st, I, h, tint } = A;
  const wrap = (name, fn) => { const prev = E[name]; E[name] = (...a) => fn(prev ? prev : () => '', ...a); };
  const pad = (n) => String(n).padStart(2, '0');
  const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const KINDS = { training: ['تمرين', '#16a34a', '⚽'], match: ['مباراة', '#13636B', '🏟️'], gym: ['جيم', '#10b981', '💪'], other: ['نشاط', '#64748b', '📌'] };
  // محلي (vendor/) عشان نسخة المتجر ما تتصل بأي جهة؛ ملف dist الواحد (file://) بس يرجع للـ CDN
  const PDFJS = location.protocol === 'file:' ? 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/' : 'vendor/pdfjs/';

  let samplePromise = null;
  const getSample = () => (samplePromise = samplePromise || (window.claude && typeof window.claude.use === 'function' ? window.claude.use('sample').catch(() => null) : Promise.resolve(null)));

  // ---------- القارئ المحلي (نص) ----------
  const DAY_RE = [
    [0, /(الأحد|الاحد|احد|sunday|\bsun\b)/i], [1, /(الاثنين|الإثنين|اثنين|monday|\bmon\b)/i], [2, /(الثلاثاء|الثلاثا|ثلاثاء|tuesday|\btue\b)/i],
    [3, /(الأربعاء|الاربعاء|اربعاء|wednesday|\bwed\b)/i], [4, /(الخميس|خميس|thursday|\bthu\b)/i], [5, /(الجمعة|الجمعه|جمعة|friday|\bfri\b)/i], [6, /(السبت|سبت|saturday|\bsat\b)/i],
  ];
  const digits = (s) => String(s).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  function to24(hh, mm, mer, fallbackPm) {
    let H = Number(hh); const M = Number(mm || 0);
    if (H > 23 || M > 59) return null;
    const pm = mer ? /م|pm|مساء|عصر|ليل/i.test(mer) : fallbackPm;
    const am = mer ? /ص|am|صباح|فجر/i.test(mer) : false;
    if (pm && H < 12) H += 12;
    if (am && H === 12) H = 0;
    return pad(H) + ':' + pad(M);
  }
  function localParse(text) {
    const out = [];
    for (const raw of digits(text).split(/\n+/)) {
      const line = raw.trim();
      if (!line) continue;
      const days = DAY_RE.filter(([, re]) => re.test(line)).map(([d]) => d);
      const dm = line.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})|(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?/);
      // 6-8 · 6:30 - 8 م · 18:00–20:00 · الساعة 7 م
      const MER = '(ص|م|am|pm|صباحاً|صباحا|مساءً|مساء|العصر|الليل)';
      let t = null, m;
      if ((m = line.match(new RegExp('(\\d{1,2})(?:[:.](\\d{2}))?\\s*' + MER + '?\\s*(?:-|–|—|إلى|الى|to|لين|حتى)\\s*(\\d{1,2})(?:[:.](\\d{2}))?\\s*' + MER + '?', 'i')))) {
        t = { h1: m[1], m1: m[2], r1: m[3], h2: m[4], m2: m[5], r2: m[6] };
      } else if ((m = line.match(new RegExp('(?:الساعة|ساعة|@|at)\\s*(\\d{1,2})(?:[:.](\\d{2}))?\\s*' + MER + '?', 'i')) || line.match(new RegExp('(\\d{1,2})[:.](\\d{2})\\s*' + MER + '?', 'i')))) {
        t = { h1: m[1], m1: m[2], r1: m[3] };
      }
      if (!t || (!days.length && !dm)) continue;
      const start = to24(t.h1, t.m1, t.r1 || t.r2, Number(t.h1) >= 1 && Number(t.h1) <= 11); // تمارين الفريق غالباً عصر/ليل
      const end = t.h2 ? to24(t.h2, t.m2, t.r2 || t.r1, Number(t.h2) >= 1 && Number(t.h2) <= 11) : null;
      if (!start) continue;
      const kind = /مباراة|مباراه|ماتش|match|vs|ضد/i.test(line) ? 'match' : /جيم|gym|لياقة|صالة/i.test(line) ? 'gym' : 'training';
      const place = ((line.match(/(?:ملعب|استاد|ستاد|نادي|صالة|في)\s*[^\d،,\n-]{2,30}/) || [])[0] || '').replace(/^في\s+/, '');
      const vs = (line.match(/(?:ضد|vs\.?)\s*([^\d،,\n-]{2,25})/i) || [])[1];
      let date = null;
      if (dm) {
        const y = dm[1] ? Number(dm[1]) : dm[6] ? (Number(dm[6]) < 100 ? 2000 + Number(dm[6]) : Number(dm[6])) : new Date().getFullYear();
        const mo = dm[1] ? Number(dm[2]) : Number(dm[5]), d = dm[1] ? Number(dm[3]) : Number(dm[4]);
        if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) date = y + '-' + pad(mo) + '-' + pad(d);
      }
      const title = kind === 'training' ? 'تمرين الفريق' : kind === 'match' ? 'مباراة' + (vs ? ' ضد ' + vs.trim() : '') : KINDS[kind][0];
      const base = { kind, title, start, end, place: place.trim(), date: null, weekday: null, notes: '' };
      if (date) out.push(Object.assign({}, base, { date, weekday: new Date(date + 'T12:00').getDay() }));
      else days.forEach((d) => out.push(Object.assign({}, base, { weekday: d })));
    }
    return out;
  }

  // ---------- Claude يقرا الملف ----------
  const PROMPT = (text) => 'هذا جدول تمارين/مباريات كرة قدم لحارس مرمى في البحرين' + (text ? ' (نص تحت)' : ' (الصور مرفقة)') + '.\n' +
    'طلّع كل حصة كـ JSON بهالشكل بالضبط، بدون أي كلام ثاني:\n' +
    '{"sessions":[{"kind":"training|match|gym|other","title":"اسم قصير بالعربي","weekday":0-6 أو null (0=الأحد),"date":"YYYY-MM-DD" أو null,"start":"HH:MM" (24 ساعة),"end":"HH:MM" أو null,"place":"المكان أو فاضي","notes":"ملاحظة قصيرة أو فاضي"}]}\n' +
    'قواعد: لو الحصة تتكرر كل أسبوع حط weekday و date=null. لو بتاريخ معيّن حط date و weekday يومه. الأوقات بدون ص/م للتمارين غالباً مساءً. لا تخترع حصص مو موجودة. لو ما فيه جدول رجّع {"sessions":[]}.' +
    (text ? '\n\nالنص:\n' + text.slice(0, 6000) : '');

  function clean(list) {
    const ok = [];
    for (const s of Array.isArray(list) ? list : []) {
      const start = /^([01]?\d|2[0-3]):[0-5]\d$/.test(s.start || '') ? s.start.padStart(5, '0') : null;
      if (!start) continue;
      const end = /^([01]?\d|2[0-3]):[0-5]\d$/.test(s.end || '') ? s.end.padStart(5, '0') : null;
      const date = /^\d{4}-\d{2}-\d{2}$/.test(s.date || '') ? s.date : null;
      const wd = Number.isInteger(s.weekday) && s.weekday >= 0 && s.weekday <= 6 ? s.weekday : date ? new Date(date + 'T12:00').getDay() : null;
      if (wd == null && !date) continue;
      ok.push({ kind: KINDS[s.kind] ? s.kind : 'training', title: String(s.title || '').slice(0, 60), weekday: wd, date, start, end, place: String(s.place || '').slice(0, 60), notes: String(s.notes || '').slice(0, 120), on: true });
    }
    return ok;
  }

  // PDF → صور (أول 3 صفحات) + نصه
  let pdfLib = null;
  function loadPdf() {
    if (pdfLib) return pdfLib;
    pdfLib = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = PDFJS + 'pdf.min.js';
      s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; res(window.pdfjsLib); };
      s.onerror = () => { pdfLib = null; rej(new Error('pdf')); };
      document.head.appendChild(s);
    });
    return pdfLib;
  }
  async function pdfToImagesAndText(file) {
    const lib = await loadPdf();
    const doc = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
    const images = [], texts = [];
    for (let i = 1; i <= Math.min(doc.numPages, 3); i++) {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      texts.push(tc.items.map((x) => x.str).join(' '));
      const vp = page.getViewport({ scale: 1.6 });
      const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      images.push(await new Promise((r) => c.toBlob(r, 'image/png')));
    }
    return { images, text: texts.join('\n') };
  }

  // ---------- الواجهة ----------
  function importSheet() {
    let rows = [];
    const draw = () => rows.length ? '<div class="card flush"><ul class="list">' + rows.map((r, i) => {
      const k = KINDS[r.kind];
      const when = r.date ? r.date + ' (' + DAY_NAMES[r.weekday] + ')' : 'كل ' + DAY_NAMES[r.weekday];
      return '<li class="row" style="cursor:default"><button type="button" class="check' + (r.on ? ' on' : '') + '" data-i="' + i + '" aria-label="ضمّن">' + I('check') + '</button>' +
        '<div class="ico" style="' + tint(k[1]) + '">' + k[2] + '</div><div class="main"><div class="title"><span class="t">' + h(r.title || k[0]) + '</span></div>' +
        '<div class="sub">' + h(when) + ' · <bdi>' + h(r.start) + (r.end ? '–' + h(r.end) : '') + '</bdi>' + (r.place ? ' · ' + h(r.place) : '') + '</div></div></li>';
    }).join('') + '</ul></div><p class="small muted" style="margin:8px 4px 0">شيّك عليها قبل الحفظ — شيل علامة الصح عن أي حصة غلط.</p>' : '';
    A.openSheet({
      title: 'استيراد جدول التمارين',
      saveLabel: 'أضف للجدول',
      body:
        '<p class="small muted" style="margin:0 0 10px">ارفع <b>صورة</b> الجدول أو ملف <b>PDF</b>، أو الصق <b>رسالة المدرب</b> من الواتساب.</p>' +
        '<label class="btn block" style="margin-bottom:10px">' + I('upload') + 'اختار صورة أو PDF<input type="file" id="impFile" accept="image/*,application/pdf,.txt,.csv" hidden></label>' +
        '<div class="field"><textarea name="txt" placeholder="مثال:&#10;الأحد والثلاثاء 6-8 م ملعب نادي المحرق&#10;الخميس 5:30 م لياقة&#10;مباراة 24/10 الساعة 7 م ضد الرفاع"></textarea></div>' +
        '<button type="button" class="btn primary block" id="impRead">' + I('sparkle') + 'اقرأ الجدول</button>' +
        '<p class="small muted" id="impStatus" style="margin:10px 4px;min-height:18px"></p><div id="impRows"></div>',
      mount(root) {
        const status = (t) => { root.querySelector('#impStatus').textContent = t; };
        const show = () => { root.querySelector('#impRows').innerHTML = draw(); };
        let file = null;
        root.querySelector('#impFile').onchange = (e) => { file = e.target.files[0] || null; status(file ? '📎 ' + file.name : ''); };
        root.querySelector('#impRows').onclick = (e) => { const b = e.target.closest('[data-i]'); if (b) { rows[b.dataset.i].on = !rows[b.dataset.i].on; show(); } };
        root.querySelector('#impRead').onclick = async (ev) => {
          const btn = ev.currentTarget; btn.disabled = true;
          try {
            let text = A.val(root, 'txt'), images = [];
            if (file) {
              if (/pdf$/i.test(file.type) || /\.pdf$/i.test(file.name)) {
                status('أقرا الـPDF…');
                try { const r = await pdfToImagesAndText(file); images = r.images; text = (text + '\n' + r.text).trim(); }
                catch (e) { status('ما قدرت أفتح الـPDF — صوّره والصق الصورة'); return; }
              } else if (/^image\//.test(file.type)) images = [file];
              else text = (text + '\n' + (await file.text())).trim();
            }
            if (!text && !images.length) { status('ارفع ملف أو الصق النص أول'); return; }
            const sample = await getSample();
            const caps = sample ? await sample.limits().catch(() => null) : null;
            const canImg = !!(caps && caps.images);
            if (sample && (text || canImg)) {
              status('✨ Claude يقرا الجدول…');
              const imgs = canImg ? images.slice(0, caps.images.maxCount || 3) : [];
              try {
                const res = await sample.json(PROMPT(imgs.length ? '' : text) + (imgs.length && text ? '\n\nنص إضافي:\n' + text.slice(0, 3000) : ''), { images: imgs.length ? imgs : undefined, modelTier: 'default' });
                rows = clean(res && res.sessions);
              } catch (e) {
                if (e && e.code === 'not_granted') status('ما سمحت لـClaude — جرّبت القارئ المحلي');
                rows = text ? clean(localParse(text)) : [];
              }
            } else if (images.length && !text) {
              status('قراءة الصور تحتاج Claude (داخل رابط Claude). هني: الصق الجدول كنص.'); return;
            } else rows = clean(localParse(text));
            status(rows.length ? 'لقيت ' + rows.length + (rows.length === 1 ? ' حصة' : ' حصص') : 'ما لقيت أوقات واضحة — جرّب تكتبها سطر لكل يوم');
            show();
          } finally { btn.disabled = false; }
        };
      },
      onSave() {
        const pick = rows.filter((r) => r.on);
        if (!pick.length) { A.toast('ما فيه حصص مختارة'); return false; }
        // الحصص الأسبوعية بنفس الوقت والمكان تصير بند واحد بعدة أيام
        const groups = {};
        let dated = 0, weekly = 0;
        for (const r of pick) {
          if (r.date) {
            const due = new Date(r.date + 'T' + r.start + ':00');
            const dur = r.end ? Math.max(15, (Number(r.end.slice(0, 2)) * 60 + Number(r.end.slice(3))) - (Number(r.start.slice(0, 2)) * 60 + Number(r.start.slice(3)))) : 90;
            S.upsert('tasks', { title: KINDS[r.kind][2] + ' ' + (r.title || KINDS[r.kind][0]), kind: 'appointment', due_at: due.toISOString(), duration: dur, place: r.place || null, notes: r.notes || null, done: false });
            dated++;
          } else {
            const key = [r.kind, r.title, r.start, r.end, r.place].join('|');
            (groups[key] = groups[key] || Object.assign({}, r, { days: [] })).days.push(r.weekday);
          }
        }
        for (const g of Object.values(groups)) {
          const k = KINDS[g.kind];
          S.upsert('courses', { name: k[2] + ' ' + (g.title || k[0]), type: g.kind === 'gym' ? 'gym' : 'activity', days: [...new Set(g.days)].sort(), start_time: g.start, end_time: g.end || null, room: g.place || '', color: k[1], source: 'football-import' });
          weekly++;
        }
        A.toast('⚽ انضاف: ' + (weekly ? weekly + ' أسبوعي' : '') + (weekly && dated ? ' · ' : '') + (dated ? dated + ' بتاريخ' : ''));
      },
    });
  }

  // ================= الربط =================
  wrap('chooserItems', (prev, item) => prev(item) + item('football', 'upload', '#16a34a', 'جدول تمارين الكورة', 'صورة، PDF، أو رسالة المدرب'));
  const prevPick = E.pick;
  E.pick = (k) => { if (k === 'football') { importSheet(); return; } if (prevPick) prevPick(k); };
  wrap('viewHealth', (prev) => prev() + '<button class="btn ghost block" style="margin:10px 0 4px" data-action="football-import">' + I('upload') + 'استيراد جدول تمارين الكورة</button>');
  wrap('action', (prev, name, el, e) => { if (name === 'football-import') { importSheet(); return; } return prev(name, el, e); });
  E.footballImport = importSheet;
  E._parseFootball = localParse; // للاختبار
})();
