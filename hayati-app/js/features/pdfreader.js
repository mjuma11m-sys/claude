// DW-065: قارئ PDF بالمواقع — يقرا كل كلمة بمكانها (x, y) بدال ما يقرا سطر سطر، عشان:
//  • جداول الجامعة اللي تطلع من المواقع (يمين ← يسار، خلايا ملفوفة على سطرين، وخطوط أرقامها مكسورة)
//  • برامج التمرين اللي تطلع من البوربوينت (عمودين، كل تمرين بجولاته وتكراره وراحته)
// كله بالجهاز، بدون نت.
(function () {
  'use strict';

  const PDFJS = location.protocol === 'file:' ? 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/' : 'vendor/pdfjs/';
  let lib = null;
  function load() {
    if (lib) return lib;
    lib = window.pdfjsLib ? Promise.resolve(window.pdfjsLib) : new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = PDFJS + 'pdf.min.js';
      s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; res(window.pdfjsLib); };
      s.onerror = () => { lib = null; rej(new Error('pdf')); };
      document.head.appendChild(s);
    });
    return lib;
  }

  // بعض المواقع تطلع PDF بخط أرقامه مشفّرة: \u0013 = 0، \u0014 = 1، \u0003 = مسافة، \u0010 = «-»
  const BROKEN = /[\u0003\u0010\u0013-\u001c]/;
  // Google Docs يطلع الحروف العربية بأشكالها (Presentation Forms ﺍﻟ…): NFKC يرجعها حروف عادية قبل التنظيف
  const fix = (s) => String(s).normalize('NFKC').replace(/[\u0013-\u001c]/g, (c) => String(c.charCodeAt(0) - 0x13)).replace(/\u0003/g, ' ').replace(/\u0010/g, '-')
    .replace(/[^ -~ -ÿ؀-ۿ٠-٩‌-‏]/g, '').replace(/\s+/g, ' ').trim();

  async function items(file, maxPages) {
    const L = await load();
    const doc = await L.getDocument({ data: await file.arrayBuffer() }).promise;
    const out = [];
    for (let p = 1; p <= Math.min(doc.numPages, maxPages || 40); p++) {
      const pg = await doc.getPage(p);
      const w = pg.getViewport({ scale: 1 }).width;
      const raw = (await pg.getTextContent()).items.filter((it) => it.str && it.str.trim());
      const broken = raw.some((it) => BROKEN.test(it.str));
      for (const it of raw) {
        // بالخط المكسور: النسخة «النظيفة» من الوقت مكررة وغلط بكل صف (08:00 09:00 - ص)، والصح هو المشفّر
        if (broken && !BROKEN.test(it.str) && /\d{1,2}:\d{2}/.test(it.str)) continue;
        const s = fix(it.str);
        if (s) out.push({ s, x: it.transform[4], y: it.transform[5], p, w, wd: it.width || 0, broken });
      }
    }
    return out;
  }

  // ---------- الأيام (عادي أو مقلوب: «دحألا» = «الأحد» بالمقلوب) ----------
  const DAYS = [[0, ['الأحد', 'الاحد', 'sunday']], [1, ['الاثنين', 'الإثنين', 'الأثنين', 'الاثنبن', 'monday']], [2, ['الثلاثاء', 'الثلاثا', 'tuesday']],
    [3, ['الأربعاء', 'الاربعاء', 'wednesday']], [4, ['الخميس', 'thursday']], [5, ['الجمعة', 'الجمعه', 'friday']], [6, ['السبت', 'saturday']]];
  const rev = (s) => [...s].reverse().join('');
  // جذور الأيام: تلقى «األربعاء» و«الأثنيه» و«نثإلا» (مقلوب ومكسور)
  const ROOTS = [[0, ['أحد', 'احد']], [1, ['ثنين', 'ثني', 'اثن', 'إثن']], [2, ['ثلاث']], [3, ['ربعاء', 'ربع']], [4, ['خميس']], [5, ['جمعة', 'جمعه']], [6, ['سبت']]];
  // آخر يوم بالنص (الخط المكسور يكرر اسم أول يوم قبل اليوم الصح)
  function dayIn(s) {
    const t = String(s).toLowerCase().replace(/األ/g, 'الأ');
    let best = null;
    const all = DAYS.map(([d, n]) => [d, n.concat(ROOTS[d][1])]);
    // + بدايات الاسم مقلوبة («مخلا» = «الخم» مقلوب) لأن بعض الملفات تقص الاسم
    const pre = (n) => (/^ال/.test(n) ? [4, 5, 6].filter((k) => k < n.length).map((k) => rev(n.slice(0, k))) : []);
    for (const [d, names] of all) for (const n of names) for (const v of [n, rev(n), n.replace(/^ال/, ''), rev(n.replace(/^ال/, ''))].concat(pre(n))) {
      if (v.length < 3) continue;
      const i = t.lastIndexOf(v);
      if (i >= 0 && (!best || i > best.i)) best = { d, i };
    }
    return best ? best.d : null;
  }

  // ---------- جدول دراسي: صف لكل رمز مادة (MATH401) ----------
  const CODE = /^([A-Z]{2,5})\s?-?(\d{3,4}[A-Z]?)$/;
  const TIME = /(\d{1,2}):(\d{2})/g;
  const mins = (h, m) => Number(h) * 60 + Number(m);
  const hhmm = (x) => String(Math.floor(x / 60) % 24).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0');
  function schedule(all) {
    const out = [];
    const pages = [...new Set(all.map((i) => i.p))];
    let carry = null, prevDay = null;
    for (const p of pages) {
      const its = all.filter((i) => i.p === p);
      const heads = its.filter((i) => !/[A-Z]{2,5}\s?\d{3}/.test(i.s) && i.s.length < 80).map((i) => ({ y: i.y, d: dayIn(i.s) })).filter((h) => h.d != null).sort((a, b) => b.y - a.y);
      // الجدول مرتب بالأسبوع: لو اليوم المقروء رجع ورا (نص الملف غلط)، ناخذ اللي بعد السابق
      for (const h of heads) { h.eff = prevDay != null && h.d <= prevDay && prevDay < 6 ? prevDay + 1 : h.d; prevDay = h.eff; }
      const codes = [];
      for (const i of its) { const m = CODE.exec(i.s) || /\b([A-Z]{2,5})\s?(\d{3,4}[A-Z]?)\b/.exec(i.s); if (m && /[A-Z]{2,5}\d{3}|[A-Z]{2,5}\s\d{3}/.test(i.s)) codes.push({ i, code: m[1] + m[2] }); }
      if (!codes.length) { const last = heads.slice().sort((a, b) => a.y - b.y)[0]; if (last) carry = last.eff; continue; }
      const times = [];
      for (const i of its) { let m; TIME.lastIndex = 0; while ((m = TIME.exec(i.s))) if (Number(m[1]) < 24 && Number(m[2]) < 60) times.push({ y: i.y, t: mins(m[1], m[2]), pm: /م|pm/i.test(i.s) }); }
      for (const c of codes) {
        const y = c.i.y;
        // اليوم: أقرب عنوان فوق الصف (y أكبر) بنفس الصفحة، وإلا من الصفحة اللي قبل
        const above = heads.filter((h) => h.y > y).sort((a, b) => a.y - b.y)[0];
        const day = above ? above.eff : carry;
        // الأوقات: أقرب صف رمز لكل وقت
        const mine = times.filter((t) => codes.every((o) => Math.abs(o.i.y - t.y) >= Math.abs(y - t.y) - 0.5) && Math.abs(y - t.y) < 30).map((t) => t.t);
        if (day == null || mine.length < 2) continue;
        let a = Math.min(...mine), b = Math.max(...mine);
        if (a >= 60 && a < 420) { a += 720; if (b < 720) b += 720; }
        else if (b < a) b += 720;
        // الاسم: الرمز + أقرب نص إنقليزي بنفس الصف (والسطر الملفوف تحته)، والقاعة: رقم أو S40-021
        const row = its.filter((i) => i !== c.i && Math.abs(i.y - y) < 18);
        const words = row.filter((i) => /[A-Za-z]{3}/.test(i.s) && !CODE.test(i.s) && !/^[A-Z .]+$/.test(i.s.replace(/-/g, '').trim()))
          .sort((m, n) => Math.abs(m.x - c.i.x) - Math.abs(n.x - c.i.x));
        // أقرب نص للرمز + جيرانه بنفس العمود (السطر الملفوف فوقه أو تحته)
        const near = words[0] ? words.filter((i) => Math.abs(i.x - words[0].x) < 150).sort((m, n) => n.y - m.y || m.x - n.x) : [];
        let title = near.map((i) => i.s).join(' ');
        title = title.replace(/^[\s-]+|[\s-]+$/g, '').replace(/\s+/g, ' ');
        const roomI = row.find((i) => /^(\d{2,4}|[A-Z]{1,3}\d{1,3}[A-Z]?\s?-\s?\d{1,4}[A-Z]?)$/.test(i.s));
        out.push({ name: (c.code + (title ? ' ' + title : '')).slice(0, 60), days: [day], start: hhmm(a), end: hhmm(b), room: roomI ? roomI.s : '' });
      }
      const last = heads.slice().sort((a, b) => a.y - b.y)[0];
      if (last) carry = last.eff;
    }
    return out;
  }

  // ---------- برنامج تمرين: «N- اسم التمرين» + جولات + تكرار + راحة ----------
  // خط البوربوينت أحياناً يبدّل حروف (صذر = صدر)؛ نصلّح المعروف
  const GLYPH = { 'صذر': 'صدر', 'الذفع': 'الدفع', 'تراى': 'تراي', 'باى': 'باي', 'خلفى': 'خلفي', 'تماريه': 'تمارين', 'دقيقتني': 'دقيقتين', 'الأرجل': 'الأرجل' };
  const fixAr = (s) => String(s).split(' ').map((w) => GLYPH[w] || w).join(' ');
  // خط بوربوينت مكسور (ذ بدال د، ى بدال ن…): بصمته «تماريه» أو «لمشاهذة»
  function unglyph(t) {
    return String(t).replace(/األ/g, 'الأ').replace(/تماريه/g, 'تمارين').replace(/دقيقتني/g, 'دقيقتين').replace(/ثوني/g, 'ثنين')
      .replace(/ذ/g, 'د').replace(/ى(?=[\u0621-\u064a])/g, 'ن').replace(/ى(?![\u0621-\u064a])/g, 'ي');
  }
  function workout(all) {
    if (all.some((i) => /تماريه|لمشاهذة|الذفع/.test(i.s))) all = all.map((i) => Object.assign({}, i, { s: unglyph(i.s) }));
    const pages = [...new Set(all.map((i) => i.p))];
    const plans = [];
    let cur = null;
    for (const p of pages) {
      const its = all.filter((i) => i.p === p);
      const lines = groupLines(its);
      // صفحة عنوان اليوم: «تمارين يوم السبت» (بدون تمارين مرقّمة)
      const hasEx = its.some((i) => /^\d{1,2}\s*-\s*\S*/.test(i.s) && /[A-Za-z]/.test(lineAt(lines, i).text));
      const head = !hasEx && lines.find((l) => /تمار|تماري/.test(l.text) && dayIn(l.text) != null);
      if (head) {
        const d = dayIn(head.text);
        // «(يوم الدفع يشمل)»: الكلمات اللي بنفس ارتفاع «يشمل»، من اليمين
        const sh = its.find((i) => /يشمل/.test(i.s));
        const sub = sh ? { text: its.filter((i) => Math.abs(i.y - sh.y) < 10 && /[\u0600-\u06ff]/.test(i.s)).sort((a, b) => b.x - a.x).map((i) => i.s).join(' ') } : null;
        const focus = lines.find((l) => /\+/.test(l.text) && /[\u0600-\u06ff]/.test(l.text));
        const label = sub ? fixAr(sub.text).replace(/[()]/g, '').replace(/يشمل/, '').trim() : '';
        cur = { day: d, name: label || 'تمرين', focus: focus ? fixAr(focus.text.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim()).replace(/\s*\+\s*/g, ' + ').trim() : '', exercises: [] };
        plans.push(cur);
        continue;
      }
      if (!cur) continue;
      // عناوين التمارين: سطر يبدأ بـ «N-» وفيه حروف إنقليزية
      const titles = lines.filter((l) => /^\d{1,2}\s*-\s*\S/.test(l.text.trim()) && /[A-Za-z]{2}/.test(l.text));
      for (const t of titles) {
        const n = Number(/^(\d{1,2})/.exec(t.text.trim())[1]);
        const name = t.text.replace(/^\s*\d{1,2}\s*-\s*/, '').replace(/\s+/g, ' ').trim();
        const box = its.filter((i) => i.x >= t.x - 120 && i.x <= t.x + 720 && i.y < t.y - 40 && i.y > t.y - 300 && /^(\d{1,3}|x|ثانية|\d+\s*ثانية)$/i.test(i.s));
        const rows = groupRows(box);
        if (rows.length < 2) continue;
        const numRows = rows.filter((r) => r.some((i) => /^\d{1,3}$/.test(i.s)));
        if (numRows.length < 2) continue;
        const reps = merge(numRows[numRows.length - 1].filter((i) => !/^x$/i.test(i.s)));   // أوطى صف أرقام = التكرار
        const secs = /pla?nk|palnk|\bhold\b|wall sit/i.test(name) || reps.some((i) => /ثانية/.test(i.s)) || box.some((i) => /ثانية/.test(i.s) && i.y <= rows[rows.length - 1][0].y + 10);
        const sets = reps.filter((i) => /^\d{1,3}$/.test(i.s)).sort((a, b) => a.x - b.x).map((i) => i.s + (secs ? 'ث' : ''));
        if (!sets.length) continue;
        const restI = its.filter((i) => /دقيق|ثانية/.test(i.s) && i.x < t.x - 60 && i.x > t.x - 620 && i.y < t.y - 250 && i.y > t.y - 520)
          .sort((a, b) => Math.abs(a.y - (t.y - 400)) - Math.abs(b.y - (t.y - 400)))[0];
        const rest = !restI ? 60 : /دقيقتين|دقيقتني/.test(restI.s) ? 120 : /دقيق/.test(restI.s) ? 60 : Number((restI.s.match(/\d+/) || [30])[0]);
        cur.exercises.push({ n, name: name.slice(0, 60), sets, rest });
      }
    }
    return plans.filter((p) => p.exercises.length).map((p) => Object.assign(p, { exercises: p.exercises.sort((a, b) => a.n - b.n).map(({ name, sets, rest }) => ({ name, sets, rest })) }));
  }
  // نفس السطر = نفس y تقريباً وقريبين بالعرض
  function groupLines(its) {
    const out = [];
    for (const i of its.slice().sort((a, b) => b.y - a.y || a.x - b.x)) {
      const l = out.find((o) => Math.abs(o.y - i.y) < 8 && i.x - o.xr < 450 && i.x > o.x - 40);
      if (l) { l.parts.push(i); l.xr = Math.max(l.xr, i.x + i.s.length * 14); } else out.push({ y: i.y, x: i.x, xr: i.x + i.s.length * 14, parts: [i] });
    }
    for (const l of out) {
      l.parts.sort((a, b) => a.x - b.x); l.x = l.parts[0].x;
      const ar = l.parts.some((i) => /[\u0600-\u06ff]/.test(i.s)) && !l.parts.some((i) => /[A-Za-z]/.test(i.s));   // سطر عربي: من اليمين
      l.text = (ar ? l.parts.slice().reverse() : l.parts).map((i) => i.s).join(' ').replace(/\(\s*/g, '(').replace(/\s*\)/g, ')');
      if (ar) l.text = l.text.replace(/^\)(.*)\($/, '($1)');
    }
    return out;
  }
  const lineAt = (lines, i) => lines.find((l) => l.parts.includes(i)) || { text: '' };
  // «15» أحياناً تجي «1» و«5» لاصقين
  function merge(row) {
    const r = row.slice().sort((a, b) => a.x - b.x), out = [];
    for (const i of r) { const l = out[out.length - 1]; if (l && /^\d$/.test(l.s) && /^\d$/.test(i.s) && i.x - l.x < 45) l.s += i.s; else out.push(Object.assign({}, i)); }
    return out;
  }
  function groupRows(box) {
    const rows = [];
    for (const i of box.slice().sort((a, b) => b.y - a.y)) { const r = rows.find((o) => Math.abs(o[0].y - i.y) < 25); if (r) r.push(i); else rows.push([i]); }
    return rows;
  }

  // ---------- النص سطر سطر (للقرّاء اللي يشتغلون على نص) ----------
  // Google Docs يطلع كل حرف عربي لحاله: نجمع اللي بنفس الارتفاع، من اليمين لليسار، ونحط مسافة لو فيه فراغ بينهم
  function lines(all) {
    const out = [];
    for (const p of [...new Set(all.map((i) => i.p))]) {
      const rows = [];
      for (const i of all.filter((x) => x.p === p).sort((a, b) => b.y - a.y)) { const r = rows.find((o) => Math.abs(o.y - i.y) < 4); if (r) r.its.push(i); else rows.push({ y: i.y, its: [i] }); }
      for (const r of rows) {
        const its = r.its.sort((a, b) => b.x - a.x);
        let t = '';
        its.forEach((i, k) => { const prev = its[k - 1]; t += (prev && prev.x - (i.x + i.wd) > 2.5 ? ' ' : '') + i.s; });
        out.push(t.replace(/\s+/g, ' ').trim());
      }
    }
    return out.filter(Boolean).join('\n');
  }

  window.HayatiPdfRead = { items, schedule, workout, dayIn, fix, lines };
})();
