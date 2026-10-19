import { useEffect } from 'react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { reportRouteError } from '../data/telemetry'
import { Logo } from './Logo'

export function RouteError() {
  const e = useRouteError()
  const notFound = isRouteErrorResponse(e) && e.status === 404
  useEffect(() => { if (!notFound) reportRouteError(e) }, [e, notFound])
  return (
    <main className="grid min-h-dvh place-items-center p-4 text-center">
      <div className="glass max-w-sm space-y-4 p-6">
        <Logo className="mx-auto size-12" />
        <h1 className="text-xl font-bold">{notFound ? 'الصفحة غير موجودة' : 'صار خلل غير متوقع'}</h1>
        <p className="text-sm text-mute">{notFound ? 'الرابط غلط أو انحذفت الصفحة.' : 'جرّب تعيد التحميل. لو تكرر، البيانات اللي شفتها ما انتأثرت.'}</p>
        <div className="flex justify-center gap-2">
          <button onClick={() => location.reload()} className="rounded-xl bg-pulse px-4 py-2 text-sm font-bold text-pulse-ink">أعد التحميل</button>
          <Link to="/" className="rounded-xl border border-white/15 px-4 py-2 text-sm">الرئيسية</Link>
        </div>
      </div>
    </main>
  )
}
