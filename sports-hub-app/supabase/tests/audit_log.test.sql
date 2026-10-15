-- Attacks the internal operations log. Runs after seed_demo.sql and the other tests.
\set ON_ERROR_STOP on
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as
  $$ begin if ok is distinct from true then raise exception 'FAIL: %', what; end if; raise notice 'ok  %', what; end $$;
create function pg_temp.denied(sql text, what text) returns void language plpgsql as
  $$ begin execute sql; raise exception 'FAIL: %', what;
     exception when insufficient_privilege or check_violation or foreign_key_violation or unique_violation then raise notice 'ok  %', what; end $$;
create function pg_temp.raises(sql text, msg text, what text) returns void language plpgsql as
  $$ begin execute sql; raise exception 'FAIL: % (nothing raised)', what;
     exception when raise_exception then if sqlerrm = msg then raise notice 'ok  %', what; else raise exception 'FAIL: % (got %)', what, sqlerrm; end if; end $$;

create temp table w as select (select id from public.clubs where name = 'نادي تجريبي 01') as a, (select id from public.clubs where name = 'نادي تجريبي 02') as b;
grant select on w to anon, authenticated;
insert into auth.users (id) values ('e5000000-0000-0000-0000-00000000000a'), ('e5000000-0000-0000-0000-00000000000b'), ('e5000000-0000-0000-0000-00000000000c'), ('e5000000-0000-0000-0000-00000000000d');
update public.profiles set role = 'club_admin', club_id = (select a from w) where id = 'e5000000-0000-0000-0000-00000000000a';
update public.profiles set role = 'club_admin', club_id = (select b from w) where id = 'e5000000-0000-0000-0000-00000000000b';
update public.profiles set role = 'medical',    club_id = (select a from w) where id = 'e5000000-0000-0000-0000-00000000000c';
update public.profiles set role = 'bfa_admin' where id = 'e5000000-0000-0000-0000-00000000000d';

select pg_temp.check((select array_agg(column_name::text order by ordinal_position) = array['id', 'at', 'club_id', 'actor', 'op', 'entity', 'n'] from information_schema.columns where table_schema = 'public' and table_name = 'audit_log'),
  'the log has no column that could hold a name or a value');
select pg_temp.check((select count(*) = 13 * 3 from pg_trigger where tgname like '%\_audit\__' and not tgisinternal), 'every audited table has an insert, update and delete trigger');

-- a statement that touches many rows is one line with the count
create temp table before as select count(*) as n from public.audit_log;
grant select on before to authenticated;
insert into public.players (club_id, name, num, pos) select (select a from w), 'لاعب اختبار ' || g, 60 + g, 'وسط' from generate_series(1, 5) g;
select pg_temp.check((select count(*) = (select n + 1 from before) from public.audit_log), 'inserting five players adds one line');
select pg_temp.check((select op = 'insert' and entity = 'players' and n = 5 and club_id = (select a from w) from public.audit_log order by id desc limit 1), 'the line says insert, players, 5, and the club');
update public.players set pos = 'جناح' where name like 'لاعب اختبار %' and num < 63;
select pg_temp.check((select op = 'update' and entity = 'players' and n = 2 from public.audit_log order by id desc limit 1), 'updating two players is one line with n = 2');
update public.players set pos = 'جناح' where false;
select pg_temp.check((select op = 'update' and n = 2 from public.audit_log order by id desc limit 1), 'a statement that changes no row writes no line');
delete from public.players where name like 'لاعب اختبار %';
select pg_temp.check((select op = 'delete' and entity = 'players' and n = 5 from public.audit_log order by id desc limit 1), 'deleting five players is one line with n = 5');

-- as club A
set role authenticated; set request.jwt.claim.sub = 'e5000000-0000-0000-0000-00000000000a';
select pg_temp.check((select count(*) > 0 from public.audit_log) and (select count(*) = 0 from public.audit_log where club_id <> (select a from w)), 'club A reads its own lines and no other club''s');
select pg_temp.check((select count(*) > 0 from public.audit_log where actor is null), 'lines written by the database owner have no actor');
select pg_temp.denied($$ insert into public.audit_log (club_id, op, entity, n) values ((select a from w), 'insert', 'players', 1) $$, 'club A cannot write a line');
select pg_temp.denied($$ update public.audit_log set n = 99 $$, 'club A cannot edit a line');
select pg_temp.denied($$ delete from public.audit_log $$, 'club A cannot delete a line');
select pg_temp.denied($$ select public.audit_stmt() $$, 'the trigger function is not callable by clients');
-- the actor is the signed-in user when a client writes through an RPC
select pg_temp.check((public.save_attendance(current_date - 7, 'training', (select jsonb_agg(jsonb_build_object('player_id', id, 'status', 'present')) from public.players where club_id = (select a from w) limit 1))) ->> 'ok' = 'true', 'an RPC write works with the trigger in place');
select pg_temp.check((select actor = 'e5000000-0000-0000-0000-00000000000a'::uuid and entity = 'attendance_sessions' and op = 'insert' from public.audit_log order by id desc limit 1), 'the line carries the signed-in user and the table');
select pg_temp.check((public.player_data_export((select id from public.players where club_id = (select a from w) limit 1))) ? 'player', 'an export works');
select pg_temp.check((select op = 'export' and entity = 'players' and actor = 'e5000000-0000-0000-0000-00000000000a'::uuid from public.audit_log order by id desc limit 1), 'the export writes its own line');

-- everyone else
set request.jwt.claim.sub = 'e5000000-0000-0000-0000-00000000000b';
select pg_temp.check((select count(*) = 0 from public.audit_log where club_id = (select a from w)), 'club B reads nothing of club A');
set request.jwt.claim.sub = 'e5000000-0000-0000-0000-00000000000c';
select pg_temp.check((select count(*) = 0 from public.audit_log), 'medical staff read no lines');
set request.jwt.claim.sub = 'e5000000-0000-0000-0000-00000000000d';
select pg_temp.check((select count(*) = 0 from public.audit_log), 'the federation reads no lines');
reset role; set role anon;
select pg_temp.denied($$ select * from public.audit_log $$, 'anon cannot read the log');
reset role;

-- a withdrawal shows what went, without who
set role authenticated; set request.jwt.claim.sub = 'e5000000-0000-0000-0000-00000000000a';
reset role;
create temp table gone as select id from public.players where club_id = (select a from w) and num = 17;
create temp table cnt as select count(*) as n from public.audit_log;
grant select on gone, cnt to authenticated;
set role authenticated; set request.jwt.claim.sub = 'e5000000-0000-0000-0000-00000000000a';
select public.withdraw_consent((select id from gone));
select pg_temp.check((select count(*) >= 1 from public.audit_log where op = 'delete' and entity = 'players' and id > (select max(id) - 12 from public.audit_log)), 'a withdrawal leaves a delete line for players');
reset role;
