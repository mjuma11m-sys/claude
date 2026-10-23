// لقطات ببيانات تجريبية من الموقع المحلي (وضع demo للوحة) — للفيديو
const { chromium } = require('playwright');
const OUT = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const shot = async (url, name, prep) => { await p.goto('http://localhost:8791' + url); await p.waitForTimeout(500); if (prep) await prep(); await p.screenshot({ path: OUT + '/' + name + '.png' }); };
  await shot('/admin/?demo=1#summary', 'admin-summary');
  await shot('/admin/?demo=1#visits', 'admin-visits');
  await shot('/admin/?demo=1#leads', 'admin-leads');
  await shot('/support.html', 'support', async () => { await p.click('details.faq summary'); await p.evaluate(() => document.querySelector('h1').scrollIntoView()); });
  await shot('/testers.html', 'testers');
  await b.close();
})();
