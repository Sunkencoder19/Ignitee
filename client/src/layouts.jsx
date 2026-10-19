// The frame around every student page and every teacher page:
// a header with navigation, then the page itself (<Outlet />).
// Each layout also sends anyone without the right role to the login page.
// While a saved login is being checked (`checking`), they show "Loading..." instead.

import { Link, Navigate, NavLink, Outlet } from 'react-router-dom'
import { useT } from './i18n/t'
import { useSession } from './session'
import ThemeToggle from './ThemeToggle'

function navClass({ isActive }) {
  return `inline-flex min-h-12 items-center rounded-full px-4 font-semibold ${isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink'}`
}

export function StudentLayout() {
  const { user, checking, progress, progressError, reloadProgress, logout } = useSession()
  const t = useT()
  if (checking) return <p className="px-4 py-8 text-muted">{t('common.loading')}</p>
  if (user?.role !== 'student') return <Navigate to="/login" replace />

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2">
          <Link to="/student" className="inline-flex min-h-12 items-center text-xl font-semibold tracking-tight">
            IGNITE
          </Link>
          <nav aria-label={t('nav.main')} className="order-last flex w-full gap-1 sm:order-none sm:w-auto">
            <NavLink to="/student" end className={navClass}>
              {t('nav.home')}
            </NavLink>
            <NavLink to="/student/learn" className={navClass}>
              {t('nav.learn')}
            </NavLink>
            <NavLink to="/student/leaderboard" className={navClass}>
              {t('nav.leaderboard')}
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-4">
            {progress && (
              <p className="hidden text-base text-muted sm:block">
                <strong className="text-ink">{progress.points}</strong> {t('header.points')}
                <span className="mx-2">|</span>
                <strong className="text-ink">{progress.streak}</strong> {t('header.streak')}
              </p>
            )}
            <ThemeToggle />
            <button onClick={logout} className="inline-flex min-h-12 items-center px-2 text-base font-semibold text-muted hover:text-ink">
              {t('common.logOut')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
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
