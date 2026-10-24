/* Monthly club report: team counters only. No wages, no names. The attendance figure uses the same definition as the attendance screen
   (an excused absence is not counted against), so the two can never disagree. */
import { attendanceStats, type Session } from './attendance'
import { daysLeft } from './contracts'
import { snapshot, type Ev } from './analysis'
import { EXPIRY_NOTICE_DAYS, urgency, type Request } from './rights'

export type MonthReport = {
  month: string
  trainings: number; matchSessions: number
  attendanceRate: number | null; repeatAbsent: number
  matches: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number; shots: number; onTarget: number
  contractsEnding: number; openRequests: number; lateRequests: number
}

const inMonth = (day: string, month: string) => day.slice(0, 7) === month.slice(0, 7)
export const monthEnd = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10)

export function monthReport(i: {
  month: string; sessions: Session[]; playerIds: string[]; matches: { matchOn: string; events: Ev[] }[]
  squad: { endsOn: string }[]; requests: Request[]; today?: Date
}): MonthReport {
  const today = i.today ?? new Date()
  const ss = i.sessions.filter((s) => inMonth(s.day, i.month))
  let good = 0, counted = 0
  for (const s of ss) for (const m of Object.values(s.marks)) { if (m.status === 'excused') continue; counted++; if (m.status !== 'absent') good++ }
  const end = monthEnd(i.month)
  const asOf = new Date(Number(end.slice(0, 4)), Number(end.slice(5, 7)) - 1, Number(end.slice(8, 10)))
  const repeatAbsent = attendanceStats(i.sessions.filter((s) => s.day <= end), i.playerIds, asOf).filter((s) => s.repeated).length
  let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0, shots = 0, on = 0
  const ms = i.matches.filter((m) => inMonth(m.matchOn, i.month))
  for (const m of ms) { const s = snapshot(m.events, 130); gf += s.us.goals; ga += s.opp.goals; shots += s.us.shots; on += s.us.onTarget; if (s.us.goals > s.opp.goals) wins++; else if (s.us.goals < s.opp.goals) losses++; else draws++ }
  const open = i.requests.filter((r) => r.status === 'open')
  return {
    month: i.month, trainings: ss.filter((s) => s.kind === 'training').length, matchSessions: ss.filter((s) => s.kind === 'match').length,
    attendanceRate: counted > 0 ? good / counted : null, repeatAbsent,
    matches: ms.length, wins, draws, losses, goalsFor: gf, goalsAgainst: ga, shots, onTarget: on,
    contractsEnding: i.squad.filter((p) => { const d = daysLeft(p.endsOn, today); return d >= 0 && d <= EXPIRY_NOTICE_DAYS }).length,
    openRequests: open.length, lateRequests: open.filter((r) => urgency(r, today).tone === 'late').length,
  }
}
