import { useState } from 'react'
import { PageTitle } from '../components/PageTitle'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { useMyClub } from '../data/MyClub'
import { getClubs } from '../data/source'
import { useLoad } from '../data/useLoad'
import { DEMO_KEYS } from '../lib/legal'
import { ROLE_LABEL } from '../lib/roles'
import { supabase } from '../lib/supabase'

export function Settings() {
  const { user, demo, signOut } = useAuth()
  const { club, choose } = useMyClub()
  const clubs = useLoad(getClubs)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function eraseAll() {
    setError(null)
    if (supabase && !demo) {
      const { error } = await supabase.rpc('delete_my_account')
      if (error) return setError('ما قدرنا نحذف الحساب، جرّب مرة ثانية')
    }
    try { DEMO_KEYS.forEach((k) => localStorage.removeItem(k)) } catch { /* nothing stored */ }
    await signOut()
  }

  return (
    <section className="max-w-2xl space-y-5">
      <PageTitle>الإعدادات</PageTitle>

      <div className="glass divide-y divide-white/10">
        <div className="flex items-center justify-between p-4">
          <span className="text-mute">الدور</span>
          <span>{user && ROLE_LABEL[user.role]}{demo && ' · تجريبي'}</span>
        </div>
        {user && !['club_admin', 'bfa_admin'].includes(user.role) && (
        <label className="flex items-center justify-between gap-4 p-4">
          <span className="text-mute">ناديك</span>
          <select
            value={clubs.data?.find((c) => c.name === club)?.id ?? ''}
            onChange={(e) => {
              const c = clubs.data?.find((x) => x.id === e.target.value)
              if (c) choose(c).catch(() => setError('ما انحفظ النادي، حاول مرة ثانية'))
            }}
            className="min-h-11 min-w-0 rounded-xl border border-white/15 bg-deep px-3"
          >
            <option value="" disabled>اختر</option>
            {clubs.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        )}
        <Link to="/privacy" className="flex items-center justify-between p-4 hover:bg-white/5">سياسة الخصوصية <span className="text-mute">←</span></Link>
        <Link to="/terms" className="flex items-center justify-between p-4 hover:bg-white/5">شروط الاستخدام <span className="text-mute">←</span></Link>
      </div>

      <button onClick={signOut} className="glass w-full p-4 text-start hover:bg-white/5">تسجيل الخروج</button>

      <div className="glass space-y-3 border-crimson/30 p-4">
        <h2 className="font-bold text-crimson-ink">احذف كل بياناتي</h2>
        <p className="text-sm text-mute">
          {demo ? 'يمسح الدور وصوتك من هالجهاز ويطلّعك.' : 'يحذف حسابك وملفك نهائياً من السيرفر. ما يرجع.'}
        </p>
        {confirming ? (
          <div className="flex flex-wrap gap-2">
            <button onClick={eraseAll} className="min-h-11 rounded-xl bg-crimson px-4 text-sm font-bold text-white">أكّد الحذف</button>
            <button onClick={() => setConfirming(false)} className="min-h-11 rounded-xl border border-white/15 px-4 text-sm">إلغاء</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} className="min-h-11 rounded-xl border border-crimson/50 px-4 text-sm text-crimson-ink">احذف كل بياناتي</button>
        )}
        {error && <p role="alert" className="text-sm text-crimson-ink">{error}</p>}
      </div>
    </section>
  )
}
