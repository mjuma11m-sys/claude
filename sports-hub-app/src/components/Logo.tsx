/* Sports Hub mark: an H built from a goal (two posts, crossbar) with the ball in the mouth.
   Source of truth: brand/build.py. Colors follow the theme tokens so it stays on-brand in every context. */
export function Logo({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <rect x="12" y="10" width="10" height="44" rx="3" fill="var(--color-ink)" />
      <rect x="42" y="10" width="10" height="44" rx="3" fill="var(--color-ink)" />
      <rect x="22" y="22" width="20" height="7" fill="var(--color-pulse)" />
      <circle cx="32" cy="43" r="7.5" fill="var(--color-crimson)" />
      <path d="M32 39.6 L35.2 41.9 L34 45.7 L30 45.7 L28.8 41.9Z" fill="var(--color-night)" />
    </svg>
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return <span dir="ltr" className={`font-display uppercase tracking-[0.08em] ${className}`}>Sports Hub</span>
}
