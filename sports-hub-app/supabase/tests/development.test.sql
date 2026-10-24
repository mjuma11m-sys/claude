-- Attacks the development tables. Runs after seed_demo.sql.
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
  (select id from public.clubs where name = 'نادي تجريبي 02') as b,
  (select id from public.players where club_id = (select id from public.clubs where name = 'نادي تجريبي 01') and num = 1) as gk;
grant select on w to anon, authenticated;
insert into auth.users (id) values
  ('f0000000-0000-0000-0000-00000000000a'), ('f0000000-0000-0000-0000-00000000000b'), ('f0000000-0000-0000-0000-00000000000c'),
  ('f0000000-0000-0000-0000-00000000000d'), ('f0000000-0000-0000-0000-00000000000f');
update public.profiles set role = 'club_admin', club_id = (select a from w) where id = 'f0000000-0000-0000-0000-00000000000a';
update public.profiles set role = 'club_admin', club_id = (select b from w) where id = 'f0000000-0000-0000-0000-00000000000b';
update public.profiles set role = 'medical',    club_id = (select a from w) where id = 'f0000000-0000-0000-0000-00000000000c';
update public.profiles set role = 'bfa_admin' where id = 'f0000000-0000-0000-0000-00000000000d';

set role authenticated; set request.jwt.claim.sub = 'f0000000-0000-0000-0000-00000000000a';
insert into public.skill_assessments (player_id, club_id, skill, score) values ((select gk from w), (select a from w), 'reflexes', 3), ((select gk from w), (select a from w), 'diving', 4);
select pg_temp.check((select count(*) = 2 from public.skill_assessments), 'club admin records assessments for its own goalkeeper');
select pg_temp.denied($$ insert into public.skill_assessments (player_id, club_id, skill, score) values ((select gk from w), (select a from w), 'reflexes', 6) $$, 'a score above 5 is refused');
select pg_temp.denied($$ insert into public.skill_assessments (player_id, club_id, skill, score) values ((select gk from w), (select a from w), 'reflexes', 0) $$, 'a score of 0 is refused');
select pg_temp.denied($$ insert into public.skill_assessments (player_id, club_id, skill, score) values ((select gk from w), (select a from w), 'telepathy', 3) $$, 'an unknown skill is refused');
select pg_temp.denied($$ insert into public.skill_assessments (player_id, club_id, skill, score, assessed_on) values ((select gk from w), (select a from w), 'footwork', 3, current_date + 3) $$, 'an assessment cannot be dated in the future');
select pg_temp.denied($$ insert into public.skill_assessments (player_id, club_id, skill, score) values ((select gk from w), (select b from w), 'footwork', 3) $$, 'a player cannot be attached to another club (composite key)');
select pg_temp.denied($$ insert into public.skill_assessments (player_id, club_id, skill, score) values ((select gk from w), (select a from w), 'reflexes', 5) $$, 'one assessment per player, day and skill');
select pg_temp.check(pg_temp.rows_changed($$ update public.skill_assessments set score = 5 where skill = 'reflexes' $$) = 1, 'an assessment can be corrected the same day');

insert into public.dev_goals (player_id, club_id, skill, target, due_on) values ((select gk from w), (select a from w), 'reflexes', 4, current_date + 60), ((select gk from w), (select a from w), 'diving', 5, current_date + 90), ((select gk from w), (select a from w), 'footwork', 4, current_date + 30);
select pg_temp.raises($$ insert into public.dev_goals (player_id, club_id, skill, target, due_on) values ((select gk from w), (select a from w), 'organisation', 4, current_date + 30) $$, 'goal_limit', 'a fourth open goal is refused');
select pg_temp.check(pg_temp.rows_changed($$ update public.dev_goals set done_at = now() where skill = 'footwork' $$) = 1, 'a goal can be marked done');
insert into public.dev_goals (player_id, club_id, skill, target, due_on) values ((select gk from w), (select a from w), 'organisation', 4, current_date + 30);
select pg_temp.check((select count(*) = 3 from public.dev_goals where done_at is null), 'finishing a goal frees a slot');
select pg_temp.denied($$ update public.dev_goals set target = 1 $$, 'goal text columns are not editable after creation (only done_at)');

