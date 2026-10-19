// اختبارات «حياتي» بمتصفح حقيقي بحجم آيفون. كل اختبار يبدأ بتطبيق فاضي (تخزين جديد).
const { test: base, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// كل اختبار: نمنع أي اتصال برّا (خطوط، CDN) ونفشل لو صار أي خطأ JavaScript
// «جديد بحياتي» (DW-019) تطلع للمستخدم القديم بعد التحديث؛ الاختبارات تعتبرها انشافت إلا اختباراتها هي
const APP_V = /const APP_VERSION = '(v\d+)'/.exec(fs.readFileSync(path.join(__dirname, '../js/core/app.js'), 'utf8'))[1];
const test = base.extend({
  page: async ({ page, baseURL }, use, testInfo) => {
    if (!/جديد بحياتي/.test(testInfo.title)) await page.addInitScript((v) => { try { localStorage.setItem('hayati-seen-version', v); } catch (e) { /* تجاهل */ } }, APP_V);
    if (!/أول دقيقة/.test(testInfo.title)) await page.addInitScript(() => { try { localStorage.setItem('hayati-first-step', 'done'); } catch (e) { /* تجاهل */ } });
    // DW-050: شاشة «سجّل دخول أو تخطَّ» تطلع أول مرة لأن Supabase مربوط؛ الاختبارات تعتبرها انتخطّت إلا اختبارها هي
    if (!/شاشة الدخول/.test(testInfo.title)) await page.addInitScript(() => { try { localStorage.setItem('hayati-account-step', 'skip'); } catch (e) { /* تجاهل */ } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('**/*', (r) => (r.request().url().startsWith(baseURL) ? r.continue() : r.abort()));
    await use(page);
    expect(errors, 'JavaScript errors on the page').toEqual([]);
  },
});

const open = async (page, url = '/index.html') => { await page.goto(url); await page.waitForFunction(() => window.App && window.App.st); };
const store = (page, fn, arg) => page.evaluate(fn, arg);
const dayKey = (off = 0) => new Date(Date.now() + off * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Bahrain' });

test('every tab and section renders @webkit', async ({ page }) => {
  await open(page);
  for (const tab of ['today', 'money', 'schedule', 'tasks']) {
    await page.click(`button.tab[data-tab="${tab}"]`);
    await expect(page.locator(`button.tab[data-tab="${tab}"]`)).toHaveClass(/on/);
    await expect(page.locator('#view')).not.toBeEmpty();
  }
  for (const seg of ['schedule', 'focus', 'gpa', 'health']) {
    await store(page, (s) => { App.ui.studySeg = s; App.go('schedule'); }, seg);
    await expect(page.locator('#view')).not.toBeEmpty();
  }
  await expect(page.locator('.tab-pill')).toHaveCount(1);
});

test('add an expense by hand and it survives a reload @webkit', async ({ page }) => {
  await open(page);
  await page.click('#addBtn');
  await page.click('[data-pick="tx"]');
  await page.fill('#sheetBody [name=amount]', '4.250');
  await page.fill('#sheetBody [name=merchant]', 'Costa');
  await page.click('#sheetSave');
  await expect.poll(() => store(page, () => App.st.transactions.length)).toBe(1);
  await page.reload();
  await page.waitForFunction(() => window.App && App.st.transactions.length === 1);
  expect(await store(page, () => App.st.transactions[0].amount)).toBe(4.25);
});

test('first bank message asks for consent once, declining stores nothing', async ({ page }) => {
  await open(page);
  await page.click('#addBtn');
  await page.click('[data-pick="sms"]');
  await expect(page.locator('#smsConsent')).toContainText('إخفاء أرقام البطاقة');
  await page.click('#sheetCancel');
  expect(await store(page, () => App.st.settings.sms_consent_at || null)).toBeNull();

  await page.click('#addBtn');
  await page.click('[data-pick="sms"]');
  await page.click('#sheetSave');
  await expect(page.locator('#sheetBody [name=sms]')).toBeVisible();
  expect(await store(page, () => typeof App.st.settings.sms_consent_at)).toBe('string');

  await page.click('#sheetCancel');
  await page.click('#addBtn');
  await page.click('[data-pick="sms"]');
  await expect(page.locator('#sheetBody [name=sms]')).toBeVisible();
  await expect(page.locator('#smsConsent')).toHaveCount(0);
});

test('pasting a bank message logs the transaction', async ({ page }) => {
  await open(page);
  await page.click('#addBtn');
  await page.click('[data-pick="sms"]');
  await page.click('#sheetSave'); // consent
  await page.fill('#sheetBody [name=sms]', 'Your card XX4821 was used for BHD 3.750 at COSTA COFFEE SEEF on 11/10/26. Avl bal BHD 412.300');
  await page.dispatchEvent('#sheetBody [name=sms]', 'input');
  await expect(page.locator('#smsPreview')).toContainText('COSTA COFFEE');
  await page.click('#sheetSave');
  await expect.poll(() => store(page, () => App.st.transactions.map((t) => [t.amount, t.category]))).toEqual([[3.75, 'قهوة']]);
});

test('PIN lock: weak PIN refused, wrong PIN refused, right PIN unlocks', async ({ page }) => {
  await open(page);
  await page.click('#settingsBtn');
  await page.click('[data-set="lock-set"]');
  await page.fill('[name=pin]', '1111'); await page.fill('[name=pin2]', '1111');
  await page.click('#sheetSave');
  await expect(page.locator('#toast')).toContainText('أصعب');
  await page.fill('[name=pin]', '2580'); await page.fill('[name=pin2]', '2580');
  await page.click('#sheetSave');
  await expect.poll(() => store(page, () => !!localStorage.getItem('hayati-lock'))).toBe(true);
  expect(await store(page, () => localStorage.getItem('hayati-lock'))).not.toContain('2580'); // only the hash is stored
  await page.reload();
  await expect(page.locator('.lock')).toBeVisible();
  for (const k of '1234') await page.click(`.lock [data-k="${k}"]`);
  await expect(page.locator('.lock .msg')).toContainText('غلط');
  for (const k of '2580') await page.click(`.lock [data-k="${k}"]`);
  await expect(page.locator('.lock')).toHaveCount(0);
});

test('Apple Watch link logs sleep, rejects impossible values, no duplicate day', async ({ page }) => {
  await open(page, '/index.html#health?sleep=6٫8&deep=1.1&rhr=56&steps=7400&junk=1');
  await expect.poll(() => store(page, () => App.st.daily.length)).toBe(1);
  const d = await store(page, () => App.st.daily[0]);
  expect([d.sleep, d.sleep_deep, d.rhr, d.steps, d.junk]).toEqual([6.8, 1.1, 56, 7400, undefined]);
  expect(await page.evaluate(() => location.hash)).toBe('');
  await page.goto('/index.html#health?sleep=7.4');
  await page.waitForFunction(() => window.App && App.st.daily.length >= 1);
  await expect.poll(() => store(page, () => [App.st.daily.length, App.st.daily[0].sleep])).toEqual([1, 7.4]);
  await page.goto('/index.html#health?sleep=99&rhr=5');
  await expect(page.locator('#toast')).toContainText('ناقص');
});

test('football schedule from the coach message', async ({ page }) => {
  await open(page);
  await page.click('#addBtn');
  await page.click('[data-pick="football"]');
  await page.fill('#sheetBody [name=txt]', 'الأحد والثلاثاء ٦:٠٠ - ٨:٠٠ م ملعب نادي المحرق\nالخميس 5:30-7 لياقة في الجيم\nمباراة ودية 24/10 الساعة 7 م ضد الرفاع\nلا تنسون القفازات');
  await page.click('#impRead');
  await expect(page.locator('#impStatus')).toContainText('4');
  await page.click('#sheetSave');
  await expect.poll(() => store(page, () => App.st.courses.length)).toBe(2);
  const out = await store(page, () => ({ c: App.st.courses.map((c) => [c.days.join(','), c.start_time, c.end_time]), t: App.st.tasks.map((t) => t.title) }));
  expect(out.c).toEqual(expect.arrayContaining([['0,2', '18:00', '20:00'], ['4', '17:30', '19:00']]));
  expect(out.t[0]).toContain('الرفاع');
});

// DW-051: ارفع جدولك الجامعي ← المواد بأيامها ووقتها (النص يتقرا بالجهاز)
test('university timetable from pasted portal text', async ({ page }) => {
  await open(page);
  await store(page, () => App.S.upsert('courses', { name: 'MATH 101', type: 'lecture', days: [1, 3], start_time: '13:00', end_time: '14:15' }));
  await store(page, () => App.go('schedule'));
  await page.click('[data-action="timetable"]');
  await page.fill('#sheetBody [name=tt_txt]', 'ITCS 113 Programming I  UTH  10:00 - 10:50  S40-021\nMATH 101  MW  1:00 - 2:15  S1A-105\nPHYCS 101 - General Physics\nLab W 11:00-12:50 S1B-1010\nإحصاء · الأحد والثلاثاء ٨:٠٠ - ٩:١٥ قاعة 12');
  await page.click('#ttRead');
  await expect(page.locator('#ttStatus')).toContainText('4');
  await expect(page.locator('#ttStatus')).toContainText('1 موجودة');
  await page.click('#sheetSave');
  await expect.poll(() => store(page, () => App.st.courses.length)).toBe(4);
  const c = await store(page, () => App.st.courses.filter((x) => x.source === 'timetable').map((x) => [x.name, x.days.join(','), x.start_time, x.end_time, x.room]));
  expect(c).toEqual(expect.arrayContaining([
    ['ITCS 113 Programming I', '0,2,4', '10:00', '10:50', 'S40-021'],
    ['PHYCS 101 General Physics (عملي)', '3', '11:00', '12:50', 'S1B-1010'],
    ['إحصاء', '0,2', '08:00', '09:15', 'قاعة 12'],
  ]));
});

// DW-056: نفس الميزة لجدول الدوام والتمارين
test('timetable: a work roster with a day range and a training schedule', async ({ page }) => {
  await open(page);
  await store(page, () => App.go('schedule'));
  await page.click('[data-action="timetable"]');
  await page.click('#ttKind [data-k="work"]');
  await page.fill('#sheetBody [name=tt_txt]', 'الأحد – الخميس 7:00 - 3:00\nالسبت 8 - 12 دوام نص يوم');
  await page.click('#ttRead');
  await expect(page.locator('#ttStatus')).toContainText('2 دوامات');
  await page.click('#sheetSave');
  await expect.poll(() => store(page, () => App.st.courses.length)).toBe(2);
  await page.waitForTimeout(350);
  await page.click('[data-action="timetable"]');
  await page.click('#ttKind [data-k="gym"]');
  await page.fill('#sheetBody [name=tt_txt]', 'الأحد والثلاثاء 6 - 8 جيم صدر وتراي\nالاثنين والأربعاء 5:30 - 7 جري');
  await page.click('#ttRead');
  await expect(page.locator('#ttStatus')).toContainText('2 تمارين');
  await page.click('#sheetSave');
  await expect.poll(() => store(page, () => App.st.courses.length)).toBe(4);
  const c = await store(page, () => App.st.courses.map((x) => [x.name, x.type, x.days.join(','), x.start_time, x.end_time]));
  expect(c).toEqual(expect.arrayContaining([
    ['دوام', 'activity', '0,1,2,3,4', '07:00', '15:00'],
    ['دوام نص يوم', 'activity', '6', '08:00', '12:00'],
    ['جيم صدر وتراي', 'gym', '0,2', '18:00', '20:00'],
    ['جري', 'gym', '1,3', '17:30', '19:00'],
  ]));
});

// DW-065: قارئ PDF بالمواقع: جدول من موقع (خط أرقامه مكسور، يمين ← يسار، أيام مقلوبة) وبرنامج تمرين من بوربوينت
test('PDF position reader: broken-font university table and a PowerPoint workout program', async ({ page }) => {
  await open(page);
  const r = await page.evaluate(() => {
    const R = window.HayatiPdfRead;
    const it = (s, x, y, p = 1) => ({ s: R.fix(s), x, y, p, w: 600 });
    // صفين لكل يوم؛ العنوان مقلوب، والأوقات مشفّرة (\u0013 = 0، \u0014 = 1)، والصف الثاني اسمه ملفوف
    const sched = [
      it('دحألا موي', 467, 679), it('\u00138:\u0013\u0013', 511, 614), it('\u00139:\u0013\u0013 - ', 452, 614), it('MATH101', 358, 614), it('- Calculus', 263, 614), it('2\u00136', 183, 614), it('DR TEST ONE', 59, 614),
      it('دحألا موي نثإلا موي', 455, 492), it('\u0014\u0014:\u0013\u0013', 511, 427), it('\u00142:3\u0013', 511, 413), it('ACCT201', 401, 427), it('- Principles of', 325, 427), it('Accounting', 379, 413), it('3\u00134', 243, 420),
      it('دحألا موي ثالثلا موي', 455, 773, 2), it('\u00132:\u0013\u0013', 511, 700, 2), it('\u00133:3\u0013', 452, 700, 2), it('ACCT201', 401, 700, 2), it('- Principles of', 325, 700, 2), it('Accounting', 379, 690, 2), it('3\u00134', 243, 700, 2),
    ];
    const W = (s, x, y, p) => ({ s, x, y, p, w: 2471 });
    const prog = [
      W('تماريه', 1234, 1058, 1), W('يوم', 1041, 1058, 1), W('السبت', 729, 1058, 1), W('(', 1530, 942, 1), W('يوم', 1359, 942, 1), W('الذفع', 1084, 942, 1), W('يشمل', 780, 942, 1), W(')', 750, 942, 1),
      W(')', 685, 822, 1), W('تراى', 737, 822, 1), W('+', 966, 822, 1), W('صذر', 1364, 822, 1), W('(', 1561, 822, 1),
      W('1-', 1584, 1108, 2), W('smith', 1631, 1108, 2), W('FLAT CHEST PRESS', 1748, 1108, 2),
      W('1', 1730, 991, 2), W('2', 1828, 991, 2), W('3', 1926, 991, 2), W('x', 2122, 994, 2), W('15', 1719, 902, 2), W('12', 1815, 907, 2), W('10', 1912, 906, 2), W('x', 2122, 910, 2), W('دقيقتني', 1233, 693, 2),
      W('2- PLANK', 517, 659, 2), W('1', 664, 546, 2), W('2', 762, 546, 2), W('60', 643, 457, 2), W('60', 741, 457, 2), W('دقيقة', 210, 248, 2),
    ];
    return { s: R.schedule(sched), w: R.workout(prog), day: [R.dayIn('األربعاء'), R.dayIn('دحألا موي مخلا موي')] };
  });
  expect(r.s).toEqual([
    { name: 'MATH101 Calculus', days: [0], start: '08:00', end: '09:00', room: '206' },
    { name: 'ACCT201 Principles of Accounting', days: [1], start: '11:00', end: '12:30', room: '304' },
    { name: 'ACCT201 Principles of Accounting', days: [2], start: '14:00', end: '15:30', room: '304' },
  ]);
  expect(r.w).toEqual([{ day: 6, name: 'يوم الدفع', focus: 'صدر + تراي', exercises: [
    { name: 'smith FLAT CHEST PRESS', sets: ['15', '12', '10'], rest: 120 },
    { name: 'PLANK', sets: ['60ث', '60ث'], rest: 60 },
  ] }]);
  expect(r.day).toEqual([3, 4]);
});

test('timetable image without an account asks to sign in or paste text', async ({ page }) => {
  await open(page);
  await store(page, () => App.S.setSettings({ onboarded: true, roles: ['keeper', 'athlete'] }));   // يطلع حتى لو ملفه مو «طالب»
  await page.click('#toolsBtn');
  await page.click('[data-tool="timetable"]');
  await page.setInputFiles('#ttFile', { name: 'schedule.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgo=', 'base64') });
  await page.click('#ttRead');
  await expect(page.locator('#ttStatus')).toContainText('تحتاج حساب');
  expect(await store(page, () => App.st.courses.length)).toBe(0);
});

// DW-052: المطبخ ← المقادير تتغيّر حسب الأشخاص، والناقص للمشتريات
test('kitchen: recipe scales with people and missing items go to shopping', async ({ page }) => {
  await open(page);
  await page.click('#toolsBtn');
  await page.click('[data-tool="kitchen"]');
  await page.fill('#sheetBody [name=kq]', 'مجبوس دجاج');
  await expect(page.locator('#kList [data-recipe]')).toHaveCount(1);
  await page.click('#kList [data-recipe="majboos-chicken"]');
  await expect(page.locator('#kIng [data-ing="1"]')).toContainText('3 كوب');
  await page.click('#kPlus'); await page.click('#kPlus');   // 4 ← 6
  await expect(page.locator('#kIng [data-ing="1"]')).toContainText('4½ كوب');
  await expect(page.locator('#kNote')).toContainText('1½');
  await page.click('#kIng [data-ing="0"]'); await page.click('#kIng [data-ing="1"]');
  await page.click('#kShop');
  await expect.poll(() => store(page, () => App.st.shopping.map((x) => [x.name, x.qty]))).toEqual(expect.arrayContaining([['دجاجة مقطّعة 4 قطع', '1½ حبة'], ['رز بسمتي', '4½ كوب']]));
  const q = await page.evaluate(() => [Extras._kitchenQty(500, 'غرام', 3), Extras._kitchenQty(1, 'كغ', 0.25), Extras._kitchenQty(0.25, 'م.ص', 0.5), Extras._kitchenQty(4, 'حبة', 0.25)]);
  expect(q).toEqual(['1½ كغ', '250 غرام', '¼ م.ص', '1 حبة']);
  // DW-060: 50 وصفة، كل وحدة كاملة (مقادير بوحدات معروفة وخطوات ونصيحة)
  const bad = await page.evaluate(() => {
    const U = ['حبة', 'فص', 'عود', 'علبة', 'شريحة', 'كوب', 'م.ك', 'م.ص', 'غرام', 'كغ', ''];
    return window.HAYATI_RECIPES.filter((r) => !(r.name && r.steps.length >= 2 && r.ing.length >= 2 && r.tip && r.serves > 0 && r.ing.every((x) => U.includes(x[1]) && (x[0] == null || x[0] > 0)))).map((r) => r.id);
  });
  expect(bad).toEqual([]);
  expect(await page.evaluate(() => window.HAYATI_RECIPES.length)).toBe(50);
});

// DW-057: الرسالة القديمة تنحفظ بتاريخها، وكذا رسالة مرة وحدة، ونفس الرسالة ما تنضاف مرتين
test('bank messages keep their own date, several at once, and no duplicates', async ({ page }) => {
  await open(page);
  await store(page, () => App.S.setSettings({ sms_consent_at: new Date().toISOString() }));
  // التواريخ بساعة المتصفح (البحرين)، مو ساعة جهاز الاختبار
  const D = await page.evaluate(() => [3, 1, 0].map((n) => { const d = new Date(); d.setDate(d.getDate() - n); return { s: d.toDateString(), dmy: String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear() }; }));
  const one = 'Purchase of BHD 3.750 at COSTA COFFEE on ' + D[0].dmy + ' 09:15';
  await store(page, () => App.pasteSmsForm());
  await page.fill('#sheetBody [name=sms]', one);
  await expect(page.locator('#smsWhenNote')).toContainText('من الرسالة');
  await page.click('#sheetSave');
  await expect(page.locator('#toast')).toContainText('انضافت بتاريخ');
  let tx = await store(page, () => App.st.transactions.map((t) => [new Date(t.occurred_at).toDateString(), new Date(t.occurred_at).getHours()]));
  expect(tx[0]).toEqual([D[0].s, 9]);
  await page.waitForTimeout(350);
  await store(page, () => App.pasteSmsForm());
  await page.fill('#sheetBody [name=sms]', one + '\n\nBHD 5.250 debited at TALABAT on ' + D[1].dmy + '\n\nPurchase of BHD 1.000 at CAFE');
  await expect(page.locator('#smsPreview')).toContainText('مضافة قبل');
  await page.click('#sheetSave');
  await expect(page.locator('#toast')).toContainText('انضافت 2 عمليات');
  tx = await store(page, () => App.st.transactions.map((t) => [t.amount, new Date(t.occurred_at).toDateString()]));
  expect(tx).toEqual(expect.arrayContaining([[3.75, D[0].s], [5.25, D[1].s], [1, D[2].s]]));
  expect(tx.length).toBe(3);
});

// DW-058: استيراد الحساب كامل: كشف Excel، ملف رسائل CSV/XML/TXT، وسطور PDF؛ كل عملية بتاريخها والمكرر ما ينضاف
test('bank import: statement Excel, message files and PDF lines, each on its date, no duplicates', async ({ page }) => {
  await open(page);
  await page.click('#addBtn');
  await page.click('[data-pick="bankfile"]');
  await page.setInputFiles('#biFile', path.join(__dirname, 'fixtures/statement.xlsx'));
  await expect(page.locator('#biOut')).toContainText('لقيت 3 عملية');
  await expect(page.locator('#biOut')).toContainText('783.750');
  await page.click('#sheetSave');
  await expect.poll(() => store(page, () => App.st.transactions.length)).toBe(3);
  const tx = await store(page, () => App.st.transactions.map((t) => [t.kind, t.amount, new Date(t.occurred_at).toDateString(), t.category]).sort((a, b) => a[1] - b[1]));
  expect(tx).toEqual([['expense', 3.75, new Date(2026, 8, 3).toDateString(), 'قهوة'], ['expense', 12.5, new Date(2026, 9, 5).toDateString(), 'أكل ومطاعم'], ['income', 300, new Date(2026, 8, 3).toDateString(), expect.any(String)]]);
  // نفس الكشف مرة ثانية: ولا وحدة تنضاف
  await page.waitForTimeout(350);
  await store(page, () => Extras.bankImport());
  await page.setInputFiles('#biFile', path.join(__dirname, 'fixtures/statement.xlsx'));
  await expect(page.locator('#biOut')).toContainText('بينضاف 0');
  await page.click('#sheetCancel');
  // ملفات الرسائل
  const r = await page.evaluate(() => {
    const B = Extras._bank, now = new Date(2026, 9, 17, 12);
    const fromCsv = B.fromRows(B.csv('Message Date,Sender,Text\n2025-06-01 10:15:00,BBK,"Purchase of BHD 4.200 at STARBUCKS using card XXXX4821"\n2025-06-02 09:00:00,BBK,Your OTP is 1234\n'), now).list;
    const fromXml = B.fromXml('<?xml version="1.0"?><smses count="2"><sms address="NBB" date="1735725600000" body="BHD 20.000 debited at LULU HYPERMARKET" /><sms address="Mom" date="1735725600000" body="hi" /></smses>', now).list;
    const fromTxt = B.fromText('Purchase of BHD 1.500 at CAFE on 01/03/2024\n\nhello\n\nBHD 100.000 credited salary on 25/03/2024', now).list;
    const fromPdf = B.fromPdfLines(['Date  Details  Amount  Balance', '05/10/2026  POS TALABAT  12.500 DR  770.000', '06/10/2026  TRANSFER FROM AHMED  50.000 CR  820.000', 'Closing balance 820.000'], now).list;
    const f = (l) => l.map((x) => [x.kind, x.amount, x.at.getFullYear() + '-' + (x.at.getMonth() + 1) + '-' + x.at.getDate()]);
    return { csv: f(fromCsv), xml: f(fromXml), txt: f(fromTxt), pdf: f(fromPdf) };
  });
  expect(r.csv).toEqual([['expense', 4.2, '2025-6-1']]);
  expect(r.xml).toEqual([['expense', 20, '2025-1-1']]);
  expect(r.txt).toEqual([['expense', 1.5, '2024-3-1'], ['income', 100, '2024-3-25']]);
  expect(r.pdf).toEqual([['expense', 12.5, '2026-10-5'], ['income', 50, '2026-10-6']]);
});

// DW-059: عملة المستخدم: الرمز والخانات بالشاشة، والرسائل بعملته ما تتحول، وغيرها يتحول تقريبياً
test('user currency: Saudi riyal shows everywhere, riyal messages stay as they are, dinars convert', async ({ page }) => {
  await open(page);
  await store(page, () => { App.S.setSettings({ onboarded: true, currency: 'SAR', budget: 3000, sms_consent_at: new Date().toISOString() }); App.render(); });
  const r = await store(page, () => {
    const a = App.S.smsToTransaction('تم خصم 50 ريال من بطاقتك لدى جرير'), b = App.S.smsToTransaction('Purchase of BHD 10.000 at COSTA');
    return { fmt: App.fmt(1234.5), money: App.money(12), a: [a.amount, a.note], b: [b.amount, b.note] };
  });
  expect(r.fmt).toBe('1,234.50');
  expect(r.money).toContain('ر.س');
  expect(r.a).toEqual([50, null]);
  expect(r.b[0]).toBeCloseTo(99.73, 1);
  expect(r.b[1]).toContain('BHD');
  await store(page, () => App.txForm());
  await expect(page.locator('#sheetBody')).not.toContainText('د.ب');
  await page.click('#sheetCancel');
  // «ملفك»: طالب + مرحلة + عملة تنحفظ (كان read يستخدم patch قبل تعريفه)
  await store(page, () => window.Extras.settingsAction && window.Extras.settingsAction('profile'));
  await page.waitForSelector('#obCur');
  await page.click('.ob-chip[data-role="student"]');
  await page.click('#obLevel [data-lv="secondary"]');
  await page.selectOption('#obCur', 'KWD');
  await page.click('#sheetSave');
  // DW-067: يسأل يحوّل المبالغ ولا لا ← لا
  await page.click('#askDlg [data-cancel]');
  await expect.poll(() => store(page, () => [App.st.settings.currency, App.st.settings.study_level])).toEqual(['KWD', 'secondary']);
  await page.waitForTimeout(350);
  // تختارها من «ملفك»، والمطبخ موجود بقائمة +
  await page.click('#addBtn');
  await expect(page.locator('[data-pick="kitchen"]')).toHaveCount(1);
});

// DW-061: حساباتي: الرسائل تنربط بالبطاقة من آخر رقمين، الرصيد يمشي مع العمليات، والكشف يحط آخر رصيد
test('accounts: messages link by the last two digits, balance follows, statement sets the balance', async ({ page }) => {
  await open(page);
  await store(page, () => { App.S.setSettings({ onboarded: true, sms_consent_at: new Date().toISOString() }); App.ui.moneySeg = 'accounts'; App.go('money'); });
  await page.click('[data-action="acc-add"]');
  await page.click('#akSeg [data-k="card"]');
  await page.fill('#sheetBody [name=ac_name]', 'بطاقة الراتب');
  await page.fill('#sheetBody [name=ac_last2]', '21');
  await page.fill('#sheetBody [name=ac_balance]', '500');
  await page.fill('#sheetBody [name=ac_budget]', '100');
  await page.click('#sheetSave');
  await expect.poll(() => store(page, () => (App.st.settings.accounts || []).length)).toBe(1);
  await page.waitForTimeout(350);
  const r = await store(page, () => {
    const a = App.st.settings.accounts[0];
    const t1 = App.S.smsToTransaction('Purchase of BHD 12.500 at TALABAT using card XXXX4821');
    const t2 = App.S.smsToTransaction('Purchase of BHD 3.000 at CAFE using card XXXX9999');
    App.S.upsert('transactions', t1); App.S.upsert('transactions', t2);
    return { a1: t1.account_id === a.id, a2: t2.account_id, bal: Extras.accounts.balance(a), spend: Extras.accounts.monthSpend(a) };
  });
  expect(r).toEqual({ a1: true, a2: null, bal: 487.5, spend: 12.5 });
  await expect(page.locator('#view')).toContainText('487.500');
  await expect(page.locator('#view')).toContainText('صرف الشهر 12.500 من 100.000');
  // كشف الحساب لهالبطاقة: آخر رصيد بالكشف يصير رصيدها (لو ما عندنا رصيد أحدث؛ اللي كتبته اليوم أحدث فنشيله للتجربة)
  await store(page, () => App.S.setSettings({ accounts: App.st.settings.accounts.map((x) => Object.assign({}, x, { balance: null, balance_at: null })) }));
  await store(page, () => Extras.bankImport());
  await page.selectOption('#biAcc', { label: 'بطاقة الراتب ••21' });
  await page.setInputFiles('#biFile', path.join(__dirname, 'fixtures/statement.xlsx'));
  await expect(page.locator('#biOut')).toContainText('783.750');
  await page.click('#sheetSave');
  await expect.poll(() => store(page, () => App.st.transactions.filter((t) => t.account_id === App.st.settings.accounts[0].id).length)).toBe(4);
  // 783.750 بتاريخ 5 أكتوبر + عملية طلبات (اليوم، بعده) = 771.250
  expect(await store(page, () => Extras.accounts.balance(App.st.settings.accounts[0]))).toBe(771.25);
  // العملية اليدوية فيها خانة الحساب
  await store(page, () => App.txForm());
  await expect(page.locator('#sheetBody [name=account_id]')).toHaveCount(1);
});

// DW-067: إصلاحات التقييم: «ابدأ هني»، Google مخفي لين ينشر، الذكاء يختفي لو الدالة مو منشورة، وتحويل المبالغ مع العملة
test('lecture recording on iPhone uses the native recorder that keeps going in the background', async ({ page }) => {
  await open(page);
  const r = await store(page, async () => {
    const calls = [];
    // آيفون وهمي: الإضافة HayatiRecorder
    window.Capacitor = Object.assign(window.Capacitor || {}, { getPlatform: () => 'ios', isNativePlatform: () => false, Plugins: Object.assign((window.Capacitor || {}).Plugins || {}, {
      HayatiRecorder: {
        status: async () => ({ recording: false }),
        start: async () => { calls.push('start'); return { startedAt: Date.now() }; },
        stop: async () => { calls.push('stop'); return { data: btoa('fake-m4a'), mime: 'audio/mp4', dur: 5 }; },
      },
    }) });
    window._recCalls = calls;
    App.ui.studySeg = 'lectures'; App.go('schedule');
    return true;
  });
  expect(r).toBe(true);
  await page.click('[data-action="lec-new"]');
  await expect(page.locator('#lcRecTip')).toContainText('ظهره');
  await page.click('#lcRec');
  await expect(page.locator('#lcRec')).toContainText('وقّف');
  await page.click('#lcRec');
  await expect(page.locator('#lcRec')).toContainText('ابدأ التسجيل');
  await expect(page.locator('#lcClips [data-play]')).toHaveCount(1);
  expect(await page.evaluate(() => window._recCalls)).toEqual(['start', 'stop']);
});

test('free monthly AI quota: warns when one try is left', async ({ page }) => {
  await open(page);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('hayati-ai-left', { detail: { feature: 'study', left: 1, limit: 3 } })));
  await expect(page.locator('#toast')).toContainText('باقي لك محاولة مجانية وحدة', { timeout: 4000 });
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('hayati-ai-left', { detail: { feature: 'study', left: 2, limit: 3 } })));
  await page.waitForTimeout(2800);
  await expect(page.locator('#toast')).not.toHaveClass(/show/);
});

