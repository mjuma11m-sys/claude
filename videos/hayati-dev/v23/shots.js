// لقطات حقيقية لفيديو التحديث v23 من dist/Hayati.html ببيانات تجريبية
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const path = require('path');
const seed = require('../../hayati-ad/seed.js');
const APP = 'file://' + path.join(__dirname, '../../../hayati-app/dist/Hayati.html');
const k = (off) => { const d = new Date(); d.setDate(d.getDate() + off); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const TRIP = [{ id: 't1', name: 'دبي', kind: 'leisure', go: k(3), back: k(7), plan: { flight: 85, hotel: 180, food: 60, fun: 50 }, costs: [{ id: 'c1', cat: 'flight', amount: 78.4, note: '', at: '' }, { id: 'c2', cat: 'hotel', amount: 50, note: '', at: '', orig: { code: 'AED', value: 488.36, rate: 9.7672 } }],
  check: [['أوراق', 'جواز السفر (صالح 6 أشهر على الأقل)', 1], ['أوراق', 'تذاكر الطيران', 1], ['أوراق', 'حجز السكن', 1], ['فلوس', 'بطاقة تشتغل برا + شوية كاش بعملة البلد', 0], ['ملابس', 'ملابس على عدد الأيام', 1], ['ملابس', 'نظارة شمس وواقي شمس', 0], ['ملابس', 'ملابس سباحة', 0], ['إلكترونيات', 'شاحن ووصلة وباور بانك', 0], ['صحة', 'أدويتك الشخصية', 0]].map(([g, t, on]) => ({ g, t, on: !!on })),
  cur: { code: 'AED', rate: 9.7672 } }];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const mk = async (lang) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'ar-BH', timezoneId: 'Asia/Bahrain', colorScheme: 'light' });
    await ctx.addInitScript(([trips, lang]) => {
      localStorage.setItem('hayati-loop-ask', 'yes'); localStorage.setItem('hayati-seen-version', 'v22'); localStorage.setItem('hayati-first-step', 'done');
      localStorage.setItem('hayati-trips', trips); if (lang) localStorage.setItem('hayati-lang', lang);
      // التنبيه الحقيقي يحتاج وضع الجوال (LocalNotifications) عشان upcoming() يشتغل
      window.Capacitor = { isNativePlatform: () => true, Plugins: { LocalNotifications: { checkPermissions: async () => ({ display: 'granted' }), requestPermissions: async () => ({ display: 'granted' }), getPending: async () => ({ notifications: [] }), cancel: async () => {}, schedule: async () => {} } } };
    }, [JSON.stringify(TRIP), lang]);
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.errs = errs;
    await p.goto(APP); await p.waitForFunction(() => window.App && App.st);
    await p.addStyleTag({ content: '.morning{display:none!important}' });
    await p.evaluate(seed); await p.evaluate(() => { App.go('today'); scrollTo(0, 0); });
    return p;
  };
  const shot = async (p, n) => { await p.waitForTimeout(700); await p.evaluate(() => document.activeElement && document.activeElement.blur()); await p.screenshot({ path: path.join(__dirname, 'shots', n + '.png') }); };
  const p = await mk(null);
  await shot(p, '0-today');
  // 🔐 النسخة المشفّرة
  await p.click('#settingsBtn'); await p.waitForTimeout(300);
  await p.click('#sheetBody [data-set="secure-backup"]'); await p.waitForTimeout(600);
  await p.fill('#bkP1', 'demo-password-1'); await p.fill('#bkP2', 'demo-password-1');
  await shot(p, '1-backup'); await p.click('#sheetCancel'); await p.waitForTimeout(400);
  // 💱 العملة
  await p.evaluate(() => window.Extras.Travel.tripSheet('t1')); await p.waitForTimeout(500);
  await p.fill('#tvFx', '250');
  await p.evaluate(() => { const el = document.getElementById('tvCur').closest('.card'); el.scrollIntoView({ block: 'center' }); });
  await shot(p, '2-currency');
  // 🧳 الرحلة من فوق (تحت التنبيه)
  await p.evaluate(() => document.getElementById('sheetBody').scrollTo(0, 0)); await p.evaluate(() => document.querySelector('#tvList').scrollIntoView({ block: 'start' }));
  await shot(p, '3-trip');
  const notes = await p.evaluate(() => { const now = new Date(); now.setHours(9, 0, 0, 0); return HayatiNative.upcoming(now, { trips: true }).filter((n) => n.extra.kind === 'trip').map((n) => ({ t: n.title, b: n.body })); });
  const wg = await p.evaluate(() => { const n = new Date(); n.setHours(9, 0, 0, 0); return window.Extras.Widget.snapshot(n); });
  await p.click('#sheetCancel');
  // 🌐 English
  const e = await mk('en');
  await shot(e, '4-english');
  require('fs').writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify({ notes, wg }, null, 1));
  console.log(JSON.stringify({ notes, wg: { budget: wg.budget, items: wg.items.slice(0, 2) } }), p.errs.concat(e.errs).length ? p.errs.concat(e.errs) : 'ok');
  await b.close();
})();
