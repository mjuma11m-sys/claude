import { PageSkeleton } from './Skeleton'

export const Loading = ({ variant }: { variant?: 'home' | 'list' | 'table' }) => <PageSkeleton variant={variant} />

export function Failed({ retry }: { retry: () => void }) {
  return (
    <div role="alert" className="glass flex flex-wrap items-center justify-between gap-3 p-4">
      <p>ما قدرنا نجيب البيانات. تأكد من الاتصال.</p>
      <button onClick={retry} className="rounded-xl border border-white/15 px-3 py-1.5 text-sm">حاول مرة ثانية</button>
    </div>
  )
}
