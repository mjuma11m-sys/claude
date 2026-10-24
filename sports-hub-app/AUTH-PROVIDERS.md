# تفعيل الدخول عبر Google وApple

الكود جاهز، والأزرار **ما تظهر** إلا لو فعّلت المزوّد بالبناء (`VITE_AUTH_GOOGLE=true` و/أو `VITE_AUTH_APPLE=true`) وفعّلته بـSupabase. بدون الإعداد ما فيه زر مكسور. المفاتيح تبقى داخل Supabase فقط، ولا شي منها بمتغيرات `VITE_*`.

عنوان رد المزوّد (Callback) لمشروعك: `https://frowdhbazytcmwhrlnmv.supabase.co/auth/v1/callback`

## Google (مجاني، ابدأ فيه)
1. console.cloud.google.com ← APIs & Services ← OAuth consent screen: اسم التطبيق، إيميل الدعم، رابط سياسة الخصوصية (`<رابطك>/privacy`) والشروط.
2. Credentials ← Create credentials ← OAuth client ID ← Web application.
   - Authorized JavaScript origins: `https://sports-hub-omega-one.vercel.app`
   - Authorized redirect URIs: عنوان الـCallback أعلاه.
3. انسخ Client ID وClient Secret ← Supabase ← Authentication ← Providers ← Google ← فعّل والصقهما.
4. Vercel: أضف `VITE_AUTH_GOOGLE=true` ثم Redeploy.

## Apple (يحتاج حساب Apple Developer مدفوع، 99$ سنوياً)
1. developer.apple.com ← Identifiers: App ID ثم **Services ID** بـ«Sign in with Apple» وDomain = `frowdhbazytcmwhrlnmv.supabase.co` وReturn URL = عنوان الـCallback.
2. Keys: مفتاح بـ«Sign in with Apple». Supabase يطلب Services ID وTeam ID وKey ID والمفتاح الخاص (سر يتولّد منه الـJWT).
3. **السر ينتهي كل 6 أشهر**: حط تذكيراً بتجديده وإلا يوقف الدخول فجأة.
4. فعّل Apple بـSupabase ← Providers، ثم `VITE_AUTH_APPLE=true` وRedeploy.

## ملاحظات مهمة
- **تفعيل الأدوار بالإيميل**: `admin_provision_staff` يطابق الإيميل. لو الطاقم اختار «إخفاء بريدي» بأبل يصير إيميله وسيطاً ما يطابق. اطلب منهم الدخول بإيميلهم الحقيقي، أو Google.
- نفس الإيميل المؤكد عبر Google أو رابط البريد يندمج بحساب واحد (افتراضي Supabase). راجع Authentication ← Settings لو غيّرته.
- أي مزوّد = طرف معالجة جديد: السياسة تذكره، وتنتظر مراجعة المحامي مع الـDPA.
- بلا تفعيل: الدخول بالبريد (رابط سحري) يبقى كما هو.
