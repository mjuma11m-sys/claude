// بيانات الربط مع Supabase (Project Settings → API)
// إذا عبّيتها هنا، كل الأجهزة تتربط تلقائياً وتحتاج بس تسجيل دخول.
// إذا تركتها فاضية، تقدر تدخلها من الإعدادات داخل التطبيق.
// ⚠️ نسخة المتجر (DW-001 + DW-008): الاختبار المغلق الأول يطلع وهالملف فاضي (بدون حسابات).
//   لو عبّيته بنسخة المتجر: Google Play ← Data safety يتغير لـ «Personal info + Financial info: Collected»،
//   وسياسة الخصوصية لازم تذكر دولة سيرفر Supabase. لا تعبّيه قبل ما تحدّثهم.
window.HAYATI_CONFIG = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  // الدخول السريع: اكتب 'apple' و/أو 'google' بس بعد ما تفعّلهم بلوحة Supabase (الخطوات بـ supabase/SETUP.md)
  //   فاضي = الأزرار ما تطلع (ولا زر ميت)
  PROVIDERS: [],
};
