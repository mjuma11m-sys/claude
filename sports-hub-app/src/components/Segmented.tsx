import { useLayoutEffect, useRef, useState } from 'react'

type Option<T extends string> = { key: T; label: string; count?: number }

/* Tab strip with one pill that slides to the selected tab, so the eye follows the change. The pill is measured, not assumed:
   physical left/top because offsetLeft is physical even in RTL; tabs wrap on a phone and have different widths. No slide on first paint, and none under reduced motion (see index.css). */
export function Segmented<T extends string>({ label, value, onChange, options, className = '' }: { label: string; value: T; onChange: (v: T) => void; options: Option<T>[]; className?: string }) {
  const root = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [ready, setReady] = useState(false)

  useLayoutEffect(() => {
    const place = () => {
      const el = root.current?.querySelector<HTMLElement>('[aria-selected="true"]')
      if (el) setBox({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight })
    }
    place()
    const ro = new ResizeObserver(place)
    if (root.current) ro.observe(root.current)
    const t = requestAnimationFrame(() => setReady(true))
    return () => { ro.disconnect(); cancelAnimationFrame(t) }
  }, [value, options.length])

  return (
    <div ref={root} role="tablist" aria-label={label} className={`relative flex flex-wrap gap-1 rounded-2xl border border-white/10 p-1 ${className}`}>
      {box && <span aria-hidden className={`seg-pill absolute left-0 top-0 rounded-xl bg-pulse/15 ${ready ? 'seg-ready' : ''}`} style={{ width: box.w, height: box.h, transform: `translate(${box.x}px, ${box.y}px)` }} />}
      {options.map((o) => (
        <button key={o.key} role="tab" aria-selected={value === o.key} onClick={() => onChange(o.key)} className={`relative z-[1] min-h-11 flex-1 rounded-xl px-3 text-sm transition-colors ${value === o.key ? 'text-pulse' : 'text-mute hover:text-ink'}`}>
          {o.label}{o.count !== undefined && <> <span className="num text-xs">{o.count}</span></>}
        </button>
      ))}
    </div>
  )
}
