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
  feature text not null check (feature in ('study', 'slides', 'schedule', 'ask', 'trip')),
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
--   سياسة restrictive فوق «own rows»؛ اللي ما فعّله ما يتأثر.
--   authenticated ما يقدر يقرا auth.mfa_factors، فالفحص بدالة security definer ترجع نعم/لا للمستخدم نفسه بس.
create or replace function public.user_has_mfa() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.mfa_factors where user_id = auth.uid() and status = 'verified');
$$;
revoke all on function public.user_has_mfa() from public, anon;
grant execute on function public.user_has_mfa() to authenticated;
do $$
declare t text;
begin
  foreach t in array array['transactions','courses','tasks','subscriptions','goals','grades','study_sessions','debts','habits','daily','lifts','body','cards','events','shopping','journal','matches','lectures','trips','settings','sms_inbox'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('drop policy if exists "mfa when enrolled" on public.%I', t);
    execute format($p$create policy "mfa when enrolled" on public.%I as restrictive for all to authenticated
      using ((select auth.jwt()->>'aal') = 'aal2' or not (select public.user_has_mfa()))
      with check ((select auth.jwt()->>'aal') = 'aal2' or not (select public.user_has_mfa()))$p$, t);
  end loop;
end $$;

-- DW-090: «الأجهزة المسجّلة» — كل مستخدم يشوف جلساته هو بس، ويقدر يطلّع غير الجهاز الحالي
create or replace function public.my_sessions()
returns table (id uuid, created_at timestamptz, last_active timestamptz, user_agent text, aal text, is_current boolean)
language sql security definer set search_path = '' stable as $$
  select s.id, s.created_at,
         coalesce(s.refreshed_at::timestamptz, s.updated_at, s.created_at) as last_active,
         left(coalesce(s.user_agent, ''), 300), s.aal::text,
         s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid as is_current
  from auth.sessions s
  where s.user_id = auth.uid() and (s.not_after is null or s.not_after > now())
  order by 3 desc limit 20;
$$;
create or replace function public.revoke_session(sid uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if auth.uid() is null then return false; end if;
  if sid = nullif(auth.jwt() ->> 'session_id', '')::uuid then return false; end if;
  delete from auth.sessions where id = sid and user_id = auth.uid();
  get diagnostics n = row_count;
  return n > 0;
end;
$$;
revoke all on function public.my_sessions() from public, anon;
revoke all on function public.revoke_session(uuid) from public, anon;
grant execute on function public.my_sessions() to authenticated;
grant execute on function public.revoke_session(uuid) to authenticated;

-- DW-096: «خطط رحلتي» بالذكاء له حصته الشهرية
alter table public.ai_quota drop constraint if exists ai_quota_feature_check;
alter table public.ai_quota add constraint ai_quota_feature_check check (feature in ('study', 'slides', 'schedule', 'ask', 'trip'));

-- DW-102: «💬 ملاحظة» من داخل التطبيق — توصل مباشرة بدون نسخ ولا إنستقرام.
-- الجدول مقفول (RLS بدون policies): ما أحد يقرا ولا يكتب مباشرة. الإرسال بس عن طريق send_feedback،
-- والقراءة لصاحب المشروع من لوحة Supabase. نحفظ النسخة ونوع الجهاز، وبدون IP ولا بيانات المستخدم.
create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('bug', 'idea', 'opinion')),
  message text not null check (char_length(message) between 3 and 1500),
  rating smallint check (rating between 1 and 5),
  contact text check (char_length(contact) <= 120),
  app_version text check (char_length(app_version) <= 20),
  device text check (char_length(device) <= 120),
  errors text check (char_length(errors) <= 1200),
  status text not null default 'new' check (status in ('new', 'seen', 'done'))
);
alter table public.feedback enable row level security;
create index if not exists feedback_created_idx on public.feedback (created_at desc);

create or replace function public.send_feedback(p_kind text, p_message text, p_rating int default null, p_contact text default null,
  p_version text default null, p_device text default null, p_errors text default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); n int;
