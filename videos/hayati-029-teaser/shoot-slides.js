// node shoot-slides.js → more/post-01..10.jpg + more/story-4.jpg, story-5.jpg
const { chromium } = require('/home/user/claude/hayati-app/node_modules/@playwright/test');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const jobs = [...Array(10)].map((_, i) => ['post', i + 1]).concat([['story', 4], ['story', 5]]);
  for (const [f, n] of jobs) {
    const p = await b.newPage({ viewport: { width: 1080, height: f === 'story' ? 1920 : 1350 } });
    await p.goto('file://' + path.join(__dirname, 'slides.html') + '#' + f + '-' + n);
    await p.evaluate(() => window.READY);
    await p.screenshot({ path: path.join(__dirname, 'more', f + '-' + (f === 'post' ? String(n).padStart(2, '0') : n) + '.jpg'), type: 'jpeg', quality: 92 });
    await p.close();
  }
  await b.close();
})();
