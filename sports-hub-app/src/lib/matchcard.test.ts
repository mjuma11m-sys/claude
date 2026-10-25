import { describe, expect, it } from 'vitest'
import { cardDate, cardFileName, cardRows, fitLogo, inkOn, MAX_CARD_PLAYERS, oppKey, rowHeight, splitColumns, validColor } from './matchcard'
import type { LPlayer, Lineup } from './lineup'

const P = (num: number, pos: string): LPlayer => ({ id: `p${num}`, num, name: `لاعب ${num}`, pos, status: 'fit' })
const squad = [P(1, 'حارس مرمى'), P(2, 'ظهير أيمن'), P(4, 'قلب دفاع'), P(5, 'قلب دفاع'), P(3, 'ظهير أيسر'), P(6, 'وسط'), P(8, 'وسط'), P(10, 'صانع ألعاب'), P(7, 'جناح'), P(9, 'مهاجم'), P(11, 'جناح'), P(12, 'وسط'), P(22, 'حارس مرمى')]
const lineup: Lineup = { formation: '4-3-3', starters: Object.fromEntries([1, 2, 4, 5, 3, 6, 8, 10, 7, 9, 11].map((n, i) => [i + 1, `p${n}`])), bench: ['p12', 'p22'] }

describe('cardRows', () => {
  const r = cardRows(lineup, squad, 'p10')
  it('lists the 11 starters in pitch order, then the bench', () => {
    expect(r).toHaveLength(13)
    expect(r[0].num).toBe(1)
    expect(r.slice(0, 11).every((x) => !x.bench)).toBe(true)
    expect(r.slice(11).every((x) => x.bench)).toBe(true)
  })
  it('tags goalkeepers GK (bench too) and the captain C, nobody else', () => {
    expect(r.filter((x) => x.tag === 'GK').map((x) => x.num)).toEqual([1, 22])
    expect(r.filter((x) => x.tag === 'C').map((x) => x.num)).toEqual([10])
  })
  it('a captain who is not on the list adds no tag; an unknown player id is skipped', () => {
    expect(cardRows(lineup, squad, 'p99').some((x) => x.tag === 'C')).toBe(false)
    expect(cardRows({ ...lineup, bench: ['ghost'] }, squad)).toHaveLength(11)
  })
  it('never exceeds the card limit', () => {
    const many = Array.from({ length: 40 }, (_, i) => P(i + 30, 'وسط'))
    expect(cardRows({ formation: '4-3-3', starters: {}, bench: many.map((p) => p.id) }, many)).toHaveLength(MAX_CARD_PLAYERS)
  })
})

describe('columns and sizes', () => {
  it('splits into two, the right (first) column the longer when odd', () => {
    expect(splitColumns([1, 2, 3, 4, 5])).toEqual([[1, 2, 3], [4, 5]])
    expect(splitColumns([])).toEqual([[], []])
  })
  it('row height stays between 54 and 120 and fits the longest column', () => {
    expect(rowHeight(2, 900)).toBe(120)
    expect(rowHeight(30, 900)).toBe(60)
    expect(rowHeight(200, 900)).toBe(54)
    for (let n = 1; n <= 30; n++) expect(rowHeight(n, 900) * Math.ceil(n / 2)).toBeLessThanOrEqual(Math.max(900, 54 * Math.ceil(n / 2)))
  })
})

describe('helpers', () => {
  it('validates #rrggbb only', () => { expect(validColor('#0f9d6b')).toBe(true); for (const v of ['0f9d6b', '#fff', 'red', '#12345g']) expect(validColor(v)).toBe(false) })
  it('picks readable ink', () => { expect(inkOn('#ffffff')).toBe('#0b1220'); expect(inkOn('#0b1220')).toBe('#ffffff'); expect(inkOn('#f5b301')).toBe('#0b1220'); expect(inkOn('nope')).toBe('#ffffff') })
  it('writes the date in Arabic with Latin digits', () => { const d = cardDate('2026-10-31'); expect(d).toMatch(/2026/); expect(d).toMatch(/31/); expect(d).not.toMatch(/[٠-٩]/); expect(cardDate('bad')).toBe('') })
  it('fits a logo inside the box without stretching', () => { expect(fitLogo(200, 100, 100)).toEqual({ w: 100, h: 50 }); expect(fitLogo(0, 0, 80)).toEqual({ w: 80, h: 80 }) })
  it('the file name is plain ASCII; the opponent key ignores case and spacing', () => {
    expect(cardFileName('2026-10-31')).toBe('match-card-2026-10-31.png')
    expect(cardFileName('x/../2026')).toBe('match-card-..2026.png'.replace('..', ''))
    expect(oppKey('  Al  Ahli ')).toBe(oppKey('al ahli'))
  })
})
