/* Saved match lineups. With Supabase: lineups + lineup_players (RLS: club administrators only), written only through save_lineup().
   Without it: a sandbox in this browser, labelled as a trial. */
import { supabase } from '../lib/supabase'
import type { Formation, Lineup } from '../lib/lineup'

export type SavedLineup = Lineup & { id: string; matchOn: string; opponent: string }
export type SaveResult = { ok: true; id: string } | { ok: false; errors: { field: string; code: string; row?: number }[] }

const KEY = 'sh.demoLineups'
const read = (): SavedLineup[] => { try { const v = localStorage.getItem(KEY); return v ? (JSON.parse(v) as SavedLineup[]) : [] } catch { return [] } }
const write = (l: SavedLineup[]) => { try { localStorage.setItem(KEY, JSON.stringify(l)) } catch { /* session-only */ } }

async function myClubId(userId: string): Promise<string> {
  const { data, error } = await supabase!.from('profiles').select('club_id').eq('id', userId).single<{ club_id: string | null }>()
  if (error || !data.club_id) throw error ?? new Error('no-club')
  return data.club_id
}

export async function getLineups(userId: string): Promise<SavedLineup[]> {
  if (!supabase) return read().sort((a, b) => b.matchOn.localeCompare(a.matchOn))
  const clubId = await myClubId(userId)
  const [ls, ps] = await Promise.all([
    supabase.from('lineups').select('id, match_on, opponent, formation').eq('club_id', clubId).order('match_on', { ascending: false }).limit(12).returns<{ id: string; match_on: string; opponent: string; formation: Formation }[]>(),
    supabase.from('lineup_players').select('lineup_id, player_id, role, slot').eq('club_id', clubId).returns<{ lineup_id: string; player_id: string; role: 'start' | 'bench'; slot: number }[]>(),
  ])
  if (ls.error) throw ls.error
  if (ps.error) throw ps.error
  return ls.data.map((l) => {
    const mine = ps.data.filter((p) => p.lineup_id === l.id)
    return {
      id: l.id, matchOn: l.match_on, opponent: l.opponent, formation: l.formation,
      starters: Object.fromEntries(mine.filter((p) => p.role === 'start').map((p) => [p.slot, p.player_id])),
      bench: mine.filter((p) => p.role === 'bench').sort((a, b) => a.slot - b.slot).map((p) => p.player_id),
    }
  })
}

export async function saveLineup(userId: string, l: { matchOn: string; opponent: string } & Lineup): Promise<SaveResult> {
  if (!supabase) {
    const id = `l-${l.matchOn}`
    write([...read().filter((x) => x.matchOn !== l.matchOn), { id, matchOn: l.matchOn, opponent: l.opponent.trim(), formation: l.formation, starters: l.starters, bench: l.bench }])
    return { ok: true, id }
  }
  void userId
  const { data, error } = await supabase.rpc('save_lineup', {
    p_match_on: l.matchOn, p_opponent: l.opponent, p_formation: l.formation,
    p_starters: Object.entries(l.starters).map(([slot, player_id]) => ({ player_id, slot: Number(slot) })),
    p_bench: l.bench.map((player_id) => ({ player_id })),
  })
  if (error) throw error
  return data as SaveResult
}

export async function deleteLineup(id: string): Promise<void> {
  if (!supabase) { write(read().filter((x) => x.id !== id)); return }
  const { error } = await supabase.from('lineups').delete().eq('id', id)
  if (error) throw error
}
