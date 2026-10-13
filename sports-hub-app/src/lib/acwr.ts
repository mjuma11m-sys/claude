/* Acute:Chronic Workload Ratio (rolling averages, Gabbett 2016).
   loads = daily session load (sRPE × minutes), oldest first, at least 28 days. */
export type Zone = 'low' | 'safe' | 'caution' | 'danger'

export function acwr(loads: number[]): number | null {
  if (loads.length < 28) return null
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
  const acute = avg(loads.slice(-7))
  const chronic = avg(loads.slice(-28))
  if (chronic === 0) return null
  return Math.round((acute / chronic) * 100) / 100
}

export function zone(ratio: number): Zone {
  if (ratio < 0.8) return 'low'
  if (ratio <= 1.3) return 'safe'
  if (ratio <= 1.5) return 'caution'
  return 'danger'
}
