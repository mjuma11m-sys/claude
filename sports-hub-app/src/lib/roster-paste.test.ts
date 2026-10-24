import { describe, expect, it } from 'vitest'
import { parseRoster, parseRosterLine } from './roster-paste'

describe('one line', () => {
  it.each([
    ['7 خالد المحمد مهاجم', 7, 'خالد المحمد', 'مهاجم'],
    ['7- خالد المحمد - مهاجم', 7, 'خالد المحمد', 'مهاجم'],
    ['٧، خالد المحمد، مهاجم', 7, 'خالد المحمد', 'مهاجم'],
    ['خالد المحمد\tمهاجم\t7', 7, 'خالد المحمد', 'مهاجم'],
    ['• #10) سالم العلي (وسط)'.replace(/[()]/g, ''), 10, 'سالم العلي', 'وسط'],
    ['1 يوسف حارس', 1, 'يوسف', 'حارس مرمى'],
    ['3 ناصر الحمد gk', 3, 'ناصر الحمد', 'حارس مرمى'],
    ['5 علي قلب دفاع', 5, 'علي', 'قلب دفاع'],
    ['2 محمد ظهير ايسر', 2, 'محمد', 'ظهير أيسر'],
    ['11 أحمد جناح أيمن', 11, 'أحمد', 'جناح أيمن'],
  ])('%s', (line, num, name, pos) => {
    expect(parseRosterLine(line)).toMatchObject({ num, name, pos, guessed: false })
  })
  it('a line with no position is guessed as «لاعب» and flagged', () => {
    expect(parseRosterLine('8 عبدالله الكوهجي')).toEqual({ num: 8, name: 'عبدالله الكوهجي', pos: 'لاعب', guessed: true })
  })
  it('a name that is only a position word stays a name', () => {
    expect(parseRosterLine('9 مهاجم')).toMatchObject({ num: 9, name: 'مهاجم', guessed: true })
  })
  it('no number gives null', () => { expect(parseRosterLine('خالد مهاجم').num).toBeNull() })
})

describe('a pasted list', () => {
  it('reads every line and ignores blank ones', () => {
    const { rows, errors } = parseRoster('1 يوسف حارس\n\n7 خالد المحمد مهاجم\n10 سالم العلي وسط\n')
    expect(errors).toEqual([])
    expect(rows.map((r) => [r.num, r.name, r.pos])).toEqual([[1, 'يوسف', 'حارس مرمى'], [7, 'خالد المحمد', 'مهاجم'], [10, 'سالم العلي', 'وسط']])
  })
  it('reports each bad line by its position and keeps the good ones', () => {
    const { rows, errors } = parseRoster('7 خالد مهاجم\nسالم وسط\n7 ناصر جناح\n100 فلان وسط\n9 =cmd وسط')
    expect(rows.map((r) => r.num)).toEqual([7])
    expect(errors).toEqual([{ row: 2, code: 'bad_number' }, { row: 3, code: 'duplicate_number' }, { row: 4, code: 'bad_number' }, { row: 5, code: 'formula_prefix' }])
  })
  it('refuses a number already in the squad', () => {
    expect(parseRoster('7 خالد مهاجم', [7]).errors).toEqual([{ row: 1, code: 'duplicate_number' }])
  })
  it('stops at 60 players counting the ones already there', () => {
    const text = Array.from({ length: 5 }, (_, i) => `${i + 1} لاعب${i} وسط`).join('\n')
    const { rows, errors } = parseRoster(text, Array.from({ length: 58 }, (_, i) => i + 40))
    expect(rows).toHaveLength(2)
    expect(errors).toEqual([3, 4, 5].map((row) => ({ row, code: 'too_many' })))
  })
  it('a formula is refused whatever the field', () => { expect(parseRoster('9 +cmd وسط').errors[0].code).toBe('formula_prefix') })
})
