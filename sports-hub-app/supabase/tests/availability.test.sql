-- Attacks the availability columns: card counts and the return date are written only by own-club administrators and medical staff. Runs after seed_demo.sql.
\set ON_ERROR_STOP on
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as
  $$ begin if ok is distinct from true then raise exception 'FAIL: %', what; end if; raise notice 'ok  %', what; end $$;
create function pg_temp.denied(sql text, what text) returns void language plpgsql as
  $$ begin execute sql; raise exception 'FAIL: %', what;
     exception when insufficient_privilege or check_violation then raise notice 'ok  %', what; end $$;
create temp table w as select
  (select id from public.clubs where name = 'نادي تجريبي 07') as x,
  (select id from public.clubs where name = 'نادي تجريبي 08') as y,
  gen_random_uuid() as pl;
grant select on w to anon, authenticated;
insert into auth.users (id) values ('e2000000-0000-0000-0000-00000000000a'), ('e2000000-0000-0000-0000-00000000000b'), ('e2000000-0000-0000-0000-00000000000c');
update public.profiles set role = 'club_admin', club_id = (select x from w) where id = 'e2000000-0000-0000-0000-00000000000a';
update public.profiles set role = 'medical', club_id = (select x from w) where id = 'e2000000-0000-0000-0000-00000000000b';
update public.profiles set role = 'club_admin', club_id = (select y from w) where id = 'e2000000-0000-0000-0000-00000000000c';

insert into public.players (id, club_id, name, num, pos) select pl, x, 'لاعب اختبار', 91, 'وسط' from w;
insert into public.player_status (player_id, club_id, status, is_demo) select pl, x, 'fit', false from w;
set role authenticated; set request.jwt.claim.sub = 'e2000000-0000-0000-0000-00000000000a';
update public.player_status set status = 'injured', note = 'شد عضلي', return_on = current_date + 14, yellow_cards = 2 where player_id = (select pl from w);
select pg_temp.check((select status = 'injured' and yellow_cards = 2 and return_on = current_date + 14 from public.player_status where player_id = (select pl from w)), 'the club administrator records an injury, a return date and cards');
set request.jwt.claim.sub = 'e2000000-0000-0000-0000-00000000000b';
update public.player_status set red_cards = 1, status = 'suspended' where player_id = (select pl from w);
select pg_temp.check((select red_cards = 1 from public.player_status where player_id = (select pl from w)), 'medical staff can update it too');
select pg_temp.denied($$ update public.player_status set yellow_cards = 99 where player_id = (select pl from w) $$, 'a card count above 30 is refused');
select pg_temp.denied($$ update public.player_status set note = repeat('x', 61) where player_id = (select pl from w) $$, 'a note longer than 60 characters is refused');
select pg_temp.denied($$ update public.player_status set club_id = (select y from w) where player_id = (select pl from w) $$, 'the club of a status row cannot be changed');

set request.jwt.claim.sub = 'e2000000-0000-0000-0000-00000000000c';
update public.player_status set yellow_cards = 5 where player_id = (select pl from w);
reset role;
select pg_temp.check((select yellow_cards <> 5 from public.player_status where player_id = (select pl from w)), 'another club cannot change the row (RLS hides it)');
set role anon;
select pg_temp.denied($$ select * from public.player_status $$, 'a signed-out caller cannot read availability');
reset role;
