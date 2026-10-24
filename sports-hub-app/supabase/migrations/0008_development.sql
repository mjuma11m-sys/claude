-- Player and goalkeeper development: coach assessments (1-5), goals, and training-session load.
-- Every row hangs off a player of the caller's own club through the composite key, so removing a player (consent withdrawal)
-- removes their development data too. No free-text columns on purpose: notes are where sensitive details leak.

create table public.skill_assessments (
  player_id   uuid not null,
  club_id     uuid not null,
  assessed_on date not null default current_date check (assessed_on <= current_date),
  skill       text not null check (skill in ('reflexes', 'diving', 'high_balls', 'footwork', 'distribution', 'one_v_one', 'organisation',
                                              'first_touch', 'passing', 'shooting', 'defending', 'speed_agility', 'positioning')),
  score       smallint not null check (score between 1 and 5),
  assessed_by uuid default auth.uid() references auth.users (id) on delete set null,
  is_demo     boolean not null default false,
  primary key (player_id, assessed_on, skill),
  foreign key (player_id, club_id) references public.players (id, club_id) on delete cascade
);
create index skill_assessments_club_idx on public.skill_assessments (club_id);

create table public.dev_goals (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid not null,
  club_id    uuid not null,
  skill      text not null check (skill in ('reflexes', 'diving', 'high_balls', 'footwork', 'distribution', 'one_v_one', 'organisation',
                                             'first_touch', 'passing', 'shooting', 'defending', 'speed_agility', 'positioning')),
  target     smallint not null check (target between 1 and 5),
  due_on     date not null,
  created_at timestamptz not null default now(),
  done_at    timestamptz,
  is_demo    boolean not null default false,
  foreign key (player_id, club_id) references public.players (id, club_id) on delete cascade
);
create index dev_goals_club_idx on public.dev_goals (club_id);

-- At most three open goals per player: a plan with ten priorities has none.
create function public.dev_goal_limit() returns trigger language plpgsql set search_path = '' as
  $$ begin
    if (select count(*) from public.dev_goals where player_id = new.player_id and done_at is null) >= 3 then raise exception 'goal_limit'; end if;
    return new;
  end $$;
create trigger dev_goals_limit before insert on public.dev_goals for each row execute function public.dev_goal_limit();

create table public.training_logs (
  player_id uuid not null,
  club_id   uuid not null,
  day       date not null check (day <= current_date),
  minutes   smallint not null check (minutes between 1 and 300),
  rpe       smallint not null check (rpe between 1 and 10),
  logged_by uuid default auth.uid() references auth.users (id) on delete set null,
  is_demo   boolean not null default false,
  primary key (player_id, day),
  foreign key (player_id, club_id) references public.players (id, club_id) on delete cascade
);
create index training_logs_club_idx on public.training_logs (club_id, day);

alter table public.skill_assessments enable row level security;
alter table public.dev_goals enable row level security;
alter table public.training_logs enable row level security;
revoke all on public.skill_assessments, public.dev_goals, public.training_logs from anon, authenticated;
grant select on public.skill_assessments, public.dev_goals, public.training_logs to authenticated;
grant insert (player_id, club_id, assessed_on, skill, score), update (score) on public.skill_assessments to authenticated;
grant insert (player_id, club_id, skill, target, due_on), update (done_at), delete on public.dev_goals to authenticated;
grant insert (player_id, club_id, day, minutes, rpe), update (minutes, rpe), delete on public.training_logs to authenticated;

-- Assessments and goals: the club's administrators. Session load: administrators and medical staff (it feeds the load screen).
create policy "club admin and medical read assessments" on public.skill_assessments for select to authenticated
  using ((select public.my_role()) in ('club_admin', 'medical') and club_id = (select public.my_club()));
create policy "club admin writes assessments" on public.skill_assessments for insert to authenticated
  with check ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()));
create policy "club admin amends assessments" on public.skill_assessments for update to authenticated
  using ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()))
  with check ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()));

create policy "club admin and medical read goals" on public.dev_goals for select to authenticated
  using ((select public.my_role()) in ('club_admin', 'medical') and club_id = (select public.my_club()));
create policy "club admin writes goals" on public.dev_goals for insert to authenticated
  with check ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()));
create policy "club admin amends goals" on public.dev_goals for update to authenticated
  using ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()))
  with check ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()));
create policy "club admin removes goals" on public.dev_goals for delete to authenticated
  using ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()));

create policy "club staff read logs" on public.training_logs for select to authenticated
  using ((select public.my_role()) in ('club_admin', 'medical') and club_id = (select public.my_club()));
create policy "club staff write logs" on public.training_logs for insert to authenticated
  with check ((select public.my_role()) in ('club_admin', 'medical') and club_id = (select public.my_club()));
create policy "club staff amend logs" on public.training_logs for update to authenticated
  using ((select public.my_role()) in ('club_admin', 'medical') and club_id = (select public.my_club()))
  with check ((select public.my_role()) in ('club_admin', 'medical') and club_id = (select public.my_club()));
create policy "club staff remove logs" on public.training_logs for delete to authenticated
  using ((select public.my_role()) in ('club_admin', 'medical') and club_id = (select public.my_club()));
