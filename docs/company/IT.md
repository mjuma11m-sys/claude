# سجل الحسابات والصلاحيات — DW-056 (IT)

> **بدون أسرار:** لا كلمات سر ولا مفاتيح ولا رموز 2FA هني. الملف يقول وين الشي ومين يملكه بس.
> آخر مراجعة: 2026-10-21. أي حساب جديد ينضاف هني بنفس اليوم.

| الخدمة | الحساب / المعرّف | وش فيه | 2FA | ملاحظة |
|---|---|---|---|---|
| GitHub | `mjuma11m-sys` | `claude` + المستودعات الخاصة `hayati` · `idarati` · `sports-hub` · `wadqa` | ☐ المالك يتأكد | Actions: الخاص له دقائق محدودة، وmacOS تنحسب ×10 |
| Supabase | org المالك | `hayati` (`gqpagtblgqxzwjgsrech`، فرانكفورت): حياتي + ودقة + اللوحة · `idarati` (`zqnitovbkgvbeuzzglzc`، طوكيو) · `sports-hub` (`frowdhbazytcmwhrlnmv`، سنغافورة) | ☐ | ✅ Leaked password protection شغالة (2026-10-21، Sign In / Providers ← Email). الحد الأدنى لكلمة المرور 6 (يتغيّر لـ 8 مع تحديث التطبيق، DW-060) |
| Vercel | حساب المالك | `claude` (ويب حياتي `claude-eosin-seven`) · `wadqa` (`myrent-sigma`) · `idarati` (`idarati-gamma`) · `sports-hub` (`sports-hub-omega-one`) | ☐ | خطة Hobby للاستخدام غير التجاري ← قبل أي دخل ننتقل لـ Pro (تأكد من السعر) |
| Apple Developer | فريق `Z84MU9349R` | حياتي `bh.hayati.app`، TestFlight، Xcode Cloud | ✅ (Apple تفرضها) | Xcode Cloud مربوط بـ `claude` فرع `claude/beautiful-wozniak-sqapsx`؛ ينتقل لـ `hayati` بعد قبول 0.27 |
| Google Play Console | حساب المالك | — | ✅ | **محظور** لين تثبيت الهوية (تذكرة `5-3273000041730`)؛ ما نرفع شي لين يردون |
| Google Cloud | مشروع OAuth | شاشة الموافقة (Google sign-in لحياتي) | ✅ | منشورة (DW-079) |
| Anthropic API | — | المفتاح بأسرار Supabase Edge Function `lecture-ai` بس | — | ما يوصل للجوال ولا للمستودع |
| لوحة ودقة `/admin` (تطبيق على الشاشة الرئيسية، DW-062) | `mjuma11.m@gmail.com` (الأدمن الوحيد) | الشركة ومهامي، الحسابات، الطلبات، الزيارات، الملفات | ✅ TOTP إلزامي (aal2 بالقاعدة) | |
| الدومين | **ما فيه** | `wadqa.com` مو لنا؛ الموقع على `myrent-sigma.vercel.app` | — | الإيميل `hello@wadqa.com` انشال من الموقع (DW-058) لين يكون فيه صندوق حقيقي |

## قواعد IT
1. **جلسة Claude وحدة لكل مستودع/منتج بنفس الوقت.** رفض آبل 0.26 تعقّد لأن جلستين اشتغلوا على حياتي بقرارات متناقضة.
2. الأسرار بمكانها بس: Supabase secrets، Xcode Cloud، GitHub Secrets، أو مدير كلمات السر عند المالك. ولا مرة بالشات أو المستودع.
3. Claude في Chrome ما يكتب كلمات سر وما يضغط Submit/Send، والمالك يسوي الضغطة الأخيرة.
4. مراجعة هالملف كل شهر: مين عنده دخول، وش يتجدد، وش تغيّر.

## ناقص (يحتاج المالك)
- ☐ التحقق بخطوتين على GitHub وSupabase وVercel (وصوّر صفحة الأمان بدون رموز).
- ✅ Leaked password protection بـ Supabase hayati (2026-10-21).
- ☐ أسرار توقيع أندرويد بـ GitHub (للـ release)، وقرار دقائق iOS على GitHub.
- ☐ دومين + صندوق إيميل للشركة (يتقرر مع المالية).
