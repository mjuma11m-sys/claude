-- Attacks match reports. Runs after seed_demo.sql.
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
create temp table pl as select
  (select id from public.players where club_id = (select a from w) and pos like '%حارس%' order by num desc limit 1) as gk,
  (select id from public.players where club_id = (select a from w) and num = 9) as striker;
grant select on w, pl to anon, authenticated;
create temp table ev as select jsonb_build_array(
  jsonb_build_object('minute', 12, 'team', 'us', 'kind', 'shot_on', 'player_id', (select striker from pl), 'x', 55, 'y', 18),
  jsonb_build_object('minute', 34, 'team', 'opp', 'kind', 'goal', 'x', 40, 'y', 80),
  jsonb_build_object('minute', 58, 'team', 'us', 'kind', 'goal', 'player_id', (select striker from pl)),
  jsonb_build_object('minute', 90, 'team', 'opp', 'kind', 'yellow')) as e;
grant select on ev to authenticated;
insert into auth.users (id) values ('c3000000-0000-0000-0000-00000000000a'), ('c3000000-0000-0000-0000-00000000000b'), ('c3000000-0000-0000-0000-00000000000c'),
  ('c3000000-0000-0000-0000-00000000000d'), ('c3000000-0000-0000-0000-00000000000f');
update public.profiles set role = 'club_admin', club_id = (select a from w) where id = 'c3000000-0000-0000-0000-00000000000a';
update public.profiles set role = 'club_admin', club_id = (select b from w) where id = 'c3000000-0000-0000-0000-00000000000b';
update public.profiles set role = 'medical',    club_id = (select a from w) where id = 'c3000000-0000-0000-0000-00000000000c';
update public.profiles set role = 'bfa_admin' where id = 'c3000000-0000-0000-0000-00000000000d';
create function pg_temp.save(d date, ev jsonb, opp text default 'خصم', poss int default 55, keeper uuid default null) returns jsonb language sql as
  $$ select public.save_match_report(d, opp, true, poss, keeper, ev) $$;
grant execute on function pg_temp.save(date, jsonb, text, int, uuid) to authenticated, anon;
create function pg_temp.code(j jsonb) returns text language sql as $$ select j #>> '{errors,0,code}' $$;
create function pg_temp.bad(patch jsonb) returns jsonb language sql as $$ select pg_temp.save(current_date - 1, jsonb_build_array((select e -> 0 from ev) || patch)) $$;
grant execute on function pg_temp.bad(jsonb) to authenticated;

set role authenticated; set request.jwt.claim.sub = 'c3000000-0000-0000-0000-00000000000a';
select pg_temp.check(pg_temp.save(current_date - 2, (select e from ev), 'نادي الخصم', 55, (select gk from pl)) ->> 'ok' = 'true', 'a valid report saves');
select pg_temp.check((select count(*) = 4 from public.match_events) and (select count(*) = 1 from public.match_reports), 'four events and one report are stored');
select pg_temp.check(pg_temp.save(current_date - 2, (select e from ev) - 3) ->> 'ok' = 'true', 'saving the same match day succeeds');
select pg_temp.check((select count(*) = 1 from public.match_reports) and (select count(*) = 3 from public.match_events), 'it replaces the events, never duplicates the report');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date + 1, (select e from ev))) = 'bad_date', 'a future match is refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date - 1, (select e from ev), '')) = 'bad_opponent', 'an empty opponent is refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date - 1, (select e from ev), repeat('x', 41))) = 'bad_opponent', 'an opponent name over 40 characters is refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date - 1, (select e from ev), 'x', 120)) = 'bad_possession', 'possession above 100 is refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date - 1, (select e from ev), 'x', 50, (select striker from pl))) = 'unknown_keeper', 'a keeper who is not a goalkeeper is refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date - 1, '[]')) = 'bad_count', 'a report with no events is refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date - 1, (select jsonb_agg(jsonb_build_object('minute', 1, 'team', 'us', 'kind', 'shot')) from generate_series(1, 201)))) = 'bad_count', '201 events are refused');
select pg_temp.check(pg_temp.code(pg_temp.bad('{"minute": 200}')) = 'bad_minute', 'minute 200 is refused');
select pg_temp.check(pg_temp.code(pg_temp.bad('{"minute": "soon"}')) = 'bad_minute', 'a non-numeric minute is refused without crashing');
select pg_temp.check(pg_temp.code(pg_temp.bad('{"team": "ref"}')) = 'bad_team', 'an unknown team is refused');
select pg_temp.check(pg_temp.code(pg_temp.bad('{"kind": "tackle"}')) = 'bad_kind', 'an unknown event kind is refused');
select pg_temp.check(pg_temp.code(pg_temp.bad('{"x": 150}')) = 'bad_position', 'a position outside the pitch is refused');
select pg_temp.check(pg_temp.code(pg_temp.bad('{"x": 50, "y": null}')) = 'bad_position', 'half a position is refused');
select pg_temp.check(pg_temp.code(pg_temp.bad('{"team": "opp"}')) = 'player_on_opponent', 'an opponent event cannot carry one of our players');
select pg_temp.check(pg_temp.code(pg_temp.bad(jsonb_build_object('player_id', gen_random_uuid()))) = 'unknown_player', 'an unknown player is refused');
select pg_temp.check((select count(*) = 1 from public.match_reports) and (select count(*) = 3 from public.match_events), 'every refused save wrote nothing');
select pg_temp.denied($$ insert into public.match_reports (club_id, match_on, opponent) values ((select a from w), current_date - 9, 'x') $$, 'reports cannot be written directly');
select pg_temp.denied($$ insert into public.match_events (report_id, club_id, n, minute, team, kind) select id, club_id, 9, 1, 'us', 'shot' from public.match_reports $$, 'events cannot be written directly');
select pg_temp.denied($$ update public.match_events set minute = 1 $$, 'events cannot be edited directly');

