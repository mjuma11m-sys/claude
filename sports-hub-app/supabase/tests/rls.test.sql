-- Attacks the fan/staff firewall. Any failed check raises and stops the run (ON_ERROR_STOP).
\set ON_ERROR_STOP on
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as
  $$ begin if not ok then raise exception 'FAIL: %', what; end if; raise notice 'ok  %', what; end $$;

-- Seed as superuser
insert into public.clubs (id, name) values
  ('c0000000-0000-0000-0000-00000000000a', 'المالكية'), ('c0000000-0000-0000-0000-00000000000b', 'المحرق');
insert into auth.users (id) values
  ('a0000000-0000-0000-0000-000000000001'),  -- fan
  ('a0000000-0000-0000-0000-000000000002'),  -- medical, club A
  ('a0000000-0000-0000-0000-000000000003'),  -- club admin, club A
  ('a0000000-0000-0000-0000-000000000004');  -- medical, club B
select pg_temp.check((select count(*) = 4 from public.profiles where role = 'fan'), 'every sign-up starts as fan');
update public.profiles set role = 'medical', club_id = 'c0000000-0000-0000-0000-00000000000a' where id = 'a0000000-0000-0000-0000-000000000002';
update public.profiles set role = 'club_admin', club_id = 'c0000000-0000-0000-0000-00000000000a' where id = 'a0000000-0000-0000-0000-000000000003';
update public.profiles set role = 'medical', club_id = 'c0000000-0000-0000-0000-00000000000b' where id = 'a0000000-0000-0000-0000-000000000004';

do $$ begin
  update public.profiles set role = 'medical', club_id = null where id = 'a0000000-0000-0000-0000-000000000001';
  raise exception 'FAIL: staff without a club was accepted';
exception when check_violation then raise notice 'ok  staff must belong to a club';
end $$;

-- Anonymous visitor
set role anon;
select pg_temp.check((select count(*) = 2 from public.clubs), 'anon reads club names');
select pg_temp.check((select count(*) = 0 from public.profiles), 'anon reads no profiles');
do $$ begin
  perform public.my_role();
  raise exception 'FAIL: anon executed my_role()';
exception when insufficient_privilege then raise notice 'ok  anon cannot call my_role()';
end $$;
reset role;

-- Fan
set role authenticated;
set request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
select pg_temp.check((select count(*) = 1 from public.profiles), 'fan sees only own profile');
do $$ begin
  update public.profiles set role = 'bfa_admin' where id = auth.uid();
  raise exception 'FAIL: fan promoted themselves';
exception when insufficient_privilege then raise notice 'ok  fan cannot change own role';
end $$;
update public.profiles set full_name = 'مشجع' where id = auth.uid();
select pg_temp.check((select full_name = 'مشجع' from public.profiles), 'fan edits own name');
update public.profiles set full_name = 'x' where id = 'a0000000-0000-0000-0000-000000000002';
reset role;
select pg_temp.check((select full_name is null from public.profiles where id = 'a0000000-0000-0000-0000-000000000002'), 'fan cannot edit someone else');

-- Club admin, club A
set role authenticated;
set request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000003';
select pg_temp.check((select count(*) = 2 from public.profiles), 'club admin sees own club staff (2)');
select pg_temp.check(not exists (select 1 from public.profiles where id = 'a0000000-0000-0000-0000-000000000004'), 'club admin cannot see another club');
select pg_temp.check(not exists (select 1 from public.profiles where id = 'a0000000-0000-0000-0000-000000000001'), 'club admin cannot see fans');

-- Medical, club A: not a club admin, so own row only
set request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000002';
select pg_temp.check((select count(*) = 1 from public.profiles), 'medical staff see own profile only');

-- Right to erasure
set request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
select public.delete_my_account();
reset role;
select pg_temp.check(not exists (select 1 from auth.users where id = 'a0000000-0000-0000-0000-000000000001'), 'delete_my_account removes the user');
select pg_temp.check(not exists (select 1 from public.profiles where id = 'a0000000-0000-0000-0000-000000000001'), 'and their profile');
select pg_temp.check((select count(*) = 3 from auth.users), 'and nobody else');
