-- Data center: the only door for real club data. A club cannot load pay or availability for real players
-- unless (1) its data-processing agreement is on record and (2) every player row carries a consent reference.
-- The checks live here, in the database; the UI mirrors them but is not the lock.

create table public.data_agreements (
  id              uuid primary key default gen_random_uuid(),
  club_id         uuid not null references public.clubs (id) on delete cascade,
  version         text not null check (length(version) between 1 and 40),     -- which template the club signed
  signatory_name  text not null check (length(signatory_name) between 2 and 120),
  signatory_title text not null check (length(signatory_title) between 2 and 80),
  reference       text not null check (length(reference) between 3 and 120),  -- id of the signed document the club keeps
  signed_on       date not null check (signed_on <= current_date),
  created_by      uuid default auth.uid() references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  revoked_at      timestamptz
);
create unique index data_agreements_one_active on public.data_agreements (club_id) where revoked_at is null;

-- One row per player. Written by import_squad only; the club attests that it holds the player's signed consent.
create table public.player_consents (
  player_id    uuid primary key,
  club_id      uuid not null,
  consent_ref  text not null check (length(consent_ref) between 3 and 60),
  attested_by  uuid default auth.uid() references auth.users (id) on delete set null,
  attested_at  timestamptz not null default now(),
  foreign key (player_id, club_id) references public.players (id, club_id) on delete cascade
);
create index player_consents_club_idx on public.player_consents (club_id);

-- Withdrawals leave a trace without keeping the person's data: the player row is gone, this row stays as a count-only log.
create table public.consent_withdrawals (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references public.clubs (id) on delete cascade,
  consent_ref  text not null,
  withdrawn_at timestamptz not null default now()
);

alter table public.data_agreements enable row level security;
alter table public.player_consents enable row level security;
alter table public.consent_withdrawals enable row level security;
revoke all on public.data_agreements, public.player_consents, public.consent_withdrawals from anon, authenticated;
grant select on public.data_agreements, public.player_consents, public.consent_withdrawals to authenticated;
grant insert (club_id, version, signatory_name, signatory_title, reference, signed_on) on public.data_agreements to authenticated;
grant update (revoked_at) on public.data_agreements to authenticated;

create policy "club admin reads own agreements" on public.data_agreements for select to authenticated
  using ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()));
create policy "club admin records own agreement" on public.data_agreements for insert to authenticated
  with check ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()));
create policy "club admin revokes own agreement" on public.data_agreements for update to authenticated
  using ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()))
  with check ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()));
create policy "club admin reads own consents" on public.player_consents for select to authenticated
  using ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()));
create policy "club admin reads own withdrawals" on public.consent_withdrawals for select to authenticated
  using ((select public.my_role()) = 'club_admin' and club_id = (select public.my_club()));

-- Revoking an agreement is one-way: a revoked row cannot be revived by clearing revoked_at.
create function public.agreement_revoke_once() returns trigger language plpgsql set search_path = '' as
  $$ begin
    if old.revoked_at is not null then raise exception 'agreement_already_revoked'; end if;
    if new.revoked_at is null then raise exception 'agreement_cannot_be_revived'; end if;
    new.revoked_at = now();
    return new;
  end $$;
create trigger data_agreements_revoke before update on public.data_agreements
  for each row execute function public.agreement_revoke_once();

