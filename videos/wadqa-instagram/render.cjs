// يصوّر كل إطار بـ templates.html لـ PNG بمجلد out/
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 2200 } });
  await p.goto('file://' + path.join(__dirname, 'templates.html')); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  for (const id of await p.$$eval('.f', (els) => els.map((e) => e.id))) await (await p.$('#' + id)).screenshot({ path: path.join(__dirname, 'out', id + '.png') });
  await b.close(); })();
