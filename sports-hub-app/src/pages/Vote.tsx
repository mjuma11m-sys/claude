import { useState } from 'react'
import { ClubBadge } from '../components/ClubBadge'
import { PageTitle } from '../components/PageTitle'
import { ShareButton } from '../components/ShareButton'
import { useNow } from '../components/Countdown'
import { DemoNote } from '../components/DemoNote'
import { Failed, Loading } from '../components/States'
import { useMyClub } from '../data/MyClub'
import { castVote, getNextMatch, getVotes } from '../data/source'
import { useLoad } from '../data/useLoad'
import { vars } from '../lib/css'
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
  const [goal, setGoal] = useState<string | null>(null) // the card that just scored: drives the one-off flash

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
      else { setGoal(id); navigator.vibrate?.(14) }
      load.reload()
    } catch {
      setNotice('ما انحسب الصوت، حاول مرة ثانية')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-5">
      <PageTitle>رجل المباراة</PageTitle>

      <div className="glass rise flex flex-wrap items-center justify-between gap-3 p-4" style={vars({ '--i': 1 })}>
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
            <li key={p.id} className="rise" style={vars({ '--i': i + 2 })}>
              <button
                onClick={() => vote(p.id)}
                disabled={!!choice || busy || closed}
                aria-pressed={picked}
                className={`glass relative min-h-[4.5rem] w-full overflow-hidden p-4 text-start transition active:scale-[0.99] disabled:cursor-default ${picked ? 'border-pulse/60' : closed || choice ? '' : 'hover:border-white/25'} ${goal === p.id ? 'goal-ring' : ''}`}
              >
                {showResults && <span className="absolute inset-y-0 start-0 bg-pulse/10 transition-[width] duration-700 ease-[var(--ease-kick)]" style={{ width: `${share * 100}%` }} />}
                {goal === p.id && <span aria-hidden className="goal-flash pointer-events-none absolute inset-0 m-auto size-44 rounded-full bg-[radial-gradient(circle,rgb(0_229_255/0.45),transparent_70%)]" />}
                <span className="relative flex items-center gap-3">
                  <span className={`grid size-14 shrink-0 place-items-center rounded-xl font-display text-4xl leading-none transition-colors ${picked ? 'bg-pulse text-pulse-ink' : leading ? 'bg-gold/15 text-gold' : 'bg-white/5'}`}>{p.num ?? '—'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{p.name}{picked && <span className="ms-2 text-xs font-normal text-pulse">اختيارك</span>}</span>
                    <span className="block text-xs text-mute">{p.pos}{leading && <span className="ms-2 text-gold">· يتصدر</span>}</span>
                  </span>
                  {showResults && <span className={`font-display text-2xl ${picked ? 'text-pulse' : 'text-mute'}`}>{fmtPercent(share)}</span>}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <p role="status" className="min-h-5 text-sm">
        {choice ? <span className="text-pulse">انحسب صوتك ✓ · <span className="num">{total}</span> صوت</span> : notice ? <span role="alert" className="text-warn">{notice}</span> : <span className="text-mute">اضغط على اللاعب اللي تشوفه رجل المباراة. ما تقدر تغيّر صوتك بعدها.</span>}
      </p>
      {choice && <ShareButton text={`صوّتت لرجل مباراة ${match.home} ضد ${match.away}. صوّت معي:`} path="/vote" label="شارك التصويت" />}
      {next.demo && <DemoNote />}
    </section>
  )
}
