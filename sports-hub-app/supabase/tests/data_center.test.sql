-- Attacks the data center: no real club data without an agreement and consent references. Runs after seed_demo.sql.
\set ON_ERROR_STOP on
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as
  $$ begin if not ok then raise exception 'FAIL: %', what; end if; raise notice 'ok  %', what; end $$;
create function pg_temp.denied(sql text, what text) returns void language plpgsql as
  $$ begin execute sql; raise exception 'FAIL: %', what;
     exception when insufficient_privilege or check_violation or foreign_key_violation or unique_violation then raise notice 'ok  %', what; end $$;
create function pg_temp.raises(sql text, msg text, what text) returns void language plpgsql as
  $$ begin execute sql; raise exception 'FAIL: % (nothing raised)', what;
     exception when raise_exception then
       if sqlerrm = msg then raise notice 'ok  %', what; else raise exception 'FAIL: % (got %)', what, sqlerrm; end if; end $$;
create function pg_temp.rows_changed(sql text) returns bigint language plpgsql as
  $$ declare n bigint; begin execute sql; get diagnostics n = row_count; return n; end $$;
create function pg_temp.import(rows jsonb) returns jsonb language sql as $$ select public.import_squad(rows) $$;
grant execute on function pg_temp.import(jsonb) to authenticated, anon;

create temp table w as select
  (select id from public.clubs where name = 'نادي تجريبي 03') as x,
  (select id from public.clubs where name = 'نادي تجريبي 04') as y;
grant select on w to anon, authenticated;
insert into auth.users (id) values
  ('e0000000-0000-0000-0000-00000000000a'), ('e0000000-0000-0000-0000-00000000000b'),
  ('e0000000-0000-0000-0000-00000000000d'), ('e0000000-0000-0000-0000-00000000000f');
update public.profiles set role = 'club_admin', club_id = (select x from w) where id = 'e0000000-0000-0000-0000-00000000000a';
update public.profiles set role = 'club_admin', club_id = (select y from w) where id = 'e0000000-0000-0000-0000-00000000000b';
update public.profiles set role = 'bfa_admin' where id = 'e0000000-0000-0000-0000-00000000000d';

create temp table good as select jsonb_build_array(
  jsonb_build_object('num', 1, 'name', 'حارس تجريبي', 'pos', 'حارس مرمى', 'status', 'fit', 'ends_on', (current_date + 400)::text, 'monthly_wage_bhd', 1200, 'consent_ref', 'FORM-001'),
  jsonb_build_object('num', 9, 'name', 'مهاجم تجريبي', 'pos', 'مهاجم', 'status', 'injured', 'ends_on', (current_date + 90)::text, 'monthly_wage_bhd', 2500.5, 'consent_ref', 'FORM-002')
) as rows;
grant select on good to authenticated;

-- Club admin X, no agreement yet
set role authenticated; set request.jwt.claim.sub = 'e0000000-0000-0000-0000-00000000000a';
select pg_temp.raises($$ select pg_temp.import((select rows from good)) $$, 'dpa_required', 'import is refused until the data agreement is on record');
select pg_temp.check((select count(*) = 0 from public.players where club_id = (select x from w)), 'a refused import writes nothing');
select pg_temp.denied($$ insert into public.data_agreements (club_id, version, signatory_name, signatory_title, reference, signed_on) values ((select y from w), 'v1', 'فلان', 'المدير', 'DPA-1', current_date) $$, 'a club admin cannot record an agreement for another club');
select pg_temp.denied($$ insert into public.data_agreements (club_id, version, signatory_name, signatory_title, reference, signed_on) values ((select x from w), 'v1', 'فلان', 'المدير', 'DPA-1', current_date + 5) $$, 'an agreement cannot be dated in the future');
insert into public.data_agreements (club_id, version, signatory_name, signatory_title, reference, signed_on) values ((select x from w), 'dpa-draft-1', 'فلان الفلاني', 'المدير التنفيذي', 'DPA-2026-003', current_date);
select pg_temp.check((select count(*) = 1 from public.data_agreements), 'the club sees its own agreement');
select pg_temp.denied($$ insert into public.data_agreements (club_id, version, signatory_name, signatory_title, reference, signed_on) values ((select x from w), 'v2', 'فلان الفلاني', 'المدير', 'DPA-2', current_date) $$, 'only one active agreement per club');
select pg_temp.denied($$ insert into public.players (club_id, name, num, pos) values ((select x from w), 'لاعب مباشر', 5, 'وسط') $$, 'players cannot be written directly: only through import_squad');
select pg_temp.denied($$ insert into public.contracts (player_id, club_id, starts_on, ends_on, monthly_wage_bhd) select gen_random_uuid(), (select x from w), current_date, current_date + 9, 1 $$, 'contracts cannot be written directly');
select pg_temp.denied($$ insert into public.player_consents (player_id, club_id, consent_ref) select gen_random_uuid(), (select x from w), 'X-1' $$, 'consents cannot be written directly: only through import_squad');

