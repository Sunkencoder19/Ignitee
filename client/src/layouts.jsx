// The frame around every student page and every teacher page:
// a header with navigation, then the page itself (<Outlet />).
// Each layout also sends anyone without the right role to the login page.
// While a saved login is being checked (`checking`), they show "Loading..." instead.

import { Link, Navigate, NavLink, Outlet } from 'react-router-dom'
import { Bolt, Coin, Flame } from './Rewards'
import { useT } from './i18n/t'
import { useSession } from './session'
import ThemeToggle from './ThemeToggle'

function navClass({ isActive }) {
  return `inline-flex min-h-12 items-center rounded-full px-4 font-semibold ${isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink'}`
}

// ---------- student ----------
// The student side is a game-like space: a colourful top bar with coins, points and
// the streak, and a tab bar at the bottom (easy to reach with a thumb).

const icon = { viewBox: '0 0 24 24', width: 26, height: 26, 'aria-hidden': true, focusable: false, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }

const TABS = [
  {
    to: '/student',
    end: true,
    label: 'nav.home',
    icon: (
      <svg {...icon}>
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5.5 10v9.5h13V10" />
        <path d="M10 19.5v-5h4v5" />
      </svg>
    ),
  },
  {
    to: '/student/learn',
    label: 'nav.learn',
    icon: (
      <svg {...icon}>
        <path d="M4 20V5" />
        <path d="M4 5.5c4-2.5 6 2.5 10 0v8c-4 2.5-6-2.5-10 0" />
        <path d="M14 7.5h6M17 5v5" opacity="0" />
        <circle cx="19" cy="18" r="1.6" />
      </svg>
    ),
  },
  {
    to: '/student/leaderboard',
    label: 'nav.leaderboard',
    icon: (
      <svg {...icon}>
        <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
        <path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5" />
        <path d="M12 14v3.5M8.5 20h7M10 17.5h4" />
      </svg>
    ),
  },
  {
    to: '/student/shop',
    label: 'nav.shop',
    icon: (
      <svg {...icon}>
        <path d="M5 8h14l-1 12H6z" />
        <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
      </svg>
    ),
  },
  {
    to: '/student/me',
    label: 'nav.profile',
    icon: (
      <svg {...icon}>
        <circle cx="12" cy="8.5" r="4" />
        <path d="M4.5 20.5c1-4 4-5.5 7.5-5.5s6.5 1.5 7.5 5.5" />
      </svg>
    ),
  },
]

export function StudentLayout() {
  const { user, checking, progress, progressError, reloadProgress } = useSession()
  const t = useT()
  if (checking) return <p className="px-4 py-8 text-muted">{t('common.loading')}</p>
  if (user?.role !== 'student') return <Navigate to="/login" replace />

  return (
    <div className="kid min-h-dvh pb-28">
      <header className="sticky top-0 z-20 bg-surface/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2">
          <Link to="/student" className="mr-2 hidden items-center font-display text-2xl text-accent sm:inline-flex">
            IGNITE
          </Link>
          {progress && (
            <>
              <span className="pill" aria-label={t('header.coinsLabel', { count: progress.coins })}>
                <Coin size={22} />
                <span aria-hidden="true">{progress.coins}</span>
              </span>
              <span className="pill" aria-label={t('header.pointsLabel', { count: progress.points })}>
                <Bolt size={22} />
                <span aria-hidden="true">{progress.points}</span>
              </span>
              <span className="pill" aria-label={t('header.streakLabel', { count: progress.streak })}>
                <Flame size={22} />
                <span aria-hidden="true">{progress.streak}</span>
              </span>
            </>
          )}
          <span className="ml-auto">
            <ThemeToggle />
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">
        {progress ? (
          <Outlet />
        ) : progressError ? (
          <div>
            <p className="text-lg font-semibold">{progressError}</p>
            <button onClick={reloadProgress} className="btn btn-primary mt-4">
              {t('common.tryAgain')}
            </button>
          </div>
        ) : (
          <p className="text-muted">{t('common.loadingProgress')}</p>
        )}
      </main>

      <nav aria-label={t('nav.main')} className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1 px-2 py-1">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex min-h-16 flex-col items-center justify-center rounded-2xl text-base font-bold ${isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink'}`
              }
            >
              {tab.icon}
              <span>{t(tab.label)}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

export function TeacherLayout() {
  const { user, checking, logout } = useSession()
  if (checking) return <p className="px-4 py-8 text-muted">Loading...</p>
  if (user?.role !== 'teacher') return <Navigate to="/login" replace />

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2">
          <Link to="/teacher" className="inline-flex min-h-12 items-center gap-1.5 text-xl font-semibold tracking-tight">
            IGNITE <span className="font-semibold text-muted">for teachers</span>
          </Link>
          <nav className="flex gap-1">
            <NavLink to="/teacher" end className={navClass}>
              Classes
            </NavLink>
            <NavLink to="/teacher/content" className={navClass}>
              Content
            </NavLink>
            <NavLink to="/teacher/reports" className={navClass}>
              Reports
            </NavLink>
            <NavLink to="/teacher/profile" className={navClass}>
              Profile
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <span className="hidden text-sm text-muted md:inline">{user.name}</span>
            <ThemeToggle />
            <button onClick={logout} className="inline-flex min-h-12 items-center px-2 text-base font-semibold text-muted hover:text-ink">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
