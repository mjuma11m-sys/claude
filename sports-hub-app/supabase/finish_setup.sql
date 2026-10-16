-- Finish the setup on a project where 0001-0006 and the tables part of 0007 are already applied (the Supabase MCP tool cannot run
-- migrations that contain DELETE/DROP without an in-app confirmation). Paste this whole file into the SQL Editor and Run, once.

-- ===== 0007 (rest): import_squad, withdraw_consent =====
-- import_squad(rows): replaces the caller's club squad with the rows, atomically.
-- Each row: { num, name, pos, status, ends_on, starts_on?, monthly_wage_bhd, consent_ref }.
-- Returns { ok: true, players: n } or { ok: false, errors: [{ row, field, code }] } (row = 1-based data row).
-- Authorisation failures raise: forbidden, dpa_required.
create function public.import_squad(p_rows jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_club uuid := (select public.my_club());
  v_errors jsonb := '[]'::jsonb;
  v_n int;
  r jsonb; i int := 0;
  v_name text; v_pos text; v_status text; v_ref text; v_num int; v_wage numeric; v_start date; v_end date;
  v_seen int[] := '{}';
  v_id uuid;
begin
  if (select public.my_role()) is distinct from 'club_admin' or v_club is null then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.data_agreements where club_id = v_club and revoked_at is null) then raise exception 'dpa_required'; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' then return jsonb_build_object('ok', false, 'errors', jsonb_build_array(jsonb_build_object('row', 0, 'field', 'rows', 'code', 'not_a_list'))); end if;
  v_n := jsonb_array_length(p_rows);
  if v_n = 0 or v_n > 60 then return jsonb_build_object('ok', false, 'errors', jsonb_build_array(jsonb_build_object('row', 0, 'field', 'rows', 'code', 'bad_row_count'))); end if;

  -- 1) validate every row; collect every problem so the club fixes them in one pass
  for r in select * from jsonb_array_elements(p_rows) loop
    i := i + 1;
    v_name := btrim(coalesce(r ->> 'name', '')); v_pos := btrim(coalesce(r ->> 'pos', '')); v_status := coalesce(r ->> 'status', ''); v_ref := btrim(coalesce(r ->> 'consent_ref', ''));
    if length(v_name) not between 2 and 60 then v_errors := v_errors || jsonb_build_object('row', i, 'field', 'name', 'code', 'bad_length'); end if;
    if length(v_pos) not between 2 and 30 then v_errors := v_errors || jsonb_build_object('row', i, 'field', 'pos', 'code', 'bad_length'); end if;
    if v_status not in ('fit', 'doubtful', 'injured', 'suspended') then v_errors := v_errors || jsonb_build_object('row', i, 'field', 'status', 'code', 'bad_status'); end if;
    if length(v_ref) not between 3 and 60 then v_errors := v_errors || jsonb_build_object('row', i, 'field', 'consent_ref', 'code', 'consent_required'); end if;
    if v_name ~ '^[=+\-@]' or v_pos ~ '^[=+\-@]' or v_ref ~ '^[=+\-@]' then v_errors := v_errors || jsonb_build_object('row', i, 'field', 'text', 'code', 'formula_prefix'); end if;
    begin v_num := (r ->> 'num')::int; exception when others then v_num := null; end;
    if v_num is null or v_num not between 1 and 99 then v_errors := v_errors || jsonb_build_object('row', i, 'field', 'num', 'code', 'bad_number');
    elsif v_num = any (v_seen) then v_errors := v_errors || jsonb_build_object('row', i, 'field', 'num', 'code', 'duplicate_number');
    else v_seen := v_seen || v_num; end if;
    begin v_wage := (r ->> 'monthly_wage_bhd')::numeric; exception when others then v_wage := null; end;
    if v_wage is null or v_wage < 0 or v_wage > 100000 then v_errors := v_errors || jsonb_build_object('row', i, 'field', 'monthly_wage_bhd', 'code', 'bad_wage'); end if;
    begin v_end := (r ->> 'ends_on')::date; exception when others then v_end := null; end;
    begin v_start := coalesce((r ->> 'starts_on')::date, current_date); exception when others then v_start := null; end;
    if v_end is null then v_errors := v_errors || jsonb_build_object('row', i, 'field', 'ends_on', 'code', 'bad_date');
    elsif v_start is null then v_errors := v_errors || jsonb_build_object('row', i, 'field', 'starts_on', 'code', 'bad_date');
    elsif v_end <= v_start then v_errors := v_errors || jsonb_build_object('row', i, 'field', 'ends_on', 'code', 'ends_before_start'); end if;
  end loop;
  if jsonb_array_length(v_errors) > 0 then return jsonb_build_object('ok', false, 'errors', v_errors); end if;

  -- 2) replace the squad (cascades to old contracts, statuses and consents) and write the new rows
  delete from public.players where club_id = v_club;
  for r in select * from jsonb_array_elements(p_rows) loop
    insert into public.players (club_id, name, num, pos)
      values (v_club, btrim(r ->> 'name'), (r ->> 'num')::int, btrim(r ->> 'pos')) returning id into v_id;
    insert into public.contracts (player_id, club_id, starts_on, ends_on, monthly_wage_bhd, is_demo)
      values (v_id, v_club, coalesce((r ->> 'starts_on')::date, current_date), (r ->> 'ends_on')::date, (r ->> 'monthly_wage_bhd')::numeric, false);
    insert into public.player_status (player_id, club_id, status, is_demo) values (v_id, v_club, r ->> 'status', false);
    insert into public.player_consents (player_id, club_id, consent_ref) values (v_id, v_club, btrim(r ->> 'consent_ref'));
  end loop;
  return jsonb_build_object('ok', true, 'players', v_n);
end $$;

