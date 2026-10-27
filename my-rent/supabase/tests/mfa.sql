-- DW-045: التحقق بخطوتين مفروض بالقاعدة. يطلع "PASS: …" لكل بند.
\set ON_ERROR_STOP on
create function pg_temp.as_user(u text, aal text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u, false); perform set_config('request.jwt.claims', json_build_object('sub', u, 'aal', aal)::text, false); execute 'set role authenticated'; end $$;
create function pg_temp.ok(c boolean, msg text) returns void language plpgsql as $$
begin if not c then raise exception 'FAIL: %', msg; end if; raise notice 'PASS: %', msg; end $$;
insert into auth.users values ('00000000-0000-0000-0000-00000000a0a1'), ('00000000-0000-0000-0000-00000000b0b1') on conflict do nothing;

-- A بدون تحقق بخطوتين: يشتغل عادي بـ aal1
select pg_temp.as_user('00000000-0000-0000-0000-00000000a0a1', 'aal1');
select public.create_family('عائلة A') as fa \gset
insert into public.events (family_id, client_id, action) values (:'fa', 'evt-mfa-0001', '{"type":"pay"}');
select pg_temp.ok((select count(*) from public.events where family_id = :'fa') = 1, 'بدون تحقق بخطوتين: aal1 يقرا ويكتب عادي');
reset role;

-- A يفعّل TOTP: aal1 ما يشوف ولا يكتب، aal2 يشوف ويكتب
insert into auth.mfa_factors (user_id, status) values ('00000000-0000-0000-0000-00000000a0a1', 'verified');
select set_config('my.fa', :'fa', false);
select pg_temp.as_user('00000000-0000-0000-0000-00000000a0a1', 'aal1');
select pg_temp.ok((select count(*) from public.events where family_id = :'fa') = 0, 'مفعّل وبكلمة السر بس (aal1): ما يشوف أي حدث');
select pg_temp.ok((select count(*) from public.families) = 0, 'مفعّل وaal1: ما يشوف العائلة');
do $$ begin
  insert into public.events (family_id, client_id, action) values (current_setting('my.fa')::uuid, 'evt-mfa-0002', '{"type":"pay"}');
  raise exception 'FAIL: aal1 كتب حدث';
exception when insufficient_privilege or others then
  if sqlerrm like 'FAIL:%' then raise; end if; raise notice 'PASS: مفعّل وaal1: ما يقدر يكتب';
end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000a0a1', 'aal2');
select pg_temp.ok((select count(*) from public.events where family_id = :'fa') = 1, 'بعد الرمز (aal2): يشوف بياناته');
insert into public.events (family_id, client_id, action) values (:'fa', 'evt-mfa-0003', '{"type":"pay"}');
select pg_temp.ok((select count(*) from public.events where family_id = :'fa') = 2, 'aal2: يكتب عادي');
reset role;

-- عامل غير مؤكّد (unverified) ما يقفل الحساب
insert into auth.mfa_factors (user_id, status) values ('00000000-0000-0000-0000-00000000b0b1', 'unverified');
select pg_temp.as_user('00000000-0000-0000-0000-00000000b0b1', 'aal1');
select public.create_family('عائلة B') as fb \gset
select pg_temp.ok((select count(*) from public.families where id = :'fb') = 1, 'عامل ما تأكّد: ما يقفل صاحبه');
reset role;
