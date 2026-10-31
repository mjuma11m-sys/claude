// «المحاضرات» (DW-021، المرحلة 1 بدون ذكاء اصطناعي): ملف لكل محاضرة داخل مادتها
// ملاحظات + ملخصك + تسجيل صوتي + أسئلة تختبر فيها نفسك. التسجيلات على الجهاز بس (IndexedDB)، ما تنرفع ولا تتزامن
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, st, I, h, tint } = A;
  const wrap = (name, fn) => { const prev = E[name]; E[name] = (...a) => fn(prev ? prev : () => '', ...a); };
  const lectures = () => (st.lectures || []);
  const byCourse = (cid) => lectures().filter((l) => (l.course_id || '') === (cid || '')).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const mmss = (s) => Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');

  // ================= المعادلات (DW-022) =================
  // عرض بس: نص المستخدم يتهرّب أول (h)، بعدين: ^ ← أس، _رقم ← سفلي، sqrt( ← √(، >= ≤ !=، والمعادلة وسط جملة عربية تنعزل LTR عشان ما تنقلب.
  const MATH_CH = '[A-Za-z0-9.,+\\-−×÷*/=^_()√²³±≠≤≥πΣΔ∞∫% ]';
  const RUN = new RegExp(MATH_CH + '{3,}', 'g');
  const IS_EQ = /[=+×÷^√≤≥≠±Σ∫−]|[A-Za-z0-9)]\s*[*/]\s*[A-Za-z0-9(]|[A-Za-z0-9)]\s+-\s+[A-Za-z0-9(]/;
  function mathify(text) {
    let t = h(text == null ? '' : String(text))
      .replace(/&gt;=/g, '≥').replace(/&lt;=/g, '≤').replace(/!=/g, '≠')
      .replace(/\bsqrt\s*\(/gi, '√(').replace(/(\d)\s*\*\s*(\d)/g, '$1×$2');
    t = t.replace(RUN, (m) => {
      if (!IS_EQ.test(m) || !/[A-Za-z0-9]/.test(m)) return m;
      const lead = m.match(/^[\s=:]*/)[0], trail = m.slice(lead.length).match(/[\s=:]*$/)[0], core = m.slice(lead.length, m.length - trail.length);
      if (!core) return m;
      return lead + '<bdi dir="ltr" class="eq"' + (core.length <= 28 ? ' style="white-space:nowrap"' : '') + '>' + core + '</bdi>' + trail;
    });
    return t.replace(/\^\(([^()]{1,20})\)|\^([A-Za-z0-9]{1,6})/g, (_, a, b) => '<sup>' + (a || b) + '</sup>')
      .replace(/([A-Za-z)])_(\d{1,3})/g, '$1<sub>$2</sub>');
  }
  const SYMS = ['²', '³', '√', '÷', '×', '±', '≠', '≤', '≥', 'π', 'Σ', 'Δ', '∞', '∫', '½', '→'];
  const mathBar = () => '<div class="mathbar" role="toolbar" aria-label="رموز رياضية" style="display:flex;flex-wrap:wrap;gap:6px;margin:-4px 0 12px;direction:ltr">' +
    SYMS.map((x) => '<button type="button" class="chip" data-sym="' + x + '" aria-label="أضف ' + x + '" style="min-width:40px;font-size:17px">' + x + '</button>').join('') + '</div>';

  // ================= التسجيلات: IndexedDB على الجهاز =================
  const DB = 'hayati-audio', OS = 'clips';
  function db() {
    return new Promise((ok, no) => {
      if (!window.indexedDB) return no(new Error('no idb'));
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(OS);
      r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
    });
  }
  const idb = (mode, fn) => db().then((d) => new Promise((ok, no) => { const tx = d.transaction(OS, mode); const req = fn(tx.objectStore(OS)); tx.oncomplete = () => ok(req && req.result); tx.onerror = () => no(tx.error); }));
  const putClip = (id, blob) => idb('readwrite', (s) => s.put(blob, id));
  const getClip = (id) => idb('readonly', (s) => s.get(id));
  const delClip = (id) => idb('readwrite', (s) => s.delete(id)).catch(() => {});

  // ================= التسجيل ← نص (DW-047): آيفون، على الجهاز بس =================
  // الإضافة HayatiSpeech (Swift) تستخدم SFSpeechRecognizer مع requiresOnDeviceRecognition، فالصوت ما يطلع من الجوال.
  // الزر ما يطلع إلا لو الجهاز قال إنه يقدر يحوّل هاللغة بدون نت. النص يدخل الملاحظات مسودة، والحفظ بيد الطالب.
  const SPEECH_MAX = 25e6;
  let speechLangs = null;   // ['ar','en'] حسب الجهاز، تنحسب مرة
  function speechPlugin() {
    const C = window.Capacitor;
    if (!C || typeof C.getPlatform !== 'function' || C.getPlatform() !== 'ios') return null;
    return (C.Plugins && C.Plugins.HayatiSpeech) || (typeof C.registerPlugin === 'function' ? C.registerPlugin('HayatiSpeech') : null);
  }
  // DW-069: بالآيفون نسجّل بالإضافة HayatiRecorder عشان التسجيل يكمل لو طلعت من التطبيق أو قفلت الشاشة
  function recPlugin() {
    const C = window.Capacitor;
    if (!C || typeof C.getPlatform !== 'function' || C.getPlatform() !== 'ios') return null;
    return (C.Plugins && C.Plugins.HayatiRecorder) || (typeof C.registerPlugin === 'function' ? C.registerPlugin('HayatiRecorder') : null);
  }
  const REC_FOR = 'hayati-rec-lecture';   // أي محاضرة التسجيل الشغال لها (لو سكرت الورقة ورجعت)
  const recFor = (v) => { try { if (v === undefined) return localStorage.getItem(REC_FOR); if (v === null) localStorage.removeItem(REC_FOR); else localStorage.setItem(REC_FOR, v); } catch (e) { return null; } return null; };
  function b64Blob(b64, type) {
    const bin = atob(b64), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new Blob([u], { type });
  }

  async function speechSupport() {
    if (speechLangs) return speechLangs;
    const P = speechPlugin();
    if (!P || typeof P.available !== 'function') return (speechLangs = []);
    const out = [];
    for (const lang of ['ar', 'en']) { try { const r = await P.available({ lang }); if (r && r.onDevice) out.push(lang); } catch (e) { /* ما يدعم */ } }
    return (speechLangs = out);
  }
  const blobB64 = (blob) => new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(',')[1] || ''); fr.onerror = () => no(fr.error); fr.readAsDataURL(blob); });
  const SPEECH_ERR = { denied: 'ما فيه إذن للتعرّف على الكلام · من إعدادات الآيفون', unsupported: 'جهازك ما يحوّل هاللغة بدون نت', format: 'صيغة التسجيل ما تنقرا', big: 'التسجيل كبير (أكثر من 25MB)', busy: 'فيه تحويل شغّال، استنى يخلص' };
  async function transcribeClip(root, l, i, lang, btn) {
    const c = l.audio[i], P = speechPlugin();
    if (!c || !P) return;
    const blob = await getClip(c.id).catch(() => null);
    if (!blob) { A.toast('التسجيل مو موجود على هالجهاز'); return; }
    if (blob.size > SPEECH_MAX) { A.toast(SPEECH_ERR.big); return; }
    const all = root.querySelectorAll('[data-stt]'), label = btn.textContent;
    all.forEach((b) => { b.disabled = true; }); btn.textContent = '⏳ يحوّل…';
    try {
      const r = await P.transcribe({ data: await blobB64(blob), mime: blob.type || '', lang });
      const text = String((r && r.text) || '').trim();
      if (!text) { A.toast('ما طلع كلام واضح من التسجيل'); return; }
      const notes = root.querySelector('[name=lc_notes]');
      notes.value = (notes.value.trim() ? notes.value.trimEnd() + '\n\n' : '') + '🎙️ تسجيل ' + (i + 1) + ' (مسودة من الصوت):\n' + text.slice(0, 15000);
      A.toast('انضاف النص للملاحظات · مسودة، راجعها واضغط «حفظ»');
    } catch (e) {
      A.toast(SPEECH_ERR[String(e && (e.message || e.code) || '')] || 'ما قدرنا نحوّله · جرّب مرة ثانية');
    } finally { all.forEach((b) => { b.disabled = false; }); btn.textContent = label; }
  }

  // ================= الشاشة =================
  function view() {
    const courses = st.courses || [];
    let out = '<div style="display:flex;gap:8px;margin:12px 0"><button class="btn primary" style="flex:1" data-action="lec-new">' + I('plus') + 'محاضرة جديدة</button>' +
      (lectures().some((l) => (l.cards || []).length) ? '<button class="btn ghost" data-action="lec-quiz-all">' + I('target') + 'اختبرني</button>' : '') + '</div>';
    if (!lectures().length) {
      return out + A.empty('graduation', 'ملف لكل محاضرة', courses.length ? 'سجّل المحاضرة (بإذن الدكتور)، اكتب ملاحظاتك وملخصك، وحط أسئلة تختبر فيها نفسك قبل الاختبار.' : 'أضف موادك بالجدول أول، وبعدها كل محاضرة تنحفظ بملف مادتها.');
    }
    const groups = courses.map((c) => [c, byCourse(c.id)]).filter(([, l]) => l.length);
    const loose = byCourse('');
    if (loose.length) groups.push([{ id: '', name: 'بدون مادة', color: '#64748b' }, loose]);
    return out + groups.map(([c, ls]) => A.secHead('<span class="dot" style="background:' + (c.color || '#1A8A8F') + '"></span><bdi>' + h(c.name) + '</bdi>', '<span class="small muted num">' + ls.length + '</span>') +
      '<div class="card flush"><ul class="list">' + ls.map(row).join('') + '</ul></div>').join('');
  }
  function row(l) {
    const tags = [(l.audio || []).length ? '🎙️ ' + l.audio.length : '', (l.cards || []).length ? '❓ ' + l.cards.length : '', l.summary ? '📝 ملخص' : '', l.last_score != null ? '✓ ' + l.last_score + '%' : ''].filter(Boolean).join(' · ');
    return '<li class="row lec-row" data-action="lec-open" data-id="' + l.id + '"><div class="ico" style="' + tint('#1A8A8F') + '">' + I('book') + '</div><div class="main"><div class="title"><span class="t">' + h(l.title || 'محاضرة') + '</span></div>' +
      '<div class="sub">' + h(l.date || '') + (tags ? ' · ' + tags : '') + '</div></div>' + I('chevL') + '</li>';
  }

  // ================= ملف المحاضرة =================
  // DW-021 phase 2: AI summary + questions from the notes. Signed-in only; the notes go to the server function, recordings never do.
  const AI_MIN = 200;
  function aiBlock() {
    if (!(S.status && S.status.signedIn && S.invokeFn && !S.status.aiOff)) return '<p class="small muted" style="margin:0 4px 12px">✨ التلخيص والأسئلة التلقائية تشتغل لما تسجّل دخول بحسابك.</p>';
    return '<div style="display:flex;gap:8px;margin:0 0 8px"><button type="button" class="btn ghost" style="flex:1" data-photo>📷 صوّر السبورة</button><button type="button" class="btn ghost" style="flex:1" data-pdf>📄 ملف PDF</button></div>' +
      '<input type="file" id="lcPhoto" accept="image/*" capture="environment" hidden><input type="file" id="lcPdf" accept="application/pdf,.pdf" hidden>' +
      '<div class="row-btns" style="display:flex;gap:8px;margin:0 0 6px"><button type="button" class="btn ghost" style="flex:1" data-ai="summary">لخّصها لي ✨</button><button type="button" class="btn ghost" style="flex:1" data-ai="quiz">سوّ لي أسئلة ✨</button></div>' +
      '<p class="small muted" style="margin:0 4px 12px">يقرأ ملاحظاتك المكتوبة، أو الصورة أو ملف PDF اللي تختاره (مو التسجيل). الصورة والملف ما ينحفظون. راجع النتيجة، ممكن يغلط.</p>';
  }
  async function runAi(root, l, mode, redrawCards) {
    const notes = A.val(root, 'lc_notes');
    if (notes.length < AI_MIN) { A.toast('اكتب ملاحظات أكثر أول (' + AI_MIN + ' حرف على الأقل)'); return; }
    const btns = root.querySelectorAll('[data-ai]'); btns.forEach((b) => { b.disabled = true; });
    const btn = root.querySelector('[data-ai="' + mode + '"]'); const label = btn.textContent; btn.textContent = 'لحظة…';
    try {
      const r = await S.invokeFn('lecture-ai', { mode, title: A.val(root, 'lc_title'), notes: notes.slice(0, 20000) });
      if (mode === 'summary' && r && r.summary) {
        root.querySelector('[name=lc_summary]').value = String(r.summary).slice(0, 4000);
        A.toast('الملخص جاهز · راجعه واضغط «حفظ»');
      } else if (mode === 'quiz' && r && Array.isArray(r.cards)) {
        const have = new Set(l.cards.map((c) => c.q.trim()));
        const add = r.cards.filter((c) => c && c.q && c.a && !have.has(String(c.q).trim())).slice(0, 10);
        add.forEach((c) => l.cards.push({ id: S.uuid(), q: String(c.q).slice(0, 300), a: String(c.a).slice(0, 600) }));
        redrawCards();
        A.toast(add.length ? 'انضاف ' + add.length + ' سؤال · اضغط «حفظ»' : 'ما طلع أسئلة جديدة');
      } else A.toast('ما قدرنا نطلع نتيجة');
    } catch (e) {
      const m = String(e && e.message || '');
      A.toast(m === 'quota' ? 'خلصت محاولاتك المجانية لهالشهر ✨ · ترجع أول الشهر' : m === 'limit' ? 'خلصت محاولات اليوم ✨ · جرّب بكرة' : m === 'signin' ? 'سجّل دخول أول' : m === 'unavailable' ? 'الذكاء قيد التجهيز · جرّب بعدين' : 'ما قدرنا نوصل للخدمة · جرّب بعدين');
    } finally { btns.forEach((b) => { b.disabled = false; }); btn.textContent = label; }
  }

  // DW-034: صورة السبورة أو الورقة ← نص بالملاحظات. نصغّرها بالجهاز (1600px JPEG) والصورة نفسها ما تنحفظ بأي مكان
  const PHOTO_MAX = 1600;
  async function shrink(file) {
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = URL.createObjectURL(file); });
    const k = Math.min(1, PHOTO_MAX / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src);
    return c.toDataURL('image/jpeg', 0.85).split(',')[1];
  }
  async function runPhoto(root, file) {
    const btn = root.querySelector('[data-photo]'), label = btn.textContent;
    btn.disabled = true; btn.textContent = 'نقرا الصورة…';
    try {
      const image = await shrink(file);
      const r = await S.invokeFn('lecture-ai', { mode: 'photo', title: A.val(root, 'lc_title'), image, media: 'image/jpeg' });
      const text = String((r && r.text) || '').trim().slice(0, 8000);
      if (!text) { A.toast('ما قدرنا نقرا الصورة · صوّرها أقرب وبإضاءة أوضح'); return; }
      const ta = root.querySelector('[name=lc_notes]');
      ta.value = (ta.value.trim() ? ta.value.trim() + '\n\n' : '') + text;
      ta.dispatchEvent(new Event('input'));
      A.toast('انضاف النص للملاحظات · راجعه واضغط «حفظ»');
    } catch (e) {
      const m = String(e && e.message || '');
      A.toast(m === 'quota' ? 'خلصت محاولاتك المجانية لهالشهر ✨ · ترجع أول الشهر' : m === 'limit' ? 'خلصت محاولات اليوم ✨ · جرّب بكرة' : m === 'signin' ? 'سجّل دخول أول' : m === 'unavailable' ? 'الذكاء قيد التجهيز · جرّب بعدين' : 'ما قدرنا نوصل للخدمة · جرّب بعدين');
    } finally { btn.disabled = false; btn.textContent = label; }
  }

  // DW-036: ملف المحاضرة PDF ← ملاحظات + ملخص + أسئلة بطلب واحد. الملف يمر على الخدمة بس وما ينحفظ
  const PDF_MAX = 6 * 1024 * 1024;
  const toB64 = (file) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = () => no(r.error); r.readAsDataURL(file); });
  async function runPdf(root, l, file, redrawCards) {
    if (file.size > PDF_MAX) { A.toast('الملف كبير · الحد 6MB (قسّمه أو صدّر الشرائح المهمة بس)'); return; }
    const btn = root.querySelector('[data-pdf]'), label = btn.textContent;
    root.querySelectorAll('[data-ai],[data-photo],[data-pdf]').forEach((b) => { b.disabled = true; }); btn.textContent = 'نقرا الملف… (دقيقة تقريباً)';
    try {
      const image = await toB64(file);
      if (!image.startsWith('JVBER')) { A.toast('هذا مو ملف PDF'); return; }
      const r = await S.invokeFn('lecture-ai', { mode: 'pdf', title: A.val(root, 'lc_title') || file.name.replace(/\.pdf$/i, ''), image, media: 'application/pdf' });
      const notes = String((r && r.notes) || '').trim().slice(0, 12000), summary = String((r && r.summary) || '').trim().slice(0, 4000);
      if (!notes && !summary) { A.toast('ما قدرنا نقرا الملف · يمكن صور بدون نص'); return; }
      const ta = root.querySelector('[name=lc_notes]');
      if (notes) { ta.value = (ta.value.trim() ? ta.value.trim() + '\n\n' : '') + notes; ta.dispatchEvent(new Event('input')); }
      const sm = root.querySelector('[name=lc_summary]'); if (summary && !sm.value.trim()) sm.value = summary;
      const titleIn = root.querySelector('[name=lc_title]'); if (!titleIn.value.trim()) titleIn.value = file.name.replace(/\.pdf$/i, '').slice(0, 120);
      const have = new Set(l.cards.map((c) => c.q.trim()));
      const add = (Array.isArray(r.cards) ? r.cards : []).filter((c) => c && c.q && c.a && !have.has(String(c.q).trim())).slice(0, 10);
      add.forEach((c) => l.cards.push({ id: S.uuid(), q: String(c.q).slice(0, 300), a: String(c.a).slice(0, 600) }));
      if (add.length) redrawCards();
      A.toast('انضافت الملاحظات والملخص' + (add.length ? ' و' + add.length + ' سؤال' : '') + ' · راجعها واضغط «حفظ»');
    } catch (e) {
      const m = String(e && e.message || '');
      A.toast(m === 'quota' ? 'خلصت محاولاتك المجانية لهالشهر ✨ · ترجع أول الشهر' : m === 'limit' ? 'خلصت محاولات اليوم ✨ · جرّب بكرة' : m === 'signin' ? 'سجّل دخول أول' : m === 'unavailable' ? 'الذكاء قيد التجهيز · جرّب بعدين' : 'ما قدرنا نوصل للخدمة · جرّب بعدين');
    } finally { root.querySelectorAll('[data-ai],[data-photo],[data-pdf]').forEach((b) => { b.disabled = false; }); btn.textContent = label; }
  }

  // DW-054: بوربوينت أو وورد ← النص يطلع بالجهاز (بدون نت)، ولأصحاب الحسابات: ملاحظات مرتبة + ملخص + أسئلة
  const OFFICE_MAX = 30 * 1024 * 1024;
  function officeBlock() {
    return '<button type="button" class="btn ghost block" data-office style="margin:0 0 6px">📑 ارفع بوربوينت أو وورد</button>' +
      '<input type="file" id="lcOffice" accept=".pptx,.docx,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden>' +
      '<p class="small muted" style="margin:0 4px 12px">' + (S.status && S.status.signedIn && S.invokeFn && !S.status.aiOff ? 'نطلع نص الشرائح بجوالك، وبعدين نسوي منه ملاحظات مختصرة وملخص وأسئلة للمراجعة. الملف ما ينحفظ.' : 'نطلع نص الشرائح لملاحظاتك بجوالك (بدون نت). الملخص والأسئلة التلقائية تحتاج حساب.') + '</p>';
  }
  async function runOffice(root, l, file, redrawCards) {
    if (file.size > OFFICE_MAX) { A.toast('الملف كبير · الحد 30MB'); return; }
    const btn = root.querySelector('[data-office]'), label = btn.textContent;
    root.querySelectorAll('[data-ai],[data-photo],[data-pdf],[data-office]').forEach((b) => { b.disabled = true; }); btn.textContent = 'نقرا الملف…';
    try {
      let doc;
      try { doc = await window.HayatiOffice.extract(file); } catch (e) {
        A.toast(e && e.message === 'old' ? 'هذا ملف قديم (.ppt أو .doc) · احفظه pptx أو docx أو PDF وارفعه' : 'ما قدرنا نقرا الملف · جرّب تحفظه PDF'); return;
      }
      const text = doc.text.trim();
      if (!text) { A.toast('ما فيه نص بالملف (يمكن الشرائح صور) · جرّب «ملف PDF» أو «صوّر السبورة»'); return; }
      const ta = root.querySelector('[name=lc_notes]'), sm = root.querySelector('[name=lc_summary]'), titleIn = root.querySelector('[name=lc_title]');
      if (!titleIn.value.trim()) titleIn.value = file.name.replace(/\.(pptx|docx)$/i, '').slice(0, 120);
      const put = (notes) => { ta.value = ((ta.value.trim() ? ta.value.trim() + '\n\n' : '') + notes).slice(0, 20000); ta.dispatchEvent(new Event('input')); };
      if (!(S.status && S.status.signedIn && S.invokeFn && !S.status.aiOff)) {
        put(text);
        A.toast('انضاف نص ' + (doc.kind === 'pptx' ? doc.count + ' شريحة' : 'الملف') + ' للملاحظات · اضغط «حفظ»');
        return;
      }
      btn.textContent = '✨ نسوي المراجعة… (نص دقيقة تقريباً)';
      try {
        const r = await S.invokeFn('lecture-ai', { mode: 'slides', title: A.val(root, 'lc_title'), notes: text.slice(0, 20000) });
        const notes = String((r && r.notes) || '').trim().slice(0, 12000), summary = String((r && r.summary) || '').trim().slice(0, 4000);
        if (!notes && !summary) throw new Error('empty');
        put(notes || text);
        if (summary && !sm.value.trim()) sm.value = summary;
        const have = new Set(l.cards.map((c) => c.q.trim()));
        const add = (Array.isArray(r.cards) ? r.cards : []).filter((c) => c && c.q && c.a && !have.has(String(c.q).trim())).slice(0, 10);
        add.forEach((c) => l.cards.push({ id: S.uuid(), q: String(c.q).slice(0, 300), a: String(c.a).slice(0, 600) }));
        if (add.length) redrawCards();
        A.toast('المراجعة جاهزة: ملاحظات وملخص' + (add.length ? ' و' + add.length + ' سؤال' : '') + (text.length > 20000 ? ' (أول 20 ألف حرف)' : '') + ' · راجعها واضغط «حفظ»');
      } catch (e) {
        put(text);
        const m = String(e && e.message || '');
        A.toast((m === 'quota' ? 'خلصت محاولاتك المجانية لهالشهر ✨' : m === 'limit' ? 'خلصت محاولات اليوم ✨' : 'ما قدرنا نسوي الملخص') + ' · حطينا نص الملف بالملاحظات');
      }
    } finally { root.querySelectorAll('[data-ai],[data-photo],[data-pdf],[data-office]').forEach((b) => { b.disabled = false; }); btn.textContent = label; }
  }

  function sheet(id) {
    const old = lectures().find((x) => x.id === id);
    const l = Object.assign({ id: S.uuid(), course_id: '', title: '', date: today(), notes: '', summary: '', cards: [], audio: [] }, old || {});
    l.cards = (l.cards || []).map((c) => Object.assign({}, c)); l.audio = (l.audio || []).slice();
    const courses = st.courses || [];
    let rec = null, chunks = [], t0 = 0, timer = null;
    let nativeStop = null;
    const sttBtns = (i) => (speechLangs || []).map((lg) => '<button type="button" class="btn ghost" data-stt="' + i + '" data-lang="' + lg + '" aria-label="' + (lg === 'ar' ? 'حوّل التسجيل لنص عربي' : 'حوّل التسجيل لنص إنقليزي') + '">📝 ' + (lg === 'ar' ? 'نص' : 'EN') + '</button>').join('');
    const audioList = () => l.audio.length ? l.audio.map((a, i) => '<div class="clip" style="display:flex;align-items:center;gap:8px;margin:6px 0;flex-wrap:wrap"><button type="button" class="btn ghost" data-play="' + i + '">▶︎ تسجيل ' + (i + 1) + ' · ' + mmss(a.dur || 0) + '</button>' + sttBtns(i) + '<button type="button" class="icon-x" data-delclip="' + i + '" aria-label="حذف التسجيل">✕</button></div>').join('') +
      ((speechLangs || []).length ? '<p class="small muted" style="margin:2px 4px 0">📝 يحوّل الصوت لنص على جوالك نفسه (ما يطلع لأي مكان)، والنص مسودة تراجعها.</p>' : '') : '<p class="small muted" style="margin:6px 4px">ما فيه تسجيل.</p>';
    const cardsList = () => l.cards.map((c, i) => '<li class="row" style="cursor:default"><div class="main"><div class="title"><span class="t" dir="auto" style="white-space:normal;overflow:visible">' + mathify(c.q) + '</span></div><div class="sub" dir="auto">' + mathify(c.a) + '</div></div><button type="button" class="icon-x" data-delcard="' + i + '" aria-label="حذف السؤال">✕</button></li>').join('');
    A.openSheet({
      title: old ? 'ملف المحاضرة' : 'محاضرة جديدة',
      body: '<div class="field"><label>المادة</label><select name="lc_course"><option value="">بدون مادة</option>' + courses.map((c) => '<option data-noi18n value="' + c.id + '"' + (c.id === l.course_id ? ' selected' : '') + '>' + h(c.name) + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>عنوان المحاضرة</label><input name="lc_title" maxlength="120" placeholder="مثلاً: Chapter 3 — Ratios" value="' + h(l.title) + '"></div>' +
        '<div class="field"><label>التاريخ</label><input name="lc_date" type="date" value="' + h(l.date) + '"></div>' +
        '<div class="group-title">' + I('timer') + 'التسجيل</div>' +
        '<p class="small muted" style="margin:0 4px 8px">سجّل بس بإذن الدكتور. التسجيل يظل على جوالك، ما ينرفع لأي مكان.</p>' +
        (recPlugin() ? '<p class="small muted" style="margin:0 4px 8px" id="lcRecTip">📱 يكمل لو طلعت من التطبيق أو قفلت الشاشة. حط الجوال على الطاولة وظهره (الكاميرا) باتجاه الدكتور، عشان صوته يكون أوضح من السوالف اللي جنبك.</p>' : '') +
        '<button type="button" class="btn block" id="lcRec">🎙️ ابدأ التسجيل</button><div id="lcClips">' + audioList() + '</div>' +
        '<div class="group-title">' + I('book') + 'ملاحظاتك</div><div class="field"><textarea name="lc_notes" rows="5" maxlength="20000" placeholder="اللي قاله الدكتور، النقاط المهمة…">' + h(l.notes) + '</textarea></div>' + mathBar() +
        '<div class="field"><label>ملخصك بسطور</label><textarea name="lc_summary" rows="3" maxlength="4000" placeholder="لو بتشرحها لربعك بثلاث جمل، شنو بتقول؟">' + h(l.summary) + '</textarea></div>' +
        officeBlock() + aiBlock() +
        '<div class="group-title">' + I('target') + 'أسئلة تختبر فيها نفسك</div>' +
        '<div class="field"><input name="lc_q" maxlength="300" placeholder="السؤال"></div><div class="field"><input name="lc_a" maxlength="600" placeholder="الجواب"></div>' +
        '<button type="button" class="btn ghost block" id="lcAddCard">' + I('plus') + 'أضف السؤال</button>' +
        '<div class="card flush" style="margin-top:10px"><ul class="list" id="lcCards">' + cardsList() + '</ul></div>' +
        (old && l.cards.length ? '<button type="button" class="btn block" id="lcQuiz" style="margin-top:14px">' + I('target') + 'اختبرني بهالمحاضرة</button>' : '') +
        (old ? '<button type="button" class="btn ghost block" id="lcDel" style="margin-top:14px;color:var(--expense)">احذف المحاضرة</button>' : ''),
      mount(root) {
        const recBtn = root.querySelector('#lcRec');
        const redrawClips = () => { root.querySelector('#lcClips').innerHTML = audioList(); };
        if (!speechLangs) speechSupport().then((ls) => { if (ls.length && root.isConnected) redrawClips(); });
        const NR = recPlugin();
        let nOn = false;
        const tick = () => { clearInterval(timer); timer = setInterval(() => { if (root.isConnected) recBtn.textContent = '⏹ وقّف · ' + mmss((Date.now() - t0) / 1000); }, 500); recBtn.textContent = '⏹ وقّف · ' + mmss((Date.now() - t0) / 1000); };
        nativeStop = async () => {
          if (!nOn) return;
          nOn = false; clearInterval(timer); recBtn.textContent = '🎙️ ابدأ التسجيل';
          let r;
          try { r = await NR.stop(); } catch (e) { recFor(null); A.toast('ما قدرنا نحفظ التسجيل'); return; }
          recFor(null);
          const clip = { id: S.uuid(), dur: r.dur || Math.round((Date.now() - t0) / 1000), at: new Date(t0).toISOString() };
          try { await putClip(clip.id, b64Blob(r.data, r.mime || 'audio/mp4')); l.audio.push(clip); if (root.isConnected) redrawClips(); A.toast('انحفظ التسجيل · اضغط «حفظ»'); } catch (e) { A.toast('ما قدرنا نحفظ التسجيل'); }
        };
        // التسجيل شغال من قبل (طلعت ورجعت)؟ نرجّع زر الإيقاف
        if (NR) NR.status().then((st) => {
          if (!st || !st.recording || !root.isConnected) return;
          if (recFor() === l.id) { nOn = true; t0 = st.startedAt || Date.now(); tick(); }
          else recBtn.textContent = '🎙️ فيه تسجيل شغال بمحاضرة ثانية';
        }).catch(() => {});
        recBtn.onclick = async () => {
          if (NR) {
            if (nOn) { nativeStop(); return; }
            try { const r = await NR.start(); nOn = true; t0 = r.startedAt || Date.now(); recFor(l.id); tick(); A.toast('🎙️ يسجّل · يكمل لو طلعت من التطبيق'); }
            catch (e) { const m = String(e && e.message || ''); A.toast(m === 'denied' ? 'ما فيه إذن للمايك' : m === 'busy' ? 'فيه تسجيل شغال بمحاضرة ثانية' : 'ما قدرنا نبدأ التسجيل'); }
            return;
          }
          if (rec) { rec.stop(); return; }
          if (!navigator.mediaDevices || !window.MediaRecorder) { A.toast('التسجيل ما يشتغل على هالجهاز'); return; }
          let stream;
          try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { A.toast('ما فيه إذن للمايك'); return; }
          chunks = []; rec = new MediaRecorder(stream); t0 = Date.now();
          rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
          rec.onstop = async () => {
            clearInterval(timer); stream.getTracks().forEach((t) => t.stop());
            const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' }), clip = { id: S.uuid(), dur: Math.round((Date.now() - t0) / 1000), at: new Date().toISOString() };
            rec = null; recBtn.textContent = '🎙️ ابدأ التسجيل';
            try { await putClip(clip.id, blob); l.audio.push(clip); redrawClips(); A.toast('انحفظ التسجيل · اضغط «حفظ»'); } catch (e) { A.toast('ما قدرنا نحفظ التسجيل'); }
          };
          rec.start(1000);
          timer = setInterval(() => { recBtn.textContent = '⏹ وقّف · ' + mmss((Date.now() - t0) / 1000); }, 500);
          recBtn.textContent = '⏹ وقّف · 0:00';
        };
        root.querySelector('#lcClips').onclick = async (e) => {
          const t = e.target.closest('[data-stt]');
          if (t) { transcribeClip(root, l, Number(t.dataset.stt), t.dataset.lang, t); return; }
          const p = e.target.closest('[data-play]'), d = e.target.closest('[data-delclip]');
          if (p) { const c = l.audio[Number(p.dataset.play)]; const blob = c && await getClip(c.id).catch(() => null); if (!blob) { A.toast('التسجيل مو موجود على هالجهاز'); return; } new Audio(URL.createObjectURL(blob)).play(); }
          if (d && await A.ask('تحذف التسجيل؟')) { const [c] = l.audio.splice(Number(d.dataset.delclip), 1); if (c) delClip(c.id); redrawClips(); }
        };
        root.querySelector('#lcAddCard').onclick = () => {
          const q = A.val(root, 'lc_q'), a = A.val(root, 'lc_a');
          if (!q || !a) { A.toast('اكتب السؤال وجوابه'); return; }
          l.cards.push({ id: S.uuid(), q: q.slice(0, 300), a: a.slice(0, 600) });
          root.querySelector('[name=lc_q]').value = ''; root.querySelector('[name=lc_a]').value = '';
          root.querySelector('#lcCards').innerHTML = cardsList();
        };
        root.querySelector('#lcCards').onclick = (e) => { const d = e.target.closest('[data-delcard]'); if (d) { l.cards.splice(Number(d.dataset.delcard), 1); root.querySelector('#lcCards').innerHTML = cardsList(); } };
        let lastField = root.querySelector('[name=lc_notes]');
        root.querySelectorAll('[name=lc_notes],[name=lc_summary],[name=lc_q],[name=lc_a]').forEach((f) => { f.onfocus = () => { lastField = f; }; });
        root.querySelectorAll('[data-sym]').forEach((b) => {
          b.addEventListener('pointerdown', (e) => e.preventDefault());   // يخلي الكيبورد مفتوح
          b.onclick = () => { const f = lastField, at = f.selectionStart ?? f.value.length; f.setRangeText(b.dataset.sym, at, f.selectionEnd ?? at, 'end'); f.focus(); };
        });
        const ph = root.querySelector('[data-photo]'), phIn = root.querySelector('#lcPhoto');
        if (ph && phIn) { ph.onclick = () => phIn.click(); phIn.onchange = () => { const f = phIn.files[0]; phIn.value = ''; if (f) runPhoto(root, f); }; }
        const pd = root.querySelector('[data-pdf]'), pdIn = root.querySelector('#lcPdf');
        if (pd && pdIn) { pd.onclick = () => pdIn.click(); pdIn.onchange = () => { const f = pdIn.files[0]; pdIn.value = ''; if (f) runPdf(root, l, f, () => { root.querySelector('#lcCards').innerHTML = cardsList(); }); }; }
        const of = root.querySelector('[data-office]'), ofIn = root.querySelector('#lcOffice');
        if (of && ofIn) { of.onclick = () => ofIn.click(); ofIn.onchange = () => { const f = ofIn.files[0]; ofIn.value = ''; if (f) runOffice(root, l, f, () => { root.querySelector('#lcCards').innerHTML = cardsList(); }); }; }
        root.querySelectorAll('[data-ai]').forEach((b) => { b.onclick = () => runAi(root, l, b.dataset.ai, () => { root.querySelector('#lcCards').innerHTML = cardsList(); }); });
        const qz = root.querySelector('#lcQuiz');
        if (qz) qz.onclick = () => { A.closeSheet(); setTimeout(() => quiz([l.id]), 280); };
        const del = root.querySelector('#lcDel');
        if (del) del.onclick = async () => { if (await A.ask('تحذف المحاضرة وتسجيلاتها؟')) { (l.audio || []).forEach((c) => delClip(c.id)); S.remove('lectures', l.id); A.closeSheet(); A.toast('انحذفت'); } };
      },
      onSave(root) {
        if (rec) rec.stop();
        // التسجيل الأصلي يوقف بعد الحفظ بلحظة، فنحفظ المحاضرة مرة ثانية لما ينضاف المقطع
        if (nativeStop) nativeStop().then(() => S.upsert('lectures', l)).catch(() => {});
        const title = A.val(root, 'lc_title');
        if (!title) throw new Error('اكتب عنوان المحاضرة');
        S.upsert('lectures', Object.assign(l, { course_id: root.querySelector('[name=lc_course]').value, title: title.slice(0, 120), date: A.val(root, 'lc_date') || today(), notes: A.val(root, 'lc_notes'), summary: A.val(root, 'lc_summary') }));
        A.toast('انحفظ ✓');
      },
    });
  }

  // ================= اختبار تجريبي (من أسئلتك) =================
  // DW-113: opts.only = أرقام بطاقات بعينها (مراجعة اليوم، أغلاطك، مادة الاختبار) بنفس ترتيبها، و opts.title عنوان النافذة
  function quiz(ids, opts) {
    opts = opts || {};
    let pool = lectures().filter((l) => !ids || ids.includes(l.id)).flatMap((l) => (l.cards || []).map((c) => ({ c, l })));
    if (opts.only) { const ord = new Map(opts.only.map((id, i) => [id, i])); pool = pool.filter((x) => ord.has(x.c.id)).sort((a, b) => ord.get(a.c.id) - ord.get(b.c.id)); }
    if (!pool.length) { A.toast('أضف أسئلة بملف المحاضرة أول'); return; }
    const qs = (opts.only ? pool : pool.sort(() => Math.random() - 0.5)).slice(0, opts.max || 10);
    let i = 0, right = 0, shown = false;
    const draw = () => i >= qs.length
      ? '<div class="hero" style="padding:18px;text-align:center"><span class="eyebrow">' + I('target') + 'النتيجة</span><div class="amount-big num">' + Math.round((right / qs.length) * 100) + '%</div><p class="small">' + right + ' من ' + qs.length + (right === qs.length ? ' · فاهمها 💪' : ' · راجع اللي ما عرفته') + '</p></div>'
      : '<p class="small muted num" style="margin:0 4px 8px">سؤال ' + (i + 1) + ' من ' + qs.length + ' · ' + h(qs[i].l.title) + '</p><div class="card" style="padding:18px"><b id="qzQ" dir="auto" style="display:block">' + mathify(qs[i].c.q) + '</b>' +
        (shown ? '<p id="qzA" dir="auto" style="margin:12px 0 0;color:var(--brand)">' + mathify(qs[i].c.a) + '</p>' : '') + '</div>' +
        (shown ? '<div style="display:flex;gap:8px;margin-top:12px"><button type="button" class="btn primary" style="flex:1" data-qz="yes">عرفتها ✓</button><button type="button" class="btn ghost" style="flex:1" data-qz="no">ما عرفتها</button></div>'
          : '<button type="button" class="btn block" style="margin-top:12px" data-qz="show">شوف الجواب</button>');
    A.openSheet({
      title: opts.title || 'اختبار تجريبي', cancelLabel: 'تم',
      body: '<div id="qzRoot">' + draw() + '</div>',
      mount(root) {
        const box = root.querySelector('#qzRoot');
        box.onclick = (e) => {
          const b = e.target.closest('[data-qz]'); if (!b) return;
          if (b.dataset.qz === 'show') shown = true;
          else { if (b.dataset.qz === 'yes') right++; if (E.Cards && qs[i].c.id) E.Cards.mark(qs[i].c.id, b.dataset.qz === 'yes'); i++; shown = false; }
          box.innerHTML = draw();
          if (i >= qs.length) {   // نحفظ آخر نتيجة لكل محاضرة دخلت بالاختبار
            const score = Math.round((right / qs.length) * 100);
            [...new Set(qs.map((x) => x.l.id))].forEach((lid) => { const l = lectures().find((x) => x.id === lid); if (l) S.upsert('lectures', Object.assign({}, l, { last_score: score })); });
          }
        };
      },
    });
  }

  // ================= الربط =================
  E.viewLectures = view;
  E.lectureForm = () => sheet(null);
  wrap('action', (prev, name, el, e) => {
    switch (name) {
      case 'lec-new': sheet(null); return;
      case 'lec-open': sheet(el.dataset.id); return;
      case 'lec-quiz-all': quiz(null); return;
      default: return prev(name, el, e);
    }
  });
  E.Lectures = { mathify, view, sheet, quiz, putClip, getClip };
})();
