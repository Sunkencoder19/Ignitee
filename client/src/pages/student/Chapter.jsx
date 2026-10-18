// One chapter: its lessons in order, then the chapter quiz.
// The quiz opens once every lesson is done.

import { Link, useParams } from 'react-router-dom'
import { getStudentChapters, useData } from '../../api'

export default function Chapter() {
  const { chapterId } = useParams()
  const { data: chapters, error, reload } = useData(() => getStudentChapters(), [chapterId])

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

  const chapter = chapters.find((c) => c.id === chapterId)
  if (!chapter) return <BackToChapters message="We couldn’t find that chapter." />
  if (chapter.state === 'locked') return <BackToChapters message={`${chapter.title} isn’t open yet.`} />

  const doneCount = chapter.lessons.filter((l) => l.done).length
  const nextLesson = chapter.lessons.find((l) => !l.done)
  const taken = chapter.stars > 0 || chapter.state === 'done'

  return (
    <div className="max-w-2xl">
      <Link to="/student/learn" className="inline-flex min-h-12 items-center font-semibold text-muted hover:text-ink">
        Back to chapters
      </Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        Chapter {chapter.number}: {chapter.title}
      </h1>
      <p className="mt-1 text-muted">
        {doneCount} of {chapter.lessons.length} lessons done
      </p>

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
                  {lesson.done ? 'Done' : isNext ? 'Up next' : 'Not started'}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>

      {chapter.quiz && (
        <section className="card mt-8 p-6">
          <h2 className="text-xl font-semibold">Chapter quiz</h2>
          {chapter.quiz.open ? (
            <>
              <p className="mt-1 text-muted">
                {chapter.quiz.questionCount} questions.{' '}
                {taken ? `Your best so far: ${chapter.stars} of 3 stars.` : 'Get 1 star or more to open the next chapter.'}
              </p>
              <Link to={`/student/quiz/${chapter.quiz.id}`} className="btn btn-primary mt-5">
                {taken ? 'Retake the quiz' : 'Start the quiz'}
              </Link>
            </>
          ) : (
            <p className="mt-1 text-muted">Finish all {chapter.lessons.length} lessons above to open the quiz.</p>
          )}
        </section>
      )}
    </div>
  )
}

function BackToChapters({ message }) {
  return (
    <div>
      <p className="text-lg font-semibold">{message}</p>
      <Link to="/student/learn" className="btn btn-secondary mt-4">
        Back to chapters
      </Link>
    </div>
  )
}
