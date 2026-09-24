import { ClipboardCheck, LayoutDashboard, LogOut, Users } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import ErrorBoundary from '@/components/layout/ErrorBoundary'
import Wordmark from '@/components/ui/Wordmark'
import { useAuth } from '@/context/AuthContext'

const LINKS = [
  { to: '/teacher', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/teacher/students', label: 'Students', icon: Users },
  { to: '/teacher/assessments', label: 'Assessments', icon: ClipboardCheck },
]

function linkClass({ isActive }) {
  return [
    // Phones: three equal tabs, icon over label. md+: sidebar rows.
    'flex min-h-tap flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-sm font-semibold transition',
    'md:flex-row md:justify-start md:gap-3 md:px-4 md:py-0 md:text-base',
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-500/50',
    isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white',
  ].join(' ')
}

export default function TeacherLayout() {
  // ---- state ----
  const { user, logout } = useAuth()
  const { pathname } = useLocation()

  // ---- render ----
  return (
    <div className="min-h-dvh bg-paper">
      {/* Fixed sidebar from md up; on phones it collapses to a top bar */}
      <aside className="bg-ink-900 text-white md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col">
        <div className="flex items-center justify-between px-4 pt-3 md:px-6 md:pt-6">
          <Wordmark tone="light" />
          <button
            type="button"
            onClick={logout}
            aria-label="Log out"
            className="grid h-12 w-12 place-items-center rounded-xl text-white/80 hover:bg-white/10 md:hidden"
          >
            <LogOut aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <p className="hidden px-6 pt-1 text-sm text-white/60 md:block">Teacher</p>

        <nav
          aria-label="Teacher"
          className="grid grid-cols-3 gap-1 px-2 py-2 md:mt-6 md:flex md:flex-col md:px-3"
        >
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon aria-hidden="true" className="h-5 w-5 text-sky-500" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto hidden border-t border-white/10 p-4 md:block">
          <p className="font-semibold">{user.name}</p>
          <p className="text-sm text-white/60">Class {user.classId}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-3 flex min-h-tap w-full items-center gap-3 rounded-xl px-4 font-semibold text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-500/50"
          >
            <LogOut aria-hidden="true" className="h-5 w-5" />
            Log out
          </button>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-6 md:ml-64 md:px-8 md:py-8">
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}
