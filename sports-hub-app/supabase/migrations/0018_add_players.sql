-- 0018: add_players(rows, consent_ref): the club admin adds players (number, name, position) to the squad without replacing it.
-- A light roster: no pay, no contract, no health beyond the default status. It keeps the same locks as import_squad:
-- club_admin only, the data agreement on record, every row checked, one consent reference written by the club for the batch.
-- Returns { ok: true, players: n } or { ok: false, errors: [{ row, field, code }] } (row = 1-based). Raises: forbidden, dpa_required.
create function public.add_players(p_rows jsonb, p_consent_ref text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_club uuid := (select public.my_club());
  v_errors jsonb := '[]'::jsonb;
  v_n int; v_have int;
  r jsonb; i int := 0;
  v_name text; v_pos text; v_num int;
  v_ref text := btrim(coalesce(p_consent_ref, ''));
  v_seen int[] := '{}';
  v_id uuid;
begin
  if (select public.my_role()) is distinct from 'club_admin' or v_club is null then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.data_agreements where club_id = v_club and revoked_at is null) then raise exception 'dpa_required'; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' then return jsonb_build_object('ok', false, 'errors', jsonb_build_array(jsonb_build_object('row', 0, 'field', 'rows', 'code', 'not_a_list'))); end if;
  v_n := jsonb_array_length(p_rows);
  select count(*) into v_have from public.players where club_id = v_club;
  if v_n = 0 or v_n + v_have > 60 then return jsonb_build_object('ok', false, 'errors', jsonb_build_array(jsonb_build_object('row', 0, 'field', 'rows', 'code', 'bad_row_count'))); end if;
  if length(v_ref) not between 3 and 60 then return jsonb_build_object('ok', false, 'errors', jsonb_build_array(jsonb_build_object('row', 0, 'field', 'consent_ref', 'code', 'consent_required'))); end if;
  if v_ref ~ '^[=+\-@]' then return jsonb_build_object('ok', false, 'errors', jsonb_build_array(jsonb_build_object('row', 0, 'field', 'consent_ref', 'code', 'formula_prefix'))); end if;

  for r in select * from jsonb_array_elements(p_rows) loop
    i := i + 1;
    v_name := btrim(coalesce(r ->> 'name', '')); v_pos := btrim(coalesce(r ->> 'pos', ''));
    if length(v_name) not between 2 and 60 then v_errors := v_errors || jsonb_build_object('row', i, 'field', 'name', 'code', 'bad_length'); end if;
    if length(v_pos) not between 2 and 30 then v_errors := v_errors || jsonb_build_object('row', i, 'field', 'pos', 'code', 'bad_length'); end if;
    if v_name ~ '^[=+\-@]' or v_pos ~ '^[=+\-@]' then v_errors := v_errors || jsonb_build_object('row', i, 'field', 'text', 'code', 'formula_prefix'); end if;
    begin v_num := (r ->> 'num')::int; exception when others then v_num := null; end;
    if v_num is null or v_num not between 1 and 99 then v_errors := v_errors || jsonb_build_object('row', i, 'field', 'num', 'code', 'bad_number');
    elsif v_num = any (v_seen) or exists (select 1 from public.players where club_id = v_club and num = v_num) then v_errors := v_errors || jsonb_build_object('row', i, 'field', 'num', 'code', 'duplicate_number');
    else v_seen := v_seen || v_num; end if;
  end loop;
  if jsonb_array_length(v_errors) > 0 then return jsonb_build_object('ok', false, 'errors', v_errors); end if;

  -- adds only: nothing is removed or changed
  for r in select * from jsonb_array_elements(p_rows) loop
    insert into public.players (club_id, name, num, pos) values (v_club, btrim(r ->> 'name'), (r ->> 'num')::int, btrim(r ->> 'pos')) returning id into v_id;
    insert into public.player_status (player_id, club_id, status, is_demo) values (v_id, v_club, 'fit', false);
    insert into public.player_consents (player_id, club_id, consent_ref) values (v_id, v_club, v_ref);
  end loop;
  return jsonb_build_object('ok', true, 'players', v_n);
end $$;

revoke execute on function public.add_players(jsonb, text) from public, anon;
grant execute on function public.add_players(jsonb, text) to authenticated;
