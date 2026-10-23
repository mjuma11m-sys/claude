-- بيئة Supabase مصغّرة للاختبار المحلي: أدوار + auth.uid() + publication
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
create schema auth; grant usage on schema auth to anon, authenticated;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public to anon, authenticated;
create publication supabase_realtime;
-- DW-038: auth.users + تخزين مصغّر (storage.objects + foldername) عشان نختبر حذف الحساب وسياسة حذف الملفات
create table auth.users (id uuid primary key);
grant select on auth.users to authenticated;
create schema storage; grant usage on schema storage to authenticated;
create table storage.objects (id bigserial primary key, bucket_id text not null, name text not null);
alter table storage.objects enable row level security;
grant select, insert, delete on storage.objects to authenticated;
grant usage on sequence storage.objects_id_seq to authenticated;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
create policy "test: insert any" on storage.objects for insert to authenticated with check (true);
create policy "test: read any" on storage.objects for select to authenticated using (true);