test('review fixes: start-here card, hidden Google, AI hides when the function is missing, currency conversion', async ({ page }) => {
  await open(page);
  await store(page, () => { App.S.setSettings({ onboarded: true, roles: ['student'] }); App.go('today'); });
  await expect(page.locator('#startHere')).toContainText('0/4');
  await store(page, () => App.S.setSettings({ budget: 200 }));
  await expect(page.locator('#startHere')).toContainText('1/4');
  await page.click('#startHere [data-k="timetable"]');
  await expect(page.locator('#ttRead')).toHaveCount(1);
  await page.click('#sheetCancel'); await page.waitForTimeout(350);
  await page.click('#startHere [data-action="start-hide"]');
  await expect(page.locator('#startHere')).toHaveCount(0);
  // Google ما يطلع حتى لو مفعّل
  expect(await page.evaluate(() => { window.HAYATI_CONFIG.PROVIDERS = ['apple', 'google']; return App.S.providers(); })).not.toContain('google');
  // دالة الذكاء مو منشورة ← تختفي الأزرار
  const off = await store(page, async () => {
    App.S.status.signedIn = true;
    const real = App.S.invokeFn;
    App.S.invokeFn = async () => { App.S.status.aiOff = true; throw new Error('unavailable'); };
    try { await App.S.invokeFn('lecture-ai', {}); } catch (e) { /* متوقع */ }
    App.S.invokeFn = real;
    return App.S.status.aiOff;
  });
  expect(off).toBe(true);
  await store(page, () => { App.ui.studySeg = 'lectures'; App.go('schedule'); });
  await page.click('[data-action="lec-new"]');
  await expect(page.locator('[data-ai]')).toHaveCount(0);
  await page.click('#sheetCancel'); await page.waitForTimeout(350);
  // تحويل المبالغ: 10 د.ب ← تقريباً 99.73 ر.س
  const r = await store(page, () => {
    App.S.upsert('transactions', { kind: 'expense', amount: 10, category: 'قهوة', occurred_at: new Date().toISOString() });
    App.S.setSettings({ currency: 'SAR' });
    Extras._convertAll('BHD', 'SAR');
    return [App.st.transactions[0].amount, App.st.settings.budget];
  });
  expect(r[0]).toBeCloseTo(99.73, 1);
  expect(r[1]).toBeCloseTo(1994.68, 0);
});

test('weekly report shows on Friday evening and opens', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-16T20:00:00+03:00') });
  await open(page);
  await store(page, () => App.S.upsert('transactions', { kind: 'expense', amount: 9.5, category: 'قهوة', merchant: 'Costa', occurred_at: new Date().toISOString() }));
  await page.click('.cta[data-action="weekly"]');
  await expect(page.locator('#sheetBody')).toContainText('9.500');
  await page.click('#sheetCancel');
  await expect(page.locator('.cta[data-action="weekly"]')).toHaveCount(0); // once per week
});

test('goalkeeper: a clean sheet updates the season', async ({ page }) => {
  await open(page);
  await store(page, () => { App.ui.studySeg = 'health'; App.go('schedule'); });
  await page.click('[data-action="gk-add"]');
  await page.fill('[name=opponent]', 'المحرق'); await page.fill('[name=for]', '1'); await page.fill('[name=against]', '0'); await page.fill('[name=saves]', '5');
  await page.click('#sheetSave');
  await expect(page.locator('#toast')).toContainText('كلين شيت');
  await expect(page.locator('#view')).toContainText('كلين شيت');
});

test('attendance prompt after a lecture records an absence', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-13T11:40:00+03:00') }); // Tuesday
  await open(page);
  await store(page, () => App.S.upsert('courses', { name: 'Marketing', type: 'lecture', days: [2], start_time: '10:00', end_time: '11:15', absence_limit: 6 }));
  await page.click('[data-action="att-no"]');
  await expect(page.locator('#toast')).toContainText('باقي');
  expect(await store(page, () => App.st.courses[0].absences)).toEqual(['2026-10-13']);
  await expect(page.locator('[data-action="att-no"]')).toHaveCount(0);
});

test('offline single-file build is up to date and works', async ({ page }) => {
  const root = path.resolve(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const bundle = fs.readFileSync(path.join(root, 'dist/Hayati.html'), 'utf8');
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]).filter((s) => !s.startsWith('http') && !s.startsWith('vendor/'));
  for (const s of scripts) {
    const src = fs.readFileSync(path.join(root, s), 'utf8').replace(/<\/script/g, '<\\/script');
    expect(bundle.includes(src), `dist/Hayati.html is stale for ${s} — run: npm run build`).toBe(true);
  }
  await open(page, '/dist/Hayati.html');
  await expect(page.locator('#title')).toHaveText('اليوم');
});

test('Jafari method: three prayer times (Fajr, Dhuhrain, Ishaain)', async ({ page }) => {
  await open(page);
  const names = await store(page, () => { App.S.setSettings({ prayer_method: 'jafari', prayer_on: true }); return App.agendaOn(new Date()).filter((x) => x.type === 'prayer').map((x) => x.name); });
  expect(names).toEqual(['صلاة الفجر', 'صلاة الظهرين', 'صلاة العشاءين']);
  const five = await store(page, () => { App.S.setSettings({ prayer_method: 'gulf' }); return App.agendaOn(new Date()).filter((x) => x.type === 'prayer').length; });
  expect(five).toBe(5);
  await store(page, () => App.S.setSettings({ prayer_method: 'jafari' }));
  await page.click('#settingsBtn');
  await expect(page.locator('.prayer-grid > div')).toHaveCount(3);
  await expect(page.locator('.prayer-grid')).toContainText('العشاءين');
});

test('prayer times go into the calendar export (one event per prayer per day)', async ({ page }) => {
  await open(page);
  await store(page, () => { App.S.setSettings({ prayer_method: 'jafari' }); App.go('schedule'); });
  await page.evaluate(() => document.querySelector('[data-action="calendar"]').click());
  await expect(page.locator('#sheetBody [name=prayers]')).toBeChecked();
  const ics = await store(page, () => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return CalendarExport.build({ prayers: [{ key: 'dhuhr', name: 'صلاة الظهرين', date: d, start: 11 * 60 + 40, dur: 30 }] });
  });
  expect(ics.count).toBe(1);
  expect(ics.text).toMatch(/UID:prayer-dhuhr-\d{8}@hayati/);
  expect(ics.text).toContain('T114000');
  expect(ics.text).toContain('الحين وقت صلاة الظهرين');
});

test('app badge counts today and overdue tasks only', async ({ page }) => {
  await open(page);
  const n = await store(page, () => {
    const at = (h) => { const d = new Date(); d.setHours(d.getHours() + h); return d.toISOString(); };
    App.S.upsert('tasks', { id: 't1', title: 'واجب', kind: 'homework', due_at: at(-30) });
    App.S.upsert('tasks', { id: 't2', title: 'خلص', kind: 'homework', due_at: at(-1), done: true });
    App.S.upsert('tasks', { id: 't3', title: 'موعد', kind: 'appointment', due_at: at(0) });
    App.S.upsert('tasks', { id: 't4', title: 'الأسبوع الجاي', kind: 'exam', due_at: at(24 * 7) });
    return HayatiPWA.pending();
  });
  expect(n).toBe(1);
});

test('service worker precaches every script the page loads', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const local = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]).filter((s) => !s.startsWith('http'));
  expect(local.length).toBeGreaterThan(10);
  for (const s of local) expect(sw, s + ' missing from sw.js SHELL').toContain("'" + s + "'");
});

test.describe('offline', () => {
  test.use({ serviceWorkers: 'allow' });
  test('opens with no network after the first visit', async ({ page, context }) => {
    await open(page);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller);
    await context.setOffline(true);
    await page.reload();
    await page.waitForFunction(() => window.App && window.App.st);
    await expect(page.locator('button.tab[data-tab="today"]')).toBeVisible();
    await context.setOffline(false);
  });
});

test('search: Arabic spelling variants, amounts, total spent, opens the match', async ({ page }) => {
  await open(page);
  await store(page, () => {
    const d = (n) => { const x = new Date(); x.setDate(x.getDate() - n); return x.toISOString(); };
    App.S.upsert('transactions', { id: 'a', kind: 'expense', amount: 3.75, merchant: 'Costa Coffee', category: 'قهوة', occurred_at: d(1) });
    App.S.upsert('transactions', { id: 'b', kind: 'expense', amount: 2.5, merchant: 'COSTA', category: 'قهوة', occurred_at: d(70) });
    App.S.upsert('transactions', { id: 'c', kind: 'expense', amount: 12, merchant: 'بنزين بابكو', category: 'مواصلات وبنزين', occurred_at: d(2) });
    App.S.upsert('tasks', { id: 't', title: 'واجب المحاسبة', kind: 'homework' });
  });
  const r = await store(page, () => {
    const n = (q) => { const x = HayatiFind.search(q); return [x.tx.length, x.tasks.length]; };
    return { costa: n('costa'), coffee: n('قهوه'), amount: n('3.75'), task: n('المحاسبه'), none: n('zzz') };
  });
  expect(r).toEqual({ costa: [2, 0], coffee: [2, 0], amount: [1, 0], task: [0, 1], none: [0, 0] });
  await page.click('#findBtn');
  await page.fill('#findQ', 'costa');
  await expect(page.locator('.find-sum b')).toContainText('6.250');
  await page.click('[data-find="tx"][data-id="a"]');
  await expect(page.locator('#sheetBody [name=merchant]')).toHaveValue('Costa Coffee');
});

test('undo brings back a deleted item, and a batch delete undoes in one tap', async ({ page }) => {
  await open(page);
  await store(page, () => {
    App.S.upsert('tasks', { id: 'u1', title: 'مهمة', kind: 'homework' });
    App.S.remove('tasks', 'u1');
  });
  await expect(page.locator('.undo-bar')).toHaveClass(/show/);
  await expect(page.locator('.undo-bar span')).toHaveText('انحذفت');
  await page.click('.undo-bar button');
  expect(await store(page, () => App.st.tasks.map((t) => t.title))).toEqual(['مهمة']);
  await store(page, () => {
    for (const id of ['s1', 's2', 's3']) App.S.upsert('shopping', { id, name: id });
    for (const id of ['s1', 's2', 's3']) App.S.remove('shopping', id);
  });
  await expect(page.locator('.undo-bar span')).toHaveText('انحذف 3');
  await page.click('.undo-bar button');
  expect(await store(page, () => App.st.shopping.length)).toBe(3);
});

test('month-end forecast ignores subscriptions and one-off big buys', async ({ page }) => {
  await open(page);
  const f = await store(page, () => {
    App.S.setSettings({ budget: 200 });
    const at = (d) => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), d, 12).toISOString(); };
    for (let d = 1; d <= 10; d++) App.S.upsert('transactions', { id: 'd' + d, kind: 'expense', amount: 5, merchant: 'Costa', occurred_at: at(d) });
    App.S.upsert('transactions', { id: 'big', kind: 'expense', amount: 120, merchant: 'Uni fees', occurred_at: at(2) });
    App.S.upsert('transactions', { id: 'sub', kind: 'expense', amount: 4, merchant: 'Netflix', source: 'subscription', occurred_at: at(3) });
    const now = new Date(); now.setDate(10);
    const r = HayatiInsights.forecast(now);
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return { spent: r.spent, end: r.end, expect: 174 + 5 * (days - 10), early: HayatiInsights.forecast(new Date(now.getFullYear(), now.getMonth(), 3)) };
  });
  expect(f.spent).toBe(174);
  expect(f.end).toBeCloseTo(f.expect, 5);
  expect(f.early).toBeNull();
});

test('readiness: short sleep + low HRV after a match = recovery day', async ({ page }) => {
  await open(page);
  const r = await store(page, () => {
    const k = (off) => { const d = new Date(); d.setDate(d.getDate() - off); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    for (let i = 1; i <= 5; i++) App.S.upsert('daily', { id: 'n' + i, date: k(i), watch: true, sleep: 8, hrv: 60, rhr: 52 });
    App.S.upsert('matches', { id: 'm', date: k(1), opponent: 'المحرق', minutes: 90, for: 1, against: 0 });
    App.S.upsert('daily', { id: 'n0', date: k(0), watch: true, sleep: 5.5, hrv: 42, rhr: 58 });
    App.go('today');
    return HayatiInsights.readiness();
  });
  expect(r.zone).toBe('red');
  await expect(page.locator('.readiness')).toContainText('يوم استشفاء');
  await expect(page.locator('.rd-chips')).toContainText('مباراة أمس');
  const g = await store(page, () => {
    const d = new Date(); const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    App.S.remove('matches', 'm');
    App.S.upsert('daily', { id: 'n0', date: k, watch: true, sleep: 8.2, hrv: 63, rhr: 51 });
    return HayatiInsights.readiness().zone;
  });
  expect(g).toBe('green');
});

test('first run: welcome card sets name, roles and prayer; employee hides GPA, keeper and attendance', async ({ page }) => {
  await open(page);
  await expect(page.locator('#obCard')).toBeVisible();
  await page.fill('#obName', 'فاطمة');
  await page.click('.ob-chip[data-role="employee"]');
  await page.click('#obPrayer [data-p="gulf"]');
  await page.fill('#obBudget', '400');
  await page.click('[data-action="ob-save"]');
  await expect(page.locator('#obCard')).toHaveCount(0);
  const s = await store(page, () => App.st.settings);
  expect([s.name, s.roles, s.prayer_method, s.budget, s.onboarded]).toEqual(['فاطمة', ['employee'], 'gulf', 400, true]);
  await expect(page.locator('#subtitle')).toContainText('يا فاطمة');
  await expect(page.locator('button.tab[data-tab="schedule"]')).toContainText('جدولي');
  await store(page, () => App.go('schedule'));
  await expect(page.locator('[data-action="study-seg"][data-k="gpa"]')).toHaveCount(0);
  await store(page, () => { App.ui.studySeg = 'health'; App.go('schedule'); });
  await expect(page.locator('#view')).not.toContainText('🧤 الحارس');
  // قبل ما يختار، ما نفترض طريقة صلاة
  expect(await store(page, () => { const s = App.st.settings; return s.prayer_method; })).toBe('gulf');
  // صلاة أهل السنة = 5 أوقات
  expect(await store(page, () => Extras.agenda(new Date()).length)).toBe(5);
});

test('existing users (data, no roles) never see the welcome card and keep every feature', async ({ page }) => {
  await open(page);
  await store(page, () => App.S.upsert('tasks', { id: 'x', title: 'قديم', kind: 'homework' }));
  await store(page, () => App.go('today'));
  await expect(page.locator('#obCard')).toHaveCount(0);
  await store(page, () => App.go('schedule'));
  await expect(page.locator('[data-action="study-seg"][data-k="gpa"]')).toHaveCount(1);
  await expect(page.locator('button.tab[data-tab="schedule"]')).toContainText('الدراسة');
});

test('a brand-new user sees no prayer times until they choose a method', async ({ page }) => {
  await open(page);
  expect(await store(page, () => Extras.agenda(new Date()).length)).toBe(0);
  await page.click('#obPrayer [data-p="jafari"]');
  await page.click('[data-action="ob-save"]');
  expect(await store(page, () => Extras.agenda(new Date()).length)).toBe(3);
});

test('privacy: pasted bank message is stored masked, old messages get masked, wipe deletes everything', async ({ page }) => {
  await open(page);
  await store(page, () => {
    App.S.upsert('transactions', { id: 'old', kind: 'expense', amount: 2, merchant: 'X', raw: 'card XX9911 BHD 2.000', occurred_at: new Date().toISOString() });
    App.S.upsert('transactions', App.S.smsToTransaction('Your card XX4821 was used for BHD 3.750 at COSTA COFFEE SEEF', new Date().toISOString(), 'new'));
  });
  await expect.poll(() => store(page, () => App.st.transactions.map((t) => t.raw).join(' | '))).toBe('card ••11 BHD 2.000 | Your card ••21 was used for BHD 3.750 at COSTA COFFEE SEEF');
  await page.click('#settingsBtn');
  await expect(page.locator('#sheetBody a[href="privacy.html"]')).toBeVisible();
  await page.click('#sheetBody [data-set="wipe"]');
  await page.waitForTimeout(400);
  await page.fill('#wipeWord', 'غلط');
  await page.click('#sheetSave');
  expect(await store(page, () => App.st.transactions.length)).toBe(2);
  await page.fill('#wipeWord', 'احذف');
  await page.click('#sheetSave');
  await page.waitForFunction(() => window.App && App.st.transactions.length === 0 && !localStorage.getItem('hayati-v1'), null, { timeout: 5000 }).catch(() => {});
  await page.waitForLoadState();
  await page.waitForFunction(() => window.App && App.st);
  expect(await store(page, () => [App.st.transactions.length, App.st.tasks.length])).toEqual([0, 0]);
});

test('privacy policy page loads', async ({ page }) => {
  await page.goto('/privacy.html');
  await expect(page.locator('h1')).toHaveText('سياسة الخصوصية');
  await expect(page.locator('body')).toContainText('30 لسنة 2018');
});

test('settings has «اقترح ميزة» linking to the Instagram DM', async ({ page }) => {
  await open(page);
  await page.click('#settingsBtn');
  await expect(page.locator('#sheetBody a[href="https://ig.me/m/hayati.bh"]')).toContainText('اقترح ميزة');
});

test('English: interface switches to LTR English, data stays exactly as saved', async ({ page }) => {
  await open(page);
  await store(page, () => {
    App.S.upsert('transactions', { id: 'x', kind: 'expense', amount: 5, merchant: 'علي', category: 'قهوة', occurred_at: new Date().toISOString() });
    localStorage.setItem('hayati-lang', 'en');
  });
  await page.reload();
  await page.waitForFunction(() => window.App && App.st);
  expect(await page.evaluate(() => document.documentElement.dir)).toBe('ltr');
  await expect(page.locator('button.tab[data-tab="today"]')).toContainText('Today');
  await store(page, () => App.go('money'));
  await expect(page.locator('#title')).toHaveText('Expenses');
  // البيانات نفسها ما تترجمت
  expect(await store(page, () => [App.st.transactions[0].merchant, App.st.transactions[0].category])).toEqual(['علي', 'قهوة']);
  // نرجع للعربي من الإعدادات
  await page.click('#settingsBtn');
  await page.click('#sheetBody [data-lang="ar"]');
  await page.waitForFunction(() => window.App && document.documentElement.dir === 'rtl');
  await expect(page.locator('button.tab[data-tab="today"]')).toContainText('اليوم');
});

test('«رأيك بالتطبيق» builds an honest feedback message', async ({ page }) => {
  await open(page);
  await page.click('#settingsBtn');
  await page.click('#sheetBody [data-set="feedback"]');
  await page.waitForTimeout(400);
  await page.click('#fbStars [data-n="4"]');
  await page.fill('#fbWant', 'تذكير قبل الاختبار');
  const text = await page.evaluate(() => HayatiFeedback.feedbackText(document.getElementById('sheetBody')));
  expect(text).toContain('★★★★☆');
  expect(text).toContain('أبي: تذكير قبل الاختبار');
});

// جدول محمد الجاهز (seed) يطلع للمالك بس؛ أي عميل ثاني يبني جدوله بنفسه
const fakeClaude = (owner) => {
  const seed = { title: 'جدول المالك', courses: [{ id: 'seed-1', name: 'مادة المالك', type: 'lecture', days: [0], start_time: '08:00', end_time: '09:00' }] };
  const doc = () => ({ set: async () => {}, delete: async () => {}, get: async () => ({ exists: false }) });
  const db = {
    collection: () => ({ onSnapshot(ok) { setTimeout(() => ok({ docs: [], metadata: { fromCache: false } })); return () => {}; }, doc }),
    doc: (p) => ({ get: async () => (p === 'seed/schedule' ? { exists: true, data: () => seed } : { exists: false }) }),
  };
  const user = { id: async () => 'u-' + (owner ? 'owner' : 'guest'), isOwner: async () => owner };
  window.claude = { use: async (n) => ({ db, user })[n] || null };
};
for (const owner of [false, true]) {
  test(`ready-made timetable shows ${owner ? 'to the owner' : 'to nobody else'}`, async ({ page }) => {
    await page.addInitScript(fakeClaude, owner);
    await open(page);
    await page.waitForFunction(() => window.App && App.ui && 'seed' in App.ui);
    await store(page, () => { App.ui.studySeg = 'schedule'; App.go('schedule'); });
    await expect(page.locator('[data-action="import-seed"]')).toHaveCount(owner ? 1 : 0);
    await expect(page.locator('#view')).not.toContainText('مادة المالك');
  });
}

test('a new user builds their own week: role-based buttons and «save and add another» @webkit', async ({ page }) => {
  await open(page);
  await store(page, () => { App.S.setSettings({ name: 'سارة', roles: ['student'], onboarded: true }); App.ui.studySeg = 'schedule'; App.go('schedule'); });
  const card = page.locator('.build-week');
  await expect(card).toContainText('ابنِ جدولك');
  await expect(card.locator('[data-type="lecture"]')).toBeVisible();
  await card.locator('[data-type="lecture"]').click();
  await page.fill('#sheetBody [name=name]', 'رياضيات 101');
  await page.click('#saveNext');
  await expect(page.locator('#sheetBody [name=name]')).toHaveValue('');
  await page.fill('#sheetBody [name=name]', 'محاسبة 201');
  await page.click('#sheetSave');
  const names = await store(page, () => App.st.courses.map((c) => c.name + ':' + c.type).sort());
  expect(names).toEqual(['رياضيات 101:lecture', 'محاسبة 201:lecture']);
  await expect(page.locator('.build-week')).toHaveCount(0);

  // موظف: ما تطلع له «محاضرة»
  await store(page, () => { for (const c of App.st.courses.slice()) App.S.remove('courses', c.id); App.S.setSettings({ roles: ['employee'] }); App.go('schedule'); });
  await expect(page.locator('.build-week [data-type="lecture"]')).toHaveCount(0);
  await expect(page.locator('.build-week')).toContainText('دوام أو نشاط');
});

// نسخة الآيفون: Capacitor مزيّف يسجّل اللي ينطلب منه
test('iPhone (Capacitor): schedules «الحين وقت…» notifications, haptics on save, files go to the share sheet', async ({ page }) => {
  await page.addInitScript(() => {
    const log = window.__cap = { scheduled: [], cancelled: 0, asked: 0, haptics: 0, written: [], shared: [] };
    let perm = 'prompt';
    window.Capacitor = {
      isNativePlatform: () => true,
      Plugins: {
        LocalNotifications: {
          checkPermissions: async () => ({ display: perm }),
          requestPermissions: async () => { log.asked++; perm = 'granted'; return { display: perm }; },
          getPending: async () => ({ notifications: log.scheduled.map((n) => ({ id: n.id })) }),
          cancel: async ({ notifications }) => { log.cancelled += notifications.length; log.scheduled = []; },
          schedule: async ({ notifications }) => { log.scheduled = notifications; },
        },
        Haptics: { impact: async () => { log.haptics++; } },
        Filesystem: { writeFile: async ({ path, data }) => { log.written.push({ path, size: data.length }); return { uri: 'file:///cache/' + path }; } },
        Share: { share: async (o) => { log.shared.push(o); } },
      },
    };
  });
  await open(page);
  // ما فيه شي بالجدول = ما نطلب إذن
  await page.waitForTimeout(1200);
  expect(await store(page, () => window.__cap.asked)).toBe(0);

  await store(page, () => {
    const d = (new Date().getDay() + 1) % 7;
    App.S.upsert('courses', { id: 'n1', name: 'محاسبة إدارية', type: 'lecture', days: [d], start_time: '10:00', end_time: '11:15', room: 'S40-2050' });
  });
  await page.waitForFunction(() => window.__cap.scheduled.some((x) => x.title.includes('محاسبة')), null, { timeout: 5000 });
  const log = await store(page, () => window.__cap);
  expect(log.asked).toBe(1);
  expect(log.haptics).toBeGreaterThan(0);
  const n = log.scheduled.find((x) => x.title.includes('محاسبة'));
  expect(n.title).toBe('بعد 10 دقايق: محاسبة إدارية');
  expect(n.body).toContain('S40-2050');
  // قبل المحاضرة بـ 10 دقايق، بتوقيت الجهاز
  expect(await store(page, () => { const d = window.__cap.scheduled.find((x) => x.title.includes('محاسبة')).schedule.at; return d.getHours() * 60 + d.getMinutes(); })).toBe(9 * 60 + 50);
  expect(log.scheduled.length).toBeLessThanOrEqual(60);

  // تغيير الجدول = إعادة جدولة (بدون تنبيهات مكررة)
  await store(page, () => App.S.remove('courses', 'n1'));
  await page.waitForFunction(() => !window.__cap.scheduled.some((x) => x.title.includes('محاسبة')), null, { timeout: 5000 });
  // الصلاة تنبيهها بوقتها بالضبط
  const pr = (await store(page, () => window.__cap.scheduled)).find((x) => x.title.startsWith('الحين وقت صلاة'));
  if (pr) expect(pr.body).toBe('');

  // النسخة الاحتياطية تروح لقائمة المشاركة
  expect(await store(page, () => App.saveFile('backup.json', '{"a":1}', 'application/json'))).toBe(true);
  const after = await store(page, () => window.__cap);
  expect(after.written[0].path).toBe('backup.json');
  expect(after.shared[0].files).toEqual(['file:///cache/backup.json']);

  // تقرير الشهر: «شارك الملخص» بالآيفون بس
  await store(page, () => App.S.upsert('transactions', { id: 'r1', kind: 'expense', amount: 3.5, merchant: 'Costa Coffee', category: 'قهوة', occurred_at: new Date().toISOString() }));
  await store(page, () => { App.ui.moneySeg = 'tx'; App.go('money'); });
  await page.click('[data-action="report"]');
  await page.click('#shareReport');
  const text = await store(page, () => window.__cap.shared.at(-1).text);
  expect(text).toContain('الصرف: 3.500');
  expect(text).toContain('Costa');
});

// DW-053: تطبيق الصحة بنسخة الآيفون ← النوم والنبض والخطوات بـ«صحتي»
test('iPhone: connects Apple Health and fills «صحتي» from the watch', async ({ page }) => {
  await page.addInitScript(() => {
    const log = window.__hk = { auth: 0, reads: 0 };
    const k = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    window.Capacitor = {
      isNativePlatform: () => true, getPlatform: () => 'ios',
      Plugins: {
        HayatiHealth: {
          authorize: async () => { log.auth++; return { ok: true }; },
          read: async () => { log.reads++; return { days: [{ date: k(1), steps: 9120.6 }, { date: k(0), sleep: 7.26, deep: 0.94, rem: 1.61, core: 4.4, rhr: 55.4, hrv: 47.8, steps: 3201 }] }; },
        },
      },
    };
  });
  await open(page);
  await store(page, () => { App.ui.studySeg = 'health'; App.go('schedule'); });
  await page.click('.cta[data-action="watch-setup"]');
  await page.click('#hkConnect');
  await expect.poll(() => store(page, () => App.st.daily.length)).toBe(2);
  const d = await store(page, () => App.st.daily.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).map((x) => [x.sleep, x.sleep_deep, x.rhr, x.hrv, x.steps, x.watch]));
  expect(d).toEqual([[7.3, 0.9, 55, 48, 3201, true], [null, undefined, undefined, undefined, 9121, true]]);
  await expect(page.locator('#view')).toContainText('الساعة الذكية');
  await expect(page.locator('#view [data-action="health-sync"]')).toHaveCount(1);
  expect(await store(page, () => window.__hk.auth)).toBe(1);
  // ما يرتفع للحساب: النوم والنبض والخطوات من الساعة تظل بالجهاز
  const up = await store(page, () => App.S._stripLocal('daily', App.st.daily.find((x) => x.sleep != null)));
  expect([up.sleep, up.rhr, up.hrv, up.steps, up.sleep_deep, up.date != null]).toEqual([undefined, undefined, undefined, undefined, undefined, true]);
});

