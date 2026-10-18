// The result of one finished quiz attempt: stars, score, points, and every
// question that wasn't right first time, with the right answer and the
// explanation (the server only sends those once the quiz is finished).
//
// Straight after finishing, the quiz page passes the server's full reply in
// the page's state; after a refresh the page loads the attempt again (that
// copy has no "points incl. daily bonus" or "new badges", which only finishing knows).

import { Link, useLocation, useParams } from 'react-router-dom'
import { getQuizResult, useData } from '../../api'

const HEADLINES = {
  3: 'Brilliant! 3 stars.',
  2: 'Great work! 2 stars.',
  1: 'You passed! 1 star.',
  0: 'Nice try. Have another go.',
}

function show(value) {
  return Array.isArray(value) ? value.join(', ') : value
}

export default function Result() {
  const { attemptId } = useParams()
  const { state: justFinished } = useLocation()
  const { data: loaded, error } = useData(
    () => (justFinished ? Promise.resolve(justFinished) : getQuizResult(attemptId)),
    [attemptId]
  )

  if (error) {
    return (
      <div>
        <p className="text-lg font-semibold">{error}</p>
        <Link to="/student/learn" className="btn btn-secondary mt-4">
          Back to chapters
        </Link>
      </div>
    )
  }
  if (!loaded) return <p className="text-muted">Loading...</p>

  const r = loaded
  const points = r.pointsEarned ?? r.quizPoints
  const mistakes = r.review.filter((a) => a.outcome !== 'first')

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section className="card p-8 text-center">
        <p className="font-semibold text-muted">{r.chapterTitle} quiz</p>
        <h1 className="mt-2 text-3xl font-semibold">{HEADLINES[r.stars]}</h1>
        <p className="mt-6 text-6xl font-semibold">{r.score}%</p>
        <p className="mt-2 text-muted">
          {r.firstTryCount} of {r.questionCount} right first time
        </p>
        <p className="mt-6 text-2xl font-semibold text-accent">+{points} points</p>
        {r.isRetake && r.quizPoints === 0 && (
          <p className="mt-2 text-muted">
            Retakes only earn quiz points when you beat your best score ({r.bestBefore}%).
          </p>
        )}
        {r.newBadges?.length > 0 && (
          <p className="mt-4 rounded-xl bg-good-soft p-3 font-semibold text-good">New badge: {r.newBadges.join(', ')}</p>
        )}
        {r.openedChapter && (
          <p className="mt-4 rounded-xl bg-good-soft p-3 font-semibold text-good">{r.openedChapter} is now open.</p>
        )}

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link to="/student/learn" className="btn btn-primary">
            Back to chapters
          </Link>
          <Link to={`/student/quiz/${r.quizId}`} className="btn btn-secondary">
            Try the quiz again
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Review</h2>
        {mistakes.length === 0 ? (
          <p className="mt-3 text-lg text-muted">Every answer was right first time. Nothing to review!</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {mistakes.map((a) => (
              <li key={a.questionId} className="card">
                <p className="font-semibold">{a.prompt}</p>
                <p className="mt-2 text-muted">
                  {a.outcome === 'hint' ? 'You got it on the second try.' : `You said: ${show(a.given)}`}
                </p>
                {a.answer !== null && (
                  <p className="mt-1">
                    Answer: <strong>{show(a.answer)}</strong>. {a.explanation}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
