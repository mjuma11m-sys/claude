import { DemoNote } from '../components/DemoNote'
import { Gauge } from '../components/Gauge'
import { PageTitle } from '../components/PageTitle'
import { Sparkline } from '../components/Sparkline'
import { SQUAD_LOADS } from '../data/demo'
import { acwr, zone, type Zone } from '../lib/acwr'

const ZONE: Record<Zone, { label: string; cls: string; tone: string; advice: string }> = {
  low: { label: 'حمل منخفض', cls: 'bg-white/10 text-mute', tone: 'var(--color-mute)', advice: 'يقدر يزيد الحمل تدريجياً' },
  safe: { label: 'آمن', cls: 'bg-safe/15 text-safe', tone: 'var(--color-safe)', advice: 'كمّل على البرنامج' },
  caution: { label: 'انتبه', cls: 'bg-warn/15 text-warn', tone: 'var(--color-warn)', advice: 'خفّف الشدة هالأسبوع' },
  danger: { label: 'خطر', cls: 'bg-crimson/20 text-crimson-ink', tone: 'var(--color-crimson-ink)', advice: 'راجع الطبيب قبل المباراة' },
}

export function Medical() {
  const rows = SQUAD_LOADS.map((p) => ({ ...p, ratio: acwr(p.loads) })).sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0))

  return (
    <section className="space-y-5">
      <div>
        <PageTitle>أحمال اللاعبين (ACWR)</PageTitle>
        <p className="text-sm text-mute">حمل آخر 7 أيام ÷ معدل آخر 28 يوم. فوق 1.5 تزيد احتمالية الإصابة. مؤشر يساعد الطبيب، مو تشخيص.</p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {(['danger', 'caution', 'safe', 'low'] as Zone[]).map((k) => {
          const n = rows.filter((r) => r.ratio !== null && zone(r.ratio) === k).length
          return (
            <div key={k} className="glass px-3 py-2 text-center">
              <p className={`font-display text-4xl leading-none ${ZONE[k].cls.split(' ').pop()}`}>{n}</p>
              <p className="text-xs text-mute">{ZONE[k].label}</p>
            </div>
          )
        })}
      </div>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((p) => {
          const z = p.ratio === null ? null : ZONE[zone(p.ratio)]
          return (
            <li key={p.num} className="glass grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-3 p-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-white/5 font-display text-4xl leading-none">{p.num}</span>
              <div className="min-w-0">
                <p className="truncate font-bold">{p.name}</p>
                <p className="text-xs text-mute">{p.pos}</p>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                {z && p.ratio !== null ? <Gauge ratio={p.ratio} zone={zone(p.ratio)} label={`نسبة الحمل ${p.ratio.toFixed(2)}، ${z.label}`} /> : <p className="font-display text-2xl">—</p>}
                {z && <span className={`rounded-full px-2 py-0.5 text-xs ${z.cls}`}>{z.label}</span>}
              </div>
              <div className="col-span-3 flex items-center gap-3 border-t border-white/5 pt-3">
                <Sparkline values={p.loads} tone={z?.tone} label={`حمل ${p.name} آخر 28 يوم`} />
                <p className="text-xs text-mute">{z?.advice ?? 'بيانات أقل من 28 يوم'}</p>
              </div>
            </li>
          )
        })}
      </ul>
      <DemoNote />
    </section>
  )
}
