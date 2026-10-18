// The frame around every student page and every teacher page:
// a header with navigation, then the page itself (<Outlet />).
// Each layout also sends anyone without the right role to the login page.

import { useState } from 'react'
import { Link, Navigate, NavLink, Outlet } from 'react-router-dom'
import { currentStreak, today, totalPoints } from './game'
import { useSession } from './session'

function navClass({ isActive }) {
  return `rounded-xl px-3 py-2 font-bold ${isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink'}`
}

export function StudentLayout() {
  const { user, progress, logout } = useSession()
  if (user?.role !== 'student') return <Navigate to="/login" replace />

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to="/student" className="text-xl font-extrabold tracking-tight">
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
              <p className="text-sm text-muted">
                <strong className="text-ink">{totalPoints(progress)}</strong> points
                <span className="mx-2">|</span>
                <strong className="text-ink">{currentStreak(progress, today())}</strong> day streak
              </p>
            )}
            <button onClick={logout} className="text-sm font-bold text-muted hover:text-ink">
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
  const { user, logout } = useSession()
  // Which class the teacher is looking at. Every teacher page reads it
  // with useOutletContext().
  const [classId, setClassId] = useState(user?.classId ?? '4A')
  if (user?.role !== 'teacher') return <Navigate to="/login" replace />

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to="/teacher" className="text-xl font-extrabold tracking-tight">
            IGNITE <span className="font-semibold text-muted">for teachers</span>
          </Link>
          <nav className="flex gap-1">
            <NavLink to="/teacher" end className={navClass}>
              Overview
            </NavLink>
            <NavLink to="/teacher/students" className={navClass}>
              Students
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <select
              aria-label="Class"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="field min-h-10 w-auto py-1 text-sm"
            >
              <option value="4A">Class 4A</option>
              <option value="4B">Class 4B</option>
              <option value="all">All classes</option>
            </select>
            <span className="hidden text-sm text-muted md:inline">{user.name}</span>
            <button onClick={logout} className="text-sm font-bold text-muted hover:text-ink">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet context={{ classId }} />
      </main>
    </div>
  )
}
