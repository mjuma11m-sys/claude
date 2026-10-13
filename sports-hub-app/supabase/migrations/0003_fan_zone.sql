-- Fan Zone data: leagues, tables, fixtures, man-of-the-match votes, each fan's club.
-- Public data is readable by anyone; writes go through the service role (admin panel / import), never the app.
-- is_demo marks rows that are illustrative; the app shows «بيانات تجريبية» while any is present.

create table public.leagues (
  id    text primary key,
  name  text not null,
  tier  smallint not null
);

create table public.league_entries (
  league_id text not null references public.leagues (id) on delete cascade,
  club_id   uuid not null references public.clubs (id) on delete cascade,
  played    smallint not null default 0 check (played >= 0),
  won       smallint not null default 0 check (won >= 0),
  drawn     smallint not null default 0 check (drawn >= 0),
  lost      smallint not null default 0 check (lost >= 0),
  gf        smallint not null default 0 check (gf >= 0),
  ga        smallint not null default 0 check (ga >= 0),
  is_demo   boolean not null default true,
  primary key (league_id, club_id),
  check (played = won + drawn + lost)
);

create table public.players (
  id       uuid primary key default gen_random_uuid(),
  club_id  uuid not null references public.clubs (id) on delete cascade,
  name     text not null,
  num      smallint check (num between 1 and 99),
  pos      text not null
);
create index players_club_idx on public.players (club_id);

create table public.matches (
  id        uuid primary key default gen_random_uuid(),
  league_id text not null references public.leagues (id),
  home_id   uuid not null references public.clubs (id),
  away_id   uuid not null references public.clubs (id),
  venue     text not null,
  kickoff   timestamptz not null,
  is_demo   boolean not null default true,
  check (home_id <> away_id)
);
create index matches_kickoff_idx on public.matches (kickoff);

create table public.motm_candidates (
  match_id  uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  primary key (match_id, player_id)
);

-- One vote per fan per match, enforced by the primary key, not by the UI.
create table public.motm_votes (
  match_id   uuid not null,
  voter_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  player_id  uuid not null,
  created_at timestamptz not null default now(),
  primary key (match_id, voter_id),
  foreign key (match_id, player_id) references public.motm_candidates (match_id, player_id) on delete cascade
);

alter table public.profiles add column fav_club_id uuid references public.clubs (id);
grant update (fav_club_id) on public.profiles to authenticated;

alter table public.leagues enable row level security;
alter table public.league_entries enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.motm_candidates enable row level security;
alter table public.motm_votes enable row level security;

create policy "public read" on public.leagues for select to anon, authenticated using (true);
create policy "public read" on public.league_entries for select to anon, authenticated using (true);
create policy "public read" on public.players for select to anon, authenticated using (true);
create policy "public read" on public.matches for select to anon, authenticated using (true);
create policy "public read" on public.motm_candidates for select to anon, authenticated using (true);

-- Read-only from the app: no insert/update/delete grants for anon/authenticated on public data.
revoke insert, update, delete on public.leagues, public.league_entries, public.players,
  public.matches, public.motm_candidates from anon, authenticated;

-- A fan sees and casts only their own vote, and only before kickoff + 2h (voting window).
create policy "read own vote" on public.motm_votes for select to authenticated
  using (voter_id = (select auth.uid()));
create policy "vote once in window" on public.motm_votes for insert to authenticated
  with check (
    voter_id = (select auth.uid())
    and exists (select 1 from public.matches m where m.id = match_id and now() < m.kickoff + interval '2 hours')
  );
revoke update, delete on public.motm_votes from anon, authenticated;
revoke all on public.motm_votes from anon;

-- Totals are public; who voted for whom is not.
create function public.motm_tally(p_match uuid) returns table (player_id uuid, votes bigint)
  language sql stable security definer set search_path = '' as
  $$ select c.player_id, count(v.voter_id)
     from public.motm_candidates c
     left join public.motm_votes v on v.match_id = c.match_id and v.player_id = c.player_id
     where c.match_id = p_match
     group by c.player_id $$;
grant execute on function public.motm_tally(uuid) to anon, authenticated;
