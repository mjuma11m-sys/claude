-- Attacks player rights: the request log, the data export, the withdrawal path and the pay ledger. Runs after seed_demo.sql.
\set ON_ERROR_STOP on
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as
  $$ begin if ok is distinct from true then raise exception 'FAIL: %', what; end if; raise notice 'ok  %', what; end $$;
create function pg_temp.denied(sql text, what text) returns void language plpgsql as
  $$ begin execute sql; raise exception 'FAIL: %', what;
     exception when insufficient_privilege or check_violation or foreign_key_violation or unique_violation then raise notice 'ok  %', what; end $$;
create function pg_temp.raises(sql text, msg text, what text) returns void language plpgsql as
  $$ begin execute sql; raise exception 'FAIL: % (nothing raised)', what;
     exception when raise_exception then if sqlerrm = msg then raise notice 'ok  %', what; else raise exception 'FAIL: % (got %)', what, sqlerrm; end if; end $$;
create function pg_temp.rows_changed(sql text) returns bigint language plpgsql as
  $$ declare n bigint; begin execute sql; get diagnostics n = row_count; return n; end $$;

create temp table w as select (select id from public.clubs where name = 'نادي تجريبي 01') as a, (select id from public.clubs where name = 'نادي تجريبي 02') as b;
insert into public.players (club_id, name, num, pos) values ((select b from w), 'لاعب ب', 7, 'جناح');
create temp table pl as select
  (select id from public.players where club_id = (select a from w) order by num limit 1 offset 2) as p1,
  (select id from public.players where club_id = (select a from w) order by num limit 1 offset 3) as p2,
  (select id from public.players where club_id = (select a from w) order by num limit 1 offset 4) as p3,
  (select id from public.players where club_id = (select b from w) order by num limit 1) as other;
grant select on w, pl to anon, authenticated;
insert into auth.users (id) values ('d4000000-0000-0000-0000-00000000000a'), ('d4000000-0000-0000-0000-00000000000b'), ('d4000000-0000-0000-0000-00000000000c'),
  ('d4000000-0000-0000-0000-00000000000d'), ('d4000000-0000-0000-0000-00000000000f');
update public.profiles set role = 'club_admin', club_id = (select a from w) where id = 'd4000000-0000-0000-0000-00000000000a';
update public.profiles set role = 'club_admin', club_id = (select b from w) where id = 'd4000000-0000-0000-0000-00000000000b';
update public.profiles set role = 'medical',    club_id = (select a from w) where id = 'd4000000-0000-0000-0000-00000000000c';
update public.profiles set role = 'bfa_admin' where id = 'd4000000-0000-0000-0000-00000000000d';
-- club A holds an agreement and a consent per player; club B holds neither
insert into public.data_agreements (club_id, version, signatory_name, signatory_title, reference, signed_on) values ((select a from w), 'v1', 'اسم تجريبي', 'مدير', 'REF-A-1', current_date - 10);
insert into public.player_consents (player_id, club_id, consent_ref) select id, club_id, 'C-' || num from public.players where club_id = (select a from w);
insert into public.player_consents (player_id, club_id, consent_ref) values ((select other from pl), (select b from w), 'C-B');

create function pg_temp.log(p uuid, k text, d date) returns jsonb language sql as $$ select public.log_player_request(p, k, d) $$;
create function pg_temp.wage(m date, j jsonb) returns jsonb language sql as $$ select public.save_wage_month(m, j) $$;
create function pg_temp.code(j jsonb) returns text language sql as $$ select j #>> '{errors,0,code}' $$;
grant execute on function pg_temp.log(uuid, text, date), pg_temp.wage(date, jsonb), pg_temp.code(jsonb) to authenticated, anon;

