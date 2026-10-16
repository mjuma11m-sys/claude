-- Attacks the onboarding function: only the database owner can run it, and it can only do what a client needs.
\set ON_ERROR_STOP on
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as
  $$ begin if ok is distinct from true then raise exception 'FAIL: %', what; end if; raise notice 'ok  %', what; end $$;
create function pg_temp.denied(sql text, what text) returns void language plpgsql as
  $$ begin execute sql; raise exception 'FAIL: %', what;
     exception when insufficient_privilege or check_violation or foreign_key_violation or unique_violation then raise notice 'ok  %', what; end $$;
create function pg_temp.raises(sql text, msg text, what text) returns void language plpgsql as
  $$ begin execute sql; raise exception 'FAIL: % (nothing raised)', what;
     exception when raise_exception then if sqlerrm = msg then raise notice 'ok  %', what; else raise exception 'FAIL: % (got %)', what, sqlerrm; end if; end $$;

insert into auth.users (id, email) values ('f6000000-0000-0000-0000-00000000000a', 'Coach@Example.com'), ('f6000000-0000-0000-0000-00000000000b', 'doc@example.com'), ('f6000000-0000-0000-0000-00000000000c', 'fed@example.com'), ('f6000000-0000-0000-0000-00000000000d', 'fan@example.com');

select pg_temp.check(public.admin_provision_staff(' coach@example.com ', 'club_admin', 'نادي عميل جديد', 'second') ->> 'ok' = 'true', 'the owner can make an account a club admin (email is trimmed and case-insensitive)');
select pg_temp.check((select role = 'club_admin' and club_id = (select id from public.clubs where name = 'نادي عميل جديد') from public.profiles where id = 'f6000000-0000-0000-0000-00000000000a'), 'the profile now has the role and the new club');
select pg_temp.check((select league_id = 'second' and not is_fictional from public.clubs where name = 'نادي عميل جديد'), 'the club is created in its division and is a real (not fictional) client');
select pg_temp.check(public.admin_provision_staff('doc@example.com', 'medical', 'نادي عميل جديد') ->> 'ok' = 'true', 'a second person is provisioned');
select pg_temp.check((select club_id from public.profiles where id = 'f6000000-0000-0000-0000-00000000000b') = (select id from public.clubs where name = 'نادي عميل جديد'), 'and joins the same club (no duplicate club)');
select pg_temp.check((select count(*) = 1 from public.clubs where name = 'نادي عميل جديد'), 'there is still one club of that name');
select pg_temp.check(public.admin_provision_staff('fed@example.com', 'bfa_admin') ->> 'ok' = 'true', 'the federation account is provisioned');
select pg_temp.check((select role = 'bfa_admin' and club_id is null from public.profiles where id = 'f6000000-0000-0000-0000-00000000000c'), 'and has no club');
select pg_temp.raises($$ select public.admin_provision_staff('nobody@example.com', 'club_admin', 'نادي') $$, 'user_not_found', 'an email that never signed up is refused');
select pg_temp.raises($$ select public.admin_provision_staff('coach@example.com', 'club_admin') $$, 'club_required', 'a club role without a club is refused');
select pg_temp.raises($$ select public.admin_provision_staff('coach@example.com', 'club_admin', 'x') $$, 'club_required', 'a one-letter club name is refused');
select pg_temp.raises($$ select public.admin_provision_staff('coach@example.com', 'club_admin', 'نادي ثاني', 'no_such_league') $$, 'unknown_league', 'an unknown division is refused');
select pg_temp.check(public.admin_provision_staff('fan@example.com', 'fan') ->> 'ok' = 'true', 'a role can be reset to fan (no club)');

-- nobody on the API can call it, however signed in
set role authenticated; set request.jwt.claim.sub = 'f6000000-0000-0000-0000-00000000000d';
select pg_temp.denied($$ select public.admin_provision_staff('fan@example.com', 'club_admin', 'نادي عميل جديد') $$, 'a signed-in fan cannot promote themselves');
set request.jwt.claim.sub = 'f6000000-0000-0000-0000-00000000000a';
select pg_temp.denied($$ select public.admin_provision_staff('coach@example.com', 'bfa_admin') $$, 'a club admin cannot make themselves the federation');
reset role; set role anon;
select pg_temp.denied($$ select public.admin_provision_staff('fan@example.com', 'club_admin', 'نادي عميل جديد') $$, 'anon cannot call it');
reset role;
select pg_temp.check((select role = 'fan' and club_id is null from public.profiles where id = 'f6000000-0000-0000-0000-00000000000d'), 'every refused attempt left the fan a fan');
