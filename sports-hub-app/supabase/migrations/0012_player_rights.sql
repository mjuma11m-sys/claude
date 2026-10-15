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
