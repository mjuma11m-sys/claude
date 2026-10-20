import { useState } from 'react'
import { Icon } from './Icon'

/* Native share sheet where it exists (phones), otherwise copy the link. Only ever shares a public page URL. */
export function ShareButton({ text, path, label = 'شارك', className = '' }: { text: string; path: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = location.origin + path
    try {
      if (navigator.share) await navigator.share({ title: 'WADQA Hub', text, url })
      else {
        await navigator.clipboard.writeText(`${text} ${url}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setCopied(false) // user closing the sheet is not an error
    }
  }

  return (
    <button onClick={share} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm text-ink transition hover:border-white/30 active:scale-[0.98] ${className}`}>
      <Icon name="share" className="size-4" />
      <span aria-live="polite">{copied ? 'اننسخ الرابط ✓' : label}</span>
    </button>
  )
}
