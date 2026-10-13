import { describe, expect, it } from 'vitest'
import { daysLeft, describeLeft, expiringSoon } from './contracts'
import { byRisk, ffpStatus, wageRatio } from './ffp'
import { readiness } from './squad'

describe('wage ratio and FFP status', () => {
  it('divides wages by revenue', () => expect(wageRatio(350, 500)).toBeCloseTo(0.7))
  it('zero revenue with wages is over any limit, with none it is fine', () => {
    expect(wageRatio(10, 0)).toBe(Infinity)
    expect(ffpStatus(wageRatio(10, 0), 0.7)).toBe('over')
    expect(wageRatio(0, 0)).toBe(0)
  })
  it('classifies against the limit with a 5-point near band', () => {
    expect(ffpStatus(0.5, 0.7)).toBe('within')
    expect(ffpStatus(0.649, 0.7)).toBe('within')
    expect(ffpStatus(0.65, 0.7)).toBe('near')
    expect(ffpStatus(0.7, 0.7)).toBe('near') // exactly at the limit is not over it
    expect(ffpStatus(0.701, 0.7)).toBe('over')
  })
  it('a club that has not filed is "missing", never "within"', () => expect(ffpStatus(null, 0.7)).toBe('missing'))
  it('sorts worst first and unfiled last', () => {
    const rows = [{ ratio: 0.5 }, { ratio: null }, { ratio: 0.9 }, { ratio: 0.7 }]
    expect(byRisk(rows).map((r) => r.ratio)).toEqual([0.9, 0.7, 0.5, null])
  })
})

describe('contracts', () => {
  const today = new Date(2026, 9, 13) // 13 Oct 2026
  it('counts calendar days', () => {
    expect(daysLeft('2026-10-14', today)).toBe(1)
    expect(daysLeft('2026-10-13', today)).toBe(0)
    expect(daysLeft('2026-10-12', today)).toBe(-1)
  })
  it('lists contracts ending within six months, soonest first, expired on top', () => {
    const rows = [{ endsOn: '2027-03-01' }, { endsOn: '2026-10-01' }, { endsOn: '2028-01-01' }, { endsOn: '2026-12-01' }]
    expect(expiringSoon(rows, today).map((r) => r.endsOn)).toEqual(['2026-10-01', '2026-12-01', '2027-03-01'])
  })
  it('describes the time left in words', () => {
    expect(describeLeft(-3)).toBe('انتهى')
    expect(describeLeft(0)).toBe('ينتهي اليوم')
    expect(describeLeft(12)).toBe('بعد 12 يوم')
    expect(describeLeft(95)).toBe('بعد 3 شهر')
  })
})

describe('squad readiness', () => {
  it('counts fit players out of the squad', () => expect(readiness([{ status: 'fit' }, { status: 'injured' }, { status: 'fit' }, { status: 'doubtful' }])).toEqual({ fit: 2, total: 4 }))
})
