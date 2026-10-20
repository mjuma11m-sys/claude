-- DW-050: مطبّقة على مشروع Supabase «hayati» (gqpagtblgqxzwjgsrech، eu-central-1) باسم الهجرة wadqa_leads.
-- الجدول بمخطط خاص (wadqa) مو مكشوف للـ API؛ الكتابة بس عبر public.wadqa_submit، وما فيه قراءة لأي أحد غير المالك من لوحة Supabase.
-- اختُبرت: ok · consent_required · invalid (إيميل، نوع، نص > 2000) · too_many (4 بالساعة لنفس الإيميل) · التكرار بقائمة الانتظار ينحفظ مرة.
create schema if not exists wadqa;
revoke all on schema wadqa from public, anon, authenticated;

create table wadqa.leads (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('contact', 'waitlist')),
  product text not null default 'general' check (product in ('general', 'hayati', 'sports-hub', 'ijarati')),
  name text check (char_length(name) <= 80),
  email text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message text check (char_length(message) <= 2000),
  lang text not null default 'ar' check (lang in ('ar', 'en')),
  consent boolean not null check (consent)
);
alter table wadqa.leads enable row level security;
create unique index leads_waitlist_once on wadqa.leads (lower(email), product) where kind = 'waitlist';
create index leads_created on wadqa.leads (created_at);

create or replace function public.wadqa_submit(
  p_kind text, p_email text, p_consent boolean,
  p_product text default 'general', p_name text default null,
  p_message text default null, p_lang text default 'ar'
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  n int;
begin
  if not coalesce(p_consent, false) then return 'consent_required'; end if;
  select count(*) into n from wadqa.leads where created_at > now() - interval '10 minutes';
  if n >= 30 then return 'busy'; end if;
  select count(*) into n from wadqa.leads where email = v_email and created_at > now() - interval '1 hour';
  if n >= 3 then return 'too_many'; end if;
  insert into wadqa.leads (kind, product, name, email, message, lang, consent)
  values (p_kind, coalesce(p_product, 'general'), nullif(trim(p_name), ''), v_email, nullif(trim(p_message), ''), coalesce(p_lang, 'ar'), true)
  on conflict do nothing;
  return 'ok';
exception
  when check_violation or not_null_violation or string_data_right_truncation then return 'invalid';
end;
$$;

revoke all on function public.wadqa_submit(text, text, boolean, text, text, text, text) from public;
grant execute on function public.wadqa_submit(text, text, boolean, text, text, text, text) to anon, authenticated;

-- الحذف الدوري (وعد سياسة الخصوصية: 24 شهر). شغّله من SQL Editor كل شهر، أو بـ pg_cron:
-- delete from wadqa.leads where created_at < now() - interval '24 months';
-- قراءة الرسائل (المالك فقط، من SQL Editor):
-- select created_at, kind, product, name, email, message, lang from wadqa.leads order by created_at desc;