-- withdraw_consent(player): the player's pay and availability are deleted now; only a count-only log line stays.
create function public.withdraw_consent(p_player uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_club uuid := (select public.my_club()); v_ref text;
begin
  if (select public.my_role()) is distinct from 'club_admin' or v_club is null then raise exception 'forbidden'; end if;
  select consent_ref into v_ref from public.player_consents where player_id = p_player and club_id = v_club;
  if v_ref is null then raise exception 'not_found'; end if;
  insert into public.consent_withdrawals (club_id, consent_ref) values (v_club, v_ref);
  delete from public.players where id = p_player and club_id = v_club;
end $$;

revoke execute on function public.import_squad(jsonb), public.withdraw_consent(uuid) from public, anon;
grant execute on function public.import_squad(jsonb), public.withdraw_consent(uuid) to authenticated;

-- ===== migrations/0008_development.sql =====
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

-- ===== migrations/0009_lineups.sql =====
-- Match lineups: 11 starters in a formation plus a bench, per club and match day.
-- A lineup is competitive information: club administrators only (not the federation, not medical staff).
-- The only way to write one is save_lineup(), which checks everything the screen checks; rows hang off players by the composite key,
-- so a withdrawn consent removes the player from every saved lineup.

create table public.lineups (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references public.clubs (id) on delete cascade,
  match_on   date not null,
  opponent   text not null check (length(btrim(opponent)) between 1 and 40),
  formation  text not null check (formation in ('4-3-3', '4-4-2', '4-2-3-1', '3-5-2')),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (club_id, match_on),
  unique (id, club_id)
);

create table public.lineup_players (
  lineup_id uuid not null,
  club_id   uuid not null,
  player_id uuid not null,
  role      text not null check (role in ('start', 'bench')),
  slot      smallint not null check (slot between 1 and 11),
  primary key (lineup_id, player_id),
  unique (lineup_id, role, slot),
  check (role = 'start' or slot <= 9),
  foreign key (lineup_id, club_id) references public.lineups (id, club_id) on delete cascade,
  foreign key (player_id, club_id) references public.players (id, club_id) on delete cascade
);
create index lineup_players_club_idx on public.lineup_players (club_id);

alter table public.lineups enable row level security;
alter table public.lineup_players enable row level security;
revoke all on public.lineups, public.lineup_players from anon, authenticated;
grant select on public.lineups, public.lineup_players to authenticated;
grant delete on public.lineups to authenticated;

create policy "club admin reads own lineups" on public.lineups for select to authenticated
  using ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()));
create policy "club admin deletes own lineups" on public.lineups for delete to authenticated
  using ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()));
create policy "club admin reads own lineup players" on public.lineup_players for select to authenticated
  using ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()));

