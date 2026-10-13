/* One door to Fan Zone data: Supabase when configured, demo data otherwise.
   Pages never import demo.ts directly, so switching to real data touches nothing else. */
import { supabase } from '../lib/supabase'
import type { Row } from '../lib/standings'
import { acwr, zone } from '../lib/acwr'
import type { PlayerStatus } from '../lib/squad'
import type { DivisionId } from './demo'
import { DEMO_CLUB, DEMO_FINANCE, DEMO_SEASON, DEMO_SQUAD, LEAGUES, LIMITS_DEMO, MOTM_CANDIDATES, MOTM_SEED, MY_CLUB, NEXT_MATCH, SQUAD_LOADS } from './demo'

type League = { id: string; name: string; rows: Row[]; updatedAt: string | null; source: string | null }
type Candidate = { id: string; name: string; num: number | null; pos: string }
type Match = { id: string; home: string; away: string; venue: string; kickoff: string; candidates: Candidate[] }
type Result<T> = { data: T; demo: boolean }

const FAV_KEY = 'sh.favClub'
const DEMO_FIN_KEY = 'sh.demoReport' // a club admin's demo submission, so the federation demo room can show it (cleared with the rest)
const VOTE_KEY = 'sh.motmVote'
const local = {
  get: (k: string) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* session-only */ } },
}

/* ---------- leagues ---------- */

type LeagueRow = {
  id: string; name: string
  league_entries: { played: number; won: number; drawn: number; lost: number; gf: number; ga: number; is_demo: boolean; source: string | null; updated_at: string; clubs: { name: string } | null }[]
}

export async function getLeagues(): Promise<Result<League[]>> {
  if (!supabase) return { data: LEAGUES.map((l) => ({ id: l.id, name: l.name, rows: [...l.rows], updatedAt: null, source: null })), demo: true }
  const { data, error } = await supabase
    .from('leagues')
    .select('id, name, league_entries(played, won, drawn, lost, gf, ga, is_demo, source, updated_at, clubs(name))')
    .order('tier')
    .returns<LeagueRow[]>()
  if (error) throw error
  return {
    data: data.map((l) => {
      // Freshness only counts when every row is real; one demo row makes the whole table "demo".
      const real = l.league_entries.length > 0 && l.league_entries.every((e) => !e.is_demo)
      const latest = real ? [...l.league_entries].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0] : null
      return {
        id: l.id,
        name: l.name,
        rows: l.league_entries.map(({ clubs, is_demo: _d, source: _s, updated_at: _u, ...r }) => ({ team: clubs?.name ?? '—', ...r })),
        updatedAt: latest?.updated_at ?? null,
        source: latest?.source ?? null,
      }
    }),
    demo: data.some((l) => l.league_entries.some((e) => e.is_demo)),
  }
}

/* ---------- next match + man of the match ---------- */

type MatchRow = {
  id: string; venue: string; kickoff: string; is_demo: boolean
  home: { name: string } | null; away: { name: string } | null
  motm_candidates: { players: Candidate | null }[]
}

export async function getNextMatch(): Promise<Result<Match | null>> {
  if (!supabase) {
    return { data: { id: 'demo', ...NEXT_MATCH, candidates: MOTM_CANDIDATES }, demo: true }
  }
  const votingOpenSince = new Date(Date.now() - 2 * 3600_000).toISOString()
  const { data, error } = await supabase
    .from('matches')
    .select('id, venue, kickoff, is_demo, home:clubs!matches_home_id_fkey(name), away:clubs!matches_away_id_fkey(name), motm_candidates(players(id, name, num, pos))')
    .gte('kickoff', votingOpenSince)
    .order('kickoff')
    .limit(1)
    .returns<MatchRow[]>()
  if (error) throw error
  const m = data[0]
  if (!m) return { data: null, demo: false }
  return {
    data: {
      id: m.id, venue: m.venue, kickoff: m.kickoff,
      home: m.home?.name ?? '—', away: m.away?.name ?? '—',
      candidates: m.motm_candidates.flatMap((c) => (c.players ? [c.players] : [])).sort((a, b) => (a.num ?? 0) - (b.num ?? 0)),
    },
    demo: m.is_demo,
  }
}

type Votes = { counts: Record<string, number>; mine: string | null }

export async function getVotes(matchId: string): Promise<Votes> {
  if (!supabase) {
    const mine = local.get(VOTE_KEY)
    return { counts: { ...MOTM_SEED, ...(mine ? { [mine]: (MOTM_SEED[mine] ?? 0) + 1 } : {}) }, mine }
  }
  const [tally, own] = await Promise.all([
    supabase.rpc('motm_tally', { p_match: matchId }),
    supabase.from('motm_votes').select('player_id').eq('match_id', matchId).maybeSingle<{ player_id: string }>(),
  ])
  if (tally.error) throw tally.error
  return {
    counts: Object.fromEntries(((tally.data ?? []) as { player_id: string; votes: number }[]).map((t) => [t.player_id, Number(t.votes)])),
    mine: own.data?.player_id ?? null,
  }
}

