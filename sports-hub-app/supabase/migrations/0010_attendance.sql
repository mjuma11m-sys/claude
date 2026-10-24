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