-- save_lineup(match_on, opponent, formation, starters, bench): replaces the lineup of that match day, atomically.
-- starters: [{ player_id, slot }] (11, slot 1 = the goalkeeper), bench: [{ player_id }] (up to 9, in order).
-- Returns { ok: true, id } or { ok: false, errors: [{ field, code }] }. Raises: forbidden.
create function public.save_lineup(p_match_on date, p_opponent text, p_formation text, p_starters jsonb, p_bench jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_club uuid := (select public.my_club());
  v_errors jsonb := '[]'::jsonb;
  v_opp text := btrim(coalesce(p_opponent, ''));
  r jsonb; i int := 0;
  v_pid uuid; v_slot int; v_ids uuid[] := '{}'; v_slots int[] := '{}';
  v_pos text; v_status text; v_gk_start int := 0; v_lineup uuid;
begin
  if (select public.my_role()) is distinct from 'club_admin' or v_club is null then raise exception 'forbidden'; end if;
  if p_match_on is null then v_errors := v_errors || jsonb_build_object('field', 'match_on', 'code', 'bad_date'); end if;
  if length(v_opp) not between 1 and 40 then v_errors := v_errors || jsonb_build_object('field', 'opponent', 'code', 'bad_opponent'); end if;
  if p_formation is null or p_formation not in ('4-3-3', '4-4-2', '4-2-3-1', '3-5-2') then v_errors := v_errors || jsonb_build_object('field', 'formation', 'code', 'bad_formation'); end if;
  if jsonb_typeof(p_starters) is distinct from 'array' or jsonb_array_length(p_starters) <> 11 then
    v_errors := v_errors || jsonb_build_object('field', 'starters', 'code', 'wrong_count');
  end if;
  if jsonb_typeof(p_bench) is distinct from 'array' or jsonb_array_length(p_bench) > 9 then
    v_errors := v_errors || jsonb_build_object('field', 'bench', 'code', 'bench_too_big');
  end if;
  if jsonb_array_length(v_errors) > 0 then return jsonb_build_object('ok', false, 'errors', v_errors); end if;

  for r in select * from jsonb_array_elements(p_starters) loop
    i := i + 1;
    begin v_pid := (r ->> 'player_id')::uuid; v_slot := (r ->> 'slot')::int; exception when others then v_pid := null; v_slot := null; end;
    if v_pid is null or v_slot is null or v_slot not between 1 and 11 or v_slot = any (v_slots) then
      v_errors := v_errors || jsonb_build_object('field', 'starters', 'code', 'bad_slot', 'row', i); continue;
    end if;
    v_slots := v_slots || v_slot;
    if v_pid = any (v_ids) then v_errors := v_errors || jsonb_build_object('field', 'starters', 'code', 'duplicate_player', 'row', i); continue; end if;
    v_ids := v_ids || v_pid;
    select p.pos, coalesce(s.status, 'fit') into v_pos, v_status from public.players p left join public.player_status s on s.player_id = p.id where p.id = v_pid and p.club_id = v_club;
    if v_pos is null then v_errors := v_errors || jsonb_build_object('field', 'starters', 'code', 'unknown_player', 'row', i); continue; end if;
    if v_status in ('injured', 'suspended') then v_errors := v_errors || jsonb_build_object('field', 'starters', 'code', 'unavailable', 'row', i); end if;
    if v_pos like '%حارس%' then
      v_gk_start := v_gk_start + 1;
      if v_slot <> 1 then v_errors := v_errors || jsonb_build_object('field', 'starters', 'code', 'goalkeeper_not_in_goal', 'row', i); end if;
    elsif v_slot = 1 then v_errors := v_errors || jsonb_build_object('field', 'starters', 'code', 'outfield_in_goal', 'row', i); end if;
  end loop;
  if v_gk_start = 0 then v_errors := v_errors || jsonb_build_object('field', 'starters', 'code', 'no_goalkeeper'); end if;
  if v_gk_start > 1 then v_errors := v_errors || jsonb_build_object('field', 'starters', 'code', 'two_goalkeepers'); end if;

  i := 0;
  for r in select * from jsonb_array_elements(p_bench) loop
    i := i + 1;
    begin v_pid := (r ->> 'player_id')::uuid; exception when others then v_pid := null; end;
    if v_pid is null then v_errors := v_errors || jsonb_build_object('field', 'bench', 'code', 'bad_slot', 'row', i); continue; end if;
    if v_pid = any (v_ids) then v_errors := v_errors || jsonb_build_object('field', 'bench', 'code', 'duplicate_player', 'row', i); continue; end if;
    v_ids := v_ids || v_pid;
    select coalesce(s.status, 'fit') into v_status from public.players p left join public.player_status s on s.player_id = p.id where p.id = v_pid and p.club_id = v_club;
    if not found then v_errors := v_errors || jsonb_build_object('field', 'bench', 'code', 'unknown_player', 'row', i); continue; end if;
    if v_status in ('injured', 'suspended') then v_errors := v_errors || jsonb_build_object('field', 'bench', 'code', 'unavailable', 'row', i); end if;
  end loop;
  if jsonb_array_length(v_errors) > 0 then return jsonb_build_object('ok', false, 'errors', v_errors); end if;

  insert into public.lineups (club_id, match_on, opponent, formation) values (v_club, p_match_on, v_opp, p_formation)
    on conflict (club_id, match_on) do update set opponent = excluded.opponent, formation = excluded.formation, updated_at = now(), created_by = auth.uid()
    returning id into v_lineup;
  delete from public.lineup_players where lineup_id = v_lineup;
  for r in select * from jsonb_array_elements(p_starters) loop
    insert into public.lineup_players (lineup_id, club_id, player_id, role, slot) values (v_lineup, v_club, (r ->> 'player_id')::uuid, 'start', (r ->> 'slot')::int);
  end loop;
  i := 0;
  for r in select * from jsonb_array_elements(p_bench) loop
    i := i + 1;
    insert into public.lineup_players (lineup_id, club_id, player_id, role, slot) values (v_lineup, v_club, (r ->> 'player_id')::uuid, 'bench', i);
  end loop;
  return jsonb_build_object('ok', true, 'id', v_lineup);
end $$;

revoke execute on function public.save_lineup(date, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.save_lineup(date, text, text, jsonb, jsonb) to authenticated;

-- ===== migrations/0010_attendance.sql =====
-- Attendance: who came to training or a match. Codes only, no free text (the excuse is one of a short list).
-- Written only through save_attendance(); club administrators write, medical staff read, nobody else sees it.
-- Rows hang off players by the composite key, so a withdrawn consent removes the player's marks too.

create table public.attendance_sessions (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references public.clubs (id) on delete cascade,
  day        date not null check (day <= current_date),
  kind       text not null check (kind in ('training', 'match')),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (club_id, day, kind),
  unique (id, club_id)
);

create table public.attendance_marks (
  session_id uuid not null,
  club_id    uuid not null,
  player_id  uuid not null,
  status     text not null check (status in ('present', 'late', 'excused', 'absent')),
  reason     text check (reason in ('medical', 'study', 'travel', 'personal')),
  primary key (session_id, player_id),
  check (reason is null or status = 'excused'),
  foreign key (session_id, club_id) references public.attendance_sessions (id, club_id) on delete cascade,
  foreign key (player_id, club_id) references public.players (id, club_id) on delete cascade
);
create index attendance_marks_player_idx on public.attendance_marks (player_id);
create index attendance_sessions_club_day_idx on public.attendance_sessions (club_id, day desc);

alter table public.attendance_sessions enable row level security;
alter table public.attendance_marks enable row level security;
revoke all on public.attendance_sessions, public.attendance_marks from anon, authenticated;
grant select on public.attendance_sessions, public.attendance_marks to authenticated;
grant delete on public.attendance_sessions to authenticated;

create policy "club staff read sessions" on public.attendance_sessions for select to authenticated
  using ((select public.my_role()) in ('club_admin', 'medical') and club_id = (select public.my_club()));
create policy "club admin deletes sessions" on public.attendance_sessions for delete to authenticated
  using ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()));
create policy "club staff read marks" on public.attendance_marks for select to authenticated
  using ((select public.my_role()) in ('club_admin', 'medical') and club_id = (select public.my_club()));

