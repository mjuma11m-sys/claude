/* Player and goalkeeper development. Three honest ingredients:
   1. Coach ratings (1-5) per skill: a coach's judgement, not a measurement.
   2. A weekly plan built around match day, from the goalkeeper training-plan guidance (volumes are indicative: the coach adjusts).
   3. Session load (minutes x RPE) feeding the same ACWR as the load screen: a warning light for the doctor, not a diagnosis. */
import { acwr, zone, type Zone } from './acwr'
import type { PlayerStatus } from './squad'

export type SkillId =
  | 'reflexes' | 'diving' | 'high_balls' | 'footwork' | 'distribution' | 'one_v_one' | 'organisation'
  | 'first_touch' | 'passing' | 'shooting' | 'defending' | 'speed_agility' | 'positioning'

export const GK_SKILLS: SkillId[] = ['reflexes', 'diving', 'high_balls', 'footwork', 'distribution', 'one_v_one', 'organisation']
export const OUT_SKILLS: SkillId[] = ['first_touch', 'passing', 'shooting', 'defending', 'speed_agility', 'positioning']
export const SKILL_LABEL: Record<SkillId, string> = {
  reflexes: 'ردة الفعل', diving: 'الارتماء', high_balls: 'الكرات العالية', footwork: 'الحركة القدمية', distribution: 'التوزيع', one_v_one: 'المواجهة الفردية', organisation: 'تنظيم الدفاع',
  first_touch: 'اللمسة الأولى', passing: 'التمرير', shooting: 'التسديد', defending: 'الدفاع الفردي', speed_agility: 'السرعة والرشاقة', positioning: 'التمركز',
}
export const SCORE_LABEL = ['', 'ضعيف', 'مقبول', 'جيد', 'جيد جداً', 'ممتاز']

export const isGoalkeeper = (pos: string) => pos.includes('حارس')
export const skillsFor = (pos: string) => (isGoalkeeper(pos) ? GK_SKILLS : OUT_SKILLS)

/* ---------- ratings ---------- */
export type Assessment = { day: string; skill: SkillId; score: number }
export type Latest = Partial<Record<SkillId, { score: number; prev: number | null; day: string }>>

/* Latest rating per skill plus the one before it (to show a change). Same day twice: the last one wins, as in the database key. */
export function latestScores(rows: Assessment[]): Latest {
  const bySkill = new Map<SkillId, Assessment[]>()
  for (const r of rows) bySkill.set(r.skill, [...(bySkill.get(r.skill) ?? []), r])
  const out: Latest = {}
  for (const [skill, list] of bySkill) {
    const days = [...list].sort((a, b) => a.day.localeCompare(b.day))
    const last = days[days.length - 1]
    const prev = days.length > 1 ? days[days.length - 2].score : null
    out[skill] = { score: last.score, prev, day: last.day }
  }
  return out
}

/* A change only counts when it is a whole point: one-point noise between two ratings is not a trend. */
export const trendOf = (score: number, prev: number | null): 'up' | 'down' | 'flat' => (prev === null || Math.abs(score - prev) < 1 ? 'flat' : score > prev ? 'up' : 'down')

/* Weakest rated skills first. Only rated skills compete: with no ratings there is no "weakest" (we never invent one). */
export function weakest(latest: Latest, skills: SkillId[], n = 2): SkillId[] {
  return skills.filter((s) => latest[s]).sort((a, b) => latest[a]!.score - latest[b]!.score || skills.indexOf(a) - skills.indexOf(b)).slice(0, n)
}

export type Goal = { id: string; skill: SkillId; target: number; dueOn: string; done: boolean }
export const goalProgress = (g: Goal, latest: Latest) => {
  const now = latest[g.skill]?.score ?? 0
  return { now, reached: now >= g.target, pct: Math.min(1, now / g.target) }
}

/* ---------- session load -> ACWR ---------- */
export type Log = { day: string; minutes: number; rpe: number }
const DAY = 86_400_000
const toDay = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/* The 28 days up to and including today, oldest first: session load = minutes x RPE, 0 on days without a log. */
export function dailyLoads(logs: Log[], today = new Date()): number[] {
  const end = toDay(today).getTime()
  const byDay = new Map(logs.map((l) => [l.day, l.minutes * l.rpe]))
  return Array.from({ length: 28 }, (_, i) => byDay.get(iso(end - (27 - i) * DAY)) ?? 0)
}

