import { describe, expect, it } from 'vitest'
import { attendanceStats, type Mark, type Session } from './attendance'
import type { Ev } from './analysis'
import { monthEnd, monthReport } from './report'
import type { Request } from './rights'

const S = (day: string, marks: Record<string, Mark['status'] | [Mark['status'], string]>, kind: 'training' | 'match' = 'training'): Session =>
  ({ id: day + kind, day, kind, marks: Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, Array.isArray(v) ? { status: v[0], reason: v[1] as never } : { status: v }])) })
const g = (minute: number, team: 'us' | 'opp'): Ev => ({ minute, team, kind: 'goal' })
const base = { month: '2026-09-01', sessions: [] as Session[], playerIds: ['a', 'b'], matches: [], squad: [], requests: [] as Request[], today: new Date(2026, 9, 15) }

describe('monthEnd', () => {
  it('knows month lengths, including February in a leap year', () => {
    expect(monthEnd('2026-09-01')).toBe('2026-09-30'); expect(monthEnd('2028-02-01')).toBe('2028-02-29'); expect(monthEnd('2026-12-01')).toBe('2026-12-31')
  })
})

describe('attendance in the month', () => {
  const sessions = [S('2026-09-03', { a: 'present', b: 'absent' }), S('2026-09-10', { a: 'late', b: ['excused', 'medical'] }, 'match'), S('2026-08-28', { a: 'absent', b: 'absent' }), S('2026-10-02', { a: 'absent', b: 'absent' })]
  it('counts only that month, excusing excused absences, and splits training from match', () => {
    const r = monthReport({ ...base, sessions })
    expect([r.trainings, r.matchSessions]).toEqual([1, 1])
    expect(r.attendanceRate).toBeCloseTo(2 / 3) // a present, a late, b absent; b excused is not counted
  })
  it('has no rate for a month without sessions', () => { expect(monthReport({ ...base }).attendanceRate).toBeNull() })
  it('matches the attendance screen definition of repeated absence, as of the month end', () => {
    const ss = [S('2026-09-20', { a: 'absent', b: 'present' }), S('2026-09-22', { a: 'absent', b: 'present' }), S('2026-09-25', { a: 'absent', b: 'present' }), S('2026-10-05', { a: 'present', b: 'present' })]
    const r = monthReport({ ...base, sessions: ss })
    expect(r.repeatAbsent).toBe(1)
    expect(attendanceStats(ss.filter((s) => s.day <= '2026-09-30'), ['a', 'b'], new Date(2026, 8, 30)).filter((s) => s.repeated)).toHaveLength(1)
  })
})

describe('matches in the month', () => {
  it('adds results and goals for that month only', () => {
    const r = monthReport({ ...base, matches: [
      { matchOn: '2026-09-05', events: [g(10, 'us'), g(50, 'us'), g(70, 'opp')] },
      { matchOn: '2026-09-12', events: [g(10, 'opp')] }, { matchOn: '2026-09-19', events: [g(5, 'us'), g(6, 'opp')] }, { matchOn: '2026-10-03', events: [g(1, 'us')] }] })
    expect([r.matches, r.wins, r.draws, r.losses, r.goalsFor, r.goalsAgainst]).toEqual([3, 1, 1, 1, 3, 3])
  })
})

describe('contracts and requests', () => {
  it('counts contracts ending within 90 days of today and requests still open, and the late ones', () => {
    const rq = (id: string, dueOn: string, status: 'open' | 'done'): Request => ({ id, playerId: 'a', consentRef: 'C', kind: 'access', receivedOn: '2026-08-01', dueOn, status, closedOn: status === 'done' ? '2026-08-05' : null, exportedAt: null })
    const r = monthReport({ ...base, squad: [{ endsOn: '2026-11-20' }, { endsOn: '2027-06-01' }, { endsOn: '2026-10-01' }], requests: [rq('1', '2026-10-01', 'open'), rq('2', '2026-11-30', 'open'), rq('3', '2026-09-01', 'done')] })
    expect([r.contractsEnding, r.openRequests, r.lateRequests]).toEqual([1, 2, 1])
  })
  it('carries no names and no wages: the keys are counters only', () => {
    expect(Object.keys(monthReport({ ...base })).sort()).toEqual(['attendanceRate', 'contractsEnding', 'draws', 'goalsAgainst', 'goalsFor', 'lateRequests', 'losses', 'matchSessions', 'matches', 'month', 'onTarget', 'openRequests', 'repeatAbsent', 'shots', 'trainings', 'wins'])
  })
})
