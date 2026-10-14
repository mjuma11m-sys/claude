/* Squad CSV: parsed and checked in the browser first, then checked again by import_squad in the database (the lock).
   Both sides use the same limits. Health is the status only (no free text): a note column is not accepted. */
import type { PlayerStatus } from './squad'

export const MAX_ROWS = 60
export const MAX_BYTES = 200_000

export type ImportRow = { num: number; name: string; pos: string; status: PlayerStatus; ends_on: string; starts_on?: string; monthly_wage_bhd: number; consent_ref: string }
export type CsvError = { row: number; field: string; code: string }

export const ERROR_TEXT: Record<string, string> = {
  bad_length: 'النص قصير أو طويل', bad_status: 'الحالة لازم: جاهز، مشكوك، مصاب، أو موقوف', consent_required: 'مرجع الموافقة ناقص',
  formula_prefix: 'النص يبدأ برمز معادلة (= + - @)', bad_number: 'رقم القميص لازم من 1 إلى 99', duplicate_number: 'رقم القميص مكرر',
  bad_wage: 'الراتب لازم رقم بين 0 و100,000', bad_date: 'التاريخ لازم بصيغة YYYY-MM-DD', ends_before_start: 'العقد ينتهي قبل ما يبدأ',
  bad_row_count: 'عدد اللاعبين لازم من 1 إلى 60', not_a_list: 'الملف ما انقرا', too_big: 'الملف أكبر من 200KB', missing_column: 'عمود ناقص',
  notes_not_accepted: 'ما نقبل ملاحظات صحية: الحالة فقط', empty: 'الملف فاضي',
}
export const FIELD_TEXT: Record<string, string> = { num: 'الرقم', name: 'الاسم', pos: 'المركز', status: 'الحالة', ends_on: 'نهاية العقد', starts_on: 'بداية العقد', monthly_wage_bhd: 'الراتب', consent_ref: 'مرجع الموافقة', text: 'نص', rows: 'الملف', header: 'العناوين' }

const HEADERS: Record<string, keyof ImportRow> = {
  num: 'num', number: 'num', 'رقم': 'num', 'الرقم': 'num', 'رقم القميص': 'num',
  name: 'name', 'الاسم': 'name', 'اسم': 'name', 'اللاعب': 'name',
  pos: 'pos', position: 'pos', 'المركز': 'pos', 'مركز': 'pos',
  status: 'status', 'الحالة': 'status', 'حالة': 'status',
  ends_on: 'ends_on', end: 'ends_on', 'نهاية العقد': 'ends_on', 'ينتهي': 'ends_on',
  starts_on: 'starts_on', start: 'starts_on', 'بداية العقد': 'starts_on',
  monthly_wage_bhd: 'monthly_wage_bhd', wage: 'monthly_wage_bhd', salary: 'monthly_wage_bhd', 'الراتب': 'monthly_wage_bhd', 'الراتب الشهري': 'monthly_wage_bhd',
  consent_ref: 'consent_ref', consent: 'consent_ref', 'مرجع الموافقة': 'consent_ref', 'الموافقة': 'consent_ref',
}
const NOTE_HEADERS = ['note', 'notes', 'ملاحظة', 'ملاحظات', 'التشخيص', 'diagnosis']
const REQUIRED: (keyof ImportRow)[] = ['num', 'name', 'pos', 'status', 'ends_on', 'monthly_wage_bhd', 'consent_ref']
const STATUS_WORDS: Record<string, PlayerStatus> = { fit: 'fit', 'جاهز': 'fit', doubtful: 'doubtful', 'مشكوك': 'doubtful', injured: 'injured', 'مصاب': 'injured', suspended: 'suspended', 'موقوف': 'suspended' }

const toLatinDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/٫/g, '.')
const FORMULA = /^[=+\-@]/