-- save_attendance(day, kind, marks): replaces the marks of that day and kind, atomically.
-- marks: [{ player_id, status, reason? }] (1-60). The day cannot be in the future or older than 90 days.
-- Returns { ok: true, id } or { ok: false, errors: [{ field, code, row? }] }. Raises: forbidden.
create function public.save_attendance(p_day date, p_kind text, p_marks jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_club uuid := (select public.my_club());
  v_errors jsonb := '[]'::jsonb;
  r jsonb; i int := 0; v_pid uuid; v_ids uuid[] := '{}'; v_status text; v_reason text; v_session uuid;
begin
  if (select public.my_role()) is distinct from 'club_admin' or v_club is null then raise exception 'forbidden'; end if;
  if p_day is null or p_day > current_date or p_day < current_date - 90 then v_errors := v_errors || jsonb_build_object('field', 'day', 'code', 'bad_date'); end if;
  if p_kind is null or p_kind not in ('training', 'match') then v_errors := v_errors || jsonb_build_object('field', 'kind', 'code', 'bad_kind'); end if;
  if jsonb_typeof(p_marks) is distinct from 'array' or jsonb_array_length(p_marks) not between 1 and 60 then
    v_errors := v_errors || jsonb_build_object('field', 'marks', 'code', 'bad_count');
  end if;
  if jsonb_array_length(v_errors) > 0 then return jsonb_build_object('ok', false, 'errors', v_errors); end if;

  for r in select * from jsonb_array_elements(p_marks) loop
    i := i + 1;
    begin v_pid := (r ->> 'player_id')::uuid; exception when others then v_pid := null; end;
    v_status := r ->> 'status'; v_reason := nullif(r ->> 'reason', '');
    if v_pid is null or not exists (select 1 from public.players where id = v_pid and club_id = v_club) then
      v_errors := v_errors || jsonb_build_object('field', 'player', 'code', 'unknown_player', 'row', i); continue;
    end if;
    if v_pid = any (v_ids) then v_errors := v_errors || jsonb_build_object('field', 'player', 'code', 'duplicate_player', 'row', i); continue; end if;
    v_ids := v_ids || v_pid;
    if v_status is null or v_status not in ('present', 'late', 'excused', 'absent') then v_errors := v_errors || jsonb_build_object('field', 'status', 'code', 'bad_status', 'row', i); end if;
    if v_reason is not null and (v_status is distinct from 'excused' or v_reason not in ('medical', 'study', 'travel', 'personal')) then
      v_errors := v_errors || jsonb_build_object('field', 'reason', 'code', 'bad_reason', 'row', i);
    end if;
  end loop;
  if jsonb_array_length(v_errors) > 0 then return jsonb_build_object('ok', false, 'errors', v_errors); end if;

  insert into public.attendance_sessions (club_id, day, kind) values (v_club, p_day, p_kind)
    on conflict (club_id, day, kind) do update set updated_at = now(), created_by = auth.uid() returning id into v_session;
  delete from public.attendance_marks where session_id = v_session;
  for r in select * from jsonb_array_elements(p_marks) loop
    insert into public.attendance_marks (session_id, club_id, player_id, status, reason)
      values (v_session, v_club, (r ->> 'player_id')::uuid, r ->> 'status', nullif(r ->> 'reason', ''));
  end loop;
  return jsonb_build_object('ok', true, 'id', v_session);
end $$;

revoke execute on function public.save_attendance(date, text, jsonb) from public, anon;
grant execute on function public.save_attendance(date, text, jsonb) to authenticated;

-- ===== migrations/0011_match_reports.sql =====
-- Match reports: the events a club enters after a match (goals, shots, cards, corners, substitutions), from which the app builds the
-- replay and the numbers. Nothing here is tracked automatically and nothing is free text except the opponent's name.
-- Club administrators only (a report is competitive information). Written only through save_match_report().
-- Rows hang off players by the composite key; a withdrawn consent unlinks the player from events but keeps the match result.

create table public.match_reports (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references public.clubs (id) on delete cascade,
  match_on   date not null check (match_on <= current_date),
  opponent   text not null check (length(btrim(opponent)) between 1 and 40),
  home       boolean not null default true,
  possession smallint check (possession between 0 and 100),
  keeper_id  uuid,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (club_id, match_on),
  unique (id, club_id),
  foreign key (keeper_id, club_id) references public.players (id, club_id) on delete set null (keeper_id)
);

create table public.match_events (
  report_id uuid not null,
  club_id   uuid not null,
  n         smallint not null check (n between 1 and 200),
  minute    smallint not null check (minute between 0 and 130),
  team      text not null check (team in ('us', 'opp')),
  kind      text not null check (kind in ('goal', 'shot', 'shot_on', 'yellow', 'red', 'sub', 'corner')),
  player_id uuid,
  x         smallint check (x between 0 and 100),
  y         smallint check (y between 0 and 100),
  primary key (report_id, n),
  check (player_id is null or team = 'us'),
  check ((x is null) = (y is null)),
  foreign key (report_id, club_id) references public.match_reports (id, club_id) on delete cascade,
  foreign key (player_id, club_id) references public.players (id, club_id) on delete set null (player_id)
);
create index match_events_club_idx on public.match_events (club_id);

alter table public.match_reports enable row level security;
alter table public.match_events enable row level security;
revoke all on public.match_reports, public.match_events from anon, authenticated;
grant select on public.match_reports, public.match_events to authenticated;
grant delete on public.match_reports to authenticated;

create policy "club admin reads own reports" on public.match_reports for select to authenticated
  using ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()));
create policy "club admin deletes own reports" on public.match_reports for delete to authenticated
  using ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()));
create policy "club admin reads own events" on public.match_events for select to authenticated
  using ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()));

