---
name: real-estate-tracker
description: نموذج بيانات ومنطق جاهز لتطبيقات إدارة وتتبع العقارات — عقارات ووحدات، مستأجرين، عقود إيجار، جدول دفعات، متأخرات، مصاريف وصيانة، فواتير الكهرباء والماء، نسبة الإشغال والعائد. Use when user builds or extends a property/real-estate/rental tracking app, or says "عقارات"، "إيجارات"، "مستأجرين"، "عقود"، "وحدات"، "تحصيل الإيجار".
---

# 🏢 Real Estate Tracker

يشتغل مع `supabase-schema` و `flask-api` و `bh-business` (عملة، VAT، فواتير).

## الكيانات
| الجدول | أعمدة أساسية | ملاحظات |
|---|---|---|
| `orgs` / `memberships` | role: `owner`, `manager`, `accountant`, `viewer` | |
| `properties` | org_id, name, type, area, block, road, building_no, plot_no, purchase_price, purchase_date | `type`: `building`, `villa`, `land`, `commercial` |
| `units` | property_id, unit_no, type, floor, bedrooms, area_sqm, ewa_account_no, base_rent, status | `vacant`, `occupied`, `maintenance`, `reserved` |
| `tenants` | full_name, cpr_or_cr, nationality, phone, email, employer | فرد أو شركة |
| `leases` | unit_id, tenant_id, starts_on, ends_on, rent numeric(12,3), deposit, payment_day, frequency, ewa_included, status | `draft`, `active`, `ended`, `terminated` · exclusion constraint يمنع عقدين نشطين متداخلين على نفس الوحدة |
| `rent_schedule` | lease_id, period_start, due_on, amount, status | `pending`, `partial`, `paid`, `overdue` |
| `payments` | lease_id, schedule_id, amount, paid_on, method, reference | `cash`, `transfer`, `benefitpay`, `cheque` · دفعة جزئية مسموحة |
| `expenses` | property_id, unit_id?, category, amount, spent_on, vendor, receipt_url | `maintenance`, `ewa`, `municipality`, `insurance`, `management`, `other` |
| `maintenance_requests` | unit_id, title, priority, status, cost, opened_at, closed_at | |
| `documents` | entity, entity_id, kind, file_path | عقد موقّع، هوية، سند ملكية — bucket private |

منع تداخل العقود:
```sql
create extension if not exists btree_gist;
alter table leases add constraint no_overlap exclude using gist
  (unit_id with =, daterange(starts_on, ends_on, '[]') with &&) where (status = 'active');
```

## منطق الأعمال
- **توليد الجدول:** عند تفعيل العقد، صف لكل فترة من `starts_on` لـ `ends_on` بـ `due_on` = يوم `payment_day` (لو الشهر أقصر ← آخر يوم).
- **الحالة:** مجموع payments للفترة ≥ amount ← `paid`؛ > 0 ← `partial`؛ `due_on < today` وناقص ← `overdue` (job يومي).
- **الإشغال:** الوحدات `occupied` / كل الوحدات (باستثناء `maintenance`).
- **العائد الإجمالي:** إيجار سنوي / سعر الشراء · **الصافي:** (إيجار محصّل − مصاريف) / سعر الشراء.
- **تنبيهات:** عقد ينتهي خلال 60/30 يوم · دفعة متأخرة 3/7/14 يوم · وحدة شاغرة > 30 يوم.
- **التأمين:** يتسجل كالتزام، مو دخل؛ يرجع ناقص الخصومات عند نهاية العقد.
- **الكهرباء والماء (EWA):** رقم الحساب على الوحدة؛ لو `ewa_included = false` المستأجر يدفع مباشرة، وإلا تتسجل كمصروف. رسوم البلدية تطلع على فاتورة EWA — تأكد من النسبة الحالية قبل حسابها.

## الصلاحيات
owner: كل شي · manager: كل شي ما عدا حذف العقارات وتقارير الأرباح · accountant: دفعات ومصاريف وتقارير · viewer: قراءة. وثائق الهوية بس owner/manager.

## الشاشات
لوحة (محصّل الشهر/المتوقع، المتأخرات بالدينار، الإشغال %، عقود قريبة الانتهاء) · العقارات ← الوحدات (شبكة ملونة بالحالة) · ملف المستأجر · العقد + جدول دفعاته · تسجيل دفعة سريع + إيصال PDF · المصاريف · تقرير شهري/سنوي لكل عقار.
