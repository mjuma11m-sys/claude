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
