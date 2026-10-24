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
