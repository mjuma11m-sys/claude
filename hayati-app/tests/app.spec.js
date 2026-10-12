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
