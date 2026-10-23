# نسخة تجريبية تحفظ بيانات المجرّبين (تنتقل معهم لوقت الإطلاق)

الرابط التجريبي الحالي (Artifact) **وضع عرض**: بياناته على جهاز كل شخص فقط وتضيع بمسح المتصفح. عشان تنحفظ لازم نسخة حقيقية على مشروع `sports-hub` (Supabase) باستضافة عادية. المشروع جاهز: 17 مهاجرة مطبّقة، RLS مختبر، 0 مستخدمين. **البيانات تبقى بنفس المشروع عند الإطلاق: لا نقل ولا إعادة إدخال.**

## ما يبقى عليك (ما أقدر أسويه من هنا)
| # | الخطوة | وين |
|---|---|---|
| 1 | Auth ← URL Configuration: **Site URL** = رابط الاستضافة، وأضفه بـ Redirect URLs | لوحة Supabase |
| 2 | Auth ← SMTP: مزوّد إيميل مخصّص (الافتراضي ≈ 2 رسالة بالساعة، ما يكفي مجرّبين) | لوحة Supabase |
| 3 | رفع المجلد على Vercel بثلاثة متغيرات (تحت) | Vercel |
| 4 | إيميل تواصل خصوصية حقيقي (`VITE_PRIVACY_CONTACT`): بدونه الدخول مقفول بقصد | أنت |

## متغيرات البناء (Vercel ← Settings ← Environment Variables)
```
VITE_SUPABASE_URL=https://frowdhbazytcmwhrlnmv.supabase.co
VITE_SUPABASE_ANON_KEY=<anon من لوحة Supabase ← Project Settings ← API>
VITE_PRIVACY_CONTACT=<إيميلك للخصوصية>
```
ممنوع `service_role` بأي متغير `VITE_*`. بناء عادي (بدون `VITE_SHARE`).

## إضافة مجرّب
المجرّب يدخل برابط سحري على إيميله، ثم تعطيه الدور من SQL Editor (مرة وحدة):
```sql
select public.admin_provision_staff('admin@club.com', 'club_admin', 'اسم النادي', 'second');
select public.admin_provision_staff('doctor@club.com', 'medical', 'اسم النادي');
```
بياناته (تشكيلة، حضور، تقارير) تنكتب بحسابه وناديه بقاعدة البيانات، وتبقى بعد الإطلاق.

## قبل ما تعطي أحداً الرابط
- اتفاقية معالجة البيانات (DPA) مراجَعة من محامٍ قبل أي بيانات لاعبين حقيقية (ROADMAP #5).
- بدون رواتب ولا بيانات صحية حقيقية بالتجربة.
- تأكد من الدخول بنفسك أول: رابط سحري ← `admin_provision_staff` ← غرفة النادي (ROADMAP #4).