// DW-062: «شارك ← حياتي» لملف: كشف الحساب يفتح «استيراد الحساب كامل» معبّى
test('iPhone: a shared statement file opens the import sheet already read', async ({ page }) => {
  const b64 = fs.readFileSync(path.join(__dirname, 'fixtures/statement.xlsx')).toString('base64');
  await page.addInitScript((data) => {
    window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'ios',
      Plugins: { ShareIn: { take: async () => ({ file: 'Statement Oct.xlsx', data }), addListener: () => ({ remove() {} }) } } };
  }, b64);
  await open(page);
  await expect(page.locator('#biOut')).toContainText('لقيت 3 عملية', { timeout: 8000 });
  await expect(page.locator('#biStatus')).toContainText('Statement Oct.xlsx');
});

// نسخة الآيفون كما تنبني فعلاً: www/ (من cap-www.js) + مكتبة Capacitor الحقيقية + جسر iOS مزيّف
// (الاختبار اللي قبله يعطي Plugins جاهزة، وهذا اللي خبّى إن الإضافات ما تتسجل بدون capacitor.js)
test('iPhone build (www/ + real Capacitor core): plugins register through the native bridge and alerts get scheduled @webkit', async ({ page }) => {
  require('child_process').execFileSync('node', [path.join(__dirname, '../scripts/cap-www.js')]);
  await page.addInitScript(() => {
    const calls = window.__bridge = [];
    const m = (...names) => names.map((name) => ({ name, rtype: 'promise' }));
    window.webkit = { messageHandlers: { bridge: { postMessage() {} } } };
    let perm = 'prompt', pending = [];
    window.Capacitor = {
      PluginHeaders: [
        { name: 'LocalNotifications', methods: m('checkPermissions', 'requestPermissions', 'getPending', 'cancel', 'schedule', 'registerActionTypes').concat([{ name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'promise' }]) },
        { name: 'Haptics', methods: m('impact') },
        { name: 'Share', methods: m('share') },
        { name: 'Filesystem', methods: m('writeFile') },
      ],
      nativeCallback: (plugin, method, opts) => { (window.__listeners = window.__listeners || []).push(opts.eventName); return 'cb' + window.__listeners.length; },
      nativePromise: async (plugin, method, opts) => {
        calls.push({ plugin, method, opts });
        if (method === 'checkPermissions') return { display: perm };
        if (method === 'requestPermissions') { perm = 'granted'; return { display: perm }; }
        if (method === 'getPending') return { notifications: pending };
        if (method === 'schedule') { pending = opts.notifications.map((n) => ({ id: n.id })); return {}; }
        if (method === 'writeFile') return { uri: 'file:///cache/' + opts.path };
        return {};
      },
    };
  });
  await open(page, '/www/index.html');
  expect(await store(page, () => window.Capacitor.getPlatform())).toBe('ios');
  await store(page, () => {
    const d = (new Date().getDay() + 1) % 7;
    App.S.upsert('courses', { id: 'w1', name: 'تسويق دولي', type: 'lecture', days: [d], start_time: '13:00', end_time: '14:15', room: 'S20-1043' });
  });
  await page.waitForFunction(() => window.__bridge.some((c) => c.method === 'schedule'), null, { timeout: 5000 });
  const calls = await store(page, () => window.__bridge.map((c) => c.plugin + '.' + c.method));
  expect(calls).toContain('LocalNotifications.requestPermissions');
  expect(calls).toContain('Haptics.impact');
  const lecture = await store(page, () => {
    const s = window.__bridge.filter((c) => c.method === 'schedule').at(-1).opts.notifications.find((n) => n.title.includes('تسويق'));
    return { title: s.title, isDate: s.schedule.at instanceof Date, min: s.schedule.at.getHours() * 60 + s.schedule.at.getMinutes() };
  });
  // iOS يقرا «at» كـ Date (NSDate)، مو نص
  expect(lecture).toEqual({ title: 'بعد 10 دقايق: تسويق دولي', isDate: true, min: 12 * 60 + 50 });
});

// زر «حفظ» بورقة الجدول: لو فيه نقص، الرسالة تبين فوق الورقة (قبل كانت تطلع وراها فيبين إن الزر ما يشتغل)
test('course sheet: a missing name shows the message on top of the sheet, then saving works @webkit', async ({ page }) => {
  await open(page);
  await store(page, () => { App.ui.studySeg = 'schedule'; App.go('schedule'); });
  await page.click('#addBtn');
  await page.fill('#sheetBody [name=name]', '');
  await page.click('#sheetSave');
  const t = page.locator('dialog#sheet[open] .toast');
  await expect(t).toBeVisible();
  await expect(t).toHaveText('اكتب الاسم');
  await page.fill('#sheetBody [name=name]', 'رياضيات');
  await page.click('#sheetSave');
  await expect(page.locator('dialog#sheet')).not.toHaveAttribute('open', '');
  expect(await store(page, () => App.st.courses.map((c) => c.name))).toEqual(['رياضيات']);
  // بعد ما تتسكر الورقة، الرسالة ترجع للصفحة وتبين
  await expect(page.locator('body > .toast')).toHaveText(/انضاف للجدول/);
});

test('iPhone build: sheets do not pop the keyboard by themselves @webkit', async ({ page }) => {
  await page.addInitScript(() => { window.HayatiNative = { saveFile: async () => true }; });
  await open(page);
  await store(page, () => { App.ui.studySeg = 'schedule'; App.go('schedule'); });
  await page.click('#addBtn');
  await page.waitForTimeout(500);
  expect(await store(page, () => document.activeElement && document.activeElement.name)).not.toBe('name');
});

// ⚙️ «جرّب التنبيه» بنسخة الآيفون: يطلب الإذن ويجدول تنبيه بعد 10 ثواني ويعرض النتيجة خطوة خطوة
test('iPhone build: «جرّب التنبيه» asks permission, schedules a test alert in 10s and reports each step @webkit', async ({ page }) => {
  require('child_process').execFileSync('node', [path.join(__dirname, '../scripts/cap-www.js')]);
  await page.addInitScript(() => {
    const calls = window.__bridge = [];
    const m = (...names) => names.map((name) => ({ name, rtype: 'promise' }));
    window.webkit = { messageHandlers: { bridge: { postMessage() {} } } };
    let perm = 'prompt', pending = [];
    window.Capacitor = {
      PluginHeaders: [{ name: 'LocalNotifications', methods: m('checkPermissions', 'requestPermissions', 'getPending', 'cancel', 'schedule', 'registerActionTypes').concat([{ name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'promise' }]) }],
      nativeCallback: (plugin, method, opts) => { (window.__listeners = window.__listeners || []).push(opts.eventName); return 'cb' + window.__listeners.length; },
      nativePromise: async (plugin, method, opts) => {
        calls.push({ method, opts });
        if (method === 'checkPermissions') return { display: perm };
        if (method === 'requestPermissions') { perm = 'granted'; return { display: perm }; }
        if (method === 'getPending') return { notifications: pending };
        if (method === 'cancel') { const ids = opts.notifications.map((n) => n.id); pending = pending.filter((n) => !ids.includes(n.id)); return {}; }
        if (method === 'schedule') { pending = pending.concat(opts.notifications.map((n) => ({ id: n.id }))); return {}; }
        return {};
      },
    };
  });
  await open(page, '/www/index.html');
  await page.click('#settingsBtn');
  await page.click('[data-set="test-notif"]');
  const sheet = page.locator('.notif-test');
  await expect(sheet).toContainText('✅ الإذن: granted');
  await expect(sheet).toContainText('بعد 10 ثواني');
  const test = await store(page, () => {
    const n = window.__bridge.filter((c) => c.method === 'schedule').flatMap((c) => c.opts.notifications).find((x) => x.id === 990001);
    return { title: n.title, inSec: Math.round((n.schedule.at - Date.now()) / 1000) };
  });
  expect(test.title).toBe('🔔 تجربة من «حياتي»');
  expect(test.inSec).toBeGreaterThan(3);
  expect(test.inSec).toBeLessThanOrEqual(10);
  // إعادة جدولة الجدول (إضافة محاضرة) ما تلغي تنبيه التجربة
  await store(page, () => App.S.upsert('courses', { id: 'tn1', name: 'مادة', type: 'lecture', days: [(new Date().getDay() + 1) % 7], start_time: '09:00', end_time: '10:00' }));
  await page.waitForFunction(() => window.__bridge.some((c) => c.method === 'schedule' && c.opts.notifications.some((n) => n.title.includes('مادة'))), null, { timeout: 5000 });
  expect(await store(page, () => window.__bridge.filter((c) => c.method === 'cancel').flatMap((c) => c.opts.notifications.map((n) => n.id)))).not.toContain(990001);
  // أزرار التنبيه تتسجل عبر الجسر الحقيقي، والمستمع مرة وحدة
  expect(await store(page, () => window.__bridge.some((c) => c.method === 'registerActionTypes' && c.opts.types[0].actions.length === 2))).toBe(true);
  expect(await store(page, () => window.__listeners.filter((e) => e === 'localNotificationActionPerformed').length)).toBe(1);
});

// تذكيرات ذكية (جلسة الديوانية 25): بكرة اختبار/تسليم/تجديد 8 الليل، قبل الاختبار بساعتين، ملخص صباح اختياري، ومفتاح لكل نوع
test('iPhone: smart reminders for exams, homework and renewals, morning brief opt-in, a switch per type @webkit', async ({ page }) => {
  await page.addInitScript(() => {
    const log = window.__cap = { scheduled: [] };
    window.Capacitor = {
      isNativePlatform: () => true,
      Plugins: {
        LocalNotifications: {
          checkPermissions: async () => ({ display: 'granted' }),
          requestPermissions: async () => ({ display: 'granted' }),
          getPending: async () => ({ notifications: log.scheduled.map((n) => ({ id: n.id })) }),
          cancel: async () => { log.scheduled = []; },
          schedule: async ({ notifications }) => { log.scheduled = notifications; },
        },
      },
    };
  });
  await open(page);
  const r = await store(page, () => {
    const now = new Date(); now.setHours(12, 0, 0, 0);
    const day = (n, h, m) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + n, h || 0, m || 0);
    App.st.tasks = [
      { id: 'e1', kind: 'exam', title: 'محاسبة', due_at: day(3, 12).toISOString() },
      { id: 'e2', kind: 'exam', title: 'إحصاء', due_at: day(4, 8).toISOString() },
      { id: 'h1', kind: 'homework', title: 'تقرير', due_at: day(2, 23, 59).toISOString() },
      { id: 'h2', kind: 'homework', title: 'خلصته', due_at: day(2, 23).toISOString(), done: true },
    ];
    const ren = day(5, 9);
    App.st.subscriptions = [
      { id: 's1', name: 'Netflix', amount: 3.5, cycle: 'monthly', day: ren.getDate(), remind_days: 1, active: true },
      { id: 's2', name: 'موقوف', amount: 1, cycle: 'monthly', day: ren.getDate(), remind_days: 1, active: false },
    ];
    const hm = (d) => d.toDateString() + ' ' + d.getHours() + ':' + d.getMinutes();
    const pick = (list) => list.filter((x) => !/دقايق|الحين/.test(x.title)).map((x) => ({ t: x.title, b: x.body, at: hm(x.schedule.at) }));
    const all = pick(HayatiNative.upcoming(now, { lectures: true, exams: true, homework: true, subs: true, brief: false }));
    const off = pick(HayatiNative.upcoming(now, { lectures: true, exams: false, homework: true, subs: false, brief: false }));
    App.S.upsert('courses', { id: 'c1', name: 'تسويق', type: 'lecture', days: [day(3).getDay()], start_time: '10:00', end_time: '11:00' });
    const brief = pick(HayatiNative.upcoming(now, { lectures: false, exams: true, homework: true, subs: true, brief: true, briefAt: '07:00' })).filter((x) => x.t.startsWith('صباح'));
    return { all, off, brief, exp: { eve: hm(day(2, 20)), two: hm(day(3, 10)), early: hm(day(4, 7, 30)), hw: hm(day(1, 20)), sub: hm(day(4, 20)), b3: hm(day(3, 7)) } };
  });
  const find = (list, t) => list.find((x) => x.t === t);
  expect(find(r.all, 'بكرة اختبار: محاسبة').at).toBe(r.exp.eve);
  expect(find(r.all, 'بعد ساعتين: اختبار محاسبة').at).toBe(r.exp.two);
  expect(find(r.all, 'اليوم: اختبار إحصاء').at).toBe(r.exp.early);           // اختبار 8 الصبح ← تذكير 7:30
  expect(find(r.all, 'بكرة تسليم: تقرير').at).toBe(r.exp.hw);
  expect(r.all.some((x) => x.t.includes('خلصته'))).toBe(false);              // المنجز ما ينبّه
  const sub = find(r.all, 'بكرة يتجدد: Netflix');
  expect(sub.at).toBe(r.exp.sub);
  expect(sub.b).toBe('3.500 د.ب');
  expect(r.all.some((x) => x.t.includes('موقوف'))).toBe(false);
  // المفاتيح: الاختبارات والاشتراكات مسكّرة
  expect(r.off.some((x) => x.t.includes('اختبار') || x.t.includes('يتجدد'))).toBe(false);
  expect(r.off.some((x) => x.t === 'بكرة تسليم: تقرير')).toBe(true);
  // ملخص الصباح: بس الأيام اللي فيها شي
  const b3 = r.brief.find((x) => x.at === r.exp.b3);
  expect(b3.b).toContain('أولها 10:00');
  expect(b3.b).toContain('اختبار محاسبة');
  expect(r.brief.every((x) => x.b.length > 0)).toBe(true);

  // شاشة الإعدادات: نسكّر الاختبارات ونحفظ ← تنحفظ وتنعاد الجدولة
  await page.click('#settingsBtn');
  await page.click('[data-set="notif-prefs"]');
  await expect(page.locator('[data-np="brief"]')).not.toBeChecked();
  await expect(page.locator('#briefAtF')).toBeHidden();
  await page.locator('[data-np="brief"]').check();
  await expect(page.locator('#briefAtF')).toBeVisible();
  await page.locator('[data-np="exams"]').uncheck();
  await page.click('#sheetSave');
  await expect(page.locator('.toast')).toContainText('انحفظ');
  const saved = await store(page, () => JSON.parse(localStorage.getItem('hayati-notif-prefs')));
  expect(saved.exams).toBe(false);
  expect(saved.brief).toBe(true);
  expect(saved.briefAt).toBe('07:00');
});

// أزرار التنبيه (جلسة الديوانية «أزرار التنبيه»): الضغطة تفتح الشي، «✓ خلصته» و«⏰ بعد ساعة» على الواجب والاختبار
test('iPhone: tapping a reminder opens it, «خلصته» marks it done and clears its alerts, «بعد ساعة» survives rescheduling @webkit', async ({ page }) => {
  await page.addInitScript(() => {
    const log = window.__cap = { scheduled: [], types: null, handler: null };
    window.Capacitor = {
      isNativePlatform: () => true,
      Plugins: {
        LocalNotifications: {
          checkPermissions: async () => ({ display: 'granted' }),
          requestPermissions: async () => ({ display: 'granted' }),
          getPending: async () => ({ notifications: log.scheduled.map((n) => ({ id: n.id })) }),
          cancel: async () => { log.scheduled = []; },
          schedule: async ({ notifications }) => { log.scheduled = notifications; },
          registerActionTypes: async (o) => { log.types = o.types; },
          addListener: (ev, fn) => { if (ev === 'localNotificationActionPerformed') { if (log.handler) log.dup = true; log.handler = fn; } return Promise.resolve({ remove() {} }); },
        },
      },
    };
  });
  await open(page);
  const types = await store(page, () => window.__cap.types);
  expect(types[0].actions.map((a) => a.id)).toEqual(['done', 'snooze']);
  expect(types[0].actions.every((a) => a.foreground)).toBe(true);
  expect(await store(page, () => !!window.__cap.dup)).toBe(false);

  await store(page, () => {
    const d = new Date(); d.setDate(d.getDate() + 2); d.setHours(23, 59, 0, 0);
    App.S.upsert('tasks', { id: 'hw1', kind: 'homework', title: 'تقرير التسويق', due_at: d.toISOString(), done: false });
  });
  await page.waitForFunction(() => window.__cap.scheduled.some((n) => n.title === 'بكرة تسليم: تقرير التسويق'), null, { timeout: 5000 });
  const n = await store(page, () => window.__cap.scheduled.find((x) => x.title === 'بكرة تسليم: تقرير التسويق'));
  expect(n.actionTypeId).toBe(types[0].id);
  expect(n.extra).toEqual({ kind: 'task', id: 'hw1', act: true });

  // ⏰ بعد ساعة: تنبيه جديد بعد ساعة، ويظل بعد إعادة الجدولة
  await store(page, (n) => window.__cap.handler({ actionId: 'snooze', notification: n }), n);
  await expect(page.locator('.toast')).toContainText('بعد ساعة');
  await page.waitForFunction(() => window.__cap.scheduled.filter((x) => x.title === 'بكرة تسليم: تقرير التسويق').length === 2, null, { timeout: 5000 });
  const inMin = await store(page, () => { const z = window.__cap.scheduled.filter((x) => x.title === 'بكرة تسليم: تقرير التسويق').map((x) => x.schedule.at - Date.now()).sort((a, b) => a - b)[0]; return Math.round(z / 60000); });
  expect(inMin).toBeGreaterThanOrEqual(58);
  expect(inMin).toBeLessThanOrEqual(60);
  await store(page, () => App.S.upsert('courses', { id: 'cx', name: 'مادة', type: 'lecture', days: [(new Date().getDay() + 1) % 7], start_time: '09:00', end_time: '10:00' }));
  await page.waitForFunction(() => window.__cap.scheduled.some((x) => x.title.includes('مادة')), null, { timeout: 5000 });
  expect(await store(page, () => window.__cap.scheduled.filter((x) => x.title === 'بكرة تسليم: تقرير التسويق').length)).toBe(2);

  // ✓ خلصته: المهمة منجزة، وكل تنبيهاتها (والتأجيل) تختفي
  await store(page, (n) => window.__cap.handler({ actionId: 'done', notification: n }), n);
  await expect(page.locator('.toast')).toContainText('خلصت «تقرير التسويق»');
  expect(await store(page, () => App.st.tasks.find((t) => t.id === 'hw1').done)).toBe(true);
  await page.waitForFunction(() => !window.__cap.scheduled.some((x) => x.title.includes('تقرير التسويق')), null, { timeout: 5000 });

  // الضغطة: الاشتراك يفتح «اشتراكات»، والمهمة المحذوفة ما تكسر
  await store(page, () => window.__cap.handler({ actionId: 'tap', notification: { title: 'بكرة يتجدد: الجيم', extra: { kind: 'sub', id: 's1' } } }));
  expect(await store(page, () => [App.ui.tab, App.ui.moneySeg])).toEqual(['money', 'subs']);
  await store(page, () => window.__cap.handler({ actionId: 'tap', notification: { title: 'x', extra: { kind: 'task', id: 'gone' } } }));
  await expect(page.locator('.toast')).toContainText('ما لقيت المهمة');
  expect(await store(page, () => App.ui.tab)).toBe('tasks');
  // الضغطة على مهمة موجودة تفتح ورقتها
  await store(page, () => window.__cap.handler({ actionId: 'tap', notification: { title: 'x', extra: { kind: 'task', id: 'hw1' } } }));
  await expect(page.locator('#sheet')).toBeVisible();
});

// سؤال الحضور من التنبيه (جلسة الديوانية «الحضور من التنبيه»)
test('iPhone: «حضرت X؟» after each lecture, answered from the alert on the right day, gone once answered in the app @webkit', async ({ page }) => {
  await page.addInitScript(() => {
    const log = window.__cap = { scheduled: [], types: null, handler: null };
    window.Capacitor = {
      isNativePlatform: () => true,
      Plugins: {
        LocalNotifications: {
          checkPermissions: async () => ({ display: 'granted' }),
          requestPermissions: async () => ({ display: 'granted' }),
          getPending: async () => ({ notifications: log.scheduled.map((n) => ({ id: n.id })) }),
          cancel: async () => { log.scheduled = []; },
          schedule: async ({ notifications }) => { log.scheduled = notifications; },
          registerActionTypes: async (o) => { log.types = o.types; },
          addListener: (ev, fn) => { log.handler = fn; return Promise.resolve({ remove() {} }); },
        },
      },
    };
  });
  await open(page);
  const t = await store(page, () => window.__cap.types.find((x) => x.actions.some((a) => a.id === 'present')));
  expect(t.actions.map((a) => a.title)).toEqual(['✓ حضرت', '✗ غبت']);

  // محاضرة بكرة 10:00–11:15، وتمرين بكرة (التمرين ما له سؤال حضور)
  const k = await store(page, () => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    App.S.upsert('courses', { id: 'at1', name: 'محاسبة إدارية', type: 'lecture', days: [d.getDay()], start_time: '10:00', end_time: '11:15', room: 'S40-2050', absence_limit: 3, absences: ['2026-01-01'] });
    App.S.upsert('courses', { id: 'gy1', name: 'جيم', type: 'gym', days: [d.getDay()], start_time: '18:00', end_time: '19:00' });
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  });
  await page.waitForFunction(() => window.__cap.scheduled.some((n) => n.title === 'حضرت محاسبة إدارية؟'), null, { timeout: 5000 });
  const n = await store(page, () => { const x = window.__cap.scheduled.find((n) => n.title === 'حضرت محاسبة إدارية؟'); return { ...x, mins: x.schedule.at.getHours() * 60 + x.schedule.at.getMinutes() }; });
  expect(n.mins).toBe(11 * 60 + 20);                 // بعد ما تخلص بـ 5 دقايق
  expect(n.body).toContain('S40-2050');
  expect(n.actionTypeId).toBe(t.id);
  expect(n.extra).toEqual({ kind: 'attend', id: 'at1', day: k, act: 'attend' });
  expect(await store(page, () => window.__cap.scheduled.some((x) => x.title === 'حضرت جيم؟'))).toBe(false);

  // «✗ غبت»: ينسجل على يوم المحاضرة نفسه (مو اليوم)، ويطلع تحذير حد الغياب، والتنبيه ينشال
  await store(page, (n) => window.__cap.handler({ actionId: 'absent', notification: n }), n);
  await expect(page.locator('.toast')).toContainText('باقي لك 1 غيابات بس');
  expect(await store(page, () => App.st.courses.find((c) => c.id === 'at1').absences)).toEqual(['2026-01-01', k]);
  await page.waitForFunction(() => !window.__cap.scheduled.some((x) => x.title === 'حضرت محاسبة إدارية؟'), null, { timeout: 5000 });

  // جاوب داخل التطبيق (حضرت) قبل التنبيه ← ما يرن
  await store(page, () => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    App.S.upsert('courses', { id: 'at2', name: 'تسويق', type: 'lecture', days: [d.getDay()], start_time: '12:00', end_time: '13:00' });
  });
  await page.waitForFunction(() => window.__cap.scheduled.some((x) => x.title === 'حضرت تسويق؟'), null, { timeout: 5000 });
  await store(page, (k) => { const c = App.st.courses.find((x) => x.id === 'at2'); App.S.upsert('courses', Object.assign({}, c, { attended: [k] })); }, k);
  await page.waitForFunction(() => !window.__cap.scheduled.some((x) => x.title === 'حضرت تسويق؟'), null, { timeout: 5000 });

  // «✓ حضرت» على مادة انحذفت ← رسالة بدال الكسر
  await store(page, () => window.__cap.handler({ actionId: 'present', notification: { extra: { kind: 'attend', id: 'gone', day: '2026-10-13' } } }));
  await expect(page.locator('.toast')).toContainText('ما لقيت المادة');

  // المفتاح يطفيه
  const off = await store(page, () => HayatiNative.upcoming(new Date(), Object.assign(HayatiNative.prefs(), { attend: false })).some((x) => x.title.startsWith('حضرت')));
  expect(off).toBe(false);
});

