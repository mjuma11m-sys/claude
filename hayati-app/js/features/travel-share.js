// DW-098: «شارك الرحلة مع القروب» — صورة مرتّبة (تنرسم بالجوال) أو رسالة منسّقة للواتساب، من خطة الأيام أو ملف الذكاء.
// ما فيها مبالغ ولا أرقام حجوزات ولا تاريخ الجواز: بس الوجهة والأيام والأماكن.
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { h } = A;
  const EMO = { 'نقطة الانطلاق': '📍', 'معلم مشهور': '🏛️', 'طبيعة': '🌿', 'مغامرة': '🧗', 'تسوق': '🛍️', 'مطعم': '🍽️', 'ثقافة': '🎭', 'زيارة دينية': '🕌' };
  const dstr = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const pretty = (s) => { const d = new Date(s + 'T00:00:00'); return d.getDate() + ' ' + A.MONTHS[d.getMonth()]; };

  // الأيام: [{label, items:[{time, title, emo}]}] من خطة الأيام، وإلا من ملف الذكاء
  function daysOf(t) {
    const ag = (t.agenda || []).slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    if (ag.length) {
      const by = new Map();
      ag.forEach((x) => { if (!by.has(x.date)) by.set(x.date, []); by.get(x.date).push({ time: x.time, title: x.title, emo: '📌' }); });
      const go = t.go ? new Date(t.go + 'T00:00:00') : null;
      return [...by.entries()].map(([d, items]) => ({ label: (go ? 'اليوم ' + (A.daysBetween(go, new Date(d + 'T00:00:00')) + 1) + ' · ' : '') + pretty(d), items }));
    }
    const p = t.aiPlan;
    if (!p) return [];
    const go = t.go ? new Date(t.go + 'T00:00:00') : null;
    return p.days.map((d, i) => ({ label: 'اليوم ' + (i + 1) + (go ? ' · ' + pretty(dstr(new Date(go.getFullYear(), go.getMonth(), go.getDate() + i))) : '') + ' · ' + d.title,
      items: d.places.map((x) => ({ time: x.time, title: x.name, emo: EMO[x.tag] || '📌' })) }));
  }
  const has = (t) => daysOf(t).length > 0;

  function text(t) {
    const days = daysOf(t), name = (t.aiPlan && t.aiPlan.city) || t.name;
    const L = ['✈️ *رحلة ' + name + '*'];
    if (t.go) L.push('🗓️ ' + pretty(t.go) + (t.back ? ' ← ' + pretty(t.back) : ''));
    L.push('');
    days.forEach((d) => { L.push('*' + d.label + '*'); d.items.forEach((x) => L.push(x.emo + ' ' + (x.time ? x.time + ' · ' : '') + x.title)); L.push(''); });
    L.push('_مخطّطة بتطبيق «حياتي» 🤍_');
    return L.join('\n');
  }

  async function draw(t) {
    const days = daysOf(t).slice(0, 7), name = (t.aiPlan && t.aiPlan.city) || t.name;
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) { /* تجاهل */ }
    const font = getComputedStyle(document.body).fontFamily || 'sans-serif';
    const W = 1080, rows = days.reduce((n, d) => n + 1 + Math.min(4, d.items.length), 0);
    const H = Math.min(2400, Math.max(1350, 420 + rows * 74 + days.length * 30 + 160));
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'); x.direction = 'rtl';
    const F = (w, px) => w + ' ' + px + 'px ' + font;
    const txt = (s, X, Y, f, col, al, max) => { x.font = f; x.fillStyle = col; x.textAlign = al || 'right'; x.fillText(s, X, Y, max || W - 160); };
    const g = x.createLinearGradient(0, 0, W * 0.3, H); g.addColorStop(0, '#0A1A1E'); g.addColorStop(0.5, '#0E3B43'); g.addColorStop(1, '#13636B');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(255,107,74,.16)'; x.beginPath(); x.arc(70, 120, 260, 0, Math.PI * 2); x.fill();
    txt('✈️ رحلة ' + name, W - 80, 170, F('800', 76), '#fff');
    if (t.go) txt('🗓️ ' + pretty(t.go) + (t.back ? '  ←  ' + pretty(t.back) : ''), W - 80, 245, F('500', 38), 'rgba(232,220,196,.9)');
    let y = 340;
    for (const d of days) {
      x.fillStyle = '#FF6B4A'; x.beginPath(); x.arc(W - 96, y - 14, 14, 0, Math.PI * 2); x.fill();
      txt(d.label, W - 130, y, F('700', 40), '#fff', 'right', W - 220);
      y += 64;
      for (const it of d.items.slice(0, 4)) {
        x.fillStyle = 'rgba(255,255,255,.08)';
        if (x.roundRect) { x.beginPath(); x.roundRect(80, y - 46, W - 160, 62, 18); x.fill(); } else x.fillRect(80, y - 46, W - 160, 62);
        txt(it.emo + '  ' + it.title, W - 110, y - 4, F('500', 34), '#fff', 'right', W - 420);
        if (it.time) txt(it.time, 110, y - 4, F('700', 32), 'rgba(232,220,196,.85)', 'left');
        y += 74;
      }
      if (d.items.length > 4) { txt('+' + (d.items.length - 4), W - 110, y - 16, F('500', 28), 'rgba(232,220,196,.7)'); y += 30; }
      y += 30;
      if (y > H - 200) break;
    }
    txt('مخطّطة بتطبيق «حياتي» 🤍', W / 2, H - 90, F('700', 34), '#FF6B4A', 'center');
    return c;
  }

  function sheet(t) {
    let canvas = null;
    A.openSheet({
      title: '📤 شارك الرحلة مع القروب',
      saveLabel: window.HayatiNative ? 'شارك الصورة' : 'احفظ الصورة',
      body: '<div style="border-radius:16px;overflow:hidden;background:#0E3B43"><img id="tsImg" alt="" style="width:100%;display:block"></div>' +
        '<button type="button" class="btn block" id="tsText" style="margin-top:10px">💬 أرسلها رسالة مرتّبة</button>' +
        '<p class="small muted" style="margin:10px 4px 0">فيها الوجهة والأيام والأماكن بس، بدون مبالغ ولا أرقام حجوزات.</p>',
      async mount(root) {
        canvas = await draw(t);
        const im = root.querySelector('#tsImg'); if (im) im.src = canvas.toDataURL('image/png');
        root.querySelector('#tsText').onclick = () => {
          const s = text(t), N = window.HayatiNative;
          if (N && N.shareText) N.shareText(s);
          else if (navigator.share) navigator.share({ text: s }).catch(() => {});
          else { try { navigator.clipboard.writeText(s); A.toast('انتسخت ✓ الصقها بالقروب'); } catch (e) { /* تجاهل */ } }
        };
      },
      async onSave() {
        if (!canvas) return false;
        const b64 = canvas.toDataURL('image/png').split(',')[1], N = window.HayatiNative, file = 'hayati-trip.png';
        if (N && N.saveImage) return N.saveImage(file, b64);
        const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = file; document.body.appendChild(a); a.click(); a.remove();
        A.toast('انحفظت الصورة ✓'); return true;
      },
    });
  }

  E.TravelShare = { has, text, draw, sheet, daysOf };
})();
