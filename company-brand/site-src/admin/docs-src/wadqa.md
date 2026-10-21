# موقع ودقة ولوحة الإدارة

**وش هو:** موقع الشركة (عربي وإنقليزي): التطبيقات بحالتها الحقيقية، قوائم الانتظار، التواصل، والخصوصية. ولوحة إدارة داخلية على `/admin` للمالك بس.
**المستودع:** `mjuma11m-sys/wadqa` (خاص) · **النشر:** Vercel مشروع `wadqa`، جذره `site/`

![الموقع](docs-img/wadqa-site.jpg)
![لوحة الإدارة](docs-img/wadqa-admin.jpg)
![الدخول](docs-img/wadqa-admin-mfa.jpg)

## الموقع: مولّد ثابت واحد
| الجزء | الملف | الدور |
|---|---|---|
| المولّد | `site-src/build.mjs` | يطلّع العربي (`/`) والإنقليزي (`/en/`) من نفس النصوص، ويكتب `vercel.json` (CSP والهيدرات والتحويلات) |
| الستايل | `site-src/site.css` | هوية ودقة: حبري `#0B1514`، عاجي `#F2EBDD`، ذهبي `#C8A04A`، خط IBM Plex Sans Arabic محلي |
| النماذج | `site-src/app.js` | ترسل لدالة `wadqa_submit` بـ Supabase (موافقة صريحة، حد للإرسال) |
| النتيجة | `site/` | ملفات ثابتة جاهزة، بدون أي متتبعات ولا cookies |

```js
// كل تطبيق سطر واحد: الحالة صادقة، وأزرار المتاجر «قريباً» لين ينشر
const apps = {
  hayati:  { stores: { ios: null, android: null }, pill: ['نسخة تجريبية · قيد التطوير', 'Beta · In development'], … },
  idarati: { pill: ['نسخة تجريبية · قيد التطوير', 'Beta · In development'], … },
  'sports-hub': { pill: ['قيد التطوير', 'In development'], … },
};
```
- **الأمان:** CSP صارم (`script-src 'self'`، `style-src 'self'`) فما فيه أي سكربت أو ستايل داخل الـ HTML. الخطوط والصور من نفس الدومين.
- **النموذج:** الجدول `wadqa.leads` بمخطط خاص ما ينقرا من المتصفح؛ الكتابة بس عبر `wadqa_submit` اللي يتحقق ويحد التكرار.

## لوحة الإدارة `/admin`
| الملف | الدور |
|---|---|
| `admin/logic.js` | الحساب بس: الفلس، الدولار × 0.376، ملخص الشهر، الميزانية، حد الضريبة 37,500، CSV (8 اختبارات) |
| `admin/admin.js` | الواجهة: الدخول ← رمز الجوال ← خمس تبويبات + «الملفات» |
| `admin/docs.js` | عارض Markdown آمن لهالملفات (بدون HTML خام؛ الصور من `docs-img/` بس، والروابط https بس) |
| `supabase/wadqa_admin.sql` | الجداول والصلاحيات |

**الحماية بطبقتين، والثانية هي المهمة:**
1. الواجهة: كلمة السر ← رمز من تطبيق المصادقة (TOTP).
2. القاعدة: كل جدول عليه RLS بدالة `wadqa_admin_ok()` = حسابك بجدول `wadqa.admins` **و** جلسة `aal2` (كملت الرمز). بكلمة السر بس ← صفر صف.

```sql
create or replace function public.wadqa_admin_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.wadqa_is_admin() and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;
create policy admin_all on public.wadqa_entries for all to authenticated
  using ((select public.wadqa_admin_ok())) with check ((select public.wadqa_admin_ok()));
```

| الجدول | وش فيه |
|---|---|
| `wadqa_entries` | الدفتر: دخل ومصروف بالفلس، البند، التطبيق، طريقة الدفع |
| `wadqa_budgets` | ميزانية شهرية لكل بند |
| `wadqa_recurring` | الاشتراكات (فلس أو سنت، شهري/سنوي/مرة) |
| `wadqa_docs` | نص هالملفات (الصور بيانات تجريبية بـ `/admin/docs-img/`) |
| `wadqa.leads` | طلبات الموقع (قراءة بس عبر `wadqa_admin_leads`) |

## التشغيل والاختبار
```bash
node site-src/build.mjs                       # يبني site/
node --test site-src/admin/logic.test.cjs     # الحساب
node site-src/admin/tests/serve.cjs "$PWD/site" 8790 &   # خادم بنفس هيدرات Vercel
node site-src/admin/tests/e2e.cjs /tmp        # اللوحة بالوضع التجريبي (29 فحص، 390 و320)
node site-src/admin/tests/mfa.cjs /tmp        # الدخول + الرمز بـ supabase وهمي (10 فحوص)
node site-src/admin/docs-src/build-sql.mjs    # يحوّل هالملفات لـ SQL (wadqa_docs)
```
- `/admin/?demo=1` يعرض اللوحة ببيانات تجريبية بدون أي اتصال.
- ضيّعت جوال الرمز؟ Supabase ← Authentication ← Users ← حسابك ← احذف عامل MFA.
