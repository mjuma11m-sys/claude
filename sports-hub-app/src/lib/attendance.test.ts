import { describe, expect, it } from 'vitest'
import { attendanceStats, byConcern, counts, defaultMarks, type Session, type AStatus } from './attendance'

const today = new Date(2026, 9, 14)
const day = (back: number) => new Date(Date.UTC(2026, 9, 14) - back * 86_400_000).toISOString().slice(0, 10)
const S = (back: number, marks: Record<string, AStatus | [AStatus, string]>, kind: 'training' | 'match' = 'training'): Session => ({
  id: `s${back}`, day: day(back), kind,
  marks: Object.fromEntries(Object.entries(marks).map(([id, v]) => [id, Array.isArray(v) ? { status: v[0], reason: v[1] as never } : { status: v }])),
})

describe('defaults and counts', () => {
  it('everyone starts present, an injured player as an excused medical absence', () => {
    const d = defaultMarks([{ id: 'a', status: 'fit' }, { id: 'b', status: 'injured' }, { id: 'c', status: 'doubtful' }, { id: 'd', status: 'suspended' }])
    expect(d.a).toEqual({ status: 'present' })
    expect(d.b).toEqual({ status: 'excused', reason: 'medical' })
    expect(d.c.status).toBe('present')
    expect(d.d.status).toBe('present')
  })
  it('counts each status', () => {
    expect(counts({ a: { status: 'present' }, b: { status: 'late' }, c: { status: 'absent' }, d: { status: 'absent' }, e: { status: 'excused' } })).toEqual({ present: 1, late: 1, excused: 1, absent: 2 })
  })
})

describe('the rate', () => {
  it('present and late count as attended; excused absences are left out of the count', () => {
    const sessions = [S(1, { a: 'present' }), S(3, { a: 'late' }), S(5, { a: ['excused', 'travel'] }), S(7, { a: 'absent' }), S(9, { a: 'present' })]
    const [a] = attendanceStats(sessions, ['a'], today)
    expect(a).toMatchObject({ present: 2, late: 1, excused: 1, absent: 1, counted: 4, rate: 0.75 })
  })
  it('needs three counted sessions, otherwise it says nothing', () => {
    expect(attendanceStats([S(1, { a: 'present' }), S(2, { a: 'absent' })], ['a'], today)[0].rate).toBeNull()
    expect(attendanceStats([S(1, { a: 'present' }), S(2, { a: 'present' }), S(3, { a: ['excused', 'study'] })], ['a'], today)[0].rate).toBeNull() // only 2 counted
  })
  it('only the last 30 days count', () => {
    const [a] = attendanceStats([S(1, { a: 'present' }), S(2, { a: 'present' }), S(3, { a: 'present' }), S(40, { a: 'absent' }), S(41, { a: 'absent' })], ['a'], today)
    expect(a).toMatchObject({ absent: 0, rate: 1 })
  })
  it('a player not recorded for a session is neither present nor absent there', () => {
    const [b] = attendanceStats([S(1, { a: 'present', b: 'present' }), S(2, { a: 'present', b: 'present' }), S(3, { a: 'present', b: 'present' }), S(4, { a: 'present' }), S(5, { a: 'present' })], ['b'], today)
    expect(b).toMatchObject({ present: 3, absent: 0, counted: 3, rate: 1 })
  })
})

describe('repeated absence', () => {
  it('is three unexcused absences in a row, newest first', () => {
    const [a] = attendanceStats([S(1, { a: 'absent' }), S(3, { a: 'absent' }), S(5, { a: 'absent' }), S(7, { a: 'present' })], ['a'], today)
    expect(a).toMatchObject({ streak: 3, repeated: true })
  })
  it('an excused session in between neither breaks nor extends the run', () => {
    const [a] = attendanceStats([S(1, { a: 'absent' }), S(3, { a: ['excused', 'medical'] }), S(5, { a: 'absent' }), S(7, { a: 'absent' })], ['a'], today)
    expect(a.streak).toBe(3)
  })
  it('a late arrival breaks the run, and so does being present', () => {
    expect(attendanceStats([S(1, { a: 'absent' }), S(3, { a: 'late' }), S(5, { a: 'absent' }), S(7, { a: 'absent' })], ['a'], today)[0].streak).toBe(1)
    expect(attendanceStats([S(1, { a: 'present' }), S(3, { a: 'absent' }), S(5, { a: 'absent' }), S(7, { a: 'absent' })], ['a'], today)[0].repeated).toBe(false)
  })
})

describe('ordering', () => {
  it('repeated absence first, then the lowest rate, then players with too little data', () => {
    const sessions = [S(1, { a: 'absent', b: 'present', c: 'late', d: 'present' }), S(2, { a: 'absent', b: 'absent', c: 'present', d: 'present' }), S(3, { a: 'absent', b: 'present', c: 'present' }), S(4, { b: 'present', c: 'present' })]
    const order = byConcern(attendanceStats(sessions, ['b', 'c', 'a', 'd'], today)).map((s) => s.id)
    expect(order).toEqual(['a', 'b', 'c', 'd'])
  })
})

