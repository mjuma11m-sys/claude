-- DW-020: ملفات العقود الموقّعة — bucket خاص، مجلد لكل مساحة (family_id)، والعضو بس يقرأ ويرفع.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contracts', 'contracts', false, 10485760, array['application/pdf','image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

create policy "contracts: members read" on storage.objects for select to authenticated
  using (bucket_id = 'contracts' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
         and public.is_family_member(((storage.foldername(name))[1])::uuid));
create policy "contracts: members upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'contracts' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
         and public.is_family_member(((storage.foldername(name))[1])::uuid));
