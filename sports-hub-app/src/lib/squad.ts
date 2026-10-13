export type PlayerStatus = 'fit' | 'doubtful' | 'injured' | 'suspended'

/* Text plus color: color alone fails for colour-blind staff. */
export const STATUS: Record<PlayerStatus, { label: string; cls: string }> = {
  fit: { label: 'جاهز', cls: 'bg-safe/15 text-safe' },
  doubtful: { label: 'مشكوك', cls: 'bg-warn/15 text-warn' },
  injured: { label: 'مصاب', cls: 'bg-crimson/20 text-crimson-ink' },
  suspended: { label: 'موقوف', cls: 'bg-white/10 text-ink' },
}

export function readiness(rows: { status: PlayerStatus }[]) {
  return { fit: rows.filter((r) => r.status === 'fit').length, total: rows.length }
}
