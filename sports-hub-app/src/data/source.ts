/* One door to Fan Zone data: Supabase when configured, demo data otherwise.
   Pages never import demo.ts directly, so switching to real data touches nothing else. */
import { supabase } from '../lib/supabase'
import type { Row } from '../lib/standings'
import { LEAGUES, MOTM_CANDIDATES, MOTM_SEED, MY_CLUB, NEXT_MATCH } from './demo'

type League = { id: string; name: string; rows: Row[]; updatedAt: string | null; source: string | null }
type Candidate = { id: string; name: string; num: number | null; pos: string }
type Match = { id: string; home: string; away: string; venue: string; kickoff: string; candidates: Candidate[] }
type Result<T> = { data: T; demo: boolean }

const FAV_KEY = 'sh.favClub'
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
  const { data, error } = await supabase.from('clubs').select('id, name').order('name').returns<Club[]>()
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
