-- handle_new_user() only runs as the sign-up trigger. Supabase grants new functions to anon/authenticated by default, so close that door.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
