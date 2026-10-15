// «القبلة» (DW-023): بوصلة تحدد اتجاه الكعبة من موقعك.
// الاتجاه يتحسب بالجهاز (great-circle bearing). الموقع: المنامة افتراضياً، أو «استخدم موقعي» مرة وحدة
// وما ينحفظ ولا يطلع من الجوال. البوصلة من حساس الجوال (deviceorientation)، وإذا ما فيه حساس نعرض الزاوية من الشمال.
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { I, tint } = A;
  const wrap = (name, fn) => { const prev = E[name]; E[name] = (...a) => fn(prev ? prev : () => '', ...a); };

  const KAABA = { lat: 21.422487, lng: 39.826206 };
  const MANAMA = { lat: 26.2235, lng: 50.5876, name: 'المنامة' };
  const ALIGN = 5;   // ± درجات تعتبر «على القبلة»
  const rad = (d) => d * Math.PI / 180, deg = (r) => r * 180 / Math.PI;
  const norm = (a) => ((a % 360) + 360) % 360;

  function bearing(from) {
    const f1 = rad(from.lat), f2 = rad(KAABA.lat), dl = rad(KAABA.lng - from.lng);
    return norm(deg(Math.atan2(Math.sin(dl) * Math.cos(f2), Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl))));
  }
  function distanceKm(from) {
    const f1 = rad(from.lat), f2 = rad(KAABA.lat), df = f2 - f1, dl = rad(KAABA.lng - from.lng);
    const a = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  // الفرق من اتجاه الجوال للقبلة: موجب = لف يمين (مع عقارب الساعة)
  const turn = (target, heading) => ((target - heading + 540) % 360) - 180;
  function guide(diff) {
    const d = Math.round(Math.abs(diff));
    if (d <= ALIGN) return { ok: true, text: '✓ أنت على القبلة' };
    return { ok: false, text: (diff > 0 ? 'لفّ يمين ' : 'لفّ يسار ') + d + '°' };
  }
  const SIDES = ['الشمال', 'الشمال الشرقي', 'الشرق', 'الجنوب الشرقي', 'الجنوب', 'الجنوب الغربي', 'الغرب', 'الشمال الغربي'];
  const side = (b) => SIDES[Math.round(norm(b) / 45) % 8];

  // ================= الواجهة =================
  function dial() {
    const ticks = Array.from({ length: 72 }, (_, i) => {
      const a = i * 5, long = a % 30 === 0;
      return '<line x1="100" y1="' + (long ? 10 : 14) + '" x2="100" y2="20" stroke="currentColor" stroke-opacity="' + (long ? '.55' : '.22') + '" stroke-width="' + (long ? 2 : 1) + '" transform="rotate(' + a + ' 100 100)"/>';
    }).join('');
    const letter = (t, a, c) => '<text x="100" y="38" text-anchor="middle" font-size="11" font-weight="700" fill="' + (c || 'currentColor') + '" transform="rotate(' + a + ' 100 100)">' + t + '</text>';
    return '<svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true" style="overflow:visible">' +
      '<circle cx="100" cy="100" r="94" fill="var(--surface)" stroke="var(--border)" stroke-width="2"/>' + ticks +
      letter('شمال', 0, 'var(--expense)') + letter('شرق', 90) + letter('جنوب', 180) + letter('غرب', 270) +
      '<g id="qKaaba"><line x1="100" y1="100" x2="100" y2="30" stroke="var(--brand)" stroke-width="3" stroke-linecap="round"/><text x="100" y="24" text-anchor="middle" font-size="20">🕋</text></g>' +
      '</svg>';
  }

  function sheet() {
    let loc = MANAMA, heading = null, gotSensor = false, wasOk = false, smooth = null;
    const body =
      '<div style="position:relative;width:min(78vw,300px);aspect-ratio:1;margin:8px auto 4px;color:var(--text)">' +
        '<div id="qDial" style="position:absolute;inset:0;transition:transform .12s linear">' + dial() + '</div>' +
        // سهم ثابت = أعلى الجوال
        '<svg viewBox="0 0 200 200" style="position:absolute;inset:0;pointer-events:none" aria-hidden="true"><path d="M100 6 L92 22 L108 22 Z" fill="var(--text)"/><circle cx="100" cy="100" r="5" fill="var(--text)"/></svg>' +
      '</div>' +
      '<div id="qGuide" role="status" aria-live="polite" style="text-align:center;font-size:22px;font-weight:700;margin:6px 0 2px;min-height:30px"></div>' +
      '<p id="qInfo" class="small muted num" style="text-align:center;margin:0 0 12px;white-space:pre-line"></p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<button type="button" class="btn ghost" id="qLoc" style="flex:1">📍 استخدم موقعي</button>' +
        (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function' ? '<button type="button" class="btn primary" id="qPerm" style="flex:1">🧭 شغّل البوصلة</button>' : '') +
      '</div>' +
      '<p class="small muted" style="margin:12px 4px 0">خلّ الجوال مسطّح وأعلاه قدامك. الاتجاه <b>تقدير</b>: البوصلة تتأثر بالحديد والمغناطيس والسماعات، بعّد الجوال عنها، ولو الرقم يتذبذب حرّك الجوال بشكل 8. موقعك ما ينحفظ ولا يطلع من جوالك.</p>';

    A.openSheet({
      title: '🧭 القبلة',
      cancelLabel: 'تم',
      body,
      mount(root) {
        const dialEl = root.querySelector('#qDial'), kaaba = root.querySelector('#qKaaba');
        const guideEl = root.querySelector('#qGuide'), info = root.querySelector('#qInfo');
        const draw = () => {
          const b = bearing(loc);
          kaaba.setAttribute('transform', 'rotate(' + b.toFixed(1) + ' 100 100)');
          dialEl.style.transform = 'rotate(' + (-(heading || 0)).toFixed(1) + 'deg)';
          info.textContent = 'القبلة ' + Math.round(b) + '° من الشمال (' + side(b) + ') · ' + loc.name + '\nمكة تبعد تقريباً ' + Math.round(distanceKm(loc) / 10) * 10 + ' كم';
          if (heading == null) { guideEl.textContent = gotSensor ? '' : 'وجّه السهم 🕋 للقبلة'; guideEl.style.color = ''; return; }
          const g = guide(turn(b, heading));
          guideEl.textContent = g.text; guideEl.style.color = g.ok ? 'var(--income, #16a34a)' : '';
          if (g.ok && !wasOk && navigator.vibrate) navigator.vibrate(40);
          wasOk = g.ok;
        };
        const onOrient = (e) => {
          if (!document.body.contains(guideEl)) { window.removeEventListener(evt, onOrient); return; }   // الورقة تبدّلت
          let hd = null;
          if (typeof e.webkitCompassHeading === 'number' && !isNaN(e.webkitCompassHeading)) hd = e.webkitCompassHeading;   // iOS
          else if (e.absolute && typeof e.alpha === 'number') hd = 360 - e.alpha;                                           // Android
          if (hd == null) return;
          hd = norm(hd + ((screen.orientation && screen.orientation.angle) || 0));
          // تنعيم دائري عشان الرقم ما يرجف
          smooth = smooth == null ? hd : norm(smooth + turn(hd, smooth) * 0.25);
          gotSensor = true; heading = smooth; draw();
        };
        const evt = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
        const listen = () => window.addEventListener(evt, onOrient);
        if (!root.querySelector('#qPerm')) listen();
        const perm = root.querySelector('#qPerm');
        if (perm) perm.onclick = async () => {
          try { const r = await DeviceOrientationEvent.requestPermission(); if (r === 'granted') { listen(); perm.remove(); } else A.toast('ما فيه إذن للبوصلة'); }
          catch (e) { A.toast('البوصلة ما تشتغل هني'); }
        };
        setTimeout(() => { if (!gotSensor && document.body.contains(guideEl)) { guideEl.textContent = 'ما لقينا بوصلة بالجهاز'; info.textContent += ' · وجّه أعلى الجوال للشمال، والقبلة على 🕋'; } }, 2500);
        root.querySelector('#qLoc').onclick = () => {
          if (!navigator.geolocation) { A.toast('الموقع ما يشتغل على هالجهاز'); return; }
          const btn = root.querySelector('#qLoc'); btn.disabled = true; btn.textContent = 'لحظة…';
          navigator.geolocation.getCurrentPosition((p) => {
            loc = { lat: p.coords.latitude, lng: p.coords.longitude, name: 'موقعك' };
            btn.textContent = '📍 موقعك'; draw();
          }, () => { btn.disabled = false; btn.textContent = '📍 استخدم موقعي'; A.toast('ما قدرنا ناخذ موقعك · مستخدمين المنامة'); },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
        };
        document.getElementById('sheet').addEventListener('close', () => window.removeEventListener(evt, onOrient), { once: true });
        draw();
      },
    });
  }

  // ================= الربط =================
  wrap('action', (prev, name, el, e) => (name === 'qibla' ? sheet() : prev(name, el, e)));
  E.Qibla = { bearing, distanceKm, turn, guide, side, sheet, KAABA, MANAMA };
})();
