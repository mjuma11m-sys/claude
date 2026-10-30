-- security-audit (30 أكتوبر 2026): منطبّق على مشروع hayati (gqpagtblgqxzwjgsrech) بـ migrations
--   security_audit_5b_5c_rate_limits + security_audit_5c_headers_nullsafe
-- 5b: عداد الزيارات حده 2000 لكل صفحة باليوم (بـ wadqa_admin.sql)
-- 5c: حد 5 رسائل بالساعة لكل جهاز بنموذج التواصل. ما ينحفظ IP: بس sha256(IP + تاريخ اليوم + سر عشوائي)، تنحذف بعد يوم.
-- انجرّب بمعاملة rollback: 1–5 ok · السادسة too_many · جهاز ثاني ok · بدون هيدر أو هيدر خربان ok (الحد العام بس) · 0 IP خام

create table if not exists wadqa.rate_secret (id int primary key default 1 check (id = 1), salt text not null default encode(extensions.gen_random_bytes(32), 'hex'));
insert into wadqa.rate_secret (id) values (1) on conflict do nothing;
create table if not exists wadqa.form_rate (k text not null, at timestamptz not null default now());
create index if not exists form_rate_k_at on wadqa.form_rate (k, at);
alter table wadqa.rate_secret enable row level security;
alter table wadqa.form_rate enable row level security;
revoke all on wadqa.rate_secret, wadqa.form_rate from public, anon, authenticated;

create or replace function public.wadqa_submit(p_kind text, p_email text, p_consent boolean, p_product text default 'general', p_name text default null, p_message text default null, p_lang text default 'ar')
returns text language plpgsql security definer set search_path = '' as $function$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  n int;
  v_ip text;
  v_k text;
begin
  if not coalesce(p_consent, false) then return 'consent_required'; end if;
  -- حد لكل جهاز (security-audit 5c): 5 بالساعة. بصمة مشفّرة تتغير كل يوم، مو IP. بدون هيدر = الحد العام بس
  begin
    v_ip := nullif(trim(split_part(coalesce((nullif(current_setting('request.headers', true), '')::json) ->> 'x-forwarded-for', ''), ',', 1)), '');
  exception when others then v_ip := null;
  end;
  if v_ip is not null then
    select encode(extensions.digest(v_ip || current_date::text || s.salt, 'sha256'), 'hex') into v_k from wadqa.rate_secret s where s.id = 1;
    delete from wadqa.form_rate where at < now() - interval '1 day';
    select count(*) into n from wadqa.form_rate where k = v_k and at > now() - interval '1 hour';
    if n >= 5 then return 'too_many'; end if;
    insert into wadqa.form_rate (k) values (v_k);
  end if;
  -- حد عام ضد الإغراق: 30 رسالة كل 10 دقائق لكل الموقع
  select count(*) into n from wadqa.leads where created_at > now() - interval '10 minutes';
  if n >= 30 then return 'busy'; end if;
  -- حد لكل إيميل: 3 بالساعة
  select count(*) into n from wadqa.leads where email = v_email and created_at > now() - interval '1 hour';
  if n >= 3 then return 'too_many'; end if;
  insert into wadqa.leads (kind, product, name, email, message, lang, consent)
  values (p_kind, coalesce(p_product, 'general'), nullif(trim(p_name), ''), v_email, nullif(trim(p_message), ''), coalesce(p_lang, 'ar'), true)
  on conflict do nothing;
  return 'ok';
exception
  when check_violation or not_null_violation or string_data_right_truncation then return 'invalid';
end;
$function$;
revoke all on function public.wadqa_submit(text, text, boolean, text, text, text, text) from public;
grant execute on function public.wadqa_submit(text, text, boolean, text, text, text, text) to anon, authenticated;
