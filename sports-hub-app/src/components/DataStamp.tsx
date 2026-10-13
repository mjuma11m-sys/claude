import { fmtDateTime } from '../lib/format'

/* Real data says when it was updated and where it came from. Demo data says nothing here: DemoNote covers it. */
export function DataStamp({ updatedAt, source }: { updatedAt: string | null; source: string | null }) {
  if (!updatedAt) return null
  return (
    <p className="text-xs text-mute">
      آخر تحديث: <span className="num">{fmtDateTime(updatedAt)}</span>
      {source && <> · المصدر: {source}</>}
    </p>
  )
}
