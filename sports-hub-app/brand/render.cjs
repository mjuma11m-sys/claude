// node brand/render.cjs   (PW=<path to playwright> if it is not resolvable)
// Rasterises the SVG sources into the PNGs the PWA manifest, iOS and browsers ask for.
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs'); const path = require('path');
const brand = __dirname, pub = path.join(__dirname, '..', 'public');
const JOBS = [ // [source svg, output png, px]
  [path.join(pub, 'icon.svg'), path.join(pub, 'icon-192.png'), 192],
  [path.join(pub, 'icon.svg'), path.join(pub, 'icon-512.png'), 512],
  [path.join(brand, 'icon-full.svg'), path.join(pub, 'apple-touch-icon.png'), 180],
  [path.join(brand, 'icon-maskable.svg'), path.join(pub, 'icon-maskable-512.png'), 512],
  [path.join(brand, 'icon-small.svg'), path.join(pub, 'favicon-32.png'), 32],
  [path.join(brand, 'icon-full.svg'), path.join(brand, 'store-1024.png'), 1024],
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  for (const [src, out, px] of JOBS) {
    const svg = fs.readFileSync(src, 'utf8').replace('<svg ', '<svg width="100%" height="100%" ');
    await p.setViewportSize({ width: px, height: px });
    await p.setContent(`<body style="margin:0;background:transparent"><div style="width:${px}px;height:${px}px">${svg}</div></body>`);
    await p.screenshot({ path: out, omitBackground: true });
  }
  await b.close(); console.log('rendered', JOBS.length, 'PNGs');
})();
