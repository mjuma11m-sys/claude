# حياتي · Hayati

**وش هو:** يومك بمكان واحد: المصاريف والميزانية (مع قراءة رسايل البنك)، المواعيد والجدول الدراسي، المعدل، المهام، العبادة، المحاضرات، السفر، والصحة.
**الحالة:** نسخة تجريبية · قيد التطوير. موجود على الويب، ومو منشور بأي متجر للحين (حساب Google Play محظور لين يثبتون الهوية، وApp Store ما انفحص).
**المستودع:** `mjuma11m-sys/hayati` (خاص) · **الويب:** `claude-eosin-seven.vercel.app`

![شاشة «اليوم»](docs-img/hayati-today.jpg)
![المصاريف](docs-img/hayati-money.jpg)
![الدراسة](docs-img/hayati-study.jpg)

> * لقطات ببيانات تجريبية

## التقنيات
| الطبقة | المستخدم | ليش |
|---|---|---|
| الواجهة | JavaScript عادي (بدون React وبدون build للويب) | يشتغل من ملفات ثابتة، ويفتح بسرعة على أي جوال |
| الويب | PWA: `manifest.webmanifest` + `sw.js` | يتثبّت على الشاشة ويشتغل بدون نت |
| الجوال | Capacitor 8 (آيفون وأندرويد) | نفس الكود يصير تطبيق، وفوقه plugins أصلية |
| الأصلي (iOS) | Swift: `HealthPlugin` · `RecorderPlugin` · `SpeechPlugin` · `WidgetPlugin` · `ShareInPlugin` | الصحة، تسجيل المحاضرة، تحويلها لنص بالجهاز، الودجت، المشاركة |
| الأصلي (Android) | Java: `HayatiWidget` · `WidgetPlugin` · `ShareInPlugin` | الودجت ومشاركة رسالة البنك للتطبيق |
| البيانات | `localStorage` أول، وSupabase اختياري (فرانكفورت) | يشتغل بدون حساب؛ الحساب للمزامنة بين الأجهزة |
| الذكاء الاصطناعي | Supabase Edge Function `lecture-ai` ← Claude (Opus 5.5 للملخصات، Sonnet 5.5 لـ «اسأل حياتي») | المفتاح بأسرار السيرفر، ما يوصل للجوال أبداً |
| الإنقليزي | طبقة ترجمة للنص الظاهر (`js/i18n`) | العربي هو الأصل، والإنقليزي ما يغيّر البيانات |

## الهيكل
```
hayati/
├── index.html · sw.js · manifest.webmanifest · privacy.html · terms.html
├── js/
│   ├── core/       config · sms · store · icons · app   ← الأساس، بهالترتيب بالضبط
│   ├── features/   كل ميزة بملف (تضيف نفسها على window.Extras)
│   ├── i18n/       i18n.js + القاموس i18n-en.js
│   └── native/     native.js (تنبيهات، اهتزاز، مشاركة — Capacitor بس)
├── ios/ · android/  ← مشاريع Xcode وAndroid Studio (يولّدها Capacitor + plugins مكتوبة يدوي)
├── supabase/       schema.sql (الجداول + RLS) · functions/lecture-ai
├── tests/          app.spec.js (Playwright بمقاس الآيفون) · unit/ (قارئ رسايل البنك)
└── .github/workflows  tests · android (محاكي) · ios (سميوليتر) · release
```
- `js/core/app.js` (2,366 سطر): الشاشات الأربع (اليوم، المصاريف، الدراسة، المهام) والنوافذ والإعدادات.
- ترتيب السكربتات بـ `index.html` مهم: كل ملف يعتمد على اللي قبله. أي ملف جديد ينضاف هناك **وبـ `SHELL` بـ `sw.js`**.

## البيانات والأمان
- كل الجداول (`transactions`, `courses`, `tasks`, `subscriptions`, `goals`, `debts`, `daily`…) تنحفظ بمفتاح واحد `hayati-v1` بالجهاز. الخريطة كاملة: `docs/DATA.md`.
- كل سجل فيه `id` و`updated_at`، وأي تعديل يدخل طابور `pending` ويرتفع لـ Supabase لما يرجع النت.
- بـ Supabase كل جدول عليه RLS «own rows»: كل مستخدم يشوف صفوفه بس.
- المبالغ بالدينار (3 خانات)، ورسايل البنك تنمسح منها أرقام البطاقات والـ IBAN قبل الحفظ.

```js
// js/core/store.js — كل كتابة تمر من هني: تنحفظ محلياً وتدخل طابور المزامنة
function upsert(table, row) {
  const list = state[table];
  const now = new Date().toISOString();
  const rec = Object.assign({}, row, { id: row.id || uuid(), updated_at: now });
  const i = list.findIndex((r) => r.id === rec.id);
  if (i >= 0) list[i] = Object.assign({}, list[i], rec);
  else list.push(rec);
  queue({ table, op: 'upsert', row: i >= 0 ? list[i] : rec });
  return rec;
}
```

## كيف تنضاف ميزة (النمط المستخدم)
كل ملف بـ `js/features` يلف الدالة اللي قبله بدل ما يعدّل `app.js`. مثال من الإعدادات:
```js
const prevExtra = E.settingsExtra;
E.settingsExtra = function () {
  return '<div class="group-title" data-sec="lock">الحماية</div>…' +
    (prevExtra ? prevExtra.apply(this, arguments) : '');
};
```
وترتيب الأقسام بالإعدادات يتقرر بمكان واحد (`arrangeSettings` + `data-sec`) مو بترتيب تحميل الملفات.

## تدفق رئيسي: رسالة البنك ← مصروف
1. المستخدم يلصق الرسالة، أو يشاركها من تطبيق الرسائل (`ShareInPlugin`)، أو تنرسل تلقائي من «الاختصارات» لدالة `ingest_sms` (برمز سري لكل مستخدم، وحد 60 رسالة بالساعة).
2. `js/core/sms.js`: `findAmount` ← `detectKind` (صرف/دخل) ← `findMerchant` ← `categorize` (يتعلّم من تصحيحاتك).
3. النتيجة تنعرض للتأكيد، وبعدها `S.upsert('transactions', …)` وتتحدث الميزانية وتوقع آخر الشهر.

## التشغيل والاختبار والنشر
```bash
npm install
npx serve .                 # الويب محلياً
npm test                    # unit 31 + Playwright 146 (بمقاس الآيفون)
npm run build               # dist/Hayati.html: نسخة ملف واحد تشتغل بدون نت
npm run cap:sync:android    # يجهّز www/ ويحدّث مشروع أندرويد
```
- **CI (GitHub Actions):** `hayati-tests` · `hayati-android` (يبني APK ويفتحه بمحاكي ويتأكد من الشاشة والمشاركة والودجت) · `hayati-ios` (سميوليتر) · `hayati-release`.
- **الويب:** Vercel مشروع `claude` ← فرع `main`. الرابط القديم `/hayati-app/` يتحوّل للجذر.
- **انتبه:** المستودع خاص، فـ iOS على GitHub ياخذ دقائق Mac (×10). وتشغيل Android يحتاج تفريغ مساحة قبل المحاكي (موجود بالـ workflow).
