// One chapter: its lessons in order, then the chapter quiz.
// The quiz opens once every lesson is done.

import { Link, useParams } from 'react-router-dom'
import { getStudentChapters, useData } from '../../api'
import { useT } from '../../i18n/t'

export default function Chapter() {
  const { chapterId } = useParams()
  const t = useT()
  const { data: chapters, error, reload } = useData(() => getStudentChapters(), [chapterId])

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

  const chapter = chapters.find((c) => c.id === chapterId)
  if (!chapter) return <BackToChapters message={t('chapter.notFound')} />
  if (chapter.state === 'locked') return <BackToChapters message={t('chapter.notOpen', { title: chapter.title })} />

  const doneCount = chapter.lessons.filter((l) => l.done).length
  const nextLesson = chapter.lessons.find((l) => !l.done)
  const taken = chapter.stars > 0 || chapter.state === 'done'

  return (
    <div className="max-w-2xl">
      <Link to="/student/learn" className="inline-flex min-h-12 items-center font-semibold text-muted hover:text-ink">
        {t('common.backToChapters')}
      </Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        {t('chapter.title', { number: chapter.number, title: chapter.title })}
      </h1>
      <p className="mt-1 text-muted">{t('chapter.lessonsDone', { done: doneCount, total: chapter.lessons.length })}</p>

      <ol className="mt-6 space-y-3">
        {chapter.lessons.map((lesson, i) => {
          const isNext = lesson === nextLesson
          return (
            <li key={lesson.id}>
              <Link
                to={`/student/learn/${chapter.id}/${lesson.id}`}
                className={`card flex items-center gap-4 p-4 hover:ring-accent ${isNext ? 'ring-2 ring-accent' : ''}`}
              >
                <span className="w-8 shrink-0 text-xl font-semibold text-muted">{i + 1}</span>
                <span className="flex-1 font-semibold">{lesson.title}</span>
                <span className={isNext ? 'font-semibold text-accent' : 'text-muted'}>
                  {lesson.done ? t('chapter.lessonDone') : isNext ? t('chapter.upNext') : t('chapter.notStarted')}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>

      {chapter.quiz && (
        <section className="card mt-8 p-6">
          <h2 className="text-xl font-semibold">{t('chapter.quizTitle')}</h2>
          {chapter.quiz.open ? (
            <>
              <p className="mt-1 text-muted">
                {t('chapter.questions', { count: chapter.quiz.questionCount })}{' '}
                {taken ? t('chapter.bestSoFar', { stars: chapter.stars }) : t('chapter.passToOpen')}
              </p>
              <Link to={`/student/quiz/${chapter.quiz.id}`} className="btn btn-primary mt-5">
                {taken ? t('chapter.retake') : t('chapter.start')}
              </Link>
            </>
          ) : (
            <p className="mt-1 text-muted">{t('chapter.finishLessonsFirst', { count: chapter.lessons.length })}</p>
          )}
        </section>
      )}
    </div>
  )
}

function BackToChapters({ message }) {
  const t = useT()
  return (
    <div>
      <p className="text-lg font-semibold">{message}</p>
      <Link to="/student/learn" className="btn btn-secondary mt-4">
        {t('common.backToChapters')}
      </Link>
    </div>
  )
}
