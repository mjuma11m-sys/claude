---
name: capcut-guide
description: خطوات CapCut بالضبط (جوال وديسكتوب) — قص، كابشن عربي تلقائي، خطوط عربية، keyframes، speed curve، slow-mo، مزامنة الإيقاع، إزالة الخلفية، تلوين، وإعدادات التصدير للريلز. Use when user says "كاب كت"، "CapCut"، "شلون أسوي بالكاب كت"، "الكابشن العربي مقلوب"، "تصدير"، "سلو موشن"، "على الإيقاع"، or wants to edit manually instead of Remotion/DaVinci.
---

# ✂️ CapCut Guide

اكتب الخطوات كمسار قوائم: **Edit → Speed → Curve** مع القيم بالضبط. وضّح لو تختلف بين الجوال والديسكتوب. أسماء القوائم بالإنقليزي (الواجهة الأشهر).

## الأساسيات
| المهمة | المسار |
|---|---|
| مشروع 9:16 | Ratio → 9:16 · Canvas → Blur (لو المقطع أفقي) |
| قص السكتات | Edit → Split عند كل سكتة (ديسكتوب: `Ctrl/Cmd+B`) · أو **Auto cut / Remove silences** إذا متاح |
| كابشن تلقائي | Text → **Auto captions** → اللغة Arabic → راجع الكلمات يدوياً |
| خط عربي | Text → Font → Import (ملف `.ttf`/`.otf`) — مثل Tajawal Bold، Cairo Black |
| ستايل الكابشن | Text → Style: Stroke أسود 6–10، Shadow · Animation → In: Pop/Typewriter · فعّل highlight للكلمة إذا متاح |

## الحركة
| المهمة | المسار |
|---|---|
| Slow-mo ناعم | Speed → Normal → 0.3x–0.5x + **Smooth slow-mo** (Frame interpolation) — المقطع لازم 60fps+ |
| Velocity edit | Speed → **Curve → Montage/Bullet** أو Custom: نقطة سريعة 3–5x قبل التصدي، بطيئة 0.3x لحظته |
| Zoom على لحظة | Keyframe ◇ عند البداية (Scale 100%) ← بعد 0.3s keyframe (Scale 130%) · Graph → Ease in/out |
| Shake عند التصدي | Effects → Video effects → **Shake** (مدة 0.2–0.4s) |
| مزامنة الإيقاع | اختر الصوت → **Beats → Auto generate** ← قص على النقاط الصفراء |
| Freeze frame | Edit → Freeze (3s) + Text/arrow فوقه للتحليل |

## الصورة
| المهمة | المسار |
|---|---|
| إزالة الخلفية | Cutout → Auto removal |
| تلوين سريع | Adjust → Brightness +5، Contrast +10، Saturation +8، Sharpen +10 · أو Filters بقوة 40–60% |
| ثبات اللقطة | Stabilize → Recommended |
| تحسين الصوت | Audio → **Enhance voice / Reduce noise** · الموسيقى −15 إلى −20 dB تحت الكلام |

## التصدير للريلز
- Resolution **1080p** (أو 4K لو المصدر 4K) · Frame rate **30** (أو 60 للرياضة) · Bitrate **Higher / Recommended+**.
- ديسكتوب: Format MP4، Codec H.264.
- خلي الكابشن داخل الـ safe zone: ~250px فاضي من فوق وتحت، ومن اليمين (أزرار إنستقرام).

## أعطال شائعة
| المشكلة | الحل |
|---|---|
| الحروف العربية مفككة/مقلوبة | الخط ما يدعم العربي ← غيّر الخط لخط عربي |
| الكابشن التلقائي غلط | تكلم بوضوح، الموسيقى مطفية وقت التوليد، ثم أضفها |
| Slow-mo متقطع | المصدر 30fps ← فعّل Smooth slow-mo أو صوّر 120fps |
| جودة تنزل بعد الرفع | صدّر 1080p/30 Higher، ارفع من الجوال بـ "Upload at highest quality" |
