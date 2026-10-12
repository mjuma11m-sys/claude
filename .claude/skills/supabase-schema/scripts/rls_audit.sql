-- Supabase security & performance audit. Run in SQL Editor or:
--   psql "$DATABASE_URL" -f rls_audit.sql
-- Every row returned is something to fix.

-- 1. Tables in public without RLS (anyone with the anon key can read/write).
select 'rls_disabled' as issue, c.relname as object, null as detail
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity

union all
-- 2. RLS enabled but no policies (table is locked for everyone except service_role).
select 'rls_no_policies', c.relname, null
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)

union all
-- 3. Policies calling auth.uid() per row instead of (select auth.uid()).
select 'policy_uid_not_wrapped', tablename || '.' || policyname, coalesce(qual, with_check)
from pg_policies
where schemaname = 'public'
  and (coalesce(qual, '') ~ 'auth\.uid\(\)' or coalesce(with_check, '') ~ 'auth\.uid\(\)')
  and not (coalesce(qual, '') || coalesce(with_check, '')) ~* 'select\s+auth\.uid\(\)'

union all
-- 4. Over-permissive policies (USING true) for write commands.
select 'policy_always_true', tablename || '.' || policyname, cmd
from pg_policies
where schemaname = 'public' and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  and (qual = 'true' or with_check = 'true')

union all
-- 5. Foreign keys without a covering index.
select 'fk_without_index', conrelid::regclass::text, conname
from pg_constraint con
where con.contype = 'f' and con.connamespace = 'public'::regnamespace
  and not exists (
    select 1 from pg_index i
    where i.indrelid = con.conrelid
      and (i.indkey::int2[])[0:cardinality(con.conkey) - 1] = con.conkey
  )

union all
-- 6. SECURITY DEFINER functions exposed in public, or without a fixed search_path.
select 'definer_function_risk', p.proname,
       case when n.nspname = 'public' then 'in public schema' else 'search_path not set' end
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where p.prosecdef and n.nspname in ('public', 'private')
  and (n.nspname = 'public' or not coalesce(p.proconfig::text, '') like '%search_path%')

union all
-- 7. Money stored as float.
select 'float_money', table_name || '.' || column_name, data_type
from information_schema.columns
where table_schema = 'public' and data_type in ('real', 'double precision')
  and column_name ~* '(price|amount|rent|total|fee|balance|cost|salary|deposit)'

order by 1, 2;
