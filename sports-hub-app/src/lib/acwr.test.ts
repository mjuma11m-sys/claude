import { describe, expect, it } from 'vitest'
import { acwr, zone } from './acwr'

const days = (n: number, load: number) => Array<number>(n).fill(load)

describe('acwr', () => {
  it('needs 28 days of data', () => expect(acwr(days(27, 400))).toBeNull())
  it('steady load is 1.0', () => expect(acwr(days(28, 400))).toBe(1))
  it('a spike in the last week pushes it up', () => {
    // 21 days at 300, then 7 at 600: acute 600, chronic 375
    expect(acwr([...days(21, 300), ...days(7, 600)])).toBe(1.6)
  })
  it('zero chronic load is undefined, not infinity', () => expect(acwr(days(28, 0))).toBeNull())
  it('zones match the published bands', () => {
    expect(zone(0.7)).toBe('low')
    expect(zone(1.3)).toBe('safe')
    expect(zone(1.45)).toBe('caution')
    expect(zone(1.58)).toBe('danger')
  })
})
