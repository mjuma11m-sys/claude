// node company-brand/build.js  →  company-brand/out/
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PW || '../node_modules/@playwright/test');
const OUT = path.join(__dirname, 'out');
const C = { ink: '#0B1514', bone: '#F2EBDD', gold: '#C8A04A', deep: '#7A5A12', slate: '#1C2B2A', mist: '#8FA09C' };
const bold64 = fs.readFileSync(path.join(__dirname, 'fonts/IBMPlexSansArabic-Bold.ttf')).toString('base64');
const FONT_EMBED = `@font-face{font-family:'IBM Plex Sans Arabic';font-weight:700;src:url(data:font/ttf;base64,${bold64})}`;

// الفكرة: دلمون = بوابة (قوس) تحمل لؤلؤة البحرين
const goal = (c, p, w = 34) => `<path d="M150 384V256A106 106 0 0 1 362 256V384" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/><circle cx="256" cy="288" r="46" fill="${p}"/>`;
const svg = (inner, vb = '0 0 512 512') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${inner}</svg>\n`;
const icon = svg(`<rect width="512" height="512" rx="116" fill="${C.ink}"/>${goal(C.bone, C.gold)}`);
const files = {
  'mark-app-icon.svg': icon,
  'mark-on-dark.svg': svg(goal(C.bone, C.gold)),
  'mark-on-light.svg': svg(goal(C.ink, C.deep)),
  'mark-mono-ink.svg': svg(goal(C.ink, C.ink)),
  'mark-mono-white.svg': svg(goal('#fff', '#fff')),
};
const stamp = (c, bg) => {
  const g = `<g transform="translate(256 256) scale(.46) translate(-256 -262)">${goal(c, c, 40)}</g>`;
  return svg(`<style>${FONT_EMBED} text{font-family:'IBM Plex Sans Arabic',sans-serif;font-weight:700;fill:${c}}</style>
${bg ? `<circle cx="256" cy="256" r="256" fill="${bg}"/>` : ''}
<circle cx="256" cy="256" r="244" fill="none" stroke="${c}" stroke-width="7"/>
<circle cx="256" cy="256" r="228" fill="none" stroke="${c}" stroke-width="2"/>
<circle cx="256" cy="256" r="156" fill="none" stroke="${c}" stroke-width="2"/>
<defs><path id="t" d="M80 256A176 176 0 0 1 432 256"/><path id="b" d="M44 256A212 212 0 0 0 468 256"/></defs>
<text font-size="46"><textPath href="#t" startOffset="50%" text-anchor="middle">دلمون للبرمجيات</textPath></text>
<text font-size="30" letter-spacing="7"><textPath href="#b" startOffset="50%" text-anchor="middle">DILMUN · BAHRAIN</textPath></text>
<circle cx="62" cy="262" r="6" fill="${c}"/><circle cx="450" cy="262" r="6" fill="${c}"/>
${g}
<text x="256" y="368" font-size="40" text-anchor="middle" direction="rtl">دلمون</text>`);
};
files['stamp-ink.svg'] = stamp(C.ink);
files['stamp-gold-on-dark.svg'] = stamp(C.gold, C.ink);
files['stamp-bone-on-dark.svg'] = stamp(C.bone);
for (const [n, s] of Object.entries(files)) fs.writeFileSync(path.join(OUT, n), s);

const tokens = `/* company-brand/tokens.css — دلمون (DILMUN)، نفس الأرقام بالـ BRAND.md */
:root{
  --dilmun-ink:${C.ink}; --dilmun-bone:${C.bone}; --dilmun-gold:${C.gold};
  --dilmun-gold-deep:${C.deep}; /* نص ذهبي على فاتح (5.4:1) */
  --dilmun-slate:${C.slate}; --dilmun-mist:${C.mist};
  --dilmun-font:'IBM Plex Sans Arabic',system-ui,sans-serif;
}\n`;
fs.writeFileSync(path.join(OUT, 'tokens.css'), tokens);

const css = `${FONT_EMBED}
@font-face{font-family:'IBM Plex Sans Arabic';font-weight:400;src:url(data:font/ttf;base64,${fs.readFileSync(path.join(__dirname, 'fonts/IBMPlexSansArabic-Regular.ttf')).toString('base64')})}
*{box-sizing:border-box;margin:0}body{font-family:'IBM Plex Sans Arabic',sans-serif;direction:rtl}`;
const inl = (s) => s.replace(/^<svg /, '<svg style="display:block;width:100%;height:100%" ');
const lockup = (dark, stacked) => {
  const fg = dark ? C.bone : C.ink, sub = dark ? C.mist : '#5B6B67';
  const m = inl(svg(goal(fg, dark ? C.gold : C.deep)));
  return `<style>${css}</style><body style="background:${dark ? C.ink : C.bone};width:${stacked ? 700 : 1100}px;height:${stacked ? 700 : 420}px;display:flex;align-items:center;justify-content:center">
