// DW-051: ارفع جدولك الجامعي (صورة · PDF · نص منسوخ من بوابة الجامعة) ← المواد بأيامها وأوقاتها
// النص يتقرا بالجهاز (بدون نت). الصورة والـPDF يتقرون بالذكاء لأصحاب الحسابات (الملف يمر بس وما ينحفظ).
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, st, I, h, tint } = A;
  const wrap = (name, fn) => { const prev = E[name]; E[name] = (...a) => fn(prev ? prev : () => '', ...a); };
  const pad = (n) => String(n).padStart(2, '0');
  const PDFJS = location.protocol === 'file:' ? 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/' : 'vendor/pdfjs/';

  // ---------- القارئ المحلي ----------
  const DAY_WORDS = [
    [0, /الأحد|الاحد|\bsun(day)?\b/i], [1, /الاثنين|الإثنين|\bmon(day)?\b/i], [2, /الثلاثاء|الثلاثا|\btue(s(day)?)?\b/i],
    [3, /الأربعاء|الاربعاء|\bwed(nesday)?\b/i], [4, /الخميس|\bthu(rs?(day)?)?\b/i], [5, /الجمعة|الجمعه|\bfri(day)?\b/i], [6, /السبت|\bsat(urday)?\b/i],
  ];
  // بوابات البحرين: U=الأحد M=الاثنين T=الثلاثاء W=الأربعاء H=الخميس (R بعد = الخميس) ← UTH · MW · TH
  const LETTERS = { U: 0, M: 1, T: 2, W: 3, H: 4, R: 4 };
  const LETTER_RE = /(?:^|[\s|,/()])([UMTWHR]{1,5})(?=$|[\s|,/()])/g;
  const MER = '(am|pm|a\\.m\\.|p\\.m\\.|ص|م)?';
  // الدقايق اختيارية («8 - 12»، «6-8»)، بس الرقم ما يكون لاصق بحرف أو رقم (عشان «S40-021» ما ينقرا وقت)
  const TIME_RE = new RegExp('(?<![\\w.:/-])(\\d{1,2})(?:[:.](\\d{2}))?\\s*' + MER + '\\s*(?:-|–|—|~|to|إلى|الى|لين)\\s*(\\d{1,2})(?:[:.](\\d{2}))?(?![\\d/])\\s*' + MER, 'i');
  const MIL_RE = /\b([01]\d|2[0-3])([0-5]\d)\s*[-–]\s*([01]\d|2[0-3])([0-5]\d)\b/;
  const ROOM_RE = /\b[A-Z]{1,3}\d{1,3}[A-Z]?\s?-\s?\d{1,4}[A-Z]?\b|(?:room|rm|bldg|قاعة|القاعة|مبنى|معمل|مختبر رقم)\s*[:#.]?\s*[\w؀-ۿ-]{1,12}/i;
  const CODE_RE = /\b([A-Z]{2,5})\s?-?(\d{3,4}[A-Z]?)\b/;
  const NOISE_RE = /\b(?:sec(?:tion)?\.?\s*\d+|crn\s*:?\s*\d+|credits?\s*:?\s*\d+|cr\.?\s*\d|lecture|lec|lab(?:oratory)?|tut(?:orial)?)\b|شعبة\s*\d+|الشعبة\s*\d+|محاضرة/gi;
  const digits = (s) => String(s).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const mins = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

  function hhmm(hh, mm, mer) {
    let H = Number(hh); const M = Number(mm);
    if (H > 23 || M > 59) return null;
    if (mer && /p|م/i.test(mer) && H < 12) H += 12;
    else if (mer && /a|ص/i.test(mer) && H === 12) H = 0;
    else if (!mer && H >= 1 && H <= 7) H += 12; // المحاضرات 7 الصبح لين 9 بالليل: 1:00 بدون ص/م = الظهر
    return pad(H) + ':' + pad(M);
  }
  function timeOf(line) {
    let m = line.match(TIME_RE);
    if (m) { m = m.slice(); m[2] = m[2] || '00'; m[5] = m[5] || '00'; }
    if (m && !m[3] && !m[6]) {
      // بدون ص/م (DW-056): «7-3» دوام = 7 الصبح لين 3 العصر، و«1:00-2:15» أو «6-8» = الظهر/المسا
      let a = Number(m[1]) * 60 + Number(m[2]), b = Number(m[4]) * 60 + Number(m[5]);
      if (Number(m[1]) > 23 || Number(m[4]) > 23 || Number(m[2]) > 59 || Number(m[5]) > 59) return null;
      if (b <= a && b + 720 > a && Number(m[4]) < 12) b += 720;
      if (a >= 60 && a < 420) { a += 720; if (b < 720) b += 720; }
      const f = (x) => pad(Math.floor(x / 60) % 24) + ':' + pad(x % 60);
      return { start: f(a), end: f(b), at: m[0] };
    }
    if (m) {
      const end = hhmm(m[4], m[5], m[6] || m[3]);
      let start = hhmm(m[1], m[2], m[3] || m[6]);
      if (start && end && !m[3] && m[6] && mins(start) >= mins(end)) start = hhmm(m[1], m[2], null); // 11:00–12:15 PM
      return start && end ? { start, end, at: m[0] } : null;
    }
    m = line.match(MIL_RE);
    return m ? { start: m[1] + ':' + m[2], end: m[3] + ':' + m[4], at: m[0] } : null;
  }
  // «الأحد – الخميس» أو «Sun-Thu» = كل الأيام بينهم (جداول الدوام)
  const RANGE = /^\s*(?:-|–|—|إلى|الى|لين|حتى|to)\s*$/i;
  function daysOf(line) {
    let found = DAY_WORDS.filter(([, re]) => re.test(line)).map(([d]) => d);
    if (found.length === 2) {
      const at = found.map((d) => { const x = DAY_WORDS[d][1].exec(line); return [d, x.index, x.index + x[0].length]; }).sort((p, q) => p[1] - q[1]);
      if (RANGE.test(line.slice(at[0][2], at[1][1]))) { found = []; for (let d = at[0][0]; ; d = (d + 1) % 7) { found.push(d); if (d === at[1][0] || found.length > 7) break; } }
    }
    if (found.length) return { days: found, strip: (s) => DAY_WORDS.reduce((x, [, re]) => x.replace(new RegExp(re.source, 'gi'), ' '), s) };
    const days = [];
    let m; LETTER_RE.lastIndex = 0;
    while ((m = LETTER_RE.exec(line))) for (const c of m[1]) days.push(LETTERS[c]);
    return { days: [...new Set(days)], strip: (s) => s.replace(LETTER_RE, ' ') };
  }
  function tidy(s) {
    return s.replace(NOISE_RE, ' ').replace(/[|•·,،;:()[\]]+/g, ' ').replace(/\s[-–—]\s/g, ' ').replace(/(^|\s)و(?=\s|$)/g, ' ').replace(/\s+/g, ' ').replace(/^[\s\-–—]+|[\s\-–—]+$/g, '').trim();
  }

  function localParse(text, fallback) {
    const out = [];
    let carry = '';
    for (const raw of digits(text).split(/\n+/)) {
      const line = raw.replace(/\t/g, ' | ').trim();
      if (!line) continue;
      const t = timeOf(line);
      if (!t) {
        // سطر اسم المادة (والوقت بالسطر اللي بعده)
        const c = tidy(line);
        if (/[A-Za-z؀-ۿ]{2}/.test(c) && !/^(day|days|time|room|course|الأيام|اليوم|الوقت|القاعة|المادة)\b/i.test(c)) carry = c.slice(0, 60);
        continue;
      }
      let rest = line.replace(t.at, ' ');
      const room = ((rest.match(ROOM_RE) || [])[0] || '').trim();
      if (room) rest = rest.replace(room, ' ');
      const d = daysOf(rest);
      if (!d.days.length) continue;
      rest = d.strip(rest);
      const code = rest.match(CODE_RE);
      let name = tidy(rest);
      if (name.replace(/[^A-Za-z؀-ۿ]/g, '').length < 2) name = carry;
      else if (code && carry && name.length <= code[0].length + 2 && carry.includes(code[0])) name = carry; // «ITCS 113» بروحه وفوقه الاسم كامل
      if (!name) name = fallback || '';
      if (!name) continue;
      if (/\blab(oratory)?\b|مختبر|عملي/i.test(line) && !/\blab|مختبر|عملي/i.test(name)) name += ' (عملي)';
      out.push({ name: name.slice(0, 60), days: d.days.sort(), start: t.start, end: t.end, room: room.replace(/^(room|rm)\s*[:#.]?\s*/i, '').slice(0, 30) });
    }
    return out;
  }

  // ---------- تنظيف + دمج ----------
  const TIME = /^([01]?\d|2[0-3]):[0-5]\d$/;
  function clean(list) {
    const groups = new Map();
    for (const c of Array.isArray(list) ? list : []) {
      if (!c) continue;
      const name = String(c.name || '').replace(/\s+/g, ' ').trim().slice(0, 60);
      const start = TIME.test(c.start || '') ? c.start.padStart(5, '0') : null;
      let end = TIME.test(c.end || '') ? c.end.padStart(5, '0') : null;
      const days = [...new Set((Array.isArray(c.days) ? c.days : []).map(Number).filter((x) => Number.isInteger(x) && x >= 0 && x <= 6))];
      if (!name || !start || !days.length) continue;
      if (end && mins(end) <= mins(start)) end = null;
      const room = String(c.room || '').trim().slice(0, 30);
      const key = [name.toLowerCase(), start, end, room].join('|');
      const g = groups.get(key);
      if (g) g.days = [...new Set(g.days.concat(days))];
      else groups.set(key, { name, days, start, end, room, workout: c.workout || null });
    }
    return [...groups.values()].map((c) => {
      c.days.sort();
      c.exists = st.courses.some((x) => String(x.name || '').trim().toLowerCase() === c.name.toLowerCase() && x.start_time === c.start);
      c.on = !c.exists;
      return c;
    });
  }

  // ---------- قراءة الملفات ----------
  const IMG_MAX = 2000, PDF_MAX = 6 * 1024 * 1024;
  async function shrink(file) {
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = URL.createObjectURL(file); });
    const k = Math.min(1, IMG_MAX / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src);
    return c.toDataURL('image/jpeg', 0.88).split(',')[1];
  }
  const toB64 = (file) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = () => no(r.error); r.readAsDataURL(file); });
  let pdfLib = null;
  function loadPdf() {
    if (pdfLib) return pdfLib;
    pdfLib = window.pdfjsLib ? Promise.resolve(window.pdfjsLib) : new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = PDFJS + 'pdf.min.js';
      s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; res(window.pdfjsLib); };
      s.onerror = () => { pdfLib = null; rej(new Error('pdf')); };
      document.head.appendChild(s);
    });
    return pdfLib;
  }
  // نص الـPDF سطر سطر (نجمع الكلمات اللي بنفس الارتفاع)
  async function pdfText(file) {
    const lib = await loadPdf();
    const doc = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
    const lines = [];
    for (let i = 1; i <= Math.min(doc.numPages, 4); i++) {
      const rows = new Map();
      for (const it of (await (await doc.getPage(i)).getTextContent()).items) {
        const y = Math.round(it.transform[5] / 3);
        rows.set(y, (rows.get(y) || []).concat([[it.transform[4], it.str]]));
      }
      [...rows.entries()].sort((a, b) => b[0] - a[0]).forEach(([, r]) => lines.push(r.sort((a, b) => a[0] - b[0]).map((x) => x[1]).join(' | ')));
    }
    return lines.join('\n');
  }
  const signedIn = () => !!(S.status && S.status.signedIn && S.invokeFn && !S.status.aiOff);
  let samplePromise = null;
  const getSample = () => (samplePromise = samplePromise || (window.claude && typeof window.claude.use === 'function' ? window.claude.use('sample').catch(() => null) : Promise.resolve(null)));
  const PROMPT = 'This is a student\'s weekly timetable in any format (university portal, school grid in Arabic or English, photo, table or text). Return only JSON: {"courses":[{"name":"course or subject name","days":[0-6, 0=Sunday],"start":"HH:MM 24h","end":"HH:MM","room":""}]}. ' +
    'Day letters: U=Sunday M=Monday T=Tuesday W=Wednesday H or R=Thursday. In school grids each cell takes its period\'s time from the header; merged or back-to-back periods of one subject are one meeting; split cells join both names with « / »; skip breaks, teachers and class codes; write abbreviations (ريض، عرب، إنج) in full. A time from 12:00 to 7:59 without am/pm is afternoon. Copy only what is shown; never guess.';
  const aiError = (e) => { const m = String(e && e.message || ''); return m === 'quota' ? 'خلصت محاولاتك المجانية لهالشهر ✨ · ترجع أول الشهر' : m === 'limit' ? 'خلصت محاولات اليوم ✨ · جرّب بكرة' : m === 'signin' ? 'سجّل دخول أول' : m === 'unavailable' ? 'الذكاء قيد التجهيز · الصق الجدول كنص أو ارفع PDF' : 'ما قدرنا نوصل للخدمة · جرّب بعدين'; };

  // ---------- الواجهة ----------
  // DW-056: نفس الميزة لجدول الدوام والتمارين
  const KINDS = {
    lecture: { label: 'دراسة', type: 'lecture', icon: 'graduation', def: '', one: ' مادة', many: ' مواد', what: 'class timetable',
      ph: 'مثال:&#10;ITCS 113 Programming I  UTH  10:00 - 10:50  S40-021&#10;MATH 101  MW  1:00 - 2:15  S1A-105&#10;أو: إحصاء · الأحد والثلاثاء 8:00 - 9:15 قاعة 12' },
    work: { label: 'دوام', type: 'activity', icon: 'briefcase', def: 'دوام', one: ' دوام', many: ' دوامات', what: 'work shift roster', color: '#0ea5e9',
      ph: 'مثال:&#10;الأحد – الخميس 7:00 - 3:00&#10;السبت 8 - 12 دوام نص يوم&#10;أو سكرين شوت من جدول المناوبات' },
    gym: { label: 'تمارين', type: 'gym', icon: 'dumbbell', def: 'تمرين', one: ' تمرين', many: ' تمارين', what: 'training/workout schedule', color: '#10b981',
      ph: 'مثال:&#10;الأحد والثلاثاء 6 - 8 جيم صدر وتراي&#10;الاثنين والأربعاء 5:30 - 7 جري&#10;الخميس 7 - 8:30 م كورة' },
  };
  const defKind = () => (A.has('student') ? 'lecture' : A.has('employee') ? 'work' : A.has('athlete') ? 'gym' : 'lecture');
  function sheet(kind) {
    let rows = [];
    let k = KINDS[kind] ? kind : defKind();
    const dayList = (d) => d.map((x) => A.DAYS_SHORT[x]).join('، ');
    const draw = () => rows.length ? '<div class="card flush"><ul class="list">' + rows.map((r, i) =>
      '<li class="row" style="cursor:default"><button type="button" class="check' + (r.on ? ' on' : '') + '" data-i="' + i + '" aria-label="ضمّن">' + I('check') + '</button>' +
      '<div class="ico" style="' + tint(KINDS[k].color || A.COLORS[i % A.COLORS.length]) + '">' + I(KINDS[k].icon) + '</div><div class="main"><div class="title"><span class="t">' + h(r.name) + '</span>' +
      (r.exists ? ' <small class="muted">موجودة</small>' : '') + '</div><div class="sub">' + dayList(r.days) + ' · <bdi>' + A.time12(r.start) + (r.end ? ' – ' + A.time12(r.end) : '') + '</bdi>' + (r.workout ? ' · ' + r.workout.exercises.length + ' تمارين' + (r.workout.focus ? ' (' + h(r.workout.focus) + ')' : '') : '') +
      (r.room ? ' · ' + h(r.room) : '') + '</div></div></li>').join('') + '</ul></div>' +
      '<p class="small muted" style="margin:8px 4px 0">شيّك عليها قبل الحفظ: شيل الصح عن أي مادة غلط، وتقدر تعدّل أي وحدة بعدين من الجدول.</p>' : '';
    A.openSheet({
      title: 'ارفع جدولك',
      saveLabel: 'أضف للجدول',
      body:
        '<div class="seg" id="ttKind" style="margin-bottom:10px">' + Object.entries(KINDS).map(([key, x]) => '<button type="button" data-k="' + key + '" class="' + (key === k ? 'on' : '') + '">' + x.label + '</button>').join('') + '</div>' +
        '<p class="small muted" style="margin:0 0 10px">صوّر الجدول أو خذ <b>سكرين شوت</b> (من بوابة الجامعة، أو جدول المناوبات، أو المدرب)، أو ارفع <b>PDF</b>، أو انسخ الجدول <b>كنص</b> والصقه.</p>' +
        '<label class="btn block" style="margin-bottom:10px">' + I('upload') + 'اختار صورة أو PDF<input type="file" id="ttFile" accept="image/*,application/pdf,.pdf,.txt,.csv" hidden></label>' +
        '<div class="field"><textarea name="tt_txt" rows="4" placeholder="' + KINDS[k].ph + '"></textarea></div>' +
        '<button type="button" class="btn primary block" id="ttRead">' + I('sparkle') + 'اقرأ الجدول</button>' +
        '<p class="small muted" id="ttStatus" style="margin:10px 4px;min-height:18px"></p><div id="ttRows"></div>' +
        '<p class="small muted" style="margin:6px 4px 0">النص يتقرا بجوالك. الصورة والـPDF يتقرون بالذكاء (لأصحاب الحسابات) والملف ما ينحفظ.</p>',
      mount(root) {
        const status = (t) => { root.querySelector('#ttStatus').textContent = t; };
        const show = () => { root.querySelector('#ttRows').innerHTML = draw(); };
        let file = null;
        A.segPick(root, '#ttKind', (key) => { k = key; root.querySelector('[name=tt_txt]').placeholder = KINDS[k].ph.replace(/&#10;/g, '\n'); rows = []; show(); status(''); });
        root.querySelector('#ttFile').onchange = (e) => { file = e.target.files[0] || null; status(file ? '📎 ' + file.name : ''); };
        root.querySelector('#ttRows').onclick = (e) => { const b = e.target.closest('[data-i]'); if (b) { rows[b.dataset.i].on = !rows[b.dataset.i].on; show(); } };
        root.querySelector('#ttRead').onclick = async (ev) => {
          const btn = ev.currentTarget; btn.disabled = true;
          try {
            const text = A.val(root, 'tt_txt');
            const isPdf = file && (/pdf$/i.test(file.type) || /\.pdf$/i.test(file.name));
            const isImg = file && /^image\//.test(file.type);
            if (!file && !text) { status('ارفع صورة أو PDF، أو الصق الجدول أول'); return; }
            if (file && isPdf && file.size > PDF_MAX) { status('الملف كبير · الحد 6MB'); return; }
            let list = null;
            // DW-065: PDF ← القارئ بالمواقع أول (بالجهاز): جدول جامعة أو برنامج تمرين بتماريه
            if (file && isPdf && window.HayatiPdfRead) {
              status('أقرا الـPDF…');
              try {
                const its = await HayatiPdfRead.items(file);
                const plans = HayatiPdfRead.workout(its);
                if (plans.length) {
                  if (k !== 'gym') { k = 'gym'; root.querySelectorAll('#ttKind button').forEach((b) => b.classList.toggle('on', b.dataset.k === 'gym')); }
                  list = plans.filter((p) => p.day != null).map((p) => ({ name: p.name || KINDS.gym.def, days: [p.day], start: '18:00', end: '19:30', room: '',
                    workout: { focus: p.focus, exercises: p.exercises } }));
                } else {
                  const sc = HayatiPdfRead.schedule(its);
                  if (sc.length) list = sc;
                  else if (E._parseFootball) {
                    // DW-073: برنامج الفريق بتواريخ (تمرين/مباراة/راحة + وقت التواجد) ← استيراد جدول الكورة
                    const txt = HayatiPdfRead.lines(its);
                    if (/تمرين|مباراة|مباراه|تدريب/.test(txt) && E._parseFootball(txt).length) { A.closeSheet(); setTimeout(() => E.footballImport(txt), 250); return; }
                  }
                }
              } catch (e) { /* نكمّل بالطرق الثانية */ }
            }
            if (!list && file && (isImg || isPdf) && signedIn()) {
              status(isPdf ? '✨ نقرا الملف… (نص دقيقة تقريباً)' : '✨ نقرا الصورة…');
              try {
                const image = isImg ? await shrink(file) : await toB64(file);
                const r = await S.invokeFn('lecture-ai', { mode: 'schedule', kind: k, image, media: isImg ? 'image/jpeg' : 'application/pdf' });
                list = r && r.courses;
              } catch (e) { status(aiError(e)); if (!isPdf) return; }
            }
            if (!list && file && isImg) {
              const sample = await getSample();
              const caps = sample ? await sample.limits().catch(() => null) : null;
              if (!(caps && caps.images)) { status('قراءة الصورة تحتاج حساب (سجّل دخول من الإعدادات) · أو الصق الجدول كنص من بوابة الجامعة'); return; }
              status('✨ Claude يقرا الجدول…');
              try { const r = await sample.json(PROMPT.replace('class timetable', KINDS[k].what), { images: [file], modelTier: 'default' }); list = r && r.courses; }
              catch (e) { status('ما قدرنا نقرا الصورة · الصق الجدول كنص'); return; }
            }
            if (!list && file && isPdf) {
              try { list = localParse(await pdfText(file), KINDS[k].def); } catch (e) { status('ما قدرت أفتح الـPDF · خذ له سكرين شوت'); return; }
            }
            if (!list && file && !isImg && !isPdf) list = localParse(await file.text(), KINDS[k].def);
            if (!list && text) {
              list = localParse(text, KINDS[k].def);
              if (!list.length && signedIn()) {
                status('✨ نقرا النص…');
                try { const r = await S.invokeFn('lecture-ai', { mode: 'schedule', kind: k, notes: text.slice(0, 20000) }); list = r && r.courses; } catch (e) { status(aiError(e)); return; }
              }
            }
            rows = clean(list);
            const fresh = rows.filter((r) => r.on).length;
            const wk = rows.some((r) => r.workout);
            status(wk ? 'لقيت برنامج تمرين: ' + rows.length + ' أيام · الوقت 6–7:30 المسا افتراضي، عدّله بعدين من الجدول' : rows.length ? 'لقيت ' + rows.length + (rows.length === 1 ? KINDS[k].one : KINDS[k].many) + (fresh < rows.length ? ' (' + (rows.length - fresh) + ' موجودة عندك)' : '') :
              'ما لقيت أيام وأوقات واضحة · جرّب سكرين شوت أوضح، أو اكتب كل مادة بسطر: الاسم، الأيام، الوقت');
            show();
          } finally { btn.disabled = false; }
        };
      },
      onSave() {
        const pick = rows.filter((r) => r.on);
        if (!pick.length) { A.toast('ما فيه مواد مختارة'); return false; }
        const base = st.courses.length;
        pick.forEach((r, i) => S.upsert('courses', { name: r.name || KINDS[k].def, type: KINDS[k].type, days: r.days, start_time: r.start, end_time: r.end || null, room: r.room || null, color: KINDS[k].color || A.COLORS[(base + i) % A.COLORS.length], source: 'timetable',
          workout: r.workout || undefined }));
        A.ui.studySeg = 'schedule';
        A.toast('انضاف ' + pick.length + (pick.length === 1 ? KINDS[k].one : KINDS[k].many) + ' لجدولك ✓ — لا تنسى تحدّث التقويم');
      },
    });
  }

  // ================= الربط =================
  wrap('timetableCard', (prev) => {
    // للكل (مو بس اللي اختار «طالب» بملفه): الزر كان يختفي عن اللي ملفه رياضي أو حارس بس
    const hasLectures = st.courses.some((c) => (c.type || 'lecture') === 'lecture');
    return prev() + (hasLectures
      ? '<button class="btn block" style="margin:0 0 12px" data-action="timetable">' + I('upload') + 'ارفع جدولك (صورة أو PDF)</button>'
      : '<button class="cta" data-action="timetable"><div class="ico">' + I('upload') + '</div><div style="flex:1"><b>ارفع جدولك</b><small>الدراسة أو الدوام أو التمارين: صورة أو PDF أو نص، وينضاف بأيامه ووقته</small></div>' + I('chevL') + '</button>');
  });
  wrap('chooserItems', (prev, item) => prev(item) + item('timetable', 'upload', '#1A8A8F', 'ارفع جدولك', 'دراسة، دوام، أو تمارين: صورة أو PDF أو نص'));
  const prevPick = E.pick;
  E.pick = (k) => { if (k === 'timetable') { sheet(); return; } if (prevPick) prevPick(k); };
  wrap('action', (prev, name, el, e) => { if (name === 'timetable') { sheet(); return; } return prev(name, el, e); });
  E.timetable = sheet;
  E._parseTimetable = localParse; // للاختبار
  E._cleanTimetable = clean;
})();
