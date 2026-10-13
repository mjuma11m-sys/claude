/* Provisional mark from the promo (pentagon = five circles, centre = the hub). Swap when an official logo exists. */
export function Logo({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={className}>
      <path d="M20 3 36.2 14.8 30 34H10L3.8 14.8z" fill="none" stroke="var(--color-pulse)" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="20" cy="20" r="4.5" fill="var(--color-crimson)" />
    </svg>
  )
}
