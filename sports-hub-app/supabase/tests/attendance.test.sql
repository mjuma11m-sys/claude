-- Attacks attendance. Runs after seed_demo.sql (club 01 has 16 players).
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
create temp table sq as select p.num, p.id from public.players p where p.club_id = (select a from w);
create temp table mk as select jsonb_agg(jsonb_build_object('player_id', id, 'status', case when num = 3 then 'late' when num = 5 then 'excused' when num = 11 then 'absent' else 'present' end,
  'reason', case when num = 5 then 'medical' else null end) order by num) as marks from sq;
grant select on w, sq, mk to anon, authenticated;
insert into auth.users (id) values ('b2000000-0000-0000-0000-00000000000a'), ('b2000000-0000-0000-0000-00000000000b'), ('b2000000-0000-0000-0000-00000000000c'),
  ('b2000000-0000-0000-0000-00000000000d'), ('b2000000-0000-0000-0000-00000000000f');
update public.profiles set role = 'club_admin', club_id = (select a from w) where id = 'b2000000-0000-0000-0000-00000000000a';
update public.profiles set role = 'club_admin', club_id = (select b from w) where id = 'b2000000-0000-0000-0000-00000000000b';
update public.profiles set role = 'medical',    club_id = (select a from w) where id = 'b2000000-0000-0000-0000-00000000000c';
update public.profiles set role = 'bfa_admin' where id = 'b2000000-0000-0000-0000-00000000000d';
create function pg_temp.save(d date, k text, m jsonb) returns jsonb language sql as $$ select public.save_attendance(d, k, m) $$;
grant execute on function pg_temp.save(date, text, jsonb) to authenticated, anon;
create function pg_temp.code(j jsonb) returns text language sql as $$ select j #>> '{errors,0,code}' $$;

