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
      r('المنامة', 4, 2, 4, 13, 13), r('الرفاع الشرقي', 3, 3, 4, 10, 12), r('سترة', 3, 2, 5, 9, 14),
      r('البحرين', 2, 3, 5, 8, 14), r('النجمة', 2, 2, 6, 7, 15), r('الشباب', 1, 3, 6, 6, 17),
    ],
  },
  {
    id: 'second',
    name: 'دوري الدرجة الثانية',
    rows: [
      r('قلالي', 6, 2, 1, 15, 6), r('مدينة عيسى', 5, 3, 1, 13, 7), r('البديع', 5, 1, 3, 12, 9),
      r('الاتحاد', 4, 2, 3, 11, 10), r('التضامن', 3, 3, 3, 9, 9), r('أم الحصم', 2, 3, 4, 8, 12),
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
