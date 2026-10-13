import { Link } from 'react-router'
import { ClubBadge } from '../components/ClubBadge'
import { Countdown } from '../components/Countdown'
import { DemoNote } from '../components/DemoNote'
import { Icon } from '../components/Icon'
import { InstallPrompt } from '../components/InstallPrompt'
import { PageTitle } from '../components/PageTitle'
import { PitchLines } from '../components/PitchLines'
import { StatTile } from '../components/StatTile'
import { ShareButton } from '../components/ShareButton'
import { StandingsTable } from '../components/StandingsTable'
import { Failed, Loading } from '../components/States'
import { useMyClub } from '../data/MyClub'
import { getLeagues, getNextMatch, getVotes } from '../data/source'
import { useLoad } from '../data/useLoad'
import { vars } from '../lib/css'
import { fmtDateTime, fmtGd } from '../lib/format'
import { useIntro } from '../lib/motion'
import { rank } from '../lib/standings'

export function Home() {
  const { club } = useMyClub()
  const intro = useIntro('sh.homeIntro')
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
  const enter = intro ? 'kick' : ''

  return (
    <section className="space-y-5 md:space-y-6">
      <PageTitle>ملعبك اليوم</PageTitle>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* The one bold moment: pitch, floodlight, scoreboard. Everything else stays quiet. */}
        <article className={`glass turf rise relative flex flex-col justify-center overflow-hidden p-5 md:p-8 lg:col-span-3 ${intro ? 'sweep' : ''}`} style={vars({ '--i': 1 })}>
          <PitchLines />
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-pulse via-pulse/40 to-crimson" />
          <div className="relative">
            <p className="text-sm text-mute">المباراة الجاية</p>
            {match ? (
              <>
                <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
                  <div className={`flex flex-col items-center gap-2 ${enter}`} style={vars({ '--slide': '30px', '--i': 1 })}>
                    <ClubBadge name={match.home} size="lg" mine={match.home === club} />
                    <p className={`font-display text-2xl leading-tight md:text-3xl ${match.home === club ? 'text-gold' : ''}`}>{match.home}</p>
                  </div>
                  <div aria-hidden className={`flex flex-col items-center gap-2 ${enter}`} style={vars({ '--i': 3 })}>
                    <span className="h-10 w-1 skew-x-12 rounded-[1px] bg-white/25" />
                    <span className="font-display text-xl text-mute">VS</span>
                    <span className="h-10 w-1 skew-x-12 rounded-[1px] bg-white/25" />
                  </div>
                  <div className={`flex flex-col items-center gap-2 ${enter}`} style={vars({ '--slide': '-30px', '--i': 1 })}>
                    <ClubBadge name={match.away} size="lg" mine={match.away === club} />
                    <p className={`font-display text-2xl leading-tight md:text-3xl ${match.away === club ? 'text-gold' : ''}`}>{match.away}</p>
                  </div>
                </div>
                <p className="mt-5 text-center text-sm text-mute">
                  {match.venue} · <span className="num">{fmtDateTime(match.kickoff)}</span>
                </p>
                <div className="mt-5"><Countdown to={match.kickoff} /></div>
                <div className="mt-7 flex justify-center gap-4">
                  <Link to="/vote" className="btn-skew grid min-h-11 min-w-0 flex-1 place-items-center px-4 text-center text-sm font-bold text-pulse-ink sm:max-w-52 sm:flex-none sm:px-7">صوّت لرجل المباراة</Link>
                  <Link to="/pass" className="btn-skew grid min-h-11 min-w-0 flex-1 place-items-center px-4 text-center text-sm text-gold sm:max-w-52 sm:flex-none sm:px-7" style={vars({ '--btn-bg': 'transparent', '--btn-line': 'rgb(212 175 55 / 0.55)' })}>تذكرتي الموسمية</Link>
                </div>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <button onClick={() => import('../lib/ics').then((m) => m.downloadIcs(match))} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm transition hover:border-white/30 active:scale-[0.98]">
                    <Icon name="cal" className="size-4" />أضف للتقويم
                  </button>
                  <ShareButton text={`${match.home} ضد ${match.away}: صوّت لرجل المباراة`} path="/vote" />
                </div>
              </>
            ) : (
              <p className="mt-6 text-center text-mute">ما فيه مباريات مجدولة حالياً.</p>
            )}
          </div>
        </article>

        <div className="grid content-start gap-4 lg:col-span-2">
          {mine ? (
            <div className="rise grid grid-cols-4 gap-2" style={vars({ '--i': 2 })}>
              <StatTile label="المركز" value={mine.pos} tone="text-gold" animate={intro} />
              <StatTile label="نقاط" value={mine.pts} animate={intro} />
              <StatTile label="الفارق" value={fmtGd(mine.gd)} animate={false} />
              <StatTile label="لعب" value={mine.played} animate={intro} />
            </div>
          ) : (
            <Link to="/settings" className="glass rise p-4 text-sm text-pulse" style={vars({ '--i': 2 })}>اختر ناديك عشان نبرز مركزه ونقاطه ←</Link>
          )}
          {leader && total > 0 && (
            <Link to="/vote" className="glass rise flex items-center gap-3 p-4 transition hover:border-white/25" style={vars({ '--i': 3 })}>
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-pulse/10 font-display text-3xl leading-none text-pulse">{leader.c.num ?? '—'}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-mute">يتصدر رجل المباراة</span>
                <span className="block truncate font-bold">{leader.c.name}</span>
              </span>
              <span className="font-display text-2xl text-pulse">{Math.round((leader.n / total) * 100)}%</span>
            </Link>
          )}
          {top && (
            <article className="glass rise p-3 md:p-4" style={vars({ '--i': 4 })}>
              <div className="mb-1 flex items-center justify-between px-2">
                <h2 className="font-display text-xl">{top.name}</h2>
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
