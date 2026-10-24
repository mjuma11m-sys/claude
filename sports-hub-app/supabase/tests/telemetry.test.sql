-- Attacks the error log and the screen counters. Runs after seed_demo.sql.
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
insert into auth.users (id) values ('b8000000-0000-0000-0000-00000000000a'), ('b8000000-0000-0000-0000-00000000000b'), ('b8000000-0000-0000-0000-00000000000c'), ('b8000000-0000-0000-0000-00000000000d'), ('b8000000-0000-0000-0000-00000000000f');
update public.profiles set role = 'club_admin', club_id = (select a from w) where id = 'b8000000-0000-0000-0000-00000000000a';
update public.profiles set role = 'club_admin', club_id = (select b from w) where id = 'b8000000-0000-0000-0000-00000000000b';
update public.profiles set role = 'medical',    club_id = (select a from w) where id = 'b8000000-0000-0000-0000-00000000000c';
update public.profiles set role = 'bfa_admin' where id = 'b8000000-0000-0000-0000-00000000000d';

set role authenticated; set request.jwt.claim.sub = 'b8000000-0000-0000-0000-00000000000a';
select pg_temp.check(public.report_client_error('/club', 'TypeError: x is undefined', 'at a\nat b', '1.0') = true, 'a signed-in person can report an error');
select pg_temp.denied($$ select * from public.client_errors $$, 'nobody on the API can read the error log');
select pg_temp.denied($$ insert into public.client_errors (route, message) values ('/x', 'y') $$, 'nobody on the API can write the log directly');
select pg_temp.denied($$ select * from public.screen_views $$, 'nobody on the API can read the screen counters');
select pg_temp.check(public.report_client_error('/' || repeat('r', 300), repeat('m', 900), repeat('s', 2000), repeat('v', 100)) = true, 'oversized fields are truncated, not refused');
reset role;
select pg_temp.check((select max(length(route)) <= 80 and max(length(message)) <= 200 and max(length(stack)) <= 600 and max(length(version)) <= 20 from public.client_errors), 'the stored fields respect their limits');
select pg_temp.check((select club_id = (select a from w) from public.client_errors order by id limit 1), 'the report carries the reporter''s club (no names)');
set role authenticated; set request.jwt.claim.sub = 'b8000000-0000-0000-0000-00000000000a';
do $$ declare i int; begin for i in 1..40 loop perform public.report_client_error('/club', 'spam ' || i); end loop; end $$;
reset role;
select pg_temp.check((select count(*) = 30 from public.client_errors where user_id = 'b8000000-0000-0000-0000-00000000000a'), 'one person is capped at 30 reports a day');
select pg_temp.check((select count(*) = 0 from public.client_errors where message = 'spam 40'), 'the reports over the cap are dropped');

set role authenticated; set request.jwt.claim.sub = 'b8000000-0000-0000-0000-00000000000a';
select public.track_screen('/analysis'); select public.track_screen('/analysis'); select public.track_screen('/club');
set request.jwt.claim.sub = 'b8000000-0000-0000-0000-00000000000c';
select public.track_screen('/analysis');
set request.jwt.claim.sub = 'b8000000-0000-0000-0000-00000000000b';
select public.track_screen('/analysis');
select pg_temp.denied($$ select public.track_screen('/admin/secret') $$, 'an unknown route is refused');
reset role;
select pg_temp.check((select views = 3 from public.screen_views where club_id = (select a from w) and route = '/analysis'), 'screens are counted per club and route (admin + medical of club A = 3)');
select pg_temp.check((select views = 1 from public.screen_views where club_id = (select b from w) and route = '/analysis'), 'club B has its own counter');
select pg_temp.check((select count(*) = 3 from public.screen_views), 'three counters in all');
set role authenticated; set request.jwt.claim.sub = 'b8000000-0000-0000-0000-00000000000d';
select pg_temp.raises($$ select public.track_screen('/club') $$, 'forbidden', 'the federation has no club screens to count');
set request.jwt.claim.sub = 'b8000000-0000-0000-0000-00000000000f';
select pg_temp.raises($$ select public.track_screen('/club') $$, 'forbidden', 'a fan cannot count screens');
reset role; set role anon;
select pg_temp.denied($$ select public.report_client_error('/club', 'x') $$, 'anon cannot report errors');
select pg_temp.denied($$ select public.track_screen('/club') $$, 'anon cannot count screens');
reset role;
