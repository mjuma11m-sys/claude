import { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { DemoNote } from '../components/DemoNote'
import { PageTitle } from '../components/PageTitle'
import { StatTile } from '../components/StatTile'
import { Failed, Loading } from '../components/States'
import { getAttendance } from '../data/attendance'
import { getReports } from '../data/analysis'
import { getRights } from '../data/rights'
import { getClubRoom } from '../data/source'
import { useLoad } from '../data/useLoad'
import { vars } from '../lib/css'
import { monthReport } from '../lib/report'
import { lastMonths } from '../lib/rights'

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const label = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`

export function Report() {
  const { user } = useAuth()
  const load = useLoad(async () => {
    const [room, sessions, reports, rights] = await Promise.all([getClubRoom(user!.id), getAttendance(user!.id), getReports(user!.id), getRights(user!.id)])
    return { room, sessions, reports, rights }
  }, [user?.id])
  const months = useMemo(() => lastMonths(6), [])
  const [month, setMonth] = useState(months[0])
  const r = useMemo(() => load.data && monthReport({ month, sessions: load.data.sessions, playerIds: load.data.room.data.squad.map((p) => p.id), matches: load.data.reports, squad: load.data.room.data.squad, requests: load.data.rights.requests }), [load.data, month])

  if (load.error instanceof Error && load.error.message === 'no-club') return <section className="space-y-4"><PageTitle>التقرير الشهري</PageTitle><p className="glass p-5 text-mute">حسابك ما هو مربوط بنادي بعد.</p></section>
  if (load.loading && !load.data) return <Loading variant="home" />
  if (!load.data || !r) return <Failed retry={load.reload} />
  const { room } = load.data

  return (
    <section className="report space-y-5 md:space-y-6">
      <PageTitle>التقرير الشهري</PageTitle>
      <div className="no-print flex flex-wrap items-end gap-3">
        <label className="block space-y-1"><span className="text-xs text-mute">الشهر</span>
          <select id="rpMonth" value={month} onChange={(e) => setMonth(e.target.value)} className="min-h-11 rounded-xl border border-white/15 bg-white/5 px-3">{months.map((m) => <option key={m} value={m}>{label(m)}</option>)}</select></label>
        <button type="button" onClick={() => window.print()} className="min-h-11 rounded-xl bg-pulse px-5 text-sm font-bold text-pulse-ink">اطبع أو احفظ PDF</button>
      </div>
      <p className="report-head text-lg font-bold"><span>{room.data.clubName}</span> · <span>{label(month)}</span></p>
      <p className="no-print glass rise p-4 text-sm" style={vars({ '--i': 1 })}>أرقام الفريق فقط: بدون أسماء لاعبين وبدون رواتب، عشان تنفع تنعرض على مجلس النادي. تفاصيل كل لاعب بملفه.</p>

      <h2 className="font-display text-2xl">التدريب والحضور</h2>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4" data-rep="attendance">
        <StatTile label="تمارين" value={r.trainings} />
        <StatTile label="جلسات مباراة" value={r.matchSessions} />
        <StatTile label="نسبة الحضور" value={r.attendanceRate === null ? '—' : `${Math.round(r.attendanceRate * 100)}%`} hint="الغياب بعذر ما يحسب" />
        <StatTile label="لاعبون بغياب متكرر" value={r.repeatAbsent} tone={r.repeatAbsent ? 'text-crimson-ink' : ''} />
      </div>

      <h2 className="font-display text-2xl">المباريات (من تقارير النادي)</h2>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4" data-rep="matches">
        <StatTile label="مباريات" value={r.matches} />
        <StatTile label="فوز · تعادل · خسارة" value={`${r.wins}·${r.draws}·${r.losses}`} />
        <StatTile label="أهداف لنا · علينا" value={`${r.goalsFor}·${r.goalsAgainst}`} />
        <StatTile label="تسديدات (على المرمى)" value={`${r.shots} (${r.onTarget})`} />
      </div>

      <h2 className="font-display text-2xl">العقود والطلبات (حتى اليوم)</h2>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3" data-rep="admin">
        <StatTile label="عقود تنتهي خلال 90 يوم" value={r.contractsEnding} tone={r.contractsEnding ? 'text-warn' : ''} />
        <StatTile label="طلبات لاعبين مفتوحة" value={r.openRequests} />
        <StatTile label="منها تعدّت المهلة الداخلية" value={r.lateRequests} tone={r.lateRequests ? 'text-crimson-ink' : ''} />
      </div>
      <p className="text-xs text-mute">كل رقم محسوب مما سجّله النادي بالتطبيق بنفس تعريفات الشاشات. لا يعكس إلا اللي انسجل.</p>
      {room.demo && <DemoNote text="* أرقام خيالية للعرض، مو بيانات حقيقية." />}
    </section>
  )
}
