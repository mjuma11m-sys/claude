import { describe, expect, it } from 'vitest'
import { advance, insights, keeperSummary, lastMinute, momentum, ordered, snapshot, validateEvent, type Ev } from './analysis'

const e = (minute: number, team: 'us' | 'opp', kind: Ev['kind'], extra: Partial<Ev> = {}): Ev => ({ minute, team, kind, ...extra })
const M: Ev[] = [e(12, 'us', 'shot_on'), e(34, 'opp', 'goal'), e(58, 'us', 'goal'), e(60, 'opp', 'shot_on'), e(61, 'opp', 'shot'), e(80, 'opp', 'goal'), e(90, 'opp', 'yellow'), e(20, 'us', 'corner')]

describe('snapshot', () => {
  it('counts goals only for the score, and a goal also counts as a shot on target', () => {
    const s = snapshot(M, 90)
    expect([s.us.goals, s.opp.goals]).toEqual([1, 2])
    expect([s.us.shots, s.us.onTarget]).toEqual([2, 2])
    expect([s.opp.shots, s.opp.onTarget]).toEqual([4, 3])
  })
  it('shows nothing before the first minute and includes the minute itself', () => {
    expect(snapshot(M, -1).seen).toHaveLength(0)
    expect(snapshot(M, 12).us.onTarget).toBe(1)
    expect(snapshot(M, 11).us.onTarget).toBe(0)
  })
  it('is monotonic: no count ever goes down as the minute grows', () => {
    let prev = snapshot(M, 0)
    for (let m = 1; m <= 130; m++) { const s = snapshot(M, m); for (const t of ['us', 'opp'] as const) for (const k of Object.keys(s[t]) as (keyof typeof s.us)[]) expect(s[t][k]).toBeGreaterThanOrEqual(prev[t][k]); prev = s }
  })
  it('counts cards, corners and subs per side', () => {
    const s = snapshot([e(1, 'us', 'yellow'), e(2, 'us', 'red'), e(3, 'opp', 'corner'), e(4, 'opp', 'sub')], 90)
    expect([s.us.yellow, s.us.red, s.opp.corners, s.opp.subs]).toEqual([1, 1, 1, 1])
  })
  it('orders by minute and keeps the typed order inside a minute', () => {
    const o = ordered([e(5, 'us', 'shot'), e(3, 'opp', 'shot'), e(5, 'opp', 'goal')])
    expect(o.map((x) => x.kind + x.minute)).toEqual(['shot3', 'shot5', 'goal5'])
  })
})

describe('momentum', () => {
  it('has a bucket per 15 minutes and counts shots by side', () => {
    const b = momentum(M)
    expect(b).toHaveLength(Math.ceil(91 / 15))
    expect(b[0]).toMatchObject({ from: 0, to: 14, us: 1, opp: 0 })
    expect(b[4]).toMatchObject({ from: 60, us: 0, opp: 2 })
    expect(b.reduce((n, x) => n + x.us + x.opp, 0)).toBe(snapshot(M, 130).us.shots + snapshot(M, 130).opp.shots)
  })
  it('grows with the replay minute', () => {
    expect(momentum(M, 40).reduce((n, x) => n + x.us + x.opp, 0)).toBe(2)
    expect(momentum(M, 0).reduce((n, x) => n + x.us + x.opp, 0)).toBe(0)
  })
  it('extends past 90 when the match went long', () => {
    expect(lastMinute([e(97, 'us', 'goal')])).toBe(97)
    expect(momentum([e(97, 'us', 'goal')]).at(-1)).toMatchObject({ us: 1 })
  })
})

describe('keeper', () => {
  it('saves are the opponent shots on target that were not goals', () => {
    expect(keeperSummary(M)).toEqual({ saves: 1, conceded: 2, faced: 3, pct: 1 / 3 })
    expect(keeperSummary([e(1, 'opp', 'shot_on'), e(2, 'opp', 'shot_on'), e(3, 'opp', 'shot_on'), e(4, 'opp', 'goal')])).toMatchObject({ saves: 3, conceded: 1, faced: 4, pct: 0.75 })
  })
  it('has no percentage when nothing was faced', () => {
    expect(keeperSummary([e(1, 'us', 'goal')]).pct).toBeNull()
  })
  it('follows the replay minute', () => {
    expect(keeperSummary(M, 40)).toMatchObject({ faced: 1, conceded: 1 })
  })
})

describe('insights', () => {
  it('names a late conceded goal and an early one', () => {
    const k = insights([e(10, 'opp', 'goal'), e(88, 'opp', 'goal')], null).map((i) => i.key)
    expect(k).toContain('late-opp'); expect(k).toContain('early')
  })
  it('flags poor finishing only with enough shots', () => {
    const many = Array.from({ length: 8 }, (_, i) => e(i * 10, 'us', 'shot'))
    expect(insights(many, null).map((i) => i.key)).toContain('finishing')
    expect(insights(many.slice(0, 7), null).map((i) => i.key)).not.toContain('finishing')
  })
  it('flags possession without danger only above 60 and with fewer shots on target', () => {
    const ev = [e(10, 'opp', 'shot_on'), e(20, 'us', 'shot')]
    expect(insights(ev, 62).map((i) => i.key)).toContain('possession')
    expect(insights(ev, 59).map((i) => i.key)).not.toContain('possession')
    expect(insights(ev, null).map((i) => i.key)).not.toContain('possession')
  })
  it('finds a spell of pressure and a red card, and gives at most five notes', () => {
    const ev = [e(31, 'opp', 'shot'), e(33, 'opp', 'shot'), e(40, 'opp', 'shot_on'), e(50, 'us', 'red')]
    const k = insights(ev, null).map((i) => i.key)
    expect(k).toContain('press-30'); expect(k).toContain('red')
    expect(insights([e(5, 'opp', 'goal'), e(80, 'opp', 'goal'), e(85, 'us', 'goal'), e(31, 'opp', 'shot'), e(33, 'opp', 'shot'), e(40, 'opp', 'shot'), e(50, 'us', 'red'), ...Array.from({ length: 8 }, () => e(10, 'us', 'shot'))], 70).length).toBeLessThanOrEqual(5)
  })
  it('says nothing about individuals', () => {
    for (const i of insights([e(5, 'opp', 'goal', {}), e(10, 'us', 'shot', { playerId: 'p1' })], 70)) expect(i.text).not.toContain('p1')
  })
  it('gives no notes for an empty match', () => { expect(insights([], null)).toEqual([]) })
})

describe('replay clock and validation', () => {
  it('advances by real time and speed, and stops at the end', () => {
    expect(advance(0, 500, 1, 90)).toBe(1)
    expect(advance(0, 500, 4, 90)).toBe(4)
    expect(advance(89.5, 5000, 4, 90)).toBe(90)
  })
  it('validates one event', () => {
    expect(validateEvent(e(131, 'us', 'goal'))).toBe('bad_minute')
    expect(validateEvent(e(10.5, 'us', 'goal'))).toBe('bad_minute')
    expect(validateEvent(e(10, 'opp', 'goal', { playerId: 'p' }))).toBe('player_on_opponent')
    expect(validateEvent(e(10, 'us', 'goal', { x: 50 }))).toBe('bad_position')
    expect(validateEvent(e(10, 'us', 'goal', { x: 101, y: 5 }))).toBe('bad_position')
    expect(validateEvent(e(10, 'us', 'goal', { x: 50, y: 40, playerId: 'p' }))).toBeNull()
  })
})
