/* Player availability: status, injury type (a short note, never a diagnosis), expected return and card counts. Pure logic; storage is in data/availability.ts. */
import type { PlayerStatus } from './squad'

export type Availability = { status: PlayerStatus; note: string; returnOn: string | null; yellow: number; red: number }
export const FIT: Availability = { status: 'fit', note: '', returnOn: null, yellow: 0, red: 0 }
export const NOTE_MAX = 60
export const MAX_YELLOW = 30
export const MAX_RED = 10

export type AvailError = 'note_too_long' | 'return_in_past' | 'return_not_applicable' | 'bad_cards'
export const AVAIL_ERROR_TEXT: Record<AvailError, string> = {
  note_too_long: `نوع الإصابة حتى ${NOTE_MAX} حرف.`,
  return_in_past: 'تاريخ العودة لازم يكون اليوم أو بعده.',
  return_not_applicable: 'تاريخ العودة للمصاب أو المشكوك فيه فقط.',
  bad_cards: 'عدد الكروت غير صحيح.',
}

export function validateAvailability(a: Availability, today: string): AvailError | null {
  if (a.note.length > NOTE_MAX) return 'note_too_long'
  if (a.returnOn && a.status !== 'injured' && a.status !== 'doubtful') return 'return_not_applicable'
  if (a.returnOn && a.returnOn < today) return 'return_in_past'
  if (![a.yellow, a.red].every(Number.isInteger) || a.yellow < 0 || a.yellow > MAX_YELLOW || a.red < 0 || a.red > MAX_RED) return 'bad_cards'
  return null
}

/* Clean a draft before saving: a ready player carries no injury note or return date. */
export function normalise(a: Availability): Availability {
  const keep = a.status === 'injured' || a.status === 'doubtful'
  return { ...a, note: keep ? a.note.trim().replace(/\s+/g, ' ') : '', returnOn: keep && a.returnOn ? a.returnOn : null }
}

export const isDefault = (a: Availability) => a.status === 'fit' && a.yellow === 0 && a.red === 0

export function cardsText(yellow: number, red: number): string {
  return [yellow ? `${yellow} أصفر` : '', red ? `${red} أحمر` : ''].filter(Boolean).join(' · ')
}

export function availabilityLine(a: Availability, fmt: (iso: string) => string): string {
  return [a.note, a.returnOn ? `يرجع ${fmt(a.returnOn)}` : '', cardsText(a.yellow, a.red)].filter(Boolean).join(' · ')
}

/* Names for the match card: injured and suspended only, never the reason or the dates. */
export type Absentee = { num: number | null; name: string; tag: 'مصاب' | 'موقوف' }
export function absentees(players: { num: number | null; name: string; status: PlayerStatus }[]): Absentee[] {
  const out: Absentee[] = []
  for (const p of players) {
    if (p.status === 'injured') out.push({ num: p.num, name: p.name, tag: 'مصاب' })
    else if (p.status === 'suspended') out.push({ num: p.num, name: p.name, tag: 'موقوف' })
  }
  return out
}
