// قارئ رسائل البنك: أرقام ومحلات وتصنيفات (node --test)
const test = require('node:test');
const assert = require('node:assert');
const P = require('../../js/core/sms.js');

test('BenefitPay / card purchase → expense with merchant and category', () => {
  const r = P.parse('Your card XX4821 was used for BHD 3.750 at COSTA COFFEE SEEF on 11/10/26. Avl bal BHD 412.300');
  assert.equal(r.kind, 'expense');
  assert.equal(r.amount, 3.75);
  assert.equal(r.currency, 'BHD');
  assert.match(r.merchant, /COSTA COFFEE/i);
  assert.equal(r.category, 'قهوة');
});

test('available balance is never taken as the amount', () => {
  const r = P.parse('Purchase of BHD 12.500 at LULU HYPERMARKET. Available balance BHD 980.000');
  assert.equal(r.amount, 12.5);
  assert.equal(r.category, 'بقالة وتسوق');
});

test('Arabic message with Arabic-Indic digits', () => {
  const r = P.parse('تم خصم مبلغ ٥٫٢٥٠ د.ب من بطاقتك لدى طلبات بتاريخ ١١/١٠');
  assert.equal(r.kind, 'expense');
  assert.equal(r.amount, 5.25);
  assert.equal(r.category, 'أكل ومطاعم');
});

test('incoming transfer → income', () => {
  const r = P.parse('BHD 150.000 credited to your account from UNIVERSITY OF BAHRAIN. Ref 9921');
  assert.equal(r.kind, 'income');
  assert.equal(r.amount, 150);
});

test('OTP messages are ignored', () => {
  assert.equal(P.parse('Your OTP is 482913 for BHD 20.000 at AMAZON. Do not share it.'), null);
});

test('foreign currency is flagged for review', () => {
  const r = P.parse('Card used for USD 25.00 at NETFLIX.COM');
  assert.equal(r.currency, 'USD');
  assert.equal(r.needs_review, true);
});

test('non-financial text → null', () => {
  assert.equal(P.parse('مرحبا شلونك'), null);
});

test('brand: branches, Arabic and English names collapse to one shop', () => {
  for (const n of ['COSTA SEEF', 'Costa Coffee', 'كوستا', 'كوستا السيف']) assert.equal(P.brand(n).key, 'costa', n);
  assert.equal(P.brand('آيس كريم المحرق').key, 'آيس كريم'); // مو Careem
  assert.equal(P.brand('مطعم الزينة').key, 'مطعم الزينة'); // مو Zain
  assert.equal(P.brand('Careem Ride').key, 'careem');
  const g = P.groupByBrand([
    { merchant: 'COSTA SEEF', amount: 2 }, { merchant: 'Costa Coffee', amount: 3 }, { merchant: 'كوستا', amount: 1 },
    { merchant: 'Haji Gahwa', amount: 1 }, { merchant: 'HAJI GAHWA MANAMA', amount: 2 }, { merchant: '', category: 'قهوة', amount: 1 },
  ]);
  assert.deepEqual(g.map((x) => [x.label, x.sum, x.n]), [['Costa', 6, 3], ['Haji Gahwa', 3, 2], ['قهوة', 1, 1]]);
});

test('mask: card, account and IBAN numbers hidden; amounts and dates kept', () => {
  assert.equal(P.mask('Your card XX4821 was used for BHD 3.750 on 11/10/26. Avl bal BHD 412.300'), 'Your card ••21 was used for BHD 3.750 on 11/10/26. Avl bal BHD 412.300');
  assert.equal(P.mask('Card ****4821 purchase BHD 1,250.000'), 'Card ••21 purchase BHD 1,250.000');
  assert.equal(P.mask('IBAN BH67BMAG00001299123456'), 'IBAN BH••56');
  assert.equal(P.mask('بطاقة 5123 4567 8901 2345 مبلغ 1250.000'), 'بطاقة ••45 مبلغ 1250.000');
  // القراءة تشتغل على النص الأصلي، والإخفاء ما يغيّر المبلغ
  assert.equal(P.parse(P.mask('Your card XX4821 was used for BHD 3.750 at COSTA')).amount, 3.75);
});

