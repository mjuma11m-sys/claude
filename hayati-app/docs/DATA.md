# بيانات «حياتي»: وش ننحفظ، ووين

> خريطة للبيانات، مو تغيير فيها. **لا تغيّر اسم حقل** بدون تحويل للبيانات القديمة، لأن بيانات الناس محفوظة بجهازهم (وبالمزامنة) بالأسماء الحالية.

## وين تنحفظ
| المكان | وش فيه | المسؤول |
|---|---|---|
| `localStorage` → `hayati-v1` | كل الجداول تحت، بملف واحد | `js/core/store.js` |
| `db` حق claude.ai | نفس الجداول، لو فتحت التطبيق من رابط claude.ai | `js/core/store.js` |
| Supabase (اختياري) | نفس الجداول، لكل مستخدم بروحه (RLS) | `js/core/store.js` + `supabase/` |
| مفاتيح `hayati-*` ثانية | إعدادات الجهاز (تحت) | كل ملف ميزة |

كل سجل فيه `id` (UUID أو ثابت مثل `daily:2026-10-13`) و`updated_at` (يحطه `S.upsert` بروحه). الحذف عن طريق `S.remove(table, id)`.

## الجداول
| الجدول | وش هو | الحقول الأساسية |
|---|---|---|
| `transactions` | المصاريف والدخل | `kind` (`expense`/`income`)، `amount` (د.ب)، `merchant`، `category`، `note`، `occurred_at`، `source` (`sms`/`manual`…)، `raw` (رسالة البنك بعد الإخفاء)، `needs_review` |
| `subscriptions` | الاشتراكات والمصاريف الثابتة | `name`، `amount`، `cycle` (`monthly`/`yearly`)، `day`، `month`، `category`، `remind_days`، `active`، `last_posted` |
| `goals` | أهداف التوفير | `name`، `target`، `saved`، `emoji`، `done` |
| `debts` | لي وعلي | `person`، `amount`، `direction`، `note`، `occurred_at`، `settled` |
| `courses` | الجدول: محاضرة، تمرين، نشاط | `name`، `type` (`lecture`/`gym`/…)، `days` (0=الأحد)، `start_time`، `end_time`، `room`، `color`، `absence_limit`، `absences`، `attended`، `skipped` (تواريخ `YYYY-MM-DD`)، `credits`، `workout` |
| `tasks` | مهام، اختبارات، واجبات، مواعيد | `title`، `kind` (`exam`/`homework`/`appointment`/…)، `due_at`، `done`، `course_id`، `place`، `duration`، `notes` |
| `grades` | درجات المعدل | `semester`، `course_name`، `credits`، `grade` (`A`…`F`) |
| `study_sessions` | جلسات المذاكرة | `course_id`، `minutes`، `started_at` |
| `cards` | بطاقات المراجعة | `course_id`، `q`، `a`، `box`، `due` |
| `habits` | العادات | `name`، `emoji`، `active` |
| `daily` | يومك (سجل واحد لكل يوم) | `date`، `water`، النوم (`sleep`، `sleep_deep`، `sleep_rem`، `sleep_core`، `sleep_awake`)، `hrv`، العادات المنجزة |
| `lifts` | أوزان الجيم | `course_id`، `exercise`، `date`، `sets` |
| `body` | الوزن والخصر | `date`، `weight`، `waist` |
| `events` | مناسبات | `title`، `date`، `kind`، `yearly`، `remind_days` |
| `shopping` | قائمة المقاضي | `name`، `qty`، `done` |
| `journal` | اليوميات | `date`، `mood`، `text` |
| `matches` | مباريات الحارس | `date`، `opponent`، `comp`، النتيجة والتصديات |
| `settings` | سجل واحد | `name`، `roles`، `prayer_method`، `prayer_on`، `budget`، `water_goal`، `sleep_goal`، `onboarded`، `sms_consent_at` (موافقة قراءة رسايل البنك، على الجهاز) |

`pending` مو جدول: طابور المزامنة (التعديلات اللي ما وصلت Supabase للحين).

## مفاتيح الجهاز (`localStorage`)
| المفتاح | وش فيه |
|---|---|
| `hayati-lang` | `ar` أو `en` |
| `hayati-theme` | `auto` / `light` / `dark` |
| `hayati-ui-*` | آخر تبويب وقسم فتحتهم |
| `hayati-lock` | الرمز السري (PBKDF2، مو الرقم نفسه) |
| `hayati-last-backup`، `hayati-backup-snooze` | آخر نسخة احتياطية، و«بعدين» |
| `hayati-notif-prefs`، `hayati-snoozes`، `hayati-notif-asked` | تنبيهات الآيفون: المفاتيح، «بعد ساعة»، وهل طلبنا الإذن |
| `hayati-timer`، `hayati-morning`، `hayati-weekly-seen`، `hayati-budget-alert`، `hayati-badge`، `hayati-cal`، `hayati-gpa-target`، `hayati-open` | حالة بطاقات وأدوات صغيرة |
| `hayati-payday-seen` | آخر شهر راتب انفتح ملخصه «راتبك وين راح؟» (DW-012) |
| `settings.payday`، `settings.madhhab`، `settings.gold_price`، `settings.khums_start` | يوم الراتب، المذهب، سعر غرام الذهب، ورأس السنة الخمسية: **على الجهاز بس**، ما تنرفع لجدول `settings` بالسيرفر (DW-012) |
| `hayati-sync`، `hayati-supabase` | إعداد المزامنة |

## التصدير والحذف
| | وين | الصيغة |
|---|---|---|
| نسخة احتياطية | الإعدادات ← نسخة احتياطية | JSON، كل الجداول (`S.exportJSON()`) |
| المصاريف | الإعدادات ← صدّر مصاريفك (Excel) | CSV، بدون `raw` (`App.expensesCSV()`) |
| الحذف | الإعدادات ← احذف كل بياناتي | الجهاز + db + Supabase + الحساب (`js/features/privacy.js`) |