-- save_match_report(match_on, opponent, home, possession, keeper, events): replaces the report of that match day, atomically.
-- events: [{ minute, team, kind, player_id?, x?, y? }] (1-200, in the order they happened). Returns { ok, id } or { ok: false, errors }.
create function public.save_match_report(p_match_on date, p_opponent text, p_home boolean, p_possession int, p_keeper uuid, p_events jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_club uuid := (select public.my_club());
  v_errors jsonb := '[]'::jsonb;
  v_opp text := btrim(coalesce(p_opponent, ''));
  r jsonb; i int := 0; v_report uuid;
  v_min int; v_team text; v_kind text; v_pid uuid; v_x int; v_y int;
begin
  if (select public.my_role()) is distinct from 'club_admin' or v_club is null then raise exception 'forbidden'; end if;
  if p_match_on is null or p_match_on > current_date then v_errors := v_errors || jsonb_build_object('field', 'match_on', 'code', 'bad_date'); end if;
  if length(v_opp) not between 1 and 40 then v_errors := v_errors || jsonb_build_object('field', 'opponent', 'code', 'bad_opponent'); end if;
  if p_possession is not null and p_possession not between 0 and 100 then v_errors := v_errors || jsonb_build_object('field', 'possession', 'code', 'bad_possession'); end if;
  if p_keeper is not null and not exists (select 1 from public.players where id = p_keeper and club_id = v_club and pos like '%حارس%') then
    v_errors := v_errors || jsonb_build_object('field', 'keeper', 'code', 'unknown_keeper');
  end if;
  if jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events) not between 1 and 200 then
    v_errors := v_errors || jsonb_build_object('field', 'events', 'code', 'bad_count');
  end if;
  if jsonb_array_length(v_errors) > 0 then return jsonb_build_object('ok', false, 'errors', v_errors); end if;

  for r in select * from jsonb_array_elements(p_events) loop
    i := i + 1;
    begin v_min := (r ->> 'minute')::int; exception when others then v_min := null; end;
    if v_min is null or v_min not between 0 and 130 then v_errors := v_errors || jsonb_build_object('field', 'minute', 'code', 'bad_minute', 'row', i); end if;
    v_team := r ->> 'team'; v_kind := r ->> 'kind';
    if v_team is null or v_team not in ('us', 'opp') then v_errors := v_errors || jsonb_build_object('field', 'team', 'code', 'bad_team', 'row', i); end if;
    if v_kind is null or v_kind not in ('goal', 'shot', 'shot_on', 'yellow', 'red', 'sub', 'corner') then v_errors := v_errors || jsonb_build_object('field', 'kind', 'code', 'bad_kind', 'row', i); end if;
    begin v_pid := nullif(r ->> 'player_id', '')::uuid; exception when others then v_pid := null; v_errors := v_errors || jsonb_build_object('field', 'player', 'code', 'unknown_player', 'row', i); end;
    if v_pid is not null then
      if v_team is distinct from 'us' then v_errors := v_errors || jsonb_build_object('field', 'player', 'code', 'player_on_opponent', 'row', i);
      elsif not exists (select 1 from public.players where id = v_pid and club_id = v_club) then v_errors := v_errors || jsonb_build_object('field', 'player', 'code', 'unknown_player', 'row', i); end if;
    end if;
    begin v_x := nullif(r ->> 'x', '')::int; v_y := nullif(r ->> 'y', '')::int; exception when others then v_x := -1; v_y := -1; end;
    if (v_x is null) <> (v_y is null) or v_x not between 0 and 100 or v_y not between 0 and 100 then v_errors := v_errors || jsonb_build_object('field', 'position', 'code', 'bad_position', 'row', i); end if;
  end loop;
  if jsonb_array_length(v_errors) > 0 then return jsonb_build_object('ok', false, 'errors', v_errors); end if;

  insert into public.match_reports (club_id, match_on, opponent, home, possession, keeper_id) values (v_club, p_match_on, v_opp, coalesce(p_home, true), p_possession, p_keeper)
    on conflict (club_id, match_on) do update set opponent = excluded.opponent, home = excluded.home, possession = excluded.possession, keeper_id = excluded.keeper_id, updated_at = now(), created_by = auth.uid()
    returning id into v_report;
  delete from public.match_events where report_id = v_report;
  i := 0;
  for r in select * from jsonb_array_elements(p_events) loop
    i := i + 1;
    insert into public.match_events (report_id, club_id, n, minute, team, kind, player_id, x, y)
      values (v_report, v_club, i, (r ->> 'minute')::int, r ->> 'team', r ->> 'kind', nullif(r ->> 'player_id', '')::uuid, nullif(r ->> 'x', '')::int, nullif(r ->> 'y', '')::int);
  end loop;
  return jsonb_build_object('ok', true, 'id', v_report);
end $$;

revoke execute on function public.save_match_report(date, text, boolean, int, uuid, jsonb) from public, anon;
grant execute on function public.save_match_report(date, text, boolean, int, uuid, jsonb) to authenticated;

-- ===== migrations/0012_player_rights.sql =====
-- Player rights, exercised through the club (there is no player login yet): a log of the requests a player makes about their own data,
-- one atomic export of everything we hold about a player, and a monthly pay ledger. The club writes; nobody else sees any of it.
-- Deadlines here are INTERNAL targets read from public.rules (demo values), not statements of what the law requires.

insert into public.rules (key, value, label) values
  ('rights_request_days', 30, 'مهلة داخلية للرد على طلب لاعب بالأيام (قيمة تجريبية، المحامي يحدد المهلة الحقيقية)'),
  ('wage_late_grace_days', 15, 'أيام السماح بعد نهاية الشهر قبل اعتبار الراتب متأخراً (قيمة تجريبية، العقد يحدد)');

-- A request keeps the consent reference but loses the person: when the player row goes, player_id becomes NULL.
create table public.player_requests (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references public.clubs (id) on delete cascade,
  player_id   uuid,
  consent_ref text not null,
  kind        text not null check (kind in ('access', 'correct', 'withdraw', 'object')),
  received_on date not null check (received_on <= current_date),
  due_on      date not null,
  status      text not null default 'open' check (status in ('open', 'done')),
  closed_on   date,
  exported_at timestamptz,
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  check ((status = 'done') = (closed_on is not null)),
  foreign key (player_id, club_id) references public.players (id, club_id) on delete set null (player_id)
);
create index player_requests_club_idx on public.player_requests (club_id, status, due_on);
-- one open request of a kind per player
create unique index player_requests_one_open on public.player_requests (player_id, kind) where status = 'open' and player_id is not null;

-- Pay ledger: a row exists only when the club recorded that the month was paid. No amounts: the wage lives in the contract.
create table public.wage_payments (
  player_id uuid not null,
  club_id   uuid not null,
  month     date not null check (month = date_trunc('month', month)::date and month <= date_trunc('month', current_date)::date),
  paid_on   date not null check (paid_on <= current_date),
  recorded_by uuid default auth.uid() references auth.users (id) on delete set null,
  primary key (player_id, month),
  foreign key (player_id, club_id) references public.players (id, club_id) on delete cascade
);
create index wage_payments_club_idx on public.wage_payments (club_id, month);

alter table public.player_requests enable row level security;
alter table public.wage_payments enable row level security;
revoke all on public.player_requests, public.wage_payments from anon, authenticated;
grant select on public.player_requests, public.wage_payments to authenticated;
create policy "club admin reads own requests" on public.player_requests for select to authenticated
  using ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()));
