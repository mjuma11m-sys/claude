/* Attendance sessions and marks. With Supabase: RLS tables written only through save_attendance(). Without it: a browser sandbox,
   seeded with a fictional month of trainings so the figures have something honest to show. */
import { supabase } from '../lib/supabase'
import type { Kind, Mark, Reason, Session } from '../lib/attendance'
import { DEMO_SQUAD } from './demo'

export type SaveResult = { ok: true; id: string } | { ok: false; errors: { field: string; code: string; row?: number }[] }
const KEY = 'sh.demoAttendance'
const read = (): Session[] | null => { try { const v = localStorage.getItem(KEY); return v ? (JSON.parse(v) as Session[]) : null } catch { return null } }
const write = (s: Session[]) => { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* session-only */ } }
const iso = (back: number) => new Date(Date.now() - back * 86_400_000).toISOString().slice(0, 10)

/* Ten trainings and a match over four weeks. Player 11 missed the last three without an excuse, 3 is often late, 5 is injured (excused), 17 missed two apart. */
function seed(): Session[] {
  const backs = [1, 3, 5, 8, 10, 12, 15, 17, 19, 22, 25]
  return backs.map((back, i): Session => {
    const marks: Record<string, Mark> = {}
    for (const p of DEMO_SQUAD) marks[p.id] = { status: 'present' }
    marks['demo-5'] = { status: 'excused', reason: 'medical' }
    marks['demo-19'] = { status: 'excused', reason: 'medical' }
    if (i < 3) marks['demo-11'] = { status: 'absent' }
    if (i % 3 === 0) marks['demo-3'] = { status: 'late' }
    if (i === 2 || i === 6) marks['demo-17'] = { status: 'absent' }
    if (i === 4) marks['demo-8'] = { status: 'excused', reason: 'study' }
    return { id: `a-${back}`, day: iso(back), kind: back === 8 ? 'match' : 'training', marks }
  })
}

async function myClubId(userId: string): Promise<string> {
  const { data, error } = await supabase!.from('profiles').select('club_id').eq('id', userId).single<{ club_id: string | null }>()
  if (error || !data.club_id) throw error ?? new Error('no-club')
  return data.club_id
}

export async function getAttendance(userId: string): Promise<Session[]> {
  if (!supabase) return read() ?? seed()
  const clubId = await myClubId(userId)
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)
  const [ss, ms] = await Promise.all([
    supabase.from('attendance_sessions').select('id, day, kind').eq('club_id', clubId).gte('day', since).order('day', { ascending: false }).returns<{ id: string; day: string; kind: Kind }[]>(),
    supabase.from('attendance_marks').select('session_id, player_id, status, reason').eq('club_id', clubId).returns<{ session_id: string; player_id: string; status: Mark['status']; reason: Reason | null }[]>(),
  ])
  if (ss.error) throw ss.error
  if (ms.error) throw ms.error
  return ss.data.map((s) => ({ ...s, marks: Object.fromEntries(ms.data.filter((m) => m.session_id === s.id).map((m) => [m.player_id, { status: m.status, reason: m.reason }])) }))
}

export async function saveAttendance(day: string, kind: Kind, marks: Record<string, Mark>): Promise<SaveResult> {
  if (!supabase) {
    const all = read() ?? seed()
    const id = `a-${day}-${kind}`
    write([...all.filter((s) => !(s.day === day && s.kind === kind)), { id, day, kind, marks }])
    return { ok: true, id }
  }
  const { data, error } = await supabase.rpc('save_attendance', {
    p_day: day, p_kind: kind,
    p_marks: Object.entries(marks).map(([player_id, m]) => ({ player_id, status: m.status, reason: m.status === 'excused' ? m.reason ?? null : null })),
  })
  if (error) throw error
  return data as SaveResult
}

export async function deleteSession(id: string): Promise<void> {
  if (!supabase) { write((read() ?? seed()).filter((s) => s.id !== id)); return }
  const { error } = await supabase.from('attendance_sessions').delete().eq('id', id)
  if (error) throw error
}
