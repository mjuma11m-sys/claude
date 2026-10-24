import { describe, expect, it } from 'vitest'
import { dailyLoads, goalProgress, GK_SKILLS, latestScores, loadFromLogs, nextSaturday, trendOf, weakest, weekPlan, type Assessment, type Latest } from './development'

const A = (day: string, skill: Assessment['skill'], score: number): Assessment => ({ day, skill, score })
const none: Latest = {}

describe('ratings', () => {
  const rows = [A('2026-08-01', 'reflexes', 2), A('2026-09-01', 'reflexes', 3), A('2026-10-01', 'reflexes', 4), A('2026-10-01', 'diving', 2)]
  it('keeps the latest rating and the one before it', () => {
    const l = latestScores(rows)
    expect(l.reflexes).toEqual({ score: 4, prev: 3, day: '2026-10-01' })
    expect(l.diving).toEqual({ score: 2, prev: null, day: '2026-10-01' })
  })
  it('a trend needs a whole point of change', () => {
    expect(trendOf(4, 3)).toBe('up')
    expect(trendOf(2, 4)).toBe('down')
    expect(trendOf(3, 3)).toBe('flat')
    expect(trendOf(3, null)).toBe('flat')
  })
  it('the weakest skills come from rated skills only, lowest first; unrated gives none', () => {
    const l = latestScores([...rows, A('2026-10-01', 'footwork', 5)])
    expect(weakest(l, GK_SKILLS, 2)).toEqual(['diving', 'reflexes'])
    expect(weakest(none, GK_SKILLS)).toEqual([])
  })
  it('goal progress is capped, and reached once the rating meets the target', () => {
    const l = latestScores(rows)
    expect(goalProgress({ id: '1', skill: 'reflexes', target: 5, dueOn: '2027-01-01', done: false }, l)).toMatchObject({ now: 4, reached: false, pct: 0.8 })
    expect(goalProgress({ id: '2', skill: 'reflexes', target: 3, dueOn: '2027-01-01', done: false }, l)).toMatchObject({ reached: true, pct: 1 })
    expect(goalProgress({ id: '3', skill: 'passing', target: 4, dueOn: '2027-01-01', done: false }, l).now).toBe(0)
  })
})

describe('session load', () => {
  const today = new Date(2026, 9, 14)
  const day = (back: number) => new Date(Date.UTC(2026, 9, 14) - back * 86_400_000).toISOString().slice(0, 10)
  const steady = Array.from({ length: 28 }, (_, i) => ({ day: day(i), minutes: 60, rpe: 5 }))
  it('daily load is minutes x RPE over the last 28 days, zero where nothing was logged', () => {
    const l = dailyLoads([{ day: day(0), minutes: 60, rpe: 5 }], today)
    expect(l).toHaveLength(28)
    expect(l[27]).toBe(300)
    expect(l.slice(0, 27).every((x) => x === 0)).toBe(true)
  })
  it('a steady month reads 1.0 (safe)', () => {
    expect(loadFromLogs(steady, today)).toMatchObject({ ratio: 1, zone: 'safe', missing: 0 })
  })
  it('a doubled last week is in the danger zone', () => {
    const spike = steady.map((l, i) => (i < 7 ? { ...l, minutes: 120 } : l))
    const r = loadFromLogs(spike, today)
    expect(r.ratio!).toBeGreaterThan(1.5)
    expect(r.zone).toBe('danger')
  })
  it('less than 28 days of history says how many days are missing instead of guessing', () => {
    expect(loadFromLogs(steady.slice(0, 10), today)).toEqual({ ratio: null, zone: null, missing: 18 })
    expect(loadFromLogs([], today)).toEqual({ ratio: null, zone: null, missing: 28 })
  })
})

describe('weekly plan', () => {
  const base = { matchDay: '2026-10-17', today: new Date(2026, 9, 12), pos: 'حارس مرمى', status: 'fit' as const, latest: none, zone: null }
  it('follows match day: MD-4 to MD+2 with the indicative dive counts', () => {
    const p = weekPlan(base)
    expect(p.days.map((d) => d.label)).toEqual(['MD-4', 'MD-3', 'MD-2', 'MD-1', 'MD', 'MD+1', 'MD+2'])
    expect(p.days.map((d) => d.date)).toEqual(['2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19'])
    const dives = Object.fromEntries(p.days.map((d) => [d.label, d.dives]))
    expect(dives).toMatchObject({ 'MD-4': [20, 30], 'MD-3': [30, 40], 'MD-2': [15, 25], 'MD-1': [0, 10], MD: [8, 12], 'MD+1': [0, 0] })
    expect(p.days.find((d) => d.label === 'MD-3')!.intensity).toBe('very_high')
    expect(p.days.find((d) => d.label === 'MD+1')!.intensity).toBe('low')
  })
  it('outfield players get the same week without dive counts', () => {
    const p = weekPlan({ ...base, pos: 'وسط' })
    expect(p.days.every((d) => d.dives === null)).toBe(true)
  })
  it('puts the weakest rated skill into the days that train it', () => {
    const latest = latestScores([A('2026-10-01', 'diving', 2), A('2026-10-01', 'reflexes', 4), A('2026-10-01', 'one_v_one', 3)])
    const md3 = weekPlan({ ...base, latest }).days.find((d) => d.label === 'MD-3')!
    expect(md3.drills[0].skill).toBe('diving')
  })
  it('marks past days and today', () => {
    const p = weekPlan({ ...base, today: new Date(2026, 9, 15) })
    expect(p.days.filter((d) => d.past).map((d) => d.label)).toEqual(['MD-4', 'MD-3'])
    expect(p.days.find((d) => d.today)!.label).toBe('MD-2')
  })
  it('cuts volume by about a third when the load is in the caution or danger zone', () => {
    const p = weekPlan({ ...base, zone: 'danger' })
    expect(p.reduced).toBe(true)
    expect(p.days.find((d) => d.label === 'MD-3')!.dives).toEqual([20, 26])
    expect(weekPlan({ ...base, zone: 'caution' }).reduced).toBe(true)
    expect(weekPlan({ ...base, zone: 'safe' }).reduced).toBe(false)
  })
  it('gives no training plan to an injured or suspended player', () => {
    const p = weekPlan({ ...base, status: 'injured' })
    expect(p.days).toEqual([])
    expect(p.blocked).toContain('الطاقم الطبي')
    expect(weekPlan({ ...base, status: 'suspended' }).blocked).toBeTruthy()
  })
  it('a match two days away still lists the whole week and marks what has passed', () => {
    const p = weekPlan({ ...base, today: new Date(2026, 9, 15) })
    expect(p.days).toHaveLength(7)
  })
})

describe('default match day', () => {
  it('is the next Saturday on or after the given day', () => {
    expect(nextSaturday(new Date(2026, 9, 14))).toBe('2026-10-17')
    expect(nextSaturday(new Date(2026, 9, 17))).toBe('2026-10-17')
    expect(nextSaturday(new Date(2026, 9, 18))).toBe('2026-10-24')
  })
})