create policy "club admin reads own pay ledger" on public.wage_payments for select to authenticated
  using ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()));

-- log_player_request(player, kind, received_on) -> { ok, id, due_on } | { ok:false, errors }. Raises: forbidden, not_found.
create function public.log_player_request(p_player uuid, p_kind text, p_received_on date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_club uuid := (select public.my_club()); v_ref text; v_id uuid; v_due date;
  v_days int := coalesce((select value::int from public.rules where key = 'rights_request_days'), 30);
begin
  if (select public.my_role()) is distinct from 'club_admin' or v_club is null then raise exception 'forbidden'; end if;
  select consent_ref into v_ref from public.player_consents where player_id = p_player and club_id = v_club;
  if v_ref is null then raise exception 'not_found'; end if;
  if p_kind is null or p_kind not in ('access', 'correct', 'withdraw', 'object') then
    return jsonb_build_object('ok', false, 'errors', jsonb_build_array(jsonb_build_object('field', 'kind', 'code', 'bad_kind')));
  end if;
  if p_received_on is null or p_received_on > current_date or p_received_on < current_date - 365 then
    return jsonb_build_object('ok', false, 'errors', jsonb_build_array(jsonb_build_object('field', 'received_on', 'code', 'bad_date')));
  end if;
  if exists (select 1 from public.player_requests where player_id = p_player and kind = p_kind and status = 'open') then
    return jsonb_build_object('ok', false, 'errors', jsonb_build_array(jsonb_build_object('field', 'kind', 'code', 'already_open')));
  end if;
  v_due := p_received_on + v_days;
  insert into public.player_requests (club_id, player_id, consent_ref, kind, received_on, due_on)
    values (v_club, p_player, v_ref, p_kind, p_received_on, v_due) returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'due_on', v_due);
end $$;

-- close_player_request(request): correct/object are closed by the club once handled; access only after the export;
-- withdraw only through fulfil_withdrawal. Returns { ok } | { ok:false, errors }. Raises: forbidden, not_found.
create function public.close_player_request(p_request uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_club uuid := (select public.my_club()); r public.player_requests;
begin
  if (select public.my_role()) is distinct from 'club_admin' or v_club is null then raise exception 'forbidden'; end if;
  select * into r from public.player_requests where id = p_request and club_id = v_club;
  if r.id is null then raise exception 'not_found'; end if;
  if r.status = 'done' then return jsonb_build_object('ok', false, 'errors', jsonb_build_array(jsonb_build_object('field', 'request', 'code', 'already_closed'))); end if;
  if r.kind = 'withdraw' then return jsonb_build_object('ok', false, 'errors', jsonb_build_array(jsonb_build_object('field', 'request', 'code', 'use_withdrawal'))); end if;
  if r.kind = 'access' and r.exported_at is null then return jsonb_build_object('ok', false, 'errors', jsonb_build_array(jsonb_build_object('field', 'request', 'code', 'export_first'))); end if;
  update public.player_requests set status = 'done', closed_on = current_date where id = p_request;
  return jsonb_build_object('ok', true);
end $$;

-- withdraw_consent now also closes every open request of the deleted player (nothing is left to act on).
create or replace function public.withdraw_consent(p_player uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_club uuid := (select public.my_club()); v_ref text;
begin
  if (select public.my_role()) is distinct from 'club_admin' or v_club is null then raise exception 'forbidden'; end if;
  select consent_ref into v_ref from public.player_consents where player_id = p_player and club_id = v_club;
  if v_ref is null then raise exception 'not_found'; end if;
  insert into public.consent_withdrawals (club_id, consent_ref) values (v_club, v_ref);
  update public.player_requests set status = 'done', closed_on = current_date where player_id = p_player and club_id = v_club and status = 'open';
  delete from public.players where id = p_player and club_id = v_club;
end $$;

-- fulfil_withdrawal(request): runs the deletion for an open withdraw request. Raises: forbidden, not_found, not_withdraw.
create function public.fulfil_withdrawal(p_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_club uuid := (select public.my_club()); r public.player_requests;
begin
  if (select public.my_role()) is distinct from 'club_admin' or v_club is null then raise exception 'forbidden'; end if;
  select * into r from public.player_requests where id = p_request and club_id = v_club and status = 'open';
  if r.id is null or r.player_id is null then raise exception 'not_found'; end if;
  if r.kind <> 'withdraw' then raise exception 'not_withdraw'; end if;
  perform public.withdraw_consent(r.player_id);
end $$;

-- player_data_export(player, request?) -> everything held about this one player, in one statement. Raises: forbidden, not_found.
-- When an open access request is passed it is stamped exported_at; the export content itself is never stored.
create function public.player_data_export(p_player uuid, p_request uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_club uuid := (select public.my_club()); v_out jsonb;
begin
  if (select public.my_role()) is distinct from 'club_admin' or v_club is null then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.players where id = p_player and club_id = v_club) then raise exception 'not_found'; end if;
  select jsonb_build_object(
    'exported_on', current_date,
    'player', (select jsonb_build_object('name', name, 'number', num, 'position', pos) from public.players where id = p_player),
    'consent', (select jsonb_build_object('reference', consent_ref, 'recorded_at', attested_at) from public.player_consents where player_id = p_player),
    'contract', (select coalesce(jsonb_agg(jsonb_build_object('starts_on', starts_on, 'ends_on', ends_on, 'monthly_wage_bhd', monthly_wage_bhd) order by starts_on), '[]') from public.contracts where player_id = p_player),
    'status', (select jsonb_build_object('status', status, 'updated_at', updated_at) from public.player_status where player_id = p_player),
    'attendance', (select coalesce(jsonb_agg(jsonb_build_object('day', s.day, 'kind', s.kind, 'status', m.status, 'reason', m.reason) order by s.day), '[]')
                   from public.attendance_marks m join public.attendance_sessions s on s.id = m.session_id where m.player_id = p_player),
    'assessments', (select coalesce(jsonb_agg(jsonb_build_object('on', assessed_on, 'skill', skill, 'score', score) order by assessed_on, skill), '[]') from public.skill_assessments where player_id = p_player),
    'goals', (select coalesce(jsonb_agg(jsonb_build_object('skill', skill, 'target', target, 'due_on', due_on, 'done', done_at is not null) order by due_on), '[]') from public.dev_goals where player_id = p_player),
    'training_load', (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'minutes', minutes, 'rpe', rpe) order by day), '[]') from public.training_logs where player_id = p_player),
    'lineups', (select coalesce(jsonb_agg(jsonb_build_object('match_on', l.match_on, 'opponent', l.opponent, 'role', lp.role, 'slot', lp.slot) order by l.match_on), '[]')
                from public.lineup_players lp join public.lineups l on l.id = lp.lineup_id where lp.player_id = p_player),
    'match_events', (select coalesce(jsonb_agg(jsonb_build_object('match_on', r.match_on, 'minute', e.minute, 'kind', e.kind) order by r.match_on, e.minute), '[]')
                     from public.match_events e join public.match_reports r on r.id = e.report_id where e.player_id = p_player),
    'pay_ledger', (select coalesce(jsonb_agg(jsonb_build_object('month', month, 'paid_on', paid_on) order by month), '[]') from public.wage_payments where player_id = p_player)
  ) into v_out;
  if p_request is not null then
    update public.player_requests set exported_at = now()
      where id = p_request and club_id = v_club and player_id = p_player and kind = 'access' and status = 'open';
  end if;
  return v_out;
