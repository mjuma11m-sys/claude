import { Link, useParams } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { DemoNote } from '../components/DemoNote'
import { Gauge } from '../components/Gauge'
import { PageTitle } from '../components/PageTitle'
import { Failed, Loading } from '../components/States'
import { getAttendance } from '../data/attendance'
import { getDevelopment } from '../data/development'
import { getReports } from '../data/analysis'
import { getClubRoom } from '../data/source'
import { useLoad } from '../data/useLoad'
import { vars } from '../lib/css'
import { KIND_TEXT as ATT_KIND, MIN_SESSIONS, STATUS_TEXT } from '../lib/attendance'
import { describeLeft } from '../lib/contracts'
import { SCORE_LABEL, SKILL_LABEL, skillsFor, trendOf } from '../lib/development'
import { fmtDate } from '../lib/format'
import { playerFile } from '../lib/playerfile'
import { STATUS } from '../lib/squad'

const ZONE_TEXT = { low: 'حمل منخفض', safe: 'آمن', caution: 'انتبه: خفّف الشدة', danger: 'خطر: راجع الطبيب' } as const
const TONE = { present: 'border-safe bg-safe/20 text-safe', late: 'border-warn bg-warn/20 text-warn', excused: 'border-pulse bg-pulse/15 text-pulse', absent: 'border-crimson-ink bg-crimson/20 text-crimson-ink' } as const
const TREND = { up: '↑ تحسّن', down: '↓ نزول', flat: '' } as const

