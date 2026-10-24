/* A pasted list of players ("7 خالد المحمد مهاجم", one per line) read into number, name and position. Only these three: no pay, contract or health.
   The same limits as add_players in the database, which checks them again. The parser guesses; the club sees every row before anything is written. */
export const MAX_PLAYERS = 60
export const DEFAULT_POS = 'لاعب'

export type RosterRow = { num: number; name: string; pos: string; guessed: boolean }
export type RosterError = { row: number; code: 'bad_number' | 'duplicate_number' | 'bad_length' | 'formula_prefix' | 'too_many' }

export const ROSTER_ERROR_TEXT: Record<RosterError['code'], string> = {
  bad_number: 'ما لقينا رقم قميص من 1 إلى 99', duplicate_number: 'رقم القميص مكرر', bad_length: 'الاسم لازم من حرفين إلى 60', formula_prefix: 'النص يبدأ برمز معادلة (= + - @)',
  too_many: `التشكيلة ما تتعدى ${MAX_PLAYERS} لاعب`,
}

const POSITIONS = ['حارس مرمى', 'قلب دفاع', 'ظهير أيمن', 'ظهير أيسر', 'ظهير', 'مدافع', 'وسط', 'صانع ألعاب', 'جناح أيمن', 'جناح أيسر', 'جناح', 'مهاجم'] as const
/* Words people actually write, mapped to the position kept on the player. Matched on normalised text, longest phrase first. */
const SYNONYMS: [string, string][] = [
  ['حارس مرمى', 'حارس مرمى'], ['حارس', 'حارس مرمى'], ['gk', 'حارس مرمى'], ['goalkeeper', 'حارس مرمى'], ['keeper', 'حارس مرمى'],
  ['قلب دفاع', 'قلب دفاع'], ['قلب الدفاع', 'قلب دفاع'], ['cb', 'قلب دفاع'],
  ['ظهير ايمن', 'ظهير أيمن'], ['ظهير ايسر', 'ظهير أيسر'], ['rb', 'ظهير أيمن'], ['lb', 'ظهير أيسر'], ['ظهير', 'ظهير'],
  ['مدافع', 'مدافع'], ['دفاع', 'مدافع'], ['df', 'مدافع'], ['def', 'مدافع'], ['defender', 'مدافع'],
  ['لاعب وسط', 'وسط'], ['وسط ملعب', 'وسط'], ['وسط', 'وسط'], ['mf', 'وسط'], ['cm', 'وسط'], ['mid', 'وسط'], ['midfielder', 'وسط'],
  ['صانع العاب', 'صانع ألعاب'], ['cam', 'صانع ألعاب'],
  ['جناح ايمن', 'جناح أيمن'], ['جناح ايسر', 'جناح أيسر'], ['rw', 'جناح أيمن'], ['lw', 'جناح أيسر'], ['جناح', 'جناح'], ['winger', 'جناح'],
  ['مهاجم', 'مهاجم'], ['هجوم', 'مهاجم'], ['fw', 'مهاجم'], ['st', 'مهاجم'], ['cf', 'مهاجم'], ['striker', 'مهاجم'], ['forward', 'مهاجم'],
].sort((a, b) => b[0].split(' ').length - a[0].split(' ').length) as [string, string][]

export const POSITION_SUGGESTIONS: readonly string[] = POSITIONS

const toLatinDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
/* For matching only: no diacritics, أإآ as ا, ى as ي, lower case. The name and position keep their own spelling. */
const norm = (s: string) => s.replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').toLowerCase()
const FORMULA = /^[=+\-@]/

/* One line to a row. `taken` = numbers already in the squad. The row index is 1-based (the first non-empty line is row 1). */
export function parseRosterLine(line: string): { num: number | null; name: string; pos: string; guessed: boolean } {
  const cleaned = toLatinDigits(line).replace(/^[\s•·*▪◦►‎‏-]+/, '').replace(/[|;\t،,]+/g, ' ').replace(/\s[-–—]\s/g, ' ')
  let tokens = cleaned.split(/\s+/).filter(Boolean)
  const asNum = (t: string) => { const m = /^#?(\d{1,2})[.):\]\-–—]*$/.exec(t); return m ? Number(m[1]) : null }
  let num: number | null = null
  if (tokens.length && asNum(tokens[0]) !== null) { num = asNum(tokens[0]); tokens = tokens.slice(1) }
  else if (tokens.length && asNum(tokens[tokens.length - 1]) !== null) { num = asNum(tokens[tokens.length - 1]); tokens = tokens.slice(0, -1) }

  const nt = tokens.map(norm)
  let pos = DEFAULT_POS; let guessed = true
  for (const [phrase, canon] of SYNONYMS) {
    const p = phrase.split(' ')
    for (let i = nt.length - p.length; i >= 0; i--) {
      if (p.every((w, k) => nt[i + k] === w) && nt.length - p.length > 0) { pos = canon; guessed = false; tokens.splice(i, p.length); break }
    }
    if (!guessed) break
  }
  return { num, name: tokens.join(' ').replace(/\s+/g, ' ').trim(), pos, guessed }
}

export function validateRow(r: { num: number | null; name: string; pos: string }, taken: Iterable<number>): RosterError['code'] | null {
  if (r.num === null || !Number.isInteger(r.num) || r.num < 1 || r.num > 99) return 'bad_number'
  if (new Set(taken).has(r.num)) return 'duplicate_number'
  if (r.name.length < 2 || r.name.length > 60 || r.pos.length < 2 || r.pos.length > 30) return 'bad_length'
  if (FORMULA.test(r.name) || FORMULA.test(r.pos)) return 'formula_prefix'
  return null
}

/* `existing` = shirt numbers already in the squad or already staged. A bad line is reported and skipped; the good ones come back. */
export function parseRoster(text: string, existing: number[] = []): { rows: RosterRow[]; errors: RosterError[] } {
  const rows: RosterRow[] = []; const errors: RosterError[] = []
  const taken = new Set(existing)
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  lines.forEach((line, idx) => {
    const row = idx + 1
    const r = parseRosterLine(line)
    const code = validateRow(r, taken) ?? (existing.length + rows.length >= MAX_PLAYERS ? 'too_many' : null)
    if (code) { errors.push({ row, code }); return }
    taken.add(r.num!)
    rows.push({ num: r.num!, name: r.name, pos: r.pos, guessed: r.guessed })
  })
  return { rows, errors }
}
