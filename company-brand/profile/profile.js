// الملف التعريفي → ../out/wadqa-profile.pdf (+ معاينات PNG)
//   PW=<playwright> node company-brand/profile/profile.js
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const dir = __dirname, out = path.join(dir, '../out');
const inl = (f) => fs.readFileSync(path.join(out, f), 'utf8').replace('<svg ', '<svg class="mark" ');
const html = fs.readFileSync(path.join(dir, 'profile.html'), 'utf8').replaceAll('MARK_DARK', inl('mark-on-dark.svg')).replaceAll('MARK_LIGHT', inl('mark-on-light.svg'));
const tmp = path.join(dir, '.render.html'); fs.writeFileSync(tmp, html);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 1 });
  await p.goto('file://' + tmp); await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: path.join(out, 'wadqa-profile.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  if (process.argv[2] === 'preview') {
    const n = await p.$$eval('.pg', (e) => e.length);
    for (let i = 0; i < n; i++) { const el = (await p.$$('.pg'))[i]; await el.screenshot({ path: path.join(dir, `.prev${i + 1}.png`) }); }
  }
  await b.close(); fs.unlinkSync(tmp);
})();
