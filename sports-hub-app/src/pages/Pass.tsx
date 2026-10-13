import { useRef, type PointerEvent } from 'react'
import { Logo } from '../components/Logo'
import { MY_CLUB } from '../data/demo'

/* Holographic season pass: tilt + moving sheen follow the pointer; static under reduced motion. */
export function Pass() {
  const card = useRef<HTMLDivElement>(null)

  function move(e: PointerEvent) {
    const el = card.current
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const b = el.getBoundingClientRect()
    const x = (e.clientX - b.left) / b.width
    const y = (e.clientY - b.top) / b.height
    el.style.setProperty('--rx', `${(0.5 - y) * 14}deg`)
    el.style.setProperty('--ry', `${(x - 0.5) * 18}deg`)
    el.style.setProperty('--mx', `${x * 100}%`)
    el.style.setProperty('--my', `${y * 100}%`)
  }
  const reset = () => { card.current?.style.setProperty('--rx', '0deg'); card.current?.style.setProperty('--ry', '0deg') }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold md:text-3xl">تذكرتي الموسمية</h1>
      <div className="grid place-items-center py-4 [perspective:1000px]">
        <div
          ref={card}
          onPointerMove={move}
          onPointerLeave={reset}
          className="relative aspect-[1.586] w-full max-w-md touch-pan-y overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-[#14213a] via-night to-[#2a0a10] p-6 shadow-[0_30px_80px_-20px_rgb(0_229_255/0.35)] transition-transform duration-200 ease-out [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))]"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60 mix-blend-screen"
            style={{ background: 'radial-gradient(circle at var(--mx,30%) var(--my,20%), rgb(0 229 255 / .35), transparent 40%), conic-gradient(from 120deg at var(--mx,50%) var(--my,50%), transparent, rgb(212 175 55 / .25), rgb(206 17 38 / .2), transparent)' }}
          />
          <div className="relative flex h-full flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="num text-xs tracking-[0.3em] text-gold">VIP PASS</p>
                <p className="mt-1 text-2xl font-bold">{MY_CLUB}</p>
              </div>
              <Logo className="size-10" />
            </div>
            <div className="flex items-end justify-between">
              <div className="space-y-0.5 text-sm">
                <p className="text-mute">الموسم</p>
                <p className="num font-bold"><bdi dir="ltr">2026 / 27</bdi></p>
              </div>
              <div className="space-y-0.5 text-end text-sm">
                <p className="text-mute">المقعد</p>
                <p className="num font-bold"><bdi dir="ltr">B · 14 · 07</bdi></p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-mute">* تذكرة نموذجية للعرض: لا تصلح للدخول. الدخول الفعلي يحتاج اتفاق مع النادي ونظام تذاكر.</p>
    </section>
  )
}
