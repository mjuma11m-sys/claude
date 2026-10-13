export function Spinner() {
  return (
    <span
      role="status"
      aria-label="جارٍ التحميل"
      className="inline-block size-6 animate-spin rounded-full border-2 border-white/15 border-t-pulse motion-reduce:animate-none"
    />
  )
}
