/* Match-card settings and club logos. They stay in this browser only (localStorage): the club uploads its own logo and its opponents'; the app ships none. */
import { DEFAULT_COLOR, LOGO_PX, oppKey } from '../lib/matchcard'

export type CardPrefs = { theme: 'dark' | 'light'; color: string; club: string; league: string; venue: string; gather: string; kit: string; footer: boolean }
export type Logos = { own: string | null; opp: Record<string, string> }

const PREFS = 'sh.cardPrefs'
const LOGOS = 'sh.cardLogos'
export const DEFAULT_PREFS: CardPrefs = { theme: 'dark', color: DEFAULT_COLOR, club: '', league: '', venue: '', gather: '', kit: 'قميص: ____ · شورت: ____ · شراب: ____', footer: true }

export function readPrefs(): CardPrefs { try { const v = localStorage.getItem(PREFS); return v ? { ...DEFAULT_PREFS, ...(JSON.parse(v) as Partial<CardPrefs>) } : DEFAULT_PREFS } catch { return DEFAULT_PREFS } }
export function writePrefs(p: CardPrefs): void { try { localStorage.setItem(PREFS, JSON.stringify(p)) } catch { /* session-only */ } }
export function readLogos(): Logos { try { const v = localStorage.getItem(LOGOS); return v ? { own: null, opp: {}, ...(JSON.parse(v) as Partial<Logos>) } : { own: null, opp: {} } } catch { return { own: null, opp: {} } } }
function writeLogos(l: Logos): boolean { try { localStorage.setItem(LOGOS, JSON.stringify(l)); return true } catch { return false } }

export function saveLogo(which: 'own' | { opponent: string }, dataUrl: string | null): Logos {
  const cur = readLogos()
  if (which === 'own') cur.own = dataUrl
  else if (dataUrl) cur.opp = { ...cur.opp, [oppKey(which.opponent)]: dataUrl }
  else { const { [oppKey(which.opponent)]: _gone, ...rest } = cur.opp; cur.opp = rest }
  writeLogos(cur)
  return cur
}

/* Shrinks an uploaded image to at most LOGO_PX on its long side and keeps transparency (PNG); an SVG or a huge photo never reaches storage as is. */
export async function shrinkLogo(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(file.type)) throw new Error('type')
  if (file.size > 8_000_000) throw new Error('size')
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, LOGO_PX / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k))
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close()
  return c.toDataURL('image/png')
}
