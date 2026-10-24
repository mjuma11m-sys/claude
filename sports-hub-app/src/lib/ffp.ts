/* Wage-to-revenue check. The limit is a rule the federation sets (public.rules); the app ships a DEMO value, not an official one. */
export type FfpStatus = 'within' | 'near' | 'over' | 'missing'
export const NEAR_MARGIN = 0.05 // within 5 points under the limit counts as "near"

export function wageRatio(wages: number, revenue: number): number {
  if (revenue <= 0) return wages > 0 ? Infinity : 0
  return wages / revenue
}

export function ffpStatus(ratio: number | null, limit: number): FfpStatus {
  if (ratio === null) return 'missing' // the club has not filed a report
  if (ratio > limit) return 'over'
  if (ratio >= limit - NEAR_MARGIN) return 'near'
  return 'within'
}

export const FFP_LABEL: Record<FfpStatus, string> = { within: 'ضمن الحد', near: 'قريب من الحد', over: 'تجاوز الحد', missing: 'لم يرفع التقرير' }

/* Worst first, so the federation reads the problems at the top; clubs that have not filed go last.
   "Worst" is how far past (or how close to) the club's OWN limit it is: divisions have different limits, so raw ratios do not compare. */
export function byRisk<T extends { ratio: number | null; limit?: number }>(rows: T[]): T[] {
  const margin = (r: T) => (r.ratio === null ? -Infinity : r.ratio - (r.limit ?? 0))
  return [...rows].sort((a, b) => margin(b) - margin(a))
}
