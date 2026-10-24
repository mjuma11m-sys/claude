-- Demo data mirroring src/data/demo.ts. Every row is is_demo = true; replace with real data via the service role.

-- Safe to re-run: clears demo rows first.

begin;

delete from public.matches where is_demo;

delete from public.league_entries where is_demo;

insert into public.leagues (id, name, tier) values

  ('premier', 'دوري ناصر بن حمد الممتاز', 1),
  ('second', 'دوري الدرجة الثانية', 2)
on conflict (id) do update set name = excluded.name, tier = excluded.tier;

insert into public.clubs (name) values
  ('أم الحصم'),
  ('الأهلي'),
  ('الاتحاد'),
  ('البحرين'),
  ('البديع'),
  ('البسيتين'),
  ('التضامن'),
  ('الحد'),
  ('الخالدية'),
  ('الرفاع'),
  ('الرفاع الشرقي'),
  ('الشباب'),
  ('العكر'),
  ('المالكية'),
  ('المحرق'),
  ('المنامة'),
  ('النجمة'),
  ('سترة'),
  ('قلالي'),
  ('مدينة عيسى')
on conflict (name) do nothing;

insert into public.league_entries (league_id, club_id, played, won, drawn, lost, gf, ga)
select 'premier', c.id, v.p, v.w, v.d, v.l, v.gf, v.ga
from (values
  ('المحرق', 10, 7, 2, 1, 19, 8),
  ('الخالدية', 10, 6, 3, 1, 16, 7),
  ('الرفاع', 10, 6, 2, 2, 15, 9),
  ('المالكية', 10, 5, 3, 2, 14, 10),
  ('الأهلي', 10, 4, 4, 2, 12, 10),
  ('الحد', 10, 4, 3, 3, 11, 11),
  ('المنامة', 10, 3, 2, 5, 13, 13),
  ('الرفاع الشرقي', 10, 2, 3, 5, 10, 12),
  ('سترة', 10, 2, 2, 6, 9, 14),
  ('البحرين', 10, 2, 3, 5, 8, 14),
  ('النجمة', 10, 2, 2, 6, 7, 15),
  ('الشباب', 10, 1, 3, 6, 6, 17)
) as v(team, p, w, d, l, gf, ga)
join public.clubs c on c.name = v.team;

insert into public.league_entries (league_id, club_id, played, won, drawn, lost, gf, ga)
select 'second', c.id, v.p, v.w, v.d, v.l, v.gf, v.ga
from (values
  ('قلالي', 9, 6, 2, 1, 15, 6),
  ('مدينة عيسى', 9, 5, 3, 1, 13, 7),
  ('البديع', 9, 5, 1, 3, 12, 9),
  ('الاتحاد', 9, 4, 2, 3, 11, 10),
  ('التضامن', 9, 2, 3, 4, 9, 9),
  ('أم الحصم', 9, 2, 3, 4, 8, 12),
  ('البسيتين', 9, 2, 2, 5, 7, 13),
  ('العكر', 9, 1, 2, 6, 5, 14)
) as v(team, p, w, d, l, gf, ga)
join public.clubs c on c.name = v.team;

delete from public.players where club_id = (select id from public.clubs where name = 'المالكية') and name like 'اللاعب %';
insert into public.players (club_id, name, num, pos)
select c.id, v.name, v.num, v.pos from public.clubs c, (values
  ('اللاعب 1', 1, 'حارس مرمى'), ('اللاعب 4', 4, 'قلب دفاع'), ('اللاعب 8', 8, 'وسط'),
  ('اللاعب 10', 10, 'صانع ألعاب'), ('اللاعب 9', 9, 'مهاجم')
) as v(name, num, pos) where c.name = 'المالكية';

-- Next match five days from now so the voting window is open.
with m as (
  insert into public.matches (league_id, home_id, away_id, venue, kickoff)
  select 'premier', h.id, a.id, 'استاد خليفة الرياضي', date_trunc('day', now()) + interval '5 days 16 hours 30 minutes'
  from public.clubs h, public.clubs a where h.name = 'المالكية' and a.name = 'المحرق'
  returning id, home_id
)
insert into public.motm_candidates (match_id, player_id)
select m.id, p.id from m join public.players p on p.club_id = m.home_id;
commit;

