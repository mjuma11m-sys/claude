-- DW-030: صلاحيات العائلة — المالك / عضو يعدّل / مشاهد (can_edit = false) + اسم العضو.
-- إضافات بس (بدون drop): الأعمدة الجديدة افتراضها true فالأعضاء الموجودين ما ينكسرون،
-- والمنع بسياسات restrictive تنضاف فوق الموجودة.

alter table public.family_members add column if not exists can_edit boolean not null default true;
alter table public.family_members add column if not exists display_name text check (display_name is null or char_length(display_name) between 1 and 40);
alter table public.family_invites add column if not exists can_edit boolean not null default true;

-- يقدر يكتب؟ المالك دايماً، والعضو لو can_edit
create or replace function public.is_family_editor(f uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.family_members m where m.family_id = f and m.user_id = auth.uid() and (m.role = 'owner' or m.can_edit));
$$;

-- الأحداث: لازم محرّر (restrictive = تنضاف بـ AND على السياسة الموجودة)
create policy "editors only write events" on public.events as restrictive for insert to authenticated
  with check (public.is_family_editor(family_id));

-- الدعوة: المحرّر بس يدعو. القديمة (بدون صلاحية) = عضو يعدّل
create or replace function public.create_invite_as(f uuid, edit boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare c text; alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if not public.is_family_editor(f) then raise exception 'editors only'; end if;
  loop
    c := '';
    for i in 1..6 loop c := c || substr(alphabet, 1 + floor(random() * 32)::int, 1); end loop;
    exit when not exists (select 1 from public.family_invites where code = c);
  end loop;
  insert into public.family_invites (code, family_id, created_by, can_edit) values (c, f, auth.uid(), coalesce(edit, true));
  return c;
end $$;

create or replace function public.create_invite(f uuid) returns text
language sql security definer set search_path = '' as $$ select public.create_invite_as(f, true) $$;

create or replace function public.join_family(invite_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare f uuid; e boolean;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select family_id, can_edit into f, e from public.family_invites where code = upper(trim(invite_code)) and expires_at > now();
  if f is null then raise exception 'invalid or expired code'; end if;
  insert into public.family_members (family_id, user_id, can_edit) values (f, auth.uid(), e) on conflict do nothing;
  return f;
end $$;

-- اسمي داخل العائلة (يشوفه أعضاء العائلة بس)
create or replace function public.set_my_name(f uuid, n text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.family_members set display_name = nullif(left(trim(n), 40), '') where family_id = f and user_id = auth.uid();
end $$;

-- المالك بس يغيّر صلاحية عضو (يعدّل ⇄ مشاهد). صف المالك ما يتغيّر.
create or replace function public.set_member_access(f uuid, member uuid, edit boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.family_members where family_id = f and user_id = auth.uid() and role = 'owner') then
    raise exception 'owner only';
  end if;
  update public.family_members set can_edit = coalesce(edit, true) where family_id = f and user_id = member and role <> 'owner';
end $$;

revoke all on function public.is_family_editor(uuid), public.create_invite_as(uuid, boolean), public.create_invite(uuid),
  public.join_family(text), public.set_my_name(uuid, text), public.set_member_access(uuid, uuid, boolean) from public, anon;
grant execute on function public.is_family_editor(uuid), public.create_invite_as(uuid, boolean), public.create_invite(uuid),
  public.join_family(text), public.set_my_name(uuid, text), public.set_member_access(uuid, uuid, boolean) to authenticated;