function splitLine(line: string, sep: string): string[] {
  const out: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ } else if (ch === '"') q = false; else cur += ch }
    else if (ch === '"') q = true
    else if (ch === sep) { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z')) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s

/* `row` in errors is the 1-based data row (the first player is row 1); the CSV line is row + 1. */
export function parseSquadCsv(text: string): { rows: ImportRow[]; errors: CsvError[] } {
  if (text.length > MAX_BYTES) return { rows: [], errors: [{ row: 0, field: 'rows', code: 'too_big' }] }
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return { rows: [], errors: [{ row: 0, field: 'rows', code: 'empty' }] }
  const sep = [',', ';', '\t'].map((s) => [s, lines[0].split(s).length] as const).sort((a, b) => b[1] - a[1])[0][0]
  const head = splitLine(lines[0], sep).map((h) => h.trim().toLowerCase())
  if (head.some((h) => NOTE_HEADERS.includes(h))) return { rows: [], errors: [{ row: 0, field: 'header', code: 'notes_not_accepted' }] }
  const cols = head.map((h) => HEADERS[h])
  const missing = REQUIRED.filter((c) => !cols.includes(c))
  if (missing.length) return { rows: [], errors: missing.map((c) => ({ row: 0, field: c, code: 'missing_column' })) }
  if (lines.length - 1 > MAX_ROWS) return { rows: [], errors: [{ row: 0, field: 'rows', code: 'bad_row_count' }] }

  const errors: CsvError[] = []
  const rows: ImportRow[] = []
  const seen = new Set<number>()
  lines.slice(1).forEach((line, idx) => {
    const row = idx + 1
    const cells = splitLine(line, sep)
    const get = (c: keyof ImportRow) => toLatinDigits(cells[cols.indexOf(c)] ?? '').trim()
    const bad = (field: string, code: string) => errors.push({ row, field, code })
    const name = (cells[cols.indexOf('name')] ?? '').replace(/\s+/g, ' ').trim()
    const pos = (cells[cols.indexOf('pos')] ?? '').replace(/\s+/g, ' ').trim()
    const ref = (cells[cols.indexOf('consent_ref')] ?? '').trim()
    if (name.length < 2 || name.length > 60) bad('name', 'bad_length')
    if (pos.length < 2 || pos.length > 30) bad('pos', 'bad_length')
    if (ref.length < 3 || ref.length > 60) bad('consent_ref', 'consent_required')
    if (FORMULA.test(name) || FORMULA.test(pos) || FORMULA.test(ref)) bad('text', 'formula_prefix')
    const status = STATUS_WORDS[(cells[cols.indexOf('status')] ?? '').trim().toLowerCase()]
    if (!status) bad('status', 'bad_status')
    const num = Number(get('num'))
    if (!Number.isInteger(num) || num < 1 || num > 99) bad('num', 'bad_number')
    else if (seen.has(num)) bad('num', 'duplicate_number')
    else seen.add(num)
    const wageRaw = get('monthly_wage_bhd').replace(/,/g, '')
    const wage = wageRaw === '' ? NaN : Number(wageRaw)
    if (!Number.isFinite(wage) || wage < 0 || wage > 100_000) bad('monthly_wage_bhd', 'bad_wage')
    const ends = get('ends_on')
    const starts = cols.includes('starts_on') ? get('starts_on') : ''
    if (!isDate(ends)) bad('ends_on', 'bad_date')
    else if (starts && !isDate(starts)) bad('starts_on', 'bad_date')
    else if (starts && ends <= starts) bad('ends_on', 'ends_before_start')
    if (!errors.some((e) => e.row === row)) rows.push({ num, name, pos, status: status!, ends_on: ends, ...(starts ? { starts_on: starts } : {}), monthly_wage_bhd: wage, consent_ref: ref })
  })
  return { rows: errors.length ? [] : rows, errors }
}

export const TEMPLATE_CSV = 'num,name,pos,status,ends_on,monthly_wage_bhd,consent_ref\n1,اللاعب الأول,حارس مرمى,جاهز,2027-06-30,1500,FORM-001\n9,اللاعب التاسع,مهاجم,جاهز,2026-12-31,2200,FORM-002\n'
