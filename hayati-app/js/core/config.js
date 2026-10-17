// بيانات الربط مع Supabase (Project Settings → API)
// إذا عبّيتها هنا، كل الأجهزة تتربط تلقائياً وتحتاج بس تسجيل دخول.
// إذا تركتها فاضية، تقدر تدخلها من الإعدادات داخل التطبيق.
// DW-020: مربوط بمشروع Supabase «hayati» (فرانكفورت) بقرار المالك. الحساب اختياري، والتطبيق يشتغل بدونه.
// ⚠️ نسخة المتجر (DW-001 + DW-008): الربط يغيّر Data safety وسياسة الخصوصية (انحدّثت بـ DW-020).
//   لو عبّيته بنسخة المتجر: Google Play ← Data safety يتغير لـ «Personal info + Financial info: Collected»،
//   وسياسة الخصوصية لازم تذكر دولة سيرفر Supabase. لا تعبّيه قبل ما تحدّثهم.
window.HAYATI_CONFIG = {
  SUPABASE_URL: 'https://gqpagtblgqxzwjgsrech.supabase.co',
  // مفتاح عام (anon) مسموح يكون بالتطبيق؛ الحماية من RLS: كل حساب يشوف سجلاته بس. لا تحط service_role هني أبداً
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxcGFndGJsZ3F4endqZ3NyZWNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNDAxNTksImV4cCI6MjEwNzYxNjE1OX0.Bce2WgJ-BT50VBWFra1RK-hRNCz72M4bosywZV1eVgQ',
  // الدخول السريع: اكتب 'apple' و/أو 'google' بس بعد ما تفعّلهم بلوحة Supabase (الخطوات بـ supabase/SETUP.md)
  //   فاضي = الأزرار ما تطلع (ولا زر ميت)
  PROVIDERS: [],
  // DW-067: أزرار مخفية حتى لو مفعّلة بـ Supabase. Google بوضع Testing (بس المختبرين يدخلون، ومراجع Apple بيفشل)،
  //   فنخفيه لين تنشر شاشة الموافقة (Google Auth Platform ← Branding ← Audience ← Publish app)، وبعدين شيله من هني
  HIDE_PROVIDERS: ['google'],
};
