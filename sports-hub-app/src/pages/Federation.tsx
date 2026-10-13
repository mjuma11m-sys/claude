import { useState } from 'react'
import { ClubBadge } from '../components/ClubBadge'
import { DataStamp } from '../components/DataStamp'
import { DemoNote } from '../components/DemoNote'
import { Icon } from '../components/Icon'
import { PageTitle } from '../components/PageTitle'
import { RatioBar, StatusChip } from '../components/RatioBar'
import { StatTile } from '../components/StatTile'
import { Failed, Loading } from '../components/States'
import { DIVISION_LABEL, DIVISIONS, type DivisionId } from '../data/demo'
import { getFederationRoom } from '../data/source'
import { useLoad } from '../data/useLoad'
import { vars } from '../lib/css'
import { byRisk, ffpStatus, wageRatio, type FfpStatus } from '../lib/ffp'
import { fmtDate, fmtMoney } from '../lib/format'

type Filter = 'all' | FfpStatus
type Division = 'all' | DivisionId
const TABS: { key: Filter; label: string }[] = [{ key: 'all', label: 'الكل' }, { key: 'over', label: 'تجاوزوا' }, { key: 'near', label: 'قريبون' }, { key: 'missing', label: 'لم يرفعوا' }]

export function Federation() {
  const load = useLoad(getFederationRoom)
  const [filter, setFilter] = useState<Filter>('all')
  const [division, setDivision] = useState<Division>('all')
  if (load.loading && !load.data) return <Loading variant="table" />
  if (!load.data) return <Failed retry={load.reload} />

  const { data: room, demo } = load.data
  // A club without a recorded division is judged against the Premier limit, and labelled as such.
  const everyone = byRisk(room.rows.map((r) => {
    const ratio = r.revenue === null || r.wages === null ? null : wageRatio(r.wages, r.revenue)
    const limit = room.limits[r.league ?? 'premier']
    return { ...r, ratio, limit, status: ffpStatus(ratio, limit) }
  }))
  const inDivision = (d: Division) => (d === 'all' ? everyone : everyone.filter((r) => r.league === d))
  const all = inDivision(division)
  const count = (s: FfpStatus) => all.filter((r) => r.status === s).length
  const filed = all.length - count('missing')
  const shown = filter === 'all' ? all : all.filter((r) => r.status === filter)

  return (
    <section className="space-y-5 md:space-y-6">
      <PageTitle>غرفة الاتحاد</PageTitle>

      <p className="glass rise flex items-start gap-3 p-4 text-sm" style={vars({ '--i': 1 })}>
        <Icon name="hub" className="mt-0.5 size-5 shrink-0 text-pulse" />
        <span>تشوف هنا تقارير الموسم اللي ترفعها الأندية بنفسها. <b>رواتب اللاعبين وحالاتهم الصحية ما توصل الاتحاد أبداً</b>، هذا مفروض بقاعدة البيانات مو بالواجهة.</span>
      </p>

      <div className="rise grid grid-cols-2 gap-2 md:grid-cols-4" style={vars({ '--i': 2 })}>
        <StatTile label="أندية رفعت التقرير" value={`${filed}/${all.length}`} tone="text-safe" />
        <StatTile label="تجاوزوا الحد" value={count('over')} tone={count('over') ? 'text-crimson-ink' : 'text-safe'} />
        <StatTile label="قريبون من الحد" value={count('near')} tone={count('near') ? 'text-warn' : 'text-safe'} />
        <StatTile label="حد الأجور (تجريبي)" value={division === 'all' ? `${Math.round(room.limits.premier * 100)}% · ${Math.round(room.limits.second * 100)}%` : `${Math.round(room.limits[division] * 100)}%`} hint={division === 'all' ? 'الممتاز · الثانية' : 'من الإيرادات'} />
      </div>

      <article className="glass rise p-3 md:p-5" style={vars({ '--i': 3 })}>
        <div role="tablist" aria-label="الدرجة" className="mb-3 flex flex-wrap gap-1 rounded-2xl border border-white/10 p-1">
          {(['all', ...DIVISIONS] as const).map((d) => (
            <button key={d} role="tab" aria-selected={division === d} onClick={() => setDivision(d)} className={`min-h-11 flex-1 rounded-xl px-3 text-sm transition-colors ${division === d ? 'bg-pulse/15 text-pulse' : 'text-mute hover:text-ink'}`}>
              {d === 'all' ? 'الدرجتين' : DIVISION_LABEL[d]} <span className="num text-xs">{inDivision(d).length}</span>
            </button>
          ))}
        </div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
          <h2 className="font-display text-2xl">امتثال الأندية <span className="num text-lg text-mute">· {room.season}</span></h2>
          <div role="tablist" aria-label="تصفية الأندية" className="flex flex-wrap gap-1 rounded-2xl border border-white/10 p-1">
            {TABS.map((t) => (
              <button key={t.key} role="tab" aria-selected={filter === t.key} onClick={() => setFilter(t.key)} className={`min-h-11 rounded-xl px-3 text-sm transition-colors ${filter === t.key ? 'bg-pulse/15 text-pulse' : 'text-mute hover:text-ink'}`}>
                {t.label} <span className="num text-xs">{t.key === 'all' ? all.length : count(t.key)}</span>
              </button>
            ))}
          </div>
        </div>
        {shown.length === 0 ? <p className="p-4 text-sm text-mute">ما فيه أندية بهالتصنيف.</p> : (
          <ul className="divide-y divide-white/10">
            {shown.map((r, i) => (
              <li key={r.club} className="row-in grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 px-1 py-3" style={vars({ '--i': Math.min(i, 12) })}>
                <ClubBadge name={r.club} size="md" />
                <span className="min-w-0"><span className="block truncate font-bold">{r.club}</span>
                  <span className="block text-xs text-mute">{division === 'all' && <>{r.league ? DIVISION_LABEL[r.league] : 'درجة غير محددة'} · </>}{r.submittedAt ? <>رفع <span className="num">{fmtDate(r.submittedAt)}</span></> : 'ما رفع تقرير الموسم'}</span></span>
                <span className="flex flex-col items-end gap-1"><span className="font-display text-2xl leading-none">{r.ratio === null ? '—' : `${Math.round(r.ratio * 100)}%`}</span><StatusChip status={r.status} /></span>
                <span className="col-span-3 grid gap-1">
                  <RatioBar ratio={r.ratio} limit={r.limit} status={r.status} />
                  {r.revenue !== null && r.wages !== null && <span className="num flex justify-between text-xs text-mute"><span>إيرادات {fmtMoney(r.revenue)}</span><span>أجور {fmtMoney(r.wages)}</span></span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="glass rise space-y-3 p-4 md:p-5" style={vars({ '--i': 4 })}>
        <h2 className="font-display text-2xl">جداول الدوري</h2>
        <ul className="divide-y divide-white/10">
          {room.leagues.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className="font-bold">{l.name}</span>
              {l.updatedAt ? <DataStamp updatedAt={l.updatedAt} source={l.source} /> : <span className="rounded-full bg-warn/15 px-2.5 py-0.5 text-xs text-warn">جدول تجريبي</span>}
            </li>
          ))}
        </ul>
        <p className="text-xs text-mute">لرفع جدول حقيقي من ملف CSV: <bdi dir="ltr">npm run import:standings</bdi> (التفاصيل بملف README). التطبيق يرفض أي جدول أرقامه ما تقفل.</p>
      </article>
      {demo && <DemoNote text="* أندية وأرقام مالية خيالية للعرض، مو بيانات حقيقية. ما فيه أي ربط بالاتحاد الفعلي." />}
    </section>
  )
}
