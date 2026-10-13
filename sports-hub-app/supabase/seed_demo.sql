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
