import { Link } from 'react-router'
import { ClubBadge } from '../components/ClubBadge'
import { Icon } from '../components/Icon'
import { InstallPrompt } from '../components/InstallPrompt'
import { ShareButton } from '../components/ShareButton'
import { Countdown } from '../components/Countdown'
import { DemoNote } from '../components/DemoNote'
import { StandingsTable } from '../components/StandingsTable'
import { Failed, Loading } from '../components/States'
import { useMyClub } from '../data/MyClub'
import { getLeagues, getNextMatch, getVotes } from '../data/source'
import { useLoad } from '../data/useLoad'
import { fmtDateTime, fmtGd } from '../lib/format'
import { downloadIcs } from '../lib/ics'
import { rank } from '../lib/standings'

const Stat = ({ label, value, tone = '' }: { label: string; value: string; tone?: string }) => (
  <div className="glass px-4 py-3 text-center">
    <p className={`num text-2xl font-bold md:text-3xl ${tone}`} dir="ltr">{value}</p>
    <p className="mt-0.5 text-xs text-mute">{label}</p>
  </div>
)

export function Home() {
  const { club } = useMyClub()
  const load = useLoad(async () => {
    const [leagues, next] = await Promise.all([getLeagues(), getNextMatch()])
    return { leagues, next, votes: next.data ? await getVotes(next.data.id) : null }
  })
  if (load.loading && !load.data) return <Loading variant="home" />
  if (!load.data) return <Failed retry={load.reload} />

  const { leagues, next, votes } = load.data
  const top = leagues.data[0]
  const table = top ? rank(top.rows) : []
  const me = table.findIndex((r) => r.team === club)
  const mine = me >= 0 ? table[me] : null
  const window = me < 0 ? table.slice(0, 5) : table.slice(Math.max(0, me - 2), me + 3)
  const match = next.data
  const leader = match && votes ? match.candidates.map((c) => ({ c, n: votes.counts[c.id] ?? 0 })).sort((a, b) => b.n - a.n)[0] : null
  const total = votes ? Object.values(votes.counts).reduce((a, b) => a + b, 0) : 0

  return (
    <section className="space-y-5 md:space-y-6">
      <h1 className="rise text-2xl font-bold md:text-3xl" style={{ '--i': 0 } as React.CSSProperties}>ملعبك اليوم</h1>

      <div className="grid gap-4 lg:grid-cols-5">
        <article className="glass rise relative flex flex-col justify-center overflow-hidden p-5 md:p-7 lg:col-span-3" style={{ '--i': 1 } as React.CSSProperties}>
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-pulse via-pulse/40 to-crimson" />
          <p className="text-sm text-mute">المباراة الجاية</p>
          {match ? (
            <>
              <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
                {[match.home, match.away].map((team, i) => (
                  <div key={team} className={`flex flex-col items-center gap-2 ${i === 1 ? 'order-last' : ''}`}>
                    <ClubBadge name={team} size="lg" mine={team === club} />
                    <p className={`text-lg font-bold md:text-xl ${team === club ? 'text-gold' : ''}`}>{team}</p>
                  </div>
                ))}
                <p className="num order-none rounded-lg bg-white/5 px-3 py-1 text-sm text-mute">VS</p>
              </div>
              <p className="mt-5 text-center text-sm text-mute">
                {match.venue} · <span className="num">{fmtDateTime(match.kickoff)}</span>
              </p>
              <div className="mt-5"><Countdown to={match.kickoff} /></div>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Link to="/vote" className="grid min-h-11 place-items-center rounded-xl bg-pulse px-5 text-sm font-bold text-pulse-ink transition active:scale-[0.98]">صوّت لرجل المباراة</Link>
                <Link to="/pass" className="grid min-h-11 place-items-center rounded-xl border border-gold/40 px-5 text-sm text-gold transition active:scale-[0.98]">تذكرتي الموسمية</Link>
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button onClick={() => downloadIcs(match)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm transition hover:border-white/30 active:scale-[0.98]">
                  <Icon name="cal" className="size-4" />أضف للتقويم
                </button>
                <ShareButton text={`${match.home} ضد ${match.away}: صوّت لرجل المباراة`} path="/vote" />
              </div>
            </>
          ) : (
            <p className="mt-6 text-center text-mute">ما فيه مباريات مجدولة حالياً.</p>
          )}
        </article>

        <div className="grid content-start gap-4 lg:col-span-2">
          {mine ? (
            <div className="rise grid grid-cols-4 gap-2" style={{ '--i': 2 } as React.CSSProperties}>
              <Stat label="المركز" value={String(mine.pos)} tone="text-gold" />
              <Stat label="نقاط" value={String(mine.pts)} />
              <Stat label="الفارق" value={fmtGd(mine.gd)} />
              <Stat label="لعب" value={String(mine.played)} />
            </div>
          ) : (
            <Link to="/settings" className="glass rise p-4 text-sm text-pulse" style={{ '--i': 2 } as React.CSSProperties}>اختر ناديك عشان نبرز مركزه ونقاطه ←</Link>
          )}
          {leader && total > 0 && (
            <Link to="/vote" className="glass rise flex items-center gap-3 p-4 transition hover:border-white/25" style={{ '--i': 3 } as React.CSSProperties}>
              <span className="num grid size-11 shrink-0 place-items-center rounded-xl bg-pulse/10 text-lg font-bold text-pulse">{leader.c.num ?? '—'}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-mute">يتصدر رجل المباراة</span>
                <span className="block truncate font-bold">{leader.c.name}</span>
              </span>
              <span className="num text-sm text-pulse">{Math.round((leader.n / total) * 100)}%</span>
            </Link>
          )}
          {top && (
            <article className="glass rise p-3 md:p-4" style={{ '--i': 4 } as React.CSSProperties}>
              <div className="mb-1 flex items-center justify-between px-2">
                <h2 className="font-bold">{top.name}</h2>
                <Link to="/standings" className="-mx-3 -my-3 px-3 py-3 text-sm text-pulse">الكل</Link>
              </div>
              <StandingsTable rows={window} compact />
            </article>
          )}
        </div>
      </div>
      <InstallPrompt />
      {(leagues.demo || next.demo) && <DemoNote />}
    </section>
  )
}
