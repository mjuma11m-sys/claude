-- DW-038: حذف الحساب من داخل التطبيق (شرط App Store 5.1.1(v) وGoogle Play) + حذف ملفات العقود (حق المحو — PDPL)
-- إضافات بس: سياسة حذف جديدة + دالة جديدة. ما نمسح ولا نعدّل شي موجود.

-- قبل: ما فيه ولا سياسة حذف على ملفات العقود، فـ remove() ما يسوي شي والملفات تظل بعد حذف العائلة.
-- الحين: مالك العائلة يقدر يحذف ملفات مجلد عائلته.
create policy "contracts: owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'contracts' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
         and exists (select 1 from public.family_members m
                     where m.family_id = ((storage.foldername(name))[1])::uuid and m.user_id = auth.uid() and m.role = 'owner'));

-- يحذف حسابي: العائلة اللي أملكها (بأحداثها وأعضائها ودعواتها) + عضويتي بأي عائلة + الحساب نفسه.
-- الملفات: التطبيق يحذفها من التخزين قبل هالدالة (Storage API — الحذف المباشر من storage.objects ممنوع).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  delete from public.families f using public.family_members m
    where m.family_id = f.id and m.user_id = uid and m.role = 'owner';
  delete from public.family_members where user_id = uid;
  delete from auth.users where id = uid;
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
