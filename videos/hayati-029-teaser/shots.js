// لقطات ميزات 0.29 من التطبيق نفسه (بيانات تجريبية) — node shots.js
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const path = require('path'), fs = require('fs');
const OUT = path.join(__dirname, 'shots');
const PLAN = { city: 'إسطنبول', people: 2, currency: 'TRY', days: [
  { title: 'إسطنبول القديمة', places: [{ name: 'آيا صوفيا', name_en: 'Hagia Sophia', tag: 'معلم مشهور', time: '09:30', fee_local: 0, fee_bhd: 0, activities: 'زيارة وتصوير' }, { name: 'الجامع الأزرق', name_en: 'Blue Mosque', tag: 'صلاة الظهر', time: '12:30', fee_local: 0, fee_bhd: 0, activities: 'صلاة وجولة' }, { name: 'البازار الكبير', name_en: 'Grand Bazaar', tag: 'تسوق', time: '15:00', fee_local: 0, fee_bhd: 0, activities: 'هدايا' }] },
  { title: 'البوسفور', places: [{ name: 'رحلة البوسفور', name_en: 'Bosphorus Cruise', tag: 'بحر', time: '10:00', fee_local: 300, fee_bhd: 3.5, activities: 'جولة بالقارب' }, { name: 'أورتاكوي', name_en: 'Ortakoy', tag: 'أكل', time: '14:00', fee_local: 0, fee_bhd: 0, activities: 'كومبير' }] },
  { title: 'الجزر', places: [{ name: 'جزيرة بيوك أدا', name_en: 'Buyukada', tag: 'طبيعة', time: '09:00', fee_local: 120, fee_bhd: 1.4, activities: 'دراجة' }] }],
  budget: { hotel_night: 35, food_day: 12, transport_day: 5, activities_total: 15 }, packing: ['حذاء مشي', 'شاحن متنقل', 'محوّل كهرباء نوع C/F'], tips: ['اشترِ بطاقة إسطنبول كارت للمواصلات'] };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  await ctx.addInitScript(() => { localStorage.setItem('hayati-account-step', 'skip'); localStorage.setItem('hayati-first-step', 'done'); localStorage.setItem('hayati-seen-version', 'v29'); localStorage.setItem('hayati-tour', 'done'); });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const open = async () => { await p.goto('file:///home/user/claude/hayati-app/dist/Hayati.html'); await p.waitForFunction(() => window.App && App.st && window.Extras && Extras.TravelAI); await p.evaluate(() => App.S.setSettings({ onboarded: true, budget: 300, payday: 1 })); };
  const shot = async (n) => { await p.waitForTimeout(1000); await p.screenshot({ path: path.join(OUT, n + '.png') }); if (await p.locator('#sheet[open]').count()) await p.locator('#sheet[open]').screenshot({ path: path.join(OUT, n + '-s.png') }); };
  const go = new Date(Date.now() + 12 * 864e5).toISOString().slice(0, 10), back = new Date(Date.now() + 15 * 864e5).toISOString().slice(0, 10);
  const seed = (plan) => p.evaluate(({ plan, go, back }) => { App.S.upsert('trips', { id: 'ist', name: 'إسطنبول', kind: 'leisure', go, back, city: 'istanbul', plan: { hotel: 105, flight: 160 }, costs: [], check: [], aiPlan: plan }); }, { plan, go, back });
  // 1 ملف الرحلة بالذكاء
  await open(); await seed(PLAN); await p.evaluate(() => Extras.TravelAI.result(Extras.Travel.get('ist'), () => {}, () => {})); await shot('ai');
  // 2 بطاقة الوجهة
  await open(); await seed(PLAN); await p.evaluate(() => Extras.Travel.tripSheet('ist')); await p.waitForTimeout(600);
  await p.evaluate(() => { const el = document.querySelector('#sheetBody #tpShare') || document.querySelector('#sheetBody'); el.scrollIntoView({ block: 'center' }); }); await shot('dest');
  // 3 صورة القروب (canvas)
  const data = await p.evaluate(async () => (await Extras.TravelShare.draw(Extras.Travel.get('ist'))).toDataURL('image/png'));
  fs.writeFileSync(path.join(OUT, 'group.png'), Buffer.from(data.split(',')[1], 'base64'));
  // 4 شيت المشاركة
  await p.evaluate(() => { App.closeSheet(); }); await p.waitForTimeout(400); await p.evaluate(() => Extras.TravelShare.sheet(Extras.Travel.get('ist'))); await shot('share');
  // 5 الويكند
  await open(); await p.evaluate(() => Extras.Weekend.sheet()); await shot('weekend');
  // 6 فحص الأمان
  await open(); await p.evaluate(() => Extras.Secure.sheet()); await shot('security');
  if (errs.length) console.log('ERRORS', errs);
  await b.close();
})();
