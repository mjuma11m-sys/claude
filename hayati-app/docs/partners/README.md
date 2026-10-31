# عروض الشركاء (DW-110) — تجربة 90 يوم

## الأقسام اللي يطلع فيها العرض (`section`)
| القسم | متى يطلع | `city` |
|---|---|---|
| `travel` | صفحة رحلة قبل السفر، ونفس المدينة، وتواريخ العرض خلال ±30 يوم من السفر | مفتاح المدينة (`karbala`، `mashhad`، `istanbul`…) — بدونه ما يطلع |
| `umrah` | رحلة نوعها عمرة قبل السفر | اختياري (`makkah`، `madinah`) |
| `weekend` | نافذة «وين نروح الويكند؟» | — |
| `car` | نافذة «صيانة السيارة» | — |
| `kids` | نافذة «عيالك» | — |
| `ramadan` | نافذة «رمضان» | — |

قواعد ثابتة بالتطبيق: مكتوب «إعلان · شريك موثّق»، عرض واحد بالنافذة، نفس العرض 3 مرات بالأسبوع بالكثير لكل جهاز، «ما يهمني» يخفيه، ومفتاح بالإعدادات يطفي الكل. الاختيار على الجهاز، ولا شي عن المستخدم يطلع.

## إضافة شريك (قبلها: سجل تجاري ساري + ترخيص النشاط)
أسهل طريقة: ارسل بيانات الشريك لـ Claude بالشات ويضيفها. أو من لوحة Supabase ← SQL Editor:

```sql
insert into public.partners (name, kind, cr_number, license, contact_person, plan, status)
values ('حملة النور', 'campaign', '12345-1', 'ترخيص حملات رقم …', 'أبو علي', 'pilot', 'active')
returning id;

insert into public.offers (partner_id, section, city, title, body, price_bhd, starts_on, ends_on, whatsapp, code, priority)
values ('<id من فوق>', 'travel', 'karbala', 'زيارة كربلاء 5 أيام', 'فندق قريب · طيران مباشر · مواصلات', 185, '2027-01-01', '2027-03-31', '97333333333', 'HAYATI10', 0);
```

- `kind`: `campaign` حملات حج وعمرة وزيارة · `travel` مكاتب سفر · `food` مطاعم وكافيهات · `car` كراجات وتلميع · `education` معاهد · `other`
- `plan`: `pilot` (تجربة مجانية) · `basic` · `featured` (يطلع أول) · `sponsor`
- `whatsapp`: أرقام بس مع كود الدولة (`973…`)، و`url` لازم يبدأ بـ `https://`
- إيقاف عرض: `update public.offers set active = false where id = '…';` · إيقاف شريك: `update public.partners set status = 'paused' where id = '…';`
- التطبيق يحدّث العروض كل 12 ساعة.

## التقارير
شوف `REPORTS.sql`: تقرير شهري لكل شريك، وعدد الأجهزة النشطة (يومي وشهري).
