import { describe, expect, it } from 'vitest'
import { fmtGd, fmtMoney, fmtNumber, fmtPercent } from './format'

describe('format', () => {
  it('uses latin digits', () => expect(fmtNumber(1234)).toMatch(/1.?234/))
  it('shows BHD with 3 decimals', () => expect(fmtMoney(12.5)).toContain('12.500'))
  it('formats percent', () => expect(fmtPercent(0.756)).toContain('76'))
  it('goal difference: plus, real minus, zero', () => {
    expect(fmtGd(4)).toBe('+4')
    expect(fmtGd(-2)).toBe('\u22122')
    expect(fmtGd(0)).toBe('0')
  })
})
