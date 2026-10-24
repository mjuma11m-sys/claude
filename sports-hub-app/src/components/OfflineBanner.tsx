import { useSyncExternalStore } from 'react'

const subscribe = (cb: () => void) => {
  addEventListener('online', cb); addEventListener('offline', cb)
  return () => { removeEventListener('online', cb); removeEventListener('offline', cb) }
}

export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
  if (online) return null
  return (
    <p role="status" className="bg-warn/15 px-4 py-1.5 text-center text-xs text-warn">
      ما فيه اتصال. تشوف آخر بيانات انحمّلت، والتصويت ينتظر الاتصال.
    </p>
  )
}
