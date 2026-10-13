import { Link } from 'react-router'

export function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-4 text-center">
      <div className="space-y-3">
        <p className="text-5xl font-bold text-mute">404</p>
        <p>الصفحة غير موجودة</p>
        <Link to="/" className="text-pulse underline">رجوع للرئيسية</Link>
      </div>
    </main>
  )
}
