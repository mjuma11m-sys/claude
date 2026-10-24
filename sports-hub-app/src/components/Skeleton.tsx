const Bone = ({ className = '' }: { className?: string }) => (
  <div aria-hidden className={`animate-pulse rounded-xl bg-white/[0.06] motion-reduce:animate-none ${className}`} />
)

/* Shape-matched placeholders: the page keeps its layout while data loads, so nothing jumps. */
export function PageSkeleton({ variant = 'list' }: { variant?: 'home' | 'list' | 'table' }) {
  return (
    <div role="status" aria-label="جارٍ التحميل" className="space-y-5">
      <Bone className="h-9 w-48" />
      {variant === 'home' && (
        <div className="grid gap-4 lg:grid-cols-5">
          <Bone className="h-64 lg:col-span-3" />
          <Bone className="h-64 lg:col-span-2" />
        </div>
      )}
      {variant === 'list' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 5 }, (_, i) => <Bone key={i} className="h-[4.5rem]" />)}</div>
      )}
      {variant === 'table' && <Bone className="h-[28rem]" />}
    </div>
  )
}
