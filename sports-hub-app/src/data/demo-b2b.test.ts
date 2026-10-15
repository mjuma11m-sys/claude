import { describe, expect, it } from 'vitest'
import { expiringSoon } from '../lib/contracts'
import { ffpStatus, wageRatio } from '../lib/ffp'
import { DEMO_FINANCE, DEMO_SQUAD, LIMITS_DEMO } from './demo'
import { homePath } from '../lib/roles'
import { navFor } from '../lib/nav'

describe('club and federation demo data', () => {
  const statusOf = (f: (typeof DEMO_FINANCE)[number]) => ffpStatus(f.revenue === null ? null : wageRatio(f.wages!, f.revenue), LIMITS_DEMO[f.league])
  const count = (league: string, s: string) => DEMO_FINANCE.filter((f) => f.league === league && statusOf(f) === s).length
  const premier = ['within', 'near', 'over', 'missing'].map((s) => count('premier', s))
  const second = ['within', 'near', 'over', 'missing'].map((s) => count('second', s))
  it('has 20 fictional clubs, every one of them numbered: 12 Premier and 8 Second Division', () => {
    expect(DEMO_FINANCE).toHaveLength(20)
    expect(DEMO_FINANCE.filter((f) => f.league === 'premier')).toHaveLength(12)
    expect(DEMO_FINANCE.filter((f) => f.league === 'second')).toHaveLength(8)
    DEMO_FINANCE.forEach((f) => expect(f.club).toMatch(/^نادي تجريبي \d{2}$/))
  })
  it('shows every status the federation room has to handle', () => {
    expect(premier).toEqual([5, 3, 2, 2])
  })
  it('the Second Division is judged against its own limit, and shows every status too', () => {
    expect(LIMITS_DEMO.second).toBeGreaterThan(LIMITS_DEMO.premier)
    expect(second).toEqual([4, 1, 1, 2])
    // club 17 sits at 77%: near the Second limit (80%) but it would be over the Premier one (70%)
    const c17 = DEMO_FINANCE.find((f) => f.club.endsWith('17'))!
    expect(ffpStatus(wageRatio(c17.wages!, c17.revenue!), LIMITS_DEMO.premier)).toBe('over')
    expect(statusOf(c17)).toBe('near')
  })
  it('the fan zone is off by default: staff land in their rooms and nobody gets a fan tab', () => {
    expect(navFor('club_admin', false).map((i) => i.to)).toEqual(['/club', '/lineup', '/attendance', '/development', '/data', '/rights', '/standings', '/medical'])
    expect(navFor('bfa_admin', false).map((i) => i.to)).toEqual(['/federation', '/standings'])
    expect(navFor('fan', false).map((i) => i.to)).toEqual(['/standings'])
    expect(navFor('fan', true).map((i) => i.to)).toContain('/vote')
    expect(homePath('medical', false)).toBe('/medical')
    expect(homePath('medical', true)).toBe('/')
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
