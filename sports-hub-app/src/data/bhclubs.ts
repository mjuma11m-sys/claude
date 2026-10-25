/* Bahraini clubs by name (public facts) for suggestions and logo lookup. Logo files are NOT in the repo by default:
   drop them in src/assets/clubs/<slug>.png|webp|svg once the club has agreed in writing (see the README there). */
import { oppKey } from '../lib/matchcard'

export type BhClub = { slug: string; ar: string }
export const BH_CLUBS: BhClub[] = [
  { slug: 'al-muharraq', ar: 'المحرق' }, { slug: 'al-riffa', ar: 'الرفاع' }, { slug: 'east-riffa', ar: 'الرفاع الشرقي' },
  { slug: 'manama', ar: 'المنامة' }, { slug: 'al-ahli', ar: 'الأهلي' }, { slug: 'al-khaldiya', ar: 'الخالدية' },
  { slug: 'al-najma', ar: 'النجمة' }, { slug: 'al-hala', ar: 'الحالة' }, { slug: 'busaiteen', ar: 'البسيتين' },
  { slug: 'sitra', ar: 'سترة' }, { slug: 'malkiya', ar: 'المالكية' }, { slug: 'al-shabab', ar: 'الشباب' },
  { slug: 'bahrain-sc', ar: 'البحرين' }, { slug: 'al-ittifaq', ar: 'الاتفاق' }, { slug: 'budaiya', ar: 'البديع' },
]

const files = import.meta.glob('../assets/clubs/*.{png,webp,svg}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const bySlug = new Map(Object.entries(files).map(([p, url]) => [p.split('/').pop()!.replace(/\.\w+$/, ''), url]))

const strip = (n: string) => oppKey(n).replace(/^(نادي|club)\s+/, '')
export const findClub = (name: string): BhClub | undefined => { const k = strip(name); return k ? BH_CLUBS.find((c) => strip(c.ar) === k) : undefined }
export const bundledLogo = (name: string): string | null => { const c = findClub(name); return c ? bySlug.get(c.slug) ?? null : null }