insert into public.training_logs (player_id, club_id, day, minutes, rpe) values ((select gk from w), (select a from w), current_date - 1, 75, 6);
select pg_temp.denied($$ insert into public.training_logs (player_id, club_id, day, minutes, rpe) values ((select gk from w), (select a from w), current_date - 1, 60, 5) $$, 'one log per player per day');
select pg_temp.denied($$ insert into public.training_logs (player_id, club_id, day, minutes, rpe) values ((select gk from w), (select a from w), current_date - 2, 400, 5) $$, 'minutes above 300 are refused');
select pg_temp.denied($$ insert into public.training_logs (player_id, club_id, day, minutes, rpe) values ((select gk from w), (select a from w), current_date - 2, 60, 11) $$, 'RPE above 10 is refused');
select pg_temp.denied($$ insert into public.training_logs (player_id, club_id, day, minutes, rpe) values ((select gk from w), (select a from w), current_date + 1, 60, 5) $$, 'a log cannot be in the future');

update public.dev_goals set done_at = now() where skill = 'organisation'; -- frees a slot so the next check hits the policy, not the cap
-- Medical staff A: reads everything of the club, writes only the session load
set request.jwt.claim.sub = 'f0000000-0000-0000-0000-00000000000c';
select pg_temp.check((select count(*) = 2 from public.skill_assessments) and (select count(*) >= 1 from public.dev_goals) and (select count(*) = 1 from public.training_logs), 'medical staff read assessments, goals and logs of their club');
select pg_temp.denied($$ insert into public.skill_assessments (player_id, club_id, skill, score, assessed_on) values ((select gk from w), (select a from w), 'footwork', 3, current_date - 5) $$, 'medical staff cannot write assessments');
select pg_temp.denied($$ insert into public.dev_goals (player_id, club_id, skill, target, due_on) values ((select gk from w), (select a from w), 'footwork', 3, current_date + 5) $$, 'medical staff cannot write goals');
insert into public.training_logs (player_id, club_id, day, minutes, rpe) values ((select gk from w), (select a from w), current_date - 3, 50, 4);
select pg_temp.check((select count(*) = 2 from public.training_logs), 'medical staff can log a session');

-- Club B, federation, fan: nothing of club A
set request.jwt.claim.sub = 'f0000000-0000-0000-0000-00000000000b';
select pg_temp.check((select count(*) = 0 from public.skill_assessments) and (select count(*) = 0 from public.dev_goals) and (select count(*) = 0 from public.training_logs), 'club B reads none of club A development data');
select pg_temp.denied($$ insert into public.training_logs (player_id, club_id, day, minutes, rpe) values ((select gk from w), (select b from w), current_date - 6, 60, 5) $$, 'club B cannot log a session for club A player');
select pg_temp.denied($$ insert into public.skill_assessments (player_id, club_id, skill, score) values ((select gk from w), (select a from w), 'footwork', 3) $$, 'club B cannot assess club A player');
select pg_temp.check(pg_temp.rows_changed($$ delete from public.training_logs $$) = 0 and pg_temp.rows_changed($$ delete from public.dev_goals $$) = 0, 'club B cannot delete club A rows (0 rows change)');
set request.jwt.claim.sub = 'f0000000-0000-0000-0000-00000000000d';
select pg_temp.check((select count(*) = 0 from public.skill_assessments) and (select count(*) = 0 from public.dev_goals) and (select count(*) = 0 from public.training_logs), 'the federation sees no development data');
set request.jwt.claim.sub = 'f0000000-0000-0000-0000-00000000000f';
select pg_temp.check((select count(*) = 0 from public.skill_assessments) and (select count(*) = 0 from public.training_logs), 'a fan sees no development data');
reset role;
set role anon;
select pg_temp.denied($$ select * from public.skill_assessments $$, 'anon cannot read assessments');
select pg_temp.denied($$ select * from public.training_logs $$, 'anon cannot read logs');
reset role;

-- Removing the player removes their development data
delete from public.players where id = (select gk from w);
select pg_temp.check((select count(*) = 0 from public.skill_assessments) and (select count(*) = 0 from public.dev_goals) and (select count(*) = 0 from public.training_logs), 'deleting a player (consent withdrawal) deletes assessments, goals and logs');
