import { useEffect } from 'react'
import { BookOpen, House, Smile, Trophy } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import ErrorBoundary from '@/components/layout/ErrorBoundary'
import Navbar from '@/components/layout/Navbar'
import BadgeIcon from '@/components/ui/BadgeIcon'
import Toast from '@/components/ui/Toast'
import { useProgress } from '@/context/ProgressContext'

const TOAST_MS = 5000

const TABS = [
  { to: '/student', label: 'Home', icon: House, end: true },
  { to: '/student/learn', label: 'Learn', icon: BookOpen },
  { to: '/student/leaderboard', label: 'Ranks', icon: Trophy },
  { to: '/student/profile', label: 'Me', icon: Smile },
]

function tabClass({ isActive }) {
  return [
    'group flex items-center rounded-2xl font-heading font-semibold transition',
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember-500/40',
    isActive ? 'text-ink-900' : 'text-ink-600 hover:text-ink-900',
  ].join(' ')
}

function TabIcon({ icon: Icon }) {
  return (
    <Icon
      aria-hidden="true"
      className="h-6 w-6 shrink-0 text-ink-600 group-aria-[current=page]:text-ember-500"
    />
  )
}

// ---- BadgeToasts ----
// Shows queued badge unlocks one at a time. The live region is always in the
// page, so screen readers announce each badge as it appears without moving
// focus. Two badges at once simply wait their turn in the queue.
function BadgeToasts() {
  const { toasts, badges, dismissToast } = useProgress()
  const badge = badges.find((b) => b.id === toasts[0])

  useEffect(() => {
    if (!badge) return
    const timer = setTimeout(dismissToast, TOAST_MS)
    return () => clearTimeout(timer)
  }, [badge, dismissToast])

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-24 z-40 md:bottom-6 md:left-auto md:right-6 md:w-96"
    >
      {badge && (
        <div key={badge.id} className="pointer-events-auto">
          <Toast
            icon={<BadgeIcon name={badge.icon} className="h-6 w-6 text-ember-700" />}
            eyebrow="New badge"
            title={badge.name}
            message={badge.description}
            onClose={dismissToast}
          />
        </div>
      )}
    </div>
  )
}

// ---- StudentLayout ----
export default function StudentLayout() {
  const { pathname } = useLocation()

  return (
    <div className="min-h-dvh bg-cream-50">
      <Navbar />

      <div className="mx-auto flex max-w-6xl">
        {/* Left rail from md up; phones get the bottom tabs instead */}
        <nav
          aria-label="Main"
          className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-56 shrink-0 flex-col gap-1 p-4 md:flex"
        >
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={(s) =>
                `${tabClass(s)} min-h-tap gap-3 px-4 text-lg ${s.isActive ? 'bg-paper shadow-soft' : ''}`
              }
            >
              <TabIcon icon={tab.icon} />
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <main className="min-w-0 flex-1 px-4 pb-28 pt-6 md:px-6 md:pb-10">
          <ErrorBoundary key={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <BadgeToasts />

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 bg-paper pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_12px_-2px_rgb(30_27_75/0.08)] md:hidden"
      >
        <div className="grid grid-cols-4">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={(s) => `${tabClass(s)} min-h-[64px] flex-col justify-center gap-1 text-sm`}
            >
              <TabIcon icon={tab.icon} />
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