set request.jwt.claim.sub = 'c3000000-0000-0000-0000-00000000000c';
select pg_temp.check((select count(*) = 0 from public.match_reports) and (select count(*) = 0 from public.match_events), 'medical staff do not see match reports');
select pg_temp.raises($$ select pg_temp.save(current_date - 3, (select e from ev)) $$, 'forbidden', 'medical staff cannot save a report');
set request.jwt.claim.sub = 'c3000000-0000-0000-0000-00000000000b';
select pg_temp.check((select count(*) = 0 from public.match_reports) and (select count(*) = 0 from public.match_events), 'club B reads none of club A reports');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date - 1, (select e from ev))) = 'unknown_player', 'club B cannot attach club A players');
select pg_temp.check(pg_temp.rows_changed($$ delete from public.match_reports $$) = 0, 'club B cannot delete club A reports (0 rows change)');
set request.jwt.claim.sub = 'c3000000-0000-0000-0000-00000000000d';
select pg_temp.check((select count(*) = 0 from public.match_reports), 'the federation sees no match reports');
select pg_temp.raises($$ select pg_temp.save(current_date - 3, (select e from ev)) $$, 'forbidden', 'the federation cannot save a report');
set request.jwt.claim.sub = 'c3000000-0000-0000-0000-00000000000f';
select pg_temp.raises($$ select pg_temp.save(current_date - 3, (select e from ev)) $$, 'forbidden', 'a fan cannot save a report');
reset role;
set role anon;
select pg_temp.denied($$ select * from public.match_events $$, 'anon cannot read match events');
select pg_temp.denied($$ select pg_temp.save(current_date - 3, (select e from ev)) $$, 'anon cannot run save_match_report');
reset role;

set role authenticated; set request.jwt.claim.sub = 'c3000000-0000-0000-0000-00000000000a';
select pg_temp.check(pg_temp.save(current_date - 4, (select e from ev), 'خصم ثاني', 48, (select gk from pl)) ->> 'ok' = 'true', 'a second report saves');
reset role;
delete from public.players where id = (select striker from pl);
select pg_temp.check((select count(*) = 2 from public.match_reports) and (select count(*) = 3 + 4 from public.match_events) and (select count(*) = 0 from public.match_events where player_id is not null), 'deleting a player (consent withdrawal) keeps the events but unlinks the player');
delete from public.players where id = (select gk from pl);
select pg_temp.check((select count(*) = 2 from public.match_reports where keeper_id is null), 'deleting the keeper unlinks the keeper, the reports stay');
set role authenticated; set request.jwt.claim.sub = 'c3000000-0000-0000-0000-00000000000a';
select pg_temp.check(pg_temp.rows_changed($$ delete from public.match_reports where match_on = current_date - 4 $$) = 1, 'the owner can delete a report');
reset role;
select pg_temp.check((select count(*) = 3 from public.match_events), 'deleting a report deletes its events');
