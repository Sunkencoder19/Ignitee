// Points ranking for the student's own class. First names only.

import { getClass, useData } from '../../api'
import { totalPoints } from '../../game'
import { useSession } from '../../session'

export default function Leaderboard() {
  const { user, progress } = useSession()
  const { data: rows, error } = useData(() => getClass(user.classId), [user.classId])

  if (error) return <p className="text-warn">{error}</p>
  if (!rows) return <p className="text-muted">Loading...</p>

  // Your own row uses your live progress, so it updates straight after a lesson.
  const ranked = rows
    .map((r) => ({
      id: r.student.id,
      name: r.student.name.split(' ')[0],
      points: totalPoints(r.student.id === user.id ? progress : r.progress),
    }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))

  // Equal points share a rank: 1, 2, 2, 4.
  ranked.forEach((row, i) => {
    row.rank = i > 0 && row.points === ranked[i - 1].points ? ranked[i - 1].rank : i + 1
  })
  const me = ranked.find((r) => r.id === user.id)

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-extrabold tracking-tight">Class {user.classId} leaderboard</h1>
      <p className="mt-1 text-muted">
        You are number {me.rank} of {ranked.length}.
      </p>

      <ol className="mt-6 overflow-hidden rounded-xl border border-line bg-surface">
        {ranked.map((row) => (
          <li
            key={row.id}
            className={`flex items-center gap-4 px-4 py-3 not-last:border-b not-last:border-line ${row.id === user.id ? 'bg-accent-soft' : ''}`}
          >
            <span className="w-8 text-xl font-extrabold text-muted">{row.rank}</span>
            <span className="flex-1 font-bold">
              {row.name}
              {row.id === user.id && ' (you)'}
            </span>
            <span className="font-bold tabular-nums">{row.points} points</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
