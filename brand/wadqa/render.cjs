// node brand/wadqa/render.cjs  (PW=<path to playwright> if not resolvable). Rasterises icons and builds wadqa-board.png.
const { chromium } = require(process.env.PW || 'playwright');
const fs = require('fs'), path = require('path'), d = __dirname;
const svg = (n) => fs.readFileSync(path.join(d, n), 'utf8').replace('<svg ', '<svg width="100%" height="100%" ');
const fontDir = path.join(d, '../../sports-hub-app/node_modules/@fontsource/tajawal/files');
const face = (w, s) => `@font-face{font-family:T;font-weight:${w};src:url(file://${fontDir}/tajawal-${s}-${w}-normal.woff2);unicode-range:${s==='arabic'?'U+0600-06FF,U+FB50-FEFF,U+200C-200F':'U+0000-00FF,U+2000-206F'}}`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  for (const [src, out, px] of [['icon-512.svg', 'icon-512.png', 512], ['icon-maskable-512.svg', 'icon-maskable-512.png', 512], ['mark-small.svg', 'favicon-32.png', 32], ['mark.svg', 'mark-512.png', 512]]) {
    await p.setViewportSize({ width: px, height: px });
    await p.setContent(`<body style="margin:0;background:transparent"><div style="width:${px}px;height:${px}px">${svg(src)}</div></body>`);
    await p.screenshot({ path: path.join(d, out), omitBackground: true });
  }
  const card = (bg, fg, inner, extra = '') => `<div class="c" style="background:${bg};color:${fg};${extra}">${inner}</div>`;
  const sw = (hex, n, u) => `<div class="sw"><i style="background:${hex}"></i><b>${n}</b><span dir="ltr">${hex}</span><em>${u}</em></div>`;
  await p.setViewportSize({ width: 1600, height: 1000 });
  await p.setContent(`<style>${face(800, 'arabic')}${face(800, 'latin')}${face(500, 'arabic')}${face(500, 'latin')}
  *{box-sizing:border-box}body{margin:0;background:#101318;font-family:T;padding:28px;direction:rtl}
  .g{display:grid;direction:ltr;grid-template-columns:2fr 1fr 1fr;grid-template-rows:330px 280px 250px;gap:20px}
  .c{border-radius:14px;display:flex;align-items:center;justify-content:center;padding:28px;position:relative;overflow:hidden}
  .c h5{position:absolute;top:14px;inset-inline-start:18px;margin:0;font:500 13px T;opacity:.55;letter-spacing:.08em}
  .big{grid-row:1/3}.big svg{width:80%}.sm svg{width:80%}
  .sw{display:flex;flex-direction:column;gap:4px;font:500 14px T;margin:0 10px}.sw i{width:78px;height:78px;border-radius:12px;border:1px solid #fff3}.sw b{font-weight:800}.sw em{opacity:.6;font-style:normal;font-size:12px}
  .row{display:flex;align-items:center;gap:36px}.ico{width:150px;height:150px;border-radius:32px;overflow:hidden;outline:1px solid #fff3}.px{display:flex;gap:26px;align-items:flex-end}
  .txt{font-size:15px;line-height:1.7;max-width:360px}.txt b{font-weight:800}</style>
  <div class="g">
   ${card('#05080F', '#EAF6FF', '<h5>LOGO · DARK</h5>' + svg('logo-horizontal.svg'), 'grid-column:1')}
   ${card('#05080F', '#EAF6FF', '<h5>ICON</h5><div class="ico">' + svg('icon-512.svg') + '</div>')}
   ${card('#F4F8FB', '#0A1220', '<h5>LOGO · LIGHT</h5>' + svg('logo-horizontal-light.svg'))}
   ${card('#0A1220', '#EAF6FF', '<h5>ARABIC · RTL</h5>' + svg('logo-arabic.svg'), 'grid-column:1')}
   ${card('#00E5FF', '#05080F', '<h5>MONO</h5><div style="width:150px;color:#05080F">' + svg('mark-mono.svg') + '</div>')}
   ${card('#FFFFFF', '#0A1220', '<h5>ARABIC · LIGHT</h5>' + svg('logo-arabic-light.svg'))}
   ${card('#0A1220', '#EAF6FF', '<h5>PALETTE</h5><div class="row">' + sw('#05080F', 'ليل', 'الخلفية') + sw('#00E5FF', 'سماوي', 'الرمز على الداكن · 13:1') + sw('#00788A', 'سماوي غامق', 'الرمز على الفاتح · 5.2:1') + sw('#EAF6FF', 'حبر', 'النص') + '</div>', 'grid-column:1')}
   ${card('#05080F', '#EAF6FF', '<h5>SIZES</h5><div class="px"><div style="width:96px">' + svg('mark.svg') + '</div><div style="width:48px">' + svg('mark.svg') + '</div><div style="width:24px">' + svg('mark-small.svg') + '</div><div style="width:16px">' + svg('mark-small.svg') + '</div></div>')}
   ${card('#0A1220', '#EAF6FF', '<h5>RULES</h5><div class="txt"><b>القطرة:</b> ودق + دقة: قطرة تصوّب على نقطتها. <b>المساحة:</b> ≥ ربع عرض الرمز. <b>لا</b> أحمر (للتطبيق)، لا تدرج، لا إمالة. أقل من <span dir="ltr">32px</span>: النسخة الصغيرة.</div>')}
  </div>`);
  await p.screenshot({ path: path.join(d, 'wadqa-board.png') });
  await b.close();
})();