/* ACWR needs a full 28-day window of history. Say how many days are missing instead of guessing from less. */
export function loadFromLogs(logs: Log[], today = new Date()): { ratio: number | null; zone: Zone | null; missing: number } {
  if (logs.length === 0) return { ratio: null, zone: null, missing: 28 }
  const first = logs.map((l) => l.day).sort()[0]
  const span = Math.round((toDay(today).getTime() - Date.parse(first + 'T00:00:00Z')) / DAY) + 1
  if (span < 28) return { ratio: null, zone: null, missing: 28 - span }
  const ratio = acwr(dailyLoads(logs, today))
  return { ratio, zone: ratio === null ? null : zone(ratio), missing: 0 }
}

/* ---------- drills (indicative, from the goalkeeper training plan; the coach decides) ---------- */
export type Drill = { id: string; skill: SkillId; name: string; dose: string }
export const DRILLS: Drill[] = [
  { id: 'curtain', skill: 'reflexes', name: 'كرات من خلف حاجز أو ستارة (رؤية متأخرة)', dose: '6–10 تكرار × 3 مجموعات، راحة كاملة' },
  { id: 'tennis-wall', skill: 'reflexes', name: 'كرات التنس على الجدار', dose: '3 × 30 ثانية، راحة كاملة' },
  { id: 'ladder', skill: 'footwork', name: 'سلم وأقماع: وضع الاستعداد ← خطوة جانبية ← دفع', dose: '4–6 مجموعات × 6–8 ثواني، راحة 1:4' },
  { id: 'dive-series', skill: 'diving', name: 'سلسلة ارتماءات جانبية متدرجة', dose: 'جودة قبل الكمية، ضمن عدد الارتماءات المقترح' },
  { id: 'crosses', skill: 'high_balls', name: 'كرات عرضية مع مهاجم ضاغط', dose: '3 × 6 كرات من الجهتين' },
  { id: 'one-v-one', skill: 'one_v_one', name: 'مواجهة فردية: تقليل الزاوية والثبات', dose: '3 × 5 مواجهات' },
  { id: 'distribution', skill: 'distribution', name: 'توزيع باليد والقدم لأهداف محددة', dose: '3 × 8 تمريرات' },
  { id: 'organise', skill: 'organisation', name: 'تنظيم الدفاع بالركنيات والكرات الثابتة', dose: '10 دقائق، سيناريو مباراة' },
  { id: 'wall-touch', skill: 'first_touch', name: 'استقبال وتحكم ضد الجدار بالقدمين', dose: '3 × 40 ثانية' },
  { id: 'squares', skill: 'passing', name: 'مربعات التمرير بلمستين', dose: '4 × 3 دقائق' },
  { id: 'angles', skill: 'shooting', name: 'تسديد من زوايا مختلفة مع ضغط خفيف', dose: '3 × 6 تسديدات' },
  { id: 'duel', skill: 'defending', name: 'مواجهة فردية دفاعية بمساحة ضيقة', dose: '4 × 4 مواجهات' },
  { id: 'cones', skill: 'speed_agility', name: 'أقماع: تغيير اتجاه وتسارع قصير', dose: '5 × 8 ثواني، راحة 1:4' },
  { id: 'shadow', skill: 'positioning', name: 'تمركز ظلّي مع الكرة والخط الدفاعي', dose: '10 دقائق' },
]
const drillsFor = (skill: SkillId) => DRILLS.filter((d) => d.skill === skill)

/* ---------- weekly plan around match day ---------- */
export type Intensity = 'low' | 'medium' | 'high' | 'very_high'
export type PlanDay = { offset: number; label: string; date: string; name: string; intensity: Intensity; rpe: [number, number]; dives: [number, number] | null; minutes: string; blocks: string[]; drills: Drill[]; past: boolean; today: boolean }
export type Plan = { blocked: string | null; reduced: boolean; days: PlanDay[] }

const STRENGTH = ['Trap-bar deadlift أو RDL: 4 × 4–6', 'Bulgarian split squat: 3 × 6–8', 'Copenhagen plank: 3 × 20–30 ثانية', 'Pallof press: 3 × 10']
const PLYO = ['Lateral bounds: 3 × 6 لكل جهة', 'Box jumps (هبوط ناعم): 4 × 4', 'Skater jumps: 3 × 8']
const PREHAB = ['تدوير خارجي للكتف بالمطاط: 2 × 15', 'Copenhagen plank: 3 × 20–30 ثانية']

