# Sports Hub — التطبيق

منصة كرة القدم البحرينية. **قيد التطوير · نسخة تجريبية** (تذكرة الشركة: `docs/company/tickets/DW-007.md`).

```bash
npm install && npm run dev      # بدون .env = وضع تجريبي: تختار الدور من شاشة الدخول
npm test && npm run build
```

## الأجهزة
| العرض | التنقّل |
|---|---|
| جوال (< 768px) | شريط سفلي (5 تبويبات) فوق الـ home indicator |
| آيباد (768–1023px) | شريط أيقونات جانبي |
| كمبيوتر (≥ 1024px) | قائمة جانبية كاملة |

## الهوية (مصدرها `sports-hub-promo/overlays/theme.json`)
| Token | اللون | الاستخدام |
|---|---|---|
| `night` | `#05080F` | الخلفية |
| `ink` / `mute` | `#EAF6FF` / `#93A7BB` | النص الأساسي / الثانوي |
| `pulse` | `#00E5FF` | التفاعل، النشط، التركيز |
| `crimson` | `#CE1126` | أحمر البحرين: تعبئة بس (نصه `crimson-ink`) |
| `gold` | `#D4AF37` | VIP + تمييز ناديك |
| `.glass` | `white/4%` + blur | البطاقات (يرجع لـ `deep` لو المتصفح ما يدعم blur) |

الخطوط: Tajawal للنص، Inter للأرقام (`.num`).

## الصلاحيات
`src/lib/roles.ts` يقرر شنو يبين بالواجهة، و`supabase/migrations/0001_profiles_rbac.sql` هو الجدار الفعلي (RLS). كل حساب جديد يبدأ `fan`، والدور يتغيّر من السيرفر بس.

| الدور | يشوف |
|---|---|
| مشجع، لاعب | Fan Zone |
| الطاقم الطبي | + الأحمال (ACWR) |
| إدارة النادي | + الأحمال + غرفة العمليات |
| الاتحاد | Fan Zone + غرفة الاتحاد |

كل الأرقام والأسماء بـ `src/data/demo.ts` تجريبية ومعلَّمة على الشاشة.

## قاعدة البيانات (Supabase)

التطبيق يقرأ من Supabase أول ما تنحط المفاتيح، ويرجع للوضع التجريبي لو ما فيه مفاتيح. كل الصفحات تمر على `src/data/source.ts`.

| الجدول | فيه | مين يكتب |
|---|---|---|
| `clubs`، `leagues`، `league_entries` | الأندية والدوريات والترتيب | service role بس |
| `matches`، `players`، `motm_candidates` | المباريات واللاعبين ومرشحين رجل المباراة | service role بس |
| `motm_votes` | صوت واحد لكل مشجع بكل مباراة (PK)، لين ساعتين بعد البداية | المشجع نفسه |
| `profiles` | الدور، النادي (للطاقم)، النادي المفضل | المشجع: الاسم والنادي المفضل بس |

مجاميع الأصوات علنية (`motm_tally()`)، بس منو صوّت لمنو ما يشوفه أحد غيره. أي صف `is_demo = true` يخلي التطبيق يكتب «* بيانات تجريبية».

### الربط (مرة وحدة)
1. أنشئ مشروع على supabase.com (الخطة المجانية). اختر أقرب منطقة، واكتب اسم دولتها بسياسة الخصوصية قبل فتح التسجيل.
2. **SQL Editor** ← الصق `supabase/setup.sql` كامل ← **Run**. يسوي الجداول والسياسات والبيانات التجريبية.
3. **Project Settings → API** ← انسخ `Project URL` و`anon public` إلى `.env`:
   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```
4. **Authentication → URL Configuration** ← `Site URL` = رابط التطبيق، وأضف نفسه بـ Redirect URLs (رابط الدخول بالإيميل يرجع له).
5. لتعيين دور (طبي، إدارة نادي، اتحاد): **Table Editor → profiles** ← غيّر `role` و`club_id`. التطبيق ما يقدر يغيّر الدور.

التسجيل الحقيقي يبقى مقفول لين تنحط `VITE_PRIVACY_CONTACT` (وقبلها تتحدّث سياسة الخصوصية).

### الاختبارات
```bash
PGHOST=… PGPORT=… PGUSER=postgres supabase/tests/run.sh   # 30 هجوم على RLS بـ Postgres حقيقي
supabase/bundle.sh                                           # يعيد توليد setup.sql بعد أي migration
```
