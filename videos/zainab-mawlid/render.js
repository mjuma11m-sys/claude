const { chromium } = require('@playwright/test');
(async () => {
  const b = await chromium.launch();
  for (const [name, w, h, domeTop, textTop, duaBottom, domeW, nameSize] of [['zainab-post', 1080, 1350, '96px', '400px', '74px', '500px', '200px'], ['zainab-story', 1080, 1920, '300px', '690px', '190px', '640px', '240px']]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto('file://' + __dirname + '/card.html');
    await p.addStyleTag({ content: `:root{--w:${w}px;--h:${h}px;--domeTop:${domeTop};--textTop:${textTop};--duaBottom:${duaBottom};--domeW:${domeW};--nameSize:${nameSize}}` });
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600);
    await p.screenshot({ path: __dirname + '/' + name + '.png' });
    console.log(name);
  }
  await b.close();
})();
