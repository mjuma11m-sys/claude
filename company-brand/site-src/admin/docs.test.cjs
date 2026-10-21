// node --test site-src/admin/docs.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('./docs.js');

test('أي HTML بالمحتوى ينهرب (ما ينفّذ)', () => {
  const out = render('<script>alert(1)</script>\n<img src=x onerror=alert(1)>\n# عنوان <b>');
  assert.ok(!out.includes('<script>') && !out.includes('<img src=x'));
  assert.ok(out.includes('&lt;script&gt;'));
  assert.ok(out.includes('<h2>عنوان &lt;b&gt;</h2>'));
});

test('الروابط https بس، والصور data: بس', () => {
  assert.ok(!render('[x](javascript:alert(1))').includes('href'));
  assert.ok(render('[موقع](https://example.com)').includes('href="https://example.com"'));
  assert.ok(!render('![a](https://evil.example/x.png)').includes('<img'));
  assert.ok(!render('![a](data:image/svg+xml;base64,PHN2Zz4=)').includes('<img'));
  assert.ok(render('![لقطة](data:image/jpeg;base64,QUJD)').includes('<img src="data:image/jpeg;base64,QUJD" alt="لقطة"'));
  assert.ok(render('![لقطة](docs-img/hayati-today.jpg)').includes('<img src="docs-img/hayati-today.jpg"'));
  assert.ok(!render('![x](docs-img/../config.js)').includes('<img'));
});

test('الكود يظل حرفي، والتنسيق ما يشتغل داخله', () => {
  const out = render('```js\nconst a = "<b>" ** 2;\n```\nنص `**مو غامق**` و **غامق**');
  assert.ok(out.includes('<pre dir="ltr" data-lang="js"><code>const a = &quot;&lt;b&gt;&quot; ** 2;</code></pre>'));
  assert.ok(out.includes('<code dir="ltr">**مو غامق**</code>'));
  assert.ok(out.includes('<b>غامق</b>'));
});

test('جداول، قوائم، اقتباس، وصور متتالية بمعرض واحد', () => {
  const out = render('| أ | ب |\n|---|---|\n| 1 | `2` |\n\n- واحد\n- اثنين\n\n1. أول\n\n> * ملاحظة\n\n![a](data:image/jpeg;base64,QQ==)\n![b](data:image/jpeg;base64,Qg==)');
  assert.ok(out.includes('<th>أ</th>') && out.includes('<td><code dir="ltr">2</code></td>'));
  assert.ok(out.includes('<ul><li>واحد</li><li>اثنين</li></ul>'));
  assert.ok(out.includes('<ol><li>أول</li></ol>'));
  assert.ok(out.includes('<blockquote>* ملاحظة</blockquote>'));
  assert.equal((out.match(/class="shots"/g) || []).length, 1);
  assert.equal((out.match(/<figure>/g) || []).length, 2);
});
