import { Link } from 'react-router'
import { DemoNote } from '../components/DemoNote'
import { StandingsTable } from '../components/StandingsTable'
import { LEAGUES, MY_CLUB, NEXT_MATCH } from '../data/demo'
import { fmtDateTime } from '../lib/format'
import { rank } from '../lib/standings'

export function Home() {
  const table = rank([...LEAGUES[0].rows])
  const me = table.findIndex((r) => r.team === MY_CLUB)
  const window = table.slice(Math.max(0, me - 2), me + 3)

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold md:text-3xl">ملعبك اليوم</h1>

      <div className="grid gap-4 lg:grid-cols-5">
        <article className="glass relative flex flex-col justify-center overflow-hidden p-5 lg:col-span-3">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-pulse via-pulse/40 to-crimson" />
          <p className="text-sm text-mute">المباراة الجاية</p>
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
            <p className="text-xl font-bold text-gold md:text-2xl">{NEXT_MATCH.home}</p>
            <p className="num rounded-lg bg-white/5 px-3 py-1 text-sm text-mute">VS</p>
            <p className="text-xl font-bold md:text-2xl">{NEXT_MATCH.away}</p>
          </div>
          <p className="mt-4 text-center text-sm text-mute">
            {NEXT_MATCH.venue} · <span className="num">{fmtDateTime(NEXT_MATCH.kickoff)}</span>
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link to="/vote" className="rounded-xl bg-pulse px-4 py-2 text-sm font-bold text-pulse-ink">صوّت لرجل المباراة</Link>
            <Link to="/pass" className="rounded-xl border border-gold/40 px-4 py-2 text-sm text-gold">تذكرتي الموسمية</Link>
          </div>
        </article>

        <article className="glass p-4 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between px-2">
            <h2 className="font-bold">{LEAGUES[0].name}</h2>
            <Link to="/standings" className="text-sm text-pulse">الكل</Link>
          </div>
          <StandingsTable rows={window} compact />
        </article>
      </div>
      <DemoNote />
    </section>
  )
}