// جلسة الديوانية مع المحامي: شروط الاستخدام + تصدير المصاريف CSV
test('terms of use page loads and is linked from settings, welcome card and the privacy policy', async ({ page }) => {
  await page.goto('/terms.html');
  await expect(page.locator('h1')).toHaveText('شروط الاستخدام');
  await expect(page.locator('body')).toContainText('مو نصيحة مالية ولا طبية');
  await expect(page.locator('body')).toContainText('Governed by the laws of the Kingdom of Bahrain');
  await page.goto('/privacy.html');
  await expect(page.locator('a[href="terms.html"]').first()).toBeVisible();
  await expect(page.locator('body')).toContainText('تنجدول على جوالك نفسه');
  await expect(page.locator('body')).toContainText('تحت 13 سنة');
  await open(page);
  await page.click('#settingsBtn');
  await expect(page.locator('#sheetBody a[href="terms.html"]')).toBeVisible();
});

test('first-run welcome card mentions the terms with a link', async ({ page }) => {
  await page.addInitScript(() => { localStorage.clear(); localStorage.setItem('hayati-account-step', 'skip'); });
  await page.goto('/');
  await expect(page.locator('#obCard .ob-terms a[href="terms.html"]')).toBeVisible();
});

test('شاشة الدخول أول مرة (DW-050): optional sign-in first, «تخطَّ الحين» goes to the welcome card for good, existing users never see it', async ({ page }) => {
  await open(page);
  await expect(page.locator('#obGate')).toBeVisible();
  await expect(page.locator('#obCard')).toHaveCount(0);
  // «سجّل دخول» يفتح صفحة «حسابك» مباشرة
  await page.click('[data-action="ob-gate-account"]');
  await expect(page.locator('#sheetBody .account-page')).toBeVisible();
  await expect(page.locator('#sheetBody [data-set="signin"]')).toBeVisible();
  await store(page, () => App.closeSheet());
  // تخطَّ ← بطاقة التعارف، وما ترجع بعد إعادة الفتح
  await page.click('[data-action="ob-gate-skip"]');
  await expect(page.locator('#obGate')).toHaveCount(0);
  await expect(page.locator('#obCard')).toBeVisible();
  await page.reload(); await page.waitForFunction(() => window.App && window.App.st);
  await expect(page.locator('#obGate')).toHaveCount(0);
  // مستخدم قديم عنده بيانات: ما تطلع له أبداً
  await page.evaluate(() => localStorage.removeItem('hayati-account-step'));
  await store(page, () => { App.S.upsert('tasks', { id: 'x', title: 'قديم', kind: 'homework' }); App.render(); });
  await expect(page.locator('#obGate')).toHaveCount(0);
});

test('«صدّر مصاريفك»: Excel-ready CSV with BOM, numbers as numbers, no bank text, formulas neutralised', async ({ page }) => {
  await open(page);
  expect(await store(page, () => App.expensesCSV())).toBe('');
  await store(page, () => {
    App.S.upsert('transactions', { id: 'c1', kind: 'expense', amount: 3.5, merchant: 'Costa Coffee', category: 'قهوة', note: 'مع "الربع"، سطر\nثاني', raw: 'سري XX4821', occurred_at: new Date(2026, 9, 11, 8, 5).toISOString() });
    App.S.upsert('transactions', { id: 'c2', kind: 'income', amount: 250, merchant: '=HYPERLINK("http://x")', category: 'راتب', occurred_at: new Date(2026, 9, 1, 9, 0).toISOString() });
  });
  const csv = await store(page, () => App.expensesCSV());
  expect(csv.charCodeAt(0)).toBe(0xFEFF);
  const lines = csv.slice(1).split('\r\n');
  expect(lines[0]).toBe('"التاريخ","الوقت","النوع","المبلغ (د.ب)","المحل","الفئة","ملاحظة"');
  expect(lines[1]).toBe('"2026-10-01","09:00","دخل",250.000,"\'=HYPERLINK(""http://x"")","راتب",""');   // الأقدم أول، والصيغة ما تشتغل
  expect(lines[2].startsWith('"2026-10-11","08:05","صرف",3.500,"Costa Coffee","قهوة","مع ""الربع""، سطر')).toBe(true);
  expect(csv).not.toContain('XX4821');
  expect(csv).not.toContain('سري');
  // الزر بالإعدادات يرسل الملف
  await store(page, () => { window.__saved = null; });
  await page.evaluate(() => { window.HayatiNative = { saveFile: async (name, text, mime) => { window.__saved = { name, mime, len: text.length }; return true; } }; });
  await page.click('#settingsBtn');
  await page.click('[data-set="export-csv"]');
  await page.waitForFunction(() => window.__saved, null, { timeout: 3000 });
  const saved = await store(page, () => window.__saved);
  expect(saved.name).toMatch(/^hayati-expenses-\d{4}-\d{2}-\d{2}\.csv$/);
  expect(saved.mime).toBe('text/csv');
});

// اجتماع الفحص الشامل: الإنجليزي ما يخرّب بيانات المستخدم ويترجم الوحدات، تذكير النسخة الاحتياطية، رقم الإصدار
test('English: user data stays untouched (no «Exam المحاسبة»), units read «in 3 days» and «49 min»', async ({ page }) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem('i')) { localStorage.setItem('hayati-lang', 'en'); sessionStorage.setItem('i', '1'); } });
  await open(page);
  await store(page, () => {
    const d = (o, h) => { const x = new Date(); x.setDate(x.getDate() + o); x.setHours(h, 0, 0, 0); return x.toISOString(); };
    App.S.upsert('tasks', { id: 'e1', kind: 'exam', title: 'اختبار المحاسبة', due_at: d(3, 9), done: false });
    App.S.upsert('tasks', { id: 'a1', kind: 'appointment', title: 'موعد الطبيب', due_at: d(0, 23), done: false });
    App.go('tasks');
  });
  const text = await page.locator('#view').innerText();
  expect(text).toContain('اختبار المحاسبة');
  expect(text).not.toContain('Exam المحاسبة');
  expect(text).not.toContain('Appointment الطبيب');
  expect(text).not.toMatch(/\d\s*(أيام|دقيقة)/);
  expect(await store(page, () => window.HayatiLang.tr('بعد 3 أيام · 49 دقيقة · 1.5 س · 30 د · 3 مرات · قبل 34 أيام'))).toBe('in 3 days · 49 min · 1.5 h · 30 min · 3 times · 34 days ago');
  expect(await store(page, () => window.HayatiLang.tr('صباح الخير يا محمد'))).toBe('Good morning, محمد');
  expect(await store(page, () => window.HayatiLang.tr('حضرت محاسبة إدارية؟'))).toBe('Did you attend محاسبة إدارية?');
  expect(await store(page, () => window.HayatiLang.tr('بعد ساعتين و51 دقيقة'))).not.toMatch(/[\u0600-\u06FF]/);
});

test('backup reminder: shows after 30 days with 10+ records, «بعدين» hides it for a week, backing up clears it; version matches sw.js', async ({ page }) => {
  await open(page);
  const seed = (n, daysAgo) => store(page, ([n, daysAgo]) => {
    const t = new Date(Date.now() - daysAgo * 864e5).toISOString();
    for (let i = 0; i < n; i++) App.S.upsert('transactions', { id: 'b' + i, kind: 'expense', amount: 1, merchant: 'x', category: 'قهوة', occurred_at: t });
    // updated_at يصير الحين مع upsert، فنرجّعه للماضي مثل بيانات قديمة
    App.st.transactions.forEach((r) => { r.updated_at = t; });
  }, [n, daysAgo]);
  await seed(5, 40);
  expect(await store(page, () => App.backupDue())).toBe(null);                       // أقل من 10 سجلات
  await seed(12, 40);
  expect(await store(page, () => App.backupDue())).toEqual({ days: 40, never: true });
  await store(page, () => App.render());
  await expect(page.locator('.backup-nudge')).toContainText('ما عندك نسخة احتياطية');
  await page.click('[data-action="backup-later"]');
  await expect(page.locator('.backup-nudge')).toHaveCount(0);
  await store(page, () => localStorage.removeItem('hayati-backup-snooze'));
  await store(page, () => App.render());
  await page.evaluate(() => { window.HayatiNative = { saveFile: async () => true }; });
  await page.click('[data-action="backup-now"]');
  await expect(page.locator('.backup-nudge')).toHaveCount(0);
  expect(await store(page, () => App.backupDue())).toBe(null);
  // الإعدادات: «آخر نسخة: اليوم» ورقم الإصدار نفس sw.js
  await page.click('#settingsBtn');
  await expect(page.locator('[data-set="export"]')).toContainText('آخر نسخة: اليوم');
  const sw = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8').match(/hayati-(v\d+)/)[1];
  expect(await store(page, () => App.APP_VERSION)).toBe(sw);
  await expect(page.locator('.app-version')).toContainText('حياتي ' + sw);
});

test('iPhone: a snoozed reminder for a task that was deleted does not ring', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hayati-snoozes', JSON.stringify([{ key: 'snooze:gone:1', at: Date.now() + 3600e3, title: 'بكرة تسليم: محذوفة', body: '', extra: { kind: 'task', id: 'gone', act: true } }]));
    window.Capacitor = { isNativePlatform: () => true, Plugins: {} };
  });
  await open(page);
  expect(await store(page, () => HayatiNative.upcoming(new Date()).some((n) => n.title.includes('محذوفة')))).toBe(false);
});