-- ===== Club and federation demo =====
-- Every club here is fictional ("نادي تجريبي NN"). Pay and finance are never attached to a real club, even as demo data.
begin;
delete from public.club_finance_reports where is_demo;

insert into public.clubs (name, is_fictional)
select 'نادي تجريبي ' || lpad(n::text, 2, '0'), true from generate_series(1, 20) n
on conflict (name) do nothing;

-- 01–12 play in the Premier League, 13–20 in the Second Division (same size as the demo Second Division table)
update public.clubs set league_id = case when right(name, 2)::int <= 12 then 'premier' else 'second' end
where is_fictional and name like 'نادي تجريبي %';

-- Squad of club 01 (cascades to its contracts and statuses)
delete from public.players where club_id = (select id from public.clubs where name = 'نادي تجريبي 01');
insert into public.players (club_id, name, num, pos)
select c.id, 'اللاعب ' || v.num, v.num, v.pos
from public.clubs c, (values
  (1, 'حارس مرمى'), (22, 'حارس مرمى'), (2, 'ظهير أيمن'), (3, 'ظهير أيسر'), (4, 'قلب دفاع'), (5, 'قلب دفاع'),
  (6, 'وسط ارتكاز'), (8, 'وسط'), (10, 'صانع ألعاب'), (14, 'وسط'), (7, 'جناح'), (11, 'جناح'),
  (9, 'مهاجم'), (17, 'مهاجم'), (19, 'مهاجم'), (21, 'وسط')
) as v(num, pos) where c.name = 'نادي تجريبي 01';

-- num, days until the contract ends, monthly wage (BHD), availability, note
create temp table squad (num int, days int, wage numeric, status text, note text) on commit drop;
insert into squad values
  (1, 420, 1800, 'fit', null), (22, 150, 900, 'fit', null), (2, 640, 1500, 'fit', null),
  (3, 95, 1400, 'doubtful', 'إجهاد بسيط'), (4, 880, 2100, 'fit', null), (5, 300, 1700, 'injured', 'إصابة عضلية'),
  (6, 1100, 2400, 'fit', null), (8, 170, 1600, 'fit', null), (10, 520, 3200, 'fit', null),
  (14, 40, 1100, 'suspended', 'إيقاف مباراتين'), (7, 730, 2000, 'fit', null), (11, 200, 1900, 'fit', null),
  (9, 960, 3500, 'fit', null), (17, 340, 1300, 'fit', null), (19, 130, 1000, 'injured', 'شد بالفخذ'), (21, 560, 600, 'fit', null);

insert into public.contracts (player_id, club_id, starts_on, ends_on, monthly_wage_bhd)
select p.id, p.club_id, current_date - 700, current_date + s.days, s.wage
from public.players p join squad s on s.num = p.num
where p.club_id = (select id from public.clubs where name = 'نادي تجريبي 01');

insert into public.player_status (player_id, club_id, status, note)
select p.id, p.club_id, s.status, s.note
from public.players p join squad s on s.num = p.num
where p.club_id = (select id from public.clubs where name = 'نادي تجريبي 01');

-- Season finance reports: 16 submitted; clubs 11, 12 (Premier) and 19, 20 (Second) have not filed yet
insert into public.club_finance_reports (club_id, season, revenue_bhd, wages_bhd)
select c.id, '2026/27', v.revenue, v.wages
from public.clubs c join (values
  ('نادي تجريبي 01', 520000, 360000), ('نادي تجريبي 02', 880000, 470000), ('نادي تجريبي 03', 410000, 340000),
  ('نادي تجريبي 04', 760000, 500000), ('نادي تجريبي 05', 1200000, 640000), ('نادي تجريبي 06', 330000, 215000),
  ('نادي تجريبي 07', 590000, 300000), ('نادي تجريبي 08', 450000, 335000), ('نادي تجريبي 09', 980000, 520000),
  ('نادي تجريبي 10', 270000, 150000),
  ('نادي تجريبي 13', 210000, 150000), ('نادي تجريبي 14', 180000, 160000), ('نادي تجريبي 15', 240000, 120000),
  ('نادي تجريبي 16', 150000, 100000), ('نادي تجريبي 17', 130000, 100000), ('نادي تجريبي 18', 110000, 70000)
) as v(name, revenue, wages) on v.name = c.name;
commit;
