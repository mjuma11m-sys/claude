import { describe, expect, it } from 'vitest'
import { fmtMoney, fmtNumber, fmtPercent } from './format'

describe('format', () => {
  it('uses latin digits', () => expect(fmtNumber(1234)).toMatch(/1.?234/))
  it('shows BHD with 3 decimals', () => expect(fmtMoney(12.5)).toContain('12.500'))
  it('formats percent', () => expect(fmtPercent(0.756)).toContain('76'))
})
