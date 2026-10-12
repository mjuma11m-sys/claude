---
name: skill-index
description: فهرس وموجّه الـ skills — يحدد أي skill (أو أكثر وبأي ترتيب) تنفع للطلب، ويمنع التعارض بين الـ skills المتداخلة خصوصاً skills التصميم. Use when unsure which skill fits, when several skills overlap, or user says "أي skill"، "شنو عندك skills"، "/skill-index".
---

# 🗂️ Skill Index

**قاعدة:** حمّل أقل عدد يكفي — skill رئيسية وحدة + مرجع واحد بالأكثر. `token-saver` دايماً شغّال عبر `CLAUDE.md`.

## بناء التطبيقات
| الطلب | الرئيسية | معها |
|---|---|---|
| تطبيق/ميزة كاملة من الصفر للنشر | `ship` | ينسّق الباقي |
| جداول، RLS، migration | `supabase-schema` | — |
| endpoint / باك إند Flask | `flask-api` | `supabase-schema` لو فيه جداول |
| تطبيق نادي/أكاديمية | `sports-admin` | `supabase-schema` ← `flask-api` |
| تطبيق عقارات/إيجارات | `real-estate-tracker` | `bh-business` |
| فواتير، VAT، تسعير BHD | `bh-business` | — |
| خطأ / error / ما يشتغل | `bug-hunter` | — |
| قبل النشر / بعد فشل النشر | `deploy-check` | — |
| Swift / iOS native | `write-swift` | — |
| اختيار مكتبة frontend | `pick-ui-library` | — |
| Graph الكود / أسئلة البنية | `graphify` | — |

## التصميم (موجّه — وحدة بس)
| الحالة | استخدم | لا تخلط مع |
|---|---|---|
| **الافتراضي** لأي واجهة/داشبورد/تحسين | `impeccable` | باقي skills التصميم |
| أي واجهة عربية | + `rtl-arabic-ui` (دايماً كمرجع) | — |
| لاندنق/بورتفوليو مميز | `design-taste-frontend` | `gpt-taste`، `high-end-visual-design` |
| ستايل محدد طلبه المستخدم بالاسم | `minimalist-ui` / `industrial-brutalist-ui` / `high-end-visual-design` / `gpt-taste` | `impeccable` |
| مشروع موجود يبي ترقية | `redesign-existing-projects` | — |
| عدة نسخ أختار بينها | `prototype` | — |
| تصميم من صورة / توليد صور تصميم | `image-to-code` / `imagegen-frontend-web` / `imagegen-frontend-mobile` | — |
| Google Stitch / DESIGN.md | `stitch-design-taste` | — |
| هوية وشعار | `brandkit` | — |
| تجربة الجوال للويب | `mobile-native` | — |
| كسر الواجهة ببيانات صعبة | `break-ui` | — |
| `design-taste-frontend-v1` | بس لو المشروع معتمد عليه | — |

## الحركة
| الطلب | استخدم |
|---|---|
| بناء أنميشن ويب | `animate` (+ `apple-design` للإيماءات والـ springs) |
| React Native / Expo | `animate-expo` |
| مراجعة حركة موجودة | `review-animations` |
| تدقيق كل الحركة بالمشروع | `improve-animations` |
| وين أضيف حركة | `find-animation-opportunities` |
| اسم تأثير | `animation-vocabulary` |
| Toasts | `ask-sonner` |
| فلسفة الصقل والتفاصيل | `emil-design-eng` |

## الفيديو والمحتوى
| الطلب | استخدم |
|---|---|
| أفكار، هوك، سكربت، جدول نشر | `goalkeeper-content` |
| فيديو كلام ← ريل/إعلان | `video-ad-editor` |
| مقاطع بدون كلام على الإيقاع | `montage-video` |
| بودكاست / كاميرتين | `podcast-video` |
| موشن قرافيكس بدون تصوير | `motion-video` |
| تايملاين دافنشي قابل للتعديل | `davinci-video` |
| تعديل يدوي بالجوال | `capcut-guide` |
| كفر / ثمبنيل | `thumbnail-video` |
| أسماء وقواعد الحركة بالمونتاج | `video-motion-editing` |

## الرياضة
| الطلب | استخدم |
|---|---|
| برنامج تمارين حارس | `training-plan` |

## الاجتماعات والجودة
| الطلب | استخدم |
|---|---|
| رأي فريق كامل | `diwaniya` · طلب صغير ← «ديوانية سريعة» |
| مخرجات كاملة بدون قص | `full-output-enforcement` |
| توفير توكنز | `token-saver` |

## سلاسل جاهزة
- **ميزة جديدة كاملة:** `ship` (يمر على `supabase-schema` ← `flask-api` ← `impeccable` + `rtl-arabic-ui` ← `deploy-check` ببوابات)
- **ريل:** `goalkeeper-content` ← `video-ad-editor` أو `capcut-guide` ← `thumbnail-video`
