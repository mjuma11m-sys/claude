-- Onboarding a client: attach a signed-up account to a club with a role. Run it yourself from the Supabase SQL Editor (service role);
-- it is NOT callable from the app or the API (execute is revoked from every client role), so nobody can promote themselves.
-- A new sign-up is a fan with no club. This is the only door to club_admin, medical or bfa_admin.

create function public.admin_provision_staff(p_email text, p_role public.app_role, p_club text default null, p_league text default null) returns jsonb
language plpgsql set search_path = '' as $$
declare v_user uuid; v_club uuid;
begin
  select id into v_user from auth.users where lower(email) = lower(btrim(p_email)) limit 1;
  if v_user is null then raise exception 'user_not_found'; end if;
  if p_role in ('club_admin', 'medical') then
    if p_club is null or length(btrim(p_club)) not between 2 and 80 then raise exception 'club_required'; end if;
    if p_league is not null and not exists (select 1 from public.leagues where id = p_league) then raise exception 'unknown_league'; end if;
    insert into public.clubs (name, league_id) values (btrim(p_club), p_league) on conflict (name) do nothing;
    select id into v_club from public.clubs where name = btrim(p_club);
    if p_league is not null then update public.clubs set league_id = p_league where id = v_club; end if;
  else
    v_club := null;
  end if;
  update public.profiles set role = p_role, club_id = v_club where id = v_user;
  return jsonb_build_object('ok', true, 'user', v_user, 'role', p_role, 'club', v_club);
end $$;

revoke execute on function public.admin_provision_staff(text, public.app_role, text, text) from public, anon, authenticated;
