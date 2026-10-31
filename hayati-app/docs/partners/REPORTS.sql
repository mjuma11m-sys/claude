-- تقرير الشريك لشهر (غيّر التاريخ): مشاهدات وضغطات كل عرض، ونسبة الضغط
select p.name as partner, o.title, sum(s.views) as views, sum(s.clicks) as clicks,
       round(100.0 * sum(s.clicks) / nullif(sum(s.views), 0), 1) as ctr_pct
from public.offer_stats s
join public.offers o on o.id = s.offer_id
join public.partners p on p.id = o.partner_id
where s.day >= date '2027-01-01' and s.day < date '2027-02-01'
group by p.name, o.title order by p.name, views desc;

-- الأجهزة النشطة: آخر 30 يوم (كل يوم) + عدد الأجهزة اللي فتحت هالشهر
select day, sum(dau) as active_devices from public.usage_daily
where day >= current_date - 30 group by day order by day;

select to_char(day, 'YYYY-MM') as month, sum(mau) as monthly_active_devices, sum(dau) as device_days
from public.usage_daily group by 1 order by 1;

-- حسب النظام والنسخة (لهالشهر)
select platform, version, sum(mau) as devices from public.usage_daily
where day >= date_trunc('month', current_date) group by 1, 2 order by 3 desc;
