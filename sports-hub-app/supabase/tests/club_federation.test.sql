-- Attacks the club/federation wall. Runs after seed_demo.sql; ON_ERROR_STOP makes any FAIL stop the run.
\set ON_ERROR_STOP on
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as
  $$ begin if not ok then raise exception 'FAIL: %', what; end if; raise notice 'ok  %', what; end $$;
create function pg_temp.denied(sql text, what text) returns void language plpgsql as
  $$ begin execute sql; raise exception 'FAIL: %', what;
     exception when insufficient_privilege or check_violation or foreign_key_violation or unique_violation then raise notice 'ok  %', what; end $$;
create function pg_temp.rows_changed(sql text) returns bigint language plpgsql as
  $$ declare n bigint; begin execute sql; get diagnostics n = row_count; return n; end $$;

-- Two staff clubs from the seed, plus users for every role
create temp table w as select
  (select id from public.clubs where name = 'نادي تجريبي 01') as a,
  (select id from public.clubs where name = 'نادي تجريبي 02') as b;
grant select on w to anon, authenticated;
insert into auth.users (id) values
  ('c0000000-0000-0000-0000-00000000000a'), ('c0000000-0000-0000-0000-00000000000b'), -- club admins A, B
  ('c0000000-0000-0000-0000-00000000000c'),                                            -- medical A
  ('c0000000-0000-0000-0000-00000000000d'),                                            -- federation
  ('c0000000-0000-0000-0000-00000000000e'),                                            -- player A
  ('c0000000-0000-0000-0000-00000000000f');                                            -- fan
update public.profiles set role = 'club_admin', club_id = (select a from w) where id = 'c0000000-0000-0000-0000-00000000000a';
update public.profiles set role = 'club_admin', club_id = (select b from w) where id = 'c0000000-0000-0000-0000-00000000000b';
update public.profiles set role = 'medical',    club_id = (select a from w) where id = 'c0000000-0000-0000-0000-00000000000c';
update public.profiles set role = 'bfa_admin'                                 where id = 'c0000000-0000-0000-0000-00000000000d';
update public.profiles set role = 'player',     club_id = (select a from w) where id = 'c0000000-0000-0000-0000-00000000000e';

select pg_temp.check((select count(*) >= 14 from public.contracts where club_id = (select a from w)), 'seed: club 01 has a squad with contracts');
select pg_temp.check((select count(*) = 12 from public.club_finance_reports) or (select count(*) between 10 and 12 from public.club_finance_reports), 'seed: federation demo has finance reports');
select pg_temp.denied($$ insert into public.contracts (player_id, club_id, starts_on, ends_on, monthly_wage_bhd) select p.id, (select b from w), current_date, current_date + 30, 1 from public.players p where p.club_id = (select a from w) limit 1 $$, 'a contract cannot name a player from another club (composite key)');

-- Club admin A
set role authenticated; set request.jwt.claim.sub = 'c0000000-0000-0000-0000-00000000000a';
select pg_temp.check((select count(*) >= 14 from public.contracts), 'club admin reads own contracts');
select pg_temp.check((select count(*) = 0 from public.contracts where club_id = (select b from w)), 'club admin cannot read another club''s contracts');
select pg_temp.check((select count(*) = 1 from public.club_finance_reports), 'club admin sees only own finance report');
select pg_temp.check((select count(*) >= 14 from public.player_status), 'club admin reads own squad status');
select pg_temp.denied($$ update public.contracts set monthly_wage_bhd = 0 $$, 'club admin cannot edit contracts from the app');
select pg_temp.denied($$ delete from public.club_finance_reports $$, 'club admin cannot delete a submitted report');
select pg_temp.check(pg_temp.rows_changed($$ update public.club_finance_reports set wages_bhd = wages_bhd where club_id = (select b from w) $$) = 0, 'club admin cannot amend another club''s report');
select pg_temp.denied($$ insert into public.club_finance_reports (club_id, season, revenue_bhd, wages_bhd) values ((select b from w), '2099', 1, 1) $$, 'club admin cannot submit for another club');
select pg_temp.denied($$ update public.club_finance_reports set submitted_by = null $$, 'club admin cannot rewrite who submitted');
update public.club_finance_reports set wages_bhd = wages_bhd + 1000 where club_id = (select a from w);
select pg_temp.check((select count(*) = 1 from public.club_finance_reports where submitted_at > now() - interval '1 minute'), 'amending refreshes submitted_at');

