// The result of one finished quiz attempt: stars, score, points, and every
// question that wasn't right first time, with the right answer and the
// explanation (the server only sends those once the quiz is finished).
//
// Straight after finishing, the quiz page passes the server's full reply in
// the page's state; after a refresh the page loads the attempt again (that
// copy has no "points incl. daily bonus" or "new badges", which only finishing knows).

import { Link, useLocation, useParams } from 'react-router-dom'
import { getQuizResult, useData } from '../../api'
import { answerText } from '../../GameArt'
import { useT } from '../../i18n/t'

// An answer as words: a list joined, and a game's tiles named in the student's language.
function show(type, value, t) {
  return answerText(type, value, t)
}

export default function Result() {
  const { attemptId } = useParams()
  const { state: justFinished } = useLocation()
  const t = useT()
  const { data: loaded, error } = useData(
    () => (justFinished ? Promise.resolve(justFinished) : getQuizResult(attemptId)),
    [attemptId]
  )

  if (error) {
    return (
      <div>
        <p className="text-lg font-semibold">{error}</p>
        <Link to="/student/learn" className="btn btn-secondary mt-4">
          {t('common.backToChapters')}
        </Link>
      </div>
    )
  }
  if (!loaded) return <p className="text-muted">{t('common.loading')}</p>

  const r = loaded
  const points = r.pointsEarned ?? r.quizPoints
  const mistakes = r.review.filter((a) => a.outcome !== 'first')

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section className="card p-8 text-center">
        <p className="font-semibold text-muted">{t('result.quizTitle', { title: r.chapterTitle })}</p>
        <h1 className="mt-2 text-3xl font-semibold">{t(`result.headline.${r.stars}`)}</h1>
        <p className="mt-6 text-6xl font-semibold">{r.score}%</p>
        <p className="mt-2 text-muted">
          {t('result.firstTry', { right: r.firstTryCount, total: r.questionCount })}
        </p>
        <p className="mt-6 text-2xl font-semibold text-accent">{t('common.plusPoints', { count: points })}</p>
        {r.isRetake && r.quizPoints === 0 && <p className="mt-2 text-muted">{t('result.retakeNoPoints', { best: r.bestBefore })}</p>}
        {r.newBadges?.length > 0 && (
          <p className="mt-4 rounded-xl bg-good-soft p-3 font-semibold text-good">
            {t('common.newBadge', { names: r.newBadges.map((id) => t(`badges.${id}.name`)).join(', ') })}
          </p>
        )}
        {r.openedChapter && (
          <p className="mt-4 rounded-xl bg-good-soft p-3 font-semibold text-good">{t('result.opened', { title: r.openedChapter })}</p>
        )}

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link to="/student/learn" className="btn btn-primary">
            {t('common.backToChapters')}
          </Link>
          <Link to={`/student/quiz/${r.quizId}`} className="btn btn-secondary">
            {t('result.tryAgain')}
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">{t('result.review')}</h2>
        {mistakes.length === 0 ? (
          <p className="mt-3 text-lg text-muted">{t('result.perfect')}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {mistakes.map((a) => (
              <li key={a.questionId} className="card">
                <p className="font-semibold">{a.prompt}</p>
                <p className="mt-2 text-muted">
                  {a.outcome === 'hint' ? t('result.secondTry') : t('result.youSaid', { answer: show(a.type, a.given, t) })}
                </p>
                {a.answer !== null && (
                  <p className="mt-1">
                    {t('result.answer')} <strong>{show(a.type, a.answer, t)}</strong>. {a.explanation}
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
