-- Attacks the lineup tables and save_lineup. Runs after seed_demo.sql (club 01 has 16 players, 4 of them not fit).
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

create temp table w as select
  (select id from public.clubs where name = 'نادي تجريبي 01') as a,
  (select id from public.clubs where name = 'نادي تجريبي 02') as b;
-- club 01 squad by shirt number: 1 and 22 are goalkeepers; 5, 19 injured; 14 suspended; 3 doubtful (see seed)
create temp table sq as select p.num, p.id, p.pos, coalesce(s.status, 'fit') as status from public.players p left join public.player_status s on s.player_id = p.id where p.club_id = (select a from w);
grant select on w, sq to anon, authenticated;
-- eleven fit starters with the goalkeeper in slot 1, and a bench
create temp table pick as select id, num, pos, row_number() over (order by (pos like '%حارس%') desc, num) as rn
  from sq where status in ('fit', 'doubtful') and num <> 22;
create temp table lu as select
  (select jsonb_agg(jsonb_build_object('player_id', id, 'slot', rn) order by rn) from pick where rn <= 11) as starters,
  (select jsonb_agg(jsonb_build_object('player_id', id)) from (select id from pick where rn = 12 union all select id from sq where num = 22) b) as bench;
grant select on pick to authenticated;
grant select on lu to authenticated;
insert into auth.users (id) values
  ('a1000000-0000-0000-0000-00000000000a'), ('a1000000-0000-0000-0000-00000000000b'), ('a1000000-0000-0000-0000-00000000000c'),
  ('a1000000-0000-0000-0000-00000000000d'), ('a1000000-0000-0000-0000-00000000000f');
update public.profiles set role = 'club_admin', club_id = (select a from w) where id = 'a1000000-0000-0000-0000-00000000000a';
update public.profiles set role = 'club_admin', club_id = (select b from w) where id = 'a1000000-0000-0000-0000-00000000000b';
update public.profiles set role = 'medical',    club_id = (select a from w) where id = 'a1000000-0000-0000-0000-00000000000c';
update public.profiles set role = 'bfa_admin' where id = 'a1000000-0000-0000-0000-00000000000d';

create function pg_temp.save(d date, st jsonb, bn jsonb, f text default '4-3-3', opp text default 'خصم تجريبي') returns jsonb language sql as
  $$ select public.save_lineup(d, opp, f, st, bn) $$;
grant execute on function pg_temp.save(date, jsonb, jsonb, text, text) to authenticated, anon;
create function pg_temp.code(j jsonb) returns text language sql as $$ select j #>> '{errors,0,code}' $$;

