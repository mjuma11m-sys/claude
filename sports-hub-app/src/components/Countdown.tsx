import { useEffect, useState } from 'react'

export function useNow(everyMs = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(t)
  }, [everyMs])
  return now
}

export function parts(ms: number) {
  const m = Math.max(0, Math.floor(ms / 60_000))
  return { d: Math.floor(m / 1440), h: Math.floor((m % 1440) / 60), m: m % 60 }
}

export function Countdown({ to, started = 'بدأت المباراة' }: { to: string; started?: string }) {
  const now = useNow()
  const left = new Date(to).getTime() - now
  if (left <= 0) return <p className="text-sm font-bold text-pulse">{started}</p>
  const { d, h, m } = parts(left)
  const cell = (v: number, label: string) => (
    <div className="min-w-14 rounded-xl bg-white/5 px-3 py-2 text-center">
      <p className="num text-2xl font-bold leading-none">{String(v).padStart(2, '0')}</p>
      <p className="mt-1 text-[11px] text-mute">{label}</p>
    </div>
  )
  return (
    <div role="timer" aria-label={`باقي ${d} يوم و${h} ساعة و${m} دقيقة`} className="flex justify-center gap-2" dir="rtl">
      {cell(d, 'يوم')}{cell(h, 'ساعة')}{cell(m, 'دقيقة')}
    </div>
  )
}
