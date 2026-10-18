// Every chapter the teacher has published for this class, in order.
// Pass a chapter's quiz (1 star or more) to open the next one.

import { Link } from 'react-router-dom'
import { getStudentChapters, useData } from '../../api'

export default function Learn() {
  const { data: chapters, error, reload } = useData(() => getStudentChapters(), [])

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
  if (!chapters) return <p className="text-muted">Loading...</p>

  function statusText(chapter, index) {
    if (chapter.state === 'done') return `Done, ${chapter.stars} of 3 stars`
    if (chapter.state === 'open') return 'Open now'
    return `Finish Chapter ${chapters[index - 1].number} first`
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Chapters</h1>
      {chapters.length === 0 ? (
        <p className="mt-2 text-lg text-muted">Your teacher hasn’t shared any chapters yet. Check again soon.</p>
      ) : (
        <p className="mt-1 text-muted">Pass a chapter quiz to open the next chapter.</p>
      )}

      <ol className="mt-6 space-y-3">
        {chapters.map((chapter, index) => {
          const canOpen = chapter.state !== 'locked'
          const row = (
            <>
              <span className="w-10 shrink-0 text-2xl font-semibold text-muted">{chapter.number}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{chapter.title}</span>
                <span className={`block ${chapter.state === 'open' ? 'font-semibold text-accent' : 'text-muted'}`}>
                  {statusText(chapter, index)}
                </span>
              </span>
            </>
          )
          return (
            <li key={chapter.id}>
              {canOpen ? (
                <Link
                  to={`/student/learn/${chapter.id}`}
                  className={`card flex items-center gap-4 p-4 hover:ring-accent ${chapter.state === 'open' ? 'ring-2 ring-accent' : ''}`}
                >
                  {row}
                </Link>
              ) : (
                <div className="flex items-center gap-4 rounded-2xl border border-dashed border-line p-4 opacity-60">{row}</div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
