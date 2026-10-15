import { describe, expect, it } from 'vitest'
import { dueOn, endingSoon, isLate, lastMonths, lateCount, lateFirst, monthOf, sortRequests, urgency, type Request } from './rights'

const req = (o: Partial<Request>): Request => ({ id: 'r', playerId: 'p', consentRef: 'C-1', kind: 'access', receivedOn: '2026-10-01', dueOn: '2026-10-31', status: 'open', closedOn: null, exportedAt: null, ...o })
const T = (s: string) => new Date(s + 'T12:00:00')

describe('deadlines', () => {
  it('adds the days, across a month end', () => {
    expect(dueOn('2026-10-01')).toBe('2026-10-31')
    expect(dueOn('2026-10-20', 30)).toBe('2026-11-19')
    expect(dueOn('2026-12-20', 30)).toBe('2027-01-19')
  })
  it('classifies an open request', () => {
    expect(urgency(req({}), T('2026-10-10')).tone).toBe('ok')
    expect(urgency(req({}), T('2026-10-25')).tone).toBe('soon')
    expect(urgency(req({}), T('2026-10-31')).tone).toBe('soon')
    expect(urgency(req({}), T('2026-11-01')).tone).toBe('late')
    expect(urgency(req({ status: 'done', closedOn: '2026-10-05' }), T('2026-12-01')).tone).toBe('done')
  })
  it('puts the most overdue open request first and closed ones last', () => {
    const a = req({ id: 'a', dueOn: '2026-11-10' }), b = req({ id: 'b', dueOn: '2026-10-20' })
    const c = req({ id: 'c', status: 'done', closedOn: '2026-09-01' }), d = req({ id: 'd', status: 'done', closedOn: '2026-10-02' })
    expect(sortRequests([c, a, d, b]).map((r) => r.id)).toEqual(['b', 'a', 'd', 'c'])
  })
})

describe('pay ledger', () => {
  it('lists months newest first', () => {
    expect(lastMonths(3, T('2026-01-15'))).toEqual(['2026-01-01', '2025-12-01', '2025-11-01'])
    expect(monthOf(T('2026-10-31'))).toBe('2026-10-01')
  })
  it('is late only after the month end plus the grace days', () => {
    expect(isLate('2026-09-01', false, '2027-01-01', T('2026-10-15'))).toBe(false) // 15 days after Sep 30: still inside the grace
    expect(isLate('2026-09-01', false, '2027-01-01', T('2026-10-16'))).toBe(true)
    expect(isLate('2026-10-01', false, '2027-01-01', T('2026-10-20'))).toBe(false) // the month is not over
    expect(isLate('2026-09-01', true, '2027-01-01', T('2026-12-01'))).toBe(false) // paid
  })
  it('ignores a month after the contract ended, but counts the month it ended in', () => {
    expect(isLate('2026-09-01', false, '2026-08-31', T('2026-12-01'))).toBe(false)
    expect(isLate('2026-09-01', false, '2026-09-10', T('2026-12-01'))).toBe(true)
  })
  it('counts a player once even when two months are open', () => {
    const rows = [{ id: 'a', endsOn: '2027-06-01' }, { id: 'b', endsOn: '2027-06-01' }]
    expect(lateCount(rows, { '2026-08-01': { c: 'x' }, '2026-09-01': { b: '2026-10-01' } }, ['2026-09-01', '2026-08-01'], T('2026-11-01'))).toBe(2)
    expect(lateCount(rows, { '2026-08-01': { a: 'x', b: 'x' }, '2026-09-01': { a: 'x', b: 'x' } }, ['2026-09-01', '2026-08-01'], T('2026-11-01'))).toBe(0)
  })
  it('does not call anyone late in a month the club has not started recording', () => {
    const rows = [{ id: 'a', endsOn: '2027-06-01' }]
    expect(lateCount(rows, { '2026-09-01': {} }, ['2026-09-01', '2026-08-01'], T('2026-11-01'))).toBe(0)
    expect(lateFirst([{ id: 'a', endsOn: '2027-06-01' }, { id: 'b', endsOn: '2027-06-01' }], {}, '2026-09-01', T('2026-11-01')).map((r) => r.id)).toEqual(['a', 'b'])
  })
  it('sorts late players to the top and keeps the order of the rest', () => {
    const rows = [{ id: 'a', endsOn: '2027-06-01' }, { id: 'b', endsOn: '2027-06-01' }, { id: 'c', endsOn: '2027-06-01' }]
    expect(lateFirst(rows, { a: 'x' }, '2026-09-01', T('2026-11-01')).map((r) => r.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('contract notice', () => {
  it('lists contracts ending within 90 days, soonest first, and skips ended ones', () => {
    const rows = [{ id: 1, endsOn: '2027-01-05' }, { id: 2, endsOn: '2026-12-01' }, { id: 3, endsOn: '2026-10-01' }, { id: 4, endsOn: '2028-01-01' }]
    expect(endingSoon(rows, T('2026-10-15')).map((r) => r.id)).toEqual([2, 1])
  })
})
