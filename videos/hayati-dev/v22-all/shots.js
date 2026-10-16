// لقطات حقيقية لفيديو «كل تحديثات v22» من dist/Hayati.html ببيانات تجريبية
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
  const act = (a) => p.evaluate((x) => { const bt = document.createElement('button'); bt.dataset.action = x; bt.hidden = true; document.getElementById('view').appendChild(bt); bt.click(); bt.remove(); }, a);
  const close = async () => { await p.click('#sheetCancel'); await p.waitForTimeout(400); };
  await p.goto(APP); await p.waitForFunction(() => window.App && App.st);
  await p.addStyleTag({ content: '.morning{display:none!important} p.small.muted:has(+ .group-title){display:none!important}' });
  await p.evaluate(seed);
  await p.evaluate(() => {
    const S = App.S, d = (n) => { const x = new Date(); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10); };
    const L = (id, c, title, date, cards, extra) => S.upsert('lectures', Object.assign({ id, course_id: c, title, date, notes: '', summary: '', cards: cards.map(([q, a], i) => ({ id: id + i, q, a })), audio: [] }, extra || {}));
    L('l1', 'c1', 'Chapter 2 — Cost Behavior', d(9), [['Fixed cost?', 'Stays the same when volume changes'], ['Variable cost?', 'Changes with volume']], { last_score: 67, audio: [{ id: 'a0', dur: 3920, at: Date.now() }] });
    L('l2', 'c1', 'Chapter 3 — CVP Analysis', d(2), [
      ['نقطة التعادل = FC / (P - VC)، احسبها لو FC = 1000 و P - VC = 25', '1000 / 25 = 40 وحدة'],
      ['Contribution margin ratio?', 'CM / Sales'],
      ['Target profit units?', '(FC + profit) / (P - VC)'],
      ['NPV formula?', 'NPV = Σ CF_t / (1 + r)^t − I_0']],
      { notes: 'Break-even = FC ÷ (P − VC)\nCM ratio = CM / Sales', summary: 'نقطة التعادل = لما الربح صفر.', audio: [{ id: 'a1', dur: 4380, at: Date.now() }] });
    L('l3', 'c2', 'Lecture 4 — Entry Modes', d(4), [['Licensing?', 'Another firm uses your brand for a fee']], { summary: 'طرق دخول السوق الخارجي.' });
    App.go('today'); scrollTo(0, 0);
  });
  await shot('1-today');
  await p.click('#toolsBtn'); await shot('2-tools'); await close();
  await act('payday-summary'); await shot('3-payday'); await close();
  await p.evaluate(() => window.Extras.settingsAction('ibada')); await p.waitForTimeout(400); await shot('4-ibada');
  await p.click('#ibQibla'); await p.waitForTimeout(300);
  await p.evaluate(() => window.dispatchEvent(Object.assign(new Event('deviceorientationabsolute'), { alpha: 360 - 246, absolute: true })));
  await shot('5-qibla'); await close();
  await p.evaluate(() => { App.ui.studySeg = 'lectures'; App.go('schedule'); scrollTo(0, 0); });
  await shot('6-lectures');
  await p.click('.lec-row >> nth=0'); await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelector('#lcCards').scrollIntoView({ block: 'center' }));
  await shot('7-math'); await close();
  await p.evaluate(() => window.Extras.Lectures.quiz(['l2']));
  await p.waitForTimeout(400);
  await p.evaluate(() => { Math.random = () => 0.9; });
  await p.click('[data-qz=show]');
  await shot('8-quiz');
  console.log(errs.length ? errs : 'ok');
  await b.close();
})();
