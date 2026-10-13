/* Pitch markings as a quiet backdrop: halfway line, centre circle, both penalty areas. Decorative only. */
export function PitchLines({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" aria-hidden className={`pointer-events-none absolute inset-0 size-full text-white/[0.08] ${className}`} fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="200" y1="0" x2="200" y2="220" />
      <circle cx="200" cy="110" r="38" />
      <circle cx="200" cy="110" r="2.5" fill="currentColor" />
      <rect x="-2" y="58" width="52" height="104" />
      <rect x="-2" y="82" width="20" height="56" />
      <path d="M50 92a26 26 0 0 1 0 36" />
      <rect x="352" y="58" width="52" height="104" />
      <rect x="382" y="82" width="20" height="56" />
      <path d="M350 92a26 26 0 0 0 0 36" />
    </svg>
  )
}
