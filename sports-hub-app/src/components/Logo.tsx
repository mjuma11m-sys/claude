/* WADQA Hub mark: a hub. The centre circle of a pitch, four club nodes on it, the ball in the middle.
   Source of truth: brand/build.py. Colors follow the theme tokens so it stays on-brand in every context. */
export function Logo({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={className}>
      <circle cx="32" cy="32" r="19" fill="none" stroke="var(--color-ink)" strokeWidth="4.5" />
      {[[45.43, 18.57], [45.43, 45.43], [18.57, 45.43], [18.57, 18.57]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="5.4" fill="var(--color-pulse)" stroke="var(--color-night)" strokeWidth="2.6" />
      ))}
      <circle cx="32" cy="32" r="7.2" fill="var(--color-crimson)" />
      <path d="M32 28.7 L35.1 30.95 L33.9 34.6 L30.1 34.6 L28.9 30.95Z" fill="var(--color-night)" />
    </svg>
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return <span dir="ltr" className={`font-display uppercase tracking-[0.08em] ${className}`}>WADQA Hub</span>
}
