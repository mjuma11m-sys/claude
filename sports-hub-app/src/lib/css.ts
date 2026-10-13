import type { CSSProperties } from 'react'

/* Typed escape hatch for CSS custom properties: style={vars({ '--i': 2, '--slide': '28px' })} */
export const vars = (v: Record<string, string | number>) => v as CSSProperties
