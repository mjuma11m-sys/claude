import { useState } from 'react'
import { DemoNote } from '../components/DemoNote'
import { Failed, Loading } from '../components/States'
import { castVote, getNextMatch, getVotes } from '../data/source'
import { useLoad } from '../data/useLoad'
import { fmtPercent } from '../lib/format'

const NOTICE = { already: 'صوّتت قبل لهالمباراة', closed: 'التصويت مسكّر لهالمباراة' } as const

export function Vote() {
  const load = useLoad(async () => {
    const next = await getNextMatch()
    return { next, votes: next.data ? await getVotes(next.data.id) : null }
  })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  if (load.loading && !load.data) return <Loading />
  if (!load.data) return <Failed retry={load.reload} />
  const { next, votes } = load.data
  const match = next.data

  if (!match || !votes) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-bold md:text-3xl">رجل المباراة</h1>
        <p className="text-mute">ما فيه مباراة مفتوحة للتصويت حالياً.</p>
      </section>
    )
  }

  const choice = votes.mine
  const total = Object.values(votes.counts).reduce((a, b) => a + b, 0) || 1

  async function vote(id: string) {
    if (choice || busy || !match) return
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
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">رجل المباراة</h1>
        <p className="text-sm text-mute">{match.home} ضد {match.away} · صوت واحد لكل مشجع</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {match.candidates.map((p) => {
          const share = (votes.counts[p.id] ?? 0) / total
          const picked = choice === p.id
          return (
            <li key={p.id}>
              <button
                onClick={() => vote(p.id)}
                disabled={!!choice || busy}
                aria-pressed={picked}
                className={`glass relative w-full overflow-hidden p-4 text-start transition active:scale-[0.99] disabled:cursor-default ${picked ? 'border-pulse/60' : 'hover:border-white/25'}`}
              >
                {choice && <span className="absolute inset-y-0 start-0 bg-pulse/10 transition-[width] duration-700" style={{ width: `${share * 100}%` }} />}
                <span className="relative flex items-center gap-3">
                  <span className="num grid size-11 shrink-0 place-items-center rounded-xl bg-white/5 text-lg font-bold">{p.num ?? '—'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{p.name}</span>
                    <span className="block text-xs text-mute">{p.pos}</span>
                  </span>
                  {choice && <span className={`num text-sm ${picked ? 'text-pulse' : 'text-mute'}`}>{fmtPercent(share)}</span>}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {choice && <p role="status" className="text-sm text-pulse">انحسب صوتك ✓</p>}
      {notice && <p role="alert" className="text-sm text-warn">{notice}</p>}
      {next.demo && <DemoNote />}
    </section>
  )
}
