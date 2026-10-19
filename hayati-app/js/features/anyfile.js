// DW-074: «اقرأ أي ملف» — مدخل واحد: نعرف نوع الملف بالجهاز ونوديه للمكان الصح
// PDF (برنامج جيم/جدول جامعة/برنامج الفريق/كشف حساب/محاضرة) · Word وPowerPoint ← محاضرة · Excel وCSV ← كشف · نص ← رسالة المدرب أو البنك أو جدول
// الصور تحتاج الذكاء (حساب)؛ ولو ما عرفنا النوع نسأل «وش هالملف؟»
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, I, h } = A;
  const wrap = (name, fn) => { const prev = E[name]; E[name] = (...a) => fn(prev ? prev : () => '', ...a); };

  const ext = (f) => (/\.([a-z0-9]+)$/i.exec(f.name || '') || [, ''])[1].toLowerCase();
  const isPdf = (f) => /pdf$/i.test(f.type) || ext(f) === 'pdf';
  const isImg = (f) => /^image\//.test(f.type) || /^(png|jpe?g|heic|webp)$/.test(ext(f));
  const aiOn = () => !!(S.status && S.status.signedIn && S.invokeFn && !S.status.aiOff);
  const TEAM = /تمرين|تمارين|مباراة|مباراه|تدريب/;

  // ---------- وش هالملف؟ ----------
  async function classify(file) {
    const x = ext(file);
    if (/^(pptx|docx)$/.test(x)) return { to: 'lecture-office' };
    if (/^(xlsx|xls|csv|xml|ofx|qif)$/.test(x)) return { to: 'bank' };
    if (isImg(file)) return { to: 'image' };
    if (isPdf(file)) {
      const R = window.HayatiPdfRead;
      if (!R) return { to: 'ask' };
      let its;
      try { its = await R.items(file, 6); } catch (e) { return { to: 'ask' }; }
      if (R.workout(its).length || R.schedule(its).length) return { to: 'timetable' };
      const text = R.lines(its);
      return fromText(text, true);
    }
    if (/^(txt|text|md)$/.test(x) || /^text\//.test(file.type)) return fromText(await file.text(), false);
    return { to: 'ask' };
  }
  function fromText(text, pdf) {
    const now = new Date();
    if (TEAM.test(text) && E._parseFootball && E._parseFootball(text).length) return { to: 'football', text };
    const lines = text.split('\n');
    if (E._bank && ((pdf && E._bank.fromPdfLines(lines, now).length >= 3) || (!pdf && E._bank.fromText(text, now).length >= 2))) return { to: 'bank' };
    if (!pdf && E._parseTimetable && E._parseTimetable(text, '').length) return { to: 'timetable-text', text };
    if (text.replace(/\s/g, '').length >= 150) return { to: 'lecture-text', text };
    return { to: 'ask' };
  }

  // ---------- نسلّم الملف للشاشة المناسبة ----------
  // نحط الملف بخانة الرفع حقها ونضغط «اقرأ» عنه
  function inject(sel, file) {
    const inp = document.querySelector(sel);
    if (!inp) return false;
    try { const dt = new DataTransfer(); dt.items.add(file); inp.files = dt.files; } catch (e) { return false; }
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  const later = (fn) => setTimeout(fn, 300);   // بعد ما تتسكر النافذة اللي قبل وتنفتح الجديدة
  const click = (sel) => { const b = document.querySelector(sel); if (b) b.click(); };
  const title = (file) => String(file.name || '').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 60);

  function lectureWith(fill) {
    E.lectureForm();
    later(() => fill());
  }
  function route(r, file) {
    A.closeSheet();
    later(() => {
      switch (r.to) {
        case 'bank': E.bankImport(file); return;
        case 'football': E.footballImport(r.text); return;
        case 'timetable': E.timetable(); later(() => { if (inject('#ttFile', file)) click('#ttRead'); }); return;
        case 'timetable-text': E.timetable(); later(() => { const t = document.querySelector('[name=tt_txt]'); if (t) { t.value = r.text; click('#ttRead'); } }); return;
        case 'lecture-office': lectureWith(() => inject('#lcOffice', file)); return;
        case 'lecture-photo': lectureWith(() => inject('#lcPhoto', file)); return;
        case 'lecture-text':
          // الذكاء يطلع ملاحظات وملخص وأسئلة؛ بدونه نحط نص الملف بملاحظات المحاضرة (بالجهاز)
          if (aiOn() && isPdf(file)) { lectureWith(() => inject('#lcPdf', file)); return; }
          lectureWith(() => {
            const t = document.querySelector('[name=lc_title]'), n = document.querySelector('[name=lc_notes]');
            if (t && !t.value) t.value = title(file);
            if (n) { n.value = r.text.slice(0, 20000); n.dispatchEvent(new Event('input', { bubbles: true })); }
            A.toast('حطّينا نص الملف بالملاحظات ✓');
          });
          return;
        case 'image': imageSheet(file); return;
        default: askSheet(file);
      }
    });
  }

  // الصورة: الذكاء يقراها (لأصحاب الحسابات)، فنسأل وش هي
  function imageSheet(file) {
    if (!aiOn()) { A.toast('قراءة الصور تحتاج حساب · سجّل دخول من الإعدادات، أو ارفع PDF أو الصق النص'); return; }
    pick(file, 'وش هالصورة؟', [['timetable', 'calendar', 'جدول', 'دراسة، دوام، أو تمارين'], ['lecture-photo', 'book', 'سبورة أو ملاحظات محاضرة', 'تنحفظ بمحاضرة جديدة']]);
  }
  function askSheet(file) {
    pick(file, 'وش هالملف؟', [['bank', 'download', 'كشف حساب', 'عمليات البنك بتواريخها'], ['timetable', 'calendar', 'جدول', 'دراسة، دوام، أو برنامج جيم'],
      ['football', 'upload', 'برنامج الفريق', 'تمارين ومباريات بتواريخها'], ['lecture', 'book', 'محاضرة', 'ملف المادة أو الشرائح']]);
  }
  function pick(file, ttl, opts) {
    A.openSheet({
      title: ttl, cancelLabel: 'إلغاء',
      body: '<p class="small muted" style="margin:0 4px 10px">📎 <bdi>' + h(file.name || '') + '</bdi></p><div class="card flush"><ul class="list">' +
        opts.map(([k, ic, t, sub]) => '<li class="row" data-to="' + k + '"><div class="ico">' + I(ic) + '</div><div class="main"><div class="title"><span class="t">' + h(t) + '</span></div><div class="sub">' + h(sub) + '</div></div>' + I('chevL') + '</li>').join('') + '</ul></div>',
      mount(root) {
        root.querySelector('.list').onclick = (e) => {
          const li = e.target.closest('[data-to]'); if (!li) return;
          const to = li.dataset.to;
          if (to === 'football') { A.closeSheet(); later(() => { E.footballImport(); later(() => { if (inject('#impFile', file)) click('#impRead'); }); }); return; }
          if (to === 'lecture') { route({ to: /^(pptx|docx)$/.test(ext(file)) ? 'lecture-office' : isPdf(file) && aiOn() ? 'lecture-text' : 'lecture-photo' }, file); return; }
          route({ to }, file);
        };
      },
    });
  }

  // ---------- المدخل ----------
  async function readAny(file) {
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) { A.toast('الملف كبير · الحد 30MB'); return; }
    A.toast('📎 أقرا الملف…');
    let r;
    try { r = await classify(file); } catch (e) { r = { to: 'ask' }; }
    route(r, file);
  }
  function choose() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.hidden = true;
    inp.accept = 'application/pdf,.pdf,image/*,.pptx,.docx,.xlsx,.xls,.csv,.xml,.txt';
    inp.onchange = () => { const f = inp.files[0]; inp.remove(); readAny(f); };
    document.body.appendChild(inp);
    inp.click();
  }

  wrap('chooserItems', (prev, item) => prev(item) + item('anyfile', 'upload', '#13636B', 'اقرأ أي ملف', 'PDF، صورة، Word، PowerPoint، Excel: نعرف وش هو ونرتبه'));
  const prevPick = E.pick;
  E.pick = (k) => { if (k === 'anyfile') { A.closeSheet(); later(choose); return; } if (prevPick) prevPick(k); };
  wrap('action', (prev, name, el, e) => { if (name === 'anyfile') { choose(); return; } return prev(name, el, e); });
  E.readAnyFile = readAny;
  E.chooseAnyFile = choose;
  E._classifyFile = classify; // للاختبار
})();
