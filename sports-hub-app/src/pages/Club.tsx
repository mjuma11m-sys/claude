import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { ClubBadge } from '../components/ClubBadge'
import { DemoNote } from '../components/DemoNote'
import { PageTitle } from '../components/PageTitle'
import { RatioBar, StatusChip } from '../components/RatioBar'
import { Ring } from '../components/Ring'
import { StatTile } from '../components/StatTile'
import { TodayStrip } from '../components/TodayStrip'
import { Failed, Loading } from '../components/States'
import { getClubRoom, submitFinance, type SquadRow } from '../data/source'
import { useLoad } from '../data/useLoad'
import { daysLeft, describeLeft, expiringSoon } from '../lib/contracts'
import { vars } from '../lib/css'
import { ffpStatus, wageRatio } from '../lib/ffp'
import { fmtDate, fmtDateTime, fmtMoney } from '../lib/format'
import { readiness, STATUS } from '../lib/squad'
import { clubToday } from '../lib/today'
import { getAttendance } from '../data/attendance'
import { attendanceStats } from '../lib/attendance'
import { DIVISION_LABEL } from '../data/demo'

type SortKey = 'num' | 'end' | 'wage'
const SORTS: { key: SortKey; label: string }[] = [{ key: 'num', label: 'رقم القميص' }, { key: 'end', label: 'نهاية العقد' }, { key: 'wage', label: 'الراتب' }]
const sorters: Record<SortKey, (a: SquadRow, b: SquadRow) => number> = {
  num: (a, b) => (a.num ?? 99) - (b.num ?? 99),
  end: (a, b) => a.endsOn.localeCompare(b.endsOn),
  wage: (a, b) => b.wage - a.wage,
}

function ReportForm({ userId, season, current, onDone }: { userId: string; season: string; current: { revenue: number; wages: number } | null; onDone: () => void }) {
  const [revenue, setRevenue] = useState(current ? String(current.revenue) : '')
  const [wages, setWages] = useState(current ? String(current.wages) : '')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function check(e: FormEvent) {
    e.preventDefault()
    const r = Number(revenue), w = Number(wages)
    if (!(r > 0)) return setError('اكتب إيرادات الموسم بالدينار (رقم أكبر من صفر)')
    if (!(w >= 0)) return setError('اكتب إجمالي الأجور بالدينار (صفر أو أكثر)')
    setError(null)
    setConfirming(true)
  }
  async function send() {
    setBusy(true)
    try { await submitFinance(userId, season, Number(revenue), Number(wages)); setConfirming(false); onDone() }
    catch { setError('ما انرفع التقرير. تأكد من الاتصال وحاول مرة ثانية') }
    finally { setBusy(false) }
  }

  const field = 'min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-start'
  return (
    <form onSubmit={check} className="space-y-3 border-t border-white/10 pt-4">
      <p className="text-sm font-bold">{current ? 'عدّل تقرير الموسم' : 'ارفع تقرير الموسم للاتحاد'}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1"><span className="text-xs text-mute">إيرادات الموسم (د.ب)</span>
          <input id="revenue" dir="ltr" inputMode="decimal" value={revenue} onChange={(e) => setRevenue(e.target.value)} className={field} /></label>
        <label className="block space-y-1"><span className="text-xs text-mute">إجمالي الأجور (د.ب)</span>
          <input id="wages" dir="ltr" inputMode="decimal" value={wages} onChange={(e) => setWages(e.target.value)} className={field} /></label>
      </div>
      {error && <p role="alert" className="text-sm text-crimson-ink">{error}</p>}
      {confirming ? (
        <div className="space-y-3 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm">
          <p>الاتحاد بيشوف هالرقمين <b>بس</b> (الإيرادات وإجمالي الأجور). ما يشوف رواتب اللاعبين ولا حالاتهم الصحية. رفع التقرير = موافقتك على هذا.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={send} disabled={busy} className="min-h-11 rounded-xl bg-pulse px-5 font-bold text-pulse-ink disabled:opacity-60">أكّد الرفع</button>
            <button type="button" onClick={() => setConfirming(false)} className="min-h-11 rounded-xl border border-white/15 px-5">رجوع</button>
          </div>
        </div>
      ) : (
        <button className="min-h-11 rounded-xl bg-pulse px-5 text-sm font-bold text-pulse-ink">{current ? 'راجع وارفع التعديل' : 'راجع وارفع'}</button>
      )}
    </form>
  )
}