set role authenticated; set request.jwt.claim.sub = 'd4000000-0000-0000-0000-00000000000a';
select pg_temp.check(pg_temp.log((select p1 from pl), 'access', current_date - 2) ->> 'ok' = 'true', 'a request is logged');
select pg_temp.check((select due_on = received_on + 30 and status = 'open' and consent_ref like 'C-%' from public.player_requests where kind = 'access'), 'it gets the internal deadline from rules and keeps the consent reference');
select pg_temp.check(pg_temp.code(pg_temp.log((select p1 from pl), 'access', current_date)) = 'already_open', 'a second open request of the same kind is refused');
select pg_temp.check(pg_temp.code(pg_temp.log((select p1 from pl), 'sue', current_date)) = 'bad_kind', 'an unknown kind is refused');
select pg_temp.check(pg_temp.code(pg_temp.log((select p1 from pl), 'correct', current_date + 1)) = 'bad_date', 'a future received date is refused');
select pg_temp.check(pg_temp.code(pg_temp.log((select p1 from pl), 'correct', current_date - 400)) = 'bad_date', 'a received date older than a year is refused');
select pg_temp.raises($$ select pg_temp.log((select other from pl), 'access', current_date) $$, 'not_found', 'a request for another club''s player is refused');
select pg_temp.raises($$ select pg_temp.log(gen_random_uuid(), 'access', current_date) $$, 'not_found', 'a request for an unknown player is refused');
select pg_temp.denied($$ insert into public.player_requests (club_id, consent_ref, kind, received_on, due_on) values ((select a from w), 'x', 'access', current_date, current_date) $$, 'requests cannot be inserted directly');
select pg_temp.denied($$ update public.player_requests set due_on = current_date + 900, status = 'done', closed_on = current_date $$, 'requests cannot be edited directly');
select pg_temp.denied($$ delete from public.player_requests $$, 'requests cannot be deleted directly');

-- access: closing needs the export first
select pg_temp.check(pg_temp.code(public.close_player_request((select id from public.player_requests where kind = 'access'))) = 'export_first', 'an access request cannot be closed before the export');
select pg_temp.check(public.player_data_export((select p1 from pl), (select id from public.player_requests where kind = 'access')) ? 'attendance', 'the export runs');
select pg_temp.check((select exported_at is not null from public.player_requests where kind = 'access'), 'the export stamps the request');
select pg_temp.check(public.close_player_request((select id from public.player_requests where kind = 'access')) ->> 'ok' = 'true', 'now it closes');
select pg_temp.check(pg_temp.code(public.close_player_request((select id from public.player_requests where kind = 'access'))) = 'already_closed', 'a closed request cannot be closed again');
select pg_temp.check(pg_temp.log((select p1 from pl), 'access', current_date) ->> 'ok' = 'true', 'a new access request can follow a closed one');
select pg_temp.raises($$ select public.player_data_export((select other from pl)) $$, 'not_found', 'the export refuses another club''s player');
select pg_temp.check((select public.player_data_export((select p1 from pl)) -> 'player' ->> 'name' = (select name from public.players where id = (select p1 from pl))), 'the export holds the player''s own record');
select pg_temp.check((select jsonb_typeof(public.player_data_export((select p1 from pl)) -> 'contract') = 'array' and jsonb_array_length(public.player_data_export((select p1 from pl)) -> 'contract') >= 1), 'the export includes the contract');
select pg_temp.check((select public.player_data_export((select p1 from pl)) ->> 'exported_on') = current_date::text, 'the export is dated');

-- correct / object are closed by the club; withdraw only through the withdrawal
select pg_temp.check(pg_temp.log((select p2 from pl), 'correct', current_date - 1) ->> 'ok' = 'true', 'a correction request is logged');
select pg_temp.check(public.close_player_request((select id from public.player_requests where kind = 'correct')) ->> 'ok' = 'true', 'a correction request closes once handled');
select pg_temp.check(pg_temp.log((select p2 from pl), 'withdraw', current_date) ->> 'ok' = 'true', 'a withdrawal request is logged');
select pg_temp.check(pg_temp.code(public.close_player_request((select id from public.player_requests where kind = 'withdraw'))) = 'use_withdrawal', 'a withdrawal request cannot be closed without deleting');
select pg_temp.raises($$ select public.fulfil_withdrawal((select id from public.player_requests where kind = 'correct')) $$, 'not_found', 'fulfil refuses a closed request');

