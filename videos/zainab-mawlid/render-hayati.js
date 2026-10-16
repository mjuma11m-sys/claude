const { chromium } = require('@playwright/test');
(async () => {
  const b = await chromium.launch();
  for (const [name, w, h, v] of [['zainab-hayati-post', 1080, 1350, '--arcTop:160px;--arcW:1000px;--textTop:270px;--nameSize:210px;--brandBottom:70px;--logoH:110px'], ['zainab-hayati-story', 1080, 1920, '--arcTop:425px;--arcW:1080px;--textTop:545px;--nameSize:225px;--brandBottom:200px;--logoH:130px']]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto('file://' + __dirname + '/card-hayati.html');
    await p.addStyleTag({ content: `:root{--w:${w}px;--h:${h}px;${v}}` });
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
    await p.screenshot({ path: __dirname + '/' + name + '.png' }); console.log(name);
  }
  await b.close();
})();
