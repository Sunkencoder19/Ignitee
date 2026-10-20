// Points ranking for the student's own class. The server sends first names
// and points only. The top three stand on a podium; everyone is listed below.

import { getLeaderboard, useData } from '../../api'
import { useT } from '../../i18n/t'
import { Bolt } from '../../Rewards'
import { useSession } from '../../session'

const MEDAL = ['#ffc83d', '#c3c9d9', '#d58a4a'] // gold, silver, bronze
const AVATAR = ['#2f6fed', '#0f7a4d', '#b45400', '#c0287c', '#7b3fe0', '#007a94']

function Initial({ name, index, size = 48 }) {
  return (
    <span aria-hidden="true" className="grid shrink-0 place-items-center rounded-full font-display text-white" style={{ width: size, height: size, fontSize: size * 0.5, background: AVATAR[index % AVATAR.length] }}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}

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
  const podium = rows.filter((r) => r.rank <= 3 && r.points > 0).slice(0, 3)

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-4xl">{t('leaderboard.title', { className: user.className })}</h1>
      <p className="mt-1 text-lg text-muted">{me.points === 0 ? t('leaderboard.noPoints') : t('leaderboard.rank', { rank: me.rank, total: rows.length })}</p>

      {podium.length > 0 && (
        <ol className="mt-5 grid grid-cols-3 items-end gap-3" aria-label={t('leaderboard.podium')}>
          {[1, 0, 2]
            .filter((i) => podium[i])
            .map((i) => {
              const row = podium[i]
              return (
                <li key={row.id} className={`card flex flex-col items-center p-3 text-center ${row.isMe ? 'outline outline-4 outline-accent' : ''}`} style={{ paddingTop: i === 0 ? 28 : 16, paddingBottom: i === 0 ? 20 : 12 }}>
                  <span className="grid size-9 place-items-center rounded-full font-display text-xl text-[#1d2358]" style={{ background: MEDAL[row.rank - 1] ?? MEDAL[2] }}>
                    {row.rank}
                  </span>
                  <span className="mt-2">
                    <Initial name={row.firstName} index={i} size={i === 0 ? 64 : 52} />
                  </span>
                  <span className="mt-1 max-w-full truncate text-lg font-bold">{row.firstName}</span>
                  <span className="flex items-center gap-1 text-lg font-semibold text-muted">
                    <Bolt size={18} />
                    {row.points}
                  </span>
                </li>
              )
            })}
        </ol>
      )}

      <ol className="mt-5 space-y-2">
        {rows.map((row, i) => (
          <li key={row.id} className={`flex items-center gap-3 rounded-2xl bg-surface px-3 py-2 shadow-[0_3px_0_var(--color-line)] ${row.isMe ? 'outline outline-3 outline-accent' : ''}`}>
            <span className="w-8 text-center font-display text-2xl text-muted">{row.rank}</span>
            <Initial name={row.firstName} index={i} size={44} />
            <span className="min-w-0 flex-1 truncate text-lg font-bold">
              {row.firstName}
              {row.isMe && ` ${t('leaderboard.you')}`}
            </span>
            <span className="flex items-center gap-1 text-lg font-bold tabular-nums">
              <Bolt size={20} />
              {row.points}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
