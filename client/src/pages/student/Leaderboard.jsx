// Points ranking for the student's own class. The server sends first names
// and points only.

import { getLeaderboard, useData } from '../../api'
import { useT } from '../../i18n/t'
import { useSession } from '../../session'

export default function Leaderboard() {
  const { user, progress } = useSession()
  const t = useT()
  // Reloads when the student's points change, so their own row is never behind.
  const { data: rows, error, reload } = useData(() => getLeaderboard(), [progress.points])

  if (error) {
    return (
      <div>
        <p className="text-lg font-semibold">{error}</p>
        <button onClick={reload} className="btn btn-primary mt-4">
          {t('common.tryAgain')}
        </button>
      </div>
    )
  }
  if (!rows) return <p className="text-muted">{t('common.loading')}</p>

  const me = rows.find((r) => r.isMe)

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight">{t('leaderboard.title', { className: user.className })}</h1>
      <p className="mt-1 text-muted">
        {me.points === 0 ? t('leaderboard.noPoints') : t('leaderboard.rank', { rank: me.rank, total: rows.length })}
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
              {row.isMe && ` ${t('leaderboard.you')}`}
            </span>
            <span className="font-semibold tabular-nums">
              {row.points} {t('header.points')}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
