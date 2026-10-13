import { useMyClub } from '../data/MyClub'
import type { Ranked } from '../lib/standings'

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
        {rows.map((r) => {
          const mine = r.team === club
          return (
            <tr
              key={r.team}
              aria-current={mine ? 'true' : undefined}
              className={`border-t border-white/5 text-center [&>td]:px-2 [&>td]:py-2.5 ${mine ? 'bg-gold/10 font-bold text-gold' : ''}`}
            >
              <td className="text-start">{r.pos}</td>
              <td className="font-sans text-start">
                {r.team}
                {mine && <span className="ms-2 rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-medium">ناديك</span>}
              </td>
              <td>{r.played}</td>
              {!compact && <><td className="hidden sm:table-cell">{r.won}</td><td className="hidden sm:table-cell">{r.drawn}</td><td className="hidden sm:table-cell">{r.lost}</td></>}
              <td dir="ltr">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
              <td className={mine ? '' : 'text-ink'}>{r.pts}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
