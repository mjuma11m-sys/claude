import { describe, expect, it } from 'vitest'
import type { Ev } from './analysis'
import type { Session } from './attendance'
import { playerFile } from './playerfile'

const T = new Date(2026, 9, 15)
const day = (back: number) => new Date(2026, 9, 15 - back).toISOString().slice(0, 10)
const S = (back: number, status: 'present' | 'absent'): Session => ({ id: `s${back}`, day: day(back), kind: 'training', marks: { p: { status }, q: { status: 'present' } } })
const base = { id: 'p', pos: 'مهاجم', endsOn: '2026-12-01', sessions: [], assessments: [], goals: [], logs: [], reports: [], today: T }

describe('player file', () => {
  it('has honest empties for a player with no data', () => {
    const f = playerFile(base)
    expect([f.attendance.rate, f.recent.length, f.average, f.match.appearances, f.goalsDone, f.goalsOpen.length]).toEqual([null, 0, null, 0, 0, 0])
    expect(f.contractDays).toBe(47)
  })
  it('takes attendance and the last six marks newest first, only from sessions he is in', () => {
    const ss = [1, 2, 3, 4, 5, 6, 7, 8].map((b) => S(b, b === 1 ? 'absent' : 'present'))
    ss.push({ id: 'x', day: day(0), kind: 'match', marks: { q: { status: 'present' } } })
    const f = playerFile({ ...base, sessions: ss })
    expect(f.recent).toHaveLength(6); expect(f.recent[0]).toMatchObject({ day: day(1), status: 'absent' })
    expect(f.attendance.counted).toBe(8)
  })
  it('averages the latest rating per skill of his own kind (a striker is not averaged on keeping)', () => {
    const f = playerFile({ ...base, assessments: [{ day: day(5), skill: 'passing', score: 2 }, { day: day(1), skill: 'passing', score: 4 }, { day: day(1), skill: 'shooting', score: 3 }, { day: day(1), skill: 'diving', score: 5 }] })
    expect(f.average).toBe(3.5)
  })
  it('counts only his own events across reports, and a goal is also a shot on target', () => {
    const ev = (kind: Ev['kind'], pid: string | null): Ev => ({ minute: 10, team: 'us', kind, playerId: pid })
    const f = playerFile({ ...base, reports: [{ events: [ev('goal', 'p'), ev('shot', 'p'), ev('shot_on', 'q'), ev('yellow', 'p')] }, { events: [ev('shot_on', 'p'), ev('red', 'p')] }, { events: [ev('goal', 'q')] }] })
    expect(f.match).toEqual({ appearances: 2, goals: 1, shots: 3, onTarget: 2, yellow: 1, red: 1 })
  })
  it('splits goals into open and done', () => {
    const g = (id: string, done: boolean) => ({ id, skill: 'passing' as const, target: 4, dueOn: '2026-12-01', done })
    const f = playerFile({ ...base, goals: [g('1', false), g('2', true), g('3', true)] })
    expect([f.goalsOpen.length, f.goalsDone]).toEqual([1, 2])
  })
})
