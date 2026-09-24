import { Flame, LogOut, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import Wordmark from '@/components/ui/Wordmark'
import { useAuth } from '@/context/AuthContext'
import useFetch from '@/hooks/useFetch'
import { getProgress } from '@/services/progressService'

// Student top bar. Points and streak are read once here for now;
// TODO(fattesing): switch to ProgressContext in checkpoint 6 so they update live.
export default function Navbar() {
  // ---- state ----
  const { user, logout } = useAuth()
  const { data: progress } = useFetch(() => getProgress(user.id), [user.id])

  // ---- render ----
  return (
    <header className="sticky top-0 z-30 bg-paper shadow-soft">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
        <Link to="/student" aria-label="IGNITE home" className="mr-auto rounded-lg">
          <Wordmark />
        </Link>

        <span
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-sun-400/20 px-3 font-heading text-lg font-bold text-ink-900"
          aria-label={`${progress?.points ?? 0} points`}
        >
          <Star aria-hidden="true" className="h-5 w-5 fill-sun-400 text-sun-400" />
          {progress?.points ?? '–'}
        </span>

        <span
          className="inline-flex min-h-[40px] items-center gap-1 rounded-full bg-ember-500/10 px-3 font-heading text-lg font-bold text-ink-900"
          aria-label={`${progress?.streak ?? 0} day streak`}
        >
          <Flame aria-hidden="true" className="h-5 w-5 text-ember-500" />
          {progress?.streak ?? '–'}
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
