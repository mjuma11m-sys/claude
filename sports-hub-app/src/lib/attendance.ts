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

/* One tap on a player's name moves to the next status: present, late, excused, absent, and back. */
export function cycleMark(m: Mark | undefined): Mark {
  const at = STATUS_ORDER.indexOf(m?.status ?? 'present')
  const next = STATUS_ORDER[(at + 1) % STATUS_ORDER.length]
  return next === 'excused' ? { status: next, reason: 'personal' } : { status: next }
}

/* "Copy the last session": the marks of an earlier session for today's squad; a player it never recorded starts as present (or excused if injured). */
export function copyMarks(from: Session | undefined, players: { id: string; status: PlayerStatus }[]): Record<string, Mark> {
  const base = defaultMarks(players)
  if (!from) return base
  return Object.fromEntries(players.map((p) => [p.id, from.marks[p.id] ?? base[p.id]]))
}

export type Period = { sessions: number; present: number; late: number; excused: number; absent: number; counted: number; rate: number | null }
export type TeamStats = { current: Period; previous: Period; deltaPts: number | null }

function period(sessions: Session[], ids: Set<string>, from: number, to: number): Period {
  const p: Period = { sessions: 0, present: 0, late: 0, excused: 0, absent: 0, counted: 0, rate: null }
  for (const s of sessions) {
    const t = Date.parse(s.day + 'T00:00:00Z')
    if (t < from || t > to) continue
    let any = false
    for (const [id, m] of Object.entries(s.marks)) if (ids.has(id)) { p[m.status]++; any = true }
    if (any) p.sessions++
  }
  p.counted = p.present + p.late + p.absent
  p.rate = p.sessions >= MIN_SESSIONS && p.counted > 0 ? (p.present + p.late) / p.counted : null
  return p
}

/* The team's attendance rate over the last `windowDays` against the same length just before it. A period with fewer than MIN_SESSIONS sessions has no rate, so no comparison either. */
export function teamStats(sessions: Session[], playerIds: string[], today = new Date(), windowDays = WINDOW_DAYS): TeamStats {
  const ids = new Set(playerIds)
  const end = toDay(today)
  const current = period(sessions, ids, end - (windowDays - 1) * DAY, end)
  const previous = period(sessions, ids, end - (2 * windowDays - 1) * DAY, end - windowDays * DAY)
  const deltaPts = current.rate !== null && previous.rate !== null ? Math.round((current.rate - previous.rate) * 100) : null
  return { current, previous, deltaPts }
}

const dm = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`
const list = (xs: string[]) => xs.join('، ')

/* The text a coach pastes into the team group after a session. Counts only for excused absences (the reason may be medical and never goes in a group);
   shirt numbers by default for late and unexcused, names only if asked. */
export function sessionSummary(s: Session, players: { id: string; num: number | null; name: string }[], opts: { names?: boolean } = {}): string {
  const byId = new Map(players.map((p) => [p.id, p]))
  const tag = (id: string) => { const p = byId.get(id); return !p ? '' : opts.names ? p.name : String(p.num ?? p.name) }
  const marks = Object.entries(s.marks).filter(([id]) => byId.has(id))
  const ids = (st: AStatus) => marks.filter(([, m]) => m.status === st).map(([id]) => tag(id)).filter(Boolean)
  const attended = marks.filter(([, m]) => m.status === 'present' || m.status === 'late').length
  const late = ids('late'), absent = ids('absent')
  const excused = marks.filter(([, m]) => m.status === 'excused').length
  const lines = [`${KIND_TEXT[s.kind]} · ${dm(s.day)}`, `حضر ${attended} من ${marks.length}`]
  if (late.length) lines.push(`متأخر (${late.length}): ${list(late)}`)
  if (absent.length) lines.push(`غياب بدون عذر (${absent.length}): ${list(absent)}`)
  if (excused) lines.push(`غياب بعذر: ${excused}`)
  return lines.join('\n')
}

export type MonthRow = { id: string; cells: (AStatus | null)[]; present: number; late: number; excused: number; absent: number; counted: number; rate: number | null }
export type MonthGrid = { sessions: Session[]; rows: MonthRow[] }

/* Players by sessions for one month ('YYYY-MM'), oldest session first; null = not recorded for that player. The rate follows the same rules as the 30-day figure. */
export function monthGrid(sessions: Session[], playerIds: string[], month: string): MonthGrid {
  const inMonth = sessions.filter((s) => s.day.startsWith(month)).sort((a, b) => a.day.localeCompare(b.day) || a.kind.localeCompare(b.kind))
  const rows = playerIds.map((id) => {
    const r: MonthRow = { id, cells: [], present: 0, late: 0, excused: 0, absent: 0, counted: 0, rate: null }
    for (const s of inMonth) { const m = s.marks[id]; r.cells.push(m ? m.status : null); if (m) r[m.status]++ }
    r.counted = r.present + r.late + r.absent
    r.rate = r.counted >= MIN_SESSIONS ? (r.present + r.late) / r.counted : null
    return r
  })
  return { sessions: inMonth, rows }
}
