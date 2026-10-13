import { useEffect, useState } from 'react'
import { Icon } from './Icon'

type InstallEvent = Event & { prompt: () => Promise<void> }
const KEY = 'sh.installDismissed'
const read = () => { try { return localStorage.getItem(KEY) === '1' } catch { return false } }

const standalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
const ios = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent)

/* Android/desktop Chrome: native install button. iPhone/iPad Safari has no install API, so we show the two taps. */
export function InstallPrompt() {
  const [ev, setEv] = useState<InstallEvent | null>(null)
  const [hidden, setHidden] = useState(() => read() || standalone())

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEv(e as InstallEvent) }
    const onInstalled = () => setHidden(true)
    addEventListener('beforeinstallprompt', onPrompt)
    addEventListener('appinstalled', onInstalled)
    return () => { removeEventListener('beforeinstallprompt', onPrompt); removeEventListener('appinstalled', onInstalled) }
  }, [])

  const showIos = ios()
  if (hidden || (!ev && !showIos)) return null

  const dismiss = () => { try { localStorage.setItem(KEY, '1') } catch { /* session-only */ } setHidden(true) }

  return (
    <aside className="glass flex items-start gap-3 p-4" aria-label="تثبيت التطبيق">
      <Icon name="pass" className="mt-0.5 size-5 shrink-0 text-pulse" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-bold">ثبّت Sports Hub على جهازك</p>
        {ev ? (
          <p className="text-mute">يفتح مثل التطبيق، وبدون إنترنت بعد.</p>
        ) : (
          <p className="text-mute">من Safari: اضغط زر المشاركة <span aria-hidden>⎙</span> ثم «إضافة إلى الشاشة الرئيسية».</p>
        )}
        {ev && <button onClick={() => ev.prompt().then(dismiss)} className="mt-2 min-h-11 rounded-xl bg-pulse px-5 text-sm font-bold text-pulse-ink">ثبّت</button>}
      </div>
      <button onClick={dismiss} aria-label="إخفاء" className="-m-2 grid size-11 place-items-center rounded-full text-mute hover:text-ink">✕</button>
    </aside>
  )
}
