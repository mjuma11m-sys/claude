-- استعلامات الفحص على الداتابيس الحية (execute_sql). كلها قراءة بس.

-- 1) كل جدول: RLS شغّال؟ سياساته (permissive/restrictive)؟ يقدر anon يوصله؟
select n.nspname schema, c.relname tbl, c.relrowsecurity rls,
  (select string_agg(p.polname || case when p.polpermissive then ' [PERMISSIVE ' else ' [RESTRICTIVE ' end
     || case p.polcmd when 'r' then 'select' when 'a' then 'insert' when 'w' then 'update' when 'd' then 'delete' else 'all' end
     || '] using(' || coalesce(pg_get_expr(p.polqual, p.polrelid), '-') || ') check(' || coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '-') || ')', ' | ')
   from pg_policy p where p.polrelid = c.oid) policies,
  has_table_privilege('anon', c.oid, 'select') anon_select
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r' and n.nspname not in ('pg_catalog', 'information_schema', 'auth', 'storage', 'realtime', 'supabase_functions', 'vault', 'extensions', 'graphql', 'graphql_public', 'pgsodium', 'net', 'cron')
order by 1, 2;

-- 2) سياسات «allow anyone»: using(true) أو check(true)
select schemaname, tablename, policyname, permissive, roles, qual, with_check
from pg_policies where qual = 'true' or with_check = 'true';

-- 3) دوال SECURITY DEFINER: مين يشغّلها، وهل تاخذ uid/limit من المستدعي، وsearch_path
select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) args,
  has_function_privilege('anon', p.oid, 'execute') anon_exec,
  has_function_privilege('authenticated', p.oid, 'execute') auth_exec,
  coalesce(array_to_string(p.proconfig, ','), '⚠️ no search_path') config,
  left(regexp_replace(pg_get_functiondef(p.oid), '\s+', ' ', 'g'), 600) def
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where p.prosecdef and n.nspname not in ('pg_catalog', 'auth', 'storage', 'realtime', 'extensions', 'graphql', 'pgsodium', 'vault', 'net', 'cron', 'supabase_functions')
order by 1, 2;

-- 4) Storage buckets العامة
select id, public from storage.buckets;

-- 5) المستخدمين: كم واحد إيميله مو مؤكد (يبين إذا تأكيد الإيميل شغّال)
select count(*) users, count(*) filter (where email_confirmed_at is null) unconfirmed from auth.users;
