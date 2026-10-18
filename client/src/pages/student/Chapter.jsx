// One chapter: its lessons in order, then the chapter quiz.
// The quiz opens once every lesson is done.

import { Link, useParams } from 'react-router-dom'
import { getChapter, getChapters, useData } from '../../api'
import { bestStars, chapterStates, lessonDone, quizOpen } from '../../game'
import { useSession } from '../../session'

export default function Chapter() {
  const { chapterId } = useParams()
  const { progress } = useSession()
  const { data, error } = useData(() => Promise.all([getChapter(chapterId), getChapters()]), [chapterId])

  if (error) return <BackToChapters message={error} />
  if (!data) return <p className="text-muted">Loading...</p>

  const [{ chapter, lessons, quiz }, chapters] = data
  const state = chapterStates(chapters, progress).find((c) => c.chapter.id === chapter.id).state
  if (state === 'locked' || state === 'soon') {
    return <BackToChapters message={`${chapter.title} isn't open yet.`} />
  }

  const doneCount = lessons.filter((l) => lessonDone(progress, l.id)).length
  const nextLesson = lessons.find((l) => !lessonDone(progress, l.id))
  const stars = bestStars(progress, chapter.quizId)
  const taken = progress.attempts.some((a) => a.quizId === chapter.quizId)

  return (
    <div className="max-w-2xl">
      <Link to="/student/learn" className="text-sm font-bold text-muted hover:text-ink">
        Back to chapters
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
        Chapter {chapter.number}: {chapter.title}
      </h1>
      <p className="mt-1 text-muted">
        {doneCount} of {lessons.length} lessons done
      </p>

      <ol className="mt-6 space-y-3">
        {lessons.map((lesson, i) => {
          const done = lessonDone(progress, lesson.id)
          const isNext = lesson === nextLesson
          return (
            <li key={lesson.id}>
              <Link
                to={`/student/learn/${chapter.id}/${lesson.id}`}
                className={`card flex items-center gap-4 p-4 hover:border-accent ${isNext ? 'border-accent' : ''}`}
              >
                <span className="w-8 shrink-0 text-xl font-extrabold text-muted">{i + 1}</span>
                <span className="flex-1 font-bold">{lesson.title}</span>
                <span className={`text-sm ${isNext ? 'font-bold text-accent' : 'text-muted'}`}>
                  {done ? 'Done' : isNext ? 'Up next' : 'Not started'}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>

      {quiz && (
        <section className="card mt-8 p-6">
          <h2 className="text-xl font-extrabold">Chapter quiz</h2>
          {quizOpen(chapter, progress) ? (
            <>
              <p className="mt-1 text-muted">
                {quiz.questions.length} questions.{' '}
                {taken ? `Your best so far: ${stars} of 3 stars.` : 'Get 1 star or more to open the next chapter.'}
              </p>
              <Link to={`/student/quiz/${quiz.id}`} className="btn btn-primary mt-5">
                {taken ? 'Retake the quiz' : 'Start the quiz'}
              </Link>
            </>
          ) : (
            <p className="mt-1 text-muted">Finish all {lessons.length} lessons above to open the quiz.</p>
          )}
        </section>
      )}
    </div>
  )
}

function BackToChapters({ message }) {
  return (
    <div>
      <p className="text-lg font-bold">{message}</p>
      <Link to="/student/learn" className="btn btn-secondary mt-4">
        Back to chapters
      </Link>
    </div>
  )
}
