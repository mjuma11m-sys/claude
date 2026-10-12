---
name: rtl-arabic-ui
description: قواعد واجهات عربية RTL صحيحة في React وTailwind — الاتجاه، logical properties، الخطوط، الأرقام والتواريخ والعملة، الأيقونات، الحقول المختلطة، والجداول والرسوم. Use when building or reviewing any Arabic or bilingual UI, or user says "عربي"، "RTL"، "الاتجاه غلط"، "الخط العربي"، "الأرقام"، "النص مقلوب".
---

# 🔤 RTL Arabic UI

## الأساس
- `<html lang="ar" dir="rtl">` (ويتغير ديناميكياً لو التطبيق ثنائي اللغة: `document.documentElement.dir`).
- Tailwind v3.3+/v4: استخدم **logical utilities** دايماً:

| بدل | استخدم |
|---|---|
| `ml-* / mr-*` | `ms-* / me-*` |
| `pl-* / pr-*` | `ps-* / pe-*` |
| `left-* / right-*` | `start-* / end-*` |
| `text-left / text-right` | `text-start / text-end` |
| `rounded-l-* / rounded-r-*` | `rounded-s-* / rounded-e-*` |
| `border-l / border-r` | `border-s / border-e` |
- استثناءات بـ `rtl:` / `ltr:` بس لما ما فيه logical بديل (مثل `rtl:-translate-x-full` للـ drawers).
- flex/grid تنقلب تلقائياً مع `dir` — لا تستخدم `flex-row-reverse` لتصليح الاتجاه.

## الأيقونات
- اتجاهية (سهم، رجوع، التالي، chevron، إرسال): `rtl:rotate-180` (أو `-scale-x-100`).
- غير اتجاهية (بحث، إعدادات، علامة صح، ساعة، تشغيل ▶ للميديا): **لا تقلب**.

## الخطوط
- `IBM Plex Sans Arabic` (واجهات) · `Tajawal` (عناوين) · `Cairo` · `Noto Kufi Arabic`. حمّلها بـ `font-display: swap` وأوزان محددة بس (400/500/700).
- `line-height` أعلى من اللاتيني (1.6–1.8 للنص).
- **لا `letter-spacing`** على العربي (يفكك الحروف) ولا `uppercase`.
- أحجام: العربي يبين أصغر — زِد درجة (`text-[15px]` بدل 14).

## الأرقام والتواريخ والعملة
```ts
const nf = new Intl.NumberFormat('ar-BH-u-nu-latn');                 // 1,234 (أرقام لاتينية)
const money = new Intl.NumberFormat('ar-BH-u-nu-latn', { style: 'currency', currency: 'BHD' }); // 3 خانات
const date = new Intl.DateTimeFormat('ar-BH-u-nu-latn', { dateStyle: 'medium', timeZone: 'Asia/Bahrain' });
```
- قرر مرة: أرقام لاتينية (`nu-latn`) أو هندية (`ar-BH` الافتراضي) — ولا تخلط.
- الأرقام والكود والإيميل والرابط داخل نص عربي: `<bdi>` أو `dir="ltr"` على العنصر.

## الحقول
- email / phone / URL / password / IBAN: `dir="ltr"` + `inputMode` صح (`tel`, `email`, `numeric`).
- textarea حرة: `dir="auto"` (يتبع أول حرف).
- placeholder وlabel بالعربي، والقيمة حسب نوعها.
- هاتف البحرين: `+973` + 8 أرقام — prefix ثابت على **يسار** الحقل بصرياً (لأنه ltr).

## مكونات
- جداول: أول عمود على اليمين تلقائياً؛ الأرقام `text-end` + `tabular-nums`.
- Charts (Recharts/Chart.js): المحور Y على اليمين (`orientation="right"`)، والمحور X يبدأ من اليمين (`reversed`) للزمن.
- Toasts/drawers: تطلع من `start`/`end` مو left/right ثابت.
- Carousels: `dir="rtl"` على الحاوية (Embla: `direction: 'rtl'`).
- قص النص: `truncate` يشتغل، بس `line-clamp` تأكد إن `dir` على العنصر.

## 🔧 أداة
`python .claude/skills/rtl-arabic-ui/scripts/rtl_lint.py src/` يعرض `file:line old -> new` · `--fix` يصلّح تلقائياً (يتجاهل `rtl:`/`ltr:` والنص العادي). exit 1 لو باقي مشاكل.

## فحص سريع
- [ ] ولا `ml-/mr-/pl-/pr-/left-/right-/text-left/text-right` في الكود (`grep -rnE "\b(ml|mr|pl|pr)-|\b(left|right)-[0-9]|text-(left|right)"`)
- [ ] الأسهم مقلوبة والأيقونات الثانية لا · [ ] أرقام موحدة · [ ] حقول ltr صح · [ ] جرّب بنص عربي طويل ونص إنقليزي طويل.
