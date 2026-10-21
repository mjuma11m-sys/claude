// تدفق الدخول الكامل بـ supabase وهمي (tests/fake-supabase.js): كلمة سر ← ربط التطبيق (QR) ← رمز غلط ← رمز صح ← البيانات،
// وبعد الخروج: كلمة سر ← رمز بدون QR. والحساب اللي مو أدمن ما يوصل.
const fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const B = 'http://127.0.0.1:8790/admin/';
const DOC = fs.readFileSync(path.join(__dirname, '../docs-src/hayati.md'), 'utf8');
const FAKE = 'window.__DOC_BODY__ = ' + JSON.stringify(DOC) + ';\n' + fs.readFileSync(path.join(__dirname, 'fake-supabase.js'), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('✅', m); } else { fail++; console.log('❌', m); } };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  // آخر route يتسجّل له الأولوية بـ Playwright: الوهمي بعد العام
  await p.route('**/*', (r) => (r.request().url().startsWith('http://127.0.0.1:8790') ? r.continue() : r.abort()));
  await p.route('**/admin/supabase.min.js', (r) => r.fulfill({ contentType: 'text/javascript', body: FAKE }));
  const login = async (email, pw) => { await p.waitForSelector('#loginForm'); await p.fill('#em', email); await p.fill('#pw', pw); await p.click('#loginForm button[type=submit]'); };

  await p.goto(B);
  await login('owner@test', 'غلط');
  await p.waitForFunction(() => document.querySelector('#loginErr').textContent.length > 0);
  ok((await p.textContent('#loginErr')).includes('غلط'), 'كلمة سر غلط ← رسالة');
  await login('owner@test', 'pw');
  await p.waitForSelector('#mfaForm');
  ok(await p.isVisible('img.qr') && (await p.textContent('code.secret')) === 'JBSWY3DPEHPK3PXP', 'أول دخول: QR + المفتاح اليدوي');
  ok(!(await p.isVisible('nav.tabs')), 'قبل الرمز: ولا بيانات ولا تبويبات');
  await p.screenshot({ path: process.argv[2] + '/adm_mfa_enroll.png' });
  await p.fill('#otp', '12345'); await p.click('#mfaForm button[type=submit]');
  ok((await p.textContent('#mfaErr')).includes('6 أرقام'), 'رمز ناقص ← «الرمز 6 أرقام»');
  await p.fill('#otp', '999999'); await p.click('#mfaForm button[type=submit]');
  await p.waitForFunction(() => /غلط/.test(document.querySelector('#mfaErr').textContent));
  ok(true, 'رمز غلط ← «الرمز غلط أو انتهى»');
  await p.fill('#otp', '١٢٣٤٥٦'); await p.click('#mfaForm button[type=submit]');
  await p.waitForSelector('nav.tabs');
  await p.click('nav.tabs a[href="#ledger"]'); await p.waitForSelector('nav.tabs a[href="#ledger"][aria-current=page]');
  ok((await p.textContent('#view')).includes('Supabase'), 'رمز صح (بأرقام عربية) ← البيانات تطلع');

  // «الملفات»: القائمة ← الملف بجداوله وكوده وصوره
  await p.click('nav.tabs a[href="#files"]'); await p.waitForSelector('nav.tabs a[href="#files"][aria-current=page]');
  ok(await p.locator('#view ul.list li').count() === 1, 'الملفات: القائمة بعد الرمز');
  await p.click('#view a[href="#files/hayati"]'); await p.waitForSelector('article.doc');
  const doc = await p.evaluate(() => { const a = document.querySelector('article.doc'); return { h: a.querySelectorAll('h2,h3').length, pre: a.querySelectorAll('pre').length, tbl: a.querySelectorAll('table').length, imgs: [...a.querySelectorAll('img')].map((i) => i.complete && i.naturalWidth > 0), scripts: a.querySelectorAll('script').length }; });
  ok(doc.h >= 5 && doc.pre >= 3 && doc.tbl >= 1 && doc.scripts === 0, 'الملفات: العناوين والكود والجداول تنعرض (' + JSON.stringify({ h: doc.h, pre: doc.pre, tbl: doc.tbl }) + ')');
  await p.waitForTimeout(500);
  const loaded = await p.evaluate(() => [...document.querySelectorAll('article.doc img')].every((i) => i.complete && i.naturalWidth > 0));
  ok(doc.imgs.length === 3 && loaded, 'الملفات: الصور الثلاث تحمّلت من docs-img');
  const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(over <= 0, 'الملفات: بدون طلوع برا الشاشة (' + over + 'px)');
  await p.screenshot({ path: process.argv[2] + '/adm_doc.png', fullPage: true });

  await p.click('#signOut'); await p.waitForSelector('#loginForm');
  await login('owner@test', 'pw'); await p.waitForSelector('#mfaForm');
  ok(!(await p.isVisible('img.qr')), 'الدخول الثاني: رمز بس بدون QR');
  await p.fill('#otp', '123456'); await p.click('#mfaForm button[type=submit]'); await p.waitForSelector('nav.tabs');
  ok(true, 'الدخول الثاني بالرمز ← اللوحة');

  await p.click('#signOut'); await p.waitForSelector('#loginForm');
  await login('other@test', 'pw');
  await p.waitForFunction(() => /صلاحية/.test(document.querySelector('#app').textContent));
  ok(!(await p.isVisible('#mfaForm')) && !(await p.isVisible('nav.tabs')), 'حساب مو أدمن ← «ما عندك صلاحية» بدون رمز ولا بيانات');
  ok(errs.length === 0, 'ولا خطأ JS ولا مخالفة CSP' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(pass + ' نجح · ' + fail + ' فشل');
  await b.close(); process.exit(fail ? 1 : 0);
})();