// هوية «حياتي»: ألوان التطبيق = brand/tokens.css بالضبط، والنص يعدّي WCAG AA (4.5:1)
test('brand: app colours match brand/tokens.css, and text colours pass 4.5:1 contrast', async () => {
  const tokens = fs.readFileSync(path.join(__dirname, '../brand/tokens.css'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const vars = (css) => Object.fromEntries([...css.matchAll(/(--[a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})/g)].map((m) => [m[1], m[2].toUpperCase()]));
  const block = (css, start, end) => css.slice(css.indexOf(start), css.indexOf(end, css.indexOf(start)));
  const tLight = vars(block(tokens, 'ألوان الواجهة — فاتح', 'ألوان الواجهة — غامق') + block(tokens, 'ألوان الهوية', 'ألوان الواجهة — فاتح'));
  const tDark = vars(block(tokens, 'ألوان الواجهة — غامق', '===== الخط'));
  const aLight = vars(html.slice(html.indexOf(':root {'), html.indexOf('@media (prefers-color-scheme: dark)')));
  const aDark = vars(html.slice(html.indexOf(':root[data-theme="dark"]'), html.indexOf('}', html.indexOf(':root[data-theme="dark"]'))));
  for (const [k, v] of Object.entries(tLight)) expect(aLight[k], 'light ' + k).toBe(v);
  for (const [k, v] of Object.entries(tDark)) expect(aDark[k], 'dark ' + k).toBe(v);
  const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  for (const [t, set] of [['light', tLight], ['dark', tDark]]) {
    for (const fg of ['--text', '--text-2', '--muted', '--brand', '--expense', '--income']) {
      for (const bg of ['--bg', '--surface', '--surface-2']) expect(ratio(set[fg], set[bg]), t + ' ' + fg + ' on ' + bg).toBeGreaterThanOrEqual(4.5);
    }
  }
});

// 🔐 الحسابات (جلسة الديوانية «الحسابات»): كل مستخدم بياناته بروحه، والدخول بـ Apple وGoogle
//   Supabase وهمي: «سيرفر» فيه بيانات كل مستخدم لحاله، مثل RLS
// الـ fake لازم يظل: نمنع المكتبة المحلية الحقيقية تكتب فوقه
const useFakeSupabase = async (page) => {
  await page.route('**/vendor/supabase/supabase.min.js', (r) => r.fulfill({ contentType: 'text/javascript', body: '' }));
  await page.addInitScript(fakeSupabase);
};
const fakeSupabase = () => {
  const srv = window.__srv = { data: {}, calls: [], session: null, cb: null };
  const rows = (uid, t) => ((srv.data[uid] = srv.data[uid] || {})[t] = srv.data[uid][t] || []);
  const q = (table) => {
    const uid = () => srv.session && srv.session.user.id;
    const res = (v) => Object.assign(Promise.resolve(v), b);
    const b = {
      select: () => res({ data: table === 'settings' ? null : rows(uid(), table).slice(), error: null }),
      eq: () => res({ data: [], error: null }), order: () => res({ data: [], error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      upsert: (r) => { srv.calls.push(['upsert', uid(), table, r]); if (table !== 'settings') { const l = rows(uid(), table); const i = l.findIndex((x) => x.id === r.id); if (i >= 0) l[i] = r; else l.push(r); } return Promise.resolve({ error: null }); },
      delete: () => ({ eq: (k, id) => { const l = rows(uid(), table); const i = l.findIndex((x) => x.id === id); if (i >= 0) l.splice(i, 1); return Promise.resolve({ error: null }); } }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    };
    return b;
  };
  const user = (id, email, provider) => ({ access_token: 't', user: { id, email, app_metadata: { provider } } });
  window.__signInAs = (id, email, provider) => { srv.session = id ? user(id, email, provider || 'email') : null; srv.cb && srv.cb(id ? 'SIGNED_IN' : 'SIGNED_OUT', srv.session); };
  window.supabase = {
    createClient: () => ({
      auth: {
        getSession: async () => ({ data: { session: srv.session } }),
        onAuthStateChange: (cb) => { srv.cb = cb; return { data: { subscription: { unsubscribe() {} } } }; },
        signInWithPassword: async ({ email }) => { window.__signInAs('u-' + email.split('@')[0], email); return { error: null }; },
        signUp: async ({ email }) => { window.__signInAs('u-' + email.split('@')[0], email); return { data: { session: srv.session }, error: null }; },
        signOut: async () => { srv.calls.push(['signOut']); window.__signInAs(null); return { error: null }; },
        signInWithOAuth: async (o) => { srv.calls.push(['oauth', o.provider, o.options]); return { data: { url: 'https://auth.example/' + o.provider }, error: null }; },
        exchangeCodeForSession: async (code) => { srv.calls.push(['exchange', code]); window.__signInAs('u-apple', 'a@privaterelay.appleid.com', 'apple'); return { error: null }; },
        resetPasswordForEmail: async (email, o) => { srv.calls.push(['reset', email, o.redirectTo]); return { error: null }; },
        updateUser: async () => ({ error: null }),
      },
      from: q, rpc: async () => ({ error: null }),
      channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel() {},
    }),
  };
  localStorage.setItem('hayati-supabase', JSON.stringify({ url: 'https://x.supabase.co', key: 'k'.repeat(40) }));
};
const txs = (page) => store(page, () => App.st.transactions.map((t) => t.merchant).sort());

test('accounts: guest data is offered to the first account, sign-out wipes the device, a second user never sees the first one\'s data', async ({ page }) => {
  await useFakeSupabase(page);
  await open(page);
  // بدون حساب: التطبيق يشتغل عادي
  await store(page, () => App.S.upsert('transactions', { id: 'g1', kind: 'expense', amount: 1, merchant: 'Guest Cafe', category: 'قهوة', occurred_at: new Date().toISOString() }));
  // أول دخول وعلى الجهاز بيانات: يسأل، وما يرفع شي قبل الجواب
  await store(page, () => window.__signInAs('u-mo', 'mo@x.bh'));
  await expect(page.locator('#mgKeep')).toBeVisible();
  expect(await store(page, () => window.__srv.calls.filter((c) => c[0] === 'upsert').length)).toBe(0);
  await page.click('#mgKeep');
  await page.waitForFunction(() => (window.__srv.data['u-mo'] || {}).transactions?.some((r) => r.data.merchant === 'Guest Cafe'));
  expect(await store(page, () => App.st.owner)).toBe('u-mo');
  await store(page, () => App.S.upsert('transactions', { id: 'm1', kind: 'expense', amount: 2, merchant: 'Mo Only', category: 'قهوة', occurred_at: new Date().toISOString() }));
  await page.waitForFunction(() => window.__srv.data['u-mo'].transactions.some((r) => r.data.merchant === 'Mo Only'));

  // الخروج: الجهاز يفضى
  await store(page, () => App.S.signOut());
  expect(await txs(page)).toEqual([]);
  expect(await store(page, () => App.st.owner)).toBe(null);

  // مستخدم ثاني على نفس الجهاز: ما يشوف شي من الأول، وتعديلاته تروح لحسابه هو
  await store(page, () => { window.__srv.data['u-sara'] = { transactions: [{ id: 's1', data: { id: 's1', kind: 'expense', amount: 5, merchant: 'Sara Shop', category: 'بقالة', occurred_at: new Date().toISOString() } }] }; window.__signInAs('u-sara', 'sara@x.bh'); });
  await page.waitForFunction(() => App.st.transactions.length === 1);
  expect(await store(page, () => App.S.status.needsMerge)).toBe(0);           // الجهاز فاضي = ما فيه سؤال
  await expect(page.locator('#mgKeep')).toBeHidden();
  expect(await txs(page)).toEqual(['Sara Shop']);
  await store(page, () => App.S.upsert('transactions', { id: 's2', kind: 'expense', amount: 1, merchant: 'Sara Two', category: 'قهوة', occurred_at: new Date().toISOString() }));
  await page.waitForFunction(() => window.__srv.data['u-sara'].transactions.length === 2);
  expect(await store(page, () => window.__srv.data['u-mo'].transactions.map((r) => r.data.merchant).sort())).toEqual(['Guest Cafe', 'Mo Only']);

  // تبديل حساب مباشر (بدون خروج): بيانات سارة تنمسح، وتجي بيانات محمد
  await store(page, () => window.__signInAs('u-mo', 'mo@x.bh'));
  await page.waitForFunction(() => App.st.transactions.length === 2);
  expect(await txs(page)).toEqual(['Guest Cafe', 'Mo Only']);
});

test('accounts: «لا، ابدأ من حسابي» drops guest data; sign-out with unsynced edits warns first', async ({ page, context }) => {
  await useFakeSupabase(page);
  await open(page);
  await store(page, () => App.S.upsert('transactions', { id: 'g1', kind: 'expense', amount: 1, merchant: 'Not Mine', category: 'قهوة', occurred_at: new Date().toISOString() }));
  await store(page, () => window.__signInAs('u-mo', 'mo@x.bh'));
  await page.click('#mgDrop');
  await page.click('#askDlg [data-ok]');
  await page.waitForFunction(() => App.st.owner === 'u-mo');
  expect(await txs(page)).toEqual([]);
  expect(await store(page, () => (window.__srv.data['u-mo'] || {}).transactions || [])).toEqual([]);
  // بدون نت: الخروج يرفض لين يتأكد
  await context.setOffline(true);
  await store(page, () => App.S.upsert('transactions', { id: 'o1', kind: 'expense', amount: 1, merchant: 'Offline', category: 'قهوة', occurred_at: new Date().toISOString() }));
  const err = await store(page, () => App.S.signOut().then(() => null, (e) => ({ code: e.code, count: e.count })));
  expect(err).toEqual({ code: 'PENDING', count: 1 });
  expect(await txs(page)).toEqual(['Offline']);
  await store(page, () => App.S.signOut({ force: true }));
  expect(await txs(page)).toEqual([]);
  await context.setOffline(false);
});

test('accounts: Apple/Google buttons only when enabled, web OAuth returns to the app, password reset, account screen', async ({ page }) => {
  await useFakeSupabase(page);
  await open(page);
  await page.evaluate(() => { window.HAYATI_CONFIG.HIDE_PROVIDERS = []; });   // كأن شاشة Google انتشرت (DW-067)
  // DW-035: الإعدادات فيها سطر «حسابك» يفتح صفحة الحساب
  await page.click('#settingsBtn');
  await expect(page.locator('#sheetBody [data-set="account"]')).toContainText('سجّل دخول أو أنشئ حساب');
  await page.click('#sheetBody [data-set="account"]');
  await expect(page.locator('#sheetTitle')).toHaveText('حسابك');
  await expect(page.locator('.account-card')).toContainText('بدون حساب؟ التطبيق يشتغل عادي');
  await expect(page.locator('.account-page')).toContainText('وش يوصل لكل أجهزتك؟');
  await expect(page.locator('[data-set="sso"]')).toHaveCount(0);       // PROVIDERS فاضي = ولا زر ميت
  await store(page, () => App.closeSheet());
  await store(page, () => { window.HAYATI_CONFIG.PROVIDERS = ['apple', 'google']; });
  await page.waitForFunction(() => !document.getElementById('sheet').open);
  await store(page, () => App.accountSheet());
  const sso = page.locator('[data-set="sso"]');
  await expect(sso).toHaveCount(2);
  await expect(sso.first()).toContainText('تابع مع Apple');            // Apple أول (إرشاد 4.8)
  await sso.nth(1).click();
  await page.waitForFunction(() => window.__srv.calls.some((c) => c[0] === 'oauth'));
  const call = await store(page, () => window.__srv.calls.find((c) => c[0] === 'oauth'));
  expect(call[1]).toBe('google');
  expect(call[2].redirectTo).toBe(new URL(page.url()).origin + '/index.html');
  expect(call[2].skipBrowserRedirect).toBe(false);
  // نسيت كلمة المرور
  await page.fill('.account-card [name=email]', 'mo@x.bh');
  await page.click('[data-set="forgot"]');
  await expect(page.locator('.toast')).toContainText('أرسلنا رابط');
  expect(await store(page, () => window.__srv.calls.find((c) => c[0] === 'reset')[1])).toBe('mo@x.bh');
});

test('accounts on iPhone: Apple opens the system browser, the bh.hayati.app://auth link signs in @webkit', async ({ page }) => {
  await useFakeSupabase(page);
  await page.addInitScript(() => {
    const log = window.__nat = { opened: [], closed: 0, urlCb: null };
    window.Capacitor = { isNativePlatform: () => true, Plugins: {
      Browser: { open: async (o) => { log.opened.push(o.url); }, close: async () => { log.closed++; } },
      App: { addListener: (ev, cb) => { if (ev === 'appUrlOpen') log.urlCb = cb; return Promise.resolve({ remove() {} }); } },
    } };
  });
  await open(page);
  await store(page, () => HayatiNative.oauth('apple'));
  const st = await store(page, () => ({ opened: window.__nat.opened, call: window.__srv.calls.find((c) => c[0] === 'oauth') }));
  expect(st.opened).toEqual(['https://auth.example/apple']);
  expect(st.call[2]).toEqual({ redirectTo: 'bh.hayati.app://auth', skipBrowserRedirect: true });
  await store(page, () => window.__nat.urlCb({ url: 'bh.hayati.app://auth?code=abc123' }));
  await page.waitForFunction(() => App.S.status.signedIn);
  expect(await store(page, () => [window.__srv.calls.find((c) => c[0] === 'exchange')[1], window.__nat.closed, App.S.status.provider])).toEqual(['abc123', 1, 'apple']);
  // روابط ثانية ما تنلمس
  expect(await store(page, () => HayatiNative.onAuthUrl('https://example.com/x'))).toBe(false);
});

// 🤖 أندرويد (DW-008): زر الرجوع يسكّر النافذة، بعدها يرجع لـ «اليوم»، وبعدها بس يطلع
test('Android back button: closes the open sheet, then returns to Today, then leaves the app', async ({ page }) => {
  await page.addInitScript(() => {
    const log = window.__nat = { back: null, minimized: 0 };
    window.Capacitor = { isNativePlatform: () => true, Plugins: {
      App: { addListener: (ev, cb) => { if (ev === 'backButton') log.back = cb; return Promise.resolve({ remove() {} }); }, minimizeApp: async () => { log.minimized++; } },
    } };
  });
  await open(page);
  await store(page, () => App.go('tasks'));
  await page.click('#settingsBtn');
  await expect(page.locator('#sheet')).toBeVisible();
  expect(await store(page, () => window.__nat.back({ canGoBack: false }))).toBe('closed');
  await expect(page.locator('#sheet')).toBeHidden();
  expect(await store(page, () => App.ui.tab)).toBe('tasks');               // سكّر النافذة بس، ما غيّر الصفحة
  expect(await store(page, () => window.__nat.back({ canGoBack: false }))).toBe('today');
  expect(await store(page, () => App.ui.tab)).toBe('today');
  expect(await store(page, () => window.__nat.minimized)).toBe(0);
  expect(await store(page, () => window.__nat.back({ canGoBack: false }))).toBe('exit');
  expect(await store(page, () => window.__nat.minimized)).toBe(1);
});

// DW-009: «شارك ← حياتي»
const SHARED = 'Your card XX4821 was used for BHD 3.750 at COSTA COFFEE SEEF on 11/10/26. Avl bal BHD 412.300';

test('installed web app: a shared bank message asks consent first, then opens the paste sheet filled, and saves only on Add', async ({ page }) => {
  await open(page, '/index.html?share_text=' + encodeURIComponent(SHARED));
  await expect(page.locator('#smsConsent')).toBeVisible();
  expect(new URL(page.url()).search).toBe('');                               // الرابط نظف، التحديث ما يعيد فتحها
  await page.click('#sheetSave');                                             // أوافق
  await expect(page.locator('#sheetBody [name=sms]')).toHaveValue(SHARED);
  await expect(page.locator('#smsShared')).toBeVisible();
  await expect(page.locator('#smsPreview')).toContainText('COSTA COFFEE');
  expect(await store(page, () => App.st.transactions.length)).toBe(0);       // ما ينحفظ شي قبل «إضافة»
  await page.click('#sheetSave');
  await expect.poll(() => store(page, () => App.st.transactions.map((t) => [t.amount, t.source]))).toEqual([[3.75, 'sms']]);
});

test('declining consent on a shared message stores nothing', async ({ page }) => {
  await open(page, '/index.html?share_text=' + encodeURIComponent(SHARED));
  await expect(page.locator('#smsConsent')).toBeVisible();
  await page.click('#sheetCancel');
  expect(await store(page, () => [App.st.transactions.length, App.st.settings.sms_consent_at || null])).toEqual([0, null]);
});

test('Android share: replaces an open sheet, waits for the PIN lock, and caps the text', async ({ page }) => {
  await page.addInitScript((text) => {
    const log = window.__share = { listener: null, taken: 0 };
    window.Capacitor = { isNativePlatform: () => true, Plugins: {
      ShareIn: {
        // النص يوصل بعد ما الاختبار يسجّل الموافقة، وإلا أحياناً تطلع نافذة الموافقة قبل (سباق بالاختبار نفسه)
        take: async () => { while (!(window.App && App.st && App.st.settings.sms_consent_at)) await new Promise((r) => setTimeout(r, 20)); log.taken++; return { text }; },
        addListener: (ev, cb) => { if (ev === 'shared') log.listener = cb; return Promise.resolve({ remove() {} }); },
      },
    } };
  }, SHARED);
  await open(page);
  await store(page, () => App.S.setSettings({ sms_consent_at: new Date().toISOString() }));
  // فتح بارد: النص اللي فتح التطبيق
  await expect(page.locator('#sheetBody [name=sms]')).toHaveValue(SHARED);
  expect(await store(page, () => window.__share.taken)).toBe(1);

  // التطبيق مفتوح على نافذة ثانية: المشاركة تبدّلها
  await page.click('#sheetCancel');
  await page.click('#settingsBtn');
  await store(page, () => window.__share.listener({ text: 'BHD 1.200 at TALABAT' }));
  await expect(page.locator('#sheetBody [name=sms]')).toHaveValue('BHD 1.200 at TALABAT');

  // مقفول برمز: ما تنفتح لين ينفتح القفل
  await page.click('#sheetCancel');
  await store(page, () => document.body.classList.add('locked'));
  const kind = store(page, () => App.sharedSms('x'.repeat(5000)));
  await page.waitForTimeout(300);
  await expect(page.locator('#sheet')).toBeHidden();
  await store(page, () => document.body.classList.remove('locked'));
  expect(await kind).toBe('form');
  expect(await store(page, () => document.querySelector('#sheetBody [name=sms]').value.length)).toBe(2000);
});

test('store readiness (DW-011): no request leaves the app, and the Arabic font loads locally', async ({ page, baseURL }) => {
  const outside = [];
  page.on('request', (r) => { if (!r.url().startsWith(baseURL) && !r.url().startsWith('data:')) outside.push(r.url()); });
  await open(page);
  for (const tab of ['money', 'schedule', 'tasks', 'today']) await page.click(`button.tab[data-tab="${tab}"]`);
  // التحميل ينجح بس لو الملف محلي (أي اتصال برّا ممنوع بالاختبار)
  expect(await page.evaluate(async () => (await document.fonts.load('700 16px "IBM Plex Sans Arabic"', 'حياتي')).length)).toBeGreaterThan(0);
  expect(await page.evaluate(() => [...document.fonts].some((f) => f.family.includes('IBM Plex Sans Arabic') && f.status === 'loaded'))).toBe(true);
  expect(await page.evaluate(() => typeof window.supabase)).toBe('object');
  expect(outside).toEqual([]);
});

// DW-012: شهر الراتب + «راتبك وين راح؟» + الزكاة والخُمس
test('payday month: day 25 makes the month run 25 → 24, and budget, report and navigation follow it', async ({ page }) => {
  await open(page);
  const r = await store(page, () => {
    App.S.setSettings({ payday: 25 });
    const k = (y, m, d) => App.monthKey(new Date(y, m - 1, d));
    return {
      before: k(2026, 10, 24), on: k(2026, 10, 25), after: k(2026, 11, 3), jan: k(2027, 1, 10),
      label: App.monthLabel('2026-10'), prev: App.shiftKey('2027-01', -1),
      range: [App.monthRange('2026-10').start.getDate(), App.monthRange('2026-10').end.getMonth() + 1],
    };
  });
  expect(r).toEqual({ before: '2026-09', on: '2026-10', after: '2026-10', jan: '2026-12', label: '25 أكتوبر – 24 نوفمبر', prev: '2026-12', range: [25, 11] });
  // بدون يوم راتب = الشهر الميلادي مثل قبل
  expect(await store(page, () => { App.S.setSettings({ payday: null }); return [App.monthKey(new Date(2026, 9, 24)), App.monthLabel('2026-10')]; })).toEqual(['2026-10', 'أكتوبر 2026']);
});

test('payday month from the UI: pick 25, the money tab shows the payday range and counts by it', async ({ page }) => {
  await open(page);
  await page.click('button.tab[data-tab="money"]');
  await page.click('[data-action="payday"]');
  await page.click('#pdDays [data-d="25"]');
  await page.click('#sheetSave');
  const exp = await store(page, () => {
    const now = new Date(), start = App.monthRange(App.monthKey(now)).start;
    const inside = new Date(start.getTime() + 3600e3), outside = new Date(start.getTime() - 86400e3);
    App.S.upsert('transactions', { id: 'in1', kind: 'expense', amount: 7, merchant: 'Inside', category: 'قهوة', occurred_at: inside.toISOString() });
    App.S.upsert('transactions', { id: 'out1', kind: 'expense', amount: 100, merchant: 'Before payday', category: 'قهوة', occurred_at: outside.toISOString() });
    return App.sums(App.txInMonth(App.monthKey(now))).exp;
  });
  expect(exp).toBe(7);
  await expect(page.locator('.month-nav b')).toContainText('25 ');
  await expect(page.locator('[data-action="payday"]')).toContainText('الراتب يوم 25');
});

test('payday summary card: shows in the first days after payday, opens the summary once, then hides', async ({ page }) => {
  await open(page);
  await store(page, () => {
    const now = new Date(), p = now.getDate() === 1 ? 1 : Math.min(28, now.getDate());   // اليوم دايماً بأول أيام الدورة
    App.S.setSettings({ payday: p });
    localStorage.removeItem('hayati-payday-seen');
    const prev = App.monthRange(App.shiftKey(App.monthKey(now), -1)).start;
    const at = (d) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + d, 12).toISOString();
    App.S.upsert('transactions', { id: 'p1', kind: 'expense', amount: 30, merchant: 'Lulu', category: 'بقالة وتسوق', occurred_at: at(1) });
    App.S.upsert('transactions', { id: 'p2', kind: 'expense', amount: 12.5, merchant: 'Costa', category: 'قهوة', occurred_at: at(2) });
    App.S.upsert('transactions', { id: 'p3', kind: 'income', amount: 500, merchant: 'Salary', category: 'راتب', occurred_at: at(0) });
    App.go('today');
  });
  const card = page.locator('[data-action="payday-summary"]');
  await expect(card).toContainText('42.5');
  await card.click();
  await expect(page.locator('#sheetTitle')).toHaveText('راتبك وين راح؟');
  await expect(page.locator('#sheetBody')).toContainText('بقالة وتسوق');
  await expect(page.locator('#sheetBody')).toContainText('قهوة');
  await page.click('#sheetCancel');
  await expect(card).toHaveCount(0);
});

test('zakat and khums for everyone: both tools open the same for Sunni and Shia, only the nisab and notes change', async ({ page }) => {
  await open(page);
  const r = await store(page, () => {
    const P = Extras.Payday;
    return {
      sunni: P.zakatOf(5000, 40, true, 'sunni'),   // 85 × 40 = 3400
      shia: P.zakatOf(3000, 40, true, 'jafari'),   // 69.6 × 40 = 2784 ← 3000 فوقه
      under: P.zakatOf(3000, 40, true, 'sunni').due,
      noYear: P.zakatOf(5000, 40, false, 'sunni').due,
      noGold: P.zakatOf(5000, 0, true, 'jafari').due,
      khums: P.khumsOf(12000, 9000, 500),          // (12000-9000) + 500 = 3500 × 20%
      loss: P.khumsOf(5000, 6000, 0).due,
    };
  });
  expect(r).toEqual({ sunni: { nisab: 3400, due: 125 }, shia: { nisab: 2784, due: 75 }, under: 0, noYear: 0, noGold: null, khums: { surplus: 3500, due: 700 }, loss: 0 });

  // الشيعي افتراضي من طريقة الصلاة، والزكاة مفتوحة له مثل السني
  await store(page, () => App.S.setSettings({ prayer_method: 'jafari', madhhab: null }));
  await page.click('button.tab[data-tab="money"]');
  await page.click('[data-action="zakat"]');
  await expect(page.locator('#mdh .on')).toHaveText('شيعي');
  await expect(page.locator('#zkTool .on')).toHaveText('الزكاة');
  await page.fill('[name=zk_cash]', '3000');
  await page.fill('[name=zk_gold]', '40');
  await expect(page.locator('#zkOut .amount-big')).toContainText('75');
  await expect(page.locator('#sheetBody')).toContainText('تقدير');
  // الخُمس للكل
  await page.click('#zkTool [data-t="khums"]');
  await page.fill('[name=kh_inc]', '1000');
  await page.fill('[name=kh_exp]', '400');
  await expect(page.locator('#zkOut .amount-big')).toContainText('120');
  await page.click('#mdh [data-m="sunni"]');
  await expect(page.locator('#zkTool .on')).toHaveText('الخُمس');
  await expect(page.locator('#zkOut')).toBeVisible();
  // السني: الزكاة بنصاب 85 غرام
  await page.click('#zkTool [data-t="zakat"]');
  await page.fill('[name=zk_cash]', '5000');
  await page.fill('[name=zk_gold]', '40');
  await expect(page.locator('#zkOut .amount-big')).toContainText('125');
  expect(await store(page, () => [App.st.settings.madhhab, App.st.settings.gold_price])).toEqual(['sunni', 40]);
});

test('payday, school and khums settings ride along in the backup file and come back on restore', async ({ page }) => {
  await open(page);
  const back = await store(page, () => {
    App.S.setSettings({ payday: 25, madhhab: 'jafari', gold_price: 40, khums_start: '2026-03-01' });
    const json = App.S.exportJSON();
    App.S.setSettings({ payday: null, madhhab: null, gold_price: null, khums_start: null });
    App.S.importJSON(json);
    const s = App.st.settings; return [s.payday, s.madhhab, s.gold_price, s.khums_start];
  });
  expect(back).toEqual([25, 'jafari', 40, '2026-03-01']);
});

// DW-013: الحلقة اليومية (نسخة الجوال)
const fakeCap = () => {
  const log = window.__cap = { scheduled: [] };
  window.Capacitor = { isNativePlatform: () => true, Plugins: {
    LocalNotifications: { checkPermissions: async () => ({ display: 'granted' }), requestPermissions: async () => ({ display: 'granted' }),
      getPending: async () => ({ notifications: log.scheduled.map((n) => ({ id: n.id })) }), cancel: async () => { log.scheduled = []; }, schedule: async ({ notifications }) => { log.scheduled = notifications; } },
    Haptics: { impact: async () => {} } } };
  // ثاني يوم استخدام
  const y = new Date(); y.setDate(y.getDate() - 1); y.setHours(0, 0, 0, 0);
  if (!localStorage.getItem('hayati-first-day')) localStorage.setItem('hayati-first-day', y.toISOString());
};

test('daily loop: one card from day two turns on the morning brief and «سكّر يومك»; the evening nudge skips days you already logged', async ({ page }) => {
  await page.addInitScript(fakeCap);
  await open(page);
  await expect(page.locator('.loop-card')).toBeVisible();
  await page.click('[data-action="loop-on"]');
  await expect(page.locator('.loop-card')).toHaveCount(0);
  expect(await store(page, () => { const p = JSON.parse(localStorage.getItem('hayati-notif-prefs')); return [p.brief, p.checkin, p.checkinAt]; })).toEqual([true, true, '21:30']);
  const checkins = () => store(page, () => window.__cap.scheduled.filter((n) => n.title === 'سكّر يومك 🌙').map((n) => [new Date(n.schedule.at).toDateString(), n.schedule.at.getHours ? n.schedule.at.getHours() : new Date(n.schedule.at).getHours(), n.extra.kind]));
  await page.waitForFunction(() => window.__cap.scheduled.some((n) => n.title === 'سكّر يومك 🌙'), null, { timeout: 5000 });
  const before = await checkins();
  expect(before.every(([, h, k]) => h === 21 && k === 'checkin')).toBe(true);
  expect(before.length).toBeLessThanOrEqual(7);
  // سجّل مصروف بكرة الساعة 12 ← تذكير بكرة ينشال، والباقي يظل
  const tomorrow = await store(page, () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(12, 0, 0, 0); App.S.upsert('transactions', { id: 'lp1', kind: 'expense', amount: 2, merchant: 'Cafe', category: 'قهوة', occurred_at: d.toISOString() }); return d.toDateString(); });
  await page.waitForFunction((day) => !window.__cap.scheduled.some((n) => n.title === 'سكّر يومك 🌙' && new Date(n.schedule.at).toDateString() === day), tomorrow, { timeout: 5000 });
  expect((await checkins()).length).toBeGreaterThan(0);
});

test('«سكّر يومك» (DW-038): type «1.200 كوستا» in the notification and it is saved; no amount opens the form', async ({ page }) => {
  await page.addInitScript(() => {
    const log = window.__cap = { scheduled: [] };
    localStorage.setItem('hayati-notif-prefs', JSON.stringify({ checkin: true, checkinAt: '23:59' }));
    window.Capacitor = { isNativePlatform: () => true, Plugins: {
      LocalNotifications: { checkPermissions: async () => ({ display: 'granted' }), requestPermissions: async () => ({ display: 'granted' }),
        getPending: async () => ({ notifications: log.scheduled.map((n) => ({ id: n.id })) }), cancel: async () => { log.scheduled = []; }, schedule: async ({ notifications }) => { log.scheduled = notifications; },
        registerActionTypes: async (o) => { log.types = o.types; },
        addListener: (ev, fn) => { log.handler = fn; return Promise.resolve({ remove() {} }); } },
      Haptics: { impact: async () => {} } } };
  });
  await open(page);
  await page.waitForFunction(() => window.__cap.scheduled.some((n) => n.title === 'سكّر يومك 🌙'), null, { timeout: 5000 });
  const n = await store(page, () => window.__cap.scheduled.find((x) => x.title === 'سكّر يومك 🌙'));
  const t = await store(page, (id) => window.__cap.types.find((x) => x.id === id), n.actionTypeId);
  expect(t.actions).toEqual([expect.objectContaining({ id: 'log', input: true, inputPlaceholder: 'مثلاً: 1.200 قهوة', foreground: true })]);

  await store(page, (n) => window.__cap.handler({ actionId: 'log', inputValue: '١٫٢٠٠ كوستا', notification: n }), n);
  await expect(page.locator('.toast')).toContainText('انحفظ ✓ 1.200 د.ب · قهوة');
  const tx = await store(page, () => App.st.transactions.find((x) => x.merchant === 'كوستا'));
  expect([tx.kind, tx.amount, tx.category, tx.source]).toEqual(['expense', 1.2, 'قهوة', 'manual']);
  // انسجّل اليوم ← تذكير الليلة ينشال
  await page.waitForFunction(() => !window.__cap.scheduled.some((x) => x.title === 'سكّر يومك 🌙' && new Date(x.schedule.at).toDateString() === new Date().toDateString()), null, { timeout: 5000 });

  // سطر بدون مبلغ ← النموذج ينفتح
  await store(page, (n) => window.__cap.handler({ actionId: 'log', inputValue: 'قهوة', notification: n }), n);
  await expect(page.locator('#sheetBody [name=amount]')).toBeVisible();
  await expect(page.locator('.toast')).toContainText('ما لقيت المبلغ');
});

test('daily loop: «لا شكراً» hides the card for good, and it never shows on the first day or on the web', async ({ page }) => {
  await page.addInitScript(fakeCap);
  await open(page);
  await page.click('[data-action="loop-no"]');
  await page.reload(); await page.waitForFunction(() => window.App && App.st);
  await expect(page.locator('.loop-card')).toHaveCount(0);
  expect(await store(page, () => JSON.parse(localStorage.getItem('hayati-notif-prefs') || '{}').checkin)).toBeFalsy();
});

test('daily loop: no card on the web version (no notifications there)', async ({ page }) => {
  await open(page);
  await expect(page.locator('.loop-card')).toHaveCount(0);
});

// DW-014: ورد القرآن + «اقرأ» + تذكير الأذكار — بدون أي نص ديني بالتطبيق
test('Quran wird: set up from +, log pages, khatma progress and estimate, and «اقرأ» opens the chosen https link', async ({ page }) => {
  await open(page);
  await expect(page.locator('.wird-card')).toHaveCount(0);   // ما يطلع لأحد ما شغّله
  await page.click('#addBtn');
  await page.click('[data-pick="wird"]');
  await page.check('[name=w_on]');
  await page.fill('[name=w_goal]', '5');
  await page.fill('[name=w_pos]', '594');
  await page.click('#sheetSave');
  await store(page, () => App.go('today'));
  const card = page.locator('.wird-card');
  await expect(card).toContainText('اليوم 0 من 5 صفحات');
  await expect(card).toContainText('تختم بعد 2 يوم');
  await card.locator('[data-action="wird-add"][data-n="1"]').click();
  await expect(card).toContainText('اليوم 1 من 5');
  await card.locator('[data-action="wird-add"]', { hasText: 'خلّصت وردي' }).click();
  await expect(card).toContainText('اليوم 5 من 5 صفحات ✓');
  // 594 + 5 = 599 من 604
  expect(await store(page, () => [App.st.settings.wird.pos, App.st.settings.wird.khatmat || 0])).toEqual([599, 0]);
  // الختمة تخلص وتبدأ من جديد
  expect(await store(page, () => { const done = Extras.Wird.addPages(10); return [done, App.st.settings.wird.pos, App.st.settings.wird.khatmat]; })).toEqual([true, 5, 1]);
  // «اقرأ» يفتح الرابط بس، وما فيه أي نص قرآني بالبطاقة
  await store(page, () => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; });
  await card.locator('[data-action="wird-read"]').click();
  expect(await store(page, () => window.__opened)).toEqual(['https://quran.com']);
  // الأجزاء: الجزء = 20 صفحة
  expect(await store(page, () => Extras.Wird.goalPages({ unit: 'juz', goal: 1 }))).toBe(20);
});

test('wird setup refuses a non-https link and a goal of zero', async ({ page }) => {
  await open(page);
  await page.click('#addBtn'); await page.click('[data-pick="wird"]');
  await page.check('[name=w_on]');
  await page.fill('[name=w_link]', 'http://example.com');
  await page.click('#sheetSave');
  await expect(page.locator('#sheet')).toHaveAttribute('open', '');
  await page.fill('[name=w_link]', 'https://quran.com');
  await page.fill('[name=w_goal]', '0');
  await page.click('#sheetSave');
  await expect(page.locator('#sheet')).toHaveAttribute('open', '');
  expect(await store(page, () => !!(App.st.settings.wird && App.st.settings.wird.on))).toBe(false);
});

test('adhkar reminder (phone app): off by default; when on, 30 min after Fajr and Asr for either prayer method, title only', async ({ page }) => {
  await page.addInitScript(fakeCap);
  await open(page);
  await page.waitForTimeout(1200);
  expect(await store(page, () => window.__cap.scheduled.filter((n) => /أذكار/.test(n.title)).length)).toBe(0);
  for (const pm of ['jafari', 'gulf']) {
    const r = await store(page, (m) => {
      App.S.setSettings({ prayer_method: m, prayer_on: true });
      HayatiNative.savePrefs(Object.assign({}, HayatiNative.prefs(), { adhkar: true }));
      const d = new Date(); d.setDate(d.getDate() + 1);
      const list = HayatiNative.upcoming(new Date()).filter((n) => /أذكار/.test(n.title) && new Date(n.schedule.at).toDateString() === d.toDateString());
      const t = Extras.prayerTimes(d, m), mins = (n) => { const x = new Date(n.schedule.at); return x.getHours() * 60 + x.getMinutes(); };
      return list.map((n) => [n.title, n.body, mins(n) - (n.title.includes('الصباح') ? t.fajr : t.asr)]);
    }, pm);
    expect(r).toEqual([['وقت أذكار الصباح ☀️', '', 30], ['وقت أذكار المساء 🌙', '', 30]]);
  }
});

// DW-015: «عبادتي» + المسبحة + الهجري + المناسبات
test('tasbih: Tasbih al-Zahra counts 34 · 33 · 33 in order, then finishes; the after-prayer preset is 33 · 33 · 34', async ({ page }) => {
  await open(page);
  const r = await store(page, () => {
    const I = Extras.Ibada; I.start('zahra');
    const marks = []; let last;
    for (let i = 0; i < 100; i++) { last = I.press(); if (i === 33 || i === 66) marks.push([last.step, last.count]); }
    return { marks, last, words: I.PRESETS.zahra.steps.map((s) => s.join(':')), after: I.PRESETS.after.steps.map((s) => s[1]), today: App.st.settings.tasbih.n };
  });
  expect(r.marks).toEqual([[1, 0], [2, 0]]);   // بعد 34 تكبيرة ← التحميد، وبعد 33 ← التسبيح
  expect(r.last.done).toBe(true);
  expect(r.words).toEqual(['الله أكبر:34', 'الحمد لله:33', 'سبحان الله:33']);
  expect(r.after).toEqual([33, 33, 34]);
  expect(r.today).toBe(100);
  // من الواجهة: + ← المسبحة ← ضغطة
  await page.click('#addBtn'); await page.click('[data-pick="tasbih"]');
  await page.click('#tsbBtn');
  await expect(page.locator('#tsbN')).toHaveText('1 / 34');
  await expect(page.locator('#tsbWord')).toHaveText('الله أكبر');
});

test('Hijri date and occasions: Umm al-Qura on the device, ±2 day sighting offset, Eid and Gergaoon land on the right Hijri day', async ({ page }) => {
  await open(page);
  const r = await store(page, () => {
    const I = Extras.Ibada, d = new Date(2026, 9, 14);
    const base = I.hijri(d);
    App.S.setSettings({ hijri_offset: 1 }); const plus = I.hijri(d);
    App.S.setSettings({ hijri_offset: 9 }); const capped = I.hijri(d);
    App.S.setSettings({ hijri_offset: 0 });
    const fitr = I.nextDate(['عيد الفطر', 10, 1], d), ger = I.nextDate(['القرقاعون', 9, 15], d), nat = I.nextDate(['اليوم الوطني', null, 12, 16], d);
    return { base, plus: plus.day - base.day, capped: capped.day - base.day, fitr: I.hijri(fitr), ger: I.hijri(ger), nat: [nat.getMonth() + 1, nat.getDate()], next: I.upcoming(3, d).map((o) => o.name), ger2fitr: Math.round((fitr - ger) / 864e5) };
  });
  expect(r.base).toEqual({ day: 3, month: 5, year: 1448 });   // 14 أكتوبر 2026 = 3 جمادى الأولى 1448 (أم القرى)
  expect(r.plus).toBe(1);
  expect(r.capped).toBe(2);
  expect([r.fitr.month, r.fitr.day]).toEqual([10, 1]);
  expect([r.ger.month, r.ger.day]).toEqual([9, 15]);
  expect(r.ger2fitr).toBeGreaterThanOrEqual(14);
  expect(r.nat).toEqual([12, 16]);
  expect(r.next[0]).toBe('🇧🇭 اليوم الوطني');
});

test('«عبادتي»: one row on Today opens the page with the Hijri date, next prayer, tasbih and upcoming occasions', async ({ page }) => {
  await open(page);
  await store(page, () => { App.S.setSettings({ prayer_method: 'jafari', prayer_on: true }); App.go('today'); });
  await page.click('[data-action="ibada"]');
  await expect(page.locator('#sheetTitle')).toHaveText('🕌 عبادتي');
  await expect(page.locator('#hijriNow')).toContainText('هـ');
  await expect(page.locator('#sheetBody')).toContainText('المناسبات الجاية');
  await page.click('[data-ho="1"]');
  await expect(page.locator('#hoVal')).toHaveText('+1');
  await page.click('#ibTsb');
  await expect(page.locator('#sheetTitle')).toHaveText('المسبحة');
});

// DW-016: «كل شي بحياتي» + «رتّب اليوم»
test('«كل شي بحياتي»: every tool in one sheet, and each tile opens its place', async ({ page }) => {
  await open(page);
  await page.click('#toolsBtn');
  await expect(page.locator('#sheetTitle')).toHaveText('كل شي بحياتي');
  const n = await page.locator('[data-tool]').count();
  expect(n).toBeGreaterThanOrEqual(18);   // «التنبيهات» بنسخة الجوال بس
  await page.click('[data-tool="shop"]');
  await expect(page.locator('button.tab[data-tab="tasks"]')).toHaveClass(/on/);
  expect(await store(page, () => App.ui.tasksSeg)).toBe('shop');
  await page.click('#toolsBtn'); await page.click('[data-tool="zakat"]');
  await expect(page.locator('#sheetTitle')).toHaveText('الزكاة والخُمس');
  await page.click('#sheetCancel');
  await page.click('#toolsBtn'); await page.click('[data-tool="tasbih"]');
  await expect(page.locator('#sheetTitle')).toHaveText('المسبحة');
});

test('«رتّب اليوم»: hiding a card hides it on Today, survives a reload and comes back when switched on', async ({ page }) => {
  await open(page);
  await store(page, () => App.go('today'));
  for (const k of ['schedule', 'tasks', 'recent', 'health']) await expect(page.locator(`#view section[data-tk="${k}"]`)).toBeVisible();
  await page.click('#toolsBtn'); await page.click('#tkOpen');
  await page.uncheck('[data-tk-on="recent"]'); await page.uncheck('[data-tk-on="health"]');
  await page.click('#sheetSave');
  await expect(page.locator('#view section[data-tk="recent"]')).toBeHidden();
  await expect(page.locator('#view section[data-tk="health"]')).toBeHidden();
  await expect(page.locator('#view section[data-tk="tasks"]')).toBeVisible();
  await page.reload(); await page.waitForFunction(() => window.App && App.st);
  await expect(page.locator('#view section[data-tk="recent"]')).toBeHidden();
  await store(page, () => App.S.setSettings({ today_hide: [] }));
  await expect(page.locator('#view section[data-tk="recent"]')).toBeVisible();
});


// ================= DW-019: «جديد بحياتي» =================
const seedOld = (page) => store(page, () => { App.S.setSettings({ onboarded: true, name: 'سارة' }); App.S.upsert('transactions', { id: 't1', kind: 'expense', amount: 2.3, merchant: 'Costa', category: 'قهوة', occurred_at: new Date().toISOString() }); });

test('«جديد بحياتي»: an existing user sees what is new once after the update, and «تمام» keeps it away', async ({ page }) => {
  await open(page);
  await seedOld(page);
  await store(page, () => localStorage.setItem('hayati-seen-version', 'v23'));   // كان على النسخة اللي قبل
  await open(page);
  await expect(page.locator('#sheetTitle')).toHaveText('جديد بحياتي ✨', { timeout: 5000 });
  await expect(page.locator('#sheetBody .news-item')).toHaveCount(14);
  await page.click('#sheetCancel');
  expect(await store(page, () => localStorage.getItem('hayati-seen-version'))).toBe(await store(page, () => App.APP_VERSION));
  await open(page);
  await page.waitForTimeout(2000);
  await expect(page.locator('#sheet[open]')).toHaveCount(0);
});

test('«جديد بحياتي»: a new user never sees it (they get the welcome instead)', async ({ page }) => {
  await open(page);
  await page.waitForTimeout(2000);
  await expect(page.locator('#sheet[open]')).toHaveCount(0);
  expect(await store(page, () => localStorage.getItem('hayati-seen-version'))).toBe(await store(page, () => App.APP_VERSION));
});

test('«جديد بحياتي»: waits behind the PIN lock and shows after unlocking', async ({ page }) => {
  await open(page);
  await seedOld(page);
  await store(page, () => localStorage.setItem('hayati-seen-version', 'v21'));
  await open(page);
  await store(page, () => document.body.classList.add('locked'));   // القفل مفتوح قبل ما تطلع
  await page.waitForTimeout(2500);
  await expect(page.locator('#sheet[open]')).toHaveCount(0);
  await store(page, () => document.body.classList.remove('locked'));
  await expect(page.locator('#sheetTitle')).toHaveText('جديد بحياتي ✨', { timeout: 3000 });
});

// ================= DW-021: «المحاضرات» =================
const asStudent = (page) => store(page, () => { App.S.setSettings({ onboarded: true, roles: ['student'] }); App.S.upsert('courses', { id: 'c1', name: 'محاسبة إدارية', type: 'lecture', days: [1], start_time: '10:00', end_time: '11:15', color: '#1A8A8F' }); });

// DW-054: بوربوينت أو وورد ← نص الشرائح بالجهاز، ولأصحاب الحسابات مراجعة مختصرة وأسئلة
test('lectures: PowerPoint and Word files become notes on the device, and a short review when signed in', async ({ page }) => {
  await open(page);
  await asStudent(page);
  await store(page, () => { App.ui.studySeg = 'lectures'; App.go('schedule'); });
  await page.click('[data-action="lec-new"]');
  await page.setInputFiles('#lcOffice', path.join(__dirname, 'fixtures/lesson.pptx'));
  await expect(page.locator('#toast')).toContainText('3 شريحة');
  const notes = await page.inputValue('[name=lc_notes]');
  expect(notes.indexOf('الفيزياء: الحركة')).toBeLessThan(notes.indexOf('قانون نيوتن'));
  expect(notes.indexOf('F = m × a')).toBeLessThan(notes.indexOf('Summary & review'));
  expect(await page.inputValue('[name=lc_title]')).toBe('lesson');
  await page.click('#sheetCancel');
  await page.waitForTimeout(350);
  await store(page, () => {
    App.S.status.signedIn = true;
    window.__aiCalls = [];
    App.S.invokeFn = async (name, body) => { window.__aiCalls.push(body); return { notes: '• الخلية وحدة الحياة', summary: 'الخلية أساس الكائن الحي', cards: [{ q: 'ما وحدة الحياة؟', a: 'الخلية' }] }; };
  });
  await page.click('[data-action="lec-new"]');
  await page.setInputFiles('#lcOffice', path.join(__dirname, 'fixtures/lesson.docx'));
  await expect(page.locator('#toast')).toContainText('المراجعة جاهزة');
  const call = await store(page, () => window.__aiCalls[0]);
  expect(call.mode).toBe('slides');
  expect(call.notes).toContain('الخلية وحدة الحياة');
  expect(await page.inputValue('[name=lc_notes]')).toBe('• الخلية وحدة الحياة');
  expect(await page.inputValue('[name=lc_summary]')).toBe('الخلية أساس الكائن الحي');
  await expect(page.locator('#lcCards li')).toHaveCount(1);
});

// DW-054: طالب مدرسة ← «حصة» بدال «محاضرة»، والمعدل بالنسبة المئوية
test('school student: lessons instead of lectures, and a percentage GPA', async ({ page }) => {
  await open(page);
  await store(page, () => App.S.setSettings({ onboarded: true, roles: ['student'], study_level: 'secondary' }));
  await store(page, () => { App.ui.studySeg = 'schedule'; App.go('schedule'); });
  await expect(page.locator('.seg').first()).toContainText('الحصص');
  await expect(page.locator('.seg').first()).not.toContainText('المحاضرات');
  await store(page, () => { App.ui.studySeg = 'gpa'; App.go('schedule'); });
  await page.click('[data-action="add-grade"]');
  await page.fill('#sheetBody [name=course_name]', 'رياضيات 201');
  await page.fill('#sheetBody [name=score]', '94');
  await page.click('#sheetSave');
  await page.click('[data-action="add-grade"]');
  await page.fill('#sheetBody [name=course_name]', 'كيمياء 101');
  await page.fill('#sheetBody [name=score]', '81.5');
  await page.click('#sheetSave');
  await expect(page.locator('.hero .amount-big')).toContainText('87.8%');
  await expect(page.locator('.hero')).toContainText('جيد جداً');
  await expect(page.locator('[data-action="prior-gpa"]')).toHaveCount(0);
  // يقدر يغيّر المرحلة من «ملفك»
  const lv = await page.evaluate(() => [window.HayatiLevels.swap('ارفع جدولك الجامعي'), window.HayatiLevels.swap('المحاضرة الجاية')]);
  expect(lv).toEqual(['ارفع جدولك الدراسي', 'الحصة الجاية']);
});

test('lectures: a file per lecture under its course with notes, summary and self-test questions; the practice quiz scores and is saved', async ({ page }) => {
  await open(page);
  await asStudent(page);
  await store(page, () => { App.ui.studySeg = 'lectures'; App.go('schedule'); });
  await expect(page.locator('.study-seg, .seg button.on', { hasText: 'المحاضرات' }).first()).toBeVisible();
  await page.click('[data-action="lec-new"]');
  await page.selectOption('[name=lc_course]', 'c1');
  await page.fill('[name=lc_title]', 'Chapter 3 — Ratios');
  await page.fill('[name=lc_notes]', 'Current ratio = current assets / current liabilities');
  await page.fill('[name=lc_summary]', 'النسب تقيس السيولة');
  for (const [q, a] of [['Current ratio?', 'CA / CL'], ['Quick ratio?', '(CA - Inventory) / CL']]) {
    await page.fill('[name=lc_q]', q); await page.fill('[name=lc_a]', a); await page.click('#lcAddCard');
  }
  await expect(page.locator('#lcCards li')).toHaveCount(2);
  await page.click('#sheetSave');
  await expect(page.locator('.lec-row')).toHaveCount(1);
  await expect(page.locator('#view')).toContainText('محاسبة إدارية');
  await expect(page.locator('.lec-row')).toContainText('❓ 2');
  // الاختبار التجريبي: سؤال، تشوف الجواب، عرفتها/ما عرفتها
  await page.click('[data-action="lec-quiz-all"]');
  await expect(page.locator('#qzQ')).toBeVisible();
  await page.click('[data-qz="show"]'); await expect(page.locator('#qzA')).toBeVisible(); await page.click('[data-qz="yes"]');
  await page.click('[data-qz="show"]'); await page.click('[data-qz="no"]');
  await expect(page.locator('#qzRoot')).toContainText('50%');
  await page.click('#sheetCancel');
  await expect(page.locator('.lec-row')).toContainText('✓ 50%');
  const saved = await store(page, () => App.st.lectures[0]);
  expect(saved.course_id).toBe('c1'); expect(saved.cards.length).toBe(2); expect(saved.summary).toContain('السيولة');
});

test('lectures: a recording stays on the device (IndexedDB), is listed on the lecture and is not part of the synced record', async ({ page }) => {
  await page.addInitScript(() => {
    // مايك مزيّف: يرجّع صوت وهمي بدون جهاز
    navigator.mediaDevices.getUserMedia = async () => ({ getTracks: () => [{ stop() {} }] });
    window.MediaRecorder = class { constructor() { this.mimeType = 'audio/webm'; } start() { setTimeout(() => this.ondataavailable({ data: new Blob(['x'.repeat(100)], { type: 'audio/webm' }) }), 50); } stop() { setTimeout(() => this.onstop(), 10); } };
  });
  await open(page);
  await asStudent(page);
  await store(page, () => { App.ui.studySeg = 'lectures'; App.go('schedule'); });
  await page.click('[data-action="lec-new"]');
  await page.fill('[name=lc_title]', 'Lecture 1');
  await page.click('#lcRec');
  await expect(page.locator('#lcRec')).toContainText('وقّف');
  await page.waitForTimeout(300);
  await page.click('#lcRec');
  await expect(page.locator('[data-play="0"]')).toBeVisible();
  await page.click('#sheetSave');
  await expect(page.locator('.lec-row')).toContainText('🎙️ 1');
  const rec = await store(page, async () => { const l = App.st.lectures[0]; const blob = await window.Extras.Lectures.getClip(l.audio[0].id); return { size: blob && blob.size, keys: Object.keys(l.audio[0]) }; });
  expect(rec.size).toBeGreaterThan(0);
  expect(rec.keys.sort()).toEqual(['at', 'dur', 'id']);   // السجل نفسه فيه رقم التسجيل بس، مو الصوت
});

test('lectures tab shows only for students, and the tools sheet has a tile for it', async ({ page }) => {
  await open(page);
  await store(page, () => App.S.setSettings({ onboarded: true, roles: ['employee'] }));
  await store(page, () => App.go('schedule'));
  await expect(page.locator('[data-action="study-seg"][data-k="lectures"]')).toHaveCount(0);
  await asStudent(page);
  await store(page, () => App.go('schedule'));
  await expect(page.locator('[data-action="study-seg"][data-k="lectures"]')).toHaveCount(1);
  await page.click('#toolsBtn');
  await expect(page.locator('[data-tool="lectures"]')).toBeVisible();
});

test('lectures AI: hidden behind sign-in; when signed in it sends only the notes and fills the summary and new questions', async ({ page }) => {
  await open(page);
  await asStudent(page);
  await store(page, () => { App.ui.studySeg = 'lectures'; App.go('schedule'); });
  await page.click('[data-action="lec-new"]');
  await expect(page.locator('[data-ai]')).toHaveCount(0);
  await expect(page.locator('.sheet')).toContainText('تسجّل دخول');
  await page.click('#sheetCancel');
  await page.waitForTimeout(350);
  await store(page, () => {
    App.S.status.signedIn = true;
    window.__aiCalls = [];
    App.S.invokeFn = async (name, body) => { window.__aiCalls.push({ name, body }); return body.mode === 'summary' ? { summary: 'النسب تقيس قدرة الشركة على السداد' } : { cards: [{ q: 'Current ratio?', a: 'CA / CL' }, { q: 'Quick ratio?', a: '(CA - Inv) / CL' }] }; };
  });
  await page.click('[data-action="lec-new"]');
  await page.fill('[name=lc_title]', 'Chapter 3');
  await page.fill('[name=lc_notes]', 'short');
  await page.click('[data-ai="summary"]');
  await expect.poll(() => store(page, () => window.__aiCalls.length)).toBe(0);
  await page.fill('[name=lc_notes]', 'Current ratio = current assets / current liabilities. '.repeat(5));
  await page.click('[data-ai="summary"]');
  await expect(page.locator('[name=lc_summary]')).toHaveValue('النسب تقيس قدرة الشركة على السداد');
  await page.click('[data-ai="quiz"]');
  await expect(page.locator('#lcCards li')).toHaveCount(2);
  await page.click('[data-ai="quiz"]');   // نفس الأسئلة ما تتكرر
  await expect(page.locator('#lcCards li')).toHaveCount(2);
  const calls = await store(page, () => window.__aiCalls);
  expect(calls[0].name).toBe('lecture-ai');
  expect(Object.keys(calls[0].body).sort()).toEqual(['mode', 'notes', 'title']);
});

// ================= DW-022: المعادلات =================
test('lectures math: equations render (powers, subscripts, √, ≥) left-to-right inside Arabic, user text stays escaped', async ({ page }) => {
  await open(page);
  const out = await store(page, () => { const m = window.Extras.Lectures.mathify; return {
    pow: m('x^2 + 3x - 4 = 0'), sub: m('x_1 + x_2 = -b/a'), root: m('sqrt(16) >= 2*2'),
    ar: m('نقطة التعادل = FC / (P - VC) بالوحدات'), plain: m('Fixed cost?'), xss: m('<img src=x onerror=alert(1)> = 1'),
  }; });
  expect(out.pow).toBe('<bdi dir="ltr" class="eq" style="white-space:nowrap">x<sup>2</sup> + 3x - 4 = 0</bdi>');
  expect(out.sub).toContain('x<sub>1</sub>');
  expect(out.root).toContain('√(16) ≥ 2×2');
  expect(out.ar).toBe('نقطة التعادل = <bdi dir="ltr" class="eq" style="white-space:nowrap">FC / (P - VC)</bdi> بالوحدات');   // «=» يظل جنب العربي
  expect(out.plain).toBe('Fixed cost?');
  expect(out.xss).not.toContain('<img');
});

test('lectures math: the symbol bar types into the field you were in, and a card shows its equation formatted', async ({ page }) => {
  await open(page);
  await asStudent(page);
  await store(page, () => { App.ui.studySeg = 'lectures'; App.go('schedule'); });
  await page.click('[data-action="lec-new"]');
  await page.fill('[name=lc_title]', 'Quadratics');
  await page.click('[name=lc_notes]'); await page.keyboard.type('x');
  await page.click('[data-sym="²"]');
  await expect(page.locator('[name=lc_notes]')).toHaveValue('x²');
  await page.fill('[name=lc_q]', 'Solve x^2 = 9');
  await page.click('[name=lc_a]'); await page.keyboard.type('x = ');
  await page.click('[data-sym="±"]'); await page.keyboard.type('3');
  await expect(page.locator('[name=lc_a]')).toHaveValue('x = ±3');
  await page.click('#lcAddCard');
  await expect(page.locator('#lcCards sup')).toHaveText('2');
  await expect(page.locator('#lcCards .eq').first()).toHaveAttribute('dir', 'ltr');
});

// ================= DW-023: القبلة =================
test('qibla: bearing matches known cities and the guide says which way to turn', async ({ page }) => {
  await open(page);
  const r = await store(page, () => { const Q = window.Extras.Qibla; return {
    manama: Q.bearing(Q.MANAMA), london: Q.bearing({ lat: 51.5074, lng: -0.1278 }), nyc: Q.bearing({ lat: 40.7128, lng: -74.006 }),
    km: Q.distanceKm(Q.MANAMA), right: Q.guide(Q.turn(250, 230)).text, left: Q.guide(Q.turn(250, 280)).text, ok: Q.guide(Q.turn(10, 6)).ok,
  }; });
  expect(r.manama).toBeGreaterThan(245); expect(r.manama).toBeLessThan(248);
  expect(Math.abs(r.london - 119.0)).toBeLessThan(0.5);
  expect(Math.abs(r.nyc - 58.5)).toBeLessThan(0.5);
  expect(r.km).toBeGreaterThan(1150); expect(r.km).toBeLessThan(1300);
  expect(r.right).toBe('لفّ يمين 20°'); expect(r.left).toBe('لفّ يسار 30°'); expect(r.ok).toBe(true);
});

test('qibla: opens from the tools sheet and «عبادتي», follows the compass sensor, and «استخدم موقعي» recalculates', async ({ page }) => {
  await page.context().grantPermissions(['geolocation']);
  await page.context().setGeolocation({ latitude: 51.5074, longitude: -0.1278 });
  await open(page);
  await page.click('#toolsBtn');
  await page.click('[data-tool="qibla"]');
  await expect(page.locator('#sheetTitle')).toHaveText('🧭 القبلة');
  await expect(page.locator('#qInfo')).toContainText('246°');
  await expect(page.locator('#qInfo')).toContainText('المنامة');
  // حساس البوصلة: heading = 360 − alpha
  const fire = (alpha) => page.evaluate((a) => window.dispatchEvent(Object.assign(new Event('deviceorientationabsolute'), { alpha: a, absolute: true })), alpha);
  await fire(360 - 246);
  await expect(page.locator('#qGuide')).toHaveText('✓ أنت على القبلة');
  await fire(360 - 180);
  await expect(page.locator('#qGuide')).toContainText('لفّ يمين');
  await page.click('#qLoc');
  await expect(page.locator('#qInfo')).toContainText('119°');
  await expect(page.locator('#qInfo')).toContainText('موقعك');
  expect(await page.evaluate(() => JSON.stringify(localStorage)).then((s) => s.includes('51.50'))).toBe(false);   // الموقع ما ينحفظ
  await page.click('#sheetCancel');
  await store(page, () => App.S.setSettings({ onboarded: true }));
  await page.waitForTimeout(350);
  await store(page, () => window.Extras.settingsAction('ibada'));
  await page.waitForTimeout(400);
  await page.click('#ibQibla');
  await expect(page.locator('#sheetTitle')).toHaveText('🧭 القبلة');
});

// ================= DW-024: «أول دقيقة» + «بلّغ عن مشكلة» =================
test('«أول دقيقة»: right after the welcome a new user gets one step, and the first expense shows their first number', async ({ page }) => {
  await open(page);
  await page.fill('#obBudget', '300');
  await page.click('[data-action="ob-save"]');
  const fm = page.locator('#fmCard');
  await expect(fm).toContainText('أول دقيقة');
  await expect(fm.locator('[data-action="paste-sms"]')).toBeVisible();
  await expect(fm.locator('[data-action="add-tx"]')).toBeVisible();
  await store(page, () => App.S.upsert('transactions', { id: 't1', kind: 'expense', amount: 75, category: 'food', note: 'غدا', occurred_at: new Date().toISOString() }));
  await expect(fm).toContainText('أول رقم لك');
  await expect(fm).toContainText('25%');
  await fm.locator('[data-action="fm-done"]').click();
  await expect(page.locator('#fmCard')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#view')).toBeVisible();
  await expect(page.locator('#fmCard')).toHaveCount(0);
});

test('«أول دقيقة»: «بعدين» hides it for good, and an existing user with expenses never sees it', async ({ page }) => {
  await open(page);
  await page.click('[data-action="ob-skip"]');
  await page.click('[data-action="fm-later"]');
  await expect(page.locator('#fmCard')).toHaveCount(0);
  await page.evaluate(() => localStorage.removeItem('hayati-first-step'));
  await store(page, () => { App.S.upsert('transactions', { id: 't1', kind: 'expense', amount: 5, category: 'food', occurred_at: new Date().toISOString() }); App.render(); });
  await expect(page.locator('#fmCard')).toHaveCount(0);
});

test('bug report: the message has the version and device only, never amounts or names', async ({ page }) => {
  await open(page);
  await store(page, () => { App.S.setSettings({ onboarded: true, name: 'سارة', budget: 380 }); App.S.upsert('transactions', { id: 't1', kind: 'expense', amount: 92.325, category: 'food', note: 'لولو', occurred_at: new Date().toISOString() }); });
  await store(page, () => window.Extras.settingsAction('bug'));
  await expect(page.locator('#sheetTitle')).toHaveText('🐞 بلّغ عن مشكلة');
  await page.click('#sheetSave');
  await expect(page.locator('#sheet')).toHaveAttribute('open', '');   // لازم يكتب وش صار
  await page.fill('#bugWhat', 'لصقت رسالة وما طلع المبلغ');
  const text = await page.evaluate(() => window.HayatiFeedback.bugText(document.getElementById('sheetBody')));
  expect(text).toContain('النسخة: ' + APP_V);
  expect(text).toContain('الجهاز: ');
  expect(text).not.toMatch(/سارة|92|380|لولو/);
});

// ================= DW-025: أسوأ بيانات (بند 14) =================
test('worst-case data: huge amounts, long names and missing fields never spill off-screen or show undefined/NaN', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await open(page);
  await store(page, () => {
    const S = App.S, now = Date.now(), iso = (d) => new Date(now - d * 864e5).toISOString();
    const LONG = 'مؤسسة الخليج العالمية للتجارة والمقاولات والخدمات اللوجستية المحدودة ذ.م.م';
    S.setSettings({ onboarded: true, name: 'عبدالرحمن بن عبدالله بن محمد', budget: 99999999.999 });
    S.upsert('transactions', { id: 't1', kind: 'expense', amount: 1234567.891, category: 'shopping', note: LONG, occurred_at: iso(0) });
    S.upsert('transactions', { id: 't2', kind: 'income', amount: 99999999.999, category: 'salary', occurred_at: iso(1) });
    S.upsert('subscriptions', { id: 's1', name: LONG, amount: 123456.789, cycle: 'monthly', next_at: iso(-2) });
    S.upsert('goals', { id: 'g1', name: LONG, target: 99999999, saved: 12345678.9 });
    S.upsert('debts', { id: 'd1', amount: 7654321.123 });   // ناقص الاسم والتاريخ والاتجاه
  });
  const spill = () => page.evaluate(() => {
    const W = document.documentElement.clientWidth, out = [];
    if (document.documentElement.scrollWidth > W + 1) out.push('page');
    document.querySelectorAll('#view *').forEach((e) => { const r = e.getBoundingClientRect(); if (r.width && (r.right > W + 1 || r.left < -1)) out.push(e.tagName + ' ' + (e.textContent || '').trim().slice(0, 30)); });
    document.querySelectorAll('#view .amount-big, #view .tile .val, #view .hero .split b, #view .fit').forEach((e) => { if (e.querySelector('.cur') && e.scrollWidth > e.clientWidth + 1) out.push('cut ' + e.textContent.trim()); });
    return out;
  });
  await store(page, () => App.go('today'));
  await expect.poll(spill).toEqual([]);
  for (const seg of ['tx', 'subs', 'goals', 'debts']) {
    await store(page, (s) => { App.ui.moneySeg = s; App.go('money'); }, seg);
    await expect.poll(spill, { message: seg }).toEqual([]);
  }
  await expect(page.locator('#view')).not.toContainText('undefined');
  await expect(page.locator('#view')).not.toContainText('NaN');
  await expect(page.locator('#view')).toContainText('بدون اسم');
});

// ================= DW-026: إمكانية الوصول (بند 13) =================
test('accessibility: every button has a name, every field a label, and small controls answer taps within 44px', async ({ page }) => {
  await open(page);
  await store(page, () => {
    App.S.setSettings({ onboarded: true, roles: ['student'] });
    App.S.upsert('tasks', { id: 'k1', title: 'واجب', due_at: new Date().toISOString(), kind: 'task' });
  });
  const audit = () => page.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[hidden],[aria-hidden="true"]'); };
    const root = document.querySelector('dialog[open]') || document.body, out = [];
    root.querySelectorAll('button, a[href]').forEach((e) => { if (vis(e) && !(e.getAttribute('aria-label') || e.title || e.textContent).trim()) out.push('noname ' + e.outerHTML.slice(0, 60)); });
    root.querySelectorAll('input:not([type=hidden]), select, textarea').forEach((e) => {
      if (vis(e) && !(e.getAttribute('aria-label') || e.placeholder || (e.id && document.querySelector('label[for="' + e.id + '"]')) || e.closest('label') || (e.closest('.field') && e.closest('.field').querySelector('label')))) out.push('nolabel ' + e.outerHTML.slice(0, 60));
    });
    const hb = document.querySelector('.top').getBoundingClientRect().bottom, nb = document.querySelector('nav.tabbar').getBoundingClientRect().top;
    root.querySelectorAll('.check, .icon-x, .link, .icon-btn, .chip, .seg button, .stepper button, #sheetCancel, #sheetSave, .cup').forEach((e) => {
      const r = e.getBoundingClientRect(); if (!vis(e) || r.bottom < 0 || r.top > innerHeight) return;
      if (!e.closest('header, nav, dialog') && (r.top - 22 < hb || r.bottom + 22 > nb)) return;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2, H = Math.max(r.height / 2 - 1, 21), W = e.classList.contains('cup') ? r.width / 2 + 1 : Math.max(r.width / 2 - 1, 21);
      for (const [x, y] of [[cx, cy - H], [cx, cy + H], [cx - W, cy], [cx + W, cy]]) {
        if (x < 1 || y < 1 || x > innerWidth - 1 || y > innerHeight - 1) continue;
        const hit = document.elementFromPoint(x, y);
        if (hit !== e && !e.contains(hit)) { out.push('small ' + (e.getAttribute('aria-label') || e.textContent.trim()).slice(0, 20)); break; }
      }
    });
    return out;
  });
  for (const go of ['today', 'money', 'tasks', 'schedule']) {
    await store(page, (t) => { App.go(t); scrollTo(0, 0); }, go);
    expect(await audit(), go).toEqual([]);
  }
  await store(page, () => App.txForm());
  expect(await audit(), 'tx form').toEqual([]);
});