end $$;

-- save_wage_month(month, paid) -> { ok } | { ok:false, errors }. paid: [{ player_id, paid_on }] (1-60); paid_on null = not paid.
-- Needs an active data agreement and a contract for each player; the month is within the last 12 months. Raises: forbidden, dpa_required.
create function public.save_wage_month(p_month date, p_paid jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_club uuid := (select public.my_club()); v_errors jsonb := '[]'::jsonb; r jsonb; i int := 0; v_pid uuid; v_on date; v_ids uuid[] := '{}';
begin
  if (select public.my_role()) is distinct from 'club_admin' or v_club is null then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.data_agreements where club_id = v_club and revoked_at is null) then raise exception 'dpa_required'; end if;
  if p_month is null or p_month <> date_trunc('month', p_month)::date or p_month > date_trunc('month', current_date)::date
     or p_month < (date_trunc('month', current_date) - interval '12 months')::date then
    v_errors := v_errors || jsonb_build_object('field', 'month', 'code', 'bad_month');
  end if;
  if jsonb_typeof(p_paid) is distinct from 'array' or jsonb_array_length(p_paid) not between 1 and 60 then
    v_errors := v_errors || jsonb_build_object('field', 'paid', 'code', 'bad_count');
  end if;
  if jsonb_array_length(v_errors) > 0 then return jsonb_build_object('ok', false, 'errors', v_errors); end if;
  for r in select * from jsonb_array_elements(p_paid) loop
    i := i + 1;
    begin v_pid := (r ->> 'player_id')::uuid; exception when others then v_pid := null; end;
    begin v_on := nullif(r ->> 'paid_on', '')::date; exception when others then v_on := current_date + 1; end;
    if v_pid is null or not exists (select 1 from public.contracts where player_id = v_pid and club_id = v_club) then
      v_errors := v_errors || jsonb_build_object('field', 'player', 'code', 'unknown_player', 'row', i); continue;
    end if;
    if v_pid = any (v_ids) then v_errors := v_errors || jsonb_build_object('field', 'player', 'code', 'duplicate_player', 'row', i); continue; end if;
    v_ids := v_ids || v_pid;
    if v_on is not null and (v_on > current_date or v_on < p_month - 31) then v_errors := v_errors || jsonb_build_object('field', 'paid_on', 'code', 'bad_date', 'row', i); end if;
  end loop;
  if jsonb_array_length(v_errors) > 0 then return jsonb_build_object('ok', false, 'errors', v_errors); end if;
  delete from public.wage_payments where club_id = v_club and month = p_month and player_id = any (v_ids);
  for r in select * from jsonb_array_elements(p_paid) loop
    if nullif(r ->> 'paid_on', '') is not null then
      insert into public.wage_payments (player_id, club_id, month, paid_on) values ((r ->> 'player_id')::uuid, v_club, p_month, (r ->> 'paid_on')::date);
    end if;
  end loop;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function public.log_player_request(uuid, text, date), public.close_player_request(uuid), public.fulfil_withdrawal(uuid),
  public.player_data_export(uuid, uuid), public.save_wage_month(date, jsonb) from public, anon;
grant execute on function public.log_player_request(uuid, text, date), public.close_player_request(uuid), public.fulfil_withdrawal(uuid),
  public.player_data_export(uuid, uuid), public.save_wage_month(date, jsonb) to authenticated;

-- ===== migrations/0013_audit_log.sql =====
-- Internal operations log for the club: who changed what table, when, and how many rows. It stores NO content (no names, no values),
-- so it can never leak what it records. It is written only by triggers and read by the club administrator. It is an internal trail,
-- not legal evidence: anyone with direct database access could alter it, so keep backups.

create table public.audit_log (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  club_id uuid not null, -- no foreign key on purpose: the trail outlives a deleted club's rows
  actor   uuid,          -- auth.uid(); null for the database owner (seed, migrations)
  op      text not null check (op in ('insert', 'update', 'delete', 'export')),
  entity  text not null,
  n       integer not null check (n >= 1)
);
create index audit_log_club_at_idx on public.audit_log (club_id, at desc);

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;
create policy "club admin reads own audit log" on public.audit_log for select to authenticated
  using ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()));

