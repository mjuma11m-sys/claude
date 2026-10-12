---
name: sports-admin
description: نموذج بيانات ومنطق جاهز لمنصات إدارة الأندية والأكاديميات الرياضية — لاعبين، أولياء أمور، فرق وفئات عمرية، مواسم، تمارين وحضور، مباريات وإحصائيات، اشتراكات ودفعات، وأدوار الطاقم. Use when user builds or extends a sports/club/academy management app, or says "إدارة نادي"، "أكاديمية"، "لاعبين"، "حضور التمارين"، "اشتراكات اللاعبين"، "مباريات".
---

# ⚽ Sports Admin

يشتغل مع `supabase-schema` (الجداول + RLS) و `flask-api` و `rtl-arabic-ui`.

## الكيانات
| الجدول | أعمدة أساسية | ملاحظات |
|---|---|---|
| `orgs` | name, logo_url, currency (`BHD`) | النادي/الأكاديمية — multi-tenant |
| `memberships` | org_id, user_id, role | `admin`, `coach`, `staff`, `parent`, `player` |
| `seasons` | org_id, name, starts_on, ends_on, is_current | موسم واحد current لكل org (partial unique index) |
| `age_groups` | org_id, name (U10…), birth_year_from, birth_year_to | الفئة بسنة الميلاد مو العمر |
| `teams` | org_id, season_id, age_group_id, name, coach_id | |
| `players` | org_id, full_name, full_name_en, dob, cpr, nationality, position, dominant_foot, photo_url, status | `status`: `trial`, `active`, `injured`, `suspended`, `left` |
| `guardians` / `player_guardians` | name, phone, relation | لاعب له أكثر من ولي أمر |
| `team_players` | team_id, player_id, shirt_number, joined_on, left_on | unique (team_id, shirt_number) للنشطين |
| `sessions` | team_id, starts_at, ends_at, location, type | `training`, `match`, `fitness` |
| `attendance` | session_id, player_id, status, note | `present`, `late`, `absent`, `excused`, `injured` · unique (session_id, player_id) |
| `matches` | team_id, opponent, starts_at, venue, home_away, competition, score_for, score_against, status | |
| `match_players` | match_id, player_id, started, minutes | |
| `match_events` | match_id, player_id, minute, type | `goal`, `assist`, `yellow`, `red`, `save`, `clean_sheet`, `sub_in`, `sub_out` |
| `plans` | org_id, name, price numeric(12,3), period | `monthly`, `quarterly`, `season` |
| `subscriptions` | player_id, plan_id, starts_on, ends_on, status | |
| `invoices` | subscription_id, amount, due_on, status, paid_at, method | `pending`, `paid`, `overdue`, `waived` |
| `injuries` | player_id, type, occurred_on, expected_return, notes | يحدّث `players.status` |

## منطق الأعمال
- **الفئة العمرية:** `extract(year from dob) between birth_year_from and birth_year_to` — اقترح الفريق تلقائياً عند التسجيل.
- **مسار التسجيل:** `trial` (تجربة 1–2 أسبوع) → قبول المدرب → `active` + subscription + أول invoice.
- **الحضور:** نسبة = (present + late) / (الجلسات − excused − injured). تنبيه لو < 70% آخر 30 يوم.
- **المتأخرات:** job يومي يحوّل `pending` اللي `due_on < current_date` إلى `overdue`؛ بعد 14 يوم تنبيه للأدمن وولي الأمر.
- **إحصائيات اللاعب:** views بـ `security_invoker`: مباريات، دقائق، أهداف، أسيست، كروت، **للحراس:** saves، clean sheets، أهداف مستقبلة/90 دقيقة.
- **الإيقاف:** red = مباراة إيقاف تلقائي (قابل للتعديل)، تراكم الصفراء حسب لائحة البطولة (إعداد في `orgs`).

## الصلاحيات (RLS)
| الدور | يقدر |
|---|---|
| admin | كل شي في الـ org |
| coach | فرقه: لاعبين (قراءة)، جلسات، حضور، مباريات (كتابة) |
| parent | عياله بس: بيانات، حضور، فواتير (قراءة) |
| player | بياناته وإحصائياته (قراءة) |
- `cpr`، الصحة، والفواتير: admin + ولي الأمر بس — مو المدربين.

## الشاشات
لوحة الأدمن (لاعبين نشطين، متأخرات بالدينار، حضور الأسبوع) · قائمة اللاعبين (فلتر فئة/فريق/حالة) · ملف اللاعب · تسجيل حضور سريع على الجوال (قائمة + زر لكل حالة، حفظ تلقائي) · جدول المباريات والنتائج · الفواتير · بوابة ولي الأمر.