test('accessibility: dark mode keeps text readable (tools sheet tiles and muted text on the hero)', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await open(page);
  await store(page, () => App.S.setSettings({ onboarded: true }));
  await page.click('#toolsBtn');
  const bg = await page.locator('[data-tool="payday"]').evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(bg).not.toBe('rgb(255, 255, 255)');
  const muted = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--muted').trim().toUpperCase());
  expect(muted).toBe('#9EAEAF');   // 5.36:1 على خلفية الـ hero الداكنة (#133A3E)
});

// ================= DW-027/028: تخطيط السفر (والعمرة نوع رحلة) =================
// التاريخ بتوقيت البحرين مثل المتصفح بالاختبار (playwright.config timezoneId)، وإلا بين 9 و12 بالليل UTC يطلع يوم ناقص
const inDays = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Bahrain' });

test('travel planner: a new trip gets a packing list for its kind, budget vs spent, countdown; all on the device', async ({ page }) => {
  await open(page);
  await store(page, () => App.S.setSettings({ onboarded: true }));
  await page.click('#toolsBtn');
  await page.click('[data-tool="travel"]');
  await expect(page.locator('#sheetTitle')).toHaveText('🧳 تخطيط السفر');
  await page.click('#tvNew');
  await page.fill('#tvName', 'إسطنبول');
  await page.selectOption('#tvKind', 'leisure');
  await page.fill('#tvGo0', inDays(21)); await page.fill('#tvBack0', inDays(26));
  await page.click('#sheetSave');
  await expect(page.locator('#sheetTitle')).toHaveText('🧳 إسطنبول');
  await expect(page.locator('#tvCount')).toHaveText('باقي 21 يوم على السفر');
  await expect(page.locator('#tvDone')).toHaveText('0/16');   // 14 أساسية + 2 للسياحة
  await expect(page.locator('#tvList')).toContainText('ملابس سباحة');
  await expect(page.locator('#tvList')).not.toContainText('الإحرام');
  await expect(page.locator('#tvList .group-title').first()).toContainText('أوراق');
  await page.click('#tvPlan');
  await page.fill('#tvP_flight', '120'); await page.fill('#tvP_hotel', '250');
  await page.click('#sheetSave');
  await page.click('#tvAdd');
  await page.fill('#tvA', '118.500');
  await page.click('#sheetSave');
  await expect(page.locator('#tvSpent')).toContainText('118.500');
  await expect(page.locator('#sheetBody')).toContainText('باقي 251.500');
  await expect(page.locator('#sheetBody')).toContainText('بالليلة');
  await page.click('#tvList [data-tv="0"]:not([data-del])');
  await page.selectOption('#tvGroup', 'إلكترونيات'); await page.fill('#tvItem', 'سماعات'); await page.click('#tvItemAdd');
  await expect(page.locator('#tvDone')).toHaveText('1/17');
  // DW-035: الرحلة بجدول trips (تتزامن مع الحساب)، مو بالإعدادات ولا بالمصاريف
  const st = await store(page, () => ({ tx: App.st.transactions.length, settings: JSON.stringify(App.st.settings), trips: App.st.trips, local: localStorage.getItem('hayati-trips') }));
  expect(st.tx).toBe(0);
  expect(st.settings).not.toMatch(/trip|إسطنبول/);
  expect(st.trips.length).toBe(1);
  expect(st.local || '[]').toBe('[]');
  expect(st.trips[0].check.find((c) => c.t === 'سماعات').g).toBe('إلكترونيات');
  await page.click('#sheetCancel');
  await store(page, () => App.go('today'));
  await expect(page.locator('[data-action="trip"]')).toContainText('إسطنبول: باقي 21 يوم على السفر');
  await page.click('[data-action="trip"]');
  await expect(page.locator('#sheetTitle')).toHaveText('🧳 إسطنبول');
});

