/* Attendance: marks per training or match, and the figures built from them. Codes only; the excuse comes from a short list.
   The definitions are shown on screen: an excused absence is not counted against the player, the rate needs at least MIN_SESSIONS
   counted sessions, and "repeated absence" is REPEAT_ABSENT unexcused absences in a row. */
import type { PlayerStatus } from './squad'

export type AStatus = 'present' | 'late' | 'excused' | 'absent'
export type Reason = 'medical' | 'study' | 'travel' | 'personal'
export type Kind = 'training' | 'match'
export type Mark = { status: AStatus; reason?: Reason | null }
export type Session = { id: string; day: string; kind: Kind; marks: Record<string, Mark> }

export const STATUS_TEXT: Record<AStatus, string> = { present: 'حاضر', late: 'متأخر', excused: 'غائب بعذر', absent: 'غائب' }
export const STATUS_ORDER: AStatus[] = ['present', 'late', 'excused', 'absent']
export const REASON_TEXT: Record<Reason, string> = { medical: 'طبي', study: 'دراسة', travel: 'سفر', personal: 'ظرف شخصي' }
export const REASONS: Reason[] = ['medical', 'study', 'travel', 'personal']
export const KIND_TEXT: Record<Kind, string> = { training: 'تمرين', match: 'مباراة' }
export const MIN_SESSIONS = 3
export const REPEAT_ABSENT = 3
export const WINDOW_DAYS = 30
const DAY = 86_400_000

/* Everyone present, except a player listed as injured: that is already known, so it starts as an excused medical absence. The coach confirms. */
export function defaultMarks(players: { id: string; status: PlayerStatus }[]): Record<string, Mark> {
  return Object.fromEntries(players.map((p) => [p.id, p.status === 'injured' ? { status: 'excused' as const, reason: 'medical' as const } : { status: 'present' as const }]))
}

export function counts(marks: Record<string, Mark>): Record<AStatus, number> {
  const out: Record<AStatus, number> = { present: 0, late: 0, excused: 0, absent: 0 }
  for (const m of Object.values(marks)) out[m.status]++
  return out
}

export type Stat = { id: string; present: number; late: number; excused: number; absent: number; counted: number; rate: number | null; streak: number; repeated: boolean }

const toDay = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())

export function attendanceStats(sessions: Session[], playerIds: string[], today = new Date(), windowDays = WINDOW_DAYS): Stat[] {
  const from = toDay(today) - (windowDays - 1) * DAY
  const inWindow = sessions.filter((s) => Date.parse(s.day + 'T00:00:00Z') >= from).sort((a, b) => b.day.localeCompare(a.day))
  return playerIds.map((id) => {
    const s = { id, present: 0, late: 0, excused: 0, absent: 0, counted: 0, rate: null as number | null, streak: 0, repeated: false }
    let run = true
    for (const session of inWindow) {
      const m = session.marks[id]
      if (!m) continue // not recorded for that session (a player who joined later): neither present nor absent
      s[m.status]++
      if (run) { if (m.status === 'absent') s.streak++; else if (m.status !== 'excused') run = false }
    }
    s.counted = s.present + s.late + s.absent
    s.rate = s.counted >= MIN_SESSIONS ? (s.present + s.late) / s.counted : null
    s.repeated = s.streak >= REPEAT_ABSENT
    return s
  })
}

/* Worst first: repeated absence, then the lowest rate; players with too little data go last. */
export function byConcern(stats: Stat[]): Stat[] {
  return [...stats].sort((a, b) => Number(b.repeated) - Number(a.repeated) || (a.rate ?? 2) - (b.rate ?? 2) || b.absent - a.absent)
}