begin
  if p_kind not in ('bug', 'idea', 'opinion') or char_length(coalesce(trim(p_message), '')) < 3 then raise exception 'invalid'; end if;
  -- حد للإزعاج: 5 بالساعة لكل حساب، و40 بالساعة لكل اللي بدون حساب مع بعض
  if uid is not null then
    select count(*) into n from public.feedback where user_id = uid and created_at > now() - interval '1 hour';
    if n >= 5 then raise exception 'rate_limited'; end if;
  else
    select count(*) into n from public.feedback where user_id is null and created_at > now() - interval '1 hour';
    if n >= 40 then raise exception 'rate_limited'; end if;
  end if;
  insert into public.feedback (user_id, kind, message, rating, contact, app_version, device, errors)
  values (uid, p_kind, left(trim(p_message), 1500), case when p_rating between 1 and 5 then p_rating end,
    nullif(left(trim(coalesce(p_contact, '')), 120), ''), left(p_version, 20), left(p_device, 120), left(p_errors, 1200));
  return true;
end $$;
revoke all on function public.send_feedback(text, text, int, text, text, text, text) from public;
grant execute on function public.send_feedback(text, text, int, text, text, text, text) to anon, authenticated;

-- DW-109: عدّاد الاستخدام بدون هوية — كل جهاز يرسل «+1» مرة باليوم ومرة بالشهر (الجهاز يتذكر إنه أرسل، والسيرفر ما يعرف مين).
-- ما نحفظ أي معرّف ولا IP ولا حساب: أرقام مجمّعة بس (كم جهاز فتح اليوم / هالشهر، حسب النظام والنسخة).
create table if not exists public.usage_daily (
  day date not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  version text not null check (char_length(version) <= 12),
  dau int not null default 0,
  mau int not null default 0,
  primary key (day, platform, version)
);
alter table public.usage_daily enable row level security;

create or replace function public.ping_active(p_month boolean, p_platform text, p_version text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_platform not in ('ios', 'android', 'web') then return; end if;
  insert into public.usage_daily (day, platform, version, dau, mau)
  values ((now() at time zone 'Asia/Bahrain')::date, p_platform, left(coalesce(p_version, '?'), 12), 1, case when p_month then 1 else 0 end)
  on conflict (day, platform, version) do update set dau = usage_daily.dau + 1, mau = usage_daily.mau + excluded.mau;
end $$;
revoke all on function public.ping_active(boolean, text, text) from public;
grant execute on function public.ping_active(boolean, text, text) to anon, authenticated;

-- DW-110: عروض الشركاء — شركات موثّقة (سجل وترخيص) تعرض خدمتها بالقسم اللي يناسبها.
-- الجداول مقفولة (RLS بدون policies): الإضافة والتعديل لصاحب المشروع من لوحة Supabase بس.
-- التطبيق يقرا العروض الشغالة عن طريق active_offers، والاختيار يصير على الجهاز (ولا معلومة عن المستخدم تطلع).
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 80),
  kind text not null check (kind in ('campaign', 'travel', 'food', 'car', 'education', 'other')),
  cr_number text check (char_length(cr_number) <= 30),
  license text check (char_length(license) <= 80),
  contact_person text check (char_length(contact_person) <= 80),
  plan text not null default 'pilot' check (plan in ('pilot', 'basic', 'featured', 'sponsor')),
  status text not null default 'pending' check (status in ('pending', 'active', 'paused')),
  notes text
);
alter table public.partners enable row level security;

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  section text not null check (section in ('travel', 'umrah', 'weekend', 'car', 'kids', 'ramadan')),
  city text check (char_length(city) <= 30),
  title text not null check (char_length(title) between 3 and 80),
  body text check (char_length(body) <= 240),
  price_bhd numeric(10, 3) check (price_bhd >= 0),
  starts_on date,
  ends_on date,
  whatsapp text check (whatsapp ~ '^[0-9]{8,15}$'),
  url text check (url ~ '^https://'),
  code text check (char_length(code) <= 20),
  priority int not null default 0,
  active boolean not null default true
);
alter table public.offers enable row level security;
create index if not exists offers_section_idx on public.offers (section) where active;

