# إداراتي (My-rent)

## التشغيل (DW-010)
```bash
cd my-rent
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc + vite → dist/ (ارفع dist على Netlify)
npm test           # 12 اختبار Playwright: 8 شاشات × 3 أحجام، دفعة + تراجع، مصروف، Escape، تقليل الحركة
```
- الشاشات: `src/pages/` · البيانات: `src/data/` (تجريبية، تنحفظ بـ localStorage).
- **ربط Supabase:** بدّل `load()` و`dispatch` في `src/data/store.tsx` بس؛ الشاشات تقرا من `useStore()` وما تتغيّر.
- المبالغ كلها بالفلس (integer)، والتنسيق في `src/data/logic.ts`.

---

# الهوية والهيكل الموحد · DW-007

حزمة تنحط داخل مشروع React + TypeScript الحالي (اللي على Netlify). ما تغيّر أي منطق ولا بيانات، تغيّر الشكل بس.

## الملفات
| ملف | ينحط في مشروعك | الدور |
|---|---|---|
| `src/theme/tokens.css` | `src/theme/` | **المصدر الوحيد للألوان** (فاتح + داكن)، الخط، الحركة، أساسيات الجوال |
| `src/theme/AppShell.tsx` + `.css` | `src/theme/` | هيكل كل الأجهزة + `StatusPill` + `Money` |
| `src/theme/tailwind.preset.js` | `src/theme/` | لو المشروع يستخدم Tailwind: كلاسات `bg-brand`، `text-late`… |
| `brand/icon.svg` | `public/icons/` | الشعار ومصدر الأيقونات |
| `brand/manifest.webmanifest` | `public/` | PWA: الاسم، RTL، ألوان شاشة البداية |

## الربط (4 خطوات)
1. `main.tsx`: `import "./theme/tokens.css";` أول import.
2. `App.tsx`: لف الصفحات بـ `<AppShell items={…} active={page} onNavigate={setPage} title="…" onAdd={…}>`.
   الترتيب المقترح: الرئيسية، المستأجرين، الميزانية، بنك العائلة ← (المزيد) المحفظة، السفر، المنزل، الموردين.
3. `index.html`:
   ```html
   <html lang="ar" dir="rtl">
   <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
   <meta name="theme-color" content="#14213A">
   <link rel="manifest" href="/manifest.webmanifest">
   <link rel="apple-touch-icon" href="/icons/icon-180.png">
   ```
4. ولّد الأيقونات من `icon.svg`: ‏180 / 192 / 512 PNG (`npx pwa-asset-generator public/icons/icon.svg public/icons`).

بعدها: ابحث بالمشروع عن أي `#` hex أو `bg-blue-…` وبدّلها بالـ tokens. `grep -rnE "#[0-9a-fA-F]{6}|bg-(blue|green|red)-" src` ← لازم يطلع فاضي إلا tokens.css.

## قواعد الأجهزة
| العرض | الشكل |
|---|---|
| < 768 (جوال) | هيدر ليلي + شريط سفلي 4 + «المزيد» (bottom sheet) + زر ذهبي فوق الإبهام |
| 768–1199 (آيباد) | شريط جانبي أيقونات 76px، بطاقتين بالسطر |
| ≥ 1200 (كمبيوتر) | شريط جانبي كامل 248px، 3 بطاقات بالسطر |

- كل زر ≥ 44px، والحقول 16px (ما يكبّر iOS الصفحة).
- `env(safe-area-inset-*)` للنوتش وشريط الآيفون.
- `100dvh` مو `100vh`.

التفاصيل والألوان: `brand/BRAND.md`.