-- Medical staff A: availability yes, pay no
set request.jwt.claim.sub = 'c0000000-0000-0000-0000-00000000000c';
select pg_temp.check((select count(*) = 0 from public.contracts), 'medical staff cannot read pay');
select pg_temp.check((select count(*) = 0 from public.club_finance_reports), 'medical staff cannot read club finance');
select pg_temp.check((select count(*) >= 14 from public.player_status), 'medical staff read own squad status');
select pg_temp.check(pg_temp.rows_changed($$ update public.player_status set status = 'doubtful', note = 'تقييم' where club_id = (select a from w) and status = 'fit' $$) > 0, 'medical staff update own squad status');
select pg_temp.check(pg_temp.rows_changed($$ update public.player_status set status = 'fit' where club_id = (select b from w) $$) = 0, 'medical staff cannot touch another club');
select pg_temp.denied($$ update public.player_status set club_id = (select b from w) $$, 'status rows cannot be moved to another club');

-- Club admin B sees nothing of A
set request.jwt.claim.sub = 'c0000000-0000-0000-0000-00000000000b';
select pg_temp.check((select count(*) = 0 from public.contracts where club_id = (select a from w)), 'club B cannot read club A contracts');
select pg_temp.check((select count(*) = 0 from public.player_status where club_id = (select a from w)), 'club B cannot read club A status');

-- Federation: finance reports yes, pay and health no, and no writes
set request.jwt.claim.sub = 'c0000000-0000-0000-0000-00000000000d';
select pg_temp.check((select count(*) between 10 and 12 from public.club_finance_reports), 'federation reads every submitted finance report');
select pg_temp.check((select count(*) = 0 from public.contracts), 'federation never sees player pay');
select pg_temp.check((select count(*) = 0 from public.player_status), 'federation never sees player health');
select pg_temp.check(pg_temp.rows_changed($$ update public.club_finance_reports set wages_bhd = 0 $$) = 0, 'federation cannot edit a club''s report (0 rows change)');
select pg_temp.denied($$ insert into public.club_finance_reports (club_id, season, revenue_bhd, wages_bhd) values ((select a from w), '2098', 1, 1) $$, 'federation cannot file a report for a club');
select pg_temp.check((select count(*) = 1 from public.rules where key = 'ffp_wage_ratio_limit'), 'federation reads the limit rule');
select pg_temp.denied($$ update public.rules set value = 9 $$, 'nobody edits the rule from the app');

-- Player and fan: nothing
set request.jwt.claim.sub = 'c0000000-0000-0000-0000-00000000000e';
select pg_temp.check((select count(*) = 0 from public.contracts) and (select count(*) = 0 from public.club_finance_reports) and (select count(*) = 0 from public.player_status), 'a player sees no pay, finance or squad status');
set request.jwt.claim.sub = 'c0000000-0000-0000-0000-00000000000f';
select pg_temp.check((select count(*) = 0 from public.contracts) and (select count(*) = 0 from public.club_finance_reports) and (select count(*) = 0 from public.player_status), 'a fan sees no pay, finance or squad status');
reset role;

-- Anonymous visitors: not even the rule
set role anon;
select pg_temp.denied($$ select * from public.contracts $$, 'anon cannot query contracts');
select pg_temp.denied($$ select * from public.club_finance_reports $$, 'anon cannot query finance reports');
select pg_temp.denied($$ select * from public.rules $$, 'anon cannot query rules');
reset role;
