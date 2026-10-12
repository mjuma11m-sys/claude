// قارئ رسائل البنك: أرقام ومحلات وتصنيفات (node --test)
const test = require('node:test');
const assert = require('node:assert');
const P = require('../../sms.js');

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
