// DW-095 (0.29): السفر أكثر — الوجهة (الوقت هناك، أوقات الصلاة والقبلة، الجو، الفيش)، الجواز والحجوزات،
// خطة الأيام بتذكير، وأغراض مقترحة حسب الجو والمدة. كله يشتغل بدون نت؛ الجو «متوسط تقريبي» مو توقعات.
(function () {
  'use strict';

  const A = window.App, E = window.Extras;
  if (!A || !E) return;
  const { S, h } = A;

  // [المفتاح، الاسم، خط العرض، خط الطول، المنطقة الزمنية، العملة، أنواع الفيش، متوسط العظمى لكل شهر °م، أشهر المطر (1–12)]
  const CITIES = [
    ['istanbul', 'إسطنبول', 41.01, 28.98, 'Europe/Istanbul', 'TRY', 'CF', [9, 10, 12, 17, 21, 26, 28, 29, 25, 20, 15, 11], [11, 12, 1, 2]],
    ['trabzon', 'طرابزون', 41.0, 39.72, 'Europe/Istanbul', 'TRY', 'CF', [11, 11, 13, 16, 20, 24, 27, 27, 24, 20, 16, 13], [9, 10, 11, 12, 1]],
    ['london', 'لندن', 51.51, -0.13, 'Europe/London', 'GBP', 'G', [8, 9, 12, 15, 18, 21, 24, 23, 20, 16, 11, 9], [10, 11, 12, 1]],
    ['paris', 'باريس', 48.86, 2.35, 'Europe/Paris', 'EUR', 'E', [7, 8, 12, 16, 20, 23, 25, 25, 21, 16, 11, 8], [11, 12, 1]],
    ['geneva', 'جنيف', 46.2, 6.15, 'Europe/Zurich', '', 'J', [5, 6, 11, 15, 19, 23, 26, 25, 21, 15, 9, 6], [11, 12]],
    ['vienna', 'فيينا', 48.21, 16.37, 'Europe/Vienna', 'EUR', 'CF', [3, 5, 10, 16, 21, 24, 26, 26, 21, 15, 8, 4], [6, 7]],
    ['munich', 'ميونخ', 48.14, 11.58, 'Europe/Berlin', 'EUR', 'CF', [3, 5, 10, 15, 19, 22, 24, 24, 20, 14, 8, 4], [6, 7, 8]],
    ['milan', 'ميلان', 45.46, 9.19, 'Europe/Rome', 'EUR', 'CFL', [7, 9, 14, 18, 22, 27, 29, 29, 24, 18, 12, 8], [10, 11]],
    ['sarajevo', 'سراييفو', 43.86, 18.41, 'Europe/Sarajevo', '', 'CF', [4, 6, 11, 16, 21, 25, 28, 28, 23, 17, 10, 5], [11, 12]],
    ['baku', 'باكو', 40.41, 49.87, 'Asia/Baku', 'AZN', 'CF', [7, 7, 10, 16, 22, 27, 31, 30, 25, 19, 13, 9], [11, 12]],
    ['tbilisi', 'تبليسي', 41.72, 44.79, 'Asia/Tbilisi', 'GEL', 'CF', [6, 8, 13, 19, 24, 28, 31, 31, 26, 20, 13, 8], [5, 6]],
    ['cairo', 'القاهرة', 30.04, 31.24, 'Africa/Cairo', 'EGP', 'CF', [19, 21, 24, 28, 32, 34, 35, 35, 33, 30, 25, 21], []],
    ['amman', 'عمّان', 31.95, 35.93, 'Asia/Amman', 'JOD', 'CDFGJ', [13, 14, 18, 23, 28, 31, 32, 33, 31, 27, 20, 15], [12, 1, 2]],
    ['beirut', 'بيروت', 33.89, 35.5, 'Asia/Beirut', '', 'CDG', [17, 18, 20, 23, 26, 28, 31, 31, 30, 27, 23, 19], [12, 1, 2]],
    ['makkah', 'مكة', 21.42, 39.83, 'Asia/Riyadh', 'SAR', 'G', [31, 32, 35, 38, 42, 44, 43, 43, 42, 39, 35, 32], []],
    ['madinah', 'المدينة', 24.47, 39.61, 'Asia/Riyadh', 'SAR', 'G', [24, 27, 31, 35, 40, 43, 43, 43, 42, 37, 31, 26], []],
    ['riyadh', 'الرياض', 24.71, 46.68, 'Asia/Riyadh', 'SAR', 'G', [20, 23, 28, 33, 40, 43, 44, 44, 41, 35, 28, 22], []],
    ['jeddah', 'جدة', 21.49, 39.19, 'Asia/Riyadh', 'SAR', 'G', [29, 29, 31, 33, 35, 36, 38, 37, 36, 35, 33, 31], []],
    ['dubai', 'دبي', 25.2, 55.27, 'Asia/Dubai', 'AED', 'G', [24, 25, 28, 33, 38, 40, 41, 41, 39, 35, 30, 26], []],
    ['doha', 'الدوحة', 25.29, 51.53, 'Asia/Qatar', 'QAR', 'G', [22, 23, 27, 32, 38, 41, 42, 41, 39, 35, 29, 24], []],
    ['kuwait', 'الكويت', 29.38, 47.99, 'Asia/Kuwait', 'KWD', 'G', [19, 22, 27, 33, 40, 45, 46, 46, 43, 37, 28, 21], []],
    ['muscat', 'مسقط', 23.59, 58.41, 'Asia/Muscat', 'OMR', 'G', [25, 26, 29, 34, 39, 40, 38, 36, 36, 35, 30, 27], []],
    ['salalah', 'صلالة', 17.02, 54.09, 'Asia/Muscat', 'OMR', 'G', [28, 29, 30, 32, 33, 32, 29, 28, 29, 31, 31, 29], [7, 8]],
    ['karbala', 'كربلاء', 32.62, 44.02, 'Asia/Baghdad', '', 'CDG', [16, 19, 24, 30, 37, 43, 45, 45, 41, 34, 24, 18], [12, 1]],
    ['najaf', 'النجف', 32.0, 44.33, 'Asia/Baghdad', '', 'CDG', [17, 20, 25, 31, 38, 43, 45, 45, 41, 35, 25, 19], [12, 1]],
    ['mashhad', 'مشهد', 36.3, 59.6, 'Asia/Tehran', '', 'CF', [7, 9, 15, 21, 27, 32, 34, 33, 29, 22, 15, 9], [2, 3, 4]],
    ['kualalumpur', 'كوالالمبور', 3.14, 101.69, 'Asia/Kuala_Lumpur', 'MYR', 'G', [32, 33, 33, 33, 33, 33, 32, 32, 32, 32, 32, 32], [3, 4, 10, 11, 12]],
    ['bangkok', 'بانكوك', 13.76, 100.5, 'Asia/Bangkok', 'THB', 'ABC', [32, 33, 34, 35, 34, 33, 33, 32, 32, 32, 32, 31], [5, 6, 7, 8, 9, 10]],
    ['phuket', 'بوكيت', 7.88, 98.39, 'Asia/Bangkok', 'THB', 'ABC', [32, 33, 33, 33, 31, 31, 31, 31, 30, 30, 31, 31], [5, 6, 7, 8, 9, 10]],
    ['bali', 'بالي', -8.65, 115.22, 'Asia/Makassar', '', 'CF', [30, 30, 31, 31, 31, 30, 29, 30, 30, 31, 31, 30], [12, 1, 2, 3]],
    ['maldives', 'المالديف', 4.18, 73.51, 'Indian/Maldives', '', 'DG', [30, 31, 31, 32, 31, 31, 30, 30, 30, 30, 30, 30], [5, 6, 7, 8, 9, 10, 11]],
    ['mumbai', 'مومباي', 19.08, 72.88, 'Asia/Kolkata', 'INR', 'CDM', [31, 32, 33, 33, 34, 32, 30, 30, 31, 33, 33, 32], [6, 7, 8, 9]],
  ].map(([key, name, lat, lng, tz, cur, plugs, highs, rain]) => ({ key, name, lat, lng, tz, cur, plugs, highs, rain }));
  const cityOf = (t) => (t && t.city ? CITIES.find((c) => c.key === t.city) || null : null);
  const KAABA = { lat: 21.422487, lng: 39.826206 };
  const rad = (d) => (d * Math.PI) / 180, deg = (r) => (r * 180) / Math.PI;
  function qibla(c) {
    const f1 = rad(c.lat), f2 = rad(KAABA.lat), dl = rad(KAABA.lng - c.lng);
    return Math.round((deg(Math.atan2(Math.sin(dl), Math.cos(f1) * Math.tan(f2) - Math.sin(f1) * Math.cos(dl))) + 360) % 360);
  }
  // فرق الساعة عن غرينتش لمنطقة زمنية بتاريخ معيّن (يحسب التوقيت الصيفي)
  function tzOffset(tz, date) {
    try {
      const d = date || new Date();
      const p = (zone) => { const o = {}; new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(d).forEach((x) => { o[x.type] = Number(x.value); }); return Date.UTC(o.year, o.month - 1, o.day, o.hour, o.minute); };
      return Math.round(((p(tz) - p('UTC')) / 3600e3) * 4) / 4;
    } catch (e) { return null; }
  }
  const hm = (m) => { m = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  function localNow(c, now) {
    const off = tzOffset(c.tz, now); if (off == null) return null;
    const d = now || new Date();
    return { time: hm(d.getUTCHours() * 60 + d.getUTCMinutes() + off * 60), diff: off - 3 };
  }
  const diffText = (x) => {
    if (x === 0) return '<span>نفس وقت البحرين</span>';
    const n = Math.abs(x);
    return '<span>' + (x > 0 ? 'متقدمين على البحرين' : 'متأخرين عن البحرين') + '</span> <bdi class="num">' + n + '</bdi> <span>' + (n === 1 ? 'ساعة' : 'ساعات') + '</span>';
  };
  function prayersThere(c, date) {
    if (!E.prayerTimes) return null;
    const d = date || new Date(), off = tzOffset(c.tz, d);
    if (off == null) return null;
    const m = (A.st.settings && A.st.settings.prayer_method) || 'jafari';
    const t = E.prayerTimes(d, m, { lat: c.lat, lng: c.lng, tz: off });
    const names = m === 'jafari' ? [['fajr', 'الفجر'], ['dhuhr', 'الظهرين'], ['maghrib', 'العشاءين']] : [['fajr', 'الفجر'], ['dhuhr', 'الظهر'], ['asr', 'العصر'], ['maghrib', 'المغرب'], ['isha', 'العشاء']];
    return names.map(([k, n]) => [n, hm(t[k])]);
  }
  // الجو بشهر السفر (متوسط تقريبي)
  function weatherOf(c, go) {
    const m = (go ? new Date(go + 'T00:00:00') : new Date()).getMonth();
    const hi = c.highs[m], rain = c.rain.includes(m + 1);
    const kind = hi <= 12 ? 'cold' : hi <= 22 ? 'cool' : hi >= 32 ? 'hot' : 'mild';
    const label = { cold: 'بارد 🥶', cool: 'منعش 🧥', mild: 'معتدل 🌤️', hot: 'حار ☀️' }[kind];
    return { hi, rain, kind, label };
  }
  const needsAdapter = (c) => !c.plugs.includes('G');
  // أغراض مقترحة حسب الجو والفيش والمدة (ما تتكرر لو موجودة)
  function suggest(t) {
    const c = cityOf(t); if (!c) return [];
    const w = weatherOf(c, t.go), out = [];
    if (w.kind === 'cold') out.push(['ملابس', 'جاكيت ثقيل'], ['ملابس', 'قفازات وشال وطاقية'], ['ملابس', 'ملابس حرارية (ثيرمال)'], ['صحة', 'مرطب للشفايف والجلد']);
    if (w.kind === 'cool') out.push(['ملابس', 'جاكيت خفيف أو هودي'], ['ملابس', 'ملابس طبقات']);
    if (w.kind === 'mild') out.push(['ملابس', 'جاكيت خفيف لليل']);
    if (w.kind === 'hot') out.push(['ملابس', 'قبعة ونظارة شمس'], ['صحة', 'واقي شمس'], ['أغراض', 'قارورة ماي']);
    if (w.rain) out.push(['أغراض', 'مظلة أو جاكيت مطر'], ['ملابس', 'حذاء ما يدخله الماي']);
    if (needsAdapter(c)) out.push(['إلكترونيات', 'محوّل كهرباء نوع ' + c.plugs.split('').join('/')]);
    const n = t.go && t.back ? Math.max(0, A.daysBetween(new Date(t.go + 'T00:00:00'), new Date(t.back + 'T00:00:00'))) : 0;
    if (n >= 7) out.push(['أغراض', 'كيس للملابس المستعملة']);
    const have = new Set(t.check.map((x) => x.t));
    return out.filter(([, x]) => !have.has(x)).map(([g, x]) => ({ g, t: x, on: false }));
  }

  // ---------- توقعات حقيقية (Apple WeatherKit) لما تكون الرحلة خلال 10 أيام ----------
  const WX = { Clear: '☀️ صحو', MostlyClear: '🌤️ صحو غالباً', PartlyCloudy: '⛅ غيوم جزئية', MostlyCloudy: '🌥️ غائم غالباً', Cloudy: '☁️ غائم', Rain: '🌧️ مطر', Drizzle: '🌦️ رذاذ', HeavyRain: '🌧️ مطر غزير', Showers: '🌦️ زخات', Snow: '❄️ ثلج', Flurries: '🌨️ ثلج خفيف', HeavySnow: '❄️ ثلج كثيف', Thunderstorms: '⛈️ رعد', Windy: '💨 رياح', Foggy: '🌫️ ضباب', Haze: '🌫️ غبار', Dust: '🌪️ غبار', Hot: '🔥 حار', Frigid: '🥶 برد قارس' };
  function wxWanted(t) {
    if (!cityOf(t) || !t.go || !(S.status && S.status.signedIn && S.invokeFn)) return false;
    const now = new Date(), go = new Date(t.go + 'T00:00:00'), back = new Date((t.back || t.go) + 'T23:59:59');
    return back >= now && (go - now) / 864e5 <= 10;
  }
  async function wxFill(root, t) {
    const el = root.querySelector('#tpWxD'); if (!el) return;
    const c = cityOf(t), k = 'hayati-wx:' + c.key + ':' + new Date().toISOString().slice(0, 13);
    let r = null;
    try { r = JSON.parse(sessionStorage.getItem(k) || 'null'); } catch (e) { r = null; }
    if (!r) { try { r = await S.invokeFn('weather', { lat: c.lat, lng: c.lng, tz: c.tz }); sessionStorage.setItem(k, JSON.stringify(r)); } catch (e) { r = null; } }
    if (!r || r.unavailable || !Array.isArray(r.days) || !r.days.length) { const row = root.querySelector('#tpWx'); if (row) row.remove(); return; }
    const from = t.go, to = t.back || t.go;
    const days = r.days.filter((d) => d.date >= from && d.date <= to);
    const list = (days.length ? days : r.days.slice(0, 5));
    el.innerHTML = list.map((d) => '<div style="display:flex;justify-content:space-between;gap:8px"><bdi>' + h(new Date(d.date + 'T00:00:00').getDate() + ' ' + A.MONTHS[new Date(d.date + 'T00:00:00').getMonth()]) + '</bdi><span>' + h(WX[d.code] || '🌡️') + '</span><bdi class="num">' + d.max + '° / ' + d.min + '°' + (d.rain >= 30 ? ' · ☔ ' + d.rain + '%' : '') + '</bdi></div>').join('') +
      '<a href="' + h(r.attribution) + '" target="_blank" rel="noopener" class="small muted" style="display:inline-block;margin-top:6px">Apple Weather</a>';
  }

  // ---------- الجواز ----------
  // ينصح بصلاحية 6 أشهر بعد الرجعة (كثير من الدول تطلبها)
  function passportCheck(t) {
    const exp = t.docs && t.docs.passport;
    if (!exp) return null;
    const ref = new Date((t.back || t.go || new Date().toISOString().slice(0, 10)) + 'T00:00:00');
    const need = new Date(ref.getFullYear(), ref.getMonth() + 6, ref.getDate());
    const e = new Date(exp + 'T00:00:00');
    if (e < ref) return { level: 'bad', text: 'جوازك ينتهي قبل الرجعة! جدّده قبل السفر' };
    if (e < need) return { level: 'warn', text: 'جوازك ينتهي خلال أقل من 6 أشهر بعد الرجعة. دول كثيرة ترفض الدخول، شيّك شروط البلد أو جدّده' };
    return { level: 'ok', text: 'صلاحية الجواز تكفي ✓' };
  }
  const BOOK = { flight: ['✈️', 'طيران'], hotel: ['🏨', 'سكن'], car: ['🚗', 'سيارة'], other: ['🎫', 'حجز'] };

  // ---------- خطة الأيام ----------
  const dates = (t) => {
    if (!t.go) return [];
    const out = [], a = new Date(t.go + 'T00:00:00'), b = new Date((t.back || t.go) + 'T00:00:00');
    for (let d = new Date(a); d <= b && out.length < 60; d.setDate(d.getDate() + 1)) out.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
    return out;
  };
  const EN = () => !!(window.HayatiLang && HayatiLang.lang === 'en');
  const dayLabel = (s, i) => { const d = new Date(s + 'T00:00:00'); return EN() ? 'Day ' + (i + 1) + ' · ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'يوم ' + (i + 1) + ' · ' + d.getDate() + ' ' + A.MONTHS[d.getMonth()]; };
  const dayHtml = (s, i) => '<span>يوم الرحلة</span> <bdi class="num">' + (i + 1) + '</bdi> · <bdi>' + new Date(s + 'T00:00:00').getDate() + '</bdi> <span>' + A.MONTHS[new Date(s + 'T00:00:00').getMonth()] + '</span>';

  function section(t) {
    const c = cityOf(t);
    let out = '<button type="button" class="btn primary block" id="tpAI" style="margin:14px 0 4px">✨ خطط رحلتي بالذكاء</button>' +
      (t.aiPlan ? '<button type="button" class="btn ghost block" id="tpAIOpen" style="margin:6px 0 0">📒 ملف رحلتك</button>' : '') +
      (E.TravelShare && E.TravelShare.has(t) ? '<button type="button" class="btn ghost block" id="tpShare" style="margin:6px 0 0">📤 شارك الرحلة مع القروب</button>' : '') +
      A.secHead('📍 الوجهة', '') + '<div class="card"><div class="field" style="margin:0"><label for="tpCity">المدينة</label><select id="tpCity" style="width:100%"><option value="">غيرها / ما حددت</option>' +
      CITIES.map((x) => '<option value="' + x.key + '"' + (c && c.key === x.key ? ' selected' : '') + '>' + x.name + '</option>').join('') + '</select></div>';
    if (c) {
      const now = localNow(c), w = weatherOf(c, t.go), pr = prayersThere(c, t.go ? new Date(t.go + 'T12:00:00') : new Date());
      out += '<ul class="list" style="margin-top:8px">' +
        (now ? '<li class="row" style="cursor:default"><div class="ico">🕐</div><div class="main"><div class="title"><span>الوقت هناك الحين</span> <bdi class="num">' + now.time + '</bdi></div><div class="sub">' + diffText(now.diff) + '</div></div></li>' : '') +
        (wxWanted(t) ? '<li class="row" id="tpWx" style="cursor:default"><div class="ico">🌦️</div><div class="main"><div class="title"><span>توقعات الطقس</span></div><div class="sub" id="tpWxD">…</div></div></li>' : '') +
        '<li class="row" style="cursor:default"><div class="ico">🌡️</div><div class="main"><div class="title"><span>' + w.label + '</span> <bdi class="num">' + w.hi + '°</bdi></div><div class="sub"><span>متوسط العظمى بشهر السفر (تقريبي)</span>' + (w.rain ? ' · <span>موسم أمطار ☔</span>' : '') + '</div></div></li>' +
        '<li class="row" style="cursor:default"><div class="ico">🔌</div><div class="main"><div class="title"><span>' + (needsAdapter(c) ? 'تحتاج محوّل كهرباء' : 'نفس فيش البحرين، ما تحتاج محوّل') + '</span></div><div class="sub"><bdi>' + c.plugs.split('').join(' / ') + '</bdi></div></div></li>' +
        '<li class="row" style="cursor:default"><div class="ico">🕋</div><div class="main"><div class="title"><span>اتجاه القبلة هناك</span> <bdi class="num">' + qibla(c) + '°</bdi></div><div class="sub">من الشمال مع عقارب الساعة</div></div></li>' +
        (pr ? '<li class="row" style="cursor:default"><div class="ico">🕌</div><div class="main"><div class="title"><span>أوقات الصلاة هناك</span></div><div class="sub">' + pr.map(([n, v]) => '<span>' + n + '</span> <bdi class="num">' + v + '</bdi>').join(' · ') + '</div></div></li>' : '') +
        '</ul>';
    }
    out += '</div>';

    // الجواز والحجوزات
    const pc = passportCheck(t), books = (t.docs && t.docs.books) || [];
    out += A.secHead('🛂 الجواز والحجوزات', '') + '<div class="card"><div class="field" style="margin:0"><label for="tpPass">انتهاء الجواز</label><input type="date" id="tpPass" value="' + h((t.docs && t.docs.passport) || '') + '" style="width:100%;box-sizing:border-box"></div>' +
      (pc ? '<p class="small" style="margin:8px 4px 0;color:' + (pc.level === 'ok' ? 'var(--income)' : 'var(--expense)') + '">' + (pc.level === 'ok' ? '' : '⚠️ ') + pc.text + '</p>' : '<p class="small muted" style="margin:8px 4px 0">نحفظ تاريخ الانتهاء بس، مو رقم الجواز.</p>') +
      (books.length ? '<ul class="list" style="margin-top:10px">' + books.map((b, i) => '<li class="row" style="cursor:default"><div class="ico">' + (BOOK[b.type] || BOOK.other)[0] + '</div><div class="main"><div class="title"><span class="t" data-noi18n>' + h(b.title) + '</span></div><div class="sub">' + (b.ref ? '<bdi dir="ltr" data-noi18n>' + h(b.ref) + '</bdi>' : '') + (b.at ? (b.ref ? ' · ' : '') + '<bdi class="num">' + human(b.at) + '</bdi>' : '') + '</div></div><button type="button" class="icon-x" data-bk="' + i + '" aria-label="احذف">✕</button></li>').join('') + '</ul>' : '') +
      '<button type="button" class="btn ghost block" id="tpBook" style="margin-top:10px">＋ أضف حجز (طيران، فندق…)</button></div>';

    // خطة الأيام
    const ds = dates(t), ag = (t.agenda || []).slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const empty = ds.filter((d) => !ag.some((x) => x.date === d)).length;
    out += A.secHead('🗓️ خطة الأيام', ds.length ? '<span class="count">' + (ds.length - empty) + '/' + ds.length + '</span>' : '') + (ds.length ? ds.map((d, i) => {
      const items = ag.filter((x) => x.date === d);
      if (!items.length) return '';
      return '<div class="group-title">' + dayHtml(d, i) + '</div>' + (items.length ? '<div class="card flush"><ul class="list">' + items.map((x) => '<li class="row" style="cursor:default"><div class="ico num" style="font-size:12px">' + h(x.time || '—') + '</div><div class="main"><div class="title"><span class="t" data-noi18n>' + h(x.title) + '</span></div>' + (x.place ? '<div class="sub" data-noi18n>' + h(x.place) + '</div>' : '') + '</div>' + (x.map ? '<button type="button" class="icon-x" data-tpmap="' + h(x.map) + '" aria-label="الخريطة">📍</button>' : '') + '<button type="button" class="icon-x" data-ag="' + h(x.id) + '" aria-label="احذف">✕</button></li>').join('') + '</ul></div>' : '');
    }).join('') + (empty === ds.length ? '<div class="card"><p class="small muted" style="margin:0">رتّب رحلتك يوم بيوم: الأماكن والأوقات، وننبهك قبل كل شي.</p></div>' : '') + '<button type="button" class="btn ghost block" id="tpAg" style="margin-top:10px">＋ أضف للخطة</button><p class="small muted" style="margin:6px 4px 0">ننبهك قبل كل شي بنص ساعة.</p>'
      : '<div class="card"><p class="small muted" style="margin:0">حدد تاريخ السفر والرجعة عشان تخطط يوم بيوم.</p></div>');
    return out;
  }
  const human = (s) => { const d = new Date(s); return isNaN(d) ? '' : d.getDate() + ' ' + A.MONTHS[d.getMonth()] + (String(s).length > 10 ? ' ' + hm(d.getHours() * 60 + d.getMinutes()) : ''); };

  function packButton(t) {
    const n = suggest(t).length;
    return n ? '<button type="button" class="btn ghost block" id="tpPack" style="margin:8px 0"><span>✨ أضف</span> <bdi class="num">' + n + '</bdi> <span>أغراض تناسب الوجهة والجو</span></button>' : '';
  }

  function mount(root, t, persist, rerender) {
    wxFill(root, t);
    const ai = root.querySelector('#tpAI');
    if (ai) ai.onclick = () => { if (E.TravelAI) E.TravelAI.form(t, persist, rerender); };
    const shr = root.querySelector('#tpShare');
    if (shr) shr.onclick = () => E.TravelShare.sheet(t);
    const aio = root.querySelector('#tpAIOpen');
    if (aio) aio.onclick = () => { if (E.TravelAI) E.TravelAI.result(t, persist, rerender); };
    root.querySelectorAll('[data-tpmap]').forEach((b) => { b.onclick = () => { const N = window.HayatiNative; if (N && N.openLink) N.openLink(b.dataset.tpmap); else window.open(b.dataset.tpmap, '_blank', 'noopener'); }; });
    const city = root.querySelector('#tpCity');
    if (city) city.onchange = () => {
      t.city = city.value || null;
      const c = cityOf(t), T = E.Travel;
      // العملة تتعبّى من الوجهة لو ما حددتها
      if (c && c.cur && !t.cur && T) { const d = T.CUR.find((x) => x[0] === c.cur); if (d) t.cur = { code: d[0], rate: d[2] || 0 }; }
      persist(); rerender();
    };
    const pass = root.querySelector('#tpPass');
    if (pass) pass.onchange = () => { t.docs = Object.assign({}, t.docs, { passport: pass.value || null }); persist(); rerender(); };
    root.querySelectorAll('[data-bk]').forEach((b) => { b.onclick = () => { t.docs.books.splice(Number(b.dataset.bk), 1); persist(); rerender(); }; });
    root.querySelectorAll('[data-ag]').forEach((b) => { b.onclick = () => { t.agenda = (t.agenda || []).filter((x) => x.id !== b.dataset.ag); persist(); rerender(); }; });
    const pk = root.querySelector('#tpPack');
    if (pk) pk.onclick = () => { const add = suggest(t); t.check = t.check.concat(add); persist(); A.toast('انضافت الأغراض ✓'); rerender(); };
    const bk = root.querySelector('#tpBook');
    if (bk) bk.onclick = () => A.openSheet({
      title: '＋ حجز',
      saveLabel: 'أضف',
      body: '<div class="seg" id="tpBT">' + Object.entries(BOOK).map(([k, [e, n]], i) => '<button type="button" data-k="' + k + '" class="' + (i ? '' : 'on') + '">' + e + ' ' + n + '</button>').join('') + '</div>' +
        '<div class="field"><label>الاسم</label><input name="tp_t" maxlength="60" placeholder="مثلاً: طيران الخليج GF15 / فندق…"></div>' +
        '<div class="field"><label>رقم الحجز (اختياري)</label><input name="tp_r" maxlength="20" dir="ltr" placeholder="PNR"></div>' +
        '<div class="field"><label>الموعد (اختياري)</label><input name="tp_at" type="datetime-local"></div>' +
        '<p class="small muted" style="margin:0 4px">للطيران: ننبهك قبلها بيوم عشان تشيّك موعد التشيك إن مع شركة الطيران.</p>',
      mount(r) { r.dataset.k = 'flight'; A.segPick(r, '#tpBT', (k) => { r.dataset.k = k; }); },
      onSave(r) {
        const title = A.val(r, 'tp_t'); if (!title) throw new Error('اكتب اسم الحجز');
        t.docs = Object.assign({ books: [] }, t.docs); t.docs.books = (t.docs.books || []).concat({ type: r.dataset.k, title: title.slice(0, 60), ref: (A.val(r, 'tp_r') || '').slice(0, 20), at: A.val(r, 'tp_at') || '' });
        persist(); setTimeout(rerender, 280);
      },
    });
    const ag = root.querySelector('#tpAg');
    if (ag) ag.onclick = () => {
      const ds = dates(t);
      A.openSheet({
        title: '＋ للخطة',
        saveLabel: 'أضف',
        body: '<div class="field"><label>أي يوم؟</label><select name="tp_d">' + ds.map((d, i) => '<option value="' + d + '">' + dayLabel(d, i) + '</option>').join('') + '</select></div>' +
          '<div class="field"><label>الوقت (اختياري)</label><input name="tp_tm" type="time"></div>' +
          '<div class="field"><label>شنو؟</label><input name="tp_x" maxlength="60" placeholder="مثلاً: جولة بالبوسفور"></div>' +
          '<div class="field"><label>وين؟ (اختياري)</label><input name="tp_p" maxlength="60" placeholder="المكان أو العنوان"></div>',
        onSave(r) {
          const title = A.val(r, 'tp_x'); if (!title) throw new Error('اكتب شنو الخطة');
          t.agenda = (t.agenda || []).concat({ id: S.uuid(), date: A.val(r, 'tp_d'), time: A.val(r, 'tp_tm') || '', title: title.slice(0, 60), place: (A.val(r, 'tp_p') || '').slice(0, 60) });
          persist(); setTimeout(rerender, 280);
        },
      });
    };
  }

  // تنبيهات: قبل كل خطة بنص ساعة، وقبل الطيران بيوم، وتحذير الجواز قبل السفر بشهر
  function reminders(t) {
    const out = [], extra = { kind: 'trip', id: t.id };
    for (const x of t.agenda || []) {
      if (!x.date || !x.time) continue;
      const at = new Date(x.date + 'T' + x.time + ':00'); at.setMinutes(at.getMinutes() - 30);
      out.push({ key: 'tripag:' + x.id + ':' + x.date + x.time, at, title: '🗓️ بعد نص ساعة: ' + x.title, body: x.place || t.name, extra });
    }
    for (const b of (t.docs && t.docs.books) || []) {
      if (b.type !== 'flight' || !b.at) continue;
      const at = new Date(b.at); at.setDate(at.getDate() - 1);
      out.push({ key: 'tripfl:' + t.id + ':' + b.at, at, title: '✈️ رحلتك بكرة: ' + b.title, body: 'شيّك موعد التشيك إن مع شركة الطيران', extra });
    }
    const pc = passportCheck(t);
    if (pc && pc.level !== 'ok' && t.go) {
      const g = new Date(t.go + 'T20:00:00'); g.setDate(g.getDate() - 30);
      out.push({ key: 'trippp:' + t.id + ':' + t.docs.passport, at: g, title: '🛂 شيّك جوازك قبل ' + t.name, body: pc.text, extra });
    }
    return out;
  }

  E.TravelPlus = { CITIES, cityOf, qibla, tzOffset, localNow, prayersThere, weatherOf, suggest, passportCheck, section, packButton, mount, reminders, dates };
})();
