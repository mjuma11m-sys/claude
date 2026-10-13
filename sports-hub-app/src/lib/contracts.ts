const DAY = 86_400_000

/* Whole days from `today` to the end date (negative once it has ended). Dates are plain calendar days (YYYY-MM-DD). */
export function daysLeft(endsOn: string, today = new Date()): number {
  const end = Date.parse(endsOn + 'T00:00:00Z')
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((end - now) / DAY)
}

export const SIX_MONTHS = 183

/* Contracts ending within `withinDays`, soonest first. Already-ended ones stay on top: they need a decision more than anything. */
export function expiringSoon<T extends { endsOn: string }>(rows: T[], today = new Date(), withinDays = SIX_MONTHS): T[] {
  return rows.filter((r) => daysLeft(r.endsOn, today) <= withinDays).sort((a, b) => a.endsOn.localeCompare(b.endsOn))
}

export function describeLeft(days: number): string {
  if (days < 0) return 'انتهى'
  if (days === 0) return 'ينتهي اليوم'
  if (days < 31) return `بعد ${days} يوم`
  return `بعد ${Math.round(days / 30.4)} شهر`
}
