// اختبارات «حياتي» بمتصفح حقيقي بحجم آيفون. كل اختبار يبدأ بتطبيق فاضي (تخزين جديد).
const { test: base, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// كل اختبار: نمنع أي اتصال برّا (خطوط، CDN) ونفشل لو صار أي خطأ JavaScript
const test = base.extend({
  page: async ({ page, baseURL }, use) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('**/*', (r) => (r.request().url().startsWith(baseURL) ? r.continue() : r.abort()));
    await use(page);
    expect(errors, 'JavaScript errors on the page').toEqual([]);
  },
});

const open = async (page, url = '/index.html') => { await page.goto(url); await page.waitForFunction(() => window.App && window.App.st); };
const store = (page, fn, arg) => page.evaluate(fn, arg);
const dayKey = (off = 0) => { const d = new Date(); d.setDate(d.getDate() + off); return d.toISOString().slice(0, 10); };

test('every tab and section renders', async ({ page }) => {
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

test('add an expense by hand and it survives a reload', async ({ page }) => {
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

test('pasting a bank message logs the transaction', async ({ page }) => {
  await open(page);
  await page.click('#addBtn');
  await page.click('[data-pick="sms"]');
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
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]).filter((s) => !s.startsWith('http'));
  for (const s of scripts) {
    const src = fs.readFileSync(path.join(root, s), 'utf8').replace(/<\/script/g, '<\\/script');
    expect(bundle.includes(src), `dist/Hayati.html is stale for ${s} — run: npm run build`).toBe(true);
  }
  await open(page, '/dist/Hayati.html');
  await expect(page.locator('#title')).toHaveText('اليوم');
});
