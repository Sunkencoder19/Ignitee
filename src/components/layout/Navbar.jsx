import { useEffect, useRef, useState } from 'react'
import { Flame, LogOut, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import Wordmark from '@/components/ui/Wordmark'
import { useAuth } from '@/context/AuthContext'
import { useProgress } from '@/context/ProgressContext'
import { todayISO } from '@/lib/format'
import { currentStreak, levelFor } from '@/lib/scoring'

// ---- PointsPill ----
// Pops and shows a floating "+N" whenever points go up, so a child sees the
// reward land right after a lesson or quiz. Loading a student doesn't count.
function PointsPill({ points, ready }) {
  const previous = useRef(null)
  const [gain, setGain] = useState({ key: 0, amount: 0, floating: false })

  useEffect(() => {
    if (!ready) {
      previous.current = null
      return
    }
    if (previous.current !== null && points > previous.current) {
      const amount = points - previous.current
      setGain((g) => ({ key: g.key + 1, amount, floating: true }))
    }
    previous.current = points
  }, [points, ready])

  const level = levelFor(points)

  return (
    <span
      className="relative inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-sun-400/20 px-3 text-ink-900"
      aria-label={ready ? `${points} points, level ${level.name}` : 'Loading points'}
    >
      {/* A new key restarts the pop animation on every gain */}
      <span
        key={gain.key}
        className={`inline-flex items-center gap-1.5 font-heading text-lg font-bold ${gain.key ? 'motion-safe:animate-pop' : ''}`}
      >
        <Star aria-hidden="true" className="h-5 w-5 fill-sun-400 text-sun-400" />
        {ready ? points : '–'}
      </span>
      {ready && (
        <span
          aria-hidden="true"
          className="border-l border-ink-900/15 pl-1.5 text-sm font-semibold"
        >
          {level.name}
        </span>
      )}
      {gain.floating && (
        <span
          key={`gain-${gain.key}`}
          aria-hidden="true"
          onAnimationEnd={() => setGain((g) => ({ ...g, floating: false }))}
          className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 font-heading text-sm font-bold text-leaf-600 motion-safe:animate-float-up motion-reduce:hidden"
        >
          +{gain.amount}
        </span>
      )}
    </span>
  )
}

// ---- Navbar ----
export default function Navbar() {
  const { user, logout } = useAuth()
  const { progress, status } = useProgress()
  const ready = status === 'ready'
  const streak = ready ? currentStreak(progress, todayISO()) : 0

  return (
    <header className="sticky top-0 z-30 bg-paper shadow-soft">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
        <Link to="/student" aria-label="IGNITE home" className="mr-auto rounded-lg">
          <Wordmark compact />
        </Link>

        <PointsPill points={progress?.points ?? 0} ready={ready} />

        <span
          className="inline-flex min-h-[40px] items-center gap-1 rounded-full bg-ember-500/10 px-3 font-heading text-lg font-bold text-ink-900"
          aria-label={`${streak} day streak`}
        >
          <Flame aria-hidden="true" className="h-5 w-5 text-ember-500" />
          {ready ? streak : '–'}
        </span>

        <span className="hidden font-semibold text-ink-900 lg:inline">{user.firstName}</span>

        <button
          type="button"
          onClick={logout}
          aria-label="Log out"
          className="grid h-12 w-12 place-items-center rounded-2xl text-ink-600 hover:bg-ink-900/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember-500/40"
        >
          <LogOut aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
