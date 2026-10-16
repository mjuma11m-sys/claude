-- DW-030 (storage): ملفات العقود والوثائق: الرفع للمحرّرين بس (الـ buckets الثانية ما تتأثر)
create policy "contracts: editors only upload" on storage.objects as restrictive for insert to authenticated
  with check (bucket_id <> 'contracts' or ((storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
         and public.is_family_editor(((storage.foldername(name))[1])::uuid)));