test('travel planner: Umrah from «عبادتي» is a trip with its own items; an old Umrah plan moves over; expenses stay neutral', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hayati-umrah', JSON.stringify({ go: '', back: '', plan: { package: 95 }, costs: [{ id: 'c1', cat: 'package', amount: 50, note: '' }], check: [{ t: 'جواز السفر', on: true }] })));
  await open(page);
  await store(page, () => App.S.setSettings({ onboarded: true }));
  await store(page, () => window.Extras.Umrah.sheet());
  await expect(page.locator('#sheetTitle')).toHaveText('🧳 العمرة');
  await expect(page.locator('#tvSpent')).toContainText('50.000');
  const moved = await store(page, () => ({ old: localStorage.getItem('hayati-umrah'), trips: JSON.parse(localStorage.getItem('hayati-trips')) }));
  expect(moved.old).toBeNull();
  expect(moved.trips[0].plan.visa).toBe(95);
  await page.click('#tvAdd');
  await page.selectOption('#tvC', 'hotel'); await page.fill('#tvA', '75'); await page.check('#tvTx');
  await page.click('#sheetSave');
  const tx = await store(page, () => App.st.transactions.map((t) => t.note));
  expect(tx).toEqual(['سفر · السكن']);
  // رحلة عمرة جديدة تجي فيها أغراضها
  await store(page, () => { localStorage.removeItem('hayati-trips'); window.Extras.Umrah.sheet(); });
  await expect(page.locator('#tvList')).toContainText('ملابس الإحرام');
});

test('trip countdown phases, and Arabic day counts (3–10 أيام, 11+ يوم)', async ({ page }) => {
  await open(page);
  const r = await store(page, ([a, b, c]) => {
    const U = window.Extras.Travel;
    return { before: U.countdown({ go: a }).text, today: U.countdown({ go: b }).text, during: U.countdown({ go: c, back: a }).text, after: U.countdown({ go: c, back: c }).text,
      n3: App.nDays(3), n10: App.nDays(10), n11: App.nDays(11), n21: App.nDays(21) };
  }, [inDays(3), inDays(0), inDays(-2)]);
  expect(r.before).toBe('باقي 3 أيام على السفر');
  expect(r.today).toBe('السفر اليوم ✈️');
  expect(r.during).toBe('رحلة موفقة 🤍');
  expect(r.after).toBe('ترجع بالسلامة 🤍');
  expect([r.n3, r.n10, r.n11, r.n21]).toEqual(['3 أيام', '10 أيام', '11 يوم', '21 يوم']);
});

test('English: «21 يوم» (11+ days) translates like «3 أيام»', async ({ page }) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem('i')) { localStorage.setItem('hayati-lang', 'en'); sessionStorage.setItem('i', '1'); } });
  await open(page);
  expect(await store(page, () => window.HayatiLang.tr('بعد 21 يوم · قبل 12 يوم · باقي 21 يوم'))).toBe('in 21 days · 12 days ago · Left 21 days');
});

test('accessibility (DW-045): every form field has a name for screen readers, and past schedule items keep readable contrast', async ({ page }) => {
  await open(page);
  const unnamed = async () => store(page, () => [...document.querySelectorAll('#sheetBody input:not([type=hidden]), #sheetBody select, #sheetBody textarea')]
    .filter((c) => !(c.getAttribute('aria-label') || c.placeholder || c.closest('label') || (c.id && document.querySelector('label[for="' + c.id + '"]'))))
    .map((c) => c.outerHTML.slice(0, 80)));
  await store(page, () => App.txForm()); await page.waitForTimeout(100);
  expect(await unnamed()).toEqual([]);
  expect(await store(page, () => document.querySelector('#sheetBody [name=occurred_at]').getAttribute('aria-label'))).toBe('الوقت');
  await store(page, () => App.closeSheet());
  await page.click('#settingsBtn'); await page.waitForTimeout(100);
  expect(await unnamed()).toEqual([]);
  expect(await store(page, () => getComputedStyle(document.body).getPropertyValue('--text-2').trim())).toBe('#33494D');
});

test('your categories (DW-043): fix a shop once, older ones follow if you agree, and the next message from it is right', async ({ page }) => {
  await open(page);
  await store(page, () => {
    const S = App.S; S.setSettings({ onboarded: true });
    const d = new Date().toISOString();
    for (const [id, m] of [['m1', 'ALDANA STORE SEEF'], ['m2', 'ALDANA STORE MANAMA'], ['m3', 'ALDANA STORE']]) S.upsert('transactions', { id, kind: 'expense', amount: 4, merchant: m, category: 'أخرى', occurred_at: d, source: 'sms' });
    App.ui.moneySeg = 'tx'; App.go('money');
  });
  await page.click('[data-action="edit-tx"][data-id="m1"]');
  await page.click('#sheetBody .cat-pick[data-c="بقالة وتسوق"]');
  await page.click('#sheetSave');
  await expect(page.locator('#askDlg')).toBeVisible();
  await expect(page.locator('#askDlg p')).toContainText('2 عمليات');
  await page.click('#askDlg [data-ok]');
  await expect.poll(() => store(page, () => App.st.transactions.filter((t) => t.category === 'بقالة وتسوق').length)).toBe(3);
  // الرسالة الجاية من نفس المحل (فرع ثاني)
  const next = await store(page, () => App.S.smsToTransaction('Purchase of BHD 6.500 at ALDANA STORE JUFFAIR', new Date().toISOString()));
  expect(next.category).toBe('بقالة وتسوق');
  // تنحفظ على الجهاز وتطلع مع النسخة المشفّرة
  expect(await store(page, () => JSON.parse(localStorage.getItem('hayati-merchant-cats'))['e:aldana'])).toBe('بقالة وتسوق');
  expect(await store(page, async () => Object.keys((await window.HayatiBackup.pack(false)).local))).toContain('hayati-merchant-cats');
});

test('performance (DW-042): 2000 saves in a row write and redraw once, and month/day lists come from one index', async ({ page }) => {
  await open(page);
  const r = await store(page, async () => {
    const S = App.S; let emits = 0; let writes = 0;
    const off = S.subscribe(() => emits++);
    const set = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (k, v) => { if (k === 'hayati-v1') writes++; return set(k, v); };
    const t0 = performance.now(), now = Date.now();
    for (let i = 0; i < 2000; i++) S.upsert('transactions', { kind: 'expense', amount: 1, category: 'قهوة', merchant: 'x', occurred_at: new Date(now - i * 36e5).toISOString() });
    const syncMs = performance.now() - t0;
    await Promise.resolve(); await new Promise((r) => setTimeout(r, 0));
    localStorage.setItem = set; off();
    const m = App.monthKey(new Date());
    const a = App.txInMonth(m), b = App.st.transactions.filter((t) => App.monthKey(new Date(t.occurred_at)) === m);
    const today = App.txOnDay(new Date()).length, todayRef = App.st.transactions.filter((t) => App.sameDay(new Date(t.occurred_at), new Date())).length;
    // تعديل بعد الفهرسة يبين على طول (الفهرس ينبني من جديد)
    S.upsert('transactions', { kind: 'expense', amount: 2, category: 'قهوة', occurred_at: new Date().toISOString() });
    return { syncMs, emits, writes, same: a.length === b.length && a.every((t, i) => i === 0 || new Date(a[i - 1].occurred_at) >= new Date(t.occurred_at)), today, todayRef, after: App.txOnDay(new Date()).length };
  });
  expect(r.emits).toBe(1);
  expect(r.writes).toBe(1);
  expect(r.syncMs).toBeLessThan(3000);
  expect(r.same).toBe(true);
  expect(r.today).toBe(r.todayRef);
  expect(r.after).toBe(r.today + 1);
});

test('month report as an image (DW-041): numbers hidden by default, no shop names, draws a 1080×1350 PNG and saves it', async ({ page }) => {
  await open(page);
  const r = await store(page, async () => {
    const S = App.S; S.setSettings({ onboarded: true, budget: 400 });
    const now = new Date(), d = new Date(now.getFullYear(), now.getMonth(), 1, 12);
    S.upsert('transactions', { kind: 'expense', amount: 45.5, category: 'أكل ومطاعم', merchant: 'مطعم سرّي', occurred_at: d.toISOString() });
    S.upsert('transactions', { kind: 'expense', amount: 12, category: 'قهوة', merchant: 'Costa', occurred_at: d.toISOString() });
    const R = window.Extras.ReportImage, m = App.monthKey(now), data = R.data(m);
    const c = await R.draw(m, false);
    return { data, w: c.width, h: c.height, png: c.toDataURL('image/png').length };
  });
  expect([r.w, r.h]).toEqual([1080, 1350]);
  expect(r.png).toBeGreaterThan(20000);
  expect(r.data.cats.map((c) => [c.name, c.pct])).toEqual([['أكل ومطاعم', 79], ['قهوة', 21]]);
  expect(r.data.budgetPct).toBe(14);
  expect(JSON.stringify(r.data)).not.toMatch(/مطعم سرّي|Costa/);   // ما فيها أسماء محلات

  // من «تقرير الشهر» ← «🖼️ صورة التقرير» ← احفظ
  await store(page, () => { App.ui.moneySeg = 'tx'; App.go('money'); });
  await page.click('[data-action="report"]');
  await page.click('#reportImg');
  await expect(page.locator('#riImg')).toHaveAttribute('src', /^data:image\/png/);
  const first = await page.locator('#riImg').getAttribute('src');
  await page.check('#riAmounts');
  await expect.poll(() => page.locator('#riImg').getAttribute('src')).not.toBe(first);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#sheetSave')]);
  expect(dl.suggestedFilename()).toMatch(/^hayati-report-\d{4}-\d{2}\.png$/);
});

test('goal photo (DW-040): pick a photo, it shows on the card, survives a reload, stays off the server, rides in the encrypted backup, and can be removed', async ({ page }) => {
  // صورة PNG صغيرة (8×8 أحمر) تتولّد بالمتصفح
  await open(page);
  const png = await store(page, () => { const c = document.createElement('canvas'); c.width = c.height = 8; const x = c.getContext('2d'); x.fillStyle = '#e11'; x.fillRect(0, 0, 8, 8); return c.toDataURL('image/png').split(',')[1]; });
  await store(page, () => { App.S.setSettings({ onboarded: true }); App.ui.moneySeg = 'goals'; App.go('money'); });
  await page.click('[data-action="add-goal"] >> nth=0');
  await page.fill('#sheetBody [name=name]', 'سيارة');
  await page.fill('#sheetBody [name=target]', '3000');
  await page.setInputFiles('#gpFile', { name: 'car.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.locator('#gpPreview img')).toHaveAttribute('src', /^data:image\/jpeg/);
  await page.click('#sheetSave');
  await expect(page.locator('.card.goal .goal-photo img')).toHaveCount(1);
  const g = await store(page, () => App.st.goals.find((x) => x.name === 'سيارة'));
  expect(JSON.stringify(g)).not.toContain('data:image');            // الصورة ما تدخل بيانات الحساب
  expect(await store(page, () => App.S.exportJSON())).not.toContain('data:image');

  await page.reload(); await page.waitForFunction(() => window.App && App.st);
  await store(page, () => { App.ui.moneySeg = 'goals'; App.go('money'); });
  await expect(page.locator('.card.goal .goal-photo img')).toHaveCount(1);

  // النسخة المشفّرة تشيلها وترجّعها
  const pack = await store(page, () => window.HayatiBackup.pack(false));
  expect(Object.keys(pack.photos)).toEqual([g.id]);
  await store(page, (id) => window.Extras.GoalPhoto.drop(id), g.id);
  await store(page, (p) => window.HayatiBackup.unpack(p), pack);
  expect(await store(page, (id) => !!window.Extras.GoalPhoto.get(id), g.id)).toBe(true);

  // شيل الصورة من النموذج
  await page.click('.card.goal');
  await page.click('#gpDel');
  await page.click('#sheetSave');
  await expect(page.locator('.card.goal .goal-photo')).toHaveCount(0);
  expect(await store(page, (id) => window.Extras.GoalPhoto.get(id), g.id)).toBeNull();
});

test('encrypted backup (DW-029): one file with account + device data + recordings, no plaintext inside, wrong password refused, restore works', async ({ page }) => {
  await open(page);
  await store(page, async () => {
    App.S.setSettings({ onboarded: true });
    App.S.upsert('transactions', { id: App.S.uuid(), type: 'expense', amount: 7.25, merchant: 'مطعم سرّي جداً', category: 'food', occurred_at: new Date().toISOString() });
    localStorage.setItem('hayati-trips', JSON.stringify([{ id: 't1', name: 'رحلة لندن السرية', kind: 'leisure', check: [] }]));
    localStorage.setItem('hayati-supabase', 'session-token-must-not-leave');
    await window.Extras.Lectures.putClip('clip-1', new Blob([new Uint8Array([1, 2, 3, 4, 5])], { type: 'audio/webm' }));
  });
  // من الإعدادات: كلمة سر قصيرة / غير متطابقة تنرفض، والصحيحة تحفظ الملف
  await page.evaluate(() => { window.HayatiNative = { saveFile: async (name, text, mime) => { window.__saved = { name, text, mime }; return true; } }; });
  await page.click('#settingsBtn');
  await page.click('#sheetBody [data-set="secure-backup"]');
  await expect(page.locator('#sheetTitle')).toHaveText('🔐 نسخة مشفّرة');
  await expect(page.locator('#bkSize')).toContainText('1');
  await page.fill('#bkP1', 'short'); await page.fill('#bkP2', 'short'); await page.click('#sheetSave');
  await expect(page.locator('#toast')).toContainText('8 حروف');
  await page.fill('#bkP1', 'Abu-Jafar-2026'); await page.fill('#bkP2', 'Abu-Jafar-2027'); await page.click('#sheetSave');
  await expect(page.locator('#toast')).toContainText('مو نفس');
  await page.fill('#bkP2', 'Abu-Jafar-2026'); await page.check('#bkAudio'); await page.click('#sheetSave');
  await page.waitForFunction(() => window.__saved, null, { timeout: 10000 });
  const saved = await store(page, () => window.__saved);
  expect(saved.name).toMatch(/^hayati-secure-\d{4}-\d{2}-\d{2}\.json$/);
  const file = JSON.parse(saved.text);
  expect(file).toMatchObject({ app: 'hayati', v: 1, cipher: 'AES-GCM', kdf: { name: 'PBKDF2', hash: 'SHA-256', iter: 250000 } });
  for (const plain of ['مطعم', 'لندن', 'Abu-Jafar', 'transactions', 'session-token']) expect(saved.text).not.toContain(plain);
  // كلمة سر غلط ما تفتح، والصح يفتح وما فيه جلسة الدخول
  const wrong = await store(page, (t) => HayatiBackup.decrypt(t, 'nope-nope').then(() => 'opened', (e) => e.message), saved.text);
  expect(wrong).toBe('wrong');
  const inner = await store(page, (t) => HayatiBackup.decrypt(t, 'Abu-Jafar-2026'), saved.text);
  expect(inner.store).toContain('رحلة لندن السرية');   // DW-035: الرحلات صارت ضمن بيانات الحساب
  expect(Object.keys(inner.local)).not.toContain('hayati-supabase');
  expect(inner.clips).toHaveLength(1);
  // نمسح كل شي ونسترجع من الملف عن طريق «استيراد»
  await store(page, async () => {
    App.st.transactions.splice(0); App.st.trips.splice(0); localStorage.removeItem('hayati-trips');
    await new Promise((ok) => { const r = indexedDB.open('hayati-audio', 1); r.onsuccess = () => { const tx = r.result.transaction('clips', 'readwrite'); tx.objectStore('clips').clear(); tx.oncomplete = () => { r.result.close(); ok(); }; }; });
  });
  await page.click('#settingsBtn');
  await page.setInputFiles('[data-set="import"]', { name: 'hayati-secure.json', mimeType: 'application/json', buffer: Buffer.from(saved.text) });
  await expect(page.locator('#sheetTitle')).toHaveText('🔐 افتح النسخة');
  await page.fill('#bkPass', 'wrong-password'); await page.click('#sheetSave');
  await expect(page.locator('#toast')).toContainText('كلمة السر غلط');
  await page.fill('#bkPass', 'Abu-Jafar-2026'); await page.click('#sheetSave');
  await expect(page.locator('#toast')).toContainText('1 تسجيل');
  const back = await store(page, async () => ({
    tx: App.st.transactions.map((t) => t.merchant),
    trip: window.Extras.Travel.all()[0].name,
    clip: Array.from(new Uint8Array(await (await window.Extras.Lectures.getClip('clip-1')).arrayBuffer())),
  }));
  expect(back).toEqual({ tx: ['مطعم سرّي جداً'], trip: 'رحلة لندن السرية', clip: [1, 2, 3, 4, 5] });
});

// DW-030 (البند 15): أي نص جديد بالواجهة بدون ترجمة يطيّح هالاختبار. لإضافة ترجمة: js/i18n/i18n-en.js
//   تقرير كامل أعمق: DEEP=1 node tests/tools/i18n-audit.js out.json
test('English: every screen, sheet and settings item has a translation (no Arabic left outside user data)', async ({ page }) => {
  test.setTimeout(180000);
  const { crawl, seed } = require('./tools/i18n-audit.js');
  await page.addInitScript(() => { if (!sessionStorage.getItem('i')) { localStorage.setItem('hayati-lang', 'en'); sessionStorage.setItem('i', '1'); } });
  await open(page);
  await page.evaluate(seed);
  // الكاشف نفسه يشتغل: نص عربي بدون ترجمة ينمسك، وبيانات المستخدم (bdi) لا
  await store(page, () => { const d = document.createElement('p'); d.innerHTML = 'نص تجريبي بدون ترجمة <bdi>اسم كتبه المستخدم</bdi>'; document.getElementById('view').appendChild(d); });
  await page.waitForFunction(() => HayatiLang.missing().length > 0);
  expect(await store(page, () => HayatiLang.missing())).toEqual(['نص تجريبي بدون ترجمة']);
  await store(page, () => App.render());
  const left = (await crawl(page, false)).filter((x) => x.s !== 'نص تجريبي بدون ترجمة');
  expect(left).toEqual([]);
});

test('Android widget (DW-031): snapshot hides amounts by default, shows nothing when locked, next items in time order', async ({ page }) => {
  await open(page);
  const snap = await store(page, () => {
    const now = new Date(); now.setHours(9, 0, 0, 0);
    const S = App.S, d = now.getDay();
    S.setSettings({ onboarded: true, budget: 200, payday: 1 });
    S.upsert('transactions', { id: 'w1', kind: 'expense', amount: 50, merchant: 'x', category: 'قهوة', occurred_at: now.toISOString() });
    S.upsert('courses', { id: 'c2', name: 'Marketing', type: 'lecture', days: [d], start_time: '13:00', end_time: '14:15', room: 'S20' });
    S.upsert('courses', { id: 'c1', name: 'Accounting', type: 'lecture', days: [d], start_time: '10:00', end_time: '11:15', room: 'S40' });
    const W = window.Extras.Widget;
    const hidden = W.snapshot(now);
    localStorage.setItem('hayati-widget', JSON.stringify({ amounts: true }));
    const shown = W.snapshot(now);
    localStorage.setItem('hayati-lock', JSON.stringify({ h: 'x' }));
    const locked = W.snapshot(now);
    localStorage.removeItem('hayati-lock'); localStorage.removeItem('hayati-widget');
    return { hidden, shown, locked };
  });
  expect(snap.hidden.budget).toEqual({ line: 'باقي 75% من الميزانية', pct: 75 });
  expect(JSON.stringify(snap.hidden)).not.toContain('150');
  expect(snap.shown.budget.line).toBe('باقي 150.000 د.ب من الميزانية');
  expect(snap.hidden.items.map((x) => x.title).filter((t) => /^[A-Z]/.test(t))).toEqual(['Accounting', 'Marketing']);
  expect(snap.hidden.items.map((x) => x.t)).toEqual(snap.hidden.items.map((x) => x.t).slice().sort((a, b) => a - b));
  expect(snap.hidden.items[0].sub).toContain('S40');
  expect(snap.hidden.rtl).toBe(true);
  expect(snap.locked).toMatchObject({ locked: true, items: [] });
  expect(snap.locked.budget).toBeUndefined();
  // الودجت الصغير (DW-039): نفس الإخفاء، ولا شي وقت القفل
  expect(snap.hidden.small).toEqual({ big: '75%', cap: 'باقي من الميزانية', pct: 75 });
  expect(snap.shown.small).toEqual({ big: '150.000', cap: 'د.ب باقي هالشهر', pct: 75 });
  expect(snap.locked.small).toBeUndefined();
  // DW-055: «جدول اليوم» يشمل اللي خلص اليوم (يطلع باهت)، بالبداية والنهاية، ولا شي وقت القفل
  const today = snap.hidden.sched.filter((x) => new Date(x.s).toDateString() === new Date(snap.hidden.at).toDateString()).map((x) => [x.title, x.time, x.e - x.s]);
  expect(today).toEqual([['Accounting', '10:00 ص – 11:15 ص', 75 * 6e4], ['Marketing', '1:00 م – 2:15 م', 75 * 6e4]]);
  expect(snap.hidden.labels.schedToday).toBe('جدول اليوم');
  expect(snap.locked.sched).toEqual([]);
});

test('Android widget (DW-031): the app sends the snapshot to the native plugin, and the widget buttons open «+ مصروف»', async ({ page }) => {
  await page.addInitScript(() => {
    window.__wg = { sent: [], listeners: {} };
    window.Capacitor = { getPlatform: () => 'android', Plugins: { HayatiWidget: {
      update: async (o) => { window.__wg.sent.push(JSON.parse(o.data)); },
      take: async () => ({ name: 'add-tx' }),
      addListener: (ev, fn) => { window.__wg.listeners[ev] = fn; return Promise.resolve({ remove() {} }); },
    } } };
  });
  await open(page);
  // زر الودجت «+ مصروف» فتح التطبيق: نافذة المصروف تفتح
  await expect(page.locator('#sheet[open] [name="amount"]')).toBeVisible({ timeout: 5000 });
  await store(page, () => App.closeSheet());
  await page.waitForFunction(() => window.__wg.sent.length > 0, null, { timeout: 8000 });
  const first = await store(page, () => window.__wg.sent[window.__wg.sent.length - 1]);
  expect(first).toMatchObject({ v: 1, locked: false, labels: { add: '+ مصروف', paste: 'الصق رسالة' } });
  // التطبيق مفتوح وضغطت «الصق رسالة» بالودجت
  await store(page, () => window.__wg.listeners.action({ name: 'paste-sms' }));
  await expect(page.locator('#sheetTitle')).toContainText('رسالة بنك');   // أول مرة: الموافقة قبل اللصق
  await store(page, () => App.closeSheet());
  // من الإعدادات: «اعرض المبالغ» يحدّث الودجت على طول
  await store(page, () => { App.S.setSettings({ budget: 100 }); window.__wg.sent.length = 0; });
  await page.click('#settingsBtn');
  await page.click('#sheetBody [data-set="widget"]');
  await page.check('#wgAmounts'); await page.click('#sheetSave');
  await page.waitForFunction(() => window.__wg.sent.length > 0);
  expect(await store(page, () => window.__wg.sent[window.__wg.sent.length - 1].budget.line)).toBe('باقي 100.000 د.ب من الميزانية');
});

test('iPhone widget (DW-044): the app sends the same snapshot on iOS, the widget links open «+ مصروف» and «الصق رسالة», iOS install steps', async ({ page }) => {
  await page.addInitScript(() => {
    window.__wg = { sent: [], url: null };
    window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'ios', Plugins: {
      HayatiWidget: { update: async (o) => { window.__wg.sent.push(JSON.parse(o.data)); }, take: async () => ({}), addListener: () => Promise.resolve({ remove() {} }) },
      App: { addListener: (ev, fn) => { if (ev === 'appUrlOpen') window.__wg.url = fn; return Promise.resolve({ remove() {} }); } },
    } };
  });
  await open(page);
  await store(page, () => App.S.setSettings({ onboarded: true, budget: 200 }));
  await page.waitForFunction(() => window.__wg.sent.length > 0, null, { timeout: 8000 });
  const snap = await store(page, () => window.__wg.sent[window.__wg.sent.length - 1]);
  expect(snap).toMatchObject({ v: 1, locked: false, rtl: true, small: { cap: 'باقي من الميزانية' }, labels: { add: '+ مصروف' } });
  // زر «+ مصروف» بالودجت = رابط bh.hayati.app://widget/add-tx
  await page.waitForFunction(() => typeof window.__wg.url === 'function');
  await store(page, () => window.__wg.url({ url: 'bh.hayati.app://widget/add-tx' }));
  await expect(page.locator('#sheet[open] [name="amount"]')).toBeVisible({ timeout: 5000 });
  await store(page, () => App.closeSheet());
  await store(page, () => window.__wg.url({ url: 'bh.hayati.app://widget/paste-sms' }));
  await expect(page.locator('#sheetTitle')).toContainText('رسالة بنك');
  await store(page, () => App.closeSheet());
  // رابط الدخول ما يتأثر، و«open» يفتح التطبيق بس
  await expect(page.locator('#sheet[open]')).toHaveCount(0);
  await store(page, () => window.__wg.url({ url: 'bh.hayati.app://widget/open' }));
  await page.waitForTimeout(500);
  await expect(page.locator('#sheet[open]')).toHaveCount(0);
  // خطوات التثبيت بالآيفون
  await page.click('#settingsBtn');
  await page.click('#sheetBody [data-set="widget"]');
  await expect(page.locator('#sheetBody')).toContainText('«+» فوق');
});

test('travel currency (DW-032): pegged rates prefilled, floating ones need a rate, costs in local currency convert to BHD', async ({ page }) => {
  await open(page);
  await store(page, () => {
    App.S.setSettings({ onboarded: true });
    localStorage.setItem('hayati-trips', JSON.stringify([{ id: 't1', name: 'دبي', kind: 'leisure', go: '', back: '', plan: { hotel: 100 }, costs: [], check: [] }]));
    window.Extras.Travel.tripSheet('t1');
  });
  await expect(page.locator('#tvCurNote')).toContainText('اختار عملة البلد');
  await page.selectOption('#tvCur', 'AED');
  await expect(page.locator('#tvRate')).toHaveValue('9.7672');                   // الدرهم مربوط بالدولار، والدينار بعد
  await expect(page.locator('#tvCurNote')).toContainText('تقدير');
  // المحوّل بالاتجاهين
  await page.fill('#tvFx', '100'); await expect(page.locator('#tvFxB')).toHaveValue('10.238');
  await page.fill('#tvFxB', '1');  await expect(page.locator('#tvFx')).toHaveValue('9.77');
  await expect(page.locator('#tvCurNote').locator('xpath=..')).toContainText('976.72 AED');
  // مصروف بالدرهم ينحفظ بالدينار ومعه المبلغ الأصلي
  await page.click('#tvAdd');
  await page.selectOption('#tvC', 'hotel'); await page.fill('#tvA', '488.36');
  await expect(page.locator('#tvAB')).toContainText('50.000');
  await page.click('#sheetSave');
  const cost = await store(page, () => App.st.trips[0].costs[0]);   // DW-035: بالحساب
  expect(cost).toMatchObject({ amount: 50, orig: { code: 'AED', value: 488.36, rate: 9.7672 } });
  await expect(page.locator('#tvSpent')).toContainText('50.000');
  // عملة سعرها يتغيّر: ما فيه سعر جاهز، ولازم يكتبه
  await page.selectOption('#tvCur', 'TRY');
  await expect(page.locator('#tvRate')).toHaveValue('');
  await expect(page.locator('#tvCurNote')).toContainText('سعرها يتغيّر');
  await expect(page.locator('#tvFx')).toHaveCount(0);
  await page.fill('#tvRate', '91.5'); await page.locator('#tvRate').dispatchEvent('change');
  await expect(page.locator('#tvFx')).toBeVisible();
  expect(await store(page, () => window.Extras.Travel.toBHD({ cur: { code: 'TRY', rate: 91.5 } }, 915))).toBe(10);
});

test('trip reminder (DW-033): 3 days before and the night before at 8 pm, with how many items are left; Today says «باقي N أغراض»', async ({ page }) => {
  await page.addInitScript(() => {
    window.Capacitor = { isNativePlatform: () => true, Plugins: { LocalNotifications: {
      checkPermissions: async () => ({ display: 'granted' }), requestPermissions: async () => ({ display: 'granted' }),
      getPending: async () => ({ notifications: [] }), cancel: async () => {}, schedule: async () => {},
    } } };
  });
  await open(page);
  const r = await store(page, () => {
    App.S.setSettings({ onboarded: true });
    const k = (off) => { const d = new Date(); d.setDate(d.getDate() + off); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    const check = [{ g: 'أوراق', t: 'جواز السفر', on: true }, { g: 'أوراق', t: 'التأشيرة', on: false }, { g: 'ملابس', t: 'ملابس سباحة', on: false }, { g: 'صحة', t: 'أدوية', on: false }, { g: 'أغراض', t: 'شاحن', on: false }];
    localStorage.setItem('hayati-trips', JSON.stringify([
      { id: 't1', name: 'إسطنبول', kind: 'leisure', go: k(5), back: '', plan: {}, costs: [], check },
      { id: 't2', name: 'بدون تاريخ', kind: 'work', go: '', back: '', plan: {}, costs: [], check: [] },
    ]));
    const now = new Date(); now.setHours(9, 0, 0, 0);
    const pick = (opts) => HayatiNative.upcoming(now, opts).filter((n) => n.extra && n.extra.kind === 'trip').map((n) => ({ t: n.title, b: n.body, at: n.schedule.at.getTime() }));
    const on = pick({ trips: true }), off = pick({ trips: false });
    const at3 = new Date(); at3.setDate(at3.getDate() + 2); at3.setHours(20, 0, 0, 0);
    // بعد ما يخلص التجهيز، الرسالة تتغيّر
    const all = window.Extras.Travel.all(); all[0].check.forEach((c) => { c.on = true; });
    return { on, off, at3: at3.getTime(), ready: window.Extras.Travel.leftLine(all[0]) };
  });
  expect(r.off).toEqual([]);
  expect(r.on.map((x) => x.t)).toEqual(['🏖️ باقي 3 أيام على إسطنبول', '✈️ بكرة السفر: إسطنبول']);
  expect(r.on[0].at).toBe(r.at3);
  expect(r.on[0].b).toBe('باقي 4 أغراض: التأشيرة، ملابس سباحة، أدوية…');
  expect(r.ready).toBe('كل أغراضك جاهزة ✓');
  // شاشة اليوم: قبل السفر بـ 3 أيام أو أقل يطلع «باقي N أغراض»
  await store(page, () => {
    const t = window.Extras.Travel.all()[0];
    const d = new Date(); d.setDate(d.getDate() + 2);
    t.go = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    App.S.upsert('trips', t); App.go('today');
  });
  await expect(page.locator('#view [data-action="trip"]')).toContainText('باقي 4 أغراض');
});

test('English: scheduled notifications are translated too (they leave the page, so the DOM layer misses them)', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('i')) { localStorage.setItem('hayati-lang', 'en'); sessionStorage.setItem('i', '1'); }
    window.Capacitor = { isNativePlatform: () => true, Plugins: { LocalNotifications: {
      checkPermissions: async () => ({ display: 'granted' }), requestPermissions: async () => ({ display: 'granted' }),
      getPending: async () => ({ notifications: [] }), cancel: async () => {}, schedule: async () => {},
    } } };
  });
  await open(page);
  const n = await store(page, () => {
    const k = (off) => { const d = new Date(); d.setDate(d.getDate() + off); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    localStorage.setItem('hayati-trips', JSON.stringify([{ id: 't1', name: 'Istanbul', kind: 'leisure', go: k(5), back: '', plan: {}, costs: [], check: [{ g: 'أوراق', t: 'جواز السفر (صالح 6 أشهر على الأقل)', on: false }] }]));
    const now = new Date(); now.setHours(9, 0, 0, 0);
    return HayatiNative.upcoming(now, { trips: true }).filter((x) => x.extra.kind === 'trip').map((x) => x.title + ' | ' + x.body);
  });
  expect(n).toEqual(['🏖️ 3 days to Istanbul | Left 1 item: Passport (valid 6+ months)', '✈️ Travelling tomorrow: Istanbul | Left 1 item: Passport (valid 6+ months)']);
});