export function Player() {
  const { id } = useParams()
  const { user } = useAuth()
  const load = useLoad(async () => {
    const [room, dev, sessions, reports] = await Promise.all([getClubRoom(user!.id), getDevelopment(user!.id), getAttendance(user!.id), getReports(user!.id)])
    return { room, dev, sessions, reports }
  }, [user?.id])

  if (load.error instanceof Error && load.error.message === 'no-club') return <section className="space-y-4"><PageTitle>ملف اللاعب</PageTitle><p className="glass p-5 text-mute">حسابك ما هو مربوط بنادي بعد.</p></section>
  if (load.loading && !load.data) return <Loading variant="home" />
  if (!load.data) return <Failed retry={load.reload} />
  const { room, dev, sessions, reports } = load.data
  const p = room.data.squad.find((x) => x.id === id)
  if (!p) return <section className="space-y-4"><PageTitle>ملف اللاعب</PageTitle><p role="alert" className="glass p-5 text-mute">ما لقينا هذا اللاعب بناديك (يمكن انحذف بعد سحب موافقته). <Link to="/club" className="text-pulse underline">ارجع لغرفة النادي</Link></p></section>

  const f = playerFile({ id: p.id, pos: p.pos, endsOn: p.endsOn, sessions, assessments: dev.data.assessments[p.id] ?? [], goals: dev.data.goals[p.id] ?? [], logs: dev.data.logs[p.id] ?? [], reports })
  const a = f.attendance
  const skills = skillsFor(p.pos).filter((k) => f.latest[k])

  return (
    <section className="space-y-5 md:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle>{p.name}</PageTitle>
        <Link to="/club" className="grid min-h-11 place-items-center rounded-full px-3 text-sm text-mute underline underline-offset-4 hover:text-ink">غرفة النادي</Link>
      </div>
      <p className="glass rise flex flex-wrap items-center gap-3 p-4 text-sm" style={vars({ '--i': 1 })}>
        <span className="grid size-11 place-items-center rounded-xl bg-white/5 font-display text-2xl leading-none">{p.num ?? '—'}</span>
        <span className="font-bold">{p.pos}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs ${STATUS[p.status].cls}`}>{STATUS[p.status].label}</span>
        <span className="text-mute">عقد حتى <span className="num">{fmtDate(p.endsOn)}</span> ({describeLeft(f.contractDays)})</span>
      </p>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <article className="glass rise space-y-3 p-4 md:p-5" style={vars({ '--i': 2 })}>
          <h2 className="font-display text-2xl">الحضور (آخر 30 يوم)</h2>
          {a.rate === null ? <p className="text-sm text-mute" data-att>بيانات قليلة (تحتاج {MIN_SESSIONS} جلسات محسوبة).</p>
            : <p className="text-sm" data-att>نسبة الحضور <bdi dir="ltr" className="font-display text-2xl"><span className="num">{Math.round(a.rate * 100)}%</span></bdi> · حضر <span className="num">{a.present}</span> · تأخر <span className="num">{a.late}</span> · غاب <span className="num">{a.absent}</span> · بعذر <span className="num">{a.excused}</span></p>}
          {a.repeated && <p role="status" className="rounded-xl border border-crimson-ink/60 bg-crimson/10 p-2 text-sm">غياب متكرر: <span className="num">{a.streak}</span> بلا عذر متتالية. للمتابعة، مو عقاب.</p>}
          {f.recent.length > 0 && <ul className="flex flex-wrap gap-1.5" aria-label="آخر الجلسات" data-recent>{f.recent.map((r, i) => <li key={i} className={`rounded-full border px-2.5 py-1 text-xs ${TONE[r.status]}`}>{ATT_KIND[r.kind]} <span className="num">{fmtDate(r.day)}</span> · {STATUS_TEXT[r.status]}</li>)}</ul>}
        </article>

        <article className="glass rise space-y-3 p-4 md:p-5" style={vars({ '--i': 3 })}>
          <h2 className="font-display text-2xl">الحمل</h2>
          {f.load.ratio === null || f.load.zone === null ? <p className="text-sm text-mute">ما فيه جلسات كافية لحساب الحمل (تحتاج سجل 28 يوم).</p>
            : <div className="flex items-center gap-3" data-load><Gauge ratio={f.load.ratio} zone={f.load.zone} label={`مؤشر الحمل ${f.load.ratio}: ${ZONE_TEXT[f.load.zone]}`} /><p className="text-sm"><b>{ZONE_TEXT[f.load.zone]}</b><span className="block text-xs text-mute">يساعد الطبيب، مو تشخيص</span></p></div>}
        </article>

        <article className="glass rise space-y-3 p-4 md:p-5" style={vars({ '--i': 4 })}>
          <h2 className="font-display text-2xl">التطوير (رأي المدرب)</h2>
          {skills.length === 0 ? <p className="text-sm text-mute">ما فيه تقييمات بعد.</p> : (
            <>
              {f.average !== null && <p className="text-sm" data-avg>متوسط آخر تقييمات: <b className="num">{f.average.toFixed(1)}</b> من 5</p>}
              <ul className="divide-y divide-white/10" data-skills>{skills.map((k) => { const s = f.latest[k]!; const t = trendOf(s.score, s.prev); return <li key={k} className="flex items-center justify-between gap-2 py-1.5 text-sm"><span>{SKILL_LABEL[k]}</span><span><b className="num">{s.score}</b> {SCORE_LABEL[s.score]} <span className="text-xs text-safe">{TREND[t]}</span></span></li> })}</ul>
            </>)}
          <p className="text-xs text-mute">تقييم المدرب رأي مو قياس. أهداف مفتوحة: <span className="num">{f.goalsOpen.length}</span> · محققة: <span className="num">{f.goalsDone}</span>.</p>
        </article>

        <article className="glass rise space-y-2 p-4 md:p-5" style={vars({ '--i': 5 })}>
          <h2 className="font-display text-2xl">بتقارير المباريات</h2>
          {f.match.appearances === 0 ? <p className="text-sm text-mute" data-match>ما فيه أحداث مسجلة باسمه.</p>
            : <p className="text-sm" data-match>أحداث باسمه بـ <b className="num">{f.match.appearances}</b> مباراة · أهداف <b className="num">{f.match.goals}</b> · تسديدات <b className="num">{f.match.shots}</b> (على المرمى <span className="num">{f.match.onTarget}</span>) · صفراء <span className="num">{f.match.yellow}</span> · حمراء <span className="num">{f.match.red}</span></p>}
          <p className="text-xs text-mute">عدّ للأحداث اللي أدخلها النادي، مو تقييم أداء.</p>
        </article>
      </div>
      {(room.demo || dev.demo) && <DemoNote text="* لاعب وأرقام خيالية للعرض، مو بيانات حقيقية." />}
    </section>
  )
}
