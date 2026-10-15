/* One player on one page, from data the other screens already hold. Facts and the coach's own ratings only: no score is invented,
   and match involvement is a count of events the club logged for that player (no grading). */
import { attendanceStats, type AStatus, type Kind, type Session, type Stat } from './attendance'
import type { Ev } from './analysis'
import { latestScores, loadFromLogs, skillsFor, type Assessment, type Goal, type Latest, type Log } from './development'
import { daysLeft } from './contracts'

export type PlayerFile = {
  attendance: Stat
  recent: { day: string; kind: Kind; status: AStatus }[]
  latest: Latest
  average: number | null
  goalsOpen: Goal[]
  goalsDone: number
  load: ReturnType<typeof loadFromLogs>
  match: { appearances: number; goals: number; shots: number; onTarget: number; yellow: number; red: number }
  contractDays: number
}

export function playerFile(i: {
  id: string; pos: string; endsOn: string; sessions: Session[]; assessments: Assessment[]; goals: Goal[]; logs: Log[]
  reports: { events: Ev[] }[]; today?: Date
}): PlayerFile {
  const today = i.today ?? new Date()
  const latest = latestScores(i.assessments)
  const own = skillsFor(i.pos).flatMap((k) => (latest[k] ? [latest[k]!.score] : []))
  const match = { appearances: 0, goals: 0, shots: 0, onTarget: 0, yellow: 0, red: 0 }
  for (const r of i.reports) {
    const mine = r.events.filter((e) => e.playerId === i.id)
    if (mine.length === 0) continue
    match.appearances++
    for (const e of mine) {
      if (e.kind === 'goal') { match.goals++; match.shots++; match.onTarget++ } else if (e.kind === 'shot') match.shots++
      else if (e.kind === 'shot_on') { match.shots++; match.onTarget++ } else if (e.kind === 'yellow') match.yellow++; else if (e.kind === 'red') match.red++
    }
  }
  return {
    attendance: attendanceStats(i.sessions, [i.id], today)[0],
    recent: [...i.sessions].filter((s) => s.marks[i.id]).sort((a, b) => b.day.localeCompare(a.day)).slice(0, 6).map((s) => ({ day: s.day, kind: s.kind, status: s.marks[i.id].status })),
    latest, average: own.length ? own.reduce((a, b) => a + b, 0) / own.length : null,
    goalsOpen: i.goals.filter((g) => !g.done), goalsDone: i.goals.filter((g) => g.done).length,
    load: loadFromLogs(i.logs, today), match, contractDays: daysLeft(i.endsOn, today),
  }
}