-- One row per statement and club (an import of 60 players is one row with n = 60). Transition tables are the only way to see the rows.
create function public.audit_stmt() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    insert into public.audit_log (club_id, actor, op, entity, n) select club_id, auth.uid(), 'delete', tg_table_name, count(*) from old_rows group by club_id;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_log (club_id, actor, op, entity, n) select club_id, auth.uid(), 'update', tg_table_name, count(*) from new_rows group by club_id;
  else
    insert into public.audit_log (club_id, actor, op, entity, n) select club_id, auth.uid(), 'insert', tg_table_name, count(*) from new_rows group by club_id;
  end if;
  return null;
end $$;

do $$ declare t text; begin
  foreach t in array array['players', 'contracts', 'player_status', 'data_agreements', 'attendance_sessions', 'lineups', 'match_reports',
                           'player_requests', 'wage_payments', 'skill_assessments', 'dev_goals', 'training_logs', 'club_finance_reports'] loop
    execute format('create trigger %I after insert on public.%I referencing new table as new_rows for each statement execute function public.audit_stmt()', t || '_audit_i', t);
    execute format('create trigger %I after update on public.%I referencing old table as old_rows new table as new_rows for each statement execute function public.audit_stmt()', t || '_audit_u', t);
    execute format('create trigger %I after delete on public.%I referencing old table as old_rows for each statement execute function public.audit_stmt()', t || '_audit_d', t);
  end loop;
end $$;

-- The export leaves no row behind in any table, so it writes its own line.
create or replace function public.player_data_export(p_player uuid, p_request uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_club uuid := (select public.my_club()); v_out jsonb;
begin
  if (select public.my_role()) is distinct from 'club_admin' or v_club is null then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.players where id = p_player and club_id = v_club) then raise exception 'not_found'; end if;
  select jsonb_build_object(
    'exported_on', current_date,
    'player', (select jsonb_build_object('name', name, 'number', num, 'position', pos) from public.players where id = p_player),
    'consent', (select jsonb_build_object('reference', consent_ref, 'recorded_at', attested_at) from public.player_consents where player_id = p_player),
    'contract', (select coalesce(jsonb_agg(jsonb_build_object('starts_on', starts_on, 'ends_on', ends_on, 'monthly_wage_bhd', monthly_wage_bhd) order by starts_on), '[]') from public.contracts where player_id = p_player),
    'status', (select jsonb_build_object('status', status, 'updated_at', updated_at) from public.player_status where player_id = p_player),
    'attendance', (select coalesce(jsonb_agg(jsonb_build_object('day', s.day, 'kind', s.kind, 'status', m.status, 'reason', m.reason) order by s.day), '[]')
                   from public.attendance_marks m join public.attendance_sessions s on s.id = m.session_id where m.player_id = p_player),
    'assessments', (select coalesce(jsonb_agg(jsonb_build_object('on', assessed_on, 'skill', skill, 'score', score) order by assessed_on, skill), '[]') from public.skill_assessments where player_id = p_player),
    'goals', (select coalesce(jsonb_agg(jsonb_build_object('skill', skill, 'target', target, 'due_on', due_on, 'done', done_at is not null) order by due_on), '[]') from public.dev_goals where player_id = p_player),
    'training_load', (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'minutes', minutes, 'rpe', rpe) order by day), '[]') from public.training_logs where player_id = p_player),
    'lineups', (select coalesce(jsonb_agg(jsonb_build_object('match_on', l.match_on, 'opponent', l.opponent, 'role', lp.role, 'slot', lp.slot) order by l.match_on), '[]')
                from public.lineup_players lp join public.lineups l on l.id = lp.lineup_id where lp.player_id = p_player),
    'match_events', (select coalesce(jsonb_agg(jsonb_build_object('match_on', r.match_on, 'minute', e.minute, 'kind', e.kind) order by r.match_on, e.minute), '[]')
                     from public.match_events e join public.match_reports r on r.id = e.report_id where e.player_id = p_player),
    'pay_ledger', (select coalesce(jsonb_agg(jsonb_build_object('month', month, 'paid_on', paid_on) order by month), '[]') from public.wage_payments where player_id = p_player)
  ) into v_out;
  if p_request is not null then
    update public.player_requests set exported_at = now()
      where id = p_request and club_id = v_club and player_id = p_player and kind = 'access' and status = 'open';
  end if;
  insert into public.audit_log (club_id, actor, op, entity, n) values (v_club, auth.uid(), 'export', 'players', 1);
  return v_out;
end $$;
revoke execute on function public.audit_stmt() from public, anon, authenticated;

-- ===== migrations/0014_admin_provision.sql =====
-- Onboarding a client: attach a signed-up account to a club with a role. Run it yourself from the Supabase SQL Editor (service role);
-- it is NOT callable from the app or the API (execute is revoked from every client role), so nobody can promote themselves.
-- A new sign-up is a fan with no club. This is the only door to club_admin, medical or bfa_admin.

create function public.admin_provision_staff(p_email text, p_role public.app_role, p_club text default null, p_league text default null) returns jsonb
language plpgsql set search_path = '' as $$
declare v_user uuid; v_club uuid;
begin
  select id into v_user from auth.users where lower(email) = lower(btrim(p_email)) limit 1;
  if v_user is null then raise exception 'user_not_found'; end if;
  if p_role in ('club_admin', 'medical') then
    if p_club is null or length(btrim(p_club)) not between 2 and 80 then raise exception 'club_required'; end if;
    if p_league is not null and not exists (select 1 from public.leagues where id = p_league) then raise exception 'unknown_league'; end if;
    insert into public.clubs (name, league_id) values (btrim(p_club), p_league) on conflict (name) do nothing;
    select id into v_club from public.clubs where name = btrim(p_club);
    if p_league is not null then update public.clubs set league_id = p_league where id = v_club; end if;
  else
    v_club := null;
  end if;
  update public.profiles set role = p_role, club_id = v_club where id = v_user;
  return jsonb_build_object('ok', true, 'user', v_user, 'role', p_role, 'club', v_club);
end $$;

revoke execute on function public.admin_provision_staff(text, public.app_role, text, text) from public, anon, authenticated;
