import { useState } from 'react'
import { DemoNote } from '../components/DemoNote'
import { StandingsTable } from '../components/StandingsTable'
import { Failed, Loading } from '../components/States'
import { getLeagues } from '../data/source'
import { useLoad } from '../data/useLoad'
import { rank } from '../lib/standings'

export function Standings() {
  const load = useLoad(getLeagues)
  const [id, setId] = useState<string | null>(null)
  if (load.loading && !load.data) return <Loading />
  if (!load.data) return <Failed retry={load.reload} />
  const leagues = load.data.data
  const league = leagues.find((l) => l.id === id) ?? leagues[0]

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-bold md:text-3xl">ترتيب الدوري</h1>
      {!league ? (
        <p className="text-mute">ما فيه دوريات مسجّلة بعد.</p>
      ) : (
        <>
          <div role="tablist" className="inline-flex flex-wrap gap-1 rounded-2xl border border-white/10 p-1">
            {leagues.map((l) => (
              <button
                key={l.id}
                role="tab"
                aria-selected={l.id === league.id}
                onClick={() => setId(l.id)}
                className={`rounded-xl px-4 py-2 text-sm transition-colors ${l.id === league.id ? 'bg-pulse/15 text-pulse' : 'text-mute hover:text-ink'}`}
              >
                {l.name}
              </button>
            ))}
          </div>
          <div className="glass overflow-x-auto p-2 md:p-4">
            <StandingsTable rows={rank(league.rows)} />
          </div>
        </>
      )}
      {load.data.demo && <DemoNote />}
    </section>
  )
}
