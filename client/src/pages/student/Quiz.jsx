// The chapter quiz: one question at a time, two tries each.
//
// "Start the quiz" asks the server for an attempt; the questions arrive
// WITHOUT answers. Each answer goes to the server, which checks it, counts
// the try and records the outcome. At the end the server works out the score
// from its own records; this page never sends a score.

import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { answerQuizQuestion, getStudentChapters, startQuiz, useData } from '../../api'
import Buddy from '../../Buddy'
import { useT } from '../../i18n/t'
import Question from '../../Question'
import { useSession } from '../../session'

export default function Quiz() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const { finishQuiz, progress } = useSession()
  const t = useT()
  const { data: chapters, error } = useData(() => getStudentChapters(), [quizId])

  const [attempt, setAttempt] = useState(null) // { attemptId, chapterTitle, questions } once started
  const [index, setIndex] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  if (error) return <Back message={error} />
  if (!chapters) return <p className="text-muted">{t('common.loading')}</p>

  const chapter = chapters.find((c) => c.quiz?.id === quizId)
  if (!chapter || chapter.state === 'locked') return <Back message={t('quiz.notOpen')} />
  if (!chapter.quiz.open) return <Back message={t('quiz.lessonsFirst')} to={`/student/learn/${chapter.id}`} />

  async function handleStart() {
    setBusy(true)
    setActionError(null)
    try {
      setAttempt(await startQuiz(quizId))
    } catch (err) {
      setActionError(err.message)
    }
    setBusy(false)
  }

  // ---- before starting ----
  if (!attempt) {
    return (
      <div className="card mx-auto max-w-xl p-6 text-center">
        <Buddy mascot={progress.mascot} size={130} label={t('home.buddyLabel')} className="float mx-auto" />
        <p className="mt-2 text-lg font-bold text-muted">{t('quiz.chapterNumber', { number: chapter.number })}</p>
        <h1 className="mt-1 text-3xl leading-tight">{t('quiz.title', { title: chapter.title })}</h1>
        <p className="mt-4 text-lg">{t('quiz.intro', { count: chapter.quiz.questionCount })}</p>
        <p className="mt-2 text-lg text-muted">{t('quiz.passToOpen')}</p>
        {actionError && (
          <p role="alert" className="mt-4 font-semibold text-warn">
            {actionError}
          </p>
        )}
        <button onClick={handleStart} disabled={busy} className="btn btn-primary mt-8 w-full text-lg">
          {busy ? t('quiz.starting') : t('quiz.start')}
        </button>
        <Link to={`/student/learn/${chapter.id}`} className="btn btn-secondary mt-3 w-full">
          {t('quiz.notNow')}
        </Link>
      </div>
    )
  }

  // ---- one question ----
  const question = attempt.questions[index]
  const isLast = index === attempt.questions.length - 1

  async function goNext() {
    if (!isLast) {
      setIndex(index + 1)
      setAnswered(false)
      return
    }
    setBusy(true)
    setActionError(null)
    try {
      const result = await finishQuiz(attempt.attemptId)
      // The result page also gets what only finishing knows (points incl. the
      // daily bonus, new badges, a newly opened chapter).
      navigate(`/student/results/${attempt.attemptId}`, { replace: true, state: result })
    } catch (err) {
      setActionError(err.message)
      setBusy(false)
    }
  }

  function leave(e) {
    if (!window.confirm(t('quiz.leaveConfirm'))) e.preventDefault()
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          to={`/student/learn/${chapter.id}`}
          onClick={leave}
          aria-label={t('quiz.leave')}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-surface text-2xl font-bold text-muted shadow-[0_3px_0_var(--color-line)]"
        >
          <span aria-hidden="true">&times;</span>
        </Link>
        <div
          className="h-4 flex-1 overflow-hidden rounded-full bg-surface ring-1 ring-line"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={attempt.questions.length}
          aria-valuenow={index + 1}
          aria-label={t('quiz.questionOf', { number: index + 1, total: attempt.questions.length })}
        >
          <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${((index + 1) / attempt.questions.length) * 100}%` }} />
        </div>
        <span className="text-lg font-bold text-muted">
          {index + 1}/{attempt.questions.length}
        </span>
      </div>

      <h1 className="mt-4 text-2xl leading-tight">{t('quiz.title', { title: attempt.chapterTitle })}</h1>

      <section className="card mt-4 p-6 md:p-8">
        <Question
          key={question.id}
          question={question}
          check={(given) => answerQuizQuestion(attempt.attemptId, question.id, given)}
          onDone={() => setAnswered(true)}
        />
      </section>

      {actionError && (
        <p role="alert" className="mt-4 font-semibold text-warn">
          {actionError}
        </p>
      )}

      {answered && (
        <button onClick={goNext} disabled={busy} className="btn btn-primary mt-6 w-full text-xl">
          {busy ? t('quiz.scoring') : isLast ? t('quiz.seeScore') : t('quiz.nextQuestion')}
        </button>
      )}
    </div>
  )
}

function Back({ message, to = '/student/learn' }) {
  const t = useT()
  return (
    <div>
      <p className="text-lg font-semibold">{message}</p>
      <Link to={to} className="btn btn-secondary mt-4">
        {t('common.goBack')}
      </Link>
    </div>
  )
}
