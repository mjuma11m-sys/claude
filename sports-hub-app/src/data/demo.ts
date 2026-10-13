/* Demo data only. Every screen that renders this shows <DemoNote />.
   Real fixtures and tables come from Supabase once a data source is agreed. */
import type { Row } from '../lib/standings'

export const MY_CLUB = 'المالكية'

const r = (team: string, won: number, drawn: number, lost: number, gf: number, ga: number): Row =>
  ({ team, played: won + drawn + lost, won, drawn, lost, gf, ga })

export const LEAGUES = [
  {
    id: 'premier',
    name: 'دوري ناصر بن حمد الممتاز',
    rows: [
      r('المحرق', 7, 2, 1, 19, 8), r('الخالدية', 6, 3, 1, 16, 7), r('الرفاع', 6, 2, 2, 15, 9),
      r('المالكية', 5, 3, 2, 14, 10), r('الأهلي', 4, 4, 2, 12, 10), r('الحد', 4, 3, 3, 11, 11),
      r('المنامة', 3, 2, 5, 13, 13), r('الرفاع الشرقي', 2, 3, 5, 10, 12), r('سترة', 2, 2, 6, 9, 14),
      r('البحرين', 2, 3, 5, 8, 14), r('النجمة', 2, 2, 6, 7, 15), r('الشباب', 1, 3, 6, 6, 17),
    ],
  },
  {
    id: 'second',
    name: 'دوري الدرجة الثانية',
    rows: [
      r('قلالي', 6, 2, 1, 15, 6), r('مدينة عيسى', 5, 3, 1, 13, 7), r('البديع', 5, 1, 3, 12, 9),
      r('الاتحاد', 4, 2, 3, 11, 10), r('التضامن', 2, 3, 4, 9, 9), r('أم الحصم', 2, 3, 4, 8, 12),
      r('البسيتين', 2, 2, 5, 7, 13), r('العكر', 1, 2, 6, 5, 14),
    ],
  },
] as const

export const NEXT_MATCH = { home: 'المالكية', away: 'المحرق', venue: 'استاد خليفة الرياضي', kickoff: '2026-10-18T19:30:00+03:00' }

export const MOTM_CANDIDATES = [
  { id: 'p1', name: 'اللاعب 1', pos: 'حارس مرمى', num: 1 },
  { id: 'p2', name: 'اللاعب 4', pos: 'قلب دفاع', num: 4 },
  { id: 'p3', name: 'اللاعب 8', pos: 'وسط', num: 8 },
  { id: 'p4', name: 'اللاعب 10', pos: 'صانع ألعاب', num: 10 },
  { id: 'p5', name: 'اللاعب 9', pos: 'مهاجم', num: 9 },
]
export const MOTM_SEED: Record<string, number> = { p1: 142, p2: 61, p3: 88, p4: 203, p5: 117 }

/* 28 days of session load per player (oldest first). */
const wave = (base: number, spike = 1) =>
  Array.from({ length: 28 }, (_, i) => Math.round(base * (1 + 0.15 * Math.sin(i / 2)) * (i >= 21 ? spike : 1)))

export const SQUAD_LOADS = [
  { num: 1, name: 'اللاعب 1', pos: 'حارس مرمى', loads: wave(320) },
  { num: 4, name: 'اللاعب 4', pos: 'قلب دفاع', loads: wave(420, 1.15) },
  { num: 8, name: 'اللاعب 8', pos: 'وسط', loads: wave(480, 2) },
  { num: 10, name: 'اللاعب 10', pos: 'صانع ألعاب', loads: wave(450, 1.6) },
  { num: 9, name: 'اللاعب 9', pos: 'مهاجم', loads: wave(440, 0.6) },
]

/* ---------- Club and federation workspaces ----------
   Every club below is fictional on purpose: pay and finance are never attached to a real club, even as demo data. */
import type { PlayerStatus } from '../lib/squad'

export const DEMO_CLUB = 'نادي تجريبي 01'
export const FFP_LIMIT_DEMO = 0.7 // a demo value, not an official rule

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)
const sq = (num: number, pos: string, days: number, wage: number, status: PlayerStatus, note: string | null = null) =>
  ({ id: `demo-${num}`, num, name: `اللاعب ${num}`, pos, endsOn: inDays(days), wage, status, note })

export const DEMO_SQUAD = [
  sq(1, 'حارس مرمى', 420, 1800, 'fit'), sq(22, 'حارس مرمى', 150, 900, 'fit'), sq(2, 'ظهير أيمن', 640, 1500, 'fit'),
  sq(3, 'ظهير أيسر', 95, 1400, 'doubtful', 'إجهاد بسيط'), sq(4, 'قلب دفاع', 880, 2100, 'fit'), sq(5, 'قلب دفاع', 300, 1700, 'injured', 'إصابة عضلية'),
  sq(6, 'وسط ارتكاز', 1100, 2400, 'fit'), sq(8, 'وسط', 170, 1600, 'fit'), sq(10, 'صانع ألعاب', 520, 3200, 'fit'),
  sq(14, 'وسط', 40, 1100, 'suspended', 'إيقاف مباراتين'), sq(7, 'جناح', 730, 2000, 'fit'), sq(11, 'جناح', 200, 1900, 'fit'),
  sq(9, 'مهاجم', 960, 3500, 'fit'), sq(17, 'مهاجم', 340, 1300, 'fit'), sq(19, 'مهاجم', 130, 1000, 'injured', 'شد بالفخذ'), sq(21, 'وسط', 560, 600, 'fit'),
]

/* [club, revenue BHD, wages BHD] for the season; null = has not filed. */
const fin = (n: number, revenue: number | null, wages: number | null) => ({ club: `نادي تجريبي ${String(n).padStart(2, '0')}`, revenue, wages })
export const DEMO_FINANCE = [
  fin(1, 520000, 360000), fin(2, 880000, 470000), fin(3, 410000, 340000), fin(4, 760000, 500000), fin(5, 1200000, 640000), fin(6, 330000, 215000),
  fin(7, 590000, 300000), fin(8, 450000, 335000), fin(9, 980000, 520000), fin(10, 270000, 150000), fin(11, null, null), fin(12, null, null),
]
export const DEMO_SEASON = '2026/27'