-- pay ledger
select pg_temp.check(pg_temp.wage(date_trunc('month', current_date)::date, jsonb_build_array(jsonb_build_object('player_id', (select p1 from pl), 'paid_on', current_date::text), jsonb_build_object('player_id', (select p3 from pl), 'paid_on', null))) ->> 'ok' = 'true', 'a pay month saves');
select pg_temp.check((select count(*) = 1 from public.wage_payments), 'only paid players get a row');
select pg_temp.check(pg_temp.wage(date_trunc('month', current_date)::date, jsonb_build_array(jsonb_build_object('player_id', (select p1 from pl), 'paid_on', null))) ->> 'ok' = 'true', 'marking a player unpaid again succeeds');
select pg_temp.check((select count(*) = 0 from public.wage_payments), 'it removes the row');
select pg_temp.check(pg_temp.code(pg_temp.wage(date_trunc('month', current_date)::date + 1, jsonb_build_array(jsonb_build_object('player_id', (select p1 from pl), 'paid_on', null)))) = 'bad_month', 'a month that is not the first day is refused');
select pg_temp.check(pg_temp.code(pg_temp.wage((date_trunc('month', current_date) + interval '1 month')::date, jsonb_build_array(jsonb_build_object('player_id', (select p1 from pl), 'paid_on', null)))) = 'bad_month', 'a future month is refused');
select pg_temp.check(pg_temp.code(pg_temp.wage((date_trunc('month', current_date) - interval '14 months')::date, jsonb_build_array(jsonb_build_object('player_id', (select p1 from pl), 'paid_on', null)))) = 'bad_month', 'a month older than 12 months is refused');
select pg_temp.check(pg_temp.code(pg_temp.wage(date_trunc('month', current_date)::date, '[]')) = 'bad_count', 'an empty ledger is refused');
select pg_temp.check(pg_temp.code(pg_temp.wage(date_trunc('month', current_date)::date, jsonb_build_array(jsonb_build_object('player_id', (select p1 from pl), 'paid_on', (current_date + 1)::text)))) = 'bad_date', 'a future payment date is refused');
select pg_temp.check(pg_temp.code(pg_temp.wage(date_trunc('month', current_date)::date, jsonb_build_array(jsonb_build_object('player_id', (select other from pl), 'paid_on', null)))) = 'unknown_player', 'another club''s player is refused');
select pg_temp.check(pg_temp.code(pg_temp.wage(date_trunc('month', current_date)::date, jsonb_build_array(jsonb_build_object('player_id', (select p1 from pl), 'paid_on', null), jsonb_build_object('player_id', (select p1 from pl), 'paid_on', null)))) = 'duplicate_player', 'the same player twice is refused');
select pg_temp.denied($$ insert into public.wage_payments (player_id, club_id, month, paid_on) values ((select p1 from pl), (select a from w), date_trunc('month', current_date)::date, current_date) $$, 'the ledger cannot be written directly');
select pg_temp.check(pg_temp.wage(date_trunc('month', current_date)::date, jsonb_build_array(jsonb_build_object('player_id', (select p1 from pl), 'paid_on', current_date::text))) ->> 'ok' = 'true', 'a payment for the withdrawal test');

