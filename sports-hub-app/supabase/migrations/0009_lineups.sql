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
