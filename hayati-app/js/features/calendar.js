// تصدير الجدول والمهام إلى تقويم الآيفون/الماك مع تنبيهات
(function (global) {
  'use strict';

  const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const KIND_LABEL = { homework: 'واجب', exam: 'اختبار', appointment: 'موعد', personal: 'مهمة', other: 'تذكير' };
  const TYPE = {
    lecture: { emoji: '📚 ', now: (n) => 'الحين وقت محاضرة ' + n },
    gym: { emoji: '💪 ', now: (n) => 'الحين وقت التمرين — ' + n },
    activity: { emoji: '⭐ ', now: (n) => 'الحين وقت ' + n },
  };

  function pad(n) { return String(n).padStart(2, '0'); }

  // وقت محلي بدون منطقة زمنية → التقويم يعتبره بتوقيت الجهاز
  function local(d) {
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
  }
  function utc(d) {
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
  }

  function esc(s) {
    return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }

  // كل سطر لازم ما يتعدى ٧٥ بايت (العربي حرفه بايتين)
  function fold(line) {
    const enc = new TextEncoder();
    const out = [];
    let cur = '';
    let bytes = 0;
    let limit = 75;
    for (const ch of line) {
      const b = enc.encode(ch).length;
      if (bytes + b > limit) {
        out.push(cur);
        cur = ' ';
        bytes = 1;
        limit = 75;
      }
      cur += ch;
      bytes += b;
    }
    out.push(cur);
    return out.join('\r\n');
  }

  function alarm(trigger, text) {
    return ['BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:' + trigger, 'DESCRIPTION:' + esc(text), 'END:VALARM'];
  }

  function at(date, hhmm) {
    const [h, m] = String(hhmm || '08:00').split(':').map(Number);
    const d = new Date(date);
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  }

  /**
   * opts: { courses, tasks, remindBefore (دقائق), semesterEnd ("YYYY-MM-DD" أو فاضي), includeTasks }
   */
  function build(opts) {
    const now = new Date();
    const stamp = utc(now);
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hayati//AR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'X-WR-CALNAME:' + esc('حياتي — الجدول'),
    ];
    const before = Number(opts.remindBefore) || 10;
    const until = opts.semesterEnd ? opts.semesterEnd.replace(/-/g, '') + 'T235959' : null;
    let count = 0;

    for (const c of opts.courses || []) {
      for (const day of c.days || []) {
        // أول مرة: هالأسبوع (اليوم أو بعده)
        const first = new Date(now);
        first.setDate(now.getDate() + ((day - now.getDay() + 7) % 7));
        const start = at(first, c.start_time);
        const end = at(first, c.end_time || c.start_time);
        if (end <= start) end.setTime(start.getTime() + 50 * 60000);
        lines.push(
          'BEGIN:VEVENT',
          'UID:course-' + c.id + '-' + day + '@hayati',
          'DTSTAMP:' + stamp,
          'DTSTART:' + local(start),
          'DTEND:' + local(end),
          'RRULE:FREQ=WEEKLY;BYDAY=' + BYDAY[day] + (until ? ';UNTIL=' + until : ''),
          'SUMMARY:' + esc((TYPE[c.type] || TYPE.lecture).emoji + c.name),
          c.room ? 'LOCATION:' + esc(c.room) : null,
          c.workout && c.workout.exercises ? 'DESCRIPTION:' + esc((c.workout.focus || '') + '\n' + c.workout.exercises.map((x, i) => (i + 1) + '. ' + x.name + ' — ' + x.sets.join(' · ')).join('\n')) : null,
          ...alarm('-PT' + before + 'M', 'باقي ' + before + ' دقايق على ' + c.name + (c.room ? ' — ' + c.room : '')),
          ...alarm('PT0M', (TYPE[c.type] || TYPE.lecture).now(c.name)),
          'END:VEVENT'
        );
        count++;
      }
    }

    if (opts.includeTasks) {
      for (const t of opts.tasks || []) {
        if (t.done || !t.due_at) continue;
        const due = new Date(t.due_at);
        if (due < now) continue;
        const label = KIND_LABEL[t.kind] || 'تذكير';
        const end = new Date(due.getTime() + (t.kind === 'appointment' ? Number(t.duration) || 60 : t.kind === 'exam' ? 60 : 30) * 60000);
        const alarms = t.kind === 'appointment'
          ? [...alarm('-PT30M', 'باقي نص ساعة على موعدك: ' + t.title), ...alarm('PT0M', 'الحين موعدك: ' + t.title)]
          : t.kind === 'exam'
          ? [...alarm('-P1D', 'بكرة اختبار: ' + t.title), ...alarm('-PT1H', 'باقي ساعة على اختبار ' + t.title)]
          : t.kind === 'homework'
            ? [...alarm('-P1D', 'تسليم بكرة: ' + t.title), ...alarm('-PT2H', 'باقي ساعتين على تسليم ' + t.title)]
            : [...alarm('PT0M', 'الحين: ' + t.title)];
        lines.push(
          'BEGIN:VEVENT',
          'UID:task-' + t.id + '@hayati',
          'DTSTAMP:' + stamp,
          'DTSTART:' + local(due),
          'DTEND:' + local(end),
          'SUMMARY:' + esc((t.kind === 'exam' ? '📝 ' : t.kind === 'appointment' ? '🕒 ' : '✅ ') + label + ': ' + t.title),
          t.place ? 'LOCATION:' + esc(t.place) : null,
          t.notes ? 'DESCRIPTION:' + esc(t.notes) : null,
          ...alarms,
          'END:VEVENT'
        );
        count++;
      }
    }

    // الاشتراكات: تذكير يوم التجديد
    for (const s of opts.subscriptions || []) {
      if (s.active === false) continue;
      const day = Math.min(Number(s.day) || 1, 28) === Number(s.day) ? Number(s.day) : -1;
      const first = new Date(now.getFullYear(), now.getMonth(), Math.min(Number(s.day) || 1, 28), 10, 0, 0);
      const rule = s.cycle === 'yearly' ? 'FREQ=YEARLY;BYMONTH=' + (Number(s.month) || 1) + ';BYMONTHDAY=' + day : 'FREQ=MONTHLY;BYMONTHDAY=' + day;
      const rd = Number(s.remind_days) || 0;
      lines.push(
        'BEGIN:VEVENT',
        'UID:sub-' + s.id + '@hayati',
        'DTSTAMP:' + stamp,
        'DTSTART:' + local(first),
        'DTEND:' + local(new Date(first.getTime() + 15 * 60000)),
        'RRULE:' + rule,
        'SUMMARY:' + esc('💳 تجديد ' + s.name + ' — ' + A.fmt(s.amount) + ' ' + (window.HayatiCur ? HayatiCur.sym() : 'د.ب')),
        ...alarm(rd ? '-P' + rd + 'D' : 'PT0M', (rd ? 'بعد ' + rd + ' يوم ' : 'اليوم ') + 'يتجدد ' + s.name),
        'END:VEVENT'
      );
      count++;
    }

    // الصلاة: الوقت يتغير كل يوم، فكل يوم حدث بروحه (UID ثابت لليوم عشان التصدير الجديد يحدّث مو يكرر)
    for (const p of opts.prayers || []) {
      const start = new Date(p.date); start.setHours(0, 0, 0, 0); start.setMinutes(p.start);
      if (start < now) continue;
      lines.push(
        'BEGIN:VEVENT',
        'UID:prayer-' + p.key + '-' + local(start).slice(0, 8) + '@hayati',
        'DTSTAMP:' + stamp,
        'DTSTART:' + local(start),
        'DTEND:' + local(new Date(start.getTime() + (p.dur || 20) * 60000)),
        'SUMMARY:' + esc('🕌 ' + p.name),
        ...alarm('PT0M', 'الحين وقت ' + p.name),
        'END:VEVENT'
      );
      count++;
    }

    lines.push('END:VCALENDAR');
    return { text: lines.filter(Boolean).map(fold).join('\r\n') + '\r\n', count };
  }

  function download(text, filename) {
    const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS) {
      // سفاري الآيفون يفتح ملف التقويم مباشرة ويعرض "إضافة الكل"
      global.location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(text);
      return;
    }
    const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  global.CalendarExport = { build, download };
})(window);