import { copyMarks, cycleMark, monthGrid, sessionSummary, teamStats } from './attendance'

describe('tap to cycle', () => {
  it('goes present, late, excused, absent and back, giving an excuse a default reason', () => {
    let m = cycleMark(undefined)
    expect(m).toEqual({ status: 'late' })
    m = cycleMark(m); expect(m).toEqual({ status: 'excused', reason: 'personal' })
    m = cycleMark(m); expect(m).toEqual({ status: 'absent' })
    m = cycleMark(m); expect(m).toEqual({ status: 'present' })
  })
})

describe('copy the last session', () => {
  it('keeps earlier marks and starts a new player as present, an injured one as excused', () => {
    const last = S(3, { a: 'absent', b: ['excused', 'study'] })
    const out = copyMarks(last, [{ id: 'a', status: 'fit' }, { id: 'b', status: 'fit' }, { id: 'c', status: 'fit' }, { id: 'd', status: 'injured' }])
    expect(out.a).toEqual({ status: 'absent' })
    expect(out.b).toEqual({ status: 'excused', reason: 'study' })
    expect(out.c).toEqual({ status: 'present' })
    expect(out.d).toEqual({ status: 'excused', reason: 'medical' })
  })
  it('without an earlier session it is the defaults', () => { expect(copyMarks(undefined, [{ id: 'a', status: 'fit' }])).toEqual({ a: { status: 'present' } }) })
})

describe('the team rate and its comparison', () => {
  const ids = ['a', 'b']
  const recent = [S(1, { a: 'present', b: 'present' }), S(5, { a: 'present', b: 'absent' }), S(9, { a: 'late', b: 'present' })]
  const before = [S(35, { a: 'present', b: 'absent' }), S(40, { a: 'absent', b: 'absent' }), S(50, { a: 'present', b: 'present' })]
  it('compares the last 30 days with the 30 before, in points', () => {
    const t = teamStats([...recent, ...before], ids, today)
    expect(t.current.sessions).toBe(3)
    expect(t.current.rate).toBeCloseTo(5 / 6)
    expect(t.previous.rate).toBeCloseTo(3 / 6)
    expect(t.deltaPts).toBe(33)
  })
  it('has no rate, so no comparison, with fewer than three sessions in a period', () => {
    const t = teamStats([...recent, before[0]], ids, today)
    expect(t.previous.rate).toBeNull()
    expect(t.deltaPts).toBeNull()
    expect(t.current.rate).not.toBeNull()
  })
  it('leaves excused absences out of the rate and ignores players who are not in the squad', () => {
    const t = teamStats([S(1, { a: 'present', b: 'excused', x: 'absent' }), S(2, { a: 'present', b: 'excused' }), S(3, { a: 'present', b: 'excused' })], ids, today)
    expect(t.current.rate).toBe(1)
  })
})

describe('the WhatsApp summary', () => {
  const squad = [{ id: 'a', num: 7, name: 'خالد' }, { id: 'b', num: 9, name: 'سالم' }, { id: 'c', num: 4, name: 'ناصر' }, { id: 'd', num: 12, name: 'يوسف' }, { id: 'e', num: null, name: 'بدون رقم' }]
  const s = S(0, { a: 'present', b: 'late', c: 'absent', d: ['excused', 'medical'], e: 'absent' })
  it('gives counts and shirt numbers, and only a count for excused absences', () => {
    const t = sessionSummary(s, squad)
    expect(t).toBe(['تمرين · 14/10', 'حضر 2 من 5', 'متأخر (1): 9', 'غياب بدون عذر (2): 4، بدون رقم', 'غياب بعذر: 1'].join('\n'))
  })
  it('never contains the reason for an excused absence or the name of an excused player', () => {
    const t = sessionSummary(s, squad, { names: true })
    expect(t).not.toMatch(/طبي|دراسة|سفر|ظرف/)
    expect(t).not.toContain('يوسف')
    expect(t).toContain('سالم')
  })
  it('skips the lines with nobody in them', () => {
    expect(sessionSummary(S(0, { a: 'present' }, 'match'), squad)).toBe(['مباراة · 14/10', 'حضر 1 من 1'].join('\n'))
  })
})

describe('the monthly grid', () => {
  const sessions = [S(10, { a: 'absent', b: 'present' }), S(0, { a: 'present', b: 'present' }), S(5, { a: 'late' }), S(40, { a: 'present' })]
  it('lists the month oldest first, null where a player was not recorded, with each player\'s rate', () => {
    const g = monthGrid(sessions, ['a', 'b'], '2026-10')
    expect(g.sessions.map((x) => x.day)).toEqual([day(10), day(5), day(0)])
    expect(g.rows[0].cells).toEqual(['absent', 'late', 'present'])
    expect(g.rows[1].cells).toEqual(['present', null, 'present'])
    expect(g.rows[0].rate).toBeCloseTo(2 / 3)
    expect(g.rows[1].rate).toBeNull()
  })
})
