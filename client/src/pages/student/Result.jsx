// The result of the student's latest attempt at a quiz: stars, score,
// points, and every question they didn't get right first time.

import { Link, Navigate, useParams } from 'react-router-dom'
import { getChapters, getQuiz, useData } from '../../api'
import { attemptsWithPoints } from '../../game'
import { useSession } from '../../session'

const HEADLINES = {
  3: 'Brilliant! 3 stars.',
  2: 'Great work! 2 stars.',
  1: 'You passed! 1 star.',
  0: 'Nice try. Have another go.',
}

export default function Result() {
  const { quizId } = useParams()
  const { progress } = useSession()
  const { data, error } = useData(() => Promise.all([getQuiz(quizId), getChapters()]), [quizId])

  if (error) return <p className="text-warn">{error}</p>
  if (!data) return <p className="text-muted">Loading...</p>

  const [quiz, chapters] = data
  const chapter = chapters.find((c) => c.id === quiz.chapterId)
  const attempts = attemptsWithPoints(progress).filter((a) => a.quizId === quiz.id)
  if (attempts.length === 0) return <Navigate to={`/student/quiz/${quiz.id}`} replace />

  const attempt = attempts[attempts.length - 1]
  const isRetake = attempts.length > 1
  const nextChapter = chapters.find((c) => c.number === chapter.number + 1)
  const openedNext = attempt.stars >= 1 && attempts.slice(0, -1).every((a) => a.stars === 0)

  // Seed (demo) attempts have no saved answers, so there is nothing to review.
  const mistakes = (attempt.answers ?? []).filter((a) => a.outcome !== 'first')

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section className="card p-8 text-center">
        <p className="text-sm font-bold text-muted">{chapter.title} quiz</p>
        <h1 className="mt-2 text-3xl font-extrabold">{HEADLINES[attempt.stars]}</h1>
        <p className="mt-6 text-6xl font-extrabold">{attempt.score}%</p>
        <p className="mt-6 text-2xl font-extrabold text-accent">+{attempt.points} points</p>
        {isRetake && attempt.points === 0 && (
          <p className="mt-2 text-muted">Retakes only earn points when you beat your best score.</p>
        )}
        {openedNext && nextChapter && !nextChapter.locked && (
          <p className="mt-4 rounded-xl bg-good-soft p-3 font-bold text-good">
            Chapter {nextChapter.number}, {nextChapter.title}, is now open.
          </p>
        )}

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link to="/student/learn" className="btn btn-primary">
            Back to chapters
          </Link>
          <Link to={`/student/quiz/${quiz.id}`} className="btn btn-secondary">
            Try the quiz again
          </Link>
        </div>
      </section>

      {attempt.answers && (
        <section>
          <h2 className="text-2xl font-extrabold">Review</h2>
          {mistakes.length === 0 ? (
            <p className="mt-3 text-muted">Every answer was right first time. Nothing to review!</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {mistakes.map((answer) => {
                const question = quiz.questions.find((q) => q.id === answer.questionId)
                const right = Array.isArray(question.answer) ? question.answer.join(', ') : question.answer
                const given = Array.isArray(answer.given) ? answer.given.join(', ') : answer.given
                return (
                  <li key={answer.questionId} className="card">
                    <p className="font-bold">{question.prompt}</p>
                    <p className="mt-2 text-sm text-muted">
                      {answer.outcome === 'hint' ? 'You got it on the second try.' : `You said: ${given}`}
                    </p>
                    <p className="mt-1">
                      Answer: <strong>{right}</strong>. {question.explanation}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
