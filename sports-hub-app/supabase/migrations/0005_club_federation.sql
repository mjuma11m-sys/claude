-- Club and federation workspaces. Tenant isolation is the product: a club sees its own people and money and nobody else's,
-- and the federation sees only what a club chooses to submit (the season finance report), never player-level pay.

alter table public.clubs add column is_fictional boolean not null default false; -- demo-only clubs: never offered in the fan club picker

-- A composite key lets child tables prove "this player belongs to this club" in the database, not in app code.
alter table public.players add constraint players_id_club_key unique (id, club_id);

create table public.rules (
  key     text primary key,
  value   numeric not null,
  label   text not null,
  is_demo boolean not null default true
);
insert into public.rules (key, value, label) values
  ('ffp_wage_ratio_limit', 0.70, 'الحد الأعلى لنسبة الأجور إلى الإيرادات (قيمة تجريبية، مو قاعدة رسمية)');

create table public.contracts (
  id               uuid primary key default gen_random_uuid(),
  player_id        uuid not null,
  club_id          uuid not null,
  starts_on        date not null,
  ends_on          date not null,
  monthly_wage_bhd numeric(10, 3) not null check (monthly_wage_bhd >= 0),
  is_demo          boolean not null default true,
  check (ends_on > starts_on),
  foreign key (player_id, club_id) references public.players (id, club_id) on delete cascade
);
create index contracts_club_end_idx on public.contracts (club_id, ends_on);

create table public.player_status (
  player_id  uuid primary key,
  club_id    uuid not null,
  status     text not null check (status in ('fit', 'doubtful', 'injured', 'suspended')),
  note       text,
  updated_at timestamptz not null default now(),
  is_demo    boolean not null default true,
  foreign key (player_id, club_id) references public.players (id, club_id) on delete cascade
);
create trigger player_status_touch before update on public.player_status
  for each row execute function public.touch_updated_at();

create table public.club_finance_reports (
  club_id      uuid not null references public.clubs (id) on delete cascade,
  season       text not null,
  revenue_bhd  numeric(14, 3) not null check (revenue_bhd >= 0),
  wages_bhd    numeric(14, 3) not null check (wages_bhd >= 0),
  submitted_at timestamptz not null default now(),
  submitted_by uuid default auth.uid() references auth.users (id) on delete set null,
  is_demo      boolean not null default true,
  primary key (club_id, season)
);
create function public.touch_submitted_at() returns trigger language plpgsql set search_path = '' as
  $$ begin new.submitted_at = now(); return new; end $$;
create trigger finance_touch before update on public.club_finance_reports
  for each row execute function public.touch_submitted_at();

alter table public.rules enable row level security;
alter table public.contracts enable row level security;
alter table public.player_status enable row level security;
alter table public.club_finance_reports enable row level security;

-- Supabase hands new tables to anon/authenticated by default: start from nothing, then grant exactly what each role needs.
revoke all on public.rules, public.contracts, public.player_status, public.club_finance_reports from anon, authenticated;
grant select on public.rules, public.contracts, public.player_status, public.club_finance_reports to authenticated;
grant update (status, note) on public.player_status to authenticated;
grant insert (club_id, season, revenue_bhd, wages_bhd), update (revenue_bhd, wages_bhd) on public.club_finance_reports to authenticated;

create policy "rules readable by signed-in users" on public.rules for select to authenticated using (true);

-- Pay: the club's own administrators only. Medical staff, players, fans and the federation never see it.
create policy "club admin reads own contracts" on public.contracts for select to authenticated
  using ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()));

-- Availability is health-adjacent: own club's administrators and medical staff.
create policy "own club staff read status" on public.player_status for select to authenticated
  using ((select public.my_role()) in ('club_admin', 'medical') and club_id = (select public.my_club()));
create policy "own club staff update status" on public.player_status for update to authenticated
  using ((select public.my_role()) in ('club_admin', 'medical') and club_id = (select public.my_club()))
  with check ((select public.my_role()) in ('club_admin', 'medical') and club_id = (select public.my_club()));

-- Finance report: the club writes its own; the federation reads every submitted one. Submitting IS the consent.
create policy "club admin reads own report" on public.club_finance_reports for select to authenticated
  using ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()));
create policy "federation reads submitted reports" on public.club_finance_reports for select to authenticated
  using ((select public.my_role()) = 'bfa_admin');
create policy "club admin submits own report" on public.club_finance_reports for insert to authenticated
  with check ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()));
create policy "club admin amends own report" on public.club_finance_reports for update to authenticated
  using ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()))
  with check ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()));
