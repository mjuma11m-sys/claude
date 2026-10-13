-- Sports Hub: roles and the fan/staff firewall.
-- The UI hides links; this file is what actually stops a fan from reading staff data.

create type public.app_role as enum ('fan', 'player', 'medical', 'club_admin', 'bfa_admin');

create table public.clubs (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique
);

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       public.app_role not null default 'fan',
  club_id    uuid references public.clubs (id),
  full_name  text,
  created_at timestamptz not null default now(),
  -- staff belong to a club; fans and the federation do not have to
  constraint staff_has_club check (role in ('fan', 'bfa_admin') or club_id is not null)
);
create index profiles_club_idx on public.profiles (club_id);

alter table public.clubs enable row level security;
alter table public.profiles enable row level security;

-- Helpers run as definer so policies can read the caller's role without recursing into profiles RLS.
create function public.my_role() returns public.app_role
  language sql stable security definer set search_path = '' as
  $$ select role from public.profiles where id = auth.uid() $$;

create function public.my_club() returns uuid
  language sql stable security definer set search_path = '' as
  $$ select club_id from public.profiles where id = auth.uid() $$;

revoke execute on function public.my_role(), public.my_club() from public, anon;
grant execute on function public.my_role(), public.my_club() to authenticated;

create policy "clubs are public" on public.clubs for select to anon, authenticated using (true);

create policy "read own profile" on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "club admin reads own club staff" on public.profiles for select to authenticated
  using ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()));

-- Users may edit their name only. role and club_id change through the service role (admin panel), never from the client.
create policy "update own name" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- Every new sign-up starts as a fan.
create function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = '' as
  $$ begin insert into public.profiles (id) values (new.id); return new; end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
