import { DemoNote } from '../components/DemoNote'
import { SQUAD_LOADS } from '../data/demo'
import { acwr, zone, type Zone } from '../lib/acwr'

const ZONE: Record<Zone, { label: string; cls: string; advice: string }> = {
  low: { label: 'حمل منخفض', cls: 'bg-white/10 text-mute', advice: 'يقدر يزيد الحمل تدريجياً' },
  safe: { label: 'آمن', cls: 'bg-safe/15 text-safe', advice: 'كمّل على البرنامج' },
  caution: { label: 'انتبه', cls: 'bg-warn/15 text-warn', advice: 'خفّف الشدة هالأسبوع' },
  danger: { label: 'خطر', cls: 'bg-crimson/20 text-crimson-ink', advice: 'راجع الطبيب قبل المباراة' },
}

export function Medical() {
  const rows = SQUAD_LOADS.map((p) => ({ ...p, ratio: acwr(p.loads) })).sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0))

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">أحمال اللاعبين (ACWR)</h1>
        <p className="text-sm text-mute">حمل آخر 7 أيام ÷ معدل آخر 28 يوم. فوق 1.5 تزيد احتمالية الإصابة. مؤشر يساعد الطبيب، مو تشخيص.</p>
      </div>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((p) => {
          const z = p.ratio === null ? null : ZONE[zone(p.ratio)]
          return (
            <li key={p.num} className="glass flex items-center gap-4 p-4">
              <span className="num grid size-11 shrink-0 place-items-center rounded-xl bg-white/5 font-bold">{p.num}</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{p.name} <span className="text-xs font-normal text-mute">· {p.pos}</span></p>
                <p className="text-xs text-mute">{z?.advice ?? 'بيانات أقل من 28 يوم'}</p>
              </div>
              <div className="text-end">
                <p className="num text-2xl font-bold">{p.ratio?.toFixed(2) ?? '—'}</p>
                {z && <span className={`rounded-full px-2 py-0.5 text-xs ${z.cls}`}>{z.label}</span>}
              </div>
            </li>
          )
        })}
      </ul>
      <DemoNote />
    </section>
  )
}
