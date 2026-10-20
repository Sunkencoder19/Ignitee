// The daily challenge: three questions, new every day, picked from worlds the
// student has already opened. Answered like a quiz (two tries, a hint, then the
// answer), judged by the server. It pays bonus points (and so coins) but is just
// for fun: it is never counted in a teacher's reports.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { answerDailyQuestion, getDaily, useData } from '../../api'
import Buddy from '../../Buddy'
import { useT } from '../../i18n/t'
import Question from '../../Question'
import { Coin, Confetti, Stars } from '../../Rewards'
import { useSession } from '../../session'

export default function Daily() {
  const t = useT()
  const { progress, reloadProgress } = useSession()
  const { data: daily, error, reload } = useData(() => getDaily(), [])
  const [started, setStarted] = useState(false)
  const [index, setIndex] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [finished, setFinished] = useState(null) // { points } once the last question is settled
  const [celebrate, setCelebrate] = useState(false)

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
  if (!daily) return <p className="text-muted">{t('common.loading')}</p>

  const buddy = <Buddy mascot={progress.mascot} size={130} label={t('home.buddyLabel')} className="float mx-auto" />

  if (!daily.available) {
    return (
      <div className="card mx-auto max-w-xl p-6 text-center">
        {buddy}
        <h1 className="mt-2 text-3xl">{t('daily.title')}</h1>
        <p className="mt-2 text-lg text-muted">{t('daily.noneYet')}</p>
        <Link to="/student/learn" className="btn btn-primary mt-5 w-full text-lg">
          {t('home.seeAllChapters')}
        </Link>
      </div>
    )
  }

  if (daily.done || celebrate) {
    const points = celebrate ? finished.points : daily.points
    return (
      <div className="card relative mx-auto max-w-xl p-6 text-center">
        {celebrate && <Confetti />}
        {buddy}
        <h1 className="mt-2 text-3xl">{t('daily.doneTitle')}</h1>
        <div className="mt-3 flex justify-center">
          <Stars earned={3} size={54} animate={celebrate} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <span className="pill text-xl">{t('common.plusPoints', { count: points })}</span>
          <span className="pill text-xl">
            <Coin size={26} />
            {t('common.plusCoins', { count: points })}
          </span>
        </div>
        <p className="mt-3 text-lg text-muted">{t('daily.comeBack')}</p>
        <Link to="/student" className="btn btn-primary mt-5 w-full text-lg">
          {t('daily.backHome')}
        </Link>
      </div>
    )
  }

  const total = daily.questions.length
  if (!started) {
    // Pick up where the child left off if they already answered some.
    const firstOpen = daily.outcomes.findIndex((o) => !o)
    return (
      <div className="card mx-auto max-w-xl p-6 text-center">
        {buddy}
        <h1 className="mt-2 text-3xl">{t('daily.title')}</h1>
        <p className="mt-3 text-lg">{t('daily.intro', { count: total })}</p>
        <p className="mt-2 text-lg text-muted">{t('daily.reportsNote')}</p>
        <button
          onClick={() => {
            setIndex(Math.max(0, firstOpen))
            setStarted(true)
          }}
          className="btn btn-primary mt-6 w-full text-xl"
        >
          {t('daily.start')}
        </button>
      </div>
    )
  }

  const question = daily.questions[index]
  const isLast = index === total - 1

  async function goNext() {
    if (!isLast) {
      setIndex(index + 1)
      setAnswered(false)
      return
    }
    await reloadProgress() // the new points and coins in the header
    setCelebrate(true)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <Link to="/student" aria-label={t('daily.leave')} className="grid size-12 shrink-0 place-items-center rounded-full bg-surface text-2xl font-bold text-muted shadow-[0_3px_0_var(--color-line)]">
          <span aria-hidden="true">&times;</span>
        </Link>
        <div
          className="h-4 flex-1 overflow-hidden rounded-full bg-surface ring-1 ring-line"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={index + 1}
          aria-label={t('quiz.questionOf', { number: index + 1, total })}
        >
          <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
        <span className="text-lg font-bold text-muted">
          {index + 1}/{total}
        </span>
      </div>
      <h1 className="mt-4 text-2xl leading-tight">{t('daily.title')}</h1>

      <section className="card mt-4 p-5 md:p-7">
        <Question
          key={question.id}
          question={question}
          check={async (given) => {
            const reply = await answerDailyQuestion(question.id, given)
            if (reply.done) setFinished({ points: reply.points })
            return reply
          }}
          onDone={() => setAnswered(true)}
        />
      </section>

      {answered && (
        <button onClick={goNext} className="btn btn-primary mt-6 w-full text-xl">
          {isLast ? t('daily.finish') : t('quiz.nextQuestion')}
        </button>
      )}
    </div>
  )
}
