import { useMyClub } from '../data/MyClub'
import type { Ranked } from '../lib/standings'
import { ClubBadge } from './ClubBadge'
import { vars } from '../lib/css'
import { fmtGd } from '../lib/format'

export function StandingsTable({ rows, compact = false }: { rows: Ranked[]; compact?: boolean }) {
  const { club } = useMyClub()
  return (
    <table className="w-full text-sm">
      <thead className="text-xs text-mute">
        <tr className="[&>th]:px-2 [&>th]:py-2 [&>th]:font-medium">
          <th className="w-8 text-start">#</th>
          <th className="text-start">النادي</th>
          <th>لعب</th>
          {!compact && <><th className="hidden sm:table-cell">فاز</th><th className="hidden sm:table-cell">تعادل</th><th className="hidden sm:table-cell">خسر</th></>}
          <th>الفارق</th>
          <th>نقاط</th>
        </tr>
      </thead>
      <tbody className="num">
        {rows.map((r, idx) => {
          const mine = r.team === club
          const leader = r.pos === 1
          const bar = mine ? 'shadow-[inset_-3px_0_0_var(--color-gold)]' : leader ? 'shadow-[inset_-3px_0_0_var(--color-pulse)]' : ''
          return (
            <tr
              key={r.team}
              aria-current={mine ? 'true' : undefined}
              className={`row-in border-t border-white/5 text-center [&>td]:px-2 [&>td]:py-2.5 ${mine ? 'bg-gold/10 font-bold text-gold' : ''}`}
              style={vars({ '--i': Math.min(idx, 12) })}
            >
              <td className={`font-display text-xl text-start ${bar} ${leader && !mine ? 'text-pulse' : ''}`}>{r.pos}</td>
              <td className="font-sans text-start">
                <span className="flex items-center gap-2.5">
                  <ClubBadge name={r.team} size="sm" mine={mine} />
                  <span>{r.team}</span>
                  {leader && <span className="rounded bg-pulse/15 px-1.5 py-0.5 text-[10px] font-medium text-pulse">المتصدر</span>}
                  {mine && <span className="rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-medium">ناديك</span>}
                </span>
              </td>
              <td>{r.played}</td>
              {!compact && <><td className="hidden sm:table-cell">{r.won}</td><td className="hidden sm:table-cell">{r.drawn}</td><td className="hidden sm:table-cell">{r.lost}</td></>}
              <td dir="ltr" className={mine ? '' : r.gd > 0 ? 'text-safe' : r.gd < 0 ? 'text-crimson-ink' : 'text-mute'}>{fmtGd(r.gd)}</td>
              <td className={`font-display text-xl ${mine ? '' : 'text-ink'}`}>{r.pts}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
