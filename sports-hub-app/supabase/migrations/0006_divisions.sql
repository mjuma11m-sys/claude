-- Divisions: every club belongs to one league (Premier or Second Division). The wage-to-revenue limit is set per division.
-- The limits are demo values until the federation publishes its real ones: is_demo stays true and the UI says so.

alter table public.clubs add column league_id text references public.leagues (id) on delete set null;
create index clubs_league_idx on public.clubs (league_id);

insert into public.rules (key, value, label) values
  ('ffp_wage_ratio_limit:premier', 0.70, 'حد الأجور إلى الإيرادات للدوري الممتاز (قيمة تجريبية، مو قاعدة رسمية)'),
  ('ffp_wage_ratio_limit:second',  0.80, 'حد الأجور إلى الإيرادات لدوري الدرجة الثانية (قيمة تجريبية، مو قاعدة رسمية)');
