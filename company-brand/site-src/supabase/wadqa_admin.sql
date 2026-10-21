-- DW-052: لوحة إدارة ودقة (/admin). منفّذة على مشروع Supabase «hayati» (gqpagtblgqxzwjgsrech) بتاريخ 2026-10-21.
-- كل شي admin-only عبر RLS: بس اللي بجدول wadqa.admins يقرا ويكتب. حسابات حياتي العاديين يرجع لهم صفر صف،
-- والكتابة ترجع «new row violates row-level security policy»، وanon «permission denied» (انجرّب كله).

create table if not exists wadqa.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table wadqa.admins enable row level security;
revoke all on wadqa.admins from public, anon, authenticated;

create or replace function public.wadqa_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from wadqa.admins a where a.user_id = (select auth.uid()));
$$;
revoke all on function public.wadqa_is_admin() from public, anon;
grant execute on function public.wadqa_is_admin() to authenticated;

-- دفتر الدخل والمصروف (بالفلس)
create table if not exists public.wadqa_entries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('income', 'expense')),
  occurred_on date not null,
  amount_fils bigint not null check (amount_fils > 0 and amount_fils < 1000000000000),
  category text not null check (char_length(category) between 1 and 40),
  product text not null default 'general' check (product in ('general', 'hayati', 'idarati', 'sports-hub', 'wadqa-site')),
  method text check (char_length(method) <= 30),
  note text check (char_length(note) <= 500),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists wadqa_entries_occurred_on on public.wadqa_entries (occurred_on desc);

-- ميزانية شهرية لكل بند مصروف
create table if not exists public.wadqa_budgets (
  category text primary key check (char_length(category) between 1 and 40),
  monthly_fils bigint not null check (monthly_fils >= 0 and monthly_fils < 1000000000000),
  updated_at timestamptz not null default now()
);

-- الاشتراكات والمصاريف المتكررة (amount_minor: فلس للدينار، سنت للدولار)
create table if not exists public.wadqa_recurring (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  amount_minor bigint not null check (amount_minor >= 0 and amount_minor < 1000000000000),
  currency text not null default 'BHD' check (currency in ('BHD', 'USD')),
  period text not null default 'month' check (period in ('month', 'year', 'once')),
  category text not null default 'أدوات وبرامج' check (char_length(category) between 1 and 40),
  product text not null default 'general' check (product in ('general', 'hayati', 'idarati', 'sports-hub', 'wadqa-site')),
  next_due date,
  active boolean not null default true,
  note text check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);

alter table public.wadqa_entries enable row level security;
alter table public.wadqa_budgets enable row level security;
alter table public.wadqa_recurring enable row level security;
revoke all on public.wadqa_entries, public.wadqa_budgets, public.wadqa_recurring from public, anon;
grant select, insert, update, delete on public.wadqa_entries, public.wadqa_budgets, public.wadqa_recurring to authenticated;
create policy admin_all on public.wadqa_entries for all to authenticated using ((select public.wadqa_is_admin())) with check ((select public.wadqa_is_admin()));
create policy admin_all on public.wadqa_budgets for all to authenticated using ((select public.wadqa_is_admin())) with check ((select public.wadqa_is_admin()));
create policy admin_all on public.wadqa_recurring for all to authenticated using ((select public.wadqa_is_admin())) with check ((select public.wadqa_is_admin()));

-- صندوق الطلبات: قراءة للأدمن بس (الجدول يظل بالمخطط الخاص wadqa). الحذف بطلب صاحب البيانات من لوحة Supabase.
create or replace function public.wadqa_admin_leads()
returns table (id bigint, created_at timestamptz, kind text, product text, name text, email text, message text, lang text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.wadqa_is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query select l.id, l.created_at, l.kind, l.product, l.name, l.email, l.message, l.lang from wadqa.leads l order by l.created_at desc limit 500;
end $$;
revoke all on function public.wadqa_admin_leads() from public, anon;
grant execute on function public.wadqa_admin_leads() to authenticated;

-- المالك هو الأدمن الوحيد
insert into wadqa.admins (user_id) select id from auth.users where lower(email) = 'mjuma11.m@gmail.com' on conflict do nothing;

-- DW-052 (2): التحقق بخطوتين إلزامي. القاعدة ما تعطي ولا صف إلا لجلسة أدمن كملت الرمز (aal2)،
-- فلو كلمة السر تسرّبت، الـ API نفسه ما يرجع شي. (انجرّب: أدمن aal1 ← 0 صف وكتابة مرفوضة وطلبات مرفوضة؛ aal2 ← كامل؛ غير أدمن aal2 ← 0)
create or replace function public.wadqa_admin_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.wadqa_is_admin() and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;
revoke all on function public.wadqa_admin_ok() from public, anon;
grant execute on function public.wadqa_admin_ok() to authenticated;
alter policy admin_all on public.wadqa_entries using ((select public.wadqa_admin_ok())) with check ((select public.wadqa_admin_ok()));
alter policy admin_all on public.wadqa_budgets using ((select public.wadqa_admin_ok())) with check ((select public.wadqa_admin_ok()));
alter policy admin_all on public.wadqa_recurring using ((select public.wadqa_admin_ok())) with check ((select public.wadqa_admin_ok()));
create or replace function public.wadqa_admin_leads()
returns table (id bigint, created_at timestamptz, kind text, product text, name text, email text, message text, lang text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.wadqa_admin_ok() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query select l.id, l.created_at, l.kind, l.product, l.name, l.email, l.message, l.lang from wadqa.leads l order by l.created_at desc limit 500;
end $$;

-- DW-053: «الملفات» — شرح تقني لكل تطبيق، بنفس قفل aal2. المحتوى من site-src/admin/docs-src/*.md عبر build-sql.mjs.
create table if not exists public.wadqa_docs (
  slug text primary key check (slug ~ '^[a-z0-9-]{1,40}$'),
  title text not null check (char_length(title) between 1 and 80),
  sort int not null default 0,
  body text not null default '' check (char_length(body) < 3000000),
  updated_at timestamptz not null default now()
);
alter table public.wadqa_docs enable row level security;
revoke all on public.wadqa_docs from public, anon;
grant select, insert, update on public.wadqa_docs to authenticated;
create policy admin_all on public.wadqa_docs for all to authenticated using ((select public.wadqa_admin_ok())) with check ((select public.wadqa_admin_ok()));