<div style="display:flex;${stacked ? 'flex-direction:column;' : 'direction:ltr;'}align-items:center;gap:${stacked ? 28 : 44}px">
<div style="width:${stacked ? 220 : 210}px;height:${stacked ? 220 : 210}px">${m}</div>
<div style="text-align:${stacked ? 'center' : 'right'};color:${fg}"><div style="font-weight:700;font-size:${stacked ? 120 : 130}px;line-height:1.1">دلمون</div>
<div style="font-weight:700;font-size:34px;letter-spacing:.14em;color:${sub};direction:ltr">DILMUN STUDIO</div></div></div></body>`;
};
const card = (back) => `<style>${css}</style><body style="width:1050px;height:600px;background:${back ? C.bone : C.ink};color:${back ? C.ink : C.bone};position:relative;overflow:hidden">
${back ? `<div style="position:absolute;right:70px;top:70px;font-size:54px;font-weight:700">محمد <span style="color:${C.deep}">(أبو جعفر)</span></div>
<div style="position:absolute;right:70px;top:150px;font-size:30px;color:#5B6B67">المؤسس · دلمون للبرمجيات</div>
<div style="position:absolute;right:70px;bottom:70px;font-size:26px;line-height:1.9;direction:ltr;text-align:right;color:#5B6B67">[ بريدك الإلكتروني ]<br>[ رقم الجوال ]<br>مملكة البحرين</div>
<div style="position:absolute;left:70px;bottom:62px;width:150px;height:150px">${inl(stamp(C.ink))}</div>`
: `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px"><div style="width:190px;height:190px">${inl(svg(goal(C.bone, C.gold)))}</div>
<div style="font-weight:700;font-size:96px;line-height:1">دلمون</div><div style="font-weight:700;font-size:26px;letter-spacing:.2em;color:${C.gold};direction:ltr">DILMUN STUDIO</div></div>`}</body>`;
const letter = `<style>${css}@page{size:A4;margin:0}</style><body style="width:210mm;height:297mm;background:#fff;color:${C.ink};position:relative">
<div style="height:34mm;background:${C.ink};display:flex;align-items:center;justify-content:space-between;padding:0 18mm;color:${C.bone}">
<div style="display:flex;align-items:center;gap:7mm"><div style="width:18mm;height:18mm">${inl(svg(goal(C.bone, C.gold)))}</div><div><div style="font-weight:700;font-size:26pt;line-height:1">دلمون</div><div style="font-weight:700;font-size:8.5pt;letter-spacing:.2em;color:${C.gold};direction:ltr;margin-top:1.5mm">DILMUN STUDIO</div></div></div>
<div style="font-size:9pt;color:${C.mist};text-align:left;direction:ltr;line-height:1.7">[ البريد ]<br>[ الجوال ]<br>Kingdom of Bahrain</div></div>
<div style="height:1.2mm;background:${C.gold}"></div>
<div style="padding:22mm 22mm;font-size:11pt;line-height:2;color:#33494D">التاريخ: ____ / ____ / ______<br><br>إلى: ______________________<br><br>الموضوع: ______________________</div>
<div style="position:absolute;bottom:14mm;left:22mm;width:30mm;height:30mm;opacity:.9">${inl(stamp(C.ink))}</div>
<div style="position:absolute;bottom:18mm;right:22mm;font-size:8pt;color:#5B6B67">دلمون للبرمجيات · أدوات تبني يومك</div></body>`;
const board = fs.readFileSync(path.join(__dirname, 'brand-board.html'), 'utf8')
  .replace('/*FONT*/', FONT_EMBED)
  .replace(/<!--(\w[\w-]*\.svg)-->/g, (_, f) => inl(files[f]));

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const shot = async (html, name, w, h, scale = 1) => {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
    await p.setContent(html); await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(OUT, name), omitBackground: name.startsWith('stamp') });
    await p.close();
  };
  for (const [n, s] of [['mark-app-icon', icon]]) await shot(`<body style="margin:0;background:transparent">${inl(s).replace('style="display:block;width:100%;height:100%"', 'style="display:block;width:1024px;height:1024px"')}</body>`, n + '-1024.png', 1024, 1024);
  for (const n of ['stamp-ink', 'stamp-gold-on-dark', 'stamp-bone-on-dark'])
    await shot(`<body style="margin:0;background:transparent">${files[n + '.svg'].replace('<svg ', '<svg width="1024" height="1024" ')}</body>`, n + '-1024.png', 1024, 1024);
  await shot(lockup(false, false), 'lockup-horizontal-light.png', 1100, 420);
  await shot(lockup(true, false), 'lockup-horizontal-dark.png', 1100, 420);
  await shot(lockup(false, true), 'lockup-stacked-light.png', 700, 700);
  await shot(lockup(true, true), 'lockup-stacked-dark.png', 700, 700);
  await shot(card(false), 'business-card-front.png', 1050, 600);
  await shot(card(true), 'business-card-back.png', 1050, 600);
  const pg = await b.newPage(); await pg.setContent(letter); await pg.evaluate(() => document.fonts.ready);
  await pg.pdf({ path: path.join(OUT, 'letterhead-A4.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  await pg.setViewportSize({ width: 1280, height: 900 }); await pg.setContent(board); await pg.evaluate(() => document.fonts.ready);
  fs.writeFileSync(path.join(OUT, 'brand-board.html'), board);
  await pg.screenshot({ path: path.join(OUT, 'brand-board.png'), fullPage: true });
  await b.close();
})();
