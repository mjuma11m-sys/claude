---
name: deploy-check
description: فحص قبل النشر لمشاريع Flask/React/Supabase على Render وVercel وReplit — env vars، build، CORS، routing، migrations، أسرار، health check — ويصلح اللي يلقاه. Use when user says "بنشر"، "deploy"، "قبل ما أرفع"، "الموقع ما يشتغل بعد النشر"، "Render"، "Vercel"، "build failed"، or before any production release.
---

# 🚀 Deploy Check

شغّل الفحص على الريبو فعلياً (اقرأ الملفات، شغّل build/tests). المخرج جدول: البند · ✅/⚠️/❌ · الإصلاح — وصلّح ❌ مباشرة.

## 🔧 أداة (شغّلها أول)
`python .claude/skills/deploy-check/scripts/check.py <project>` — يفحص الأسرار، `.env`، gunicorn، debug، healthz، CORS، SPA rewrites، `service_role` بالفرونت، localhost، وRLS في migrations. exit 1 لو فيه ❌. بعدها كمّل البنود اليدوية تحت.

## 1. أسرار وenv
- [ ] لا مفاتيح في الكود أو git history (`git grep -nE "(sk_|service_role|eyJhbGci|SUPABASE_SERVICE)"`).
- [ ] `.env` في `.gitignore` و `.env.example` محدّث بكل المفاتيح (بدون قيم).
- [ ] الفرونت: بس متغيرات عامة (`VITE_` / `NEXT_PUBLIC_`) — `anon` key عادي، `service_role` **ممنوع**.
- [ ] كل متغير في `.env.example` موجود في إعدادات المنصة (Render/Vercel/Replit Secrets).

## 2. Backend (Flask على Render)
- [ ] start: `gunicorn wsgi:app --bind 0.0.0.0:$PORT` (مو `flask run` ولا `app.run(debug=True)`).
- [ ] `requirements.txt` فيه `gunicorn` ونسخ مثبتة · نسخة Python محددة (`.python-version` أو `PYTHON_VERSION`).
- [ ] health check path `/healthz` يرجع 200 بدون auth.
- [ ] CORS: دومين الفرونت الحقيقي بالضبط (https، بدون `/` بالآخر).
- [ ] الخطة المجانية تنام بعد خمول ← أول طلب بطيء (~30–60s): وضّح للمستخدم أو اعمل loading state.

## 3. Frontend (React/Vite على Vercel)
- [ ] `npm run build` ينجح محلياً بدون warnings مهمة.
- [ ] SPA routing: `vercel.json` → `{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}` وإلا refresh يعطي 404.
- [ ] `VITE_API_URL` يأشر على الباك إند الإنتاجي، مو `localhost`.
- [ ] Node version متطابقة (`engines` في `package.json`).

## 4. Supabase
- [ ] كل migrations مطبّقة على الإنتاج (`supabase db push` / `supabase migration list`).
- [ ] RLS مفعّل على كل جدول في `public` (Dashboard → Advisors → Security).
- [ ] Auth → URL Configuration: Site URL + Redirect URLs فيها الدومين الإنتاجي.
- [ ] Storage buckets: public/private صح و policies موجودة.

## 5. بعد النشر (smoke test)
- [ ] `curl -fsS https://<api>/healthz` · تسجيل دخول · عملية كتابة وقراءة وحدة · refresh على route داخلي · الجوال.
- [ ] Logs المنصة بدون errors في أول 5 دقايق.

## أشهر الأعطال
| العرض | السبب |
|---|---|
| CORS error بالمتصفح | origin ناقص أو فيه `/` أو http بدل https |
| 404 على refresh | rewrites ناقصة |
| 401 بعد النشر | redirect URL أو JWT/JWKS غلط |
| بيانات فاضية بدون خطأ | RLS يمنع — policy ناقصة |
| `Application failed to respond` | ما يسمع على `$PORT` |