type Slot = { offset: number; label: string; name: string; gkName: string; intensity: Intensity; rpe: [number, number]; dives: [number, number]; minutes: string; blocks: string[]; pick: 'weak' | 'skills' | 'none'; skills?: SkillId[] }
const WEEK: Slot[] = [
  { offset: -4, label: 'MD-4', name: 'قوة + تقنية', gkName: 'قوة + حركة قدمية ومسك الكرة', intensity: 'high', rpe: [7, 8], dives: [20, 30], minutes: '60–75', blocks: STRENGTH, pick: 'weak', skills: ['footwork', 'first_touch', 'passing'] },
  { offset: -3, label: 'MD-3', name: 'انفجارية', gkName: 'انفجارية: بلايومتريكس، 1v1، ارتماء', intensity: 'very_high', rpe: [8, 9], dives: [30, 40], minutes: '60–75', blocks: PLYO, pick: 'weak', skills: ['diving', 'one_v_one', 'speed_agility', 'shooting'] },
  { offset: -2, label: 'MD-2', name: 'تكتيك وكرات ثابتة', gkName: 'كرات عالية، عرضيات، توزيع، تنظيم الدفاع', intensity: 'medium', rpe: [5, 6], dives: [15, 25], minutes: '50–60', blocks: PREHAB, pick: 'skills', skills: ['high_balls', 'distribution', 'organisation', 'positioning', 'passing'] },
  { offset: -1, label: 'MD-1', name: 'سرعة قصيرة', gkName: 'سرعة وردة فعل قصيرة، تحسس الكرة', intensity: 'low', rpe: [3, 4], dives: [0, 10], minutes: '30–40', blocks: [], pick: 'skills', skills: ['reflexes', 'speed_agility'] },
  { offset: 0, label: 'MD', name: 'يوم المباراة', gkName: 'إحماء المباراة: من 20 إلى 25 دقيقة', intensity: 'medium', rpe: [4, 5], dives: [8, 12], minutes: '20–25', blocks: [], pick: 'none' },
  { offset: 1, label: 'MD+1', name: 'استشفاء', gkName: 'استشفاء: دراجة أو سباحة خفيفة، مرونة، foam roll', intensity: 'low', rpe: [1, 3], dives: [0, 0], minutes: '30–40', blocks: [], pick: 'none' },
  { offset: 2, label: 'MD+2', name: 'راحة أو تقنية خفيفة', gkName: 'راحة أو تقنية خفيفة', intensity: 'low', rpe: [1, 3], dives: [0, 10], minutes: '20–30', blocks: [], pick: 'none' },
]
const REDUCE = 0.65 // ACWR in the caution or danger zone: the guidance says cut volume 30-40%

export function weekPlan(o: { matchDay: string; today?: Date; pos: string; status: PlayerStatus; latest: Latest; zone: Zone | null }): Plan {
  if (o.status === 'injured' || o.status === 'suspended') return { blocked: o.status === 'injured' ? 'اللاعب مصاب: التعافي بإشراف الطاقم الطبي، ما نقترح خطة تدريب.' : 'اللاعب موقوف: التدريب مع الفريق حسب قرار الجهاز الفني.', reduced: false, days: [] }
  const gk = isGoalkeeper(o.pos)
  const skills = skillsFor(o.pos)
  const weak = weakest(o.latest, skills, 2)
  const reduced = o.zone === 'caution' || o.zone === 'danger'
  const todayMs = toDay(o.today ?? new Date()).getTime()
  const matchMs = Date.parse(o.matchDay + 'T00:00:00Z')
  const days = WEEK.map((s): PlanDay => {
    const ms = matchMs + s.offset * DAY
    const picks = s.pick === 'none' ? [] : [...new Set([...(s.pick === 'weak' ? weak.filter((w) => s.skills?.includes(w)) : []), ...(s.skills ?? []).filter((k) => skills.includes(k))])].slice(0, 2)
    const scale = (n: number) => Math.round(n * (reduced ? REDUCE : 1))
    return {
      offset: s.offset, label: s.label, date: iso(ms), name: gk ? s.gkName : s.name, intensity: s.intensity, rpe: reduced ? [Math.max(1, s.rpe[0] - 1), Math.max(1, s.rpe[1] - 1)] : s.rpe,
      dives: gk ? [scale(s.dives[0]), scale(s.dives[1])] : null, minutes: s.minutes,
      blocks: s.blocks, drills: picks.flatMap((k) => drillsFor(k).slice(0, 1)),
      past: ms < todayMs, today: ms === todayMs,
    }
  })
  return { blocked: null, reduced, days }
}

/* Next Saturday on or after `from` (the Bahraini league plays at weekends): a default the coach overrides with the real fixture. */
export function nextSaturday(from = new Date()): string {
  const d = toDay(from)
  return iso(d.getTime() + ((6 - d.getUTCDay() + 7) % 7) * DAY)
}
