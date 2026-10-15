-- إداراتي · إعداد كامل بلصقة وحدة (DW-018 + DW-019): SQL Editor ← الصق ← Run
-- يركّب الجداول والصلاحيات (RLS) والدوال، وكل حساب له مساحة خاصة فيه.


create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.family_members (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);
create index family_members_user_idx on public.family_members (user_id);

create table public.family_invites (
  code text primary key check (code ~ '^[A-Z2-9]{6}$'),
  family_id uuid not null references public.families (id) on delete cascade,
  created_by uuid not null default auth.uid(),
  expires_at timestamptz not null default now() + interval '48 hours'
);

create table public.events (
  id bigint generated always as identity primary key,
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null default auth.uid(),
  client_id text not null check (char_length(client_id) between 8 and 40), -- يمنع التكرار لو الطابور انرفع مرتين
  action jsonb not null check (jsonb_typeof(action) = 'object' and action ? 'type'),
  created_at timestamptz not null default now(),
  unique (family_id, client_id)
);
create index events_family_idx on public.events (family_id, id);

-- عضو؟ (security definer عشان ما يدخل بحلقة RLS على family_members)
create function public.is_family_member(f uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.family_members m where m.family_id = f and m.user_id = auth.uid());
$$;

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invites enable row level security;
alter table public.events enable row level security;

create policy "members read family" on public.families for select to authenticated using (public.is_family_member(id));
create policy "members read members" on public.family_members for select to authenticated using (public.is_family_member(family_id));
create policy "members read invites" on public.family_invites for select to authenticated using (public.is_family_member(family_id));
create policy "members read events" on public.events for select to authenticated using (public.is_family_member(family_id));
create policy "members add events" on public.events for insert to authenticated
  with check (public.is_family_member(family_id) and user_id = auth.uid());
-- ما فيه policy لـ update/delete = مرفوضة للكل

revoke all on public.families, public.family_members, public.family_invites, public.events from anon;
revoke insert, update, delete on public.families, public.family_members, public.family_invites from authenticated;
revoke update, delete on public.events from authenticated;
grant select on public.families, public.family_members, public.family_invites to authenticated;
grant select, insert on public.events to authenticated;

-- إنشاء عائلة: المنشئ يصير owner
create function public.create_family(family_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare f uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.families (name, created_by) values (family_name, auth.uid()) returning id into f;
  insert into public.family_members (family_id, user_id, role) values (f, auth.uid(), 'owner');
  return f;
end $$;

-- كود دعوة (أي عضو) — 6 حروف بدون 0/O/1/I عشان ما تنقرا غلط
create function public.create_invite(f uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare c text; alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if not public.is_family_member(f) then raise exception 'not a member'; end if;
  loop
    c := '';
    for i in 1..6 loop c := c || substr(alphabet, 1 + floor(random() * 32)::int, 1); end loop;
    exit when not exists (select 1 from public.family_invites where code = c);
  end loop;
  insert into public.family_invites (code, family_id, created_by) values (c, f, auth.uid());
  return c;
end $$;

-- الانضمام بالكود: لازم ما يكون منتهي
create function public.join_family(invite_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare f uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select family_id into f from public.family_invites where code = upper(trim(invite_code)) and expires_at > now();
  if f is null then raise exception 'invalid or expired code'; end if;
  insert into public.family_members (family_id, user_id) values (f, auth.uid()) on conflict do nothing;
  return f;
end $$;

-- حذف العائلة كاملة (الأحداث والأعضاء والدعوات): المالك بس
create function public.delete_family(f uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.family_members where family_id = f and user_id = auth.uid() and role = 'owner') then
    raise exception 'owner only';
  end if;
  delete from public.families where id = f;
end $$;

-- عضو يطلع (يحذف عضويته بس)
create function public.leave_family(f uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.family_members where family_id = f and user_id = auth.uid() and role = 'member';
$$;

revoke all on function public.create_family(text), public.create_invite(uuid), public.join_family(text),
  public.delete_family(uuid), public.leave_family(uuid), public.is_family_member(uuid) from public, anon;
grant execute on function public.create_family(text), public.create_invite(uuid), public.join_family(text),
  public.delete_family(uuid), public.leave_family(uuid), public.is_family_member(uuid) to authenticated;

-- Realtime: الأحداث الجديدة توصل للأجهزة الثانية (RLS ينطبق على الاشتراك)
alter publication supabase_realtime add table public.events;

create unique index families_one_per_owner on public.families (created_by);

create or replace function public.create_family(family_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare f uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select id into f from public.families where created_by = auth.uid();
  if f is not null then return f; end if;
  insert into public.families (name, created_by) values (family_name, auth.uid()) returning id into f;
  insert into public.family_members (family_id, user_id, role) values (f, auth.uid(), 'owner');
  return f;
end $$;
revoke all on function public.create_family(text) from public, anon;
grant execute on function public.create_family(text) to authenticated;