/* The database enforces one vote per fan; a duplicate comes back as 23505. */
export async function castVote(matchId: string, playerId: string): Promise<'ok' | 'already' | 'closed'> {
  if (!supabase) { local.set(VOTE_KEY, playerId); return 'ok' }
  const { error } = await supabase.from('motm_votes').insert({ match_id: matchId, player_id: playerId })
  if (!error) return 'ok'
  if (error.code === '23505') return 'already'
  if (error.code === '42501') return 'closed'
  throw error
}

/* ---------- my club ---------- */

export type Club = { id: string; name: string }

export async function getClubs(): Promise<Club[]> {
  if (!supabase) return [...new Set(LEAGUES.flatMap((l) => l.rows.map((r) => r.team)))].map((name) => ({ id: name, name }))
  const { data, error } = await supabase.from('clubs').select('id, name').eq('is_fictional', false).order('name').returns<Club[]>()
  if (error) throw error
  return data
}

export async function getMyClub(userId: string): Promise<string | null> {
  if (!supabase) return local.get(FAV_KEY) ?? MY_CLUB
  const { data } = await supabase
    .from('profiles')
    .select('fav:clubs!profiles_fav_club_id_fkey(name)')
    .eq('id', userId)
    .maybeSingle<{ fav: { name: string } | null }>()
  return data?.fav?.name ?? null
}

export async function setMyClub(userId: string, club: Club): Promise<void> {
  if (!supabase) return local.set(FAV_KEY, club.name)
  const { error } = await supabase.from('profiles').update({ fav_club_id: club.id }).eq('id', userId)
  if (error) throw error
}

/* ---------- club room (club admins) ---------- */

export type SquadRow = { id: string; num: number | null; name: string; pos: string; status: PlayerStatus; note: string | null; endsOn: string; wage: number }
export type ClubFinance = { season: string; revenue: number; wages: number; submittedAt: string }
export type ClubRoom = { clubName: string; league: DivisionId | null; squad: SquadRow[]; finance: ClubFinance | null; limit: number; loadAlerts: number | null }

export type Limits = Record<DivisionId, number>

/* One wage limit per division. A missing rule falls back to the demo value, never to "no limit". */
export async function getLimits(): Promise<Limits> {
  if (!supabase) return { ...LIMITS_DEMO }
  const { data } = await supabase.from('rules').select('key, value').like('key', 'ffp_wage_ratio_limit:%').returns<{ key: string; value: number }[]>()
  const out = { ...LIMITS_DEMO }
  for (const r of data ?? []) { const id = r.key.split(':')[1]; if (isDivision(id)) out[id] = Number(r.value) }
  return out
}

export const isDivision = (v: unknown): v is DivisionId => v === 'premier' || v === 'second'

function readDemoReport(): ClubFinance | null {
  try { const raw = localStorage.getItem(DEMO_FIN_KEY); return raw ? (JSON.parse(raw) as ClubFinance) : null } catch { return null }
}

export async function getClubRoom(userId: string): Promise<Result<ClubRoom>> {
  if (!supabase) {
    const seed = DEMO_FINANCE[0]
    const mine = readDemoReport() ?? { season: DEMO_SEASON, revenue: seed.revenue!, wages: seed.wages!, submittedAt: new Date().toISOString() }
    // Load alerts come from the demo ACWR series (loads are never stored in the database).
    const alerts = SQUAD_LOADS.filter((p) => { const r = acwr(p.loads); return r !== null && zone(r) !== 'safe' && zone(r) !== 'low' }).length
    return { data: { clubName: DEMO_CLUB, league: DEMO_FINANCE[0].league, squad: DEMO_SQUAD, finance: mine, limit: LIMITS_DEMO[DEMO_FINANCE[0].league], loadAlerts: alerts }, demo: true }
  }
  const me = await supabase.from('profiles').select('club_id, clubs!profiles_club_id_fkey(name, league_id)').eq('id', userId).single<{ club_id: string | null; clubs: { name: string; league_id: string | null } | null }>()
  if (me.error) throw me.error
  const clubId = me.data.club_id
  if (!clubId) throw new Error('no-club')
  const [players, contracts, statuses, reports, limit] = await Promise.all([
    supabase.from('players').select('id, name, num, pos').eq('club_id', clubId).order('num').returns<{ id: string; name: string; num: number | null; pos: string }[]>(),
    supabase.from('contracts').select('player_id, ends_on, monthly_wage_bhd, is_demo').eq('club_id', clubId).returns<{ player_id: string; ends_on: string; monthly_wage_bhd: number; is_demo: boolean }[]>(),
    supabase.from('player_status').select('player_id, status, note, is_demo').eq('club_id', clubId).returns<{ player_id: string; status: PlayerStatus; note: string | null; is_demo: boolean }[]>(),
    supabase.from('club_finance_reports').select('season, revenue_bhd, wages_bhd, submitted_at, is_demo').eq('club_id', clubId).order('season', { ascending: false }).limit(1).returns<{ season: string; revenue_bhd: number; wages_bhd: number; submitted_at: string; is_demo: boolean }[]>(),
    getLimits(),
  ])
  for (const r of [players, contracts, statuses, reports]) if (r.error) throw r.error
  const c = new Map(contracts.data!.map((x) => [x.player_id, x]))
  const s = new Map(statuses.data!.map((x) => [x.player_id, x]))
  const squad: SquadRow[] = players.data!.flatMap((p) => {
    const ct = c.get(p.id)
    return ct ? [{ id: p.id, num: p.num, name: p.name, pos: p.pos, status: s.get(p.id)?.status ?? 'fit', note: s.get(p.id)?.note ?? null, endsOn: ct.ends_on, wage: Number(ct.monthly_wage_bhd) }] : []
  })
  const r = reports.data![0]
  const league = isDivision(me.data.clubs?.league_id) ? me.data.clubs.league_id : null
  return {
    data: { clubName: me.data.clubs?.name ?? '—', league, squad, finance: r ? { season: r.season, revenue: Number(r.revenue_bhd), wages: Number(r.wages_bhd), submittedAt: r.submitted_at } : null, limit: limit[league ?? 'premier'], loadAlerts: null },
    demo: contracts.data!.some((x) => x.is_demo) || statuses.data!.some((x) => x.is_demo) || !!r?.is_demo,
  }
}