-- أرقام يومية مجمّعة لكل عرض: كم مرة انعرض وكم مرة انضغط (بدون أي هوية)
create table if not exists public.offer_stats (
  offer_id uuid not null references public.offers (id) on delete cascade,
  day date not null,
  views int not null default 0,
  clicks int not null default 0,
  primary key (offer_id, day)
);
alter table public.offer_stats enable row level security;

create or replace function public.active_offers()
returns table (id uuid, partner text, kind text, section text, city text, title text, body text, price_bhd numeric,
  starts_on date, ends_on date, whatsapp text, url text, code text, priority int, plan text)
language sql stable security definer set search_path = public as $$
  select o.id, p.name, p.kind, o.section, o.city, o.title, o.body, o.price_bhd, o.starts_on, o.ends_on, o.whatsapp, o.url, o.code, o.priority, p.plan
  from public.offers o join public.partners p on p.id = o.partner_id
  where o.active and p.status = 'active' and (o.ends_on is null or o.ends_on >= (now() at time zone 'Asia/Bahrain')::date)
  order by o.priority desc, o.created_at
  limit 200
$$;
revoke all on function public.active_offers() from public;
grant execute on function public.active_offers() to anon, authenticated;

create or replace function public.offer_event(p_offer uuid, p_kind text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_kind not in ('view', 'click') then return; end if;
  if not exists (select 1 from public.offers where id = p_offer and active) then return; end if;
  insert into public.offer_stats (offer_id, day, views, clicks)
  values (p_offer, (now() at time zone 'Asia/Bahrain')::date, case when p_kind = 'view' then 1 else 0 end, case when p_kind = 'click' then 1 else 0 end)
  on conflict (offer_id, day) do update set views = offer_stats.views + excluded.views, clicks = offer_stats.clicks + excluded.clicks;
end $$;
revoke all on function public.offer_event(uuid, text) from public;
grant execute on function public.offer_event(uuid, text) to anon, authenticated;

-- DW-111: خصم لمستخدمي حياتي — شرط لكل شريك. `discount` نص قصير يطلع شارة على العرض («خصم 10%»)، و`redeems` كم مرة
-- فتح المستخدم شاشة الخصم (مرة باليوم لكل جهاز وعرض، بدون هوية).
alter table public.offers add column if not exists discount text check (char_length(discount) <= 40);
alter table public.offer_stats add column if not exists redeems int not null default 0;

drop function if exists public.active_offers();
create function public.active_offers()
returns table (id uuid, partner text, kind text, section text, city text, title text, body text, price_bhd numeric,
  starts_on date, ends_on date, whatsapp text, url text, code text, discount text, priority int, plan text)
language sql stable security definer set search_path = public as $$
  select o.id, p.name, p.kind, o.section, o.city, o.title, o.body, o.price_bhd, o.starts_on, o.ends_on, o.whatsapp, o.url, o.code, o.discount, o.priority, p.plan
  from public.offers o join public.partners p on p.id = o.partner_id
  where o.active and p.status = 'active' and (o.ends_on is null or o.ends_on >= (now() at time zone 'Asia/Bahrain')::date)
  order by o.priority desc, o.created_at
  limit 200
$$;
revoke all on function public.active_offers() from public;
grant execute on function public.active_offers() to anon, authenticated;

create or replace function public.offer_event(p_offer uuid, p_kind text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_kind not in ('view', 'click', 'redeem') then return; end if;
  if not exists (select 1 from public.offers where id = p_offer and active) then return; end if;
  insert into public.offer_stats (offer_id, day, views, clicks, redeems)
  values (p_offer, (now() at time zone 'Asia/Bahrain')::date, (p_kind = 'view')::int, (p_kind = 'click')::int, (p_kind = 'redeem')::int)
  on conflict (offer_id, day) do update set views = offer_stats.views + excluded.views, clicks = offer_stats.clicks + excluded.clicks, redeems = offer_stats.redeems + excluded.redeems;
end $$;
revoke all on function public.offer_event(uuid, text) from public;
grant execute on function public.offer_event(uuid, text) to anon, authenticated;
