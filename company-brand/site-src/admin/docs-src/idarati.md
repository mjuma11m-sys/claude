# إداراتي · Idarati

**وش هو:** إدارة أملاك وميزانية العائلة: الوحدات والمستأجرين والعقود، الدفعات والإيصالات، الشيكات المؤجلة، الفواتير والصيانة، الميزانية، وتقرير الشهر. وأفراد العائلة يشتغلون على نفس البيانات بصلاحيات.
**الحالة:** نسخة تجريبية · قيد التطوير. تشتغل ببيانات تجريبية على الجهاز، والمزامنة العائلية جاهزة بالقاعدة.
**المستودع:** `mjuma11m-sys/idarati` (خاص) · **الويب:** `idarati-gamma.vercel.app`

![الرئيسية](docs-img/idarati-home.jpg)
![المستأجرين](docs-img/idarati-tenants.jpg)
![الميزانية](docs-img/idarati-budget.jpg)

> * لقطات ببيانات تجريبية

## التقنيات
| الطبقة | المستخدم |
|---|---|
| الواجهة | React 18.3 + TypeScript 5.6 |
| البناء | Vite 8 (`tsc --noEmit && vite build`) ← `dist/` |
| الحالة | `useReducer` + Context (`src/data/store.tsx`) |
| البيانات | `localStorage` + Supabase (طوكيو `ap-northeast-1`) للمزامنة العائلية |
| Excel | `read-excel-file` / `write-excel-file` (استيراد وتصدير) |
| التنقل | روابط `#` (تحديث الصفحة ما يطلع 404) |
| الهوية | `src/theme/tokens.css` المصدر الوحيد للألوان (حجر وليل، فاتح وداكن) |

## الهيكل
```
idarati/
├── src/
│   ├── App.tsx            ← التنقل بين الصفحات (#tenants، #budget…)
│   ├── pages/             ← شاشة لكل ملف: Home · Tenants · Cheques · Budget · Bills · MonthReport · Family · Settings…
│   ├── data/
│   │   ├── types.ts       ← شكل البيانات
│   │   ├── reducer.ts     ← كل تغيير = action (pay، expense، unit، vacate…)
│   │   ├── store.tsx      ← useStore() للشاشات
│   │   ├── logic.ts       ← الحساب والتنسيق (كل المبالغ بالفلس)
│   │   ├── sync.ts        ← مزامنة العائلة (ما يعرف شي عن Supabase)
│   │   └── supabase.ts    ← الاتصال الفعلي (Remote)
│   ├── theme/ · ui/
├── supabase/migrations/   ← families · family_members · family_invites · events + RLS
└── tests/                 ← e2e.mjs (168 فحص) · sync.test.ts · track.test.ts
```

## البيانات والأمان
- كل المبالغ **بالفلس** (integer)، والتنسيق بمكان واحد (`logic.ts`).
- كل تعديل action بالـ reducer، فالسجل المالي ما ينحذف: الوحدة اللي عليها دفعات ما تنحذف، والمستأجر السابق يختفي اسمه والمبلغ يظل.
- **المزامنة العائلية:** سجل أحداث append-only بجدول `events`. كل جهاز يعيد تطبيق الأحداث بالترتيب، فما فيه تعارض بين جهازين، والتعديلات بدون نت تنتظر بطابور.
- RLS: بس أعضاء العائلة يقرون أحداثها (`is_family_member`)، والكتابة لمن عنده صلاحية تعديل (`is_family_editor`).

```ts
// src/data/sync.ts — الطرف البعيد واجهة، فالاختبار يحط محاكي بدل Supabase
export interface Remote {
  pull(familyId: string, afterId: number): Promise<Row[]>;
  push(familyId: string, ev: Pending): Promise<void>; // نفس client_id مرتين = نجاح
  subscribe(familyId: string, onChange: () => void): () => void;
}
```

```ts
// src/data/reducer.ts — كل شاشة تغيّر البيانات بـ dispatch، مو مباشرة
case "pay":    return { ...state, payments: [...state.payments, a.payment] };
case "unpay":  return { ...state, payments: state.payments.filter((p) => p.id !== a.id) };
case "vacate": return { ...state, units: state.units.map((u) => (u.id === a.id ? { ...u, tenant: undefined } : u)) };
```

## التشغيل والاختبار والنشر
```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # tsc + vite → dist/
npm test             # e2e: 168 فحص (الشاشات بثلاث مقاسات، متأخرات، دفعة + تراجع، إيصال، حذف البيانات…)
npm run test:sync    # مزامنة العائلة بمحاكي
npm run test:track   # المتابعة
npm run test:db      # اختبارات RLS على قاعدة محلية
```
- **النشر:** Vercel مشروع `idarati` ← `main` (Vite تلقائي، وهيدرات الأمان وCSP بـ `vercel.json`).
- **Supabase:** Site URL لازم يكون `https://idarati-gamma.vercel.app` عشان إيميلات تأكيد الحساب.
- **الحزم:** supabase-js 2.117.3، وvite 8.3.4، و`npm audit` صفر ثغرات.