-- everyone else
reset role;
create temp table req as select (select id from public.player_requests where kind = 'access' and status = 'open') as acc, (select id from public.player_requests where kind = 'withdraw' and status = 'open') as wd;
grant select on req to authenticated;
set role authenticated; set request.jwt.claim.sub = 'd4000000-0000-0000-0000-00000000000c';
select pg_temp.check((select count(*) = 0 from public.player_requests) and (select count(*) = 0 from public.wage_payments), 'medical staff see no requests and no pay');
select pg_temp.raises($$ select pg_temp.log((select p1 from pl), 'access', current_date) $$, 'forbidden', 'medical staff cannot log a request');
select pg_temp.raises($$ select public.player_data_export((select p1 from pl)) $$, 'forbidden', 'medical staff cannot export a player');
select pg_temp.raises($$ select pg_temp.wage(date_trunc('month', current_date)::date, jsonb_build_array(jsonb_build_object('player_id', (select p1 from pl), 'paid_on', null))) $$, 'forbidden', 'medical staff cannot record pay');
set request.jwt.claim.sub = 'd4000000-0000-0000-0000-00000000000d';
select pg_temp.check((select count(*) = 0 from public.player_requests) and (select count(*) = 0 from public.wage_payments), 'the federation sees no requests and no pay');
select pg_temp.raises($$ select public.player_data_export((select p1 from pl)) $$, 'forbidden', 'the federation cannot export a player');
set request.jwt.claim.sub = 'd4000000-0000-0000-0000-00000000000f';
select pg_temp.raises($$ select pg_temp.log((select p1 from pl), 'access', current_date) $$, 'forbidden', 'a fan cannot log a request');
set request.jwt.claim.sub = 'd4000000-0000-0000-0000-00000000000b';
select pg_temp.check((select count(*) = 0 from public.player_requests) and (select count(*) = 0 from public.wage_payments), 'club B reads none of club A rights data');
select pg_temp.raises($$ select public.player_data_export((select p1 from pl)) $$, 'not_found', 'club B cannot export a club A player');
select pg_temp.raises($$ select public.close_player_request((select acc from req)) $$, 'not_found', 'club B cannot close a club A request');
select pg_temp.raises($$ select public.fulfil_withdrawal((select wd from req)) $$, 'not_found', 'club B cannot fulfil a club A withdrawal');
select pg_temp.raises($$ select pg_temp.wage(date_trunc('month', current_date)::date, jsonb_build_array(jsonb_build_object('player_id', (select other from pl), 'paid_on', null))) $$, 'dpa_required', 'a club without an active agreement cannot record pay');
reset role;
set role anon;
select pg_temp.denied($$ select * from public.player_requests $$, 'anon cannot read requests');
select pg_temp.denied($$ select * from public.wage_payments $$, 'anon cannot read the pay ledger');
select pg_temp.denied($$ select public.player_data_export((select p1 from pl)) $$, 'anon cannot export a player');
reset role;

-- withdrawal removes the person, keeps the trace
set role authenticated; set request.jwt.claim.sub = 'd4000000-0000-0000-0000-00000000000a';
select pg_temp.check(pg_temp.wage(date_trunc('month', current_date)::date, jsonb_build_array(jsonb_build_object('player_id', (select p2 from pl), 'paid_on', current_date::text))) ->> 'ok' = 'true', 'pay recorded for the player about to leave');
select pg_temp.check(pg_temp.log((select p2 from pl), 'object', current_date) ->> 'ok' = 'true', 'an open objection exists for the same player');
reset role;
create temp table wd0 as select count(*) as n from public.consent_withdrawals;
grant select on wd0 to authenticated;
set role authenticated; set request.jwt.claim.sub = 'd4000000-0000-0000-0000-00000000000a';
select public.fulfil_withdrawal((select id from public.player_requests where kind = 'withdraw'));
reset role;
select pg_temp.check((select count(*) = 0 from public.players where id = (select p2 from pl)), 'fulfilling the withdrawal deletes the player');
select pg_temp.check((select count(*) = 1 from public.player_requests where kind = 'withdraw' and status = 'done' and player_id is null and consent_ref like 'C-%'), 'the request stays, done, with the consent reference and no player');
select pg_temp.check((select count(*) = 0 from public.player_requests where status = 'open' and player_id is null), 'no open request is left pointing at a deleted player');
select pg_temp.check((select status = 'done' from public.player_requests where kind = 'object'), 'the open objection of that player was closed too');
select pg_temp.check((select count(*) = 0 from public.wage_payments where player_id = (select p2 from pl)), 'the pay ledger rows went with the player');
select pg_temp.check((select count(*) = (select n + 1 from wd0) from public.consent_withdrawals), 'the count-only withdrawal log has a line');
set role authenticated; set request.jwt.claim.sub = 'd4000000-0000-0000-0000-00000000000a';
select pg_temp.raises($$ select public.fulfil_withdrawal((select id from public.player_requests where kind = 'withdraw')) $$, 'not_found', 'a done request cannot be fulfilled again');
select pg_temp.check(pg_temp.log((select p3 from pl), 'correct', current_date) ->> 'ok' = 'true', 'a request for another player');
select pg_temp.raises($$ select public.fulfil_withdrawal((select id from public.player_requests where kind = 'correct' and status = 'open')) $$, 'not_withdraw', 'fulfil refuses a request that is not a withdrawal');
reset role;
