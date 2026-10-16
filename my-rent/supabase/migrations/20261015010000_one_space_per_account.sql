-- DW-019: كل حساب له مساحة وحدة يملكها (عائلة). create_family يرجّع الموجودة بدل ما يسوي ثانية.
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
