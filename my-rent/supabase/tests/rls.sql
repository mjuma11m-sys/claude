-- اختبار RLS والدوال (DW-018). يطلع "PASS: …" لكل بند، وأي فشل يوقف السكربت.
\set ON_ERROR_STOP on
create function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u, false); execute 'set role authenticated'; end $$;
create function pg_temp.ok(c boolean, msg text) returns void language plpgsql as $$
begin if not c then raise exception 'FAIL: %', msg; end if; raise notice 'PASS: %', msg; end $$;

-- A ينشئ عائلة ويضيف حدث
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.create_family('عائلة أ') as fa \gset
select set_config('t.fa', :'fa', false) \gset
insert into public.events (family_id, client_id, action) values (:'fa', 'evt-a-0001', '{"type":"pay"}');
select pg_temp.ok((select count(*) from public.events) = 1, 'العضو يضيف ويقرأ حدث عائلته');
select pg_temp.ok((select role from public.family_members where user_id = auth.uid()) = 'owner', 'المنشئ owner');
select public.create_invite(:'fa') as code \gset
select pg_temp.ok(:'code' ~ '^[A-Z2-9]{6}$', 'كود الدعوة 6 حروف');
reset role;

-- B غريب: ما يشوف ولا يضيف
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.ok((select count(*) from public.events) = 0, 'غريب يشوف 0 أحداث');
select pg_temp.ok((select count(*) from public.families) = 0, 'غريب يشوف 0 عائلات');
do $$ begin
  insert into public.events (family_id, client_id, action) select id, 'evt-b-0001', '{"type":"x"}' from public.families;
  perform pg_temp.ok(true, 'غريب: insert ما لقى عائلة');
end $$;
do $$ begin
  begin insert into public.events (family_id, client_id, action) values (current_setting('t.fa')::uuid, 'evt-b-0002', '{"type":"x"}');
    raise exception 'FAIL: غريب أضاف حدث';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; if sqlstate <> '42501' then raise exception 'FAIL: خطأ غير متوقع %', sqlstate; end if; raise notice 'PASS: غريب ما يقدر يضيف حدث لعائلة يعرف رقمها (RLS)'; end;
end $$;
do $$ begin
  begin perform public.join_family('ZZZZZZ'); raise exception 'FAIL: كود غلط قبل';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'PASS: كود غلط ينرفض'; end;
end $$;
-- B ينضم بالكود الصحيح
select public.join_family(lower(:'code')) = :'fa'::uuid as joined \gset
select pg_temp.ok(:'joined', 'الانضمام بالكود (حروف صغيرة مقبولة)');
select pg_temp.ok((select count(*) from public.events) = 1, 'بعد الانضمام يشوف أحداث العائلة');
insert into public.events (family_id, client_id, action) values (:'fa', 'evt-b-0003', '{"type":"expense"}');
-- ما فيه تعديل ولا حذف
do $$ declare n int; begin
  begin update public.events set action = '{"type":"hack"}'; raise exception 'FAIL: update نجح';
  exception when insufficient_privilege then raise notice 'PASS: update مرفوض'; end;
  begin delete from public.events; raise exception 'FAIL: delete نجح';
  exception when insufficient_privilege then raise notice 'PASS: delete مرفوض'; end;
end $$;
do $$ begin
  begin perform public.delete_family(current_setting('t.fa')::uuid); raise exception 'FAIL: عضو حذف العائلة';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'PASS: العضو ما يحذف العائلة'; end;
end $$;
-- نفس client_id ما يتكرر
do $$ begin
  begin insert into public.events (family_id, client_id, action) select id, 'evt-b-0003', '{"type":"expense"}' from public.families;
    raise exception 'FAIL: حدث مكرر';
  exception when unique_violation then raise notice 'PASS: نفس client_id ما يتكرر'; end;
end $$;
-- B ما يقدر يكتب بإسم A
do $$ begin
  begin insert into public.events (family_id, user_id, client_id, action) select id, '00000000-0000-0000-0000-00000000000a', 'evt-b-0004', '{"type":"x"}' from public.families;
    raise exception 'FAIL: انتحال';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'PASS: ما يكتب بإسم عضو ثاني'; end;
end $$;
reset role;

-- anon ما يشوف شي
set role anon;
do $$ begin
  begin perform count(*) from public.events; raise exception 'FAIL: anon قرأ';
  exception when insufficient_privilege then raise notice 'PASS: anon ممنوع'; end;
end $$;
reset role;

-- كود منتهي
update public.family_invites set expires_at = now() - interval '1 minute';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$ begin
  begin perform public.join_family((select code from public.family_invites limit 1)); raise exception 'FAIL: كود منتهي قبل';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'PASS: الكود المنتهي ينرفض'; end;
end $$;
reset role;

-- المالك يحذف العائلة كاملة
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.delete_family(:'fa');
reset role;
select pg_temp.ok((select count(*) from public.events) = 0 and (select count(*) from public.family_members) = 0, 'حذف المالك يمسح الأحداث والأعضاء');
