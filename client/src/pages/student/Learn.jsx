// Every chapter the teacher has published for this class, in order.
// Pass a chapter's quiz (1 star or more) to open the next one.

import { Link } from 'react-router-dom'
import { getStudentChapters, useData } from '../../api'
import { useT } from '../../i18n/t'

export default function Learn() {
  const t = useT()
  const { data: chapters, error, reload } = useData(() => getStudentChapters(), [])

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
  if (!chapters) return <p className="text-muted">{t('common.loading')}</p>

  function statusText(chapter, index) {
    if (chapter.state === 'done') return t('learn.done', { stars: chapter.stars })
    if (chapter.state === 'open') return t('learn.open')
    return t('learn.locked', { number: chapters[index - 1].number })
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">{t('learn.title')}</h1>
      {chapters.length === 0 ? (
        <p className="mt-2 text-lg text-muted">{t('learn.empty')}</p>
      ) : (
        <p className="mt-1 text-muted">{t('learn.help')}</p>
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
