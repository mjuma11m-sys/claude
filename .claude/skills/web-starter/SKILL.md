---
name: web-starter
description: يولّد واجهة React عربية RTL جاهزة للإنتاج بأمر واحد — Vite + TypeScript + Tailwind v4 + تسجيل دخول Supabase + API client يطابق أخطاء Flask + تنسيق الدينار والتاريخ + Vercel. Use when user says "سوّ فرونت"، "واجهة جديدة"، "React app"، "ابدأ مشروع ويب"، "داشبورد من الصفر"، or the ship skill reaches the UI stage.
---

# 🖥️ Web Starter

## 🔧 أداة
`python .claude/skills/web-starter/scripts/scaffold.py <dir> --title "اسم التطبيق"` — ما يكتب فوق ملف موجود. بعدها:
`cd <dir> && cp .env.example .env && npm install && npm run dev`

## اللي ينولد
| الملف | الدور |
|---|---|
| `index.html` | `lang="ar" dir="rtl"`، IBM Plex Sans Arabic، `viewport-fit=cover` |
| `src/index.css` | Tailwind v4 `@theme` (خط + ألوان `brand-*`)، inputs ‏16px (بدون zoom بالآيفون)، focus واضح |
| `src/lib/supabase.ts` | client بالـ anon key (يوقف بخطأ واضح لو env ناقص) |
| `src/lib/api.ts` | `get/post/patch/del` مع Bearer token تلقائي و`ApiError(status, code, message, fields)` بنفس شكل أخطاء `flask-api` |
| `src/lib/format.ts` | `fmtMoney` (BHD، 3 خانات)، `fmtDate`، `fmtNumber`، `fmtPercent` — أرقام لاتينية، `Asia/Bahrain` |
| `src/auth/*` | `AuthProvider` + `useAuth()` + `RequireAuth` (يرجعك لنفس الصفحة بعد الدخول) |
| `src/components/Layout.tsx` | sidebar بـ `border-e` + header مع safe-area + `Outlet` |
| `src/pages/*` | Login، Dashboard (بطاقات أرقام)، 404 |
| `vite.config.ts` | chunks منفصلة لـ react وsupabase (كاش أفضل، بدون تحذير حجم) |
| `vercel.json` | SPA rewrites |
| `format.test.ts` | vitest |

## إضافة صفحة
1. `src/pages/Players.tsx` ← البيانات: `get<{ data: Player[] }>('/api/players')`.
2. أضفها في `children` داخل `src/router.tsx` وفي `NAV` داخل `Layout.tsx`.
3. الأخطاء: `catch (e) { if (e instanceof ApiError && e.status === 422) … }`.

## بوابة الجودة
`npm run build` (فيه `tsc`) · `npm test` · `python .claude/skills/rtl-arabic-ui/scripts/rtl_lint.py src` ← 0 · `python .claude/skills/deploy-check/scripts/check.py .` ← 0 blocking.

## تصميم
القالب محايد عن قصد. للهوية والصقل: `impeccable` (افتراضي) أو حسب `skill-index`، ودايماً مع `rtl-arabic-ui`.