export function Club() {
  const { user } = useAuth()
  const load = useLoad(() => getClubRoom(user!.id), [user?.id])
  const att = useLoad(() => getAttendance(user!.id).catch(() => []), [user?.id])
  const [sort, setSort] = useState<SortKey>('num')

  if (load.loading && !load.data) return <Loading variant="home" />
  if (load.error instanceof Error && load.error.message === 'no-club') {
    return (
      <section className="space-y-4">
        <PageTitle>غرفة النادي</PageTitle>
        <p className="glass p-5 text-mute">حسابك ما هو مربوط بنادي بعد. الربط يسويه مسؤول المنصة (حقل <bdi dir="ltr">club_id</bdi> بملفك).</p>
      </section>
    )
  }
  if (!load.data) return <Failed retry={load.reload} />

  const { data: room, demo } = load.data
  const today = new Date()
  const squad = room.squad
  const ready = readiness(squad)
  const expiring = expiringSoon(squad, today)
  const ratio = room.finance ? wageRatio(room.finance.wages, room.finance.revenue) : null
  const status = ffpStatus(ratio, room.limit)
  const pct = ratio === null ? '—' : `${Math.round(ratio * 100)}%`
  const tone = { within: 'text-safe', near: 'text-warn', over: 'text-crimson-ink', missing: 'text-mute' }[status]
  const rows = [...squad].sort(sorters[sort])

  return (
    <section className="space-y-5 md:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle>غرفة النادي</PageTitle>
        <span className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-2 rounded-full bg-white/5 py-1 pe-3 ps-1"><ClubBadge name={room.clubName} size="sm" /> <span className="text-sm">{room.clubName}</span></span>
          <span className="rounded-full bg-pulse/15 px-3 py-1 text-xs text-pulse">{room.league ? DIVISION_LABEL[room.league] : 'الدرجة غير محددة'}</span>
          <Link to="/standings" className="grid min-h-11 place-items-center rounded-full px-3 text-xs text-mute underline underline-offset-4 hover:text-ink">ترتيب الدوري</Link>
        </span>
      </div>

      <TodayStrip items={clubToday({ squad, ratio, limit: room.limit, imported: room.imported, repeatAbsent: attendanceStats(att.data ?? [], room.squad.map((p) => p.id)).filter((s) => s.repeated).length, today })} />

      <div className="rise grid grid-cols-2 gap-2 md:grid-cols-4" style={vars({ '--i': 2 })}>
        <div className="glass lift flex h-full items-center justify-center gap-2 px-2 py-3">
          <Ring value={ready.fit} total={ready.total} tone="text-safe" size="size-16" text="text-lg" label={`جاهزين ${ready.fit} من ${ready.total}`} />
          <p className="text-start text-xs text-mute"><span className="sr-only">{ready.fit}/{ready.total}</span>جاهزين من الفريق</p>
        </div>
        <StatTile label="عقود تنتهي خلال 6 أشهر" value={expiring.length} tone={expiring.length ? 'text-warn' : 'text-safe'} />
        <Link to="/medical" className="block rounded-2xl transition hover:ring-1 hover:ring-white/25" aria-label={`أحمال تحتاج انتباه: ${room.loadAlerts ?? 'افتح الأحمال'}`}>
          <StatTile label="أحمال تحتاج انتباه ←" value={room.loadAlerts ?? '—'} tone={room.loadAlerts ? 'text-warn' : 'text-mute'} />
        </Link>
        <StatTile label="الأجور من الإيرادات" value={pct} tone={tone} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <article id="report" className="glass rise scroll-mt-20 space-y-4 p-4 md:p-5 lg:col-span-3" style={vars({ '--i': 3 })}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl">تقرير الموسم للاتحاد</h2>
              <p className="text-xs text-mute">موسم <span className="num">{room.finance?.season ?? '—'}</span> · حد {room.league ? DIVISION_LABEL[room.league] : 'الممتاز'} <bdi dir="ltr" className="num">{Math.round(room.limit * 100)}%</bdi> (قيمة تجريبية)</p>
            </div>
            <StatusChip status={status} />
          </div>
          <RatioBar ratio={ratio} limit={room.limit} status={status} />
          {room.finance ? (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-mute">الإيرادات</dt><dd className="num font-bold">{fmtMoney(room.finance.revenue)}</dd></div>
              <div><dt className="text-xs text-mute">إجمالي الأجور</dt><dd className="num font-bold">{fmtMoney(room.finance.wages)}</dd></div>
            </dl>
          ) : (
            <p className="text-sm text-mute">ما رفعت تقرير هالموسم للحين. الاتحاد ما يشوف شي من أرقامك قبل ما ترفعه.</p>
          )}
          {room.finance && <p className="text-xs text-mute">انرفع للاتحاد: <span className="num">{fmtDateTime(room.finance.submittedAt)}</span></p>}
          <ReportForm userId={user!.id} season={room.finance?.season ?? '2026/27'} current={room.finance} onDone={load.reload} />
        </article>

        <article id="contracts" className="glass rise scroll-mt-20 p-4 md:p-5 lg:col-span-2" style={vars({ '--i': 4 })}>
          <h2 className="mb-3 font-display text-2xl">عقود تنتهي قريباً</h2>
          {expiring.length === 0 ? <p className="text-sm text-mute">ما فيه عقود تنتهي خلال 6 أشهر.</p> : (
            <ul className="divide-y divide-white/10">
              {expiring.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/5 font-display text-2xl leading-none">{p.num ?? '—'}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-bold">{p.name}</span><span className="block text-xs text-mute">{p.pos}</span></span>
                  <span className="text-end text-sm"><span className={`block font-bold ${daysLeft(p.endsOn, today) <= 60 ? 'text-crimson-ink' : 'text-warn'}`}>{describeLeft(daysLeft(p.endsOn, today))}</span><span className="num block text-xs text-mute">{fmtDate(p.endsOn)}</span></span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>

      <article id="squad" className="glass rise scroll-mt-20 p-4 md:p-5" style={vars({ '--i': 5 })}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl">الفريق <span className="num text-lg text-mute">({squad.length})</span></h2>
          <div role="group" aria-label="ترتيب الفريق حسب" className="flex gap-1 rounded-2xl border border-white/10 p-1">
            {SORTS.map((s) => (
              <button key={s.key} aria-pressed={sort === s.key} onClick={() => setSort(s.key)} className={`min-h-11 rounded-xl px-3 text-sm transition-colors ${sort === s.key ? 'bg-pulse/15 text-pulse' : 'text-mute hover:text-ink'}`}>{s.label}</button>
            ))}
          </div>
        </div>
        {rows.length === 0 && <p className="py-4 text-sm text-mute">ما فيه لاعبين مسجّلين بناديك للحين. استوردهم من <Link to="/data" className="underline underline-offset-4">مركز البيانات</Link>.</p>}
        <ul className="divide-y divide-white/10">
          {rows.map((p) => (
            <li key={p.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-0.5 py-2.5">
              <span className="row-span-2 grid size-11 place-items-center rounded-xl bg-white/5 font-display text-2xl leading-none">{p.num ?? '—'}</span>
              <span className="truncate font-bold">{p.name} <span className="text-xs font-normal text-mute">· {p.pos}</span></span>
              <span className={`justify-self-end whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs ${STATUS[p.status].cls}`}>{STATUS[p.status].label}</span>
              <span className="col-span-2 flex flex-wrap items-center justify-between gap-x-4 text-xs text-mute">
                <span>{p.note ?? <>عقد حتى <span className="num">{fmtDate(p.endsOn)}</span></>}</span>
                <span className="num">{fmtMoney(p.wage)} / شهر</span>
              </span>
            </li>
          ))}
        </ul>
      </article>
      {demo && <DemoNote text="* نادٍ ولاعبون وأرقام مالية خيالية للعرض، مو بيانات حقيقية" />}
    </section>
  )
}
