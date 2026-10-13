-- PDPL right to erasure: a signed-in user deletes their own account; profiles go with it (on delete cascade).
create function public.delete_my_account() returns void
  language sql security definer set search_path = '' as
  $$ delete from auth.users where id = auth.uid() $$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
