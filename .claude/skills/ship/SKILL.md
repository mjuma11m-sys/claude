---
name: ship
description: من فكرة بجملة إلى تطبيق منشور — ينسّق الـ skills والسكربتات بمراحل ثابتة وبوابات تحقق (schema → RLS audit → API scaffold + tests → واجهة RTL → deploy check → نشر)، ولا ينتقل لمرحلة قبل ما تعدّي اللي قبلها. Use when user says "ابنِ لي تطبيق"، "سوّ لي نظام"، "من الصفر"، "شيّكها وانشرها"، "ship"، "/ship"، or describes a whole app/feature end-to-end.
---

# 🚀 Ship — من الفكرة للنشر

`S=.claude/skills` · كل مرحلة لها **بوابة**: أمر لازم ينجح قبل اللي بعدها. فشل البوابة ← `bug-hunter` على نفس المرحلة، مو تجاوز.

## 0. الفهم (رد واحد قصير)
- الهدف بجملة · المستخدمين والأدوار · 3–7 شاشات · الكيانات · قيود (البحرين؟ دفع؟ عربي؟).
- لو المجال نادي/أكاديمية ← `sports-admin` · عقارات ← `real-estate-tracker` · فلوس/فواتير ← `bh-business`.
- سؤال واحد بس لو الغموض يغيّر الـ schema؛ وإلا افترض واكتب افتراضاتك بسطر.
- طلب كبير أو قرار معماري ← «ديوانية سريعة» (`diwaniya`) قبل البناء.

## 1. البيانات — `supabase-schema`
- migration في `supabase/migrations/` + RLS لكل جدول.
- **بوابة:** طبّق على Postgres محلي أو Supabase ثم:
  `psql "$DATABASE_URL" -f $S/supabase-schema/scripts/rls_audit.sql` ← **صفر صفوف**.

## 2. الـ API — `flask-api`
- `python $S/flask-api/scripts/scaffold.py api <feature...>` ثم عدّل الـ models والـ routes لكل كيان.
- منطق الفلوس من `$S/bh-business/scripts/bh.py` (انسخ الدوال، لا تعيد كتابتها).
- **بوابة:** `cd api && pytest -q` ← كله أخضر (لكل endpoint: نجاح، 401، input غلط).

## 3. الواجهة — `impeccable` + `rtl-arabic-ui`
- React + Vite + Tailwind، `dir="rtl"`، supabase-js للـ auth، `VITE_API_URL` للـ API.
- ستايل خاص طلبه المستخدم ← حسب `skill-index`.
- **بوابة:** `python $S/rtl-arabic-ui/scripts/rtl_lint.py web/src` ← 0 · `npm run build` ← ينجح.

## 4. قبل النشر — `deploy-check`
- **بوابة:** `python $S/deploy-check/scripts/check.py .` ← `0 blocking` · راجع التحذيرات بسطر لكل وحدة.

## 5. النشر
- API ← Render (`render.yaml` جاهز من الـ scaffold) · Web ← Vercel · env vars من `.env.example`.
- Smoke: `curl -fsS https://<api>/healthz` · تسجيل دخول · كتابة + قراءة · refresh على route داخلي · الجوال.
- النشر نفسه يحتاج حساب المستخدم: اعطه الأوامر/الخطوات بالضبط إذا ما عندك صلاحية.

## الرد النهائي
| المرحلة | الحالة | الدليل |
|---|---|---|
| Schema + RLS | ✅ | audit: 0 rows |
| API | ✅ | `N passed` |
| UI | ✅ | rtl 0 · build ok |
| Deploy check | ✅ | 0 blocking |
| النشر | ⏳/✅ | الروابط |
+ **عليك:** الخطوات اللي لازم يسويها المستخدم بنفسه (مفاتيح، دومين، حسابات).

## قواعد
- لا تقول «جاهز» بدون مخرجات البوابات الحقيقية في الرد.
- كل مرحلة commit مستقل برسالة واضحة.
- `token-saver` شغّال: لا تلصق ملفات كاملة بالرد — المسارات والنتائج بس.
