const PATHS = {
  home: 'M3 11.5 12 4l9 7.5M5.5 10v10h13V10',
  table: 'M4 5h16M4 10h16M4 15h16M4 20h16M9 5v15',
  vote: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z',
  pass: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 6v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-6z',
  pulse: 'M3 12h4l2-6 4 12 2-6h6',
  club: 'M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6z',
  hub: 'M12 3l8.5 6.2-3.2 10H6.7L3.5 9.2z',
  out: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, className = 'size-5' }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d={PATHS[name]} />
    </svg>
  )
}
