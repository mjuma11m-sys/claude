import { describe, expect, it } from 'vitest'
import { expiringSoon } from '../lib/contracts'
import { ffpStatus, wageRatio } from '../lib/ffp'
import { DEMO_FINANCE, DEMO_SQUAD, FFP_LIMIT_DEMO } from './demo'

describe('club and federation demo data', () => {
  const statuses = DEMO_FINANCE.map((f) => ffpStatus(f.revenue === null ? null : wageRatio(f.wages!, f.revenue), FFP_LIMIT_DEMO))
  const n = (s: string) => statuses.filter((x) => x === s).length
  it('has 12 fictional clubs, every one of them numbered', () => {
    expect(DEMO_FINANCE).toHaveLength(12)
    DEMO_FINANCE.forEach((f) => expect(f.club).toMatch(/^نادي تجريبي \d{2}$/))
  })
  it('shows every status the federation room has to handle', () => {
    expect([n('within'), n('near'), n('over'), n('missing')]).toEqual([5, 3, 2, 2])
  })
  it('the squad is 16 players, 12 fit, and five contracts end within six months', () => {
    expect(DEMO_SQUAD).toHaveLength(16)
    expect(DEMO_SQUAD.filter((p) => p.status === 'fit')).toHaveLength(12)
    expect(expiringSoon(DEMO_SQUAD)).toHaveLength(5)
  })
  it('the squad wage bill is in line with the filed wages of club 01 (336k a year of 360k filed)', () => {
    const yearly = DEMO_SQUAD.reduce((a, p) => a + p.wage, 0) * 12
    expect(yearly).toBe(336000)
    expect(yearly).toBeLessThan(DEMO_FINANCE[0].wages!)
  })
})