test('lectures photo (DW-034): a board photo is shrunk on the device, sent once, and its text is added to the notes', async ({ page }) => {
  await open(page);
  await asStudent(page);
  await store(page, () => {
    App.S.status.signedIn = true; window.__aiCalls = []; window.__photoReply = { text: 'Break-even = FC / (P - VC)\nCM ratio = CM / Sales' };
    App.S.invokeFn = async (name, body) => { const i = new Image(); i.src = 'data:image/jpeg;base64,' + body.image; await i.decode(); window.__aiCalls.push({ name, mode: body.mode, media: body.media, len: (body.image || '').length, head: (body.image || '').slice(0, 4), notes: body.notes, w: i.naturalWidth, h: i.naturalHeight }); return window.__photoReply; };
    App.ui.studySeg = 'lectures'; App.go('schedule');
  });
  await page.click('[data-action="lec-new"]');
  await page.fill('[name=lc_notes]', 'ملاحظاتي');
  // صورة كبيرة 3000×2000 تنصغّر لـ 1600 قبل الإرسال
  const png = await store(page, () => { const c = document.createElement('canvas'); c.width = 3000; c.height = 2000; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 3000, 2000); g.fillStyle = '#000'; g.font = '200px sans-serif'; g.fillText('x² + y²', 200, 1000); return c.toDataURL('image/png').split(',')[1]; });
  await page.setInputFiles('#lcPhoto', { name: 'board.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.locator('[name=lc_notes]')).toHaveValue('ملاحظاتي\n\nBreak-even = FC / (P - VC)\nCM ratio = CM / Sales');
  const call = await store(page, () => window.__aiCalls[0]);
  expect(call).toMatchObject({ name: 'lecture-ai', mode: 'photo', media: 'image/jpeg', head: '/9j/' });   // JPEG
  expect(call.notes).toBeUndefined();                                                                       // الصورة بس، مو الملاحظات
  expect([call.w, call.h]).toEqual([1600, 1067]);
  expect(call.len).toBeLessThan(1_000_000);
  // صورة ما تنقرا: ما يتغيّر شي ويطلع تنبيه
  await store(page, () => { window.__photoReply = { text: '' }; });
  await page.setInputFiles('#lcPhoto', { name: 'blur.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.locator('#toast')).toContainText('ما قدرنا نقرا الصورة');
  await expect(page.locator('[name=lc_notes]')).toHaveValue(/CM ratio = CM \/ Sales$/);
});

test('account page (DW-035): Google shows up once Supabase enables it, trips follow the account to another device, Umrah stays on the device', async ({ page }) => {
  await useFakeSupabase(page);
  let asked = 0;
  await page.route('**/auth/v1/settings', (r) => { asked++; r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: JSON.stringify({ external: { google: true, apple: false, email: true } }) }); });
  await open(page);
  await page.evaluate(() => { window.HAYATI_CONFIG.HIDE_PROVIDERS = []; });   // كأن شاشة Google انتشرت (DW-067)
  await store(page, () => App.S.setSettings({ onboarded: true }));
  expect(asked).toBe(0);                                                      // بدون ما تفتح الصفحة: ولا اتصال
  await store(page, () => App.accountSheet());
  await expect(page.locator('[data-set="sso"][data-p="google"]')).toBeVisible();   // من لوحة Supabase، بدون تعديل الكود
  await expect(page.locator('[data-set="sso"][data-p="apple"]')).toHaveCount(0);
  expect(asked).toBe(1);
  // دخول ← رحلة سياحة (تتزامن) + رحلة عمرة (تظل على الجهاز)
  await page.fill('.account-card [name=email]', 'mo@x.bh'); await page.fill('.account-card [name=password]', 'secret-123');
  await page.click('.account-card [data-set="signin"]');
  await page.waitForFunction(() => App.S.status.signedIn);
  await store(page, () => {
    App.S.upsert('trips', { id: 't-ist', name: 'إسطنبول', kind: 'leisure', go: '', back: '', plan: {}, costs: [], check: [] });
    localStorage.setItem('hayati-trips', JSON.stringify([{ id: 't-umr', name: 'العمرة', kind: 'umrah', go: '', back: '', plan: {}, costs: [], check: [] }]));
  });
  await page.waitForFunction(() => (window.__srv.data['u-mo'] || {}).trips && window.__srv.data['u-mo'].trips.length === 1);
  const server = await store(page, () => JSON.stringify(window.__srv.data['u-mo'].trips));
  expect(server).toContain('إسطنبول');
  expect(server).not.toContain('العمرة');
  expect(await store(page, () => window.Extras.Travel.all().map((t) => t.name).sort())).toEqual(['إسطنبول', 'العمرة']);
  // «جهاز ثاني»: نطلع (الجهاز يتفرّغ) وندخل من جديد، والرحلة ترجع من الحساب
  await store(page, () => App.S.signOut({ force: true }));
  expect(await store(page, () => App.st.trips.length)).toBe(0);
  await store(page, () => window.__signInAs('u-mo', 'mo@x.bh'));
  await page.waitForFunction(() => App.st.trips.some((t) => t.name === 'إسطنبول'));
});

test('account nudge (DW-035): Today invites to create an account once there is data worth keeping; «بعدين» hides it for 30 days', async ({ page }) => {
  await useFakeSupabase(page);
  await open(page);
  await store(page, () => { App.S.setSettings({ onboarded: true }); App.go('today'); });
  await expect(page.locator('#accNudge')).toHaveCount(0);                    // ما فيه بيانات تستاهل
  await store(page, () => { for (let i = 0; i < 10; i++) App.S.upsert('transactions', { id: 'n' + i, kind: 'expense', amount: 1, merchant: 'x', category: 'قهوة', occurred_at: new Date().toISOString() }); App.render(); });
  await expect(page.locator('#accNudge')).toContainText('بياناتك على هالجوال بس');
  await page.click('#accNudge [data-action="account"]');
  await expect(page.locator('#sheetTitle')).toHaveText('حسابك');
  await page.click('#sheetCancel'); await page.waitForTimeout(350);
  await page.click('#accNudge [data-action="account-later"]');
  await expect(page.locator('#accNudge')).toHaveCount(0);
});

test('lectures PDF (DW-036): one call fills notes, summary and new questions; too big or not a PDF is refused on the device', async ({ page }) => {
  await open(page);
  await asStudent(page);
  await store(page, () => {
    App.S.status.signedIn = true; window.__aiCalls = [];
    App.S.invokeFn = async (name, body) => {
      window.__aiCalls.push({ name, mode: body.mode, media: body.media, head: (body.image || '').slice(0, 5), title: body.title, notes: body.notes });
      return { notes: 'Break-even = FC / (P - VC)\nCM ratio = CM / Sales', summary: 'نقطة التعادل لما الربح صفر', cards: [{ q: 'What is CM ratio?', a: 'CM / Sales' }, { q: 'Break-even units?', a: 'FC / (P - VC)' }] };
    };
    App.ui.studySeg = 'lectures'; App.go('schedule');
  });
  await page.click('[data-action="lec-new"]');
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n');
  await page.setInputFiles('#lcPdf', { name: 'Chapter 4 - CVP.pdf', mimeType: 'application/pdf', buffer: pdf });
  await expect(page.locator('[name=lc_summary]')).toHaveValue('نقطة التعادل لما الربح صفر');
  await expect(page.locator('[name=lc_notes]')).toHaveValue(/CM ratio = CM \/ Sales/);
  await expect(page.locator('[name=lc_title]')).toHaveValue('Chapter 4 - CVP');           // العنوان من اسم الملف لو فاضي
  await expect(page.locator('#lcCards li')).toHaveCount(2);
  const call = await store(page, () => window.__aiCalls[0]);
  expect(call).toMatchObject({ name: 'lecture-ai', mode: 'pdf', media: 'application/pdf', head: 'JVBER', title: 'Chapter 4 - CVP' });
  expect(call.notes).toBeUndefined();
  // مو PDF، أو أكبر من 6MB: ما يطلع شي من الجوال
  await page.setInputFiles('#lcPdf', { name: 'fake.pdf', mimeType: 'application/pdf', buffer: Buffer.from('hello') });
  await expect(page.locator('#toast')).toContainText('مو ملف PDF');
  await page.setInputFiles('#lcPdf', { name: 'big.pdf', mimeType: 'application/pdf', buffer: Buffer.concat([pdf, Buffer.alloc(6 * 1024 * 1024)]) });
  await expect(page.locator('#toast')).toContainText('الحد 6MB');
  expect(await store(page, () => window.__aiCalls.length)).toBe(1);
});

test('«اسأل حياتي» (DW-037): signed in, the assistant answers through the server from a data snapshot, without people\'s names', async ({ page }) => {
  await open(page);
  await expect(page.locator('#assistBtn')).toBeHidden();                       // بدون حساب: ما يطلع
  await store(page, () => {
    App.S.setSettings({ onboarded: true });
    App.S.upsert('transactions', { id: 'q1', kind: 'expense', amount: 3.5, merchant: 'Costa', category: 'قهوة', occurred_at: new Date().toISOString() });
    App.S.upsert('debts', { id: 'd1', person: 'خالد', amount: 20, direction: 'lent', settled: false });
    window.__aiCalls = [];
    App.S.invokeFn = async (name, body) => { window.__aiCalls.push({ name, body }); return { text: 'صرفت على القهوة 3.500 د.ب هالشهر' }; };
    App.S.status.signedIn = true; App.S.setSettings({ budget: 100 });            // أي تغيير يحدّث الزر
  });
  await expect(page.locator('#assistBtn')).toBeVisible();
  await page.click('#assistBtn');
  await expect(page.locator('.sheet, #sheet')).toContainText('بدون أسماء الناس');
  await page.click('.quick [data-q]:first-child');
  await expect(page.locator('#chat .msg.assistant').last()).toContainText('3.500 د.ب');
  const call = await store(page, () => window.__aiCalls[0]);
  expect(call.name).toBe('lecture-ai');
  expect(call.body.mode).toBe('ask');
  expect(call.body.messages).toEqual([{ role: 'user', content: 'كم صرفت على القهوة والأكل هالشهر؟' }]);
  const data = JSON.parse(call.body.data);
  expect(data.this_month.by_category['قهوة']).toBe(3.5);
  expect(data.debts_open).toEqual([{ amount: 20, direction: 'owes me' }]);
  expect(call.body.data).not.toContain('خالد');
  // سؤال ثاني: المحادثة تنرسل كاملة
  await page.fill('#chatForm [name=q]', 'وكم باقي من الميزانية؟'); await page.click('#chatForm [type=submit]');
  await expect.poll(() => store(page, () => window.__aiCalls.length)).toBe(2);
  expect(await store(page, () => window.__aiCalls[1].body.messages.map((m) => m.role))).toEqual(['user', 'assistant', 'user']);
  // خلصت المحاولات
  await store(page, () => { App.S.invokeFn = async () => { throw new Error('limit'); }; });
  await page.fill('#chatForm [name=q]', 'سؤال ثالث'); await page.click('#chatForm [type=submit]');
  await expect(page.locator('#chat .msg.assistant').last()).toContainText('خلصت محاولات اليوم');
});

// ================= DW-046: سجل أخطاء على الجهاز =================
test('error log (DW-046): keeps technical errors on the device without numbers, names or emails, and the bug report attaches them only when ticked', async ({ page }) => {
  await open(page);
  // أحداث مصطنعة (مو أخطاء حقيقية) عشان فحص «ولا خطأ JS» يظل شغّال
  await store(page, () => {
    window.dispatchEvent(new ErrorEvent('error', { message: 'Uncaught TypeError: Cannot read properties of undefined (reading \'amount\') 92.325 سارة a.b@mail.com', filename: 'http://localhost/js/core/app.js?v=1', lineno: 120, colno: 7, error: new TypeError('x') }));
    window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', { promise: Promise.resolve(), reason: new Error('fetch failed for "لولو" 380') }));
  });
  const log = await store(page, () => window.HayatiErrLog.list());
  expect(log).toHaveLength(2);
  expect(log[0].at).toBe('app.js:120:7');
  expect(JSON.stringify(log)).not.toMatch(/92|325|380|سارة|لولو|mail\.com|amount/);
  expect(log[1].m).toMatch(/^Promise: Error: fetch failed/);

  await store(page, () => window.Extras.settingsAction('bug'));
  await expect(page.locator('#bugLog')).not.toBeChecked();   // مطفّي افتراضياً
  await expect(page.locator('#bugLogText')).toContainText('app.js:120:7');
  await page.fill('#bugWhat', 'التطبيق علّق');
  const text = () => page.evaluate(() => window.HayatiFeedback.bugText(document.getElementById('sheetBody')));
  expect(await text()).not.toContain('أخطاء تقنية');
  await page.check('#bugLog');
  expect(await text()).toContain('أخطاء تقنية:');
  expect(await text()).toContain('app.js:120:7');

  // «احذف كل بياناتي» يمسحه (كل مفاتيح hayati)
  await store(page, () => { for (const k of Object.keys(localStorage)) if (k.startsWith('hayati')) localStorage.removeItem(k); });
  expect(await store(page, () => window.HayatiErrLog.list())).toEqual([]);
});

// ================= DW-046: تحميل أخف =================
test('lighter start (DW-046): Arabic never downloads the 120KB English dictionary, English still loads it before the app', async ({ page }) => {
  const asked = [];
  page.on('request', (r) => { if (r.url().includes('i18n-en.js')) asked.push(r.url()); });
  await open(page);
  expect(asked).toEqual([]);
  expect(await store(page, () => typeof window.HAYATI_EN)).toBe('undefined');
  await store(page, () => localStorage.setItem('hayati-lang', 'en'));
  await open(page);
  expect(asked.length).toBe(1);
  await expect(page.locator('#title')).toHaveText('Today');
});

// ================= DW-047: تسجيل المحاضرة ← نص (آيفون، على الجهاز) =================
test('lecture recording to text (DW-047): iPhone only, only for languages the phone can do offline, text lands in the notes as a draft', async ({ page }) => {
  await page.addInitScript(() => {
    window.__stt = { calls: [] };
    window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'ios', Plugins: {
      HayatiSpeech: {
        available: async ({ lang }) => ({ onDevice: lang === 'ar' }),   // الجهاز يدعم العربي بس
        transcribe: async (o) => { window.__stt.calls.push({ lang: o.lang, mime: o.mime, len: o.data.length }); return { text: 'النسبة الحالية تساوي الأصول المتداولة على الخصوم المتداولة' }; },
      },
      HayatiWidget: { update: async () => {}, take: async () => ({}), addListener: () => Promise.resolve({ remove() {} }) },
    } };
  });
  await open(page);
  await store(page, async () => {
    await window.Extras.Lectures.putClip('c1', new Blob([new Uint8Array(2048)], { type: 'audio/mp4' }));
    App.S.upsert('lectures', { id: 'l1', title: 'Ratios', date: '2026-10-16', notes: 'ملاحظتي', summary: '', cards: [], audio: [{ id: 'c1', dur: 65 }] });
    window.Extras.Lectures.sheet('l1');
  });
  const ar = page.locator('[data-stt="0"][data-lang="ar"]');
  await expect(ar).toBeVisible({ timeout: 5000 });
  await expect(page.locator('[data-stt][data-lang="en"]')).toHaveCount(0);   // الإنقليزي مو مدعوم بدون نت هني
  await ar.click();
  await expect(page.locator('[name=lc_notes]')).toHaveValue(/ملاحظتي\n\n🎙️ تسجيل 1 \(مسودة من الصوت\):\nالنسبة الحالية/);
  expect(await store(page, () => window.__stt.calls)).toEqual([{ lang: 'ar', mime: 'audio/mp4', len: expect.any(Number) }]);
  // ما ينحفظ بروحه: الطالب يراجع ويضغط «حفظ»
  expect(await store(page, () => App.st.lectures.find((x) => x.id === 'l1').notes)).toBe('ملاحظتي');
});

test('lecture recording to text (DW-047): no button on Android or the web', async ({ page }) => {
  await open(page);
  await store(page, async () => {
    await window.Extras.Lectures.putClip('c2', new Blob([new Uint8Array(64)], { type: 'audio/webm' }));
    App.S.upsert('lectures', { id: 'l2', title: 'X', date: '2026-10-16', notes: '', summary: '', cards: [], audio: [{ id: 'c2', dur: 5 }] });
    window.Extras.Lectures.sheet('l2');
  });
  await expect(page.locator('[data-play="0"]')).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.locator('[data-stt]')).toHaveCount(0);
});

// ================= DW-048: قسّم الفاتورة =================
test('bill split (DW-048): shares add up to the exact fils, custom shares are checked', async ({ page }) => {
  await open(page);
  const r = await store(page, () => {
    const s = window.Extras.Split.splitShares;
    const err = (f) => { try { f(); return null; } catch (e) { return e.message; } };
    return {
      noMe: s(10, { mode: 'equal', me: false, names: ['أ', 'ب', 'ج'] }).map((x) => x.amount),
      withMe: s(10, { mode: 'equal', me: true, names: ['أ', 'ب'] }).map((x) => x.amount),
      custom: s(12.5, { mode: 'custom', me: true, names: ['أ', 'ب'], amounts: { 'أ': 4, 'ب': 3.25 } }).map((x) => x.amount),
      over: err(() => s(5, { mode: 'custom', me: true, names: ['أ'], amounts: { 'أ': 6 } })),
      notAll: err(() => s(5, { mode: 'custom', me: false, names: ['أ', 'ب'], amounts: { 'أ': 2, 'ب': 2 } })),
      none: err(() => s(5, { mode: 'equal', me: true, names: [] })),
    };
  });
  expect(r.noMe).toEqual([3.334, 3.333, 3.333]);            // 10.000 بالضبط
  expect(r.withMe).toEqual([3.333, 3.333]);                  // والفلس الزايد على اللي دفع (3.334)
  expect(r.custom).toEqual([4, 3.25]);
  expect(r.over).toBe('الحصص أكثر من المبلغ');
  expect(r.notAll).toContain('مجموع الحصص لازم يساوي');
  expect(r.none).toBe('اكتب اسم واحد على الأقل');
});

test('bill split (DW-048): from a new expense, linked to it, re-split replaces, amount edit re-computes, delete asks about the shares', async ({ page }) => {
  await open(page);
  await store(page, () => App.txForm());
  await page.fill('#sheet [name="amount"]', '9');
  await page.check('#sheet [name="split_after"]');
  await page.click('#sheetSave');
  await expect(page.locator('#sheetTitle')).toHaveText('تقسيم الفاتورة', { timeout: 5000 });
  await page.fill('[name="names"]', 'أحمد، علي');
  await expect(page.locator('#splitPrev')).toContainText('3.000');
  await page.click('#sheetSave');
  const txId = await store(page, () => App.st.transactions[App.st.transactions.length - 1].id);
  let debts = await store(page, (id) => App.st.debts.filter((d) => d.split_of === id).map((d) => [d.person, d.amount, d.direction]), txId);
  expect(debts).toEqual([['أحمد', 3, 'lent'], ['علي', 3, 'lent']]);

  // نفس العملية: الزر يقول إنها مقسّمة، وإعادة القسمة تستبدل الحصص (ما تتكرر)
  await store(page, (id) => App.txForm(App.st.transactions.find((t) => t.id === id)), txId);
  await expect(page.locator('[data-split]')).toContainText('مقسّمة على 2');
  await page.click('[data-split]');
  await expect(page.locator('#sheetTitle')).toHaveText('تقسيم الفاتورة', { timeout: 5000 });
  await expect(page.locator('[name="names"]')).toHaveValue('أحمد، علي');
  await page.fill('[name="names"]', 'أحمد، علي، حسين');
  await page.click('#sheetSave');
  debts = await store(page, (id) => App.st.debts.filter((d) => d.split_of === id).map((d) => d.amount), txId);
  expect(debts).toEqual([2.25, 2.25, 2.25]);

  // تعديل المبلغ (بالتساوي) يعيد الحساب
  await page.waitForTimeout(400);
  await store(page, (id) => App.txForm(App.st.transactions.find((t) => t.id === id)), txId);
  await page.fill('#sheet [name="amount"]', '10');
  await page.click('#sheetSave');
  debts = await store(page, (id) => App.st.debts.filter((d) => d.split_of === id).map((d) => d.amount), txId);
  expect(debts).toEqual([2.5, 2.5, 2.5]);

  // حذف العملية يسأل عن الحصص
  await page.waitForTimeout(400);
  await store(page, (id) => App.txForm(App.st.transactions.find((t) => t.id === id)), txId);
  await page.click('#delTx');
  await page.click('#askDlg[open] [data-ok]');
  await expect(page.locator('#askDlg[open] p')).toContainText('تحذف حصص الربع (3) بعد؟', { timeout: 5000 });
  await page.click('#askDlg[open] [data-ok]');
  await page.waitForTimeout(300);
  expect(await store(page, (id) => App.st.debts.filter((d) => d.split_of === id).length, txId)).toBe(0);
});

test('bill split (DW-048): the message for friends lists each share', async ({ page }) => {
  await open(page);
  const text = await store(page, () => window.Extras.Split.splitText({ merchant: 'مطعم البحر', category: 'أكل ومطاعم', amount: 12.5, occurred_at: '2026-10-16T18:00:00Z' }, [{ person: 'أحمد', amount: 4 }, { person: 'علي', amount: 3.25 }]));
  expect(text).toBe('🧾 مطعم البحر · 16/10\nالمجموع: 12.500 د.ب\nأحمد: 4.000 د.ب\nعلي: 3.250 د.ب');
});

// ================= DW-048: اختصارات أيقونة التطبيق =================
test('app icon shortcuts (DW-048): «اسأل حياتي» from the icon opens the assistant, or says to sign in', async ({ page }) => {
  await page.addInitScript(() => {
    window.__act = null;
    window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: {
      HayatiWidget: { update: async () => {}, take: async () => ({ name: 'ask' }), addListener: (ev, fn) => { window.__act = fn; return Promise.resolve({ remove() {} }); } },
    } };
  });
  await open(page);
  await expect(page.locator('#toast')).toContainText('«اسأل حياتي» يشتغل لما تسجّل دخول بحسابك', { timeout: 5000 });
  // التطبيق مفتوح: نفس الاختصار يوصل كحدث
  await store(page, () => { App.S.status.signedIn = true; App.S.invokeFn = async () => ({ text: 'ok' }); window.__act({ name: 'add-tx' }); });
  await expect(page.locator('#sheet[open] [name="amount"]')).toBeVisible({ timeout: 5000 });
});

test('sign-up catches email typos before the server (.con, gmial) and says it in Arabic', async ({ page }) => {
  await open(page);
  await store(page, () => App.accountSheet());
  await page.fill('#sheetBody [name=email]', 'someone@gmail.con');
  await page.fill('#sheetBody [name=password]', 'secret123');
  await page.click('#sheetBody [data-set="signup"]');
  await expect(page.locator('#toast')).toContainText('someone@gmail.com');
  await page.fill('#sheetBody [name=email]', 'someone@site.con');
  await page.click('#sheetBody [data-set="signin"]');
  await expect(page.locator('#toast')).toContainText('.com');
});