-- import_squad(rows): replaces the caller's club squad with the rows, atomically.
-- Each row: { num, name, pos, status, ends_on, starts_on?, monthly_wage_bhd, consent_ref }.
-- Returns { ok: true, players: n } or { ok: false, errors: [{ row, field, code }] } (row = 1-based data row).
-- Authorisation failures raise: forbidden, dpa_required.
create function public.import_squad(p_rows jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_club uuid := (select public.my_club());
  v_errors jsonb := '[]'::jsonb;
  v_n int;
  r jsonb; i int := 0;
  v_name text; v_pos text; v_status text; v_ref text; v_num int; v_wage numeric; v_start date; v_end date;
  v_seen int[] := '{}';
  v_id uuid;
begin
  if (select public.my_role()) is distinct from 'club_admin' or v_club is null then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.data_agreements where club_id = v_club and revoked_at is null) then raise exception 'dpa_required'; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' then return jsonb_build_object('ok', false, 'errors', jsonb_build_array(jsonb_build_object('row', 0, 'field', 'rows', 'code', 'not_a_list'))); end if;
  v_n := jsonb_array_length(p_rows);
  if v_n = 0 or v_n > 60 then return jsonb_build_object('ok', false, 'errors', jsonb_build_array(jsonb_build_object('row', 0, 'field', 'rows', 'code', 'bad_row_count'))); end if;

  -- 1) validate every row; collect every problem so the club fixes them in one pass
  for r in select * from jsonb_array_elements(p_rows) loop
    i := i + 1;
    v_name := btrim(coalesce(r ->> 'name', '')); v_pos := btrim(coalesce(r ->> 'pos', '')); v_status := coalesce(r ->> 'status', ''); v_ref := btrim(coalesce(r ->> 'consent_ref', ''));
    if length(v_name) not between 2 and 60 then v_errors := v_errors || jsonb_build_object('row', i, 'field', 'name', 'code', 'bad_length'); end if;
    if length(v_pos) not between 2 and 30 then v_errors := v_errors || jsonb_build_object('row', i, 'field', 'pos', 'code', 'bad_length'); end if;
    if v_status not in ('fit', 'doubtful', 'injured', 'suspended') then v_errors := v_errors || jsonb_build_object('row', i, 'field', 'status', 'code', 'bad_status'); end if;
    if length(v_ref) not between 3 and 60 then v_errors := v_errors || jsonb_build_object('row', i, 'field', 'consent_ref', 'code', 'consent_required'); end if;
    if v_name ~ '^[=+\-@]' or v_pos ~ '^[=+\-@]' or v_ref ~ '^[=+\-@]' then v_errors := v_errors || jsonb_build_object('row', i, 'field', 'text', 'code', 'formula_prefix'); end if;
    begin v_num := (r ->> 'num')::int; exception when others then v_num := null; end;
    if v_num is null or v_num not between 1 and 99 then v_errors := v_errors || jsonb_build_object('row', i, 'field', 'num', 'code', 'bad_number');
    elsif v_num = any (v_seen) then v_errors := v_errors || jsonb_build_object('row', i, 'field', 'num', 'code', 'duplicate_number');
    else v_seen := v_seen || v_num; end if;
    begin v_wage := (r ->> 'monthly_wage_bhd')::numeric; exception when others then v_wage := null; end;
    if v_wage is null or v_wage < 0 or v_wage > 100000 then v_errors := v_errors || jsonb_build_object('row', i, 'field', 'monthly_wage_bhd', 'code', 'bad_wage'); end if;
    begin v_end := (r ->> 'ends_on')::date; exception when others then v_end := null; end;
    begin v_start := coalesce((r ->> 'starts_on')::date, current_date); exception when others then v_start := null; end;
    if v_end is null then v_errors := v_errors || jsonb_build_object('row', i, 'field', 'ends_on', 'code', 'bad_date');
    elsif v_start is null then v_errors := v_errors || jsonb_build_object('row', i, 'field', 'starts_on', 'code', 'bad_date');
    elsif v_end <= v_start then v_errors := v_errors || jsonb_build_object('row', i, 'field', 'ends_on', 'code', 'ends_before_start'); end if;
  end loop;
  if jsonb_array_length(v_errors) > 0 then return jsonb_build_object('ok', false, 'errors', v_errors); end if;

  -- 2) replace the squad (cascades to old contracts, statuses and consents) and write the new rows
  delete from public.players where club_id = v_club;
  for r in select * from jsonb_array_elements(p_rows) loop
    insert into public.players (club_id, name, num, pos)
      values (v_club, btrim(r ->> 'name'), (r ->> 'num')::int, btrim(r ->> 'pos')) returning id into v_id;
    insert into public.contracts (player_id, club_id, starts_on, ends_on, monthly_wage_bhd, is_demo)
      values (v_id, v_club, coalesce((r ->> 'starts_on')::date, current_date), (r ->> 'ends_on')::date, (r ->> 'monthly_wage_bhd')::numeric, false);
    insert into public.player_status (player_id, club_id, status, is_demo) values (v_id, v_club, r ->> 'status', false);
    insert into public.player_consents (player_id, club_id, consent_ref) values (v_id, v_club, btrim(r ->> 'consent_ref'));
  end loop;
  return jsonb_build_object('ok', true, 'players', v_n);
end $$;

-- withdraw_consent(player): the player's pay and availability are deleted now; only a count-only log line stays.
create function public.withdraw_consent(p_player uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_club uuid := (select public.my_club()); v_ref text;
begin
  if (select public.my_role()) is distinct from 'club_admin' or v_club is null then raise exception 'forbidden'; end if;
  select consent_ref into v_ref from public.player_consents where player_id = p_player and club_id = v_club;
  if v_ref is null then raise exception 'not_found'; end if;
  insert into public.consent_withdrawals (club_id, consent_ref) values (v_club, v_ref);
  delete from public.players where id = p_player and club_id = v_club;
end $$;

revoke execute on function public.import_squad(jsonb), public.withdraw_consent(uuid) from public, anon;
grant execute on function public.import_squad(jsonb), public.withdraw_consent(uuid) to authenticated;
