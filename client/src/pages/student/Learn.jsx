// All 14 chapters in order. Finish a chapter's quiz (1 star or more) to
// open the next one.

import { Link } from 'react-router-dom'
import { getChapters, useData } from '../../api'
import { chapterStates } from '../../game'
import { useSession } from '../../session'

export default function Learn() {
  const { progress } = useSession()
  const { data: chapters, error } = useData(() => getChapters(), [])

  if (error) return <p className="text-warn">{error}</p>
  if (!chapters) return <p className="text-muted">Loading...</p>

  const entries = chapterStates(chapters, progress)

  function statusText({ state, stars }, index) {
    if (state === 'done') return `Done, ${stars} of 3 stars`
    if (state === 'open') return 'Open now'
    if (state === 'soon') return 'Coming soon'
    return `Finish Chapter ${entries[index - 1].chapter.number} first`
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Chapters</h1>
      <p className="mt-1 text-muted">Pass a chapter quiz to open the next chapter.</p>

      <ol className="mt-6 space-y-3">
        {entries.map((entry, index) => {
          const { chapter, state } = entry
          const canOpen = state === 'done' || state === 'open'
          const row = (
            <>
              <span className="w-10 shrink-0 text-2xl font-semibold text-muted">{chapter.number}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{chapter.title}</span>
                <span className={`block ${state === 'open' ? 'font-semibold text-accent' : 'text-muted'}`}>
                  {statusText(entry, index)}
                </span>
              </span>
            </>
          )

          return (
            <li key={chapter.id}>
              {canOpen ? (
                <Link
                  to={`/student/learn/${chapter.id}`}
                  className={`card flex items-center gap-4 p-4 hover:ring-accent ${state === 'open' ? 'ring-2 ring-accent' : ''}`}
                >
                  {row}
                </Link>
              ) : (
                <div className="flex items-center gap-4 rounded-xl border border-dashed border-line p-4 opacity-60">
                  {row}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
