import { describe, expect, it } from 'vitest'
import { absentees, availabilityLine, cardsText, FIT, isDefault, normalise, validateAvailability, type Availability } from './availability'

const A = (o: Partial<Availability>): Availability => ({ ...FIT, ...o })
const TODAY = '2026-10-25'

describe('validateAvailability', () => {
  it('accepts a ready player and a normal injury with a future return', () => {
    expect(validateAvailability(FIT, TODAY)).toBeNull()
    expect(validateAvailability(A({ status: 'injured', note: 'شد عضلي', returnOn: '2026-11-10' }), TODAY)).toBeNull()
    expect(validateAvailability(A({ status: 'injured', returnOn: TODAY }), TODAY)).toBeNull()
  })
  it('refuses a long note, a past return, a return for a ready or suspended player, and bad card counts', () => {
    expect(validateAvailability(A({ status: 'injured', note: 'x'.repeat(61) }), TODAY)).toBe('note_too_long')
    expect(validateAvailability(A({ status: 'injured', returnOn: '2026-10-24' }), TODAY)).toBe('return_in_past')
    expect(validateAvailability(A({ returnOn: '2026-11-01' }), TODAY)).toBe('return_not_applicable')
    expect(validateAvailability(A({ status: 'suspended', returnOn: '2026-11-01' }), TODAY)).toBe('return_not_applicable')
    for (const c of [{ yellow: -1 }, { yellow: 31 }, { red: 11 }, { yellow: 1.5 }]) expect(validateAvailability(A(c), TODAY)).toBe('bad_cards')
  })
})

describe('normalise', () => {
  it('drops the injury note and return date once the player is ready or suspended', () => {
    expect(normalise(A({ status: 'fit', note: 'قديم', returnOn: '2026-11-01' }))).toEqual(FIT)
    expect(normalise(A({ status: 'suspended', note: 'x', returnOn: '2026-11-01', red: 1 }))).toEqual(A({ status: 'suspended', red: 1 }))
  })
  it('tidies spaces in the note of an injured player', () => {
    expect(normalise(A({ status: 'injured', note: '  شد   عضلي ' })).note).toBe('شد عضلي')
  })
})

describe('text', () => {
  it('writes cards and the status line, leaving empty parts out', () => {
    expect(cardsText(0, 0)).toBe('')
    expect(cardsText(2, 0)).toBe('2 أصفر')
    expect(cardsText(1, 1)).toBe('1 أصفر · 1 أحمر')
    expect(availabilityLine(A({ status: 'injured', note: 'كاحل', returnOn: '2026-11-10', yellow: 1 }), (d) => d)).toBe('كاحل · يرجع 2026-11-10 · 1 أصفر')
    expect(availabilityLine(FIT, (d) => d)).toBe('')
    expect(isDefault(FIT)).toBe(true)
    expect(isDefault(A({ yellow: 1 }))).toBe(false)
  })
})

describe('absentees', () => {
  const sq = [
    { num: 5, name: 'أ', status: 'injured' as const }, { num: 7, name: 'ب', status: 'fit' as const },
    { num: 9, name: 'ج', status: 'suspended' as const }, { num: 11, name: 'د', status: 'doubtful' as const },
  ]
  it('lists injured and suspended players by name and tag only', () => {
    expect(absentees(sq)).toEqual([{ num: 5, name: 'أ', tag: 'مصاب' }, { num: 9, name: 'ج', tag: 'موقوف' }])
    expect(Object.keys(absentees(sq)[0]).sort()).toEqual(['name', 'num', 'tag'])
  })
})
