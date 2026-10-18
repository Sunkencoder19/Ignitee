// Points ranking for the student's own class. The server sends first names
// and points only.

import { getLeaderboard, useData } from '../../api'
import { useSession } from '../../session'

export default function Leaderboard() {
  const { user, progress } = useSession()
  // Reloads when the student's points change, so their own row is never behind.
  const { data: rows, error, reload } = useData(() => getLeaderboard(), [progress.points])

  if (error) {
    return (
      <div>
        <p className="text-lg font-semibold">{error}</p>
        <button onClick={reload} className="btn btn-primary mt-4">
          Try again
        </button>
      </div>
    )
  }
  if (!rows) return <p className="text-muted">Loading...</p>

  const me = rows.find((r) => r.isMe)

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight">{user.className} leaderboard</h1>
      <p className="mt-1 text-muted">
        {me.points === 0 ? 'Finish a lesson to get your first points.' : `You are number ${me.rank} of ${rows.length}.`}
      </p>

      <ol className="mt-6 overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-line">
        {rows.map((row) => (
          <li
            key={row.id}
            className={`flex items-center gap-4 px-4 py-3 not-last:border-b not-last:border-line ${row.isMe ? 'bg-accent-soft' : ''}`}
          >
            <span className="w-8 text-xl font-semibold text-muted">{row.rank}</span>
            <span className="flex-1 font-semibold">
              {row.firstName}
              {row.isMe && ' (you)'}
            </span>
            <span className="font-semibold tabular-nums">{row.points} points</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
