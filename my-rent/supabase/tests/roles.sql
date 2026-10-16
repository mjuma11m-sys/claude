-- اختبار الصلاحيات (DW-030): مالك / عضو / مشاهد. يطلع "PASS: …" لكل بند.
\set ON_ERROR_STOP on
create function pg_temp.as_user(u text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u, false); execute 'set role authenticated'; end $$;
create function pg_temp.ok(c boolean, msg text) returns void language plpgsql as $$
begin if not c then raise exception 'FAIL: %', msg; end if; raise notice 'PASS: %', msg; end $$;

-- المالك O يسوي مساحة + دعوتين (عضو ومشاهد)
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select public.create_family('عائلة الصلاحيات') as f \gset
select set_config('t.f', :'f', false) \gset
select public.create_invite_as(:'f', true) as cm \gset
select public.create_invite_as(:'f', false) as cv \gset
select public.set_my_name(:'f', 'أبو جعفر');
reset role;

-- العضو M ينضم ويكتب
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select public.join_family(:'cm');
select pg_temp.ok((select can_edit from public.family_members where user_id = auth.uid()), 'دعوة عضو = يعدّل');
insert into public.events (family_id, client_id, action) values (:'f', 'evt-m-0001', '{"type":"pay"}');
select pg_temp.ok((select count(*) from public.events) = 1, 'العضو يكتب حدث');
reset role;

-- المشاهد V ينضم: يقرأ، ما يكتب، ما يدعو، ما يغيّر الأدوار
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select public.join_family(:'cv');
select pg_temp.ok(not (select can_edit from public.family_members where user_id = auth.uid()), 'دعوة مشاهد = can_edit false');
select pg_temp.ok((select count(*) from public.events) = 1, 'المشاهد يقرأ الأحداث');
select pg_temp.ok((select count(*) from public.family_members where display_name = 'أبو جعفر') = 1, 'المشاهد يشوف اسم المالك');
do $$ begin
  begin insert into public.events (family_id, client_id, action) values (current_setting('t.f')::uuid, 'evt-v-0001', '{"type":"pay"}');
    raise exception 'FAIL: المشاهد كتب';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; if sqlstate <> '42501' then raise exception 'FAIL: خطأ غير متوقع %', sqlstate; end if; raise notice 'PASS: المشاهد ما يقدر يكتب (RLS)'; end;
end $$;
do $$ begin
  begin perform public.create_invite(current_setting('t.f')::uuid); raise exception 'FAIL: المشاهد دعا';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'PASS: المشاهد ما يقدر يدعو'; end;
end $$;
do $$ begin
  begin perform public.set_member_access(current_setting('t.f')::uuid, '00000000-0000-0000-0000-0000000000c1', true); raise exception 'FAIL: المشاهد رقّى نفسه';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'PASS: المشاهد ما يرقّي نفسه'; end;
end $$;
do $$ begin
  begin update public.family_members set can_edit = true where user_id = auth.uid(); 
    if (select can_edit from public.family_members where user_id = auth.uid()) then raise exception 'FAIL: update مباشر'; end if;
    raise notice 'PASS: ما يقدر يعدّل دوره مباشرة';
  exception when insufficient_privilege then raise notice 'PASS: ما يقدر يعدّل دوره مباشرة'; end;
end $$;
reset role;

-- العضو ما يغيّر الأدوار
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
do $$ begin
  begin perform public.set_member_access(current_setting('t.f')::uuid, '00000000-0000-0000-0000-0000000000c1', true); raise exception 'FAIL: عضو غيّر دور';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'PASS: العضو ما يغيّر الأدوار'; end;
end $$;
select public.create_invite(:'f') as cold \gset
select pg_temp.ok((select can_edit from public.family_invites where code = :'cold'), 'الدالة القديمة create_invite = عضو يعدّل');
reset role;

-- المالك يرقّي المشاهد، وبعدها يقدر يكتب
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select public.set_member_access(:'f', '00000000-0000-0000-0000-0000000000c1', true);
select public.set_member_access(:'f', '00000000-0000-0000-0000-0000000000a1', false);
select pg_temp.ok(public.is_family_editor(:'f'), 'المالك ما ينزّل نفسه');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
insert into public.events (family_id, client_id, action) values (:'f', 'evt-v-0002', '{"type":"pay"}');
select pg_temp.ok((select count(*) from public.events) = 2, 'بعد الترقية: يكتب');
select public.leave_family(:'f');
select pg_temp.ok((select count(*) from public.events) = 0, 'يطلع من العائلة وما يشوف شي');
reset role;
