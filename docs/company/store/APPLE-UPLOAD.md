# رفع إداراتي لأبل — خطوة خطوة (DW-044)

> الطريق: **TestFlight أول** (تجربة العائلات، بدون مراجعة أبل للمختبرين الداخليين) ← بعدين **App Store** (نشر عام، بعد المحامي).
> الرفع نفسه من GitHub بضغطة: «Idarati TestFlight». بس الحساب والمفتاح لازم منك — أبل ما تسمح لأحد غيرك.

## 0. قبل أي شي (مانع)
| البند | ليش | الحالة |
|---|---|---|
| Supabase → SQL Editor → الصق `docs/company/store/supabase-delete-account.sql` → Run | أبل ترفض أي تطبيق فيه حساب بدون «حذف الحساب من داخل التطبيق» (5.1.1(v)) | ✅ انطبق 2026-10-27 (security definer، authenticated بس) |

## 1. حساب Apple Developer (99$ بالسنة ≈ 37.3 د.ب)
1. افتح developer.apple.com/programs/enroll بحساب Apple ID عليه التحقق بخطوتين.
2. اختار النوع:
   - **فرد (Individual):** أسرع (يوم أو يومين). اسم البائع بالمتجر = اسمك «محمد جمعة».
   - **منظمة (WADQA):** يحتاج سجل تجاري + رقم D-U-N-S (مجاني، يأخذ أسبوع إلى أسبوعين). اسم البائع = WADQA.
3. ادفع، وانتظر رسالة «Welcome to the Apple Developer Program».

## 2. سجّل التطبيق بـ App Store Connect
appstoreconnect.apple.com ← Apps ← **+** ← New App:
| الخانة | القيمة |
|---|---|
| Platform | iOS |
| Name | إداراتي - إدارة الإيجارات |
| Primary Language | Arabic |
| Bundle ID | `bh.wadqa.idarati` (لو ما طلع: developer.apple.com ← Identifiers ← + ← App IDs ← نفس المعرّف) |
| SKU | idarati-001 |
| User Access | Full Access |

## 3. مفتاح الـ API (عشان GitHub يرفع بدالك)
App Store Connect ← Users and Access ← **Integrations** ← App Store Connect API ← Team Keys ← **+**:
- الاسم: `GitHub Idarati` · الصلاحية: **Admin** (لازم عشان Xcode يسوي شهادة التوزيع بنفسه).
- نزّل ملف `AuthKey_XXXXXXXX.p8` — **ينزل مرة وحدة بس**، احفظه بمكان آمن.
- انسخ **Key ID** و**Issuer ID** من نفس الصفحة.
- **Team ID:** developer.apple.com ← Account ← Membership details.

## 4. الأسرار بـ GitHub
github.com/mjuma11m-sys/claude ← Settings ← Secrets and variables ← Actions ← **New repository secret** (أربع مرات):
| الاسم | القيمة |
|---|---|
| `APPLE_TEAM_ID` | Team ID (10 حروف) |
| `ASC_KEY_ID` | Key ID |
| `ASC_ISSUER_ID` | Issuer ID |
| `ASC_KEY_P8` | افتح ملف ‎.p8 بأي محرر نصوص وانسخ **كل** اللي فيه (من `-----BEGIN PRIVATE KEY-----` لين `-----END PRIVATE KEY-----`) |

> لا ترسل هالقيم بالشات ولا بالإيميل — مكانها الأسرار بس.

## 5. ارفع
**الأسهل:** قل لي «ارفع» — أعدّل `my-rent/ios/ci/upload-request.txt` وأدفعه، والرفع يبدأ بروحه.
(زر GitHub ← Actions ← Idarati TestFlight ← Run workflow يطلع بس بعد ما ينضم الشغل للفرع الرئيسي `main`.)
- ~15 دقيقة. لو نجح: App Store Connect ← التطبيق ← TestFlight ← البناء يطلع بعد المعالجة (5–30 دقيقة).
- أول بناء يسألك عن التشفير: الجواب محفوظ مسبقاً بالتطبيق (`ITSAppUsesNonExemptEncryption = NO`)، فالمفروض ما يسأل.
- لو فشل: الخطوة الحمرا فيها السبب بالعربي، وسجل كامل بـ Artifacts. أرسل لي الخطأ وأصلحه.

## 6. TestFlight للعائلة (بدون مراجعة)
TestFlight ← Internal Testing ← **+** ← أضف إيميلات العائلة (لازم تضيفهم أول بـ Users and Access، لين 100 شخص).
- يحمّلون تطبيق **TestFlight** من المتجر، ويوصلهم إيميل دعوة ← «Install».
- مختبرين من برا الفريق (External): يحتاج «Beta App Review» من أبل (يوم تقريباً) + رابط سياسة الخصوصية.

## 7. النشر العام بالـ App Store (لاحقاً — بعد المحامي)
كل اللي يحتاجه جاهز بـ `docs/company/STORE-KIT.md`:
| الخانة | من وين |
|---|---|
| الوصف، الكلمات المفتاحية، العنوان الفرعي | STORE-KIT §3 |
| الصور | `docs/company/store/iphone-1..5-*.png` (1290×2796 — مقبولة لشاشة 6.9") |
| Privacy Policy URL | رابط `privacy.html` (الأحسن على دومين ثابت) |
| Support URL | رابط `about.html` |
| App Privacy (الأسئلة) | STORE-KIT §4 |
| Age Rating | 4+ |
| Review Notes | STORE-KIT §5 (التطبيق يفتح ببيانات تجريبية بدون تسجيل) |
| السعر | مجاني |

**قبل «Submit for Review»:** SQL حذف الحساب ✅ · المحامي راجع السياسة ✅ · تجربة عائلة وحدة على الأقل ✅.

## 8. الدخول بأبل وقوقل + التحقق بخطوتين (DW-045)
الكود جاهز، والأزرار مخفية لين تفعّلها. **قاعدة أبل 4.8:** لو فيه قوقل، لازم أبل معاه.
1. **Supabase → Authentication → URL Configuration → Redirect URLs:** أضف
   `bh.wadqa.idarati://auth` و`https://myrent-git-claude-vibrant-mccarthy-56fs79-ads-5ce6.vercel.app/idarati-app/` (والدومين لما يصير).
2. **أبل:** developer.apple.com ← Identifiers ← **Services IDs** ← + (مثلاً `bh.wadqa.idarati.signin`) ← فعّل Sign in with Apple ← Return URL: `https://zqnitovbkgvbeuzzglzc.supabase.co/auth/v1/callback`. وKeys ← + ← Sign in with Apple ← نزّل ‎.p8.
   ثم Supabase ← Authentication ← Providers ← **Apple**: Client IDs = `bh.wadqa.idarati,bh.wadqa.idarati.signin` + Team ID + Key ID + الـ ‎.p8.
3. **قوقل:** console.cloud.google.com ← APIs & Services ← Credentials ← OAuth client ID (Web) ← Authorized redirect URI: نفس رابط الـ callback فوق. ثم Supabase ← Providers ← **Google**: Client ID + Secret.
4. قل لي «فعّلت أبل وقوقل» — أشغّل الأزرار (`VITE_AUTH_PROVIDERS=apple,google`) وأختبرها.
5. **التحقق بخطوتين:** شغّال من الحين (Supabase يدعم TOTP افتراضياً، وسياسة القاعدة انطبقت). كل مستخدم يفعّله بنفسه من الإعدادات ← الحساب.
