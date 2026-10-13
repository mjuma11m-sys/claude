import { useState } from 'react'
import { DemoNote } from '../components/DemoNote'
import { StandingsTable } from '../components/StandingsTable'
import { LEAGUES } from '../data/demo'
import { rank } from '../lib/standings'

export function Standings() {
  const [id, setId] = useState<string>(LEAGUES[0].id)
  const league = LEAGUES.find((l) => l.id === id) ?? LEAGUES[0]

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-bold md:text-3xl">ترتيب الدوري</h1>
      <div role="tablist" className="inline-flex flex-wrap gap-1 rounded-2xl border border-white/10 p-1">
        {LEAGUES.map((l) => (
          <button
            key={l.id}
            role="tab"
            aria-selected={l.id === id}
            onClick={() => setId(l.id)}
            className={`rounded-xl px-4 py-2 text-sm transition-colors ${l.id === id ? 'bg-pulse/15 text-pulse' : 'text-mute hover:text-ink'}`}
          >
            {l.name}
          </button>
        ))}
      </div>
      <div className="glass overflow-x-auto p-2 md:p-4">
        <StandingsTable rows={rank([...league.rows])} />
      </div>
      <DemoNote />
    </section>
  )
}
