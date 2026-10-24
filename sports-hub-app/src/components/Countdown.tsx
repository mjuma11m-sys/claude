import { useEffect, useState } from 'react'

export function useNow(everyMs = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(t)
  }, [everyMs])
  return now
}

function parts(ms: number) {
  const m = Math.max(0, Math.floor(ms / 60_000))
  return { d: Math.floor(m / 1440), h: Math.floor((m % 1440) / 60), m: m % 60 }
}

/* One scoreboard cell. `key={value}` remounts the number when it changes, so only the changed cell flips. */
function Digit({ value, label }: { value: number; label: string }) {
  return (
    <div className="digit">
      <p key={value} className="tick font-display text-4xl leading-none md:text-5xl">{String(value).padStart(2, '0')}</p>
      <p className="mt-1.5 text-[11px] text-mute">{label}</p>
    </div>
  )
}

export function Countdown({ to, started = 'بدأت المباراة' }: { to: string; started?: string }) {
  const now = useNow()
  const left = new Date(to).getTime() - now
  if (left <= 0) return <p className="font-display text-2xl text-pulse">{started}</p>
  const { d, h, m } = parts(left)
  return (
    <div role="timer" aria-label={`باقي ${d} يوم و${h} ساعة و${m} دقيقة`} className="flex justify-center gap-2.5" dir="rtl">
      <Digit value={d} label="يوم" />
      <Digit value={h} label="ساعة" />
      <Digit value={m} label="دقيقة" />
    </div>
  )
}
