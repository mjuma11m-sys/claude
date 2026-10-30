// DW-106: «💊 أدويتك» — تذكير بوقت كل دواء، ✓ «أخذته» من الرئيسية، وكم حبة باقية وتنبيه «جدّد الوصفة».
// تذكير بس، مو نصيحة طبية. معلومة صحية: على الجهاز بس (hayati-meds) وتدخل بالنسخة الاحتياطية المشفّرة.
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, h } = A;
  const KEY = 'hayati-meds';
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { A.toast('ما قدرنا نحفظ على هالجهاز'); } if (window.HayatiNative && HayatiNative.reschedule) { clearTimeout(save.t); save.t = setTimeout(() => HayatiNative.reschedule(), 800); } A.render(); };
  const t12 = (s) => A.time12(s);
  const ends = (m, d) => !!(m.end && ymd(d) > m.end);
  const onDay = (m, d) => !ends(m, d) && (!m.start || ymd(d) >= m.start) && (!Array.isArray(m.days) || !m.days.length || m.days.includes(d.getDay()));
  const low = (m) => m.stock !== '' && m.stock != null && Number(m.stock) <= (Number(m.refill) || 5);

  // ================= الرئيسية =================
  function todayCard(now) {
    now = now || new Date();
    const k = ymd(now), meds = load().filter((m) => onDay(m, now) && (m.times || []).length);
    if (!meds.length) return '';
    const doses = []; meds.forEach((m) => m.times.forEach((t) => doses.push({ m, t, done: ((m.taken || {})[k] || []).includes(t) })));
    doses.sort((a, b) => a.t.localeCompare(b.t));
    const left = doses.filter((d) => !d.done).length;
    return '<section data-tk="meds"><div class="card"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><b style="flex:1">💊 <span>أدويتك اليوم</span></b><span class="tag">' + (left ? '<span>باقي</span> <bdi class="num">' + left + '</bdi>' : '✓ <span>خلصت</span>') + '</span></div>' +
      '<ul class="list">' + doses.map((d) => '<li class="row" style="cursor:default"><div class="ico" style="font-size:11px;white-space:nowrap;width:auto;min-width:44px;padding:0 6px">' + t12(d.t) + '</div><div class="main"><div class="title"><bdi>' + h(d.m.name) + '</bdi>' + (d.m.dose ? ' · <bdi class="small muted">' + h(d.m.dose) + '</bdi>' : '') + '</div>' +
        (low(d.m) ? '<div class="sub" style="color:var(--warn)"><span>باقي</span> <bdi class="num">' + Number(d.m.stock) + '</bdi> <span>· جدّد الوصفة</span></div>' : '') + '</div>' +
        (d.done ? '<span class="tag brand">✓</span>' : '<button class="btn primary" data-action="med-take" data-id="' + d.m.id + '" data-t="' + d.t + '">أخذته</button>') + '</li>').join('') + '</ul></div></section>';
  }
  function take(id, t, now) {
    now = now || new Date();
    const v = load(), m = v.find((x) => x.id === id); if (!m) return;
    const k = ymd(now); m.taken = m.taken || {};
    const list = m.taken[k] || []; if (list.includes(t)) return;
    m.taken[k] = list.concat(t);
    if (m.stock !== '' && m.stock != null) m.stock = Math.max(0, Number(m.stock) - (Number(m.per) || 1));
    // نخلي آخر 14 يوم بس
    const keys = Object.keys(m.taken).sort(); while (keys.length > 14) delete m.taken[keys.shift()];
    save(v);
    A.toast(low(m) ? 'أخذته ✓ · جدّد الوصفة، باقي ' + m.stock : '✓ الله يعافيك');
  }

  // ================= القائمة والنموذج =================
  function sheet() {
    const v = load();
    A.openSheet({
      title: '💊 أدويتك', cancelLabel: 'تم',
      body: '<p class="small muted" style="margin:0 4px 12px">تذكير بوقت كل دواء، ونقول لك لما تقرب الحبوب تخلص. تذكير بس، مو نصيحة طبية: اتبع وصفة دكتورك. يبقى على جهازك بس.</p>' +
        (v.length ? '<div class="card flush"><ul class="list">' + v.map((m) => '<li class="row" data-med="' + m.id + '"><div class="ico">💊</div><div class="main"><div class="title"><bdi>' + h(m.name) + '</bdi></div><div class="sub" style="white-space:normal">' +
          (m.times || []).map((t) => '<span>' + t12(t) + '</span>').join(' · ') + (m.stock !== '' && m.stock != null ? ' · <span>باقي</span> <bdi class="num">' + Number(m.stock) + '</bdi>' : '') + (ends(m, new Date()) ? ' · <span>خلص الكورس</span>' : '') + '</div></div></li>').join('') + '</ul></div>'
          : '') + '<button type="button" class="btn primary block" id="mdAdd" style="margin-top:12px">＋ أضف دواء</button>',
      mount(root) {
        root.querySelector('#mdAdd').onclick = () => { A.closeSheet(); setTimeout(() => form(), 280); };
        root.querySelectorAll('[data-med]').forEach((r) => { r.onclick = () => { A.closeSheet(); setTimeout(() => form(load().find((x) => x.id === r.dataset.med)), 280); }; });
      },
    });
  }
  const DAYS = A.DAYS_SHORT;
  function form(m) {
    const times = (m && m.times && m.times.length ? m.times : ['08:00']);
    A.openSheet({
      title: m ? 'عدّل الدواء' : 'دواء جديد', saveLabel: 'حفظ',
      body: '<div class="field"><label>اسم الدواء</label><input name="name" value="' + h((m && m.name) || '') + '" placeholder="مثلاً: فيتامين د"></div>' +
        '<div class="field"><label>الجرعة (اختياري)</label><input name="dose" value="' + h((m && m.dose) || '') + '" placeholder="مثلاً: حبة بعد الأكل"></div>' +
        '<div class="field"><label>الأوقات</label><div id="mdTimes">' + times.map((t) => '<input type="time" class="md-t" value="' + h(t) + '" style="margin-bottom:6px">').join('') + '</div><button type="button" class="btn ghost" id="mdMore">＋ وقت ثاني</button></div>' +
        '<div class="field"><label>الأيام</label><div class="seg" id="mdDays" style="flex-wrap:wrap">' + DAYS.map((d, i) => '<button type="button" data-k="' + i + '" class="' + (!m || !m.days || !m.days.length || m.days.includes(i) ? 'on' : '') + '">' + d + '</button>').join('') + '</div></div>' +
        '<div class="field"><label>كم حبة عندك؟ (اختياري)</label><input name="stock" inputmode="numeric" class="ltr" value="' + h(m && m.stock != null ? String(m.stock) : '') + '"></div>' +
        '<div class="field"><label>كم حبة بكل مرة؟</label><input name="per" inputmode="numeric" class="ltr" value="' + h(String((m && m.per) || 1)) + '"></div>' +
        '<div class="field"><label>ينتهي الكورس (اختياري)</label><input name="end" type="date" value="' + h((m && m.end) || '') + '"></div>' +
        (m ? '<button type="button" class="btn danger block" id="mdDel">حذف</button>' : ''),
      mount(root) {
        root.querySelector('#mdMore').onclick = () => { const i = document.createElement('input'); i.type = 'time'; i.className = 'md-t'; i.style.marginBottom = '6px'; root.querySelector('#mdTimes').appendChild(i); };
        root.querySelector('#mdDays').onclick = (e) => { const b = e.target.closest('[data-k]'); if (b) b.classList.toggle('on'); };
        const d = root.querySelector('#mdDel'); if (d) d.onclick = async () => { if (await A.ask('تحذف هالدواء؟')) { save(load().filter((x) => x.id !== m.id)); A.closeSheet(); setTimeout(sheet, 280); } };
      },
      onSave(root) {
        const val = (n) => root.querySelector('[name=' + n + ']').value.trim();
        const name = val('name'); if (!name) throw new Error('اكتب اسم الدواء');
        const ts = Array.from(new Set([...root.querySelectorAll('.md-t')].map((i) => i.value).filter(Boolean))).sort();
        if (!ts.length) throw new Error('حدد وقت واحد على الأقل');
        const days = [...root.querySelectorAll('#mdDays [data-k].on')].map((b) => Number(b.dataset.k));
        if (!days.length) throw new Error('اختر يوم واحد على الأقل');
        const st = val('stock');
        const it = Object.assign({ taken: {}, start: ymd(new Date()) }, m || {}, { id: (m && m.id) || S.uuid(), name, dose: val('dose'), times: ts, days: days.length === 7 ? [] : days,
          stock: st === '' ? '' : Math.max(0, Math.round(parseFloat(st) || 0)), per: Math.max(1, Math.round(parseFloat(val('per')) || 1)), end: val('end') });
        save(load().filter((x) => x.id !== it.id).concat(it));
        A.toast('انحفظ ✓'); setTimeout(sheet, 300);
      },
    });
  }

  // ================= التنبيهات: كل جرعة ليومين قدام، و«جدّد الوصفة» الساعة 7 المسا لما تقل =================
  function reminders(now) {
    now = now || new Date();
    const out = [];
    for (const m of load()) {
      for (let i = 0; i < 2; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
        if (!onDay(m, d)) continue;
        for (const t of m.times || []) {
          if (((m.taken || {})[ymd(d)] || []).includes(t)) continue;
          const [hh, mm] = t.split(':').map(Number), at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm);
          if (at > now) out.push({ key: 'med:' + m.id + ':' + ymd(d) + ':' + t, at, title: '💊 ' + m.name, body: m.dose || 'وقت الدواء', extra: { kind: 'meds' } });
        }
      }
      if (low(m)) {
        const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (now.getHours() >= 19 ? 1 : 0), 19, 0);
        out.push({ key: 'medlow:' + m.id + ':' + ymd(at), at, title: '💊 ' + m.name + ': باقي ' + m.stock, body: 'جدّد الوصفة قبل لا يخلص', extra: { kind: 'meds' } });
      }
    }
    return out;
  }

  const prevMid = E.todayMid;
  E.todayMid = (...a) => todayCard() + (prevMid ? prevMid(...a) : '');
  const prevAct = E.action;
  E.action = (name, el, e) => {
    if (name === 'med-take') { take(el.dataset.id, el.dataset.t); return; }
    if (name === 'meds') { sheet(); return; }
    return prevAct ? prevAct(name, el, e) : undefined;
  };
  if (E.Tools && E.Tools.GROUPS) { const g = E.Tools.GROUPS.find((x) => x[0].indexOf('الصحة') >= 0); if (g) g[1].push(['meds', 'heart', '#e11d48', 'أدويتك', sheet]); }
  if (E.View && E.View.KEEP && !E.View.KEEP.includes('meds')) { E.View.KEEP.push('meds'); E.View.apply(); }
  E.Meds = { load, sheet, form, take, reminders, todayCard, KEY };
})();
