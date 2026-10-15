/* Player rights, exercised through the club: requests a player makes about their own data, and the monthly pay ledger.
   Every deadline here is an INTERNAL target (DEFAULT_*, overridden by public.rules), not a statement of what the law requires. */
import { daysLeft } from './contracts'

export type RKind = 'access' | 'correct' | 'withdraw' | 'object'
export type RStatus = 'open' | 'done'
export type Request = { id: string; playerId: string | null; consentRef: string; kind: RKind; receivedOn: string; dueOn: string; status: RStatus; closedOn: string | null; exportedAt: string | null }

export const DEFAULT_REQUEST_DAYS = 30
export const DEFAULT_GRACE_DAYS = 15
export const EXPIRY_NOTICE_DAYS = 90
export const KINDS: RKind[] = ['access', 'correct', 'withdraw', 'object']
export const KIND_TEXT: Record<RKind, string> = { access: 'نسخة من بياناته', correct: 'تصحيح بيانات', withdraw: 'سحب الموافقة وحذف', object: 'اعتراض' }
export const KIND_ACT: Record<RKind, string> = { access: 'صدّر النسخة', correct: 'تم التصحيح', withdraw: 'نفّذ الحذف', object: 'تم النظر بالاعتراض' }
export const KIND_HELP: Record<RKind, string> = {
  access: 'تصدّر ملف بكل ما يحتفظ به التطبيق عن اللاعب، وتسلّمه له. الطلب ما يتسكر قبل التصدير.',
  correct: 'تصحح البيانات من شاشاتها (أو بإعادة الاستيراد) ثم تسكّر الطلب.',
  withdraw: 'يحذف اللاعب وراتبه وعقده وحالته وحضوره وتطويره فوراً. ما يرجع.',
  object: 'تسجّل أنك نظرت باعتراض اللاعب وردّيت عليه.',
}

const DAY = 86_400_000
const parse = (d: string) => Date.parse(d + 'T00:00:00Z')
export const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10)
export const dueOn = (receivedOn: string, days = DEFAULT_REQUEST_DAYS) => isoDay(parse(receivedOn) + days * DAY)

export type Urgency = 'late' | 'soon' | 'ok' | 'done'
export function urgency(r: Request, today = new Date()): { days: number; tone: Urgency } {
  const days = daysLeft(r.dueOn, today)
  if (r.status === 'done') return { days, tone: 'done' }
  return { days, tone: days < 0 ? 'late' : days <= 7 ? 'soon' : 'ok' }
}

/* Open first, the most overdue on top; closed ones by closing date, newest first. */
export function sortRequests(rs: Request[]): Request[] {
  return [...rs].sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || (a.status === 'open' ? a.dueOn.localeCompare(b.dueOn) : (b.closedOn ?? '').localeCompare(a.closedOn ?? '')))
}

export const describeDue = (days: number) => (days < 0 ? `متأخر ${-days} يوم` : days === 0 ? 'آخر يوم' : `باقي ${days} يوم`)

/* ---- pay ledger ---- */
export const monthOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
export function lastMonths(n: number, today = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => monthOf(new Date(today.getFullYear(), today.getMonth() - i, 1)))
}
const monthEnd = (month: string) => { const d = new Date(month + 'T00:00:00Z'); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0) }

/* Unpaid and past the end of the month by more than the grace days, for a player whose contract had not ended before the month began. */
export function isLate(month: string, paid: boolean, endsOn: string, today = new Date(), grace = DEFAULT_GRACE_DAYS): boolean {
  if (paid) return false
  if (parse(endsOn) < parse(month)) return false
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return now - monthEnd(month) > grace * DAY
}

/* A month counts only once the club has recorded at least one payment in it: before that we know nothing, and calling everyone late would be a guess. */
export const tracked = (paidInMonth: Record<string, string> | undefined) => !!paidInMonth && Object.keys(paidInMonth).length > 0

export type PayRow = { id: string; endsOn: string }
export function lateCount(rows: PayRow[], paid: Record<string, Record<string, string>>, months: string[], today = new Date(), grace = DEFAULT_GRACE_DAYS): number {
  const late = new Set<string>()
  for (const m of months) if (tracked(paid[m])) for (const r of rows) if (isLate(m, !!paid[m]?.[r.id], r.endsOn, today, grace)) late.add(r.id)
  return late.size
}

/* Late players first, then the others in the order given. */
export function lateFirst<T extends PayRow>(rows: T[], paid: Record<string, string>, month: string, today = new Date(), grace = DEFAULT_GRACE_DAYS): T[] {
  const on = tracked(paid)
  const rank = (r: T) => (on && isLate(month, !!paid[r.id], r.endsOn, today, grace) ? 0 : 1)
  return [...rows].sort((a, b) => rank(a) - rank(b))
}

/* Contracts ending within the notice window, soonest first (already-ended ones are not here: the club room lists them). */
export function endingSoon<T extends { endsOn: string }>(rows: T[], today = new Date(), within = EXPIRY_NOTICE_DAYS): T[] {
  return rows.filter((r) => { const d = daysLeft(r.endsOn, today); return d >= 0 && d <= within }).sort((a, b) => a.endsOn.localeCompare(b.endsOn))
}
