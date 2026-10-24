import type { ReactNode } from 'react'
import { vars } from '../lib/css'

/* Page heading in the display face, with a slanted bar (the goal post leaning into the page). */
export function PageTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h1 className={`rise flex items-center gap-3 font-display text-3xl leading-tight md:text-4xl ${className}`} style={vars({ '--i': 0 })}>
      <span aria-hidden className="h-7 w-1.5 shrink-0 skew-x-12 rounded-[1px] bg-pulse md:h-8" />
      {children}
    </h1>
  )
}
