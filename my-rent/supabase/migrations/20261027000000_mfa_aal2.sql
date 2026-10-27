-- DW-045: التحقق بخطوتين مفروض من القاعدة نفسها، مو من الواجهة بس.
-- اللي فعّل عامل TOTP (verified) لازم جلسته aal2 عشان يقرا أو يكتب أي شي. اللي ما فعّله: ما يتغيّر عليه شي.
-- سياسات RESTRICTIVE: تنضاف فوق السياسات الحالية (AND)، ما توسّع أي صلاحية.
create or replace function public.mfa_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f where f.user_id = (select auth.uid()) and f.status = 'verified')
$$;
revoke all on function public.mfa_ok() from public, anon;
grant execute on function public.mfa_ok() to authenticated;

create policy "mfa: aal2 when enrolled" on public.families as restrictive for all to authenticated using (public.mfa_ok()) with check (public.mfa_ok());
create policy "mfa: aal2 when enrolled" on public.family_members as restrictive for all to authenticated using (public.mfa_ok()) with check (public.mfa_ok());
create policy "mfa: aal2 when enrolled" on public.family_invites as restrictive for all to authenticated using (public.mfa_ok()) with check (public.mfa_ok());
create policy "mfa: aal2 when enrolled" on public.events as restrictive for all to authenticated using (public.mfa_ok()) with check (public.mfa_ok());
create policy "mfa: aal2 when enrolled" on storage.objects as restrictive for all to authenticated using (public.mfa_ok()) with check (public.mfa_ok());
