-- «حياتي» — قاعدة بيانات Supabase
-- شغّل هالملف كامل مرة وحدة: Supabase → SQL Editor → New query → الصق → Run
-- كل جدول: سجلاتك أنت بس (Row Level Security)، والبيانات نفسها بحقل data (jsonb)

create extension if not exists pgcrypto;

create table if not exists public.transactions (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         uuid not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.transactions enable row level security;
drop policy if exists "own rows" on public.transactions;
create policy "own rows" on public.transactions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create table if not exists public.courses (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         uuid not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.courses enable row level security;
drop policy if exists "own rows" on public.courses;
create policy "own rows" on public.courses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create table if not exists public.tasks (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         uuid not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.tasks enable row level security;
drop policy if exists "own rows" on public.tasks;
create policy "own rows" on public.tasks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create table if not exists public.subscriptions (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         uuid not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.subscriptions enable row level security;
drop policy if exists "own rows" on public.subscriptions;
create policy "own rows" on public.subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create table if not exists public.goals (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         uuid not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.goals enable row level security;
drop policy if exists "own rows" on public.goals;
create policy "own rows" on public.goals for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create table if not exists public.grades (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         uuid not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.grades enable row level security;
drop policy if exists "own rows" on public.grades;
create policy "own rows" on public.grades for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create table if not exists public.study_sessions (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         uuid not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.study_sessions enable row level security;
drop policy if exists "own rows" on public.study_sessions;
create policy "own rows" on public.study_sessions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create table if not exists public.debts (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         uuid not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.debts enable row level security;
drop policy if exists "own rows" on public.debts;
create policy "own rows" on public.debts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create table if not exists public.habits (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         uuid not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.habits enable row level security;
drop policy if exists "own rows" on public.habits;
create policy "own rows" on public.habits for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create table if not exists public.daily (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         uuid not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.daily enable row level security;
drop policy if exists "own rows" on public.daily;
create policy "own rows" on public.daily for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create table if not exists public.lifts (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         uuid not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.lifts enable row level security;
drop policy if exists "own rows" on public.lifts;
create policy "own rows" on public.lifts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create table if not exists public.body (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         uuid not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.body enable row level security;
drop policy if exists "own rows" on public.body;
create policy "own rows" on public.body for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create table if not exists public.cards (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         uuid not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.cards enable row level security;
drop policy if exists "own rows" on public.cards;
create policy "own rows" on public.cards for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create table if not exists public.events (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         uuid not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.events enable row level security;
drop policy if exists "own rows" on public.events;
create policy "own rows" on public.events for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create table if not exists public.shopping (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         uuid not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.shopping enable row level security;
drop policy if exists "own rows" on public.shopping;
create policy "own rows" on public.shopping for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create table if not exists public.journal (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         uuid not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.journal enable row level security;
drop policy if exists "own rows" on public.journal;
create policy "own rows" on public.journal for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create table if not exists public.matches (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         uuid not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.matches enable row level security;
drop policy if exists "own rows" on public.matches;
create policy "own rows" on public.matches for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.lectures (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         uuid not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.lectures enable row level security;
drop policy if exists "own rows" on public.lectures;
create policy "own rows" on public.lectures for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- DW-035: الرحلات (تخطيط السفر) تتزامن بين الأجهزة. رحلات العمرة تظل على الجهاز بس وما توصل هني
create table if not exists public.trips (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         uuid not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.trips enable row level security;
drop policy if exists "own rows" on public.trips;
create policy "own rows" on public.trips for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- DW-021 phase 2: per-user daily AI quota (lecture-ai Edge Function). No client policies: only bump_ai_usage touches it.
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  calls int not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
create or replace function public.bump_ai_usage(lim int) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then return false; end if;
  insert into ai_usage (user_id, day, calls) values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set calls = ai_usage.calls + 1
  returning calls into n;
  return n <= lim;
end $$;
revoke all on function public.bump_ai_usage(int) from public, anon;
grant execute on function public.bump_ai_usage(int) to authenticated;

-- DW-068: free monthly AI quota per feature group (study / slides / schedule / ask). A count only, never the content.
-- It tells us how many people hit the free limit before deciding on «حياتي بلس».
create table if not exists public.ai_quota (
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null default date_trunc('month', current_date)::date,
  feature text not null check (feature in ('study', 'slides', 'schedule', 'ask')),
  calls int not null default 0,
  primary key (user_id, month, feature)
);
alter table public.ai_quota enable row level security;
-- returns the uses left this month after this one, or -1 when the free limit was already reached (nothing counted then)
create or replace function public.bump_ai_quota(feat text, lim int) returns int
language plpgsql security definer set search_path = public as $$
declare n int; m date := date_trunc('month', current_date)::date;
begin
  if auth.uid() is null then return -1; end if;
  insert into ai_quota (user_id, month, feature, calls) values (auth.uid(), m, feat, 0)
  on conflict (user_id, month, feature) do nothing;
  update ai_quota set calls = calls + 1
  where user_id = auth.uid() and month = m and feature = feat and calls < lim
  returning calls into n;
  if n is null then return -1; end if;
  return lim - n;
end $$;
-- a failed answer gives the use back
create or replace function public.refund_ai_quota(feat text) returns void
language sql security definer set search_path = public as $$
  update ai_quota set calls = greatest(calls - 1, 0)
  where user_id = auth.uid() and month = date_trunc('month', current_date)::date and feature = feat;
$$;
revoke all on function public.bump_ai_quota(text, int) from public, anon;
revoke all on function public.refund_ai_quota(text) from public, anon;
grant execute on function public.bump_ai_quota(text, int) to authenticated;
grant execute on function public.refund_ai_quota(text) to authenticated;

-- الإعدادات: سطر واحد لكل مستخدم
create table if not exists public.settings (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.settings enable row level security;
drop policy if exists "own row" on public.settings;
create policy "own row" on public.settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create unique index if not exists settings_ingest_token on public.settings ((data->>'ingest_token'))
  where data ? 'ingest_token';

-- صندوق رسايل البنك (تجي من اختصار الآيفون)
create table if not exists public.sms_inbox (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  body        text not null check (length(body) between 1 and 2000),
  received_at timestamptz not null default now(),
  processed   boolean not null default false
);
create index if not exists sms_inbox_pending on public.sms_inbox (user_id, processed, received_at);
alter table public.sms_inbox enable row level security;
drop policy if exists "own inbox read" on public.sms_inbox;
create policy "own inbox read" on public.sms_inbox for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "own inbox update" on public.sms_inbox;
create policy "own inbox update" on public.sms_inbox for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "own inbox delete" on public.sms_inbox;
create policy "own inbox delete" on public.sms_inbox for delete to authenticated using (user_id = (select auth.uid()));
-- ما فيه insert مباشر: الرسايل تدخل بس عن طريق ingest_sms تحت

-- الاختصار يرسل {token, body}. الرمز يحدد المستخدم، وما يقدر أحد يقرا أي شي بهالدالة.
create or replace function public.ingest_sms(token text, body text)
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if token is null or length(token) < 32 then raise exception 'invalid token' using errcode = '28000'; end if;
  if body is null or length(btrim(body)) = 0 or length(body) > 2000 then raise exception 'invalid body' using errcode = '22023'; end if;
  select s.user_id into uid from public.settings s where s.data->>'ingest_token' = token;
  if uid is null then raise exception 'invalid token' using errcode = '28000'; end if;
  if (select count(*) from public.sms_inbox i where i.user_id = uid and i.received_at > now() - interval '1 hour') >= 60 then
    raise exception 'too many messages' using errcode = '54000';
  end if;
  -- أرقام البطاقة/الحساب ما تنحفظ: «XX4821» ← «••21» (المبالغ مثل 412.300 تظل)
  body := regexp_replace(body, '\m[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}\M', 'IBAN••', 'g');
  body := regexp_replace(body, '[xX*•]{2,}', '••', 'g');
  -- 4 أرقام أو أكثر ورا بعض، مو جزء من مبلغ (قبلها أو بعدها فاصلة عشرية)
  body := regexp_replace(body, '(?<![.,0-9])[0-9]{4,}(?![0-9]|[.,][0-9])', '••', 'g');
  insert into public.sms_inbox (user_id, body) values (uid, body);
  return json_build_object('ok', true);
end $$;
revoke all on function public.ingest_sms(text, text) from public;
grant execute on function public.ingest_sms(text, text) to anon, authenticated;

-- المزامنة اللحظية بين الجوال والماك
do $$
declare t text;
begin
  foreach t in array array['transactions','courses','tasks','subscriptions','goals','grades','study_sessions','debts','habits','daily','lifts','body','cards','events','shopping','journal','matches','lectures','trips','settings','sms_inbox'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- «احذف كل بياناتي» من التطبيق: يحذف الحساب نفسه (وكل الجداول تنحذف معاه بـ on delete cascade)
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '28000'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- 🔐 التحقق بخطوتين (DW-078): اللي فعّله، بياناته ما تنقرا ولا تنكتب إلا بجلسة aal2 (بعد رمز تطبيق التحقق)
--   (نفس طريقة توثيق Supabase: سياسة restrictive فوق «own rows»؛ اللي ما فعّله ما يتأثر)
do $$
declare t text;
begin
  foreach t in array array['transactions','courses','tasks','subscriptions','goals','grades','study_sessions','debts','habits','daily','lifts','body','cards','events','shopping','journal','matches','lectures','trips','settings','sms_inbox'] loop
    execute format('drop policy if exists "mfa when enrolled" on public.%I', t);
    execute format($p$create policy "mfa when enrolled" on public.%I as restrictive for all to authenticated
      using (array[(select auth.jwt()->>'aal')] <@ (select case when count(id) > 0 then array['aal2'] else array['aal1','aal2'] end from auth.mfa_factors where user_id = (select auth.uid()) and status = 'verified'))
      with check (array[(select auth.jwt()->>'aal')] <@ (select case when count(id) > 0 then array['aal2'] else array['aal1','aal2'] end from auth.mfa_factors where user_id = (select auth.uid()) and status = 'verified'))$p$, t);
  end loop;
end $$;