test('سطر سريع من التنبيه (DW-038): المبلغ قبل أو بعد، أرقام عربية، + للدخل', () => {
  assert.deepStrictEqual(P.quick('1.200 قهوة'), { kind: 'expense', amount: 1.2, merchant: 'قهوة', category: 'قهوة' });
  assert.deepStrictEqual(P.quick('٣٫٥ كوستا'), { kind: 'expense', amount: 3.5, merchant: 'كوستا', category: 'قهوة' });
  assert.strictEqual(P.quick('طلبات 4.5 د.ب').category, 'أكل ومطاعم');
  assert.strictEqual(P.quick('طلبات 4.5 د.ب').merchant, 'طلبات');
  assert.strictEqual(P.quick('+50 راتب').kind, 'income');
  assert.strictEqual(P.quick('3').category, 'أخرى');
  for (const bad of ['', 'hello', '0', 'قهوة']) assert.strictEqual(P.quick(bad), null);
});

test('تصنيفاتك (DW-043): تصحيح محل مرة يغلب القواعد، بنفس المفتاح لفروعه، والدخل منفصل عن الصرف', () => {
  P.setLearned({});
  const msg = 'Purchase of BHD 4.000 at ALDANA STORE SEEF. Available balance BHD 100.000';
  assert.strictEqual(P.parse(msg).category, 'أخرى');   // محل ما تعرفه القواعد
  assert.ok(P.learn('expense', 'ALDANA STORE SEEF', 'هدايا'));
  assert.strictEqual(P.parse(msg).category, 'هدايا');
  assert.strictEqual(P.parse('Purchase of BHD 9.000 at ALDANA STORE MANAMA').category, 'هدايا');   // فرع ثاني = نفس المحل
  assert.strictEqual(P.learnedFor('income', 'ALDANA STORE'), null);
  assert.strictEqual(P.quick('aldana store 3').category, 'هدايا');
  assert.strictEqual(P.learn('expense', '', 'x'), false);
  P.setLearned({});
  assert.strictEqual(P.parse(msg).category, 'أخرى');
});

// DW-057: تاريخ العملية من الرسالة نفسها
test('transaction date comes from the message text (day/month first, time if present)', () => {
  const now = new Date(2026, 9, 17, 16, 0);
  const at = (t) => { const d = P.parse(t, now).date; return d && [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()]; };
  assert.deepEqual(at('Your card XX4821 was used for BHD 3.750 at COSTA on 11/10/26. Avl bal BHD 412.300'), [2026, 10, 11, 12, 0]);
  assert.deepEqual(at('تم خصم مبلغ ٥٫٢٥٠ د.ب من بطاقتك لدى طلبات بتاريخ ١١/١٠'), [2026, 10, 11, 12, 0]);
  assert.deepEqual(at('Purchase of BHD 12.500 at LULU on 2026-10-14 19:42'), [2026, 10, 14, 19, 42]);
  assert.deepEqual(at('BHD 8.000 debited on 05-OCT-26 at 21:15 TALABAT'), [2026, 10, 5, 21, 15]);
  assert.deepEqual(at('Card used BHD 2.500 at X on 15 Oct 2026 8:05 PM'), [2026, 10, 15, 20, 5]);
  assert.deepEqual(at('خصم 4.000 د.ب في 12 أكتوبر الساعة 09:30'), [2026, 10, 12, 9, 30]);
  assert.deepEqual(at('Purchase BHD 3.500 on 25/12 at X'), [2025, 12, 25, 12, 0]);        // بدون سنة وبالمستقبل = السنة اللي فاتت
  assert.deepEqual(at('Purchase BHD 3.500 on 10/17/2026 at X'), [2026, 10, 17, 16, 0]);   // شهر/يوم، واليوم بدون وقت = الحين
  assert.equal(at('Purchase of BHD 3.200 at COSTA SEEF using card XXXX4821'), null);
  assert.equal(at('Purchase BHD 3.500 on 11/10/29 at X'), null);                          // مستقبل: مو تاريخ العملية
  assert.equal(at('BHD 412.300 available. Purchase BHD 3.750'), null);                     // المبالغ ما تنقرا تاريخ
});
