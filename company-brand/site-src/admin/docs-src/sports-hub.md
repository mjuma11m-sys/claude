# Sports Hub

**وش هو:** منصة كرة القدم البحرينية: غرفة النادي (التشكيلة، العقود، الحضور، تقرير المباراة، الرواتب وحقوق اللاعبين)، غرفة الاتحاد (نسبة الأجور FFP)، الطاقم الطبي (أحمال اللاعبين ACWR)، وFan Zone للجمهور.
**الحالة:** قيد التطوير. الأساس والشاشات جاهزة ببيانات تجريبية واضحة على الشاشة.
**المستودع:** `mjuma11m-sys/sports-hub` (خاص) · **الويب:** `sports-hub-omega-one.vercel.app`

![الدخول التجريبي](docs-img/sports-login.jpg)
![غرفة النادي](docs-img/sports-club.jpg)
![الأحمال](docs-img/sports-medical.jpg)

> * لقطات ببيانات تجريبية

## التقنيات
| الطبقة | المستخدم |
|---|---|
| الواجهة | React 19.3 + TypeScript 5.9 + React Router 7 |
| الشكل | Tailwind CSS 4 (هوية ليلية: `night` · `pulse` · `crimson` · `gold`)، الخطوط Tajawal وInter محلية |
| البناء | Vite 8، وميزانية حجم (أول شاشة 150KB، أي chunk 260KB) |
| البيانات | Supabase (سنغافورة `ap-southeast-1`)، 17 migration |
| الاختبار | Vitest 5 (172) + Playwright (386 على جوال وآيباد وكمبيوتر) + اختبارات هجوم RLS على Postgres |

## الهيكل
```
sports-hub/
├── src/
│   ├── router.tsx      ← كل صفحة وراها RequireArea حسب الدور
│   ├── pages/          ← Club · Lineup · Attendance · Analysis · Player · Rights · Federation · Medical · Vote…
│   ├── lib/            ← المنطق الصافي، كل ملف معه .test.ts (acwr، ffp، today، rights، lineup، squad-csv…)
│   ├── data/demo.ts    ← البيانات التجريبية (معلَّمة على الشاشة)
│   ├── auth/ · components/
├── supabase/migrations/  0001_profiles_rbac … 0017_telemetry
├── e2e/                ← Playwright
└── scripts/            ← check-columns (الأعمدة تطابق القاعدة) · budget (حجم البناء)
```

## الصلاحيات والأمان
- `src/lib/roles.ts` يقرر شنو يبين بالواجهة، و**RLS بالقاعدة هو الجدار الفعلي** (`0001_profiles_rbac.sql`). كل حساب جديد يبدأ بأقل صلاحية.
- بدون `.env` التطبيق يشتغل بوضع تجريبي: تختار الدور من شاشة الدخول.
- CI فيه جوب `database` يشغّل هجمات RLS حقيقية على Postgres (جدار الجمهور والطاقم، صوت وحد لكل مشجع، نافذة التصويت)، ويتأكد إن `setup.sql` يطابق الـ migrations.

| الدور | يشوف |
|---|---|
| مشجع، لاعب | Fan Zone |
| الطاقم الطبي | + الأحمال (ACWR) |
| إدارة النادي | غرفة النادي كاملة |
| الاتحاد | غرفة الاتحاد |

## مثال من المنطق: أحمال اللاعب (ACWR)
```ts
// src/lib/acwr.ts — نسبة الحمل الحاد للمزمن (Gabbett 2016)
export function acwr(loads: number[]): number | null {
  if (loads.length < 28) return null
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
  const acute = avg(loads.slice(-7))
  const chronic = avg(loads.slice(-28))
  if (chronic === 0) return null
  return Math.round((acute / chronic) * 100) / 100
}
// 0.8–1.3 آمن · 1.3–1.5 انتبه · فوق 1.5 خطر
```
وشريط «اليوم» بغرفة النادي (`src/lib/today.ts`) يحسب من نفس البيانات اللي تبين بالشاشة: عقود تنتهي، رواتب متأخرة، غياب متكرر، لاعبين غير متاحين — أقصى 5، الأهم أول.

## التشغيل والاختبار والنشر
```bash
npm install && npm run dev   # بدون .env = وضع تجريبي
npm run verify               # tsc + vitest + check-columns + build + budget + playwright
npm run setup:supabase       # يطبّق الـ migrations على مشروع جديد
```
- **CI:** `Sports Hub tests` (جوب `web` مهلته 30 دقيقة لأن مشغّل المستودع الخاص أبطأ، وجوب `database`).
- **النشر:** Vercel مشروع `sports-hub` ← `main`.
- **ملاحظة اختبارات:** اختبار شريط «اليوم» يثبّت الساعة على يوم 5 من الشهر، لأن الراتب التجريبي غير المدفوع يدخل الشريط بعد مهلة 15 يوم.