set role authenticated; set request.jwt.claim.sub = 'a1000000-0000-0000-0000-00000000000a';
select pg_temp.check(pg_temp.save(current_date + 3, (select starters from lu), (select bench from lu)) ->> 'ok' = 'true', 'a valid lineup saves');
select pg_temp.check((select count(*) = 11 from public.lineup_players where role = 'start') and (select count(*) = 2 from public.lineup_players where role = 'bench'), '11 starters and the bench are stored');
select pg_temp.check(pg_temp.save(current_date + 3, (select starters from lu), '[]', '4-4-2', 'خصم ثاني') ->> 'ok' = 'true', 'saving the same match day succeeds');
select pg_temp.check((select count(*) = 1 from public.lineups) and (select count(*) = 0 from public.lineup_players where role = 'bench') and (select formation = '4-4-2' from public.lineups), 'saving the same match day replaces the lineup');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date + 4, (select starters - 10 from lu), '[]')) = 'wrong_count', 'ten starters are refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date + 4, (select starters from lu) || (select starters -> 0 from lu), '[]')) = 'wrong_count', 'twelve starters are refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date + 4, (select jsonb_set(starters, '{1,player_id}', starters #> '{0,player_id}') from lu), '[]')) = 'duplicate_player', 'the same player twice is refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date + 4, (select jsonb_set(starters, '{3,player_id}', to_jsonb((select id from sq where status = 'injured' limit 1)::text)) from lu), '[]')) = 'unavailable', 'an injured starter is refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date + 4, (select jsonb_set(starters, '{3,player_id}', to_jsonb((select id from sq where status = 'suspended' limit 1)::text)) from lu), '[]')) = 'unavailable', 'a suspended starter is refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date + 4, (select starters from lu), jsonb_build_array(jsonb_build_object('player_id', (select id from sq where status = 'injured' limit 1))))) = 'unavailable', 'an injured player on the bench is refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date + 4, (select jsonb_set(starters, '{0,player_id}', to_jsonb((select id from sq where num = 8)::text)) from lu), '[]')) in ('outfield_in_goal', 'no_goalkeeper'), 'an outfield player in goal is refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date + 4, (select jsonb_set(starters, '{5,player_id}', to_jsonb((select id from sq where num = 22)::text)) from lu), '[]')) in ('two_goalkeepers', 'goalkeeper_not_in_goal'), 'a second goalkeeper among the starters is refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date + 4, (select jsonb_set(starters, '{2,slot}', '1') from lu), '[]')) = 'bad_slot', 'two players in one slot are refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date + 4, (select jsonb_set(starters, '{2,slot}', '12') from lu), '[]')) = 'bad_slot', 'slot 12 is refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date + 4, (select starters from lu), '[]', '9-9-9')) = 'bad_formation', 'an unknown formation is refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date + 4, (select starters from lu), '[]', '4-3-3', '')) = 'bad_opponent', 'an empty opponent is refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date + 4, (select starters from lu), '[]', '4-3-3', repeat('x', 41))) = 'bad_opponent', 'an opponent name over 40 characters is refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date + 4, (select starters from lu), (select jsonb_agg(jsonb_build_object('player_id', gen_random_uuid())) from generate_series(1, 10)))) = 'bench_too_big', 'a bench of ten is refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date + 4, (select starters from lu), jsonb_build_array(jsonb_build_object('player_id', gen_random_uuid())))) = 'unknown_player', 'an unknown player is refused');
select pg_temp.check((select count(*) = 1 from public.lineups), 'every refused save left the stored lineup untouched');
select pg_temp.denied($$ insert into public.lineups (club_id, match_on, opponent, formation) values ((select a from w), current_date + 9, 'x', '4-3-3') $$, 'lineups cannot be written directly');
select pg_temp.denied($$ insert into public.lineup_players (lineup_id, club_id, player_id, role, slot) select id, club_id, (select id from sq limit 1), 'bench', 1 from public.lineups $$, 'lineup players cannot be written directly');
select pg_temp.denied($$ update public.lineups set opponent = 'x' $$, 'lineups cannot be edited directly');

-- Another club: no access, and cannot put club A players in its lineup
set request.jwt.claim.sub = 'a1000000-0000-0000-0000-00000000000b';
select pg_temp.check((select count(*) = 0 from public.lineups) and (select count(*) = 0 from public.lineup_players), 'club B reads none of club A lineups');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date + 3, (select starters from lu), '[]')) = 'unknown_player', 'club B cannot field club A players');
select pg_temp.check(pg_temp.rows_changed($$ delete from public.lineups $$) = 0, 'club B cannot delete club A lineups (0 rows change)');
-- Medical, federation, fan, anon
set request.jwt.claim.sub = 'a1000000-0000-0000-0000-00000000000c';
select pg_temp.check((select count(*) = 0 from public.lineups), 'medical staff do not see the lineup');
select pg_temp.raises($$ select pg_temp.save(current_date + 3, (select starters from lu), '[]') $$, 'forbidden', 'medical staff cannot save a lineup');
set request.jwt.claim.sub = 'a1000000-0000-0000-0000-00000000000d';
select pg_temp.check((select count(*) = 0 from public.lineups), 'the federation does not see lineups');
select pg_temp.raises($$ select pg_temp.save(current_date + 3, (select starters from lu), '[]') $$, 'forbidden', 'the federation cannot save a lineup');
set request.jwt.claim.sub = 'a1000000-0000-0000-0000-00000000000f';
select pg_temp.raises($$ select pg_temp.save(current_date + 3, (select starters from lu), '[]') $$, 'forbidden', 'a fan cannot save a lineup');
reset role;
set role anon;
select pg_temp.denied($$ select * from public.lineups $$, 'anon cannot read lineups');
select pg_temp.denied($$ select pg_temp.save(current_date + 3, (select starters from lu), '[]') $$, 'anon cannot run save_lineup');
reset role;

-- The owner can delete a lineup; withdrawing a player removes them from saved lineups but keeps the lineup
set role authenticated; set request.jwt.claim.sub = 'a1000000-0000-0000-0000-00000000000a';
select pg_temp.check(pg_temp.rows_changed($$ delete from public.lineups where match_on = current_date + 3 $$) = 1, 'the owner can delete a lineup');
select pg_temp.check((select count(*) = 0 from public.lineup_players), 'deleting a lineup deletes its rows');
select pg_temp.check(pg_temp.save(current_date + 5, (select starters from lu), (select bench from lu)) ->> 'ok' = 'true', 'a lineup saves again');
reset role;
delete from public.players where id = (select (starters -> 3 ->> 'player_id')::uuid from lu);
select pg_temp.check((select count(*) = 1 from public.lineups) and (select count(*) = 12 from public.lineup_players), 'deleting a player (consent withdrawal) removes them from the lineup, the lineup stays');
