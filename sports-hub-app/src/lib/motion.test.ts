import { describe, expect, it } from 'vitest'
import { gaugeFraction, zoneArcs } from './gauge'

describe('gauge geometry', () => {
  it('maps 0..2 onto the half circle and clamps', () => {
    expect(gaugeFraction(0)).toBe(0)
    expect(gaugeFraction(1)).toBe(0.5)
    expect(gaugeFraction(2)).toBe(1)
    expect(gaugeFraction(3.4)).toBe(1)
    expect(gaugeFraction(-1)).toBe(0)
  })
  it('zone bands line up with the published ACWR cut-offs', () => {
    const z = zoneArcs()
    expect(z.map((s) => s.zone)).toEqual(['low', 'safe', 'caution', 'danger'])
    expect(z[1].from).toBeCloseTo(0.4) // 0.8 / 2
    expect(z[1].to).toBeCloseTo(0.65) // 1.3 / 2
    expect(z[3].to).toBe(1)
    // bands touch, no gaps or overlaps
    z.slice(1).forEach((s, i) => expect(s.from).toBeCloseTo(z[i].to))
  })
})
