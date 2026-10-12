---
name: supabase-schema
description: يصمم قاعدة بيانات Supabase (Postgres) جاهزة للإنتاج — جداول، علاقات، RLS policies، indexes، triggers، migrations وTypeScript types. Use when user says "صمم الداتابيس"، "سو جداول"، "RLS"، "migration"، "schema"، "Supabase"، or adds a feature that needs new tables or columns.
---

# 🗄️ Supabase Schema

## المخرجات (بالترتيب)
1. **جدول الكيانات:** الجدول · الغرض · المفتاح · العلاقات · من يملك الصف.
2. **migration واحدة** `supabase/migrations/<timestamp>_<name>.sql` (تنعمل بـ `supabase migration new <name>`).
3. **RLS** لكل جدول + سطر لكل policy يشرح مين يقدر.
4. **أوامر التطبيق:** `supabase db push` ثم `supabase gen types typescript --linked > src/types/db.ts`.

## قواعد الجداول
- `id uuid primary key default gen_random_uuid()` · `created_at timestamptz not null default now()` · `updated_at` مع trigger.
- الملكية: `owner_id uuid not null references auth.users(id) on delete cascade default auth.uid()` أو `org_id` للتطبيقات متعددة الجهات.
- بيانات المستخدم الإضافية في `public.profiles (id uuid primary key references auth.users on delete cascade)` + trigger على `auth.users` insert. لا تعدّل schema `auth`.
- الفلوس: `numeric(12,3)` للدينار البحريني (3 خانات fils). لا `float`.
- الحالات: `text` + `check (status in (...))` أبسط من `enum` لما تتغير القيم.
- التواريخ: `date` للأيام، `timestamptz` للأوقات. لا `timestamp` بدون zone.
- `not null` افتراضياً، و `unique` على اللي لازم يكون فريد (مثل `(team_id, player_id)`).
- **index على كل foreign key** وكل عمود يُفلتر عليه في policy أو query متكرر.

## RLS (إلزامي)
```sql
alter table public.items enable row level security;

create policy "items_select_own" on public.items
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "items_insert_own" on public.items
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "items_update_own" on public.items
  for update to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "items_delete_own" on public.items
  for delete to authenticated using ((select auth.uid()) = owner_id);
```
- policy لكل عملية، مو `for all`. `(select auth.uid())` مو `auth.uid()` (أسرع — ينحسب مرة).
- الأدوار (admin/coach/…): جدول `memberships (org_id, user_id, role)` + دالة:
```sql
create schema if not exists private;
create or replace function private.has_role(p_org uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = (select auth.uid()) and m.role = any(p_roles));
$$;
```
  الدوال `security definer` في schema `private` (مو مكشوفة للـ API) وبـ `set search_path = ''`.
- Storage: policies على `storage.objects` بنفس المنطق (`(storage.foldername(name))[1] = (select auth.uid())::text`).
- `service_role` key **سيرفر بس** (Flask/Edge Functions). الفرونت يستخدم `anon` key.

## Triggers جاهزة
```sql
create or replace function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end $$;
create trigger trg_items_updated before update on public.items
  for each row execute function private.set_updated_at();
```

## Views وأرقام
- إحصائيات (نسبة حضور، متأخرات) في `view` بـ `with (security_invoker = true)` عشان تحترم RLS.
- عمليات متعددة الخطوات (دفع + تحديث رصيد) في `function` وتنادى بـ `supabase.rpc()` — transaction وحدة.

## قبل التسليم
- [ ] كل جدول عليه RLS و policies لكل عملية · [ ] index على كل FK · [ ] لا أسرار في الفرونت · [ ] migration تشتغل على قاعدة فاضية · [ ] types انولّدت.