-- Rejections come back as a list and write nothing
select pg_temp.check((pg_temp.import((select rows from good))) ->> 'ok' = 'true', 'a clean import succeeds with an agreement on record');
select pg_temp.check((select count(*) = 2 from public.players where club_id = (select x from w)), 'two players written');
select pg_temp.check((select count(*) = 2 from public.contracts where club_id = (select x from w) and not is_demo), 'contracts are real (is_demo false)');
select pg_temp.check((select count(*) = 2 from public.player_status where club_id = (select x from w) and not is_demo), 'statuses are real');
select pg_temp.check((select count(*) = 2 from public.player_consents where club_id = (select x from w)), 'a consent reference is stored per player');
create function pg_temp.bad(patch jsonb) returns jsonb language sql as
  $$ select pg_temp.import(jsonb_build_array((select rows -> 0 from good) || patch)) $$;
grant execute on function pg_temp.bad(jsonb) to authenticated;
select pg_temp.check(pg_temp.bad('{"consent_ref": ""}') #>> '{errors,0,code}' = 'consent_required', 'a row without a consent reference is rejected');
select pg_temp.check(pg_temp.bad('{"status": "فيه كسر"}') #>> '{errors,0,code}' = 'bad_status', 'free-text health status is rejected');
select pg_temp.check(pg_temp.bad('{"monthly_wage_bhd": 999999}') #>> '{errors,0,code}' = 'bad_wage', 'an absurd wage is rejected');
select pg_temp.check(pg_temp.bad('{"monthly_wage_bhd": "abc"}') #>> '{errors,0,code}' = 'bad_wage', 'a non-numeric wage is rejected without crashing');
select pg_temp.check(pg_temp.bad('{"ends_on": "not-a-date"}') #>> '{errors,0,code}' = 'bad_date', 'a bad date is rejected without crashing');
select pg_temp.check(pg_temp.bad('{"starts_on": "2030-01-01", "ends_on": "2029-01-01"}') #>> '{errors,0,code}' = 'ends_before_start', 'a contract that ends before it starts is rejected');
select pg_temp.check(pg_temp.bad('{"name": "=HYPERLINK(\"http://x\")"}') #>> '{errors,0,code}' = 'formula_prefix', 'a spreadsheet-formula name is rejected');
select pg_temp.check(pg_temp.bad('{"num": 100}') #>> '{errors,0,code}' = 'bad_number', 'a shirt number above 99 is rejected');
select pg_temp.check(pg_temp.import((select jsonb_build_array(rows -> 0, rows -> 0) from good)) #>> '{errors,0,code}' = 'duplicate_number', 'a duplicated shirt number is rejected');
select pg_temp.check(pg_temp.import('[]') #>> '{errors,0,code}' = 'bad_row_count', 'an empty import is rejected');
select pg_temp.check(pg_temp.import((select jsonb_agg((select rows -> 0 from good) || jsonb_build_object('num', 1)) from generate_series(1, 61))) #>> '{errors,0,code}' = 'bad_row_count', 'more than 60 rows is rejected');
select pg_temp.check(pg_temp.import('{"a":1}') #>> '{errors,0,code}' = 'not_a_list', 'a non-list payload is rejected');
select pg_temp.check((select count(*) = 2 from public.players where club_id = (select x from w)), 'every rejected import left the squad untouched');
select pg_temp.check((select count(*) >= 3 from jsonb_array_elements(pg_temp.import(jsonb_build_array((select rows -> 0 from good) || '{"consent_ref": "", "status": "x", "monthly_wage_bhd": -1}')) -> 'errors')), 'one pass reports every problem in a row');

-- Re-import replaces the squad
select pg_temp.check((pg_temp.import(jsonb_build_array((select rows -> 0 from good) || '{"name": "حارس جديد"}')) ->> 'ok') = 'true', 're-import succeeds');
select pg_temp.check((select count(*) = 1 from public.players where club_id = (select x from w)) and (select count(*) = 1 from public.player_consents where club_id = (select x from w)), 're-import replaces the squad, contracts and consents');

-- Club admin Y: another club, no agreement, sees nothing of X
set request.jwt.claim.sub = 'e0000000-0000-0000-0000-00000000000b';
select pg_temp.raises($$ select pg_temp.import((select rows from good)) $$, 'dpa_required', 'club Y has no agreement: refused even though club X has one');
select pg_temp.check((select count(*) = 0 from public.data_agreements) and (select count(*) = 0 from public.player_consents), 'club Y cannot read club X agreements or consents');
select pg_temp.check(pg_temp.rows_changed($$ update public.data_agreements set revoked_at = now() where club_id = (select x from w) $$) = 0, 'club Y cannot revoke club X agreement (0 rows change)');

-- Federation, player-less fan and anon
set request.jwt.claim.sub = 'e0000000-0000-0000-0000-00000000000d';
select pg_temp.raises($$ select pg_temp.import((select rows from good)) $$, 'forbidden', 'the federation cannot import a squad');
select pg_temp.check((select count(*) = 0 from public.data_agreements) and (select count(*) = 0 from public.player_consents) and (select count(*) = 0 from public.consent_withdrawals), 'the federation never sees agreements, consents or withdrawals');
set request.jwt.claim.sub = 'e0000000-0000-0000-0000-00000000000f';
select pg_temp.raises($$ select pg_temp.import((select rows from good)) $$, 'forbidden', 'a fan cannot import a squad');
reset role;
set role anon;
select pg_temp.denied($$ select public.import_squad('[]') $$, 'anon cannot run import_squad');
select pg_temp.denied($$ select public.withdraw_consent(gen_random_uuid()) $$, 'anon cannot run withdraw_consent');
reset role;

-- Withdrawal deletes the data and leaves only a log line
set role authenticated; set request.jwt.claim.sub = 'e0000000-0000-0000-0000-00000000000a';
select pg_temp.raises($$ select public.withdraw_consent(gen_random_uuid()) $$, 'not_found', 'withdrawing an unknown player fails');
select public.withdraw_consent((select id from public.players where club_id = (select x from w) limit 1));
select pg_temp.check((select count(*) = 0 from public.players where club_id = (select x from w)) and (select count(*) = 0 from public.contracts where club_id = (select x from w)) and (select count(*) = 0 from public.player_status where club_id = (select x from w)), 'withdrawing consent deletes the player, pay and status');
select pg_temp.check((select count(*) = 1 from public.consent_withdrawals), 'a count-only withdrawal log line remains');

-- Revoking the agreement is final and stops imports
update public.data_agreements set revoked_at = now() where club_id = (select x from w);
select pg_temp.raises($$ select pg_temp.import((select rows from good)) $$, 'dpa_required', 'a revoked agreement stops imports');
select pg_temp.raises($$ update public.data_agreements set revoked_at = null $$, 'agreement_already_revoked', 'a revoked agreement cannot be revived');
reset role;
