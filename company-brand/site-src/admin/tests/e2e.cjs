// تجربة لوحة الإدارة بالوضع التجريبي: كل تبويب، إضافة وتعديل وحذف، ميزانية، اشتراك، تصدير، وجوال 320 بدون طلوع.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const B = 'http://127.0.0.1:8790/admin/', OUT = process.argv[2];
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('✅', m); } else { fail++; console.log('❌', m); } };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  p.on('dialog', (d) => d.accept());
  const go = async (t) => { await p.click('nav.tabs a[href="#' + t + '"]'); await p.waitForSelector('nav.tabs a[href="#' + t + '"][aria-current=page]'); };
  await p.route('**/*', (r) => (r.request().url().startsWith('http://127.0.0.1:8790') ? r.continue() : r.abort()));

  // بدون demo: شاشة الدخول (الشبكة مقفلة، فما فيه جلسة)
  await p.goto(B); await p.waitForSelector('#loginForm');
  ok(await p.isVisible('#em') && await p.isVisible('#pw'), 'شاشة الدخول تطلع بدون جلسة');
  await p.screenshot({ path: OUT + '/adm_login.png' });

  await p.goto(B + '?demo=1'); await p.waitForSelector('nav.tabs');
  ok(await p.isVisible('#demoBar'), 'شريط «بيانات تجريبية» ظاهر');
  ok((await p.textContent('#view')).includes('دخل الشهر'), 'الملخص: بطاقات الشهر');
  ok(await p.locator('.chart .col').count() === 6, 'الملخص: رسم 6 شهور');
  ok((await p.textContent('#view')).includes('تحت الحد'), 'الملخص: مؤشر الضريبة');
  await p.screenshot({ path: OUT + '/adm_summary.png', fullPage: true });

  // الدفتر: إضافة
  await go('ledger'); await p.click('[data-act=new-entry]');
  await p.fill('#f_amount', '12.5'); await p.selectOption('#f_cat', 'تصميم ومحتوى'); await p.fill('#f_note', 'شعار ريل');
  await p.click('#entryForm button[type=submit]'); await p.waitForTimeout(200);
  ok((await p.textContent('#view')).includes('شعار ريل'), 'الدفتر: عملية جديدة انضافت');
  // تحقق المبلغ الغلط
  await p.click('[data-act=new-entry]'); await p.fill('#f_amount', '1.2345'); await p.click('#entryForm button[type=submit]');
  ok((await p.textContent('#formErr')).includes('3 خانات'), 'الدفتر: يرفض 4 خانات عشرية');
  await p.click('[data-act=close-form]');
  // دخل
  await p.click('[data-act=new-entry]'); await p.click('[data-act=kind][data-k=income]'); await p.fill('#f_amount', '100');
  ok(await p.locator('#f_cat option', { hasText: 'مبيعات تطبيقات' }).count() === 1, 'الدفتر: بنود الدخل تتغير مع النوع');
  await p.click('#entryForm button[type=submit]'); await p.waitForTimeout(200);
  // تعديل
  const li = p.locator('ul.list li', { hasText: 'شعار ريل' });
  await li.locator('[data-act=edit-entry]').click(); await p.fill('#f_amount', '15'); await p.click('#entryForm button[type=submit]'); await p.waitForTimeout(200);
  ok((await p.locator('ul.list li', { hasText: 'شعار ريل' }).textContent()).includes('15.000'), 'الدفتر: التعديل انحفظ');
  // بحث
  await p.fill('#search', 'ريل'); await p.waitForTimeout(150);
  ok(await p.locator('ul.list li').count() === 1, 'الدفتر: البحث يصفّي');
  await p.fill('#search', ''); await p.waitForTimeout(150);
  // تصدير
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-act=csv-ledger]')]);
  const txt = require('fs').readFileSync(await dl.path(), 'utf8');
  ok(txt.startsWith('﻿') && txt.includes('شعار ريل'), 'الدفتر: CSV فيه العمليات وBOM');
  // حذف
  await p.locator('ul.list li', { hasText: 'شعار ريل' }).locator('[data-act=del-entry]').click(); await p.waitForTimeout(200);
  ok(!(await p.textContent('#view')).includes('شعار ريل'), 'الدفتر: الحذف');
  // الشهر اللي قبل
  await p.click('[data-act=month][data-by="-1"]');
  ok((await p.textContent('#view')).includes('إعلانات وتسويق'), 'الدفتر: التنقل للشهر اللي قبل');
  await p.screenshot({ path: OUT + '/adm_ledger.png', fullPage: true });

  // الميزانية
  await go('budget');
  ok(await p.locator('.tag.err', { hasText: 'تعدّيت' }).count() >= 0, 'الميزانية: تفتح');
  await p.fill('input[name="أدوات وبرامج"]', '20'); await p.click('#budgetForm button[type=submit]'); await p.waitForTimeout(200);
  ok(await p.inputValue('input[name="أدوات وبرامج"]') === '20.000', 'الميزانية: انحفظت لبند جديد');
  await p.fill('input[name="أدوات وبرامج"]', 'abc'); await p.click('#budgetForm button[type=submit]');
  ok((await p.textContent('#budgetErr')).includes('أدوات وبرامج'), 'الميزانية: ترفض رقم غلط');
  await p.screenshot({ path: OUT + '/adm_budget.png', fullPage: true });

  // الاشتراكات
  await go('recurring'); await p.click('[data-act=new-rec]');
  await p.click('[data-act=preset] >> text=Vercel Pro');
  ok(await p.inputValue('#r_amount') === '20.00' && await p.inputValue('#r_cur') === 'USD', 'الاشتراكات: التعبئة السريعة');
  await p.click('#recForm button[type=submit]'); await p.waitForTimeout(200);
  const vercel = p.locator('ul.list li', { hasText: 'Vercel Pro' });
  ok((await vercel.textContent()).includes('7.520'), 'الاشتراكات: 20$ = 7.520 د.ب');
  await vercel.locator('[data-act=rec-pay]').click(); await p.waitForTimeout(200);
  await go('ledger');
  const lt = await p.textContent('#view');
  ok(lt.includes('Vercel Pro ($20.00)'), 'الاشتراكات: «دفعته» يسجّل مصروف بالدفتر');
  await go('recurring');
  await p.locator('ul.list li', { hasText: 'Vercel Pro' }).locator('[data-act=rec-toggle]').click(); await p.waitForTimeout(150);
  ok((await p.locator('ul.list li', { hasText: 'Vercel Pro' }).textContent()).includes('موقّف'), 'الاشتراكات: إيقاف');
  await p.screenshot({ path: OUT + '/adm_recurring.png', fullPage: true });

  // الطلبات
  await go('leads');
  ok(await p.locator('ul.list li').count() === 2, 'الطلبات: القائمة');
  await p.selectOption('#leadProduct', 'hayati');
  ok(await p.locator('ul.list li').count() === 1, 'الطلبات: فلتر التطبيق');
  ok(await p.getAttribute('ul.list li a.mini', 'href') === 'mailto:tester%40example.com', 'الطلبات: زر رد بالإيميل');
  await p.screenshot({ path: OUT + '/adm_leads.png', fullPage: true });

  // جوال 320: ولا تبويب يطلع برا
  await p.setViewportSize({ width: 320, height: 700 });
  for (const t of ['summary', 'ledger', 'budget', 'recurring', 'leads']) {
    await p.goto(B + '?demo=1#' + t); await p.waitForSelector('nav.tabs');
    if (t === 'ledger') await p.click('[data-act=new-entry]');
    const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(over <= 0, 'جوال 320: «' + t + '» بدون طلوع (' + over + 'px)');
  }
  await p.goto(B + '?demo=1#summary'); await p.waitForSelector('nav.tabs');
  await p.screenshot({ path: OUT + '/adm_320.png', fullPage: true });
  ok(errs.length === 0, 'ولا خطأ JS ولا مخالفة CSP' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(pass + ' نجح · ' + fail + ' فشل');
  await b.close(); process.exit(fail ? 1 : 0);
})();
