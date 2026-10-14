import { Suspense, useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation, useMatches } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { navFor } from '../lib/nav'
import { ROLE_LABEL } from '../lib/roles'
import { Icon } from './Icon'
import { useMyClub } from '../data/MyClub'
import { ClubBadge } from './ClubBadge'
import { Logo, Wordmark } from './Logo'
import { OfflineBanner } from './OfflineBanner'
import { Loading } from './States'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
    isActive ? 'nav-active nav-side bg-pulse/10 text-pulse' : 'text-mute hover:bg-white/5 hover:text-ink'
  }`

export function Layout() {
  const { user, demo, signOut } = useAuth()
  const { club } = useMyClub()
  const { pathname } = useLocation()
  const matches = useMatches()
  const main = useRef<HTMLElement>(null)
  const title = [...matches].reverse().map((m) => (m.handle as { title?: string } | undefined)?.title).find(Boolean)

  // Per-page title (history, tab switcher, screen readers). Focus moves to the new page after in-app navigation,
  // but not on first load: there the skip link and the nav must stay the first Tab stops.
  const firstRender = useRef(true)
  useEffect(() => {
    document.title = title ? `${title} · Sports Hub` : 'Sports Hub'
    if (firstRender.current) { firstRender.current = false; return }
    main.current?.focus({ preventScroll: true })
    scrollTo(0, 0)
  }, [pathname, title])
  const items = user ? navFor(user.role) : []
  const tabs = items.slice(0, 5) // the phone tab bar holds five at most

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[4.75rem_1fr] lg:grid-cols-[16rem_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-xl focus:bg-pulse focus:px-4 focus:py-2 focus:font-bold focus:text-pulse-ink">تخطي للمحتوى</a>
      {/* iPad: icon rail · desktop: full sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-e border-white/10 bg-white/[0.02] p-3 md:flex lg:p-4">
        <div className="mb-8 flex items-center gap-3 px-1.5 pt-2">
          <Logo className="size-9 shrink-0" />
          <Wordmark className="hidden text-xl lg:inline" />
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end className={linkClass} title={i.label}>
              <Icon name={i.icon} className="size-5 shrink-0" />
              <span className="hidden lg:inline">{i.label}</span>
            </NavLink>
          ))}
        </nav>
        <NavLink to="/settings" className={linkClass} title="الإعدادات">
          <Icon name="gear" className="size-5 shrink-0" />
          <span className="hidden lg:inline">الإعدادات</span>
        </NavLink>
        <button onClick={signOut} title="تسجيل الخروج" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-mute hover:bg-white/5 hover:text-ink">
          <Icon name="out" className="size-5 shrink-0" />
          <span className="hidden lg:inline">تسجيل الخروج</span>
        </button>
      </aside>

      <div className="flex min-w-0 flex-col">
        <OfflineBanner />
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-night/70 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl md:px-8">
          <div className="flex shrink-0 items-center gap-2 md:hidden">
            <Logo className="size-7" />
            <Wordmark className="whitespace-nowrap text-lg" />
          </div>
          <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap text-sm md:ms-auto md:gap-2">
            {demo && <span className="rounded-full bg-warn/15 px-2.5 py-0.5 text-xs text-warn"><span className="sm:hidden">تجريبي</span><span className="hidden sm:inline">وضع تجريبي</span></span>}
            {club && user && !['club_admin', 'bfa_admin'].includes(user.role) && <span className="hidden items-center gap-2 rounded-full bg-white/5 py-0.5 pe-3 ps-1 sm:flex"><ClubBadge name={club} size="sm" mine /> <span>{club}</span></span>}
            {user && <span className="max-w-28 truncate rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-mute sm:text-sm">{ROLE_LABEL[user.role]}</span>}
            <NavLink to="/settings" className="-me-1.5 grid size-11 place-items-center rounded-full text-mute hover:text-ink md:hidden" aria-label="الإعدادات">
              <Icon name="gear" />
            </NavLink>
          </div>
        </header>

        <main id="main" ref={main} tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 outline-none md:px-8 md:pb-10 md:pt-8">
          <div key={pathname} className="page"><Suspense fallback={<Loading variant="home" />}><Outlet /></Suspense></div>
        </main>

        {/* Phone: bottom tab bar in thumb reach, above the home indicator */}
        <nav className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 grid auto-cols-fr grid-flow-col rounded-2xl border border-white/10 bg-deep/85 p-1.5 backdrop-blur-xl md:hidden">
          {tabs.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              end
              className={({ isActive }) =>
                `flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] ${isActive ? 'nav-active nav-tab bg-pulse/10 text-pulse' : 'text-mute'}`
              }
            >
              <Icon name={i.icon} />
              <span className="max-w-full truncate px-1">{i.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
