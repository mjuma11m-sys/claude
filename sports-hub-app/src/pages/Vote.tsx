import { useState } from 'react'
import { ClubBadge } from '../components/ClubBadge'
import { useNow } from '../components/Countdown'
import { DemoNote } from '../components/DemoNote'
import { Failed, Loading } from '../components/States'
import { useMyClub } from '../data/MyClub'
import { castVote, getNextMatch, getVotes } from '../data/source'
import { useLoad } from '../data/useLoad'
import { fmtPercent } from '../lib/format'

const NOTICE = { already: 'صوّتت قبل لهالمباراة', closed: 'التصويت مسكّر لهالمباراة' } as const
const WINDOW_MS = 2 * 3600_000 // keep in step with the RLS policy in 0003_fan_zone.sql

export function Vote() {
  const { club } = useMyClub()
  const now = useNow(60_000)
  const load = useLoad(async () => {
    const next = await getNextMatch()
    return { next, votes: next.data ? await getVotes(next.data.id) : null }
  })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  if (load.loading && !load.data) return <Loading variant="list" />
  if (!load.data) return <Failed retry={load.reload} />
  const { next, votes } = load.data
  const match = next.data

  if (!match || !votes) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-bold md:text-3xl">رجل المباراة</h1>
        <p className="glass p-5 text-mute">ما فيه مباراة مفتوحة للتصويت حالياً. ترجع لما تنزل المباراة الجاية.</p>
      </section>
    )
  }

  const kickoff = new Date(match.kickoff).getTime()
  const closesAt = kickoff + WINDOW_MS
  const closed = now >= closesAt
  const choice = votes.mine
  const total = Object.values(votes.counts).reduce((a, b) => a + b, 0)
  const lead = Math.max(0, ...Object.values(votes.counts))
  const showResults = !!choice || closed

  async function vote(id: string) {
    if (choice || busy || closed || !match) return
    setBusy(true)
    setNotice(null)
    try {
      const r = await castVote(match.id, id)
      if (r !== 'ok') setNotice(NOTICE[r])
      load.reload()
    } catch {
      setNotice('ما انحسب الصوت، حاول مرة ثانية')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-5">
      <h1 className="rise text-2xl font-bold md:text-3xl" style={{ '--i': 0 } as React.CSSProperties}>رجل المباراة</h1>

      <div className="glass rise flex flex-wrap items-center justify-between gap-3 p-4" style={{ '--i': 1 } as React.CSSProperties}>
        <div className="flex items-center gap-3">
          <ClubBadge name={match.home} mine={match.home === club} />
          <span className="text-sm text-mute">ضد</span>
          <ClubBadge name={match.away} mine={match.away === club} />
          <span className="font-bold">{match.home} · {match.away}</span>
        </div>
        <p className={`rounded-full px-3 py-1 text-xs ${closed ? 'bg-white/10 text-mute' : 'bg-pulse/10 text-pulse'}`}>
          {closed ? 'التصويت مسكّر' : now < kickoff ? 'التصويت مفتوح' : 'التصويت يسكّر قريباً'}
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {match.candidates.map((p, i) => {
          const n = votes.counts[p.id] ?? 0
          const share = total ? n / total : 0
          const picked = choice === p.id
          const leading = showResults && total > 0 && n === lead
          return (
            <li key={p.id} className="rise" style={{ '--i': i + 2 } as React.CSSProperties}>
              <button
                onClick={() => vote(p.id)}
                disabled={!!choice || busy || closed}
                aria-pressed={picked}
                className={`glass relative min-h-[4.5rem] w-full overflow-hidden p-4 text-start transition active:scale-[0.99] disabled:cursor-default ${picked ? 'border-pulse/60' : closed || choice ? '' : 'hover:border-white/25'}`}
              >
                {showResults && <span className="absolute inset-y-0 start-0 bg-pulse/10 transition-[width] duration-700" style={{ width: `${share * 100}%` }} />}
                <span className="relative flex items-center gap-3">
                  <span className={`num grid size-11 shrink-0 place-items-center rounded-xl text-lg font-bold ${leading ? 'bg-gold/15 text-gold' : 'bg-white/5'}`}>{p.num ?? '—'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{p.name}{picked && <span className="ms-2 text-xs font-normal text-pulse">اختيارك</span>}</span>
                    <span className="block text-xs text-mute">{p.pos}{leading && <span className="ms-2 text-gold">· يتصدر</span>}</span>
                  </span>
                  {showResults && <span className={`num text-sm ${picked ? 'text-pulse' : 'text-mute'}`}>{fmtPercent(share)}</span>}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <p role="status" className="min-h-5 text-sm">
        {choice ? <span className="text-pulse">انحسب صوتك ✓ · <span className="num">{total}</span> صوت</span> : notice ? <span role="alert" className="text-warn">{notice}</span> : <span className="text-mute">اضغط على اللاعب اللي تشوفه رجل المباراة. ما تقدر تغيّر صوتك بعدها.</span>}
      </p>
      {next.demo && <DemoNote />}
    </section>
  )
}
