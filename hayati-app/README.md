# حياتي (Hayati)

Personal life-OS PWA: expenses, budgets, bank/BenefitPay SMS parsing, study schedule, GPA, gym program, health, tasks, prayer times.

- Live: https://claude.ai/artifact/JzeqtXVSutJGoi69eRK1d2
- Source snapshot pulled from artifact version `1791724043-f44e`.
- Data is **not** in this repo — it lives in the artifact's `db` (per Claude user), or Supabase if `config.js` is filled.

## الملفات
```
hayati-app/
├── index.html · privacy.html · terms.html · manifest.webmanifest · sw.js   ← لازم بالجذر (روابط المتاجر، ونطاق sw.js)
├── js/
│   ├── core/       config · sms · store · icons · app        ← الأساس، بهالترتيب
│   ├── i18n/       i18n-en · i18n                            ← الإنجليزي (طبقة عرض بس)
│   ├── features/   الميزات (كل ملف يضيف على window.Extras)
│   └── native/     native.js                                 ← الآيفون بس (Capacitor)
├── docs/           IOS.md · STORE.md · MONEY.md · DATA.md (خريطة البيانات)
├── icons/ · brand/ · store/ (صور المتاجر) · supabase/
├── tests/          app.spec.js (متصفح بمقاس الآيفون) · unit/ (قارئ رسايل البنك)
├── scripts/        cap-www.js (يجهّز www/ للآيفون) · ios-smoke.sh (اختبار السميوليتر)
└── ios/ · www/ · dist/   ← تنبني: Xcode، نسخة الآيفون، ونسخة ملف واحد بدون نت
```
**ترتيب السكربتات** بـ `index.html` مهم (كل ملف يعتمد على اللي قبله). أي سكربت جديد: أضفه هناك **وبـ `SHELL` في `sw.js`** (فيه اختبار يتأكد).

## وين ألقى…؟
| الميزة | الملف |
|---|---|
| اليوم، المصاريف، الجدول، المهام، الإعدادات، النوافذ | `js/core/app.js` |
| البيانات والمزامنة (`S.upsert`، `S.remove`) | `js/core/store.js` · وشكلها بـ `docs/DATA.md` |
| قراءة رسايل البنك و BenefitPay | `js/core/sms.js` |
| الصلاة، العادات، الماء والنوم، ملخص الصباح، تنبيه الميزانية، تفاصيل المادة | `js/features/extras.js` |
| تقسيم الفاتورة، تحديات التوفير، ملخص السنة، الدرجات الجزئية، بطاقات المراجعة، المناسبات، المقاضي | `js/features/extras2.js` |
| تقرير الأسبوع + وضع الحارس والمباريات | `js/features/extras3.js` |
| سؤال الحضور، هدف المذاكرة، جاهزية الاختبار | `js/features/study.js` |
| توقع آخر الشهر + الجاهزية | `js/features/insights.js` |
| البحث + التراجع | `js/features/find.js` |
| بطاقة الترحيب والأدوار (`App.has`) | `js/features/community.js` |
| الخصوصية، الحذف، تذكير النسخة الاحتياطية، رقم الإصدار | `js/features/privacy.js` |
| تصدير التقويم (.ics) | `js/features/calendar.js` |
| Apple Watch (النوم والنبض) | `js/features/watch.js` |
| استيراد جدول التمارين (صورة/PDF/رسالة) | `js/features/import.js` |
| القفل بالرمز | `js/features/lock.js` |
| الحركة | `js/features/motion.js` |
| رقم أيقونة التطبيق | `js/features/pwa.js` |
| تنبيهات الآيفون، الأزرار، الاهتزاز، المشاركة | `js/native/native.js` |
| الإنجليزي | `js/i18n/i18n.js` + القاموس `js/i18n/i18n-en.js` |

Run locally: `npx serve hayati-app` (artifact db unavailable outside claude.ai → falls back to localStorage/Supabase).

## Tests
```bash
cd hayati-app
npm ci
npx playwright install chromium   # first time only
npm test          # unit (bank message reader) + browser tests at iPhone size
npm run build     # rebuild dist/Hayati.html after any change (a test fails if it's stale)
```
GitHub runs the same tests on every push/PR touching `hayati-app/` (`.github/workflows/hayati-tests.yml`).