set role authenticated; set request.jwt.claim.sub = 'b2000000-0000-0000-0000-00000000000a';
select pg_temp.check(pg_temp.save(current_date, 'training', (select marks from mk)) ->> 'ok' = 'true', 'a valid attendance sheet saves');
select pg_temp.check((select count(*) = (select count(*) from sq) from public.attendance_marks) and (select count(*) = 1 from public.attendance_marks where reason = 'medical'), 'one mark per player, with the coded reason');
select pg_temp.check(pg_temp.save(current_date, 'training', (select marks from mk)) ->> 'ok' = 'true', 'saving the same day and kind again succeeds');
select pg_temp.check((select count(*) = 1 from public.attendance_sessions) and (select count(*) = (select count(*) from sq) from public.attendance_marks), 'it replaces, never duplicates');
select pg_temp.check(pg_temp.save(current_date, 'match', (select marks from mk)) ->> 'ok' = 'true' and true, 'training and match of one day are separate sessions');
select pg_temp.check((select count(*) = 2 from public.attendance_sessions), 'two sessions now');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date + 1, 'training', (select marks from mk))) = 'bad_date', 'a future day is refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date - 91, 'training', (select marks from mk))) = 'bad_date', 'a day older than 90 days is refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date - 1, 'party', (select marks from mk))) = 'bad_kind', 'an unknown kind is refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date - 1, 'training', '[]')) = 'bad_count', 'an empty sheet is refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date - 1, 'training', (select jsonb_agg(jsonb_build_object('player_id', gen_random_uuid(), 'status', 'present')) from generate_series(1, 61)))) = 'bad_count', 'more than 60 marks are refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date - 1, 'training', (select jsonb_set(marks, '{0,status}', '"holiday"') from mk))) = 'bad_status', 'an unknown status is refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date - 1, 'training', (select jsonb_set(marks, '{0,reason}', '"medical"') from mk))) = 'bad_reason', 'a reason on a present player is refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date - 1, 'training', (select jsonb_set(jsonb_set(marks, '{0,status}', '"excused"'), '{0,reason}', '"he has a cold and a long story"') from mk))) = 'bad_reason', 'a free-text reason is refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date - 1, 'training', (select jsonb_set(marks, '{1,player_id}', marks #> '{0,player_id}') from mk))) = 'duplicate_player', 'the same player twice is refused');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date - 1, 'training', jsonb_build_array(jsonb_build_object('player_id', gen_random_uuid(), 'status', 'present')))) = 'unknown_player', 'an unknown player is refused');
select pg_temp.check((select count(*) = 2 from public.attendance_sessions), 'every refused save wrote nothing');
select pg_temp.denied($$ insert into public.attendance_sessions (club_id, day, kind) values ((select a from w), current_date - 5, 'training') $$, 'sessions cannot be written directly');
select pg_temp.denied($$ insert into public.attendance_marks (session_id, club_id, player_id, status) select id, club_id, (select id from sq limit 1), 'present' from public.attendance_sessions limit 1 $$, 'marks cannot be written directly');
select pg_temp.denied($$ update public.attendance_marks set status = 'present' $$, 'marks cannot be edited directly');

-- Medical: reads, cannot write
set request.jwt.claim.sub = 'b2000000-0000-0000-0000-00000000000c';
select pg_temp.check((select count(*) = 2 from public.attendance_sessions) and (select count(*) = 2 * (select count(*) from sq) from public.attendance_marks), 'medical staff read the club attendance');
select pg_temp.raises($$ select pg_temp.save(current_date - 2, 'training', (select marks from mk)) $$, 'forbidden', 'medical staff cannot record attendance');
select pg_temp.check(pg_temp.rows_changed($$ delete from public.attendance_sessions $$) = 0, 'medical staff cannot delete sessions (0 rows change)');
-- Other club, federation, fan, anon
set request.jwt.claim.sub = 'b2000000-0000-0000-0000-00000000000b';
select pg_temp.check((select count(*) = 0 from public.attendance_sessions) and (select count(*) = 0 from public.attendance_marks), 'club B reads none of club A attendance');
select pg_temp.check(pg_temp.code(pg_temp.save(current_date - 1, 'training', (select marks from mk))) = 'unknown_player', 'club B cannot mark club A players');
select pg_temp.check(pg_temp.rows_changed($$ delete from public.attendance_sessions $$) = 0, 'club B cannot delete club A sessions (0 rows change)');
set request.jwt.claim.sub = 'b2000000-0000-0000-0000-00000000000d';
select pg_temp.check((select count(*) = 0 from public.attendance_sessions) and (select count(*) = 0 from public.attendance_marks), 'the federation sees no attendance');
select pg_temp.raises($$ select pg_temp.save(current_date - 1, 'training', (select marks from mk)) $$, 'forbidden', 'the federation cannot record attendance');
set request.jwt.claim.sub = 'b2000000-0000-0000-0000-00000000000f';
select pg_temp.raises($$ select pg_temp.save(current_date - 1, 'training', (select marks from mk)) $$, 'forbidden', 'a fan cannot record attendance');
reset role;
set role anon;
select pg_temp.denied($$ select * from public.attendance_marks $$, 'anon cannot read attendance');
select pg_temp.denied($$ select pg_temp.save(current_date - 1, 'training', (select marks from mk)) $$, 'anon cannot run save_attendance');
reset role;

-- Owner deletes a session; a withdrawn player disappears from the marks, the session stays
set role authenticated; set request.jwt.claim.sub = 'b2000000-0000-0000-0000-00000000000a';
select pg_temp.check(pg_temp.rows_changed($$ delete from public.attendance_sessions where kind = 'match' $$) = 1, 'the owner can delete a session');
select pg_temp.check((select count(*) = (select count(*) from sq) from public.attendance_marks), 'deleting a session deletes its marks');
reset role;
delete from public.players where id = (select id from sq where num = 8);
select pg_temp.check((select count(*) = 1 from public.attendance_sessions) and (select count(*) = (select count(*) from sq) - 1 from public.attendance_marks), 'deleting a player (consent withdrawal) removes their marks, the session stays');
