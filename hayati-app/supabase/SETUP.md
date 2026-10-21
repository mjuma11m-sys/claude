# تشغيل المزامنة + تسجيل رسايل البنك تلقائياً (Supabase)

مجاني، وياخذ 10 دقايق تقريباً. تسويه مرة وحدة.

## 1) سوّ المشروع
1. ادخل **supabase.com** ← Sign in with GitHub ← **New project**.
2. الاسم: `hayati` · المنطقة: **Middle East (Bahrain)** لو موجودة، وإلا **Frankfurt** · احفظ كلمة سر قاعدة البيانات عندك.

## 2) الجداول (نسخ ولصق)
1. **SQL Editor** ← **New query**.
2. الصق محتوى `schema.sql` كامل ← **Run**. لازم يطلع **Success**.

## 3) تسجيل الدخول
- **Authentication → Providers → Email**: خلّه مفعّل.
- **Authentication → URL Configuration → Site URL**: رابط Vercel حقك (مثل `https://hayati-xxxx.vercel.app`).

## 3.5) الدخول السريع بـ Apple وGoogle (اختياري)
> المفاتيح السرية (Client Secret حق Google، وملف `.p8` حق Apple) **تنحط بلوحة Supabase بس**. لا بالكود، ولا بالريبو، ولا بالشات.

**الروابط اللي تحتاجها (انسخها):**
| وين | القيمة |
|---|---|
| Supabase ← Authentication ← URL Configuration ← **Redirect URLs** | رابط Vercel (مثل `https://hayati-xxxx.vercel.app/hayati-app/`) **و** `bh.hayati.app://auth` (للآيفون) |
| رابط الرجوع (Callback) اللي يطلبه Google وApple | `https://<مشروعك>.supabase.co/auth/v1/callback` (تلقاه بصفحة المزود بـ Supabase) |

**Google** (15 دقيقة):
1. **console.cloud.google.com** ← مشروع جديد `hayati` ← **APIs & Services** ← **OAuth consent screen**: External، الاسم «حياتي»، إيميل الدعم، رابط `privacy.html` و`terms.html`.
2. **Credentials** ← **Create credentials** ← **OAuth client ID** ← **Web application** ← **Authorized redirect URIs**: رابط الـ Callback فوق.
3. انسخ **Client ID** و**Client secret** ← Supabase ← Authentication ← Providers ← **Google** ← فعّل والصقهم.

**Apple** (يحتاج حساب Apple Developer، 20 دقيقة):
1. **developer.apple.com** ← Certificates, IDs & Profiles ← **Identifiers**: افتح `bh.hayati.app` ← فعّل **Sign In with Apple**.
2. **Identifiers** ← ➕ ← **Services IDs** ← مثل `bh.hayati.app.signin` ← فعّل Sign In with Apple ← **Configure**: Domain = `<مشروعك>.supabase.co`، Return URL = رابط الـ Callback.
3. **Keys** ← ➕ ← فعّل Sign In with Apple ← نزّل ملف `.p8` (ينزل **مرة وحدة**، احفظه بمكان آمن).
4. Supabase ← Providers ← **Apple** ← فعّل ← Services ID + Team ID + Key ID + محتوى `.p8`.

> ⏰ **مفتاح Apple ينتهي كل 6 شهور:** خانة Secret Key بـ Supabase ← Apple هي JWT من ملف `.p8` (Team ID + Key ID + Services ID). اللي انحط بأكتوبر 2026 (المفتاح `M47U8QGABU` لو هو) ينتهي **تقريباً منتصف أبريل 2027**، وبعدها الدخول بـ Apple يوقف. قبلها: ولّد JWT جديد من نفس ملف `.p8` والصقه بنفس الخانة.

**بعدها:** ما تحتاج تعدّل الكود (DW-035): صفحة «حسابك» تسأل Supabase أول ما تنفتح، وأي مزوّد مفعّل يطلع زره بروحه. (`PROVIDERS` بـ `js/core/config.js` يظل يشتغل للاختبار.)

> Apple تشترط (إرشاد 4.8): لو فيه دخول بـ Google لازم يكون فيه Sign in with Apple. والتطبيق يظل يشتغل **بدون حساب** (إرشاد 5.1.1)، وحذف الحساب من داخله (5.1.1 v).

## 4) اربط التطبيق
1. **Project Settings → API**: انسخ **Project URL** و **anon public key**.
2. الصقهم بـ `js/core/config.js` (`SUPABASE_URL` و`SUPABASE_ANON_KEY`)، أو من التطبيق: ⚙️ ← «حسابك» ← **ربط**. بعدها سوّ حساب (إيميل، Apple، أو Google).
3. سوّ نفس الشي على الماك بنفس الحساب ← البيانات تتزامن لحظياً.

> مفتاح `anon` عادي يكون بالتطبيق — الحماية من Row Level Security (كل واحد يشوف بياناته بس). **لا تحط `service_role` key بأي مكان.**

## 5) رسايل البنك تلقائياً (iPhone)
⚙️ ← «تسجيل رسايل البنك تلقائياً» — التطبيق يعطيك الرابط والمفاتيح جاهزة للنسخ، والخطوات بالاختصارات:
الأتمتة ← الرسائل ← المرسل: البنك / BenefitPay ← تشغيل فوراً ← «الحصول على محتويات URL» (POST + `apikey` + JSON فيه `token` و `body`).

## الحماية — شنو مجرّب
- كل جهاز يعرف صاحب بياناته: الخروج يمسح الجهاز، وحساب ثاني ما يشوف بيانات الأول، وتعديلات حساب ما تنرفع لغيره — مجرّب (Supabase وهمي).
- مستخدم ما يقدر يقرا أو يكتب بيانات مستخدم ثاني (RLS) — مجرّب.
- الرمز السري للرسايل ما ينقرا من برّا، والرمز الغلط ينرفض — مجرّب.
- حد أقصى 60 رسالة بالساعة، وطول الرسالة 2000 حرف — مجرّب.

## الذكاء (دالة `lecture-ai`): حد مجاني شهري (DW-068)
1. **SQL Editor** ← شغّل `schema.sql` مرة ثانية (يضيف جدول `ai_quota` بأمان، ما يمسح شي).
2. **Edge Functions → Secrets**: `ANTHROPIC_API_KEY` (إجباري). اختياري: `AI_MONTHLY` مثل `{"study":3,"slides":3,"schedule":2,"ask":5}`.
3. انشر الدالة: `supabase functions deploy lecture-ai`.
4. بعد شهر، كم واحد وصل الحد؟ (عدد بس، بدون أي محتوى):
   `select feature, count(*) filter (where calls >= 3) as hit, count(*) as users from ai_quota where month = date_trunc('month', current_date)::date group by feature;`
   لو 15% أو أكثر وصلوا الحد ← نفتح نقاش «حياتي بلس».
