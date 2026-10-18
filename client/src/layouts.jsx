// The frame around every student page and every teacher page:
// a header with navigation, then the page itself (<Outlet />).
// Each layout also sends anyone without the right role to the login page.
// While a saved login is being checked (`checking`), they show "Loading..." instead.

import { Link, Navigate, NavLink, Outlet } from 'react-router-dom'
import { currentStreak, today, totalPoints } from './game'
import { useSession } from './session'

function navClass({ isActive }) {
  return `inline-flex min-h-12 items-center rounded-full px-4 font-semibold ${isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink'}`
}

export function StudentLayout() {
  const { user, checking, progress, logout } = useSession()
  if (checking) return <p className="px-4 py-8 text-muted">Loading...</p>
  if (user?.role !== 'student') return <Navigate to="/login" replace />

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2">
          <Link to="/student" className="inline-flex min-h-12 items-center text-xl font-semibold tracking-tight">
            IGNITE
          </Link>
          <nav className="order-last flex w-full gap-1 sm:order-none sm:w-auto">
            <NavLink to="/student" end className={navClass}>
              Home
            </NavLink>
            <NavLink to="/student/learn" className={navClass}>
              Learn
            </NavLink>
            <NavLink to="/student/leaderboard" className={navClass}>
              Leaderboard
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-4">
            {progress && (
              <p className="hidden text-base text-muted sm:block">
                <strong className="text-ink">{totalPoints(progress)}</strong> points
                <span className="mx-2">|</span>
                <strong className="text-ink">{currentStreak(progress, today())}</strong> day streak
              </p>
            )}
            <button onClick={logout} className="inline-flex min-h-12 items-center px-2 text-base font-semibold text-muted hover:text-ink">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {progress ? <Outlet /> : <p className="text-muted">Loading your progress...</p>}
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
          <Link to="/teacher" className="inline-flex min-h-12 items-center text-xl font-semibold tracking-tight">
            IGNITE <span className="font-semibold text-muted">for teachers</span>
          </Link>
          <nav className="flex gap-1">
            <NavLink to="/teacher" end className={navClass}>
              Classes
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <span className="hidden text-sm text-muted md:inline">{user.name}</span>
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
