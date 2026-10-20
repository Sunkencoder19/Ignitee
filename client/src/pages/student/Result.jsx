// The result of one finished quiz attempt: stars, score, points, and every
// question that wasn't right first time, with the right answer and the
// explanation (the server only sends those once the quiz is finished).
//
// Straight after finishing, the quiz page passes the server's full reply in
// the page's state; after a refresh the page loads the attempt again (that
// copy has no "points incl. daily bonus" or "new badges", which only finishing knows).

import { Link, useLocation, useParams } from 'react-router-dom'
import { getQuizResult, useData } from '../../api'
import Buddy from '../../Buddy'
import { answerText } from '../../GameArt'
import { useT } from '../../i18n/t'
import { Coin, Confetti, Stars } from '../../Rewards'
import { useSession } from '../../session'

// An answer as words: a list joined, and a game's tiles named in the student's language.
function show(type, value, t) {
  return answerText(type, value, t)
}

export default function Result() {
  const { attemptId } = useParams()
  const { state: justFinished } = useLocation()
  const t = useT()
  const { progress } = useSession()
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
    <div className="mx-auto max-w-2xl space-y-6">
      {r.stars > 0 && <Confetti />}
      <section className="card p-6 text-center">
        <Buddy mascot={progress.mascot} size={140} label={t('home.buddyLabel')} className="float mx-auto" />
        <p className="mt-1 text-lg font-bold text-muted">{t('result.quizTitle', { title: r.chapterTitle })}</p>
        <div className="mt-3 flex justify-center">
          <Stars earned={r.stars} size={68} animate />
        </div>
        <h1 className="mt-3 text-3xl leading-tight">{t(`result.headline.${r.stars}`)}</h1>
        <p className="mt-4 font-display text-6xl text-accent">{r.score}%</p>
        <p className="mt-1 text-lg text-muted">{t('result.firstTry', { right: r.firstTryCount, total: r.questionCount })}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <span className="pill text-xl">{t('common.plusPoints', { count: points })}</span>
          <span className="pill text-xl">
            <Coin size={26} />
            {t('common.plusCoins', { count: points })}
          </span>
        </div>
        {r.isRetake && r.quizPoints === 0 && <p className="mt-3 text-muted">{t('result.retakeNoPoints', { best: r.bestBefore })}</p>}
        {r.newBadges?.length > 0 && (
          <p className="mt-4 rounded-2xl bg-good-soft p-3 text-lg font-bold text-good">
            {t('common.newBadge', { names: r.newBadges.map((id) => t(`badges.${id}.name`)).join(', ') })}
          </p>
        )}
        {r.openedChapter && <p className="mt-4 rounded-2xl bg-good-soft p-3 text-lg font-bold text-good">{t('result.opened', { title: r.openedChapter })}</p>}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link to="/student/learn" className="btn btn-primary text-lg">
            {t('common.backToChapters')}
          </Link>
          <Link to={`/student/quiz/${r.quizId}`} className="btn btn-secondary text-lg">
            {t('result.tryAgain')}
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-2xl">{t('result.review')}</h2>
        {mistakes.length === 0 ? (
          <p className="mt-3 text-lg text-muted">{t('result.perfect')}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {mistakes.map((a) => (
              <li key={a.questionId} className="card">
                <p className="font-semibold">{a.prompt}</p>
                <p className="mt-2 text-muted">
                  {a.outcome === 'hint' ? t('result.secondTry') : ['pairs', 'sort'].includes(a.type) ? t('result.notQuite') : t('result.youSaid', { answer: show(a.type, a.given, t) })}
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