/* Submitting is the club's explicit consent for the federation to read these two season totals. */
export async function submitFinance(userId: string, season: string, revenue: number, wages: number): Promise<void> {
  if (!supabase) {
    try { localStorage.setItem(DEMO_FIN_KEY, JSON.stringify({ season, revenue, wages, submittedAt: new Date().toISOString() })) } catch { /* session-only */ }
    return
  }
  const me = await supabase.from('profiles').select('club_id').eq('id', userId).single<{ club_id: string | null }>()
  if (me.error || !me.data.club_id) throw me.error ?? new Error('no-club')
  const row = { club_id: me.data.club_id, season, revenue_bhd: revenue, wages_bhd: wages }
  const ins = await supabase.from('club_finance_reports').insert(row)
  if (!ins.error) return
  if (ins.error.code !== '23505') throw ins.error // 23505 = already filed this season: amend it instead
  const upd = await supabase.from('club_finance_reports').update({ revenue_bhd: revenue, wages_bhd: wages }).eq('club_id', row.club_id).eq('season', season)
  if (upd.error) throw upd.error
}

/* ---------- federation room ---------- */

export type FedRow = { club: string; league: DivisionId | null; revenue: number | null; wages: number | null; submittedAt: string | null }
export type FederationRoom = { limits: Limits; season: string; rows: FedRow[]; leagues: { id: string; name: string; updatedAt: string | null; source: string | null }[] }

export async function getFederationRoom(): Promise<Result<FederationRoom>> {
  const leagues = await getLeagues()
  const lg = leagues.data.map(({ id, name, updatedAt, source }) => ({ id, name, updatedAt, source }))
  if (!supabase) {
    const mine = readDemoReport()
    const rows = DEMO_FINANCE.map((f, i) => (i === 0 && mine ? { club: f.club, league: f.league, revenue: mine.revenue, wages: mine.wages, submittedAt: mine.submittedAt } : { club: f.club, league: f.league, revenue: f.revenue, wages: f.wages, submittedAt: f.revenue === null ? null : new Date(Date.now() - (i + 1) * 86_400_000 * 3).toISOString() }))
    return { data: { limits: { ...LIMITS_DEMO }, season: DEMO_SEASON, rows, leagues: lg }, demo: true }
  }
  const [reports, real, limits] = await Promise.all([
    supabase.from('club_finance_reports').select('season, revenue_bhd, wages_bhd, submitted_at, is_demo, clubs(name, league_id)').order('season', { ascending: false }).returns<{ season: string; revenue_bhd: number; wages_bhd: number; submitted_at: string; is_demo: boolean; clubs: { name: string; league_id: string | null } | null }[]>(),
    supabase.from('league_entries').select('league_id, clubs(name)').eq('is_demo', false).returns<{ league_id: string; clubs: { name: string } | null }[]>(),
    getLimits(),
  ])
  if (reports.error) throw reports.error
  const season = reports.data[0]?.season ?? DEMO_SEASON
  const filed = reports.data.filter((r) => r.season === season)
  const rows: FedRow[] = filed.map((r) => ({ club: r.clubs?.name ?? '—', league: isDivision(r.clubs?.league_id) ? r.clubs.league_id : null, revenue: Number(r.revenue_bhd), wages: Number(r.wages_bhd), submittedAt: r.submitted_at }))
  // Clubs in a real (imported) league table that have not filed yet show up as "has not filed", never as fine.
  for (const e of real.data ?? []) {
    const name = e.clubs?.name
    if (name && !rows.some((r) => r.club === name)) rows.push({ club: name, league: isDivision(e.league_id) ? e.league_id : null, revenue: null, wages: null, submittedAt: null })
  }
  return { data: { limits, season, rows, leagues: lg }, demo: filed.some((r) => r.is_demo) }
}
