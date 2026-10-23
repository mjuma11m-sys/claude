-- حذف الحساب + حذف ملفات العقود (DW-038). يطلع "PASS: …" لكل بند.
\set ON_ERROR_STOP on
create function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u, false); execute 'set role authenticated'; end $$;
create function pg_temp.ok(c boolean, msg text) returns void language plpgsql as $$
begin if not c then raise exception 'FAIL: %', msg; end if; raise notice 'PASS: %', msg; end $$;
insert into auth.users values ('00000000-0000-0000-0000-0000000000d1'), ('00000000-0000-0000-0000-0000000000e1'), ('00000000-0000-0000-0000-0000000000f1');

-- المالك D يسوي مساحة ويرفع عقد، والعضو E ينضم، وF عنده مساحة ثانية
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select public.create_family('عائلة الحذف') as f \gset
select public.create_invite_as(:'f', true) as code \gset
insert into public.events (family_id, client_id, action) values (:'f', 'evt-d-0001', '{"type":"pay"}');
insert into storage.objects (bucket_id, name) values ('contracts', :'f' || '/u1/عقد.pdf');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
select public.join_family(:'code');
-- العضو ما يحذف ملفات العائلة
delete from storage.objects where name like :'f' || '/%';
select pg_temp.ok((select count(*) from storage.objects where name like :'f' || '/%') = 1, 'العضو ما يقدر يحذف ملف عقد');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select public.create_family('عائلة ثانية') as g \gset
insert into storage.objects (bucket_id, name) values ('contracts', :'g' || '/u9/x.pdf');
-- مالك عائلة ثانية ما يحذف ملفات غيره
delete from storage.objects where name like :'f' || '/%';
select pg_temp.ok((select count(*) from storage.objects where name like :'f' || '/%') = 1, 'مالك ثاني ما يحذف ملفات عائلة غيره');
reset role;

-- المالك يحذف ملفاته (قبل حذف الحساب)
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
delete from storage.objects where name like :'f' || '/%';
select pg_temp.ok((select count(*) from storage.objects where name like :'f' || '/%') = 0, 'المالك يحذف ملفات عقود عائلته');
-- العضو يحذف حسابه: عضويته تروح بس، والعائلة باقية
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
select public.delete_my_account();
reset role;
select pg_temp.ok(not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-0000000000e1'), 'العضو: حسابه انحذف');
select pg_temp.ok(exists (select 1 from public.families where id = :'f') and (select count(*) from public.family_members where family_id = :'f') = 1, 'العضو: العائلة باقية للمالك');
-- المالك يحذف حسابه: العائلة وأحداثها تروح، والعائلة الثانية ما تتأثر
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select public.delete_my_account();
reset role;
select pg_temp.ok(not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-0000000000d1'), 'المالك: حسابه انحذف');
select pg_temp.ok(not exists (select 1 from public.families where id = :'f') and (select count(*) from public.events where family_id = :'f') = 0, 'المالك: العائلة وأحداثها انحذفت');
select pg_temp.ok(exists (select 1 from public.families where id = :'g') and exists (select 1 from auth.users where id = '00000000-0000-0000-0000-0000000000f1'), 'عائلة ثانية ما تتأثر');
-- بدون دخول ينرفض
set role anon;
do $$ begin perform public.delete_my_account(); raise exception 'FAIL: anon deleted'; exception when insufficient_privilege then raise notice 'PASS: %', 'بدون دخول: ممنوع'; end $$;
reset role;
