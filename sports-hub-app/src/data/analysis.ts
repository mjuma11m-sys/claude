/* Match reports. With Supabase: RLS tables written only through save_match_report() (migration 0011). Without it: a browser sandbox
   seeded with one fictional match, so the replay has something honest to show. */
import { supabase } from '../lib/supabase'
import type { EKind, Ev } from '../lib/analysis'

export type Report = { id: string; matchOn: string; opponent: string; home: boolean; possession: number | null; keeperId: string | null; events: Ev[] }
export type ReportInput = { matchOn: string; opponent: string; home: boolean; possession: number | null; keeperId: string | null; events: Ev[] }
export type SaveResult = { ok: true; id: string } | { ok: false; errors: { field: string; code: string; row?: number }[] }

const KEY = 'sh.demoReports'
const read = (): Report[] | null => { try { const v = localStorage.getItem(KEY); return v ? (JSON.parse(v) as Report[]) : null } catch { return null } }
const write = (r: Report[]) => { try { localStorage.setItem(KEY, JSON.stringify(r)) } catch { /* session-only */ } }
const iso = (back: number) => new Date(Date.now() - back * 86_400_000).toISOString().slice(0, 10)
const ev = (minute: number, team: 'us' | 'opp', kind: EKind, o: Partial<Ev> = {}): Ev => ({ minute, team, kind, ...o })

/* A fictional 2-2 against "نادي تجريبي 07": we lead, they level late, we pressure at the end. Positions are approximate taps (x across the pitch, y 0 = their goal line, 100 = ours). */
function seed(): Report[] {
  const events: Ev[] = [
    ev(4, 'opp', 'corner'), ev(9, 'us', 'shot', { x: 62, y: 24, playerId: 'demo-9' }), ev(14, 'us', 'shot_on', { x: 48, y: 15, playerId: 'demo-10' }), ev(17, 'us', 'corner'),
    ev(23, 'us', 'goal', { x: 52, y: 10, playerId: 'demo-9' }), ev(29, 'opp', 'shot', { x: 35, y: 78 }), ev(33, 'us', 'yellow', { playerId: 'demo-4' }), ev(38, 'opp', 'shot_on', { x: 55, y: 82 }),
    ev(44, 'us', 'shot', { x: 30, y: 28, playerId: 'demo-11' }), ev(52, 'opp', 'shot_on', { x: 48, y: 85 }), ev(55, 'opp', 'goal', { x: 50, y: 90 }), ev(58, 'us', 'sub', { playerId: 'demo-17' }),
    ev(61, 'opp', 'corner'), ev(64, 'us', 'shot_on', { x: 58, y: 12, playerId: 'demo-17' }), ev(67, 'us', 'goal', { x: 46, y: 8, playerId: 'demo-17' }), ev(71, 'opp', 'shot', { x: 70, y: 70 }),
    ev(76, 'opp', 'shot_on', { x: 45, y: 88 }), ev(79, 'opp', 'shot_on', { x: 52, y: 86 }), ev(82, 'opp', 'yellow'), ev(84, 'opp', 'shot', { x: 25, y: 74 }), ev(86, 'opp', 'shot_on', { x: 50, y: 80 }),
    ev(88, 'opp', 'goal', { x: 44, y: 91 }), ev(90, 'us', 'shot', { x: 66, y: 20, playerId: 'demo-9' }), ev(92, 'us', 'corner'), ev(93, 'us', 'shot_on', { x: 50, y: 14, playerId: 'demo-10' }), ev(94, 'opp', 'sub'),
  ]
  return [{ id: 'r-demo', matchOn: iso(6), opponent: 'نادي تجريبي 07', home: true, possession: 54, keeperId: 'demo-1', events }]
}

async function myClubId(userId: string): Promise<string> {
  const { data, error } = await supabase!.from('profiles').select('club_id').eq('id', userId).single<{ club_id: string | null }>()
  if (error || !data.club_id) throw error ?? new Error('no-club')
  return data.club_id
}

export async function getReports(userId: string): Promise<Report[]> {
  if (!supabase) return read() ?? seed()
  const clubId = await myClubId(userId)
  const [rs, es] = await Promise.all([
    supabase.from('match_reports').select('id, match_on, opponent, home, possession, keeper_id').eq('club_id', clubId).order('match_on', { ascending: false }).limit(30)
      .returns<{ id: string; match_on: string; opponent: string; home: boolean; possession: number | null; keeper_id: string | null }[]>(),
    supabase.from('match_events').select('report_id, n, minute, team, kind, player_id, x, y').eq('club_id', clubId).order('n').limit(6000)
      .returns<{ report_id: string; n: number; minute: number; team: 'us' | 'opp'; kind: EKind; player_id: string | null; x: number | null; y: number | null }[]>(),
  ])
  if (rs.error) throw rs.error
  if (es.error) throw es.error
  return rs.data.map((r) => ({
    id: r.id, matchOn: r.match_on, opponent: r.opponent, home: r.home, possession: r.possession, keeperId: r.keeper_id,
    events: es.data.filter((e) => e.report_id === r.id).map((e) => ({ minute: e.minute, team: e.team, kind: e.kind, playerId: e.player_id, x: e.x, y: e.y })),
  }))
}

export async function saveReport(r: ReportInput): Promise<SaveResult> {
  if (!supabase) {
    const all = read() ?? seed()
    const id = `r-${r.matchOn}`
    write([...all.filter((x) => x.matchOn !== r.matchOn), { ...r, id }].sort((a, b) => b.matchOn.localeCompare(a.matchOn)))
    return { ok: true, id }
  }
  const { data, error } = await supabase.rpc('save_match_report', {
    p_match_on: r.matchOn, p_opponent: r.opponent, p_home: r.home, p_possession: r.possession, p_keeper: r.keeperId,
    p_events: r.events.map((e) => ({ minute: e.minute, team: e.team, kind: e.kind, player_id: e.playerId ?? null, x: e.x ?? null, y: e.y ?? null })),
  })
  if (error) throw error
  return data as SaveResult
}

export async function deleteReport(id: string): Promise<void> {
  if (!supabase) { write((read() ?? seed()).filter((r) => r.id !== id)); return }
  const { error } = await supabase.from('match_reports').delete().eq('id', id)
  if (error) throw error
}
