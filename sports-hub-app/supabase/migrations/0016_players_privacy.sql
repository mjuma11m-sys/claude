-- Privacy fix. Since 0003 every row of public.players was readable by anyone, signed in or not, through the REST API. That was fine for demo
-- candidates, but import_squad() now puts REAL players (name, number, position) in the same table, so a club's squad was public.
-- From here: a player is public only while they are a man-of-the-match candidate; otherwise only their own club's administrators and medical
-- staff can read them. (Every other screen reads players through the security-definer RPCs or through these same policies.)

drop policy "public read" on public.players;
create policy "public reads match candidates" on public.players for select to anon, authenticated
  using (exists (select 1 from public.motm_candidates c where c.player_id = players.id));
create policy "club staff read own players" on public.players for select to authenticated
  using ((select public.my_role()) in ('club_admin', 'medical') and club_id = (select public.my_club()));

-- Composite foreign keys cascade when a player is removed (squad re-import, consent withdrawal). Without a covering index each cascade
-- scans the whole child table. Indexes follow the advisor's list for the (player, club) / (parent, club) pairs.
create index if not exists attendance_marks_player_club_idx on public.attendance_marks (player_id, club_id);
create index if not exists attendance_marks_session_club_idx on public.attendance_marks (session_id, club_id);
create index if not exists contracts_player_club_idx on public.contracts (player_id, club_id);
create index if not exists dev_goals_player_club_idx on public.dev_goals (player_id, club_id);
create index if not exists skill_assessments_player_club_idx on public.skill_assessments (player_id, club_id);
create index if not exists training_logs_player_club_idx on public.training_logs (player_id, club_id);
create index if not exists lineup_players_lineup_club_idx on public.lineup_players (lineup_id, club_id);
create index if not exists lineup_players_player_club_idx on public.lineup_players (player_id, club_id);
create index if not exists match_events_report_club_idx on public.match_events (report_id, club_id);
create index if not exists match_events_player_club_idx on public.match_events (player_id, club_id);
create index if not exists match_reports_keeper_club_idx on public.match_reports (keeper_id, club_id);
create index if not exists player_consents_player_club_idx on public.player_consents (player_id, club_id);
create index if not exists player_requests_player_club_idx on public.player_requests (player_id, club_id);
create index if not exists player_status_player_club_idx on public.player_status (player_id, club_id);
create index if not exists wage_payments_player_club_idx on public.wage_payments (player_id, club_id);
create index if not exists motm_candidates_player_idx on public.motm_candidates (player_id);
create index if not exists matches_home_idx on public.matches (home_id);
create index if not exists matches_away_idx on public.matches (away_id);
create index if not exists league_entries_club_idx on public.league_entries (club_id);
