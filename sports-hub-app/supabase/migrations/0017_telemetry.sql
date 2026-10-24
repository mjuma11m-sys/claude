-- Self-hosted error reports and screen counts, so we know when something breaks at a club and which screens a club actually opens.
-- Nothing personal: no names, no emails, no values. Errors keep a short sanitised message, the route pattern and the app version.
-- Screen counts are per club, day and route (no user). Written only through the two RPCs below by signed-in people; read only from the
-- SQL Editor (service role): clients get no read access at all.

create table public.client_errors (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  club_id uuid,
  route   text not null check (length(route) <= 80),
  message text not null check (length(message) <= 200),
  stack   text check (length(stack) <= 600),
  version text check (length(version) <= 20)
);
create index client_errors_at_idx on public.client_errors (at desc);
create index client_errors_user_idx on public.client_errors (user_id);

create table public.screen_views (
  club_id uuid not null,
  day     date not null default current_date,
  route   text not null,
  views   integer not null default 1 check (views >= 1),
  primary key (club_id, day, route),
  check (route in ('/club', '/lineup', '/analysis', '/attendance', '/development', '/data', '/rights', '/report', '/player/:id', '/medical', '/standings', '/settings'))
);

alter table public.client_errors enable row level security;
alter table public.screen_views enable row level security;
revoke all on public.client_errors, public.screen_views from anon, authenticated;

-- report_client_error(route, message, stack, version) -> boolean (false when the per-person daily cap of 30 is reached).
create function public.report_client_error(p_route text, p_message text, p_stack text default null, p_version text default null) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'forbidden'; end if;
  if (select count(*) from public.client_errors where user_id = v_user and at >= date_trunc('day', now())) >= 30 then return false; end if;
  insert into public.client_errors (user_id, club_id, route, message, stack, version)
    values (v_user, (select public.my_club()), left(coalesce(p_route, '?'), 80), left(coalesce(nullif(btrim(p_message), ''), '?'), 200), left(p_stack, 600), left(p_version, 20));
  return true;
end $$;

-- track_screen(route) -> void. Club staff only; the route must be one of the known screens; one counter per club, day and route.
create function public.track_screen(p_route text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_club uuid := (select public.my_club());
begin
  if (select public.my_role()) not in ('club_admin', 'medical') or v_club is null then raise exception 'forbidden'; end if;
  insert into public.screen_views (club_id, day, route) values (v_club, current_date, p_route)
    on conflict (club_id, day, route) do update set views = least(public.screen_views.views + 1, 100000);
end $$;

revoke execute on function public.report_client_error(text, text, text, text), public.track_screen(text) from public, anon;
grant execute on function public.report_client_error(text, text, text, text), public.track_screen(text) to authenticated;
