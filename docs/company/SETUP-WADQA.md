# تأسيس «ودقة · WADQA» — قائمة المالك (DW-049)

> مسودة للمراجعة — مو استشارة قانونية ملزمة. الرسوم والإجراءات تتغير: تأكد من المصدر الرسمي قبل الدفع.
> الترتيب مهم: **الاسم ← الدومين والحسابات ← السجل ← العلامة ← البنك والدفع ← المتاجر**.

## 1) تثبيت الاسم (هالأسبوع)
| # | المهمة | وين | ملاحظة |
|---|---|---|---|
| 1 | فحص توفر «ودقة» كاسم تجاري | sijilat.bh | لو مو متاح: «ودقة للبرمجيات» أو «WADQA Studio» |
| 2 | فحص العلامة التجارية | WIPO Global Brand Database + بحث وزارة الصناعة والتجارة | أقرب اسم لقيناه: Waqd (شركة سعودية) |
| 3 | حجز `wadqa.com` (+ `wadqa.app` اختياري) | Cloudflare Registrar أو Namecheap | تقدير: 10–20$ بالسنة لكل دومين |
| 4 | حجز `@wadqa` | إنستغرام، تيك توك، X، يوتيوب، LinkedIn، GitHub org | طقم الصور جاهز: `company-brand/out/social/` |
| 5 | إيميل `hello@wadqa.com` | Cloudflare Email Routing (تحويل مجاني لإيميلك) أو Google Workspace | **الموقع ما ينشر قبل ما يشتغل هالإيميل** |

## 2) السجل التجاري
- **المسار المقترح:** «سجلي» (السجل الافتراضي للنشاط من البيت) عبر Sijilat، باسم مؤسسة فردية. أبسط وأرخص من ذ.م.م.
- **النشاط:** تطوير البرمجيات / التطبيقات (اختر الكود المطابق من قائمة Sijilat).
- 🔴 **محامي مرخّص** لو: شريك، مستثمر، ذ.م.م، أو أول موظف.
- بعد السجل: حط رقمه بسياسة خصوصية الموقع، والفاتورة، والختم (`company-brand/BRAND.md`).

## 3) العلامة التجارية
- التسجيل عند وزارة الصناعة والتجارة.
- **الفئات (تصنيف نيس):** 9 (برمجيات وتطبيقات قابلة للتنزيل) و42 (تطوير البرمجيات والخدمات البرمجية).
- سجّل الاسم العربي واللاتيني والشعار (القطرة).

## 4) البنك والدفع
- حساب بنكي تجاري باسم المؤسسة (يحتاج السجل).
- BenefitPay للأعمال، وبوابة بطاقات (Tap / Credimax) لو صار فيه اشتراكات داخل التطبيقات.
- **VAT:** التسجيل إلزامي فوق 37,500 BHD سنوياً واختياري من 18,750 BHD. تحت الحد = فاتورة عادية (القالب يبدّلها لـ«فاتورة ضريبية» بروحه لو حطيت الرقم الضريبي).

## 5) المتاجر
- حساب **منظمة** بـ Google Play وApple Developer باسم ودقة يحتاج رقم **D-U-N-S** (مجاني من Dun & Bradstreet، ياخذ أيام إلى أسابيع).
- انقل «حياتي» من الحساب الشخصي لحساب المنظمة بعد ما يجهز (الاثنين يدعمون نقل التطبيق).

## 6) الموقع (DW-050)
- **المصدر:** `company-brand/site-src/` ← `node company-brand/site-src/build.mjs` يولّد `company-brand/site/` (10 صفحات: عربي `/` وإنقليزي `/en/`).
- **النشر على Vercel (مشروع جديد، مو مشروع حياتي):**
  1. Vercel ← Add New ← Project ← استورد المستودع `mjuma11m-sys/claude`.
  2. **Root Directory:** `company-brand/site` · **Framework:** Other · **Build Command:** فاضي (الملفات مبنية جاهزة).
  3. Deploy. الإعدادات (`cleanUrls` + CSP + الهيدرات الأمنية) من `company-brand/site/vercel.json`.
  4. Settings ← Domains ← أضف `wadqa.com` و`www.wadqa.com`، وحط سجلات DNS اللي يعطيك إياها Vercel عند مسجّل الدومين.
  5. الفرع: Vercel ينشر `main` كإنتاج. ادمج فرع العمل بـ `main` أو غيّر Production Branch.
- **النماذج:** تحفظ بجدول `wadqa.leads` بمشروع Supabase «hayati» (فرانكفورت). ما ينقرا من المتصفح أبداً.
  - **قراءة الرسائل:** Supabase ← SQL Editor ← `select created_at, kind, product, name, email, message from wadqa.leads order by created_at desc;`
  - **الحذف الشهري (وعد السياسة: 24 شهر):** `delete from wadqa.leads where created_at < now() - interval '24 months';`
- قبل النشر: فعّل `hello@wadqa.com` (الموقع يعرضه).

## الجاهز بالمستودع
| الملف | الاستخدام |
|---|---|
| `company-brand/site/index.html` + `privacy.html` | موقع الشركة |
| `company-brand/out/social/` | صورة البروفايل، بانر X وLinkedIn ويوتيوب، ستوري |
| `company-brand/templates/invoice.html` | فاتورة A4 تنحسب بروحها (مثال: `out/social/invoice-example.pdf`) |
| `company-brand/templates/email-signature.html` | توقيع الإيميل |
| `company-brand/out/letterhead-A4.pdf`، `business-card-*.png`، `stamp-*` | الأوراق الرسمية والختم |
| `videos/wadqa-ad/wadqa-ad.mp4` | الإعلان |
