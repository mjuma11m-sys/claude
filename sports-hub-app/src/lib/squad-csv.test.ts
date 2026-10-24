import { describe, expect, it } from 'vitest'
import { MAX_ROWS, parseSquadCsv, TEMPLATE_CSV } from './squad-csv'

const H = 'num,name,pos,status,ends_on,monthly_wage_bhd,consent_ref'
const line = (o: Record<string, string> = {}) => {
  const d = { num: '9', name: 'مهاجم تجريبي', pos: 'مهاجم', status: 'fit', ends_on: '2027-06-30', monthly_wage_bhd: '2500', consent_ref: 'FORM-9', ...o }
  return [d.num, d.name, d.pos, d.status, d.ends_on, d.monthly_wage_bhd, d.consent_ref].join(',')
}
const codes = (csv: string) => parseSquadCsv(csv).errors.map((e) => `${e.row}:${e.field}:${e.code}`)

describe('squad CSV', () => {
  it('the template we hand out parses clean', () => {
    const r = parseSquadCsv(TEMPLATE_CSV)
    expect(r.errors).toEqual([])
    expect(r.rows).toHaveLength(2)
    expect(r.rows[0]).toMatchObject({ num: 1, status: 'fit', monthly_wage_bhd: 1500, consent_ref: 'FORM-001' })
  })
  it('reads Arabic headers and status words, a BOM, semicolons and Arabic digits', () => {
    const csv = '﻿الرقم;الاسم;المركز;الحالة;نهاية العقد;الراتب;مرجع الموافقة\n٩;مهاجم;مهاجم;مصاب;٢٠٢٧-٠٦-٣٠;١٬٢٠٠;F-1\n'
    const r = parseSquadCsv(csv.replace('١٬٢٠٠', '1200'))
    expect(r.errors).toEqual([])
    expect(r.rows[0]).toMatchObject({ num: 9, status: 'injured', ends_on: '2027-06-30', monthly_wage_bhd: 1200 })
  })
  it('handles quoted cells with commas and escaped quotes', () => {
    const r = parseSquadCsv(`${H}\n9,"الفلاني, ""الصقر""",مهاجم,fit,2027-06-30,2500,F-1`)
    expect(r.rows[0].name).toBe('الفلاني, "الصقر"')
  })
  it('refuses a health notes column outright', () => {
    expect(codes(`${H},note\n${line()},كسر بالساق`)).toEqual(['0:header:notes_not_accepted'])
    expect(codes(`${H},ملاحظات\n${line()},x`)).toEqual(['0:header:notes_not_accepted'])
  })
  it('refuses a row without a consent reference', () => {
    expect(codes(`${H}\n${line({ consent_ref: '' })}`)).toEqual(['1:consent_ref:consent_required'])
  })
  it('names a missing column instead of guessing', () => {
    expect(codes('num,name\n1,x')).toContain('0:consent_ref:missing_column')
  })
  it('rejects bad values with the row number, and reports every problem in one pass', () => {
    const csv = [H, line(), line({ num: '9' }), line({ num: '10', status: 'كسر', monthly_wage_bhd: '999999', ends_on: '2027-13-40' }), line({ num: '11', name: '=1+1' })].join('\n')
    expect(codes(csv)).toEqual(['2:num:duplicate_number', '3:status:bad_status', '3:monthly_wage_bhd:bad_wage', '3:ends_on:bad_date', '4:text:formula_prefix'])
  })
  it('catches formula prefixes in every text column', () => {
    for (const k of ['name', 'pos', 'consent_ref']) expect(codes(`${H}\n${line({ [k]: '@SUM(A1)' })}`)).toContain('1:text:formula_prefix')
    expect(codes(`${H}\n${line({ name: '-cmd' })}`)).toContain('1:text:formula_prefix')
  })
  it('a contract cannot end before it starts', () => {
    expect(codes(`${H},starts_on\n${line({ ends_on: '2026-01-01' })},2027-01-01`)).toEqual(['1:ends_on:ends_before_start'])
  })
  it('enforces the size limits', () => {
    const many = [H, ...Array.from({ length: MAX_ROWS + 1 }, (_, i) => line({ num: String((i % 99) + 1) }))].join('\n')
    expect(codes(many)).toEqual(['0:rows:bad_row_count'])
    expect(codes('x'.repeat(200_001))).toEqual(['0:rows:too_big'])
    expect(codes(H)).toEqual(['0:rows:empty'])
  })
  it('returns no rows at all when anything is wrong: nothing partial reaches the database', () => {
    expect(parseSquadCsv([H, line(), line({ num: '10', status: 'x' })].join('\n')).rows).toEqual([])
  })
})
