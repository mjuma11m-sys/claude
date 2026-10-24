-- Attacks add_players: adds a light roster without replacing the squad, behind the same locks as import_squad. Runs after seed_demo.sql.
\set ON_ERROR_STOP on
create function pg_temp.check(ok boolean, what text) returns void language plpgsql as
  $$ begin if ok is distinct from true then raise exception 'FAIL: %', what; end if; raise notice 'ok  %', what; end $$;
create function pg_temp.raises(sql text, msg text, what text) returns void language plpgsql as
  $$ begin execute sql; raise exception 'FAIL: % (nothing raised)', what;
     exception when raise_exception then
       if sqlerrm = msg then raise notice 'ok  %', what; else raise exception 'FAIL: % (got %)', what, sqlerrm; end if; end $$;
create function pg_temp.denied(sql text, what text) returns void language plpgsql as
  $$ begin execute sql; raise exception 'FAIL: %', what;
     exception when insufficient_privilege or check_violation or foreign_key_violation or unique_violation then raise notice 'ok  %', what; end $$;
create function pg_temp.add(rows jsonb, ref text) returns jsonb language sql as $$ select public.add_players(rows, ref) $$;
grant execute on function pg_temp.add(jsonb, text) to authenticated, anon;

create temp table w as select
  (select id from public.clubs where name = 'نادي تجريبي 05') as x,
  (select id from public.clubs where name = 'نادي تجريبي 06') as y;
grant select on w to anon, authenticated;
insert into auth.users (id) values ('e1000000-0000-0000-0000-00000000000a'), ('e1000000-0000-0000-0000-00000000000b'), ('e1000000-0000-0000-0000-00000000000c');
update public.profiles set role = 'club_admin', club_id = (select x from w) where id = 'e1000000-0000-0000-0000-00000000000a';
update public.profiles set role = 'medical', club_id = (select x from w) where id = 'e1000000-0000-0000-0000-00000000000b';
update public.profiles set role = 'club_admin', club_id = (select y from w) where id = 'e1000000-0000-0000-0000-00000000000c';

create temp table ok_rows as select jsonb_build_array(
  jsonb_build_object('num', 7, 'name', 'خالد المحمد', 'pos', 'مهاجم'),
  jsonb_build_object('num', 10, 'name', 'سالم العلي', 'pos', 'وسط')) as rows;
grant select on ok_rows to authenticated;

-- not a club admin, and no agreement yet
set role authenticated; set request.jwt.claim.sub = 'e1000000-0000-0000-0000-00000000000b';
select pg_temp.raises($$ select pg_temp.add((select rows from ok_rows), 'نموذج-1') $$, 'forbidden', 'medical staff cannot add players');
set request.jwt.claim.sub = 'e1000000-0000-0000-0000-00000000000a';
select pg_temp.raises($$ select pg_temp.add((select rows from ok_rows), 'نموذج-1') $$, 'dpa_required', 'refused until the data agreement is on record');
select pg_temp.check((select count(*) = 0 from public.players where club_id = (select x from w)), 'a refused call writes nothing');
set role anon;
select pg_temp.denied($$ select public.add_players('[]'::jsonb, 'نموذج-1') $$, 'a signed-out caller cannot run it');
set role authenticated; set request.jwt.claim.sub = 'e1000000-0000-0000-0000-00000000000c';
select pg_temp.raises($$ select pg_temp.add((select rows from ok_rows), 'نموذج-1') $$, 'dpa_required', 'another club without an agreement is refused too');

-- with the agreement on record
set request.jwt.claim.sub = 'e1000000-0000-0000-0000-00000000000a';
insert into public.data_agreements (club_id, version, signatory_name, signatory_title, reference, signed_on) values ((select x from w), 'dpa-draft-1', 'فلان الفلاني', 'المدير', 'DPA-ADD-1', current_date);
select pg_temp.check((pg_temp.add((select rows from ok_rows), 'نموذج-1')) ->> 'ok' = 'true', 'a clean list is added');
select pg_temp.check((select count(*) = 2 from public.players where club_id = (select x from w)), 'two players written');
select pg_temp.check((select count(*) = 2 from public.player_consents where club_id = (select x from w) and consent_ref = 'نموذج-1'), 'each carries the consent reference the club wrote');
select pg_temp.check((select count(*) = 2 from public.player_status where club_id = (select x from w) and status = 'fit' and not is_demo), 'status starts as fit');
select pg_temp.check((select count(*) = 0 from public.contracts where club_id = (select x from w)), 'no contract or pay is created');

-- it adds, it does not replace
select pg_temp.check((pg_temp.add(jsonb_build_array(jsonb_build_object('num', 11, 'name', 'ناصر الحمد', 'pos', 'جناح')), 'نموذج-2')) ->> 'ok' = 'true', 'a second list is added');
select pg_temp.check((select count(*) = 3 from public.players where club_id = (select x from w)), 'the first two are still there');

-- rejections come back as a list and write nothing
select pg_temp.check((pg_temp.add(jsonb_build_array(jsonb_build_object('num', 7, 'name', 'مكرر', 'pos', 'وسط')), 'نموذج-3')) #>> '{errors,0,code}' = 'duplicate_number', 'a number already in the squad is refused');
select pg_temp.check((pg_temp.add(jsonb_build_array(jsonb_build_object('num', 20, 'name', 'أول', 'pos', 'وسط'), jsonb_build_object('num', 20, 'name', 'ثاني', 'pos', 'وسط')), 'نموذج-3')) #>> '{errors,0,code}' = 'duplicate_number', 'a number repeated inside the list is refused');
select pg_temp.check((pg_temp.add(jsonb_build_array(jsonb_build_object('num', 0, 'name', 'x', 'pos', '=cmd')), 'نموذج-3')) -> 'errors' @> '[{"field":"num","code":"bad_number"},{"field":"name","code":"bad_length"}]'::jsonb, 'bad number and short name are both reported');
select pg_temp.check((pg_temp.add(jsonb_build_array(jsonb_build_object('num', 21, 'name', '=HYPERLINK', 'pos', 'وسط')), 'نموذج-3')) #>> '{errors,0,code}' = 'formula_prefix', 'a spreadsheet formula is refused');
select pg_temp.check((pg_temp.add((select rows from ok_rows), '')) #>> '{errors,0,code}' = 'consent_required', 'no consent reference, no add');
select pg_temp.check((pg_temp.add((select rows from ok_rows), '  ')) #>> '{errors,0,code}' = 'consent_required', 'a blank consent reference is no reference');
select pg_temp.check((pg_temp.add((select jsonb_agg(jsonb_build_object('num', n, 'name', 'لاعب ' || n, 'pos', 'وسط')) from generate_series(30, 88) n), 'نموذج-3')) #>> '{errors,0,code}' = 'bad_row_count', 'the squad cannot pass 60 players');
select pg_temp.check((select count(*) = 3 from public.players where club_id = (select x from w)), 'every refusal left the squad untouched');

-- club isolation
set request.jwt.claim.sub = 'e1000000-0000-0000-0000-00000000000c';
select pg_temp.check((select count(*) = 0 from public.players where club_id = (select x from w)), 'another club cannot read the added players');
