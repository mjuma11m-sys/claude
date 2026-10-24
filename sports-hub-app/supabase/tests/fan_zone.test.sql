-- Runs after seed_demo.sql. Attacks the Fan Zone tables.
\set ON_ERROR_STOP on
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as
  $$ begin if ok is distinct from true then raise exception 'FAIL: %', what; end if; raise notice 'ok  %', what; end $$;
create function pg_temp.denied(sql text, what text) returns void language plpgsql as
  $$ begin execute sql; raise exception 'FAIL: %', what;
     exception when insufficient_privilege or check_violation or unique_violation or foreign_key_violation then raise notice 'ok  %', what; end $$;

insert into auth.users (id) values ('a0000000-0000-0000-0000-000000000005'), ('a0000000-0000-0000-0000-000000000006');
create temp table t as select
  (select id from public.matches limit 1) as match_id,
  (select c.player_id from public.motm_candidates c limit 1) as player_id,
  (select id from public.players where name = 'اللاعب 10' and club_id = (select id from public.clubs where name = 'المالكية')) as p10,
  (select id from public.clubs where name = 'المالكية') as malkiya;
grant select on t to anon, authenticated;

select pg_temp.check((select count(*) = 20 from public.league_entries), 'seed: 12 + 8 table rows');
select pg_temp.check((select count(*) = 5 from public.motm_candidates), 'seed: 5 candidates for the next match');
select pg_temp.check((select bool_and(w = l and gf = ga and d % 2 = 0) from (select league_id, sum(won) w, sum(lost) l, sum(gf) gf, sum(ga) ga, sum(drawn) d from public.league_entries group by league_id) t), 'seed: every league table closes (wins = losses, goals for = against, draws even)');
select pg_temp.check((select bool_and(played = won + drawn + lost) from public.league_entries), 'seed: played = won + drawn + lost on every row');

set role anon;
select pg_temp.check((select count(*) = 2 from public.leagues), 'anon reads leagues');
select pg_temp.check((select count(*) = 1 from public.matches), 'anon reads fixtures');
select pg_temp.check((select sum(votes) = 0 from public.motm_tally((select match_id from t))), 'anon reads vote totals');
select pg_temp.denied($$ insert into public.motm_votes (match_id, voter_id, player_id) select match_id, 'a0000000-0000-0000-0000-000000000005', p10 from t $$, 'anon cannot vote');
reset role;

set role authenticated;
set request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000005';
select pg_temp.denied($$ update public.league_entries set won = 99 $$, 'fan cannot edit the league table');
select pg_temp.denied($$ insert into public.matches (league_id, home_id, away_id, venue, kickoff) select 'premier', malkiya, malkiya, 'x', now() from t $$, 'fan cannot add fixtures');
select pg_temp.denied($$ insert into public.motm_votes (match_id, voter_id, player_id) select match_id, 'a0000000-0000-0000-0000-000000000006', p10 from t $$, 'fan cannot vote as someone else');
select pg_temp.denied($$ insert into public.motm_votes (match_id, player_id) select match_id, gen_random_uuid() from t $$, 'fan cannot vote for a non-candidate');
insert into public.motm_votes (match_id, player_id) select match_id, p10 from t;
select pg_temp.check(true, 'fan votes once');
select pg_temp.denied($$ insert into public.motm_votes (match_id, player_id) select match_id, p10 from t $$, 'second vote rejected');
select pg_temp.denied($$ update public.motm_votes set player_id = player_id $$, 'fan cannot change a cast vote');
update public.profiles set fav_club_id = (select malkiya from t) where id = auth.uid();
select pg_temp.check((select fav_club_id = (select malkiya from t) from public.profiles), 'fan picks their club');

set request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000006';
select pg_temp.check((select count(*) = 0 from public.motm_votes), 'another fan cannot see who voted for whom');
select pg_temp.check((select votes = 1 from public.motm_tally((select match_id from t)) where player_id = (select p10 from t)), 'tally counts the vote');
reset role;

-- Voting window closes two hours after kickoff
update public.matches set kickoff = now() - interval '3 hours';
set role authenticated;
set request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000006';
select pg_temp.denied($$ insert into public.motm_votes (match_id, player_id) select match_id, p10 from t $$, 'no voting after the window');
reset role;
