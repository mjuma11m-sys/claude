import { useState } from 'react'
import { DemoNote } from '../components/DemoNote'
import { MOTM_CANDIDATES, MOTM_SEED, NEXT_MATCH } from '../data/demo'
import { fmtPercent } from '../lib/format'

const KEY = 'sh.motmVote'
const read = () => { try { return localStorage.getItem(KEY) } catch { return null } }

export function Vote() {
  const [choice, setChoice] = useState<string | null>(read)
  const counts = { ...MOTM_SEED, ...(choice ? { [choice]: MOTM_SEED[choice] + 1 } : {}) }
  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  function vote(id: string) {
    if (choice) return
    try { localStorage.setItem(KEY, id) } catch { /* session-only */ }
    setChoice(id)
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">رجل المباراة</h1>
        <p className="text-sm text-mute">{NEXT_MATCH.home} ضد {NEXT_MATCH.away} · صوت واحد لكل مشجع</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MOTM_CANDIDATES.map((p) => {
          const share = counts[p.id] / total
          const picked = choice === p.id
          return (
            <li key={p.id}>
              <button
                onClick={() => vote(p.id)}
                disabled={!!choice}
                aria-pressed={picked}
                className={`glass relative w-full overflow-hidden p-4 text-start transition active:scale-[0.99] disabled:cursor-default ${picked ? 'border-pulse/60' : 'hover:border-white/25'}`}
              >
                {choice && <span className="absolute inset-y-0 start-0 bg-pulse/10 transition-[width] duration-700" style={{ width: `${share * 100}%` }} />}
                <span className="relative flex items-center gap-3">
                  <span className="num grid size-11 shrink-0 place-items-center rounded-xl bg-white/5 text-lg font-bold">{p.num}</span>
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
      <DemoNote />
    </section>
  )
}
