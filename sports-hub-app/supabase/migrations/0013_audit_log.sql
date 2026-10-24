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
