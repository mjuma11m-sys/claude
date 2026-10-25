/* Match-day card: the pure part (rows, columns, sizes, colours, date text). The drawing lives in components/MatchCard.tsx. */
import { FORMATION_SLOTS, roleOf, type Lineup, type LPlayer } from './lineup'

export const CARD_W = 1080
export const CARD_H = 1920
export const MAX_CARD_PLAYERS = 30
export const LOGO_PX = 256
export const DEFAULT_COLOR = '#0f9d6b'

export type CardRow = { num: number | null; name: string; tag: 'GK' | 'C' | null; bench: boolean }

/* Starters in pitch order (goalkeeper first), then the bench. Goalkeepers get GK from their position; the captain gets C when he is on the list. */
export function cardRows(l: Lineup, players: LPlayer[], captainId?: string | null): CardRow[] {
  const by = new Map(players.map((p) => [p.id, p]))
  const row = (p: LPlayer, bench: boolean): CardRow => ({ num: p.num, name: p.name, tag: roleOf(p.pos) === 'GK' ? 'GK' : p.id === captainId ? 'C' : null, bench })
  const starters = FORMATION_SLOTS[l.formation].map((d) => by.get(l.starters[d.slot])).filter((p): p is LPlayer => !!p).map((p) => row(p, false))
  const bench = l.bench.map((id) => by.get(id)).filter((p): p is LPlayer => !!p).map((p) => row(p, true))
  return [...starters, ...bench].slice(0, MAX_CARD_PLAYERS)
}

/* Two columns for the right-to-left reader: [right column, left column]; the right one is read first and is the longer when the count is odd. */
export function splitColumns<T>(rows: T[]): [T[], T[]] {
  const half = Math.ceil(rows.length / 2)
  return [rows.slice(0, half), rows.slice(half)]
}

/* Row height in px so that the longest column fits the panel: between 54 and 120 px (small squads get roomy rows). */
export function rowHeight(count: number, panel: number): number {
  const longest = Math.max(1, Math.ceil(count / 2))
  return Math.max(54, Math.min(120, Math.floor(panel / longest)))
}

export const validColor = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v)

/* Black or white text, whichever reads better on this colour (WCAG relative luminance). */
export function inkOn(hex: string): '#0b1220' | '#ffffff' {
  if (!validColor(hex)) return '#ffffff'
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  const lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  return lum > 0.4 ? '#0b1220' : '#ffffff'
}

/* "السبت 25 أكتوبر 2026": Arabic month and weekday names, Latin digits (same as the rest of the app). */
export function cardDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('ar-BH-u-nu-latn-ca-gregory', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d)
}

/* Largest size of a logo that fits a box, without stretching. */
export function fitLogo(w: number, h: number, box: number): { w: number; h: number } {
  if (!(w > 0) || !(h > 0)) return { w: box, h: box }
  const k = Math.min(box / w, box / h)
  return { w: Math.round(w * k), h: Math.round(h * k) }
}

/* ASCII only: some browsers and chat apps drop Arabic file names. */
export const cardFileName = (matchOn: string) => `match-card-${matchOn.replace(/[^0-9-]/g, '')}.png`

/* The key for the opponent's logo: the same team typed with other spacing or case finds the same logo. */
export const oppKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase()

/* The text that travels with the image (WhatsApp shows it as the caption): only what the players need; empty fields are left out. */
export function cardCaption(m: { club: string; opponent: string; matchOn: string; league: string; venue: string; gather: string; kit: string }): string {
  const kit = m.kit.trim()
  const lines = [
    `⚽ ${m.club.trim() || 'فريقنا'} × ${m.opponent.trim() || 'الخصم'}`,
    cardDate(m.matchOn) && `📅 ${cardDate(m.matchOn)}`,
    m.league.trim() && `🏆 ${m.league.trim()}`,
    m.venue.trim() && `📍 ${m.venue.trim()}`,
    m.gather.trim() && `⏰ التجمّع: ${m.gather.trim()}`,
    kit && !/_{3,}/.test(kit) && `👕 ${kit}`,
    '',
    'القائمة بالصورة 👇',
  ]
  return lines.filter((l) => l !== false && l !== undefined && l !== null).join('\n')
}
