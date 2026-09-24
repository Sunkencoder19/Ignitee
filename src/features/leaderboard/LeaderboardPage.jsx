import { useMemo, useState } from 'react'
import { Crown, RotateCcw, Star, TriangleAlert, Trophy } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import { useAuth } from '@/context/AuthContext'
import { useProgress } from '@/context/ProgressContext'
import useDocumentTitle from '@/hooks/useDocumentTitle'
import useFetch from '@/hooks/useFetch'
import { todayISO } from '@/lib/format'
import { rankClass } from '@/lib/leaderboard'
import { getLeaderboard } from '@/services/leaderboardService'

const MODES = [
  { id: 'week', label: 'This week' },
  { id: 'all', label: 'All time' },
]

// In the page (and to a screen reader) the podium reads 1st, 2nd, 3rd.
// CSS `order` then stands 1st in the middle, tallest, with 2nd left and 3rd right.
const PODIUM = [
  { place: 0, height: 'h-24', order: 'order-2', avatar: 'bg-sun-400' },
  { place: 1, height: 'h-16', order: 'order-1', avatar: 'bg-sun-400/40' },
  { place: 2, height: 'h-12', order: 'order-3', avatar: 'bg-ember-500/20' },
]

function pts(n) {
  return `${n} ${n === 1 ? 'point' : 'points'}`
}

// ---- Podium ----
function Podium({ top, meId }) {
  return (
    <ol className="grid grid-cols-3 items-end gap-2" aria-label="Top three">
      {PODIUM.map(({ place, height, order, avatar }) => {
        const entry = top[place]
        if (!entry) return <li key={place} className={order} aria-hidden="true" />
        const isMe = entry.id === meId
        return (
          <li key={entry.id} className={`${order} flex flex-col items-center text-center`}>
            {entry.rank === 1 && <Crown aria-hidden="true" className="mb-1 h-6 w-6 text-sun-400" />}
            <Avatar
              name={entry.firstName}
              size="lg"
              className={`${avatar} ${isMe ? 'ring-4 ring-ember-500' : ''}`}
            />
            <p className="mt-1 max-w-full truncate font-heading font-bold text-ink-900">
              {entry.firstName}
              {isMe && <span className="text-ember-700"> (you)</span>}
            </p>
            <p className="text-sm">{pts(entry.points)}</p>
            <div
              className={`mt-2 grid w-full place-items-center rounded-t-xl bg-paper font-heading text-2xl font-bold text-ink-900 shadow-soft ${height}`}
            >
              <span>
                <span className="sr-only">Rank </span>
                {entry.rank}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// ---- Row ----
function Row({ entry, isMe }) {
  return (
    <li
      className={[
        'flex min-h-tap items-center gap-3 rounded-2xl px-3 py-2',
        isMe ? 'bg-ember-500/10 ring-2 ring-inset ring-ember-500' : 'bg-paper shadow-soft',
      ].join(' ')}
      aria-current={isMe ? 'true' : undefined}
    >
      <span className="w-8 text-center font-heading text-lg font-bold text-ink-900">
        <span className="sr-only">Rank </span>
        {entry.rank}
      </span>
      <Avatar name={entry.firstName} />
      <span className="min-w-0 flex-1 truncate font-semibold text-ink-900">
        {entry.firstName}
        {isMe && <span className="text-ember-700"> (you)</span>}
      </span>
      <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-ink-900">
        <Star aria-hidden="true" className="h-4 w-4 fill-sun-400 text-sun-400" />
        {entry.points}
      </span>
    </li>
  )
}

// ---- LeaderboardPage ----
export default function LeaderboardPage() {
  useDocumentTitle('Leaderboard')
  const { user } = useAuth()
  const { progress, status: progressStatus } = useProgress()

  // ---- state ----
  // Weekly by default, so a new or slower child can still reach the top.
  const [mode, setMode] = useState('week')
  const [retryKey, setRetryKey] = useState(0)
  const { data, loading, error } = useFetch(
    () => getLeaderboard(user.classId),
    [user.classId, retryKey]
  )

  // The child's own row uses live context progress, so it moves the moment
  // they finish something; classmates come from what's saved.
  const ranked = useMemo(() => {
    if (!data || progressStatus !== 'ready') return []
    const entries = data.map((e) => (e.id === user.id ? { ...e, progress } : e))
    return rankClass(entries, mode, todayISO())
  }, [data, progress, progressStatus, mode, user.id])

  // ---- render ----
  const header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl">Class {user.classId} leaderboard</h1>
        <p>Just your class, first names only.</p>
      </div>
      <div
        role="radiogroup"
        aria-label="Time range"
        className="inline-flex self-start rounded-2xl bg-ink-900/5 p-1"
      >
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={mode === m.id}
            onClick={() => setMode(m.id)}
            className={[
              'min-h-tap rounded-xl px-4 font-semibold transition',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ember-500/40',
              mode === m.id
                ? 'bg-paper text-ink-900 shadow-soft'
                : 'text-ink-600 hover:text-ink-900',
            ].join(' ')}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  )

  if ((loading && !data) || progressStatus === 'idle' || progressStatus === 'loading') {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        {header}
        <div className="grid min-h-[40dvh] place-items-center">
          <Spinner size="lg" label="Loading the leaderboard" />
        </div>
      </div>
    )
  }

  if (error || progressStatus === 'error') {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        {header}
        <EmptyState
          icon={TriangleAlert}
          title="Couldn't load the leaderboard"
          message={error?.message}
          action={
            <Button icon={RotateCcw} onClick={() => setRetryKey((k) => k + 1)}>
              Try again
            </Button>
          }
        />
      </div>
    )
  }

  const me = ranked.find((e) => e.id === user.id)
  const anyPoints = ranked.some((e) => e.points > 0)
  const top = ranked.filter((e) => e.points > 0).slice(0, 3)
  const rest = ranked.filter((e) => !top.includes(e))

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {header}

      {!anyPoints ? (
        <EmptyState
          icon={Trophy}
          title="No points yet this week"
          message="Finish a lesson to get on the board!"
        />
      ) : (
        <>
          <Podium top={top} meId={user.id} />
          {rest.length > 0 && (
            <ol className="space-y-2" aria-label="Everyone else">
              {rest.map((entry) => (
                <Row key={entry.id} entry={entry} isMe={entry.id === user.id} />
              ))}
            </ol>
          )}
        </>
      )}

      {/* Always on screen, whatever the child's rank or scroll position */}
      {me && (
        <div className="sticky bottom-24 z-20 md:bottom-4">
          <p className="flex min-h-tap items-center gap-3 rounded-2xl bg-ink-900 px-4 py-2 font-semibold text-white shadow-lift">
            <Avatar name={me.firstName} className="bg-white/15 text-white" />
            <span className="flex-1">
              You are <span className="font-heading text-lg">#{me.rank}</span> of {ranked.length}
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Star aria-hidden="true" className="h-4 w-4 fill-sun-400 text-sun-400" />
              {pts(me.points)}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
