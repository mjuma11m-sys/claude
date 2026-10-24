-- Attacks the players table: a club's squad must not be public. Runs after seed_demo.sql.
\set ON_ERROR_STOP on
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as
  $$ begin if ok is distinct from true then raise exception 'FAIL: %', what; end if; raise notice 'ok  %', what; end $$;

create temp table w as select (select id from public.clubs where name = 'نادي تجريبي 01') as a, (select id from public.clubs where name = 'نادي تجريبي 02') as b, (select id from public.clubs where name = 'المالكية') as m;
grant select on w to anon, authenticated;
insert into auth.users (id) values ('a7000000-0000-0000-0000-00000000000a'), ('a7000000-0000-0000-0000-00000000000b'), ('a7000000-0000-0000-0000-00000000000c'), ('a7000000-0000-0000-0000-00000000000d'), ('a7000000-0000-0000-0000-00000000000f');
update public.profiles set role = 'club_admin', club_id = (select a from w) where id = 'a7000000-0000-0000-0000-00000000000a';
update public.profiles set role = 'club_admin', club_id = (select b from w) where id = 'a7000000-0000-0000-0000-00000000000b';
update public.profiles set role = 'medical',    club_id = (select a from w) where id = 'a7000000-0000-0000-0000-00000000000c';
update public.profiles set role = 'bfa_admin' where id = 'a7000000-0000-0000-0000-00000000000d';
create temp table n as select (select count(*) from public.players where club_id = (select a from w)) as squad_a, (select count(*) from public.motm_candidates) as cands;
grant select on n to anon, authenticated;
select pg_temp.check((select squad_a >= 10 from n), 'fixture: club 01 has a squad');

set role anon;
select pg_temp.check((select count(*) = 0 from public.players where club_id = (select a from w)), 'anon cannot read a club squad');
select pg_temp.check((select count(*) = (select cands from n) from public.players), 'anon reads only the man-of-the-match candidates');
reset role; set role authenticated; set request.jwt.claim.sub = 'a7000000-0000-0000-0000-00000000000f';
select pg_temp.check((select count(*) = 0 from public.players where club_id = (select a from w)), 'a fan cannot read a club squad');
select pg_temp.check((select count(*) = (select cands from n) from public.players), 'a fan reads only the candidates');
set request.jwt.claim.sub = 'a7000000-0000-0000-0000-00000000000a';
select pg_temp.check((select count(*) = (select squad_a from n) from public.players where club_id = (select a from w)), 'the club admin reads the whole own squad');
select pg_temp.check((select count(*) = 0 from public.players where club_id = (select m from w) and id not in (select player_id from public.motm_candidates)), 'and no other club''s non-candidate players');
set request.jwt.claim.sub = 'a7000000-0000-0000-0000-00000000000c';
select pg_temp.check((select count(*) = (select squad_a from n) from public.players where club_id = (select a from w)), 'medical staff read the own squad');
set request.jwt.claim.sub = 'a7000000-0000-0000-0000-00000000000b';
select pg_temp.check((select count(*) = 0 from public.players where club_id = (select a from w)), 'club B cannot read club A squad');
set request.jwt.claim.sub = 'a7000000-0000-0000-0000-00000000000d';
select pg_temp.check((select count(*) = 0 from public.players where club_id = (select a from w)), 'the federation cannot read a squad');
select pg_temp.check((select count(*) = (select cands from n) from public.players), 'the federation reads only candidates');
reset role;
