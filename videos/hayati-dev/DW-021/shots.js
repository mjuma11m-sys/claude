// لقطات حقيقية لـ DW-021 («المحاضرات») من dist/Hayati.html ببيانات تجريبية
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const path = require('path');
const seed = require('../../hayati-ad/seed.js');
const APP = 'file://' + path.join(__dirname, '../../../hayati-app/dist/Hayati.html');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'ar-BH', timezoneId: 'Asia/Bahrain', colorScheme: 'light' });
  await ctx.addInitScript(() => { localStorage.setItem('hayati-loop-ask', 'yes'); localStorage.setItem('hayati-seen-version', 'v22'); });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const shot = async (n) => { await p.waitForTimeout(700); await p.evaluate(() => document.activeElement && document.activeElement.blur()); await p.screenshot({ path: path.join(__dirname, 'shots', n + '.png') }); };
  await p.goto(APP); await p.waitForFunction(() => window.App && App.st);
  await p.addStyleTag({ content: '.morning{display:none!important} p.small.muted:has(+ .group-title){display:none!important}' });
  await p.evaluate(seed);
  await p.evaluate(() => {
    const S = App.S, d = (n) => { const x = new Date(); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10); };
    const L = (id, c, title, date, cards, extra) => S.upsert('lectures', Object.assign({ id, course_id: c, title, date, notes: '', summary: '', cards: cards.map(([q, a], i) => ({ id: id + i, q, a })), audio: [] }, extra || {}));
    L('l1', 'c1', 'Chapter 2 — Cost Behavior', d(9), [['Fixed cost?', 'Stays the same when volume changes'], ['Variable cost?', 'Changes with volume'], ['Mixed cost?', 'Fixed + variable parts']], { last_score: 67, audio: [{ id: 'a0', dur: 3920, at: Date.now() }] });
    L('l2', 'c1', 'Chapter 3 — CVP Analysis', d(2), [['Break-even?', 'Fixed costs / CM per unit'], ['Contribution margin?', 'Sales − variable costs'], ['Margin of safety?', 'Actual sales − break-even sales'], ['CM ratio?', 'CM / Sales']], {
      notes: 'Break-even = Fixed costs ÷ CM per unit\nCM = Sales − Variable costs\nالدكتور قال: سؤال break-even أكيد بالميد', summary: 'نقطة التعادل = لما الربح صفر. نحسبها بالتكاليف الثابتة ÷ هامش المساهمة للوحدة.',
      audio: [{ id: 'a1', dur: 4380, at: Date.now() }, { id: 'a2', dur: 1260, at: Date.now() }] });
    L('l3', 'c2', 'Lecture 4 — Entry Modes', d(4), [['Licensing?', 'Another firm uses your brand for a fee'], ['Joint venture?', 'Shared ownership with a local partner']], { summary: 'طرق دخول السوق الخارجي من الأقل مخاطرة للأعلى.' });
    App.ui.studySeg = 'lectures'; App.go('schedule'); scrollTo(0, 0);
  });
  await shot('1-list');
  await p.click('.lec-row >> nth=0'); await p.waitForTimeout(500);
  await shot('2-sheet');
  await p.evaluate(() => { const el = document.querySelector('[name=lc_notes]'); el.scrollIntoView({ block: 'start' }); document.querySelector('.sheet-body, #sheet .body, dialog .body')?.scrollBy(0, -60); });
  await shot('3-notes');
  await p.evaluate(() => document.querySelector('#lcCards').scrollIntoView({ block: 'center' }));
  await shot('4-cards');
  await p.click('#sheetCancel'); await p.waitForTimeout(400);
  await p.evaluate(() => window.Extras.Lectures.quiz(['l2']));
  await p.waitForTimeout(400); await p.click('[data-qz=show]');
  await shot('5-quiz');
  console.log(errs.length ? errs : 'ok');
  await b.close();
})();
