// الموقع المبني (DW-063): كل رابط canonical وog يشير لدومين نملكه، والفهرسة ما توصل اللوحة. شغّله بعد node site-src/build.mjs
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const SITE = path.join(__dirname, '../site');
const DOMAIN = (fs.readFileSync(path.join(__dirname, 'build.mjs'), 'utf8').match(/const DOMAIN = '([^']+)'/) || [])[1];
const pages = ['', 'en'].flatMap((d) => fs.readdirSync(path.join(SITE, d)).filter((f) => f.endsWith('.html')).map((f) => path.join(d, f)));

test('every public page points canonical, hreflang and og to DOMAIN', () => {
  assert.ok(DOMAIN && pages.length >= 14);
  for (const f of pages) {
    const html = fs.readFileSync(path.join(SITE, f), 'utf8');
    for (const m of html.matchAll(/<(?:link rel="(?:canonical|alternate)"|meta property="og:(?:url|image)")[^>]*(?:href|content)="([^"]+)"/g)) assert.ok(m[1].startsWith(DOMAIN), f + ': ' + m[1]);
    assert.doesNotMatch(html, /wadqa\.com/, f);
  }
});

test('robots blocks the admin and names the sitemap', () => {
  const robots = fs.readFileSync(path.join(SITE, 'robots.txt'), 'utf8');
  assert.match(robots, /Disallow: \/admin\//);
  assert.match(robots, new RegExp('Sitemap: ' + DOMAIN.replace(/\./g, '\\.') + '/sitemap.xml'));
  const map = fs.readFileSync(path.join(SITE, 'sitemap.xml'), 'utf8');
  assert.strictEqual((map.match(/<url>/g) || []).length, pages.length);
  assert.doesNotMatch(map, /\/admin/);
});
